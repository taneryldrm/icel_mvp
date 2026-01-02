import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
import { fetchUserRole, calculateVariantPrice } from '../lib/pricing';

interface CartItem {
    id: string;
    quantity: number;
    product_variants: {
        id: string;
        name: string;
        base_price: number;
    };
    unitPrice?: number;
    lineTotal?: number;
}

const CartPage: React.FC = () => {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [cartTotal, setCartTotal] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [updating, setUpdating] = useState<string | null>(null);

    const fetchCart = async () => {
        if (cartItems.length === 0) setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { setError("Sepeti görüntülemek için giriş yapmalısınız."); setLoading(false); return; }

            const { data: cartData } = await supabase
                .from('carts')
                .select('id')
                .eq('profile_id', user.id)
                .eq('status', 'active')
                .maybeSingle();

            if (!cartData) { setCartItems([]); setCartTotal(0); setLoading(false); return; }

            const { data: itemsData } = await supabase
                .from('cart_items')
                .select(`
                    id, 
                    quantity, 
                    product_variants (
                        id, 
                        name, 
                        base_price, 
                        products (
                            name, 
                            slug,
                            product_images (
                                url,
                                is_primary
                            )
                        )
                    )
                `)
                .eq('cart_id', cartData.id)
                .order('id', { ascending: true });

            if (itemsData) {
                // Rol Çekme ve Fiyat Hesaplama
                const userRole = await fetchUserRole();

                const itemsWithPrices = await Promise.all(
                    itemsData.map(async (item: any) => {
                        const variant = item.product_variants;
                        const unitPrice = await calculateVariantPrice(variant.id, variant.base_price, userRole);

                        return {
                            ...item,
                            unitPrice,
                            lineTotal: unitPrice * item.quantity
                        } as CartItem;
                    })
                );

                setCartItems(itemsWithPrices);
                setCartTotal(itemsWithPrices.reduce((sum, item) => sum + (item.lineTotal || 0), 0));
            }
        } catch (err) {
            console.error("Beklenmeyen hata:", err);
            setError("Bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCart(); }, []);

    const handleUpdateQuantity = async (item: CartItem, change: number) => {
        setUpdating(item.id);
        try {
            if (change === 1) {
                await supabase.from('cart_items').update({ quantity: item.quantity + 1 }).eq('id', item.id);
            } else if (change === -1) {
                if (item.quantity > 1) {
                    await supabase.from('cart_items').update({ quantity: item.quantity - 1 }).eq('id', item.id);
                } else {
                    if (window.confirm("Bu ürünü silmek istediğinize emin misiniz?")) {
                        await supabase.from('cart_items').delete().eq('id', item.id);
                    } else {
                        setUpdating(null);
                        return;
                    }
                }
            }
            await fetchCart();
        } catch (error) { console.error(error); alert("Hata oluştu."); } finally { setUpdating(null); }
    };

    const handleRemoveItem = async (itemId: string) => {
        if (!window.confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
        setUpdating(itemId);
        try {
            await supabase.from('cart_items').delete().eq('id', itemId);
            await fetchCart();
        } catch (error) { console.error(error); alert("Hata oluştu."); } finally { setUpdating(null); }
    };

    if (loading && cartItems.length === 0) return <div className="p-8 flex justify-center bg-[#fefcf5] min-h-screen"><div className="animate-spin h-12 w-12 border-4 border-[#f0c961] rounded-full border-t-transparent"></div></div>;

    if (error) return (
        <div className="min-h-screen bg-[#fefcf5] flex items-center justify-center p-4">
            <div className="bg-white border border-gray-200 p-12 rounded-2xl shadow-lg text-center max-w-lg w-full">
                <div className="text-red-500 text-6xl mb-6 mx-auto">⚠️</div>
                <h2 className="text-2xl font-black mb-4 text-[#1a1a1a]">{error}</h2>
                <Link to="/login" className="bg-[#f0c961] text-[#1a1a1a] font-bold py-3 px-8 rounded-full shadow-lg hover:bg-[#e0b140] transition-colors inline-block uppercase tracking-wide">Giriş Yap</Link>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#fefcf5] py-16">
            <div className="container mx-auto px-4 max-w-7xl">
                <h1 className="text-3xl font-black text-[#1a1a1a] mb-8 border-l-8 border-[#f0c961] pl-6 uppercase tracking-tight">
                    Alışveriş Sepeti <span className="text-gray-400 font-medium text-lg ml-2">({cartItems.length} Ürün)</span>
                </h1>

                {cartItems.length === 0 ? (
                    <div className="text-center py-24 bg-white border border-gray-100 rounded-3xl shadow-lg flex flex-col items-center justify-center">
                        <div className="w-48 h-48 bg-[#fefcf5] rounded-full flex items-center justify-center mb-8 relative">
                            <span className="text-8xl opacity-30 select-none">🛒</span>
                            <div className="absolute top-0 right-0 bg-[#f0c961] rounded-full p-4 shadow-lg">
                                <svg className="w-8 h-8 text-[#1a1a1a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            </div>
                        </div>
                        <h2 className="text-3xl font-black text-[#1a1a1a] mb-2 uppercase">Sepetiniz Boş</h2>
                        <p className="text-gray-500 text-lg mb-10 max-w-md">Enerji çözümlerimizi keşfetmek için ürün kataloğumuza göz atın.</p>
                        <Link to="/products" className="bg-[#f0c961] hover:bg-[#e0b140] text-[#1a1a1a] font-black py-5 px-16 rounded-full shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all uppercase tracking-widest flex items-center gap-3">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            Alışverişe Başla
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {/* Sol Kolon: Ürün Listesi */}
                        <div className="lg:col-span-2 space-y-6">
                            {cartItems.map((item) => {
                                // @ts-ignore
                                const product = item.product_variants?.products;
                                // @ts-ignore
                                const images = product?.product_images || [];
                                const primaryImage = images.find((img: any) => img.is_primary)?.url || images[0]?.url;

                                return (
                                    <div key={item.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row gap-8 items-center group">
                                        {/* Ürün Görseli */}
                                        <div className="relative w-32 h-32 bg-[#fefcf5] rounded-xl border border-gray-100 flex items-center justify-center flex-shrink-0 group-hover:border-[#f0c961] transition-colors overflow-hidden">
                                            {primaryImage ? (
                                                <img src={primaryImage} alt={product?.name || "Ürün"} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-5xl opacity-80 group-hover:scale-110 transition-transform duration-300">📦</span>
                                            )}
                                        </div>

                                        {/* Ürün Bilgisi */}
                                        <div className="flex-grow text-center sm:text-left space-y-2">
                                            <div className="flex items-start justify-between">
                                                <h3 className="font-black text-[#1a1a1a] text-xl leading-tight">
                                                    {product?.name || item.product_variants.name}
                                                    {item.product_variants.name !== product?.name && (
                                                        <span className="text-sm font-normal text-gray-500 block">
                                                            {item.product_variants.name}
                                                        </span>
                                                    )}
                                                </h3>
                                                <button onClick={() => handleRemoveItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Stok Kodu: ORB-{item.product_variants.id.substring(0, 4)}</p>
                                            <div className="text-sm font-medium text-gray-500 bg-gray-50 inline-block px-3 py-1 rounded-full">
                                                Birim Fiyat: <span className="text-black font-bold">{item.unitPrice?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                            </div>
                                        </div>

                                        {/* Adet ve Tutar */}
                                        <div className="flex flex-col items-center sm:items-end gap-4 min-w-[140px]">
                                            <div className="font-black text-2xl text-[#1a1a1a]">
                                                {item.lineTotal?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                            </div>

                                            <div className="flex items-center h-10 border-2 border-gray-100 rounded-lg overflow-hidden bg-gray-50">
                                                <button onClick={() => handleUpdateQuantity(item, -1)} disabled={updating === item.id} className="w-10 h-full flex items-center justify-center hover:bg-[#f0c961] hover:text-white transition-colors text-gray-500 font-bold text-lg">-</button>
                                                <div className="w-12 h-full flex items-center justify-center font-black text-[#1a1a1a] bg-white border-l border-r border-gray-100">{item.quantity}</div>
                                                <button onClick={() => handleUpdateQuantity(item, 1)} disabled={updating === item.id} className="w-10 h-full flex items-center justify-center hover:bg-[#f0c961] hover:text-white transition-colors text-gray-500 font-bold text-lg">+</button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Sağ Kolon: Özet */}
                        <div className="lg:col-span-1">
                            <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl sticky top-8">
                                <h3 className="text-xl font-black text-[#1a1a1a] mb-8 border-b-2 border-[#fefcf5] pb-4 uppercase tracking-wide flex items-center gap-2">
                                    <span>🧾</span> Sipariş Özeti
                                </h3>

                                <div className="space-y-4 mb-8">
                                    <div className="flex justify-between text-gray-500 font-medium">
                                        <span>Ara Toplam</span>
                                        <span className="font-bold text-[#1a1a1a]">{cartTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-500 font-medium items-center">
                                        <span>Kargo Ücreti</span>
                                        <span className="text-[#f0c961] font-bold text-xs bg-[#fefcf5] border border-[#f0c961]/20 px-3 py-1 rounded-full uppercase tracking-wide">ÜCRETSİZ</span>
                                    </div>
                                </div>

                                <div className="flex justify-between mb-8 pt-8 border-t-2 border-dashed border-gray-100">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-gray-400 uppercase">Toplam Tutar</span>
                                        <span className="text-xs text-gray-300">(KDV Dahil)</span>
                                    </div>
                                    <span className="text-3xl font-black text-[#f0c961]">
                                        {cartTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                    </span>
                                </div>

                                <Link to="/checkout" className="w-full bg-[#1a1a1a] text-white font-black py-5 rounded-xl shadow-lg hover:shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3 uppercase tracking-wider text-base group">
                                    Siparişi Tamamla
                                    <svg className="w-5 h-5 text-[#f0c961] group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                </Link>

                                <div className="mt-8 grid grid-cols-2 gap-4 text-center">
                                    <div className="bg-[#fefcf5] p-3 rounded-lg border border-[#f0c961]/10">
                                        <div className="text-xl mb-1">🔒</div>
                                        <div className="text-[10px] font-bold text-gray-500 uppercase">Güvenli Ödeme</div>
                                    </div>
                                    <div className="bg-[#fefcf5] p-3 rounded-lg border border-[#f0c961]/10">
                                        <div className="text-xl mb-1">🚚</div>
                                        <div className="text-[10px] font-bold text-gray-500 uppercase">Hızlı Kargo</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CartPage;
