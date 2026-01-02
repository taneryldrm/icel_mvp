import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ProductReviews from '../components/ProductReviews';
import { supabase } from '../lib/supabaseClient';
import { getOrCreateActiveCart } from '../lib/cart';
import { fetchUserRole, calculateVariantPrice } from '../lib/pricing';

// --- Types ---
interface Product {
    id: string;
    name: string;
    description: string | null;
    brand: string | null;
    slug: string;
    is_active: boolean;
    product_images?: { url: string; is_primary: boolean }[];
}

interface Variant {
    id: string;
    product_id: string;
    name: string;
    sku: string;
    base_price: number;
    price: number;
    stock: number;
    is_active: boolean;
}

const ProductDetail: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();

    // --- State ---
    const [product, setProduct] = useState<Product | null>(null);
    const [variants, setVariants] = useState<Variant[]>([]);
    const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
    const [quantity, setQuantity] = useState<number>(1);
    const [activeImage, setActiveImage] = useState<string | null>(null);

    // Reset quantity when variant changes
    useEffect(() => {
        setQuantity(1);
    }, [selectedVariant]);

    const handleQuantityChange = (type: 'increase' | 'decrease') => {
        if (!selectedVariant) return;

        if (type === 'increase') {
            if (quantity < selectedVariant.stock) {
                setQuantity(prev => prev + 1);
            }
        } else {
            if (quantity > 1) {
                setQuantity(prev => prev - 1);
            }
        }
    };

    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [addingToCart, setAddingToCart] = useState<boolean>(false);
    const [cartMessage, setCartMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // --- Fetch Data ---
    useEffect(() => {
        const fetchProductAndVariants = async () => {
            if (!slug) return;
            setLoading(true);
            setError(null);

            try {
                // 1. Ürünü Slug veya ID ile Çek
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
                const queryColumn = isUuid ? 'id' : 'slug';

                const { data: productData, error: productError } = await supabase
                    .from('products')
                    .select('id, name, description, brand, slug, is_active, product_images(url, is_primary)')
                    .eq(queryColumn, slug)
                    .single();

                if (productError) throw productError;

                if (!productData) {
                    setError('Ürün bulunamadı.');
                    setLoading(false);
                    return;
                }

                if (!productData.is_active) {
                    setError('Bu ürün şu anda satışa kapalıdır.');
                    setLoading(false);
                    return;
                }

                setProduct(productData);

                // Set Initial Active Image
                if (productData.product_images && productData.product_images.length > 0) {
                    const primary = productData.product_images.find((i: any) => i.is_primary);
                    setActiveImage(primary ? primary.url : productData.product_images[0].url);
                }

                // 2. Varyantları Çek (Active Only)
                const { data: variantsData, error: variantsError } = await supabase
                    .from('product_variants')
                    .select('id, product_id, name, sku, base_price, stock, is_active')
                    .eq('product_id', productData.id)
                    .eq('is_active', true)
                    .order('base_price', { ascending: true });

                if (variantsError) throw variantsError;

                // 3. Kullanıcı Rolü ve Fiyat Hesaplama (Merkezi Logic)
                const userRole = await fetchUserRole();

                const variantsWithPrices = await Promise.all((variantsData || []).map(async (v) => {
                    const finalPrice = await calculateVariantPrice(v.id, v.base_price, userRole);
                    return { ...v, price: finalPrice };
                }));

                setVariants(variantsWithPrices);

            } catch (err: any) {
                console.error('Veri çekme hatası:', err);
                setError('Ürün bilgileri yüklenirken bir hata oluştu.');
            } finally {
                setLoading(false);
            }
        };

        fetchProductAndVariants();
    }, [slug]);

    // --- Add to Cart ---
    const handleAddToCart = async () => {
        if (!selectedVariant) return;
        if (selectedVariant.stock <= 0) return;

        setAddingToCart(true);
        setCartMessage(null);

        try {
            // 1. Oturum Kontrolü
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setCartMessage({ type: 'error', text: 'Sepete eklemek için lütfen giriş yapınız.' });
                setAddingToCart(false);
                return;
            }

            const userId = session.user.id;

            // 2. Aktif Sepeti Bul veya Oluştur (Helpers ile Reliable)
            const cartId = await getOrCreateActiveCart(userId);

            if (!cartId) {
                setCartMessage({ type: 'error', text: 'Sepet oluşturulamadı. Lütfen tekrar deneyin.' });
                setAddingToCart(false);
                return;
            }

            // 3. Ürün Zaten Sepette Var mı?
            const { data: existingItem, error: fetchItemError } = await supabase
                .from('cart_items')
                .select('id, quantity')
                .eq('cart_id', cartId)
                .eq('variant_id', selectedVariant.id)
                .maybeSingle();

            if (fetchItemError) throw fetchItemError;

            if (existingItem) {
                // Güncelle
                const { error: updateError } = await supabase
                    .from('cart_items')
                    .update({ quantity: existingItem.quantity + quantity }) // Add selected quantity
                    .eq('id', existingItem.id);

                if (updateError) throw updateError;
            } else {
                // Yeni Ekle
                const { error: insertError } = await supabase
                    .from('cart_items')
                    .insert({
                        cart_id: cartId,
                        variant_id: selectedVariant.id,
                        quantity: quantity // Use selected quantity
                    });

                if (insertError) throw insertError;
            }

            setCartMessage({ type: 'success', text: 'Ürün başarıyla sepete eklendi!' });

        } catch (err: any) {
            console.error('Sepet hatası:', err);
            setCartMessage({ type: 'error', text: 'Sepete eklenirken bir hata oluştu.' });
        } finally {
            setAddingToCart(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fffaf4]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#f0c961] border-t-transparent"></div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#fffaf4] px-4">
                <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md w-full border border-gray-100">
                    <div className="text-red-500 mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Bir Sorun Oluştu</h2>
                    <p className="text-gray-600 mb-6">{error || 'Ürün bulunamadı.'}</p>
                    <Link to="/products" className="inline-block bg-[#f0c961] text-[#1a1a1a] font-bold px-6 py-3 rounded-xl hover:bg-[#e0b950] transition-colors">
                        Ürünlere Dön
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fffaf4] py-12 px-4 shadow-inner">
            <div className="container mx-auto max-w-6xl">

                {/* 1. Ürün Başlık Alanı */}
                <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100 mb-8 relative overflow-hidden">
                    <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                        <div className="w-full md:w-1/3 flex flex-col gap-4">
                            {/* Main Active Image */}
                            <div className="w-full bg-[#fdfcf8] rounded-2xl aspect-square flex items-center justify-center border border-gray-50 overflow-hidden relative shadow-sm">
                                {activeImage ? (
                                    <img
                                        src={activeImage}
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-9xl drop-shadow-xl filter grayscale opacity-80">📦</span>
                                )}
                            </div>

                            {/* Thumbnail Gallery */}
                            {product.product_images && product.product_images.length > 1 && (
                                <div className="grid grid-cols-4 gap-2">
                                    {product.product_images.map((img, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setActiveImage(img.url)}
                                            className={`
                                                relative aspect-square rounded-lg overflow-hidden border-2 transition-all
                                                ${activeImage === img.url
                                                    ? 'border-[#f0c961] ring-1 ring-[#f0c961] opacity-100'
                                                    : 'border-transparent hover:border-gray-200 opacity-70 hover:opacity-100'}
                                            `}
                                        >
                                            <img
                                                src={img.url}
                                                alt={`${product.name} ${idx + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wider rounded-full">
                                    {product.brand || 'İçel Solar Market'}
                                </span>
                                {product.is_active && (
                                    <span className="flex items-center gap-1 text-green-600 text-xs font-bold uppercase tracking-wider">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                        Aktif Ürün
                                    </span>
                                )}
                            </div>

                            <h1 className="text-3xl md:text-5xl font-black text-[#1a1a1a] mb-6 leading-tight">
                                {product.name}
                            </h1>

                            <p className="text-gray-500 text-lg leading-relaxed max-w-2xl">
                                {product.description || 'Bu ürün için detaylı açıklama bulunmamaktadır.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. Varyant Seçimi & Sepet İşlemleri */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Sol Kolon: Varyant Listesi */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 min-h-[400px]">
                            <h3 className="text-xl font-bold text-[#1a1a1a] mb-6 flex items-center gap-2">
                                <svg className="w-6 h-6 text-[#f0c961]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                                Seçenekler (Varyantlar)
                            </h3>

                            {variants.length === 0 ? (
                                <div className="p-6 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-200 text-center">
                                    Bu ürün için şu anda satışa açık varyant bulunmamaktadır.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {variants.map((v) => {
                                        const isSelected = selectedVariant?.id === v.id;
                                        const hasStock = v.stock > 0;

                                        return (
                                            <button
                                                key={v.id}
                                                onClick={() => hasStock && setSelectedVariant(v)}
                                                disabled={!hasStock}
                                                className={`
                                                    relative flex flex-col items-start p-5 rounded-xl border-2 transition-all duration-200 text-left w-full group
                                                    ${isSelected
                                                        ? 'border-[#f0c961] bg-[#fffaf4] shadow-md ring-1 ring-[#f0c961]'
                                                        : 'border-gray-100 bg-white hover:border-[#f0c961]/50 hover:bg-gray-50'}
                                                    ${!hasStock ? 'opacity-50 cursor-not-allowed grayscale bg-gray-50' : 'cursor-pointer'}
                                                `}
                                            >
                                                <div className="w-full flex justify-between items-start mb-2">
                                                    <span className={`font-bold text-lg ${isSelected ? 'text-[#1a1a1a]' : 'text-gray-700'}`}>
                                                        {v.name}
                                                    </span>
                                                    {isSelected && hasStock && (
                                                        <span className="bg-[#f0c961] text-[#1a1a1a] text-xs font-bold px-2 py-1 rounded-full">
                                                            SEÇİLDİ
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="text-sm text-gray-400 mb-4 font-mono">{v.sku}</div>

                                                <div className="mt-auto w-full pt-4 border-t border-gray-100 flex items-center justify-between">
                                                    <div className="text-xl font-black text-[#1a1a1a]">
                                                        {v.price.toLocaleString('tr-TR')} ₺
                                                    </div>
                                                    <div className={`text-xs font-bold px-2 py-1 rounded ${hasStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {hasStock ? 'STOKTA' : 'TÜKENDİ'}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sağ Kolon: Sepet Özeti */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-3xl p-8 shadow-2xl border border-gray-100 sticky top-32">
                            <h3 className="text-lg font-bold text-gray-400 uppercase tracking-widest mb-6 border-b pb-4">Sipariş Özeti</h3>

                            {!selectedVariant ? (
                                <div className="text-center py-8 text-gray-400 italic bg-gray-50 rounded-xl mb-6 border border-dashed border-gray-200">
                                    Lütfen sol taraftan bir seçenek (varyant) belirleyiniz.
                                </div>
                            ) : (
                                <div className="mb-8 animate-fade-in-up">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-gray-600">Seçilen Ürün:</span>
                                    </div>
                                    <div className="font-bold text-[#1a1a1a] text-lg mb-4 leading-tight">
                                        {product.name} <br />
                                        <span className="text-[#f0c961]">{selectedVariant.name}</span>
                                    </div>

                                    <div className="flex justify-between items-center py-4 border-t border-b border-gray-100 mb-6">
                                        <span className="text-gray-600 font-bold">Toplam Tutar:</span>
                                        <span className="text-3xl font-black text-[#1a1a1a]">
                                            {(selectedVariant.price * quantity).toLocaleString('tr-TR')} ₺
                                        </span>
                                    </div>

                                    {/* Miktar Seçici */}
                                    <div className="mb-6">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Adet</label>
                                        <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-2 border border-gray-200 w-max">
                                            <button
                                                onClick={() => handleQuantityChange('decrease')}
                                                disabled={quantity <= 1}
                                                className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold text-gray-600 hover:text-[#f0c961] disabled:opacity-50 disabled:hover:text-gray-600 transition-colors"
                                            >
                                                -
                                            </button>
                                            <span className="text-xl font-bold text-[#1a1a1a] w-8 text-center">{quantity}</span>
                                            <button
                                                onClick={() => handleQuantityChange('increase')}
                                                disabled={quantity >= selectedVariant.stock}
                                                className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold text-gray-600 hover:text-[#f0c961] disabled:opacity-50 disabled:hover:text-gray-600 transition-colors"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <div className="text-xs text-gray-400 mt-2 font-medium">
                                            Stok: {selectedVariant.stock} Adet
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleAddToCart}
                                disabled={!selectedVariant || addingToCart || (selectedVariant?.stock || 0) <= 0}
                                className={`
                                    w-full py-4 px-6 rounded-xl font-black uppercase tracking-widest transition-all transform active:scale-95 flex items-center justify-center gap-3 shadow-lg
                                    ${!selectedVariant
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                        : 'bg-[#1a1a1a] text-[#f0c961] hover:bg-[#333] hover:shadow-xl hover:-translate-y-1'}
                                `}
                            >
                                {addingToCart ? 'EKLENİYOR...' : 'SEPETE EKLE'}
                            </button>

                            {cartMessage && (
                                <div className={`mt-4 p-4 rounded-xl text-sm font-bold text-center animate-bounce ${cartMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                    {cartMessage.text}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Yorumlar */}
                {product && <ProductReviews productId={product.id} />}

            </div>
        </div>
    );
};

export default ProductDetail;
