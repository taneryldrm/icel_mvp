import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useParams, Link } from 'react-router-dom';

interface VariantDisplay {
    id: string;
    product_name: string; // Joined from products
    name: string;
    sku: string;
    base_price: number;
    list_price: number | null; // Joined from variant_prices
}

const AdminPriceListDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [priceList, setPriceList] = useState<any>(null);
    const [variants, setVariants] = useState<VariantDisplay[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [updating, setUpdating] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            setLoading(true);
            try {
                // 1. Fiyat Listesi Detayı
                const { data: listData, error: listError } = await supabase
                    .from('price_lists')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (listError) throw listError;
                setPriceList(listData);

                // 2. Tüm Varyantlar ve Bu Liste için Fiyatlar
                const { data: variantsData, error: varError } = await supabase
                    .from('product_variants')
                    .select(`
                        id, name, sku, base_price,
                        products ( name ),
                        variant_prices ( price, price_list_id )
                    `)
                    .order('name'); // Ürün ismine göre sıralama daha doğru olabilir ama şimdilik name

                if (varError) throw varError;

                // 3. Veriyi Formatla (Sadece bu price_list_id ye ait fiyatı al)
                const formatted = (variantsData || []).map((v: any) => {
                    const priceEntry = v.variant_prices?.find((vp: any) => vp.price_list_id === parseInt(id));
                    return {
                        id: v.id,
                        product_name: v.products?.name || 'Bilinmeyen Ürün',
                        name: v.name,
                        sku: v.sku,
                        base_price: v.base_price,
                        list_price: priceEntry ? priceEntry.price : null
                    };
                });

                // Sıralama: Önce ürün adına göre, sonra varyant adına göre
                formatted.sort((a: any, b: any) =>
                    a.product_name.localeCompare(b.product_name) || a.name.localeCompare(b.name)
                );

                setVariants(formatted);

            } catch (error) {
                console.error("Error fetching data:", error);
                alert("Veri yüklenemedi.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const handlePriceChange = async (variantId: string, newPrice: string) => {
        const priceVal = parseFloat(newPrice);
        if (isNaN(priceVal) || priceVal < 0) return;

        setUpdating(variantId);
        try {
            const { error } = await supabase
                .from('variant_prices')
                .upsert({
                    variant_id: variantId,
                    price_list_id: parseInt(id!),
                    price: priceVal,
                    is_active: true
                }, { onConflict: 'variant_id, price_list_id' });

            if (error) throw error;

            setVariants(prev => prev.map(v => v.id === variantId ? { ...v, list_price: priceVal } : v));

        } catch (error) {
            console.error("Price update error:", error);
            alert("Fiyat güncellenemedi.");
        } finally {
            setUpdating(null);
        }
    };

    if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;
    if (!priceList) return <div className="p-8 text-center">Fiyat listesi bulunamadı.</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-[95%] mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <Link to="/admin/price-lists" className="text-gray-500 hover:text-gray-900 text-sm mb-1 inline-block">
                            &larr; Listelere Dön
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                            {priceList.name} Yönetimi
                            <span className="text-sm font-normal bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                                {priceList.currency}
                            </span>
                        </h1>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-100 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                            <tr>
                                <th className="p-4">Ürün</th>
                                <th className="p-4">Varyant</th>
                                <th className="p-4 w-32 text-right text-gray-400">Base Fiyat</th>
                                <th className="p-4 w-40 text-right bg-yellow-50 text-yellow-800">
                                    {priceList.name} Fiyatı
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {variants.map((v) => (
                                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-medium text-gray-900">{v.product_name}</td>
                                    <td className="p-4 text-gray-600">
                                        {v.name}
                                        <div className="text-[10px] text-gray-400 font-mono">{v.sku}</div>
                                    </td>

                                    {/* Base Price (Reference) */}
                                    <td className="p-4 text-right text-gray-400 font-mono">
                                        {v.base_price.toLocaleString('tr-TR')}
                                    </td>

                                    {/* Editable List Price */}
                                    <td className="p-4 text-right bg-yellow-50/20">
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.01"
                                                placeholder={v.base_price.toString()}
                                                className={`w-full text-right bg-transparent border rounded px-2 py-1.5 text-sm transition-all focus:bg-white focus:ring-2 focus:ring-[#f0c961] focus:border-transparent ${v.list_price
                                                    ? 'border-yellow-200 text-yellow-900 font-bold'
                                                    : 'border-dashed border-gray-300 text-gray-400'
                                                    }`}
                                                value={v.list_price || ''}
                                                /* Optimistic update for UI responsiveness */
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setVariants(prev => prev.map(pv => {
                                                        if (pv.id === v.id) {
                                                            return { ...pv, list_price: val === '' ? null : parseFloat(val) };
                                                        }
                                                        return pv;
                                                    }));
                                                }}
                                                onBlur={(e) => {
                                                    if (e.target.value) handlePriceChange(v.id, e.target.value);
                                                }}
                                            />
                                            {updating === v.id && (
                                                <div className="absolute right-2 top-2.5 w-1.5 h-1.5 bg-[#f0c961] rounded-full animate-ping"></div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminPriceListDetail;
