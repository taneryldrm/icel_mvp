import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useParams, Link } from 'react-router-dom';
import VariantModal from '../../components/admin/VariantModal';

interface PriceList {
    id: number;
    name: string;
    currency: string;
    type: string; // 'b2b', 'b2c' vb.
}

interface VariantDisplay {
    id: string;
    product_name: string;
    name: string;
    sku: string;
    stock: number;
    base_price: number;
    is_active: boolean;
    prices: { [key: number]: number }; // price_list_id -> price
}

const AdminProductDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [variants, setVariants] = useState<VariantDisplay[]>([]);
    const [priceLists, setPriceLists] = useState<PriceList[]>([]);
    const [productName, setProductName] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [, setUpdating] = useState<string | null>(null); // Hangi varyant güncelleniyor
    const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
    const [editingVariant, setEditingVariant] = useState<VariantDisplay | null>(null);

    const handleDeleteVariant = async (variantId: string, name: string) => {
        if (!window.confirm(`"${name}" varyantını silmek istediğinize emin misiniz?`)) return;

        try {
            // 1. Önce sepet öğelerini sil (FK Constraint)
            const { error: ciError } = await supabase.from('cart_items').delete().eq('variant_id', variantId);
            if (ciError) throw ciError;

            // 2. Fiyatlarını sil
            const { error: vpError } = await supabase.from('variant_prices').delete().eq('variant_id', variantId);
            if (vpError) throw vpError;

            // 3. Varyantı sil
            const { error: vError } = await supabase.from('product_variants').delete().eq('id', variantId);
            if (vError) throw vError;

            alert("Varyant ve ilişkili veriler (fiyatlar, sepet) silindi.");
            fetchData();
        } catch (error) {
            console.error(error);
            alert("Silme işlemi başarısız.");
        }
    };

    const fetchData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            // 1. Fiyat Listelerini Çek
            const { data: plData } = await supabase.from('price_lists').select('*').order('id');
            setPriceLists(plData || []);

            // 2. Ürün Adını Çek
            const { data: productData } = await supabase.from('products').select('name').eq('id', id).single();
            setProductName(productData?.name || '');

            // 3. Varyantları ve Fiyatları Çek
            const { data: variantsData, error } = await supabase
                .from('product_variants')
                .select(`
id, name, sku, stock, base_price, is_active,
    variant_prices(price, price_list_id, is_active)
        `)
                .eq('product_id', id)
                .order('name');

            if (error) throw error;

            // 4. Veriyi Formatla
            const formatted: VariantDisplay[] = (variantsData || []).map((v: any) => {
                const pricesMap: { [key: number]: number } = {};
                if (v.variant_prices) {
                    v.variant_prices.forEach((vp: any) => {
                        if (vp.is_active) pricesMap[vp.price_list_id] = vp.price;
                    });
                }
                return {
                    id: v.id,
                    product_name: productData?.name || '',
                    name: v.name,
                    sku: v.sku,
                    stock: v.stock,
                    base_price: v.base_price,
                    is_active: v.is_active,
                    prices: pricesMap
                };
            });

            setVariants(formatted);

        } catch (err) {
            console.error("Veri hatası:", err);
            alert("Veriler yüklenirken hata oluştu.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // STOK GÜNCELLEME
    const handleStockChange = async (variantId: string, newStock: number) => {
        if (newStock < 0) return;
        setUpdating(variantId);
        try {
            const { error } = await supabase
                .from('product_variants')
                .update({ stock: newStock })
                .eq('id', variantId);

            if (error) throw error;
            // Optimistic update
            setVariants(prev => prev.map(v => v.id === variantId ? { ...v, stock: newStock } : v));
        } catch (e) {
            alert("Stok güncellenemedi.");
        } finally {
            setUpdating(null);
        }
    };

    // AKTİFLİK GÜNCELLEME
    const toggleStatus = async (variantId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase.from('product_variants').update({ is_active: !currentStatus }).eq('id', variantId);
            if (error) throw error;
            setVariants(prev => prev.map(v => v.id === variantId ? { ...v, is_active: !currentStatus } : v));
        } catch (e) {
            alert("Durum güncellenemedi");
        }
    };

    // FİYAT GÜNCELLEME (UPSERT)
    const handlePriceChange = async (variantId: string, priceListId: number, newPrice: number) => {
        if (newPrice < 0) return;
        // setUpdating(variantId); // Çok fazla render tetiklememek için burayı pasif bırakabiliriz veya loading gösterebiliriz
        try {
            // Upsert mantığı: Varsa güncelle, yoksa ekle
            const { error } = await supabase
                .from('variant_prices')
                .upsert({
                    variant_id: variantId,
                    price_list_id: priceListId,
                    price: newPrice,
                    is_active: true
                }, { onConflict: 'variant_id, price_list_id' });

            if (error) throw error;

            setVariants(prev => prev.map(v => {
                if (v.id === variantId) {
                    return { ...v, prices: { ...v.prices, [priceListId]: newPrice } };
                }
                return v;
            }));
        } catch (e) {
            console.error(e);
            alert("Fiyat kaydedilemedi.");
        }
    };

    // BASE PRICE GÜNCELLEME
    const handleBasePriceChange = async (variantId: string, val: number) => {
        if (val < 0) return;
        try {
            const { error } = await supabase.from('product_variants').update({ base_price: val }).eq('id', variantId);
            if (error) throw error;
            setVariants(prev => prev.map(v => v.id === variantId ? { ...v, base_price: val } : v));
        } catch (e) {
            alert("Ana fiyat güncellenemedi");
        }
    };

    if (loading && variants.length === 0) {
        return <div className="p-8 text-center">Yükleniyor...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8 text-xs">
            <div className="max-w-[1600px] mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <Link to="/admin/products" className="text-gray-500 hover:text-gray-900 mb-2 inline-block">&larr; Ürünlere Dön</Link>
                        <h1 className="text-2xl font-bold text-gray-900">{productName} - Varyantlar</h1>
                    </div>
                    <button
                        onClick={() => setIsVariantModalOpen(true)}
                        className="bg-[#f0c961] hover:bg-[#e0b850] text-black font-semibold py-2 px-4 rounded-lg shadow-sm flex items-center gap-2"
                    >
                        <span className="text-lg leading-none">+</span> Yeni Varyant
                    </button>
                </div>

                <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-gray-100 border-b border-gray-200">
                            <tr>
                                <th className="p-3 font-bold text-gray-600 w-10 text-center">#</th>
                                <th className="p-3 font-bold text-gray-600 min-w-[150px]">Varyant Adı</th>
                                <th className="p-3 font-bold text-gray-600 w-32">SKU</th>
                                <th className="p-3 font-bold text-gray-600 w-24 text-center">Durum</th>
                                <th className="p-3 font-bold text-gray-600 w-24 text-center">Stok</th>
                                <th className="p-3 font-bold text-gray-900 bg-[#f0c961]/20 border-l border-r border-[#f0c961]/30 w-32 text-center">
                                    Ana Fiyat (TL)
                                </th>
                                {priceLists.map(pl => (
                                    <th key={pl.id} className="p-3 font-semibold text-gray-500 w-32 text-center border-r border-gray-100 last:border-0">
                                        <div className="flex flex-col">
                                            <span>{pl.name}</span>
                                            <span className="text-[10px] opacity-70">({pl.currency})</span>
                                        </div>
                                    </th>
                                ))}
                                <th className="p-3 font-bold text-gray-600 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {variants.map((v, index) => (
                                <tr key={v.id} className={`hover:bg-gray-50 transition-colors ${!v.is_active ? 'opacity-60 bg-gray-50' : ''}`}>
                                    <td className="p-3 text-center text-gray-400">{index + 1}</td>
                                    <td className="p-3 font-medium text-gray-900">
                                        {v.name}
                                    </td>
                                    <td className="p-3 font-mono text-gray-500">
                                        {v.sku}
                                    </td>
                                    <td className="p-3 text-center">
                                        <button
                                            onClick={() => toggleStatus(v.id, v.is_active)}
                                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${v.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}
                                            title={v.is_active ? "Aktif (Pasif yap)" : "Pasif (Aktif yap)"}
                                        >
                                            <div className={`w-2.5 h-2.5 rounded-full ${v.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                        </button>
                                    </td>
                                    <td className="p-3">
                                        <input
                                            type="number"
                                            value={v.stock}
                                            onChange={(e) => handleStockChange(v.id, Number(e.target.value))}
                                            className="w-20 px-2 py-1 text-center border border-gray-200 rounded focus:ring-1 focus:ring-[#f0c961] focus:border-[#f0c961]"
                                        />
                                    </td>
                                    <td className="p-3 bg-[#f0c961]/5 border-l border-r border-[#f0c961]/10">
                                        <div className="flex items-center justify-center">
                                            <input
                                                type="number"
                                                value={v.base_price}
                                                onChange={(e) => handleBasePriceChange(v.id, Number(e.target.value))}
                                                className="w-24 px-2 py-1 text-center font-bold text-gray-900 bg-white border border-[#f0c961]/50 rounded focus:ring-2 focus:ring-[#f0c961] focus:border-transparent shadow-sm"
                                            />
                                        </div>
                                    </td>

                                    {/* Dinamik Fiyat Inputs */}
                                    {priceLists.map(pl => {
                                        const currentPrice = v.prices[pl.id];
                                        return (
                                            <td key={pl.id} className="p-3 text-center border-r border-gray-50 last:border-0">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder={pl.type === 'b2c' ? v.base_price.toString() : '-'}
                                                    value={currentPrice || ''}
                                                    onChange={(e) => handlePriceChange(v.id, pl.id, Number(e.target.value))}
                                                    className="w-24 px-2 py-1 text-center text-gray-600 border border-gray-100 rounded focus:ring-1 focus:ring-[#f0c961] focus:border-[#f0c961] bg-gray-50/50 hover:bg-white transition-colors"
                                                />
                                            </td>
                                        );
                                    })}

                                    <td className="p-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => {
                                                    setEditingVariant(v);
                                                    setIsVariantModalOpen(true);
                                                }}
                                                className="text-xs text-yellow-700 hover:text-yellow-900 bg-yellow-50 px-2 py-1 rounded"
                                            >
                                                Düzenle
                                            </button>
                                            <button
                                                onClick={() => handleDeleteVariant(v.id, v.name)}
                                                className="text-xs text-red-600 hover:text-red-900 bg-red-50 px-2 py-1 rounded"
                                            >
                                                Sil
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {id && (
                <VariantModal
                    isOpen={isVariantModalOpen}
                    onClose={() => {
                        setIsVariantModalOpen(false);
                        setEditingVariant(null); // Reset edit state on close
                    }}
                    onSave={fetchData}
                    productId={id}
                    editVariant={editingVariant}
                />
            )}
        </div>
    );
};

export default AdminProductDetail;
