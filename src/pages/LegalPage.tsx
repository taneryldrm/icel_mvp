import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

interface LegalPageData {
    id: string;
    slug: string;
    title: string;
    content: string;
}

const LegalPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [pageData, setPageData] = useState<LegalPageData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPageContent = async () => {
            if (!slug) return;
            setLoading(true);
            setError(null);

            try {
                const { data, error } = await supabase
                    .from('legal_pages')
                    .select('*')
                    .eq('slug', slug)
                    .single();

                if (error) throw error;
                if (!data) throw new Error('Sayfa bulunamadı.');

                setPageData(data);

            } catch (err: any) {
                console.error('Error fetching legal page:', err);
                setError('Sayfa içeriği yüklenemedi veya böyle bir sayfa mevcut değil.');
            } finally {
                setLoading(false);
            }
        };

        fetchPageContent();
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center bg-[#fffaf4]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#f0c961] border-t-transparent"></div>
            </div>
        );
    }

    if (error || !pageData) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center bg-[#fffaf4] px-4">
                <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md w-full border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Sayfa Bulunamadı</h2>
                    <p className="text-gray-600 mb-6">{error || 'Aradığınız sayfa mevcut değil.'}</p>
                    <Link to="/" className="inline-block bg-[#f0c961] text-[#1a1a1a] font-bold px-6 py-3 rounded-xl hover:bg-[#e0b950] transition-colors">
                        Anasayfaya Dön
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fffaf4] py-12 px-4">
            <div className="container mx-auto max-w-4xl">
                <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100">
                    <h1 className="text-3xl md:text-4xl font-black text-[#1a1a1a] mb-8 pb-4 border-b border-gray-100">
                        {pageData.title}
                    </h1>

                    <div
                        className="prose prose-lg prose-orange max-w-none text-gray-600 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: pageData.content }}
                    />
                </div>
            </div>
        </div>
    );
};

export default LegalPage;
