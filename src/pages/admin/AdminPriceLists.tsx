import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Link } from 'react-router-dom';

interface PriceList {
    id: number;
    name: string;
    currency: string;
    type: string;
    created_at: string;
}

const AdminPriceLists: React.FC = () => {
    const [priceLists, setPriceLists] = useState<PriceList[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchPriceLists = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('price_lists')
                    .select('*')
                    .order('id');

                if (error) throw error;
                setPriceLists(data || []);
            } catch (error) {
                console.error("Error fetching price lists:", error);
                alert("Fiyat listeleri yüklenirken bir hata oluştu.");
            } finally {
                setLoading(false);
            }
        };

        fetchPriceLists();
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-500">Yükleniyor...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-[95%] mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Fiyat Listeleri</h1>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-100 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                            <tr>
                                <th className="p-4 w-16 text-center">ID</th>
                                <th className="p-4">Liste Adı</th>
                                <th className="p-4 w-32">Para Birimi</th>
                                <th className="p-4 w-32 text-center">Tip</th>
                                <th className="p-4 w-40">Oluşturulma</th>
                                <th className="p-4 w-32 text-center">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {priceLists.map((pl) => (
                                <tr key={pl.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 text-center text-gray-500 font-mono text-xs">#{pl.id}</td>
                                    <td className="p-4 font-medium text-gray-900">{pl.name}</td>
                                    <td className="p-4 text-gray-600">{pl.currency}</td>
                                    <td className="p-4 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${(pl.type || '') === 'b2b'
                                            ? 'bg-purple-100 text-purple-800 border-purple-200'
                                            : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                            }`}>
                                            {(pl.type || '?').toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-500 text-xs">
                                        {new Date(pl.created_at).toLocaleDateString('tr-TR')}
                                    </td>
                                    <td className="p-4 text-center">
                                        <Link
                                            to={`/admin/price-lists/${pl.id}`}
                                            className="inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f0c961]"
                                        >
                                            Yönet
                                        </Link>
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

export default AdminPriceLists;
