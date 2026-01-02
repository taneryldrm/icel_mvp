import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Check, Trash2, Star, MessageSquare } from 'lucide-react';

interface Review {
    id: string;
    rating: number;
    comment: string;
    is_approved: boolean;
    created_at: string;
    profiles?: {
        full_name: string;
        email: string;
    };
    products?: {
        name: string;
        product_images: { url: string }[];
    };
}

const AdminReviews: React.FC = () => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');

    useEffect(() => {
        fetchReviews();
    }, [activeTab]);

    const fetchReviews = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('product_reviews')
            .select(`
                *,
                profiles:user_id (full_name, email),
                products:product_id (name, product_images (url))
            `)
            .eq('is_approved', activeTab === 'approved')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching reviews:', error);
        } else {
            setReviews(data || []);
        }
        setLoading(false);
    };

    const handleApprove = async (id: string) => {
        if (!window.confirm('Bu yorumu onaylamak istiyor musunuz?')) return;

        const { error } = await supabase
            .from('product_reviews')
            .update({ is_approved: true })
            .eq('id', id);

        if (error) {
            alert('Hata: ' + error.message);
        } else {
            // Remove from pending list locally or refresh
            setReviews(prev => prev.filter(r => r.id !== id));
            // Optional: Switch to approved tab or just show success
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Bu yorumu KALICI olarak silmek istediğinize emin misiniz?')) return;

        const { error } = await supabase
            .from('product_reviews')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Hata: ' + error.message);
        } else {
            setReviews(prev => prev.filter(r => r.id !== id));
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Yorum Yönetimi</h1>
                <p className="text-gray-500 mt-1">Ürün değerlendirmelerini onaylayın veya silin.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`pb-3 px-4 text-sm font-bold transition-colors relative ${activeTab === 'pending' ? 'text-[#f0c961]' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Onay Bekleyenler
                    {activeTab === 'pending' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#f0c961]"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('approved')}
                    className={`pb-3 px-4 text-sm font-bold transition-colors relative ${activeTab === 'approved' ? 'text-[#f0c961]' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Onaylananlar
                    {activeTab === 'approved' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#f0c961]"></div>}
                </button>
            </div>

            {/* Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-500">Yükleniyor...</div>
                ) : reviews.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>{activeTab === 'pending' ? 'Onay bekleyen yorum yok.' : 'Henüz onaylanmış yorum yok.'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Ürün</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Kullanıcı</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Puan</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase w-1/3">Yorum</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Tarih</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {reviews.map((review) => (
                                    <tr key={review.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                                    {review.products?.product_images?.[0]?.url ? (
                                                        <img src={review.products.product_images[0].url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs">📦</div>
                                                    )}
                                                </div>
                                                <span className="font-medium text-gray-900 text-sm line-clamp-1 max-w-[150px]" title={review.products?.name}>
                                                    {review.products?.name || 'Bilinmeyen Ürün'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-medium text-gray-900 text-sm">{review.profiles?.full_name || 'Misafir'}</div>
                                            <div className="text-xs text-gray-400">{review.profiles?.email}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-0.5">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <Star key={star} className={`w-3 h-3 ${star <= review.rating ? 'text-[#f0c961] fill-[#f0c961]' : 'text-gray-300'}`} />
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm text-gray-600 line-clamp-2 pr-4" title={review.comment}>
                                                "{review.comment}"
                                            </div>
                                        </td>
                                        <td className="p-4 text-xs text-gray-500">
                                            {new Date(review.created_at).toLocaleDateString('tr-TR')}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {activeTab === 'pending' && (
                                                    <button
                                                        onClick={() => handleApprove(review.id)}
                                                        className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                                        title="Onayla"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(review.id)}
                                                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                    title="Sil"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminReviews;
