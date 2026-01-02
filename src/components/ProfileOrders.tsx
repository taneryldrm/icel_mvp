import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ChevronDown, ChevronUp, Package, Clock, CheckCircle, XCircle, Truck } from 'lucide-react';

interface ProfileOrdersProps {
    userId: string;
}

interface OrderItem {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    product_name_snapshot?: string;
    products?: {
        name: string;
        product_images: {
            url: string;
        }[];
    } | null;
}

interface Order {
    id: string;
    order_no?: string;
    user_id: string;
    created_at: string;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    grand_total: number;
    order_items: OrderItem[];
}

const ProfileOrders: React.FC<ProfileOrdersProps> = ({ userId }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

    useEffect(() => {
        if (userId) {
            fetchOrders();
        }
    }, [userId]);

    const fetchOrders = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    *,
                    products (
                        name,
                        product_images (
                           url
                        )
                    )
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching orders:', error);
        } else {
            setOrders(data || []);
        }
        setLoading(false);
    };

    const toggleOrder = (orderId: string) => {
        setExpandedOrder(expandedOrder === orderId ? null : orderId);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'text-orange-600 bg-orange-50 border-orange-100';
            case 'processing': return 'text-yellow-800 bg-yellow-100 border-yellow-200';
            case 'shipped': return 'text-purple-600 bg-purple-50 border-purple-100';
            case 'delivered': return 'text-green-600 bg-green-50 border-green-100';
            case 'cancelled': return 'text-red-600 bg-red-50 border-red-100';
            default: return 'text-gray-600 bg-gray-50 border-gray-100';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending': return 'Bekleniyor';
            case 'processing': return 'Hazırlanıyor';
            case 'shipped': return 'Kargoda';
            case 'delivered': return 'Teslim Edildi';
            case 'cancelled': return 'İptal Edildi';
            default: return status;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <Clock className="w-4 h-4" />;
            case 'processing': return <Package className="w-4 h-4" />;
            case 'shipped': return <Truck className="w-4 h-4" />;
            case 'delivered': return <CheckCircle className="w-4 h-4" />;
            case 'cancelled': return <XCircle className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    if (loading) return <div className="text-center py-10 text-gray-400">Yükleniyor...</div>;

    if (orders.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Henüz siparişiniz yok</h3>
                <p className="text-gray-500 mb-6">Sipariş verdiğinizde buradan takip edebilirsiniz.</p>
                <a href="/products" className="inline-block px-6 py-2 bg-[#f0c961] hover:bg-[#e0b850] text-black font-bold rounded-lg transition-colors">
                    Alışverişe Başla
                </a>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Sipariş Geçmişim</h2>
            {orders.map((order) => (
                <div key={order.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    {/* Header */}
                    <div className="p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer bg-gray-50/50" onClick={() => toggleOrder(order.id)}>
                        <div className="flex items-center gap-4 md:gap-8 flex-1">
                            <div>
                                <div className="text-xs text-gray-500 uppercase font-bold mb-1">Sipariş Tarihi</div>
                                <div className="font-medium text-gray-900">
                                    {new Date(order.created_at).toLocaleDateString('tr-TR')}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 uppercase font-bold mb-1">Sipariş No</div>
                                <div className="font-mono text-gray-900">#{order.order_no || (order.id || '').slice(0, 8)}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 uppercase font-bold mb-1">Tutar</div>
                                <div className="font-bold text-[#1a1a1a]">
                                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(order.grand_total)}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold ${getStatusColor(order.status)}`}>
                                {getStatusIcon(order.status)}
                                <span>{getStatusText(order.status)}</span>
                            </div>
                            <button className="text-gray-400 hover:text-gray-600 transition-colors">
                                {expandedOrder === order.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Details (Accordion) */}
                    {expandedOrder === order.id && (
                        <div className="border-t border-gray-100 p-4 md:p-6 bg-white animate-fade-in">
                            <h4 className="font-bold text-sm text-gray-700 mb-4">Sipariş İçeriği</h4>
                            <div className="space-y-4">
                                {order.order_items.map((item) => (
                                    <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                                        <div className="w-16 h-16 bg-white border border-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                                            {item.products?.product_images?.[0]?.url ? (
                                                <img src={item.products.product_images[0].url} alt={item.products.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs text-center p-1">Görsel Yok</div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-gray-900 text-sm line-clamp-1">
                                                {item.products?.name || item.product_name_snapshot || 'Ürün Bilgisine Ulaşılamadı'}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">Stok Kodu: {(item.product_id || '').slice(0, 6)}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-gray-900">
                                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.line_total || item.unit_price)}
                                            </div>
                                            <div className="text-xs text-gray-500">x {item.quantity} Adet</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default ProfileOrders;
