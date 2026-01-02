import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { fetchUserRole, calculateVariantPrice } from '../lib/pricing';
import { TURKEY_DATA } from '../constants/turkey-data';
import SearchableSelect from '../components/SearchableSelect';

interface CheckoutItem {
    id: string;
    quantity: number;
    product_variants: {
        id: string;
        name: string;
        base_price: number;
        sku?: string;
    };
    unitPrice?: number;
    lineTotal?: number;
}

interface Address {
    id: string;
    type: string;
    full_name: string;
    phone: string;
    country: string;
    city: string;
    district: string;
    address_line: string;
    postal_code: string;
}

const CheckoutPage: React.FC = () => {
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState<CheckoutItem[]>([]);
    const [cartTotal, setCartTotal] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [showAddressForm, setShowAddressForm] = useState<boolean>(false);
    const [newAddress, setNewAddress] = useState({
        type: 'shipping',
        full_name: '',
        phone: '',
        country: 'Türkiye',
        city: '',
        district: '',
        address_line: '',
        postal_code: ''
    });
    const [userId, setUserId] = useState<string | null>(null);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [createdOrderNo, setCreatedOrderNo] = useState<string>('');

    useEffect(() => {
        const fetchCheckoutData = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { navigate('/login?redirect=/checkout'); return; }
                const profileId = user.id;
                setUserId(profileId);

                const { data: addressData } = await supabase.from('addresses').select('*').eq('profile_id', profileId);
                setAddresses(addressData || []);

                const { data: cartData } = await supabase.from('carts').select('id').eq('profile_id', profileId).eq('status', 'active').maybeSingle();
                if (!cartData) { setError("Aktif sepet yok."); setLoading(false); return; }

                const { data: itemsData } = await supabase
                    .from('cart_items')
                    .select(`
                        id, 
                        quantity, 
                        product_variants (
                            id, 
                            name, 
                            sku, 
                            base_price, 
                            products (
                                name, 
                                slug
                            )
                        )
                    `)
                    .eq('cart_id', cartData.id);

                // Rol Çekme ve Fiyat Hesaplama
                const userRole = await fetchUserRole();

                if (itemsData) {
                    const itemsWithTotals = await Promise.all(itemsData.map(async (item: any) => {
                        const variant = item.product_variants;
                        const unitPrice = await calculateVariantPrice(variant.id, variant.base_price, userRole);

                        return {
                            ...item,
                            unitPrice,
                            lineTotal: unitPrice * item.quantity,
                            productName: variant.products?.name // Ürün adını taşı
                        } as CheckoutItem;
                    }));
                    setCartItems(itemsWithTotals);
                    setCartTotal(itemsWithTotals.reduce((sum, item) => sum + (item.lineTotal || 0), 0));
                }
            } catch (err) { console.error(err); setError("Hata oluştu."); } finally { setLoading(false); }
        };
        fetchCheckoutData();
    }, [navigate]);

    const handleCreateAddress = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;
        try {
            const { error } = await supabase.from('addresses').insert({ profile_id: userId, ...newAddress });
            if (error) throw error;
            setNewAddress({ type: 'shipping', full_name: '', phone: '', country: 'Türkiye', city: '', district: '', address_line: '', postal_code: '' });
            setShowAddressForm(false);
            const { data: addressData } = await supabase.from('addresses').select('*').eq('profile_id', userId);
            setAddresses(addressData || []);
            if (addressData && addressData.length > 0) setSelectedAddressId(addressData[addressData.length - 1].id);
        } catch (error) { console.error(error); alert("Adres eklenirken hata."); }
    };

    const generateOrderNo = () => `ORB-${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`;

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCompleteOrder = async () => {
        if (!userId || !selectedAddressId) { alert("Lütfen adres seçimi yapınız."); return; }
        if (isSubmitting) return;

        setIsSubmitting(true);
        setLoading(true);

        try {
            // 1. RE-FETCH USER ROLE (Güvenlik)
            const userRole = await fetchUserRole();

            // 2. RE-FETCH ACTIVE CART (Güvenlik)
            const { data: activeCart, error: activeCartError } = await supabase
                .from('carts')
                .select('id')
                .eq('profile_id', userId)
                .eq('status', 'active')
                .maybeSingle();

            if (activeCartError || !activeCart) throw new Error("Aktif sepet bulunamadı veya süre aşımı.");

            // 3. RE-FETCH CART ITEMS & VARIANTS (Stok ve Fiyat Kontrolü için)
            const { data: dbItems, error: dbItemsError } = await supabase
                .from('cart_items')
                .select(`
                    quantity,
                    variant_id,
                    product_variants (
                        id, name, sku, stock, base_price, is_active,
                        products (
                            id,
                            name, 
                            slug
                        )
                    )
                `)
                .eq('cart_id', activeCart.id);

            if (dbItemsError || !dbItems || dbItems.length === 0) throw new Error("Sepetiniz boş.");

            // 4. VALIDATION LOOP & PRICE CALCULATION
            const finalOrderItems = [];
            let calculatedSubtotal = 0;

            for (const item of dbItems) {
                // Supabase join sonucu bazen array dönebilir, kontrol et.
                const variantRaw = item.product_variants;
                const variant = Array.isArray(variantRaw) ? variantRaw[0] : variantRaw;

                const qty = item.quantity;

                // A) Veri Bütünlüğü Kontrolü
                if (!variant) throw new Error("Sepetteki bir ürünün kaydı bulunamadı (Silinmiş olabilir).");

                // B) Aktiflik Kontrolü
                if (!variant.is_active) throw new Error(`"${variant.name}" ürünü şu anda satışa kapalı.`);

                // C) Stok Kontrolü
                if (variant.stock < qty) throw new Error(`"${variant.name}" için yeterli stok yok. Mevcut: ${variant.stock}`);

                // D) Fiyat Hesaplama (Merkezi Logic)
                const unitPrice = await calculateVariantPrice(variant.id, variant.base_price, userRole);
                const lineTotal = unitPrice * qty;

                calculatedSubtotal += lineTotal;

                finalOrderItems.push({
                    variant_id: variant.id,
                    product_id: variant.products?.id, // Add product_id
                    quantity: qty,
                    unit_price_snapshot: unitPrice,
                    line_total: lineTotal,
                    product_name_snapshot: variant.name,
                    sku_snapshot: variant.sku || '',
                    attributes_snapshot: {}
                });
            }

            // 5. CREATE ORDER
            const orderNo = generateOrderNo();
            const { data: orderData, error: orderError } = await supabase.from('orders').insert({
                order_no: orderNo,
                user_id: userId,
                status: 'pending_payment',
                currency: 'TRY',
                subtotal: calculatedSubtotal,
                discount_total: 0,
                shipping_total: 0,
                grand_total: calculatedSubtotal
            }).select().single();

            if (orderError) throw orderError;

            // 6. CREATE ORDER ITEMS
            const itemsPayload = finalOrderItems.map(item => ({
                order_id: orderData.id,
                ...item
            }));

            const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload);
            if (itemsError) throw itemsError;

            // 7. CLOSE CART
            const { error: closeCartError } = await supabase
                .from('carts')
                .update({ status: 'converted', updated_at: new Date().toISOString() })
                .eq('id', activeCart.id);

            if (closeCartError) console.error("Sepet kapatılamadı (Kritik değil):", closeCartError);

            setCreatedOrderNo(orderNo);
            setOrderSuccess(true);
            window.scrollTo(0, 0);

        } catch (error: any) {
            console.error("Sipariş Hatası:", error);
            alert(error.message || "Sipariş oluşturulurken beklenmedik bir hata oluştu.");
        } finally {
            setLoading(false);
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="flex justify-center h-screen items-center bg-[#fefcf5]"><div className="animate-spin h-12 w-12 border-4 border-[#f0c961] rounded-full border-t-transparent"></div></div>;

    if (orderSuccess) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-[#fefcf5]">
                <div className="max-w-xl w-full bg-white p-12 rounded-3xl shadow-2xl border border-[#f0c961]/20 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-[#f0c961]"></div>
                    <div className="w-28 h-28 bg-[#fefcf5] text-[#f0c961] rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-[#f0c961]/10">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h2 className="text-4xl font-black text-[#1a1a1a] mb-2 uppercase tracking-wide">Sipariş Alındı!</h2>
                    <p className="text-gray-500 mb-10 text-lg">Siparişiniz başarıyla sistemimize düşmüştür. <br /> En kısa sürede hazırlamaya başlayacağız.</p>

                    <div className="bg-[#fefcf5] p-8 rounded-2xl border-2 border-dashed border-[#f0c961]/30 mb-10 relative group hover:border-[#f0c961] transition-colors cursor-pointer">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Sipariş Numaranız</span>
                        <div className="font-mono text-3xl text-[#1a1a1a] font-bold tracking-widest select-all group-hover:text-[#f0c961] transition-colors">
                            {createdOrderNo}
                        </div>
                    </div>

                    <button onClick={() => navigate('/')} className="w-full bg-[#1a1a1a] text-white font-bold py-5 rounded-xl shadow-lg hover:shadow-2xl hover:bg-black transition-all uppercase tracking-wider">
                        Alışverişe Devam Et
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fefcf5] py-12">
            <div className="container mx-auto px-4 max-w-7xl">

                {/* 3-Step Header - Premium Look */}
                <div className="mb-16">
                    <div className="flex items-center justify-between max-w-4xl mx-auto relative">
                        {/* Connecting Line */}
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -z-10 rounded-full"></div>
                        <div className="absolute top-1/2 left-0 w-1/2 h-1 bg-[#f0c961] -z-10 rounded-full"></div>

                        {/* Step 1 */}
                        <div className="bg-[#fefcf5] px-4 z-10 flex flex-col items-center gap-3">
                            <div className="w-14 h-14 rounded-full bg-[#f0c961] text-[#1a1a1a] flex items-center justify-center font-black text-xl shadow-lg ring-4 ring-white">1</div>
                            <div className="font-bold text-[#1a1a1a] uppercase tracking-wide text-sm">Teslimat</div>
                        </div>

                        {/* Step 2 */}
                        <div className="bg-[#fefcf5] px-4 z-10 flex flex-col items-center gap-3">
                            <div className="w-14 h-14 rounded-full bg-white border-4 border-[#f0c961] text-[#f0c961] flex items-center justify-center font-black text-xl shadow-lg">2</div>
                            <div className="font-bold text-[#f0c961] uppercase tracking-wide text-sm">Ödeme</div>
                        </div>

                        {/* Step 3 */}
                        <div className="bg-[#fefcf5] px-4 z-10 flex flex-col items-center gap-3 grayscale opacity-40">
                            <div className="w-14 h-14 rounded-full bg-white border-4 border-gray-200 text-gray-400 flex items-center justify-center font-black text-xl">3</div>
                            <div className="font-bold text-gray-400 uppercase tracking-wide text-sm">Onay</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Sol Kolon: Adres */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <svg className="w-40 h-40" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
                            </div>

                            <h2 className="text-2xl font-black text-[#1a1a1a] mb-8 uppercase tracking-wide border-b-2 border-[#f0c961] inline-block pb-2">Teslimat Adresi</h2>

                            {addresses.length === 0 ? (
                                <div className="text-center py-12 bg-[#fefcf5] border-2 border-dashed border-[#f0c961]/30 rounded-2xl hover:bg-[#fff9e6] transition-colors cursor-pointer" onClick={() => setShowAddressForm(true)}>
                                    <div className="text-4xl mb-4">📍</div>
                                    <p className="text-gray-600 mb-6 font-medium">Teslimat yapılacak adresinizi ekleyin.</p>
                                    <button className="bg-white text-[#1a1a1a] border border-gray-200 font-bold py-3 px-6 rounded-full shadow-sm hover:shadow-md transition-all">+ Yeni Adres Ekle</button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                    {addresses.map((addr) => (
                                        <div key={addr.id} onClick={() => setSelectedAddressId(addr.id)}
                                            className={`p-6 rounded-2xl border-2 cursor-pointer flex flex-col justify-between transition-all min-h-[180px] shadow-sm
                                            ${selectedAddressId === addr.id
                                                    ? 'border-[#f0c961] bg-[#fefcf5] ring-1 ring-[#f0c961] scale-[1.02]'
                                                    : 'border-gray-100 hover:border-gray-300 bg-white hover:shadow-lg'}`}>
                                            <div>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="font-bold text-[#1a1a1a] text-lg flex items-center gap-2">
                                                        <span>🏠</span> {addr.full_name}
                                                    </div>
                                                    <span className="text-[10px] uppercase font-bold bg-gray-100 px-2 py-1 rounded text-gray-500 tracking-wider">{addr.type}</span>
                                                </div>
                                                <div className="text-sm text-gray-500 leading-relaxed font-medium">{addr.address_line} <br /> <span className="text-[#1a1a1a]">{addr.district} / {addr.city}</span></div>
                                            </div>
                                            {selectedAddressId === addr.id && (
                                                <div className="mt-4 flex items-center gap-2 text-[#f0c961] font-black text-sm uppercase tracking-wide justify-end">
                                                    <svg className="w-5 h-5 bg-[#f0c961] text-white rounded-full p-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                    Seçili
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {!showAddressForm && (
                                        <button onClick={() => setShowAddressForm(true)} className="border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-6 text-gray-400 font-bold hover:border-[#f0c961] hover:text-[#f0c961] transition-all min-h-[180px] group bg-gray-50/50">
                                            <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">+</span>
                                            Farklı Adres Ekle
                                        </button>
                                    )}
                                </div>
                            )}

                            {showAddressForm && (
                                <form onSubmit={handleCreateAddress} className="mt-8 p-8 bg-[#fefcf5] rounded-2xl border border-[#f0c961]/20 animate-fadeIn">
                                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                                        <span className="w-2 h-6 bg-[#f0c961] rounded-full"></span>
                                        Yeni Adres Bilgileri
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wide">Ad Soyad</label>
                                            <input className="input-field rounded-lg border-gray-200 focus:border-[#f0c961]" required value={newAddress.full_name} onChange={e => setNewAddress({ ...newAddress, full_name: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wide">Telefon</label>
                                            <input className="input-field rounded-lg border-gray-200 focus:border-[#f0c961]" required value={newAddress.phone} onChange={e => setNewAddress({ ...newAddress, phone: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="mb-6">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wide">Açık Adres</label>
                                        <textarea rows={3} className="input-field rounded-lg resize-none border-gray-200 focus:border-[#f0c961]" required value={newAddress.address_line} onChange={e => setNewAddress({ ...newAddress, address_line: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6 mb-8">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wide">İl</label>
                                            <SearchableSelect
                                                options={TURKEY_DATA.map(c => c.name).sort()}
                                                value={newAddress.city}
                                                onChange={(val) => setNewAddress({ ...newAddress, city: val, district: '' })}
                                                placeholder="İl Seçiniz"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wide">İlçe</label>
                                            <SearchableSelect
                                                options={newAddress.city ? (TURKEY_DATA.find(c => c.name === newAddress.city)?.districts.sort() || []) : []}
                                                value={newAddress.district}
                                                onChange={(val) => setNewAddress({ ...newAddress, district: val })}
                                                placeholder="İlçe Seçiniz"
                                                disabled={!newAddress.city}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button type="button" onClick={() => setShowAddressForm(false)} className="px-6 py-3 rounded-lg font-bold text-gray-500 hover:bg-gray-200 transition-colors">Vazgeç</button>
                                        <button type="submit" className="px-8 py-3 rounded-lg font-bold bg-[#f0c961] text-[#1a1a1a] shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">Kaydet</button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Sağ Kolon: Özet */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-200 sticky top-8">
                            <h3 className="font-black text-[#1a1a1a] mb-6 text-xl uppercase tracking-wide flex items-center gap-2">
                                <span>🛍️</span> Sepet Özeti
                            </h3>
                            <div className="space-y-4 mb-8 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                {cartItems.map(item => (
                                    <div key={item.id} className="flex justify-between items-center py-4 border-b border-gray-50 last:border-0 group">
                                        <div className="flex items-center gap-4 overflow-hidden">
                                            <div className="w-12 h-12 bg-[#fefcf5] rounded-xl flex items-center justify-center text-xl shrink-0 border border-gray-100 group-hover:border-[#f0c961] transition-colors">📦</div>
                                            <div className="truncate">
                                                <div className="text-sm font-bold text-[#1a1a1a] truncate">{item.product_variants.name}</div>
                                                <div className="text-xs text-gray-400 font-medium">x{item.quantity} Adet</div>
                                            </div>
                                        </div>
                                        <span className="font-bold text-[#1a1a1a] text-sm shrink-0">{item.lineTotal?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3 mb-6 bg-[#fefcf5] p-6 rounded-2xl border border-gray-100">
                                <div className="flex justify-between text-gray-500 text-sm">
                                    <span>Ara Toplam</span>
                                    <span className="font-bold text-[#1a1a1a]">{cartTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                </div>
                                <div className="flex justify-between text-gray-500 text-sm items-center">
                                    <span>Kargo</span>
                                    <span className="text-[#f0c961] font-bold text-xs uppercase tracking-wide bg-white px-2 py-1 rounded shadow-sm">Ücretsiz Test</span>
                                </div>
                            </div>

                            <div className="flex justify-between font-black text-2xl text-[#1a1a1a] mb-8 px-2">
                                <span>Toplam</span>
                                <span className="text-[#f0c961]">{cartTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                            </div>

                            <button
                                onClick={handleCompleteOrder}
                                disabled={!selectedAddressId}
                                className={`w-full py-5 text-base font-black uppercase tracking-wider rounded-xl shadow-xl transition-all flex items-center justify-center gap-2
                                    ${selectedAddressId
                                        ? 'bg-[#1a1a1a] text-white hover:bg-black hover:-translate-y-1 hover:shadow-2xl'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                            >
                                {selectedAddressId ? (
                                    <>Siparişi Onayla <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></>
                                ) : 'Adres Seçiniz'}
                            </button>

                            <p className="text-[10px] text-gray-400 text-center mt-6 px-4 leading-tight">
                                Mesafeli Satış Sözleşmesi'ni okudum ve onaylıyorum.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
