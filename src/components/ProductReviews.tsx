import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Star, User } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Review {
    id: string;
    user_id: string;
    rating: number;
    comment: string;
    created_at: string;
    profiles?: {
        full_name: string;
    };
}

interface ProductReviewsProps {
    productId: string;
}

const ProductReviews: React.FC<ProductReviewsProps> = ({ productId }) => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    // User's existing review state
    const [userHasReviewed, setUserHasReviewed] = useState(false);
    const [userExistingRating, setUserExistingRating] = useState<number | null>(null);

    // Form State
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchReviews();
        checkUserAndReview();
    }, [productId]);

    const checkUserAndReview = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user || null;
        setUser(currentUser);

        if (currentUser) {
            // Check if user has ANY review (approved or pending) for this product
            const { data } = await supabase
                .from('product_reviews')
                .select('id, rating')
                .eq('product_id', productId)
                .eq('user_id', currentUser.id)
                .maybeSingle();

            if (data) {
                setUserHasReviewed(true);
                setUserExistingRating(data.rating);
            }
        }
    };

    const fetchReviews = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('product_reviews')
            .select('*, profiles(full_name)')
            .eq('product_id', productId)
            .eq('is_approved', true) // Only approved reviews
            .order('created_at', { ascending: false });

        if (!error && data) {
            setReviews(data);
        }
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSubmitting(true);
        setSubmitMessage(null);

        try {
            const { error } = await supabase.from('product_reviews').insert({
                product_id: productId,
                user_id: user.id,
                rating,
                comment,
                is_approved: false // Pending approval
            });

            if (error) {
                // Check for unique constraint violation code (Postgres 23505)
                if (error.code === '23505') {
                    setSubmitMessage({ type: 'error', text: 'Bu ürün için zaten bir değerlendirmeniz var.' });
                    setUserHasReviewed(true); // Update state just in case
                } else {
                    throw error;
                }
            } else {
                setSubmitMessage({ type: 'success', text: 'Yorumunuz başarıyla gönderildi.' });
                setComment('');
                setRating(5);
                setUserHasReviewed(true); // Hide form immediately
                setUserExistingRating(rating);
            }
        } catch (error: any) {
            console.error('Review error:', error);
            setSubmitMessage({ type: 'error', text: 'Yorum gönderilirken bir hata oluştu.' });
        } finally {
            setSubmitting(false);
        }
    };

    // Calculate Average
    const averageRating = reviews.length > 0
        ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
        : '0.0';

    return (
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100 mt-8">
            <h2 className="text-2xl font-black text-[#1a1a1a] mb-8 flex items-center gap-3">
                <Star className="w-8 h-8 text-[#f0c961] fill-[#f0c961]" />
                Ürün Değerlendirmeleri
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                {/* Sol Kolon: Özet & Form */}
                <div className="md:col-span-1 space-y-8">
                    {/* Özet Kartı */}
                    <div className="bg-gray-50 rounded-2xl p-6 text-center border border-gray-100">
                        <div className="text-5xl font-black text-[#1a1a1a] mb-2">{averageRating}</div>
                        <div className="flex justify-center mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={`w-5 h-5 ${star <= Number(averageRating) ? 'text-[#f0c961] fill-[#f0c961]' : 'text-gray-300'}`}
                                />
                            ))}
                        </div>
                        <div className="text-gray-500 text-sm font-medium">{reviews.length} Değerlendirme</div>
                    </div>

                    {/* Yorum Formu */}
                    <div className="border-t border-gray-100 pt-8">
                        <h3 className="font-bold text-lg mb-4">Yorum Yap</h3>

                        {user ? (
                            userHasReviewed ? (
                                // Kullanıcı zaten yorum yapmışsa gösterilecek mesaj
                                <div className="bg-green-50 rounded-xl p-6 border border-green-100 text-center">
                                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Star className="w-6 h-6 fill-current" />
                                    </div>
                                    <h4 className="font-bold text-gray-900 mb-2">Teşekkür Ederiz!</h4>
                                    <p className="text-gray-600 text-sm mb-3">Bu ürünü daha önce değerlendirdiniz.</p>
                                    {userExistingRating && (
                                        <div className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-green-200">
                                            <span className="text-xs font-bold text-gray-500">Puanınız:</span>
                                            <div className="flex">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star
                                                        key={star}
                                                        className={`w-3 h-3 ${star <= userExistingRating ? 'text-[#f0c961] fill-[#f0c961]' : 'text-gray-200'}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {/* Başarı mesajı varsa (yeni gönderildiyse) burada da gösterelim */}
                                    {submitMessage && submitMessage.type === 'success' && (
                                        <div className="mt-4 text-xs font-bold text-green-700 bg-white p-2 rounded-lg">
                                            {submitMessage.text}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // Kullanıcı henüz yorum yapmamışsa gösterilecek form
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Puanınız</label>
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => setRating(star)}
                                                    className="focus:outline-none transition-transform hover:scale-110"
                                                >
                                                    <Star
                                                        className={`w-8 h-8 ${star <= rating ? 'text-[#f0c961] fill-[#f0c961]' : 'text-gray-200'}`}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Yorumunuz</label>
                                        <textarea
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            rows={4}
                                            required
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f0c961] focus:border-transparent resize-none"
                                            placeholder="Ürün hakkındaki düşünceleriniz..."
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full bg-[#1a1a1a] text-[#f0c961] font-bold py-3 rounded-xl hover:bg-[#333] transition-colors disabled:opacity-70"
                                    >
                                        {submitting ? 'Gönderiliyor...' : 'Yorumu Gönder'}
                                    </button>
                                    {submitMessage && (
                                        <div className={`p-3 rounded-lg text-sm font-medium ${submitMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                            {submitMessage.text}
                                        </div>
                                    )}
                                </form>
                            )
                        ) : (
                            <div className="text-center p-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                <p className="text-gray-600 mb-4">Yorum yapabilmek için giriş yapmalısınız.</p>
                                <Link to="/login" className="inline-block bg-[#f0c961] text-[#1a1a1a] font-bold px-6 py-2 rounded-lg hover:bg-[#e0b950] transition-colors">
                                    Giriş Yap
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sağ Kolon: Yorum Listesi */}
                <div className="md:col-span-2 space-y-6">
                    <h3 className="font-bold text-lg border-b border-gray-100 pb-4">Müşteri Yorumları</h3>

                    {loading ? (
                        <div className="text-center py-12 text-gray-400">Yükleniyor...</div>
                    ) : reviews.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <div className="text-4xl mb-3">💬</div>
                            <h4 className="text-gray-900 font-bold mb-1">Henüz Yorum Yok</h4>
                            <p className="text-gray-500">Bu ürünü ilk değerlendiren siz olun!</p>
                        </div>
                    ) : (
                        reviews.map((review) => (
                            <div key={review.id} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-gray-200 text-gray-400">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-[#1a1a1a]">{review.profiles?.full_name || 'İsimsiz Kullanıcı'}</div>
                                            <div className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString('tr-TR')}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                                key={star}
                                                className={`w-4 h-4 ${star <= review.rating ? 'text-[#f0c961] fill-[#f0c961]' : 'text-gray-300'}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <p className="text-gray-600 leading-relaxed font-light">
                                    {review.comment}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductReviews;
