import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
interface MainCategory {
    id: string;
    name: string;
    slug: string;
}

interface FeaturedCollection {
    id: string;
    title: string;
    subtitle: string | null;
    image_url: string;
    category_id: string | null; // UUID
    sort_order: number;
    is_active: boolean;
    // For joining
    categories?: {
        name: string;
        slug: string;
    };
}

const AdminFeaturedCollections: React.FC = () => {
    const [collections, setCollections] = useState<FeaturedCollection[]>([]);
    const [categories, setCategories] = useState<MainCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<FeaturedCollection>>({
        title: '',
        subtitle: '',
        image_url: '',
        category_id: '',
        sort_order: 0,
        is_active: true
    });

    // Image Upload State
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        fetchCollections();
        fetchCategories();
    }, []);

    const fetchCollections = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('featured_collections')
            .select(`
                *,
                categories ( name, slug )
            `)
            .order('sort_order', { ascending: true });

        if (error) console.error('Error fetching collections:', error);
        else setCollections(data || []);
        setLoading(false);
    };

    const fetchCategories = async () => {
        const { data, error } = await supabase
            .from('categories')
            .select('id, name, slug')
            .eq('is_active', true)
            .order('name');

        if (error) console.error('Error fetching categories:', error);
        else setCategories(data || []);
    };

    const handleEdit = (collection: FeaturedCollection) => {
        setEditingId(collection.id);
        setFormData({
            title: collection.title,
            subtitle: collection.subtitle,
            image_url: collection.image_url,
            category_id: collection.category_id,
            sort_order: collection.sort_order,
            is_active: collection.is_active
        });
        setPreviewUrl(collection.image_url);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Bu koleksiyonu silmek istediğinize emin misiniz?')) return;

        const { error } = await supabase.from('featured_collections').delete().eq('id', id);
        if (error) {
            alert('Silme işlemi başarısız.');
            console.error(error);
        } else {
            fetchCollections();
        }
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        setUploading(true);

        try {
            // Upload to 'product-images' bucket (reusing existing bucket)
            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, image_url: publicUrl }));
            setPreviewUrl(publicUrl);

        } catch (error) {
            console.error('Upload error:', error);
            alert('Görsel yüklenirken hata oluştu.');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const dataToSave = {
            title: formData.title,
            subtitle: formData.subtitle,
            image_url: formData.image_url,
            category_id: formData.category_id || null, // Allow null if not selected
            sort_order: formData.sort_order,
            is_active: formData.is_active
        };

        let error;
        if (editingId) {
            const { error: updateError } = await supabase
                .from('featured_collections')
                .update(dataToSave)
                .eq('id', editingId);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('featured_collections')
                .insert(dataToSave);
            error = insertError;
        }

        if (error) {
            console.error('Error saving:', error);
            alert('Kaydetme hatası: ' + error.message);
        } else {
            setIsModalOpen(false);
            setEditingId(null);
            setFormData({});
            setPreviewUrl(null);
            fetchCollections();
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            title: '',
            subtitle: '',
            image_url: '',
            category_id: '',
            sort_order: 0,
            is_active: true
        });
        setPreviewUrl(null);
        setIsModalOpen(true);
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Öne Çıkan Koleksiyonlar</h1>
                    <p className="text-gray-500 mt-1">Ana sayfadaki vitrin alanını yönetin.</p>
                </div>
                <button
                    onClick={resetForm}
                    className="flex items-center gap-2 bg-[#f0c961] text-black px-6 py-3 rounded-xl font-bold hover:bg-[#e0b950] transition-colors shadow-sm"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Yeni Ekle
                </button>
            </div>

            {loading ? (
                <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <div className="animate-spin w-8 h-8 border-4 border-[#f0c961] border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-400">Yükleniyor...</p>
                </div>
            ) : collections.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <span className="text-4xl mb-4 block">🖼️</span>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Henüz Koleksiyon Eklenmemiş</h3>
                    <p className="text-gray-500">Yeni bir koleksiyon ekleyerek başlayın.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {collections.map(item => (
                        <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-shadow relative">
                            {/* Image Preview */}
                            <div className="h-48 bg-gray-100 relative overflow-hidden">
                                {item.image_url ? (
                                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">Görsel Yok</div>
                                )}
                                {!item.is_active && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Pasif</span>
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-5">
                                <h3 className="font-bold text-lg text-gray-900 mb-1">{item.title}</h3>
                                {item.subtitle && <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-3">{item.subtitle}</p>}

                                <div className="space-y-2 text-sm text-gray-600 mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400">📂</span>
                                        <span>{item.categories?.name || 'Kategori Yok'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400">🔢</span>
                                        <span>Sıra: {item.sort_order}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-4 border-t border-gray-50">
                                    <button
                                        onClick={() => handleEdit(item)}
                                        className="flex-1 px-4 py-2 bg-gray-50 text-gray-700 font-bold rounded-lg hover:bg-[#f0c961] hover:text-black transition-colors text-sm"
                                    >
                                        Düzenle
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="px-4 py-2 bg-red-50 text-red-500 font-bold rounded-lg hover:bg-red-100 transition-colors"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h3 className="font-bold text-lg text-gray-800">{editingId ? 'Koleksiyon Düzenle' : 'Yeni Koleksiyon Ekle'}</h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
                            </div>

                            <div className="p-6 overflow-y-auto">
                                <form id="collectionForm" onSubmit={handleSubmit} className="space-y-4">
                                    {/* Image Upload */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Görsel</label>
                                        <div className="flex items-center gap-4">
                                            <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                                                {previewUrl ? (
                                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">🖼️</div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageChange}
                                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#fffaf4] file:text-[#f0c961] hover:file:bg-[#f0c961]/10 mb-2"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="veya Görsel URL'si girin"
                                                    value={formData.image_url || ''}
                                                    onChange={e => {
                                                        setFormData({ ...formData, image_url: e.target.value });
                                                        setPreviewUrl(e.target.value);
                                                    }}
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-[#f0c961] focus:border-[#f0c961] outline-none"
                                                />
                                                {uploading && <p className="text-xs text-[#f0c961] mt-1 font-bold animate-pulse">Yükleniyor...</p>}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Başlık</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.title || ''}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-[#f0c961] focus:border-[#f0c961] outline-none"
                                            placeholder="Örn: Solar Piller"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Alt Başlık / Etiket</label>
                                        <input
                                            type="text"
                                            value={formData.subtitle || ''}
                                            onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-[#f0c961] focus:border-[#f0c961] outline-none"
                                            placeholder="Örn: Ürünleri Gör"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Hedef Kategori</label>
                                            <select
                                                value={formData.category_id || ''}
                                                onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-[#f0c961] focus:border-[#f0c961] outline-none"
                                            >
                                                <option value="">Seçiniz...</option>
                                                {categories.map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Sıralama</label>
                                            <input
                                                type="number"
                                                value={formData.sort_order || 0}
                                                onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-[#f0c961] focus:border-[#f0c961] outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-2">
                                        <input
                                            type="checkbox"
                                            id="isActive"
                                            checked={formData.is_active || false}
                                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                            className="w-5 h-5 text-[#f0c961] border-gray-300 rounded focus:ring-[#f0c961]"
                                        />
                                        <label htmlFor="isActive" className="text-sm font-bold text-gray-700 select-none">Aktif (Yayında Göster)</label>
                                    </div>
                                </form>
                            </div>

                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    form="collectionForm"
                                    disabled={uploading}
                                    className="px-6 py-2 text-sm font-bold bg-[#f0c961] text-black rounded-lg hover:bg-[#e0b950] transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {editingId ? 'Güncelle' : 'Kaydet'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminFeaturedCollections;
