import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

import ProductCard from '../components/ProductCard';
import type { Product } from '../components/ProductCard';

// interface Product removed as it is imported


const Products: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProducts = async () => {
            // Simulate a slight delay for the skeleton to be visible (luxury feel)
            await new Promise(resolve => setTimeout(resolve, 800));

            try {
                // 1. Fetch Products & Variants
                const { data: productsData, error: productError } = await supabase
                    .from('products')
                    .select('*, product_images(url, is_primary), product_variants(id, name, base_price, stock)')
                    .eq('is_active', true)
                    .order('created_at', { ascending: false });

                if (productError) throw productError;

                let finalProducts = productsData || [];

                // 2. Check User Role for Pricing
                const { data: { session } } = await supabase.auth.getSession();
                let userRole = 'b2c';

                if (session) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', session.user.id)
                        .maybeSingle();
                    userRole = profile?.role || 'b2c';
                }

                // 3. If B2B, Batch Fetch Prices
                if (userRole === 'b2b' && finalProducts.length > 0) {
                    // Extract all variant IDs
                    const allVariantIds = finalProducts.flatMap(p =>
                        (p.product_variants || []).map((v: any) => v.id)
                    );

                    if (allVariantIds.length > 0) {
                        const { data: priceData, error: priceError } = await supabase
                            .from('variant_prices')
                            .select('variant_id, price')
                            .in('variant_id', allVariantIds)
                            .eq('is_active', true)
                            .order('created_at', { ascending: false }); // get latest

                        if (!priceError && priceData) {
                            // Map prices: variant_id -> price
                            // Since we ordered by created_at desc, the first one found for each variant is the latest/active one.
                            // However, .in() returns a list. We need to process carefully to pick the latest if duplicates exist (though usually logic handles one active).
                            // A simple Map will overwrite if we iterate standardly, but we want the *latest*.
                            // The query result order matters.

                            const priceMap = new Map<string, number>();
                            // We reverse iterate or check existence to ensure we get the correct one if needed, 
                            // but simpler: if we trust the API to return all active prices, we can just use them.
                            // Assuming typical setup:
                            priceData.forEach(p => {
                                // If multiple prices exist (shouldn't if is_active is managed well), first one wins or overwrite? 
                                // Let's populate.
                                if (!priceMap.has(p.variant_id)) {
                                    priceMap.set(p.variant_id, p.price);
                                }
                            });

                            // 4. Inject Prices into Variants
                            finalProducts = finalProducts.map(p => ({
                                ...p,
                                product_variants: (p.product_variants || []).map((v: any) => ({
                                    ...v,
                                    // Inject 'price' property which ProductCard looks for.
                                    // Fallback to base_price if no specific price found.
                                    price: priceMap.get(v.id) || v.base_price
                                }))
                            }));
                        }
                    }
                } else {
                    // B2C: Ensure 'price' is set to base_price for consistency (start with base_price)
                    finalProducts = finalProducts.map(p => ({
                        ...p,
                        product_variants: (p.product_variants || []).map((v: any) => ({
                            ...v,
                            price: v.base_price
                        }))
                    }));
                }

                setProducts(finalProducts);
            } catch (err: any) {
                console.error('Error fetching products:', err);
                setError('Ürünler yüklenirken bir hata oluştu.');
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    // Animation Variants
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 30 },
        show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 50 } }
    };

    return (
        <div className="bg-[#fffaf4] min-h-screen py-20">
            <div className="container mx-auto px-4">

                {/* Page Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="mb-16 text-center"
                >
                    <span className="text-[#f0c961] font-bold text-xs uppercase tracking-[0.3em] mb-2 block">Premium Koleksiyon</span>
                    <h1 className="text-5xl font-black text-[#1a1a1a] mb-4 uppercase tracking-tighter">Ürün Kataloğu</h1>
                    <div className="w-20 h-1 bg-[#f0c961] mx-auto rounded-full mb-6"></div>
                    <p className="text-gray-500 max-w-2xl mx-auto font-light text-lg">
                        En son teknoloji ile üretilmiş, yüksek performanslı solar ve enerji depolama çözümlerimizi keşfedin.
                    </p>
                </motion.div>

                {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-50 text-red-600 p-6 rounded-xl text-center border border-red-100 shadow-sm max-w-lg mx-auto">
                        <p className="font-bold">Bir hata oluştu</p>
                        <p className="text-sm">{error}</p>
                    </motion.div>
                )}

                {/* SKELETON LOADING GRID */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                            <div key={n} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm h-[350px] flex flex-col">
                                <div className="h-48 bg-gray-100 animate-pulse relative"></div>
                                <div className="p-4 flex-1 flex flex-col gap-3">
                                    <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse mx-auto"></div>
                                    <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse mx-auto"></div>
                                    <div className="mt-auto h-10 bg-gray-100 rounded-b-xl animate-pulse"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* PRODUCT GRID */
                    <motion.div
                        variants={container}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8"
                    >
                        <AnimatePresence>
                            {products.map((product) => (
                                <motion.div
                                    key={product.id}
                                    variants={item}
                                    className="h-full"
                                >
                                    <ProductCard product={product} />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}

                {!loading && products.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-32 text-gray-300">
                        <div className="text-8xl mb-6 opacity-30">🔍</div>
                        <p className="text-xl font-light">Aradığınız kriterlere uygun ürün bulunamadı.</p>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default Products;
