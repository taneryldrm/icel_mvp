import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Link } from 'react-router-dom';

interface Order {
    id: string;
    order_no: string;
    user_id: string;
    grand_total: number;
    status: string;
    created_at: string;
    profiles: {
        email: string;
        role: string;
    } | null;
}

const AdminOrders: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            try {
                // Fetch orders with profile info
                const { data, error } = await supabase
                    .from('orders')
                    .select(`
                        id,
                        order_no,
                        user_id,
                        grand_total,
                        status,
                        created_at,
                        profiles:user_id ( email, role )
                    `)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                // Map Supabase response to match our Interface
                // Supabase joins can return arrays, we safely take the first one or object
                const formattedData: Order[] = (data || []).map((item: any) => ({
                    ...item,
                    profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
                }));

                setOrders(formattedData);
            } catch (error) {
                console.error("Error fetching orders:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full border border-yellow-200">Beklemede</span>;
            case 'approved': return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full border border-yellow-200">Onaylandı</span>;
            case 'shipped': return <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full border border-purple-200">Kargolandı</span>;
            case 'delivered': return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full border border-green-200">Teslim Edildi</span>;
            case 'cancelled': return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full border border-red-200">İptal</span>;
            default: return <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full border border-gray-200">{status}</span>;
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Siparişler yükleniyor...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-[95%] mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Siparişler</h1>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-100 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                            <tr>
                                <th className="p-4">Sipariş No</th>
                                <th className="p-4">Müşteri</th>
                                <th className="p-4">Rol</th>
                                <th className="p-4">Tarih</th>
                                <th className="p-4 text-center">Durum</th>
                                <th className="p-4 text-right">Tutar</th>
                                <th className="p-4 text-center">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {orders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-500">Henüz sipariş bulunmuyor.</td>
                                </tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-mono font-medium text-gray-900">{order.order_no}</td>
                                        <td className="p-4 text-gray-600">{order.profiles?.email || 'Silinmiş Kullanıcı'}</td>
                                        <td className="p-4">
                                            <span className={`text-[10px] px-2 py-0.5 rounded border uppercase ${order.profiles?.role === 'b2b' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                                {order.profiles?.role || '-'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-500 text-xs">
                                            {new Date(order.created_at).toLocaleDateString('tr-TR')} <br />
                                            {new Date(order.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="p-4 text-center">
                                            {getStatusBadge(order.status)}
                                        </td>
                                        <td className="p-4 text-right font-bold text-gray-900">
                                            {order.grand_total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                        </td>
                                        <td className="p-4 text-center">
                                            <Link
                                                to={`/admin/orders/${order.id}`}
                                                className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-colors"
                                            >
                                                Detay
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminOrders;
