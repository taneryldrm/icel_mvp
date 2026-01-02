import React, { useEffect, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { supabase } from '../../lib/supabaseClient';
import { Trash2, Edit, Plus, Save, X, ImageIcon, UploadCloud } from 'lucide-react';

// --- Types ---
interface HeroSlide {
    id: string;
    image_url: string;
    title: string;
    subtitle?: string;
    description?: string;
    button_text?: string;
    target_link?: string;
    sort_order: number;
    is_active: boolean;
    created_at?: string;
}

interface Category {
    id: string;
    name: string;
    slug: string;
}

interface FormInputs {
    title: string;
    subtitle: string;
    description: string;
    button_text: string;
    target_category_slug: string; // Dropdown value
    sort_order: number;
    is_active: boolean;
}

const AdminHeroSlides: React.FC = () => {
    // --- State ---
    const [slides, setSlides] = useState<HeroSlide[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentSlideId, setCurrentSlideId] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormInputs>();

    // --- Fetch Data ---
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        // Fetch Slides
        const { data: slidesData, error: slidesError } = await supabase
            .from('hero_slides')
            .select('*')
            .order('sort_order', { ascending: true });

        if (slidesError) console.error('Error fetching slides:', slidesError);
        else setSlides(slidesData || []);

        // Fetch Categories for Dropdown
        const { data: catsData, error: catsError } = await supabase
            .from('categories')
            .select('id, name, slug')
            .order('name');

        if (catsError) console.error('Error fetching categories:', catsError);
        else setCategories(catsData || []);

        setLoading(false);
    };

    // --- Handlers ---
    const handleAddNew = () => {
        setIsEditing(true);
        setCurrentSlideId(null);
        setSelectedImage(null);
        setImagePreview(null);
        reset({
            title: '',
            subtitle: '',
            description: '',
            button_text: 'İncele',
            target_category_slug: '',
            sort_order: slides.length + 1,
            is_active: true
        });
    };

    const handleEdit = (slide: HeroSlide) => {
        setIsEditing(true);
        setCurrentSlideId(slide.id);
        setSelectedImage(null);
        setImagePreview(slide.image_url);

        // Extract slug from target_link if possible (assuming format /kategori/slug)
        let categorySlug = '';
        if (slide.target_link && slide.target_link.startsWith('/kategori/')) {
            categorySlug = slide.target_link.replace('/kategori/', '');
        }

        reset({
            title: slide.title,
            subtitle: slide.subtitle || '',
            description: slide.description || '',
            button_text: slide.button_text || '',
            target_category_slug: categorySlug,
            sort_order: slide.sort_order,
            is_active: slide.is_active
        });
    };

    const handleDelete = async (id: string, imageUrl: string) => {
        if (!window.confirm('Bu slaytı silmek istediğinize emin misiniz?')) return;

        // 1. Delete DB record
        const { error } = await supabase.from('hero_slides').delete().eq('id', id);
        if (error) {
            alert('Silme hatası: ' + error.message);
            return;
        }

        // 2. (Optional) Delete image from storage if needed
        // Keeping it simple for now, or you can implement storage deletion here.

        setSlides(prev => prev.filter(s => s.id !== id));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const onFormSubmit: SubmitHandler<FormInputs> = async (data) => {
        try {
            setUploading(true);
            let finalImageUrl = imagePreview;

            // 1. Upload Image if new one selected
            if (selectedImage) {
                const fileExt = selectedImage.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('hero-images')
                    .upload(filePath, selectedImage);

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('hero-images')
                    .getPublicUrl(filePath);

                finalImageUrl = publicUrlData.publicUrl;
            }

            if (!finalImageUrl) {
                alert('Lütfen bir resim yükleyin.');
                setUploading(false);
                return;
            }

            // 2. Prepare Payload
            const payload = {
                title: data.title,
                subtitle: data.subtitle,
                description: data.description,
                button_text: data.button_text,
                target_link: data.target_category_slug ? `/kategori/${data.target_category_slug}` : '',
                sort_order: data.sort_order,
                is_active: data.is_active,
                image_url: finalImageUrl
            };

            // 3. Insert or Update
            if (currentSlideId) {
                // Update
                const { error } = await supabase
                    .from('hero_slides')
                    .update(payload)
                    .eq('id', currentSlideId);
                if (error) throw error;
            } else {
                // Insert
                const { error } = await supabase
                    .from('hero_slides')
                    .insert([payload]);
                if (error) throw error;
            }

            // 4. Refresh & Close
            setIsEditing(false);
            fetchData(); // Refresh list

        } catch (error: any) {
            console.error('Save error:', error);
            alert('Kaydetme başarısız: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Hero Slider Yönetimi</h1>
                    <p className="text-gray-500 mt-1">Ana sayfa slider alanını buradan yönetebilirsiniz.</p>
                </div>
                {!isEditing && (
                    <button
                        onClick={handleAddNew}
                        className="flex items-center gap-2 bg-[#f0c961] hover:bg-[#e0b84c] text-black px-6 py-3 rounded-xl font-bold transition-all shadow-sm hover:shadow-md"
                    >
                        <Plus className="w-5 h-5" />
                        Yeni Slayt Ekle
                    </button>
                )}
            </div>

            {isEditing ? (
                // --- FORM ALANI ---
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-gray-800">
                            {currentSlideId ? 'Slaytı Düzenle' : 'Yeni Slayt Ekle'}
                        </h2>
                        <button
                            onClick={() => setIsEditing(false)}
                            className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Sol Kolon: Görsel Yükleme */}
                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-gray-700">Slider Görseli</label>
                                <div className={`relative aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center bg-gray-50 overflow-hidden group transition-all ${imagePreview ? 'border-[#f0c961]' : 'border-gray-200 hover:border-gray-300'}`}>
                                    {imagePreview ? (
                                        <>
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <p className="text-white font-medium">Görseli Değiştir</p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center p-6">
                                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <ImageIcon className="w-6 h-6 text-gray-400" />
                                            </div>
                                            <p className="text-sm text-gray-500">Görsel seçmek için tıklayın</p>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                </div>
                                <p className="text-xs text-gray-400">Önerilen boyut: 1920x800px. JPG, PNG formatları.</p>
                            </div>

                            {/* Sağ Kolon: Form Inputları */}
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Başlık (Title)</label>
                                    <input
                                        {...register('title', { required: 'Başlık zorunludur' })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f0c961]/50 focus:border-[#f0c961]"
                                        placeholder="Örn: Yeni Sezon Güneş Panelleri"
                                    />
                                    {errors.title && <span className="text-red-500 text-xs">{errors.title.message}</span>}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Alt Başlık (Subtitle)</label>
                                    <input
                                        {...register('subtitle')}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f0c961]/50 focus:border-[#f0c961]"
                                        placeholder="Örn: Enerjinizi Doğadan Alın"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Açıklama (Description)</label>
                                    <textarea
                                        {...register('description')}
                                        rows={2}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f0c961]/50 focus:border-[#f0c961]"
                                        placeholder="Kısa bir açıklama..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Buton Metni</label>
                                        <input
                                            {...register('button_text')}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f0c961]/50 focus:border-[#f0c961]"
                                            placeholder="Örn: İncele"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Sıralama</label>
                                        <input
                                            type="number"
                                            {...register('sort_order', { valueAsNumber: true })}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f0c961]/50 focus:border-[#f0c961]"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Hedef Kategori (Link)</label>
                                    <div className="relative">
                                        <select
                                            {...register('target_category_slug', { required: 'Kategori seçimi zorunludur' })}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f0c961]/50 focus:border-[#f0c961] appearance-none bg-white"
                                        >
                                            <option value="">Kategori Seçiniz</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.slug}>{cat.name}</option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Seçilen kategoriye göre otomatik link oluşturulur (/kategori/[slug])</p>
                                    {errors.target_category_slug && <span className="text-red-500 text-xs">{errors.target_category_slug.message}</span>}
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        {...register('is_active')}
                                        className="w-5 h-5 text-[#f0c961] focus:ring-[#f0c961] border-gray-300 rounded"
                                    />
                                    <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Bu slayt yayında olsun</label>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-6 py-2 rounded-xl text-gray-600 font-medium hover:bg-gray-100 transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                disabled={uploading}
                                className="flex items-center gap-2 bg-[#f0c961] hover:bg-[#e0b84c] text-black px-6 py-2 rounded-xl font-bold transition-all shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {uploading ? <UploadCloud className="w-5 h-5 animate-bounce" /> : <Save className="w-5 h-5" />}
                                {uploading ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                // --- LİSTE ALANI ---
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        <div className="col-span-full py-20 text-center text-gray-500">Yükleniyor...</div>
                    ) : slides.length === 0 ? (
                        <div className="col-span-full bg-white p-12 rounded-2xl border border-gray-200 text-center text-gray-500">
                            Henüz hiç slayt eklenmemiş. Yeni bir tane ekleyerek başlayın.
                        </div>
                    ) : (
                        slides.map((slide) => (
                            <div key={slide.id} className={`group bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all ${!slide.is_active ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                                <div className="aspect-video relative overflow-hidden bg-gray-100">
                                    <img src={slide.image_url} alt={slide.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute top-3 right-3 flex gap-2">
                                        <span className="bg-black/50 backdrop-blur text-white text-xs px-2 py-1 rounded-lg">
                                            Sıra: {slide.sort_order}
                                        </span>
                                        {!slide.is_active && (
                                            <span className="bg-red-500/80 backdrop-blur text-white text-xs px-2 py-1 rounded-lg">
                                                Pasif
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="p-5">
                                    <h3 className="font-bold text-lg text-gray-900 line-clamp-1 mb-1">{slide.title}</h3>
                                    <p className="text-gray-500 text-sm line-clamp-1 mb-4">{slide.subtitle || '-'}</p>

                                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-4 bg-gray-50 p-2 rounded-lg">
                                        <span className="font-mono">Link:</span>
                                        <span className="truncate flex-1">{slide.target_link}</span>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEdit(slide)}
                                            className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            <Edit className="w-4 h-4" /> Düzenle
                                        </button>
                                        <button
                                            onClick={() => handleDelete(slide.id, slide.image_url)}
                                            className="flex items-center justify-center px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminHeroSlides;
