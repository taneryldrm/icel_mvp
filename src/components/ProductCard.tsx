import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getOrCreateActiveCart } from '../lib/cart';


interface ProductVariant {
    id: string;
    product_id: string;
    name: string;
    price?: number; // Calculated price
    base_price: number; // DB price
    stock: number;
    is_active: boolean;
}

interface ProductImage {
    url: string;
    is_primary: boolean;
}

export interface Product {
    id: string;
    name: string;
    slug: string;
    product_images?: ProductImage[];
    product_variants?: ProductVariant[];
}

interface ProductCardProps {
    product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
    const navigate = useNavigate();
    const [adding, setAdding] = useState(false);

    // Determine image to show
    const displayImage = product.product_images?.find(i => i.is_primary)?.url || product.product_images?.[0]?.url;

    // Determine price to show
    // If variants exist, we need to show a price. 
    // Ideally this should be passed in calculated, but if not, we use the first variant or "Fiyat Sorunuz"
    // Since we are fetching variants, we can use base_price of the first variant as a fallback display
    const variants = product.product_variants || [];
    const minPrice = variants.length > 0
        ? Math.min(...variants.map(v => v.price || v.base_price || 0))
        : 0;

    const handleAddToCart = async (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent Link navigation if wrapped
        e.stopPropagation();

        if (variants.length === 0) {
            // No variants? Navigate to product logic to handle error or display
            navigate(`/products/${product.slug}`);
            return;
        }

        // Case B: Multiple Variants -> Go to Detail
        if (variants.length > 1) {
            navigate(`/products/${product.slug}`);
            return;
        }

        // Case A: Single Variant -> Add to Cart
        const variant = variants[0];
        if (variant.stock <= 0) {
            alert('Üzgünüz, bu ürün stokta yok.');
            return;
        }

        setAdding(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // If not logged in, maybe redirect to login or show alert
                // For now, simpler approach:
                if (window.confirm('Sepete eklemek için giriş yapmalısınız. Giriş sayfasına gitmek ister misiniz?')) {
                    navigate('/login');
                }
                return;
            }

            const userId = session.user.id;

            // 1. Get/Create Cart (Helpers ile Reliable)
            const cartId = await getOrCreateActiveCart(userId);

            if (!cartId) {
                alert("Sepet oluşturulamadı. Lütfen tekrar deneyin.");
                setAdding(false);
                return;
            }

            // 2. Add Item
            const { data: existingItem } = await supabase
                .from('cart_items')
                .select('id, quantity')
                .eq('cart_id', cartId)
                .eq('variant_id', variant.id)
                .maybeSingle();

            if (existingItem) {
                await supabase
                    .from('cart_items')
                    .update({ quantity: existingItem.quantity + 1 })
                    .eq('id', existingItem.id);
            } else {
                await supabase
                    .from('cart_items')
                    .insert({
                        cart_id: cartId,
                        variant_id: variant.id,
                        quantity: 1
                    });
            }

            // Success Feedback
            // Could use a toast here, but user asked for "Ürün sepete eklendi uyarısı"
            // Simple alert or changing button text temporarily
            alert('Ürün sepete eklendi!');

        } catch (error) {
            console.error(error);
            alert('Bir hata oluştu.');
        } finally {
            setAdding(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full overflow-hidden group">
            <Link to={`/products/${product.slug}`} className="block relative">
                {/* Image Area: Square or 4:3 */}
                <div className="aspect-[4/3] bg-white p-4 flex items-center justify-center relative overflow-hidden">
                    {displayImage ? (
                        <img
                            src={displayImage}
                            alt={product.name}
                            className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-500"
                        />
                    ) : (
                        <span className="text-4xl">📦</span>
                    )}

                    {/* Badge checks (optional, simplistic) */}
                    {/* <div className="absolute top-2 right-2 ..."></div> */}
                </div>

                {/* Content */}
                <div className="px-4 pt-2 pb-4 text-center">
                    <h3 className="text-gray-900 font-medium leading-snug line-clamp-2 mb-2 min-h-[2.5em] group-hover:text-[#6D4C41] transition-colors">
                        {product.name}
                    </h3>

                    {minPrice > 0 ? (
                        <div className="text-lg font-bold text-[#6D4C41]">
                            {minPrice.toLocaleString('tr-TR')} TL
                        </div>
                    ) : (
                        <div className="text-sm font-bold text-gray-400">
                            Fiyat Bilgisi İçin Tıklayın
                        </div>
                    )}
                </div>
            </Link>

            {/* Button */}
            <div className="mt-auto">
                <button
                    onClick={handleAddToCart}
                    disabled={adding}
                    className="w-full bg-[#6D4C41] text-white font-bold py-3 text-sm tracking-wider hover:bg-[#5D4037] transition-colors disabled:opacity-70 disabled:cursor-not-allowed rounded-b-xl"
                >
                    {adding ? 'EKLENİYOR...' : 'SEPETE EKLE'}
                </button>
            </div>
        </div>
    );
};

export default ProductCard;
