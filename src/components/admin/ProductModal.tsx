import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import ProductImageManager, { type ProductImage } from './ProductImageManager';

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    editProduct: any | null; // Product object if editing
}

interface Category {
    id: string;
    parent_id: string | null;
    name: string;
    children?: Category[];
}

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSave, editProduct }) => {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [brand, setBrand] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);

    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [images, setImages] = useState<ProductImage[]>([]);
    const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchCategories();
            if (editProduct) {
                // Edit Mode
                setName(editProduct.name);
                setSlug(editProduct.slug || '');
                setBrand(editProduct.brand || '');
                setDescription(editProduct.description || '');
                setIsActive(editProduct.is_active);
                // Directly set category_id from product
                setSelectedCategoryId(editProduct.category_id || null);
                fetchProductImages(editProduct.id);
            } else {
                // Add Mode
                setName('');
                setSlug('');
                setBrand('');
                setDescription('');
                setIsActive(true);
                setSelectedCategoryId(null);
                setImages([]);
                setDeletedImageIds([]);
            }
        } else {
            // Reset state on close
            setImages([]);
            setDeletedImageIds([]);
        }
    }, [isOpen, editProduct]);

    const fetchCategories = async () => {
        setLoading(true);
        const { data } = await supabase.from('categories').select('id, parent_id, name').order('name');
        if (data) {
            const buildTree = (cats: any[], parentId: string | null = null): Category[] => {
                return cats
                    .filter(c => c.parent_id === parentId)
                    .map(c => ({
                        ...c,
                        children: buildTree(cats, c.id)
                    }));
            };
            setCategories(buildTree(data));
        }
        setLoading(false);
    };

    const fetchProductImages = async (productId: string) => {
        const { data } = await supabase
            .from('product_images')
            .select('*')
            .eq('product_id', productId)
            .order('sort_order', { ascending: true });

        if (data) {
            setImages(data.map(img => ({
                id: img.id,
                url: (img as any).url || (img as any).image_url, // Handle both potential column names
                is_primary: img.is_primary,
                sort_order: img.sort_order,
                is_new: false
            })));
        }
    };

    const handleNameChange = (val: string) => {
        setName(val);
        if (!editProduct) {
            setSlug(val.toLowerCase()
                .replace(/ğ/g, 'g')
                .replace(/ü/g, 'u')
                .replace(/ş/g, 's')
                .replace(/ı/g, 'i')
                .replace(/ö/g, 'o')
                .replace(/ç/g, 'c')
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
            );
        }
    };

    const handleSave = async () => {
        if (!name || !slug) {
            alert("Ürün adı ve slug zorunludur.");
            return;
        }

        setSaving(true);
        try {
            // 1. Upsert Product (Include category_id)
            const productPayload = {
                name,
                slug,
                brand,
                description,
                is_active: isActive,
                category_id: selectedCategoryId // Save directly to product table
            };

            let productId = editProduct?.id;

            if (editProduct) {
                const { error } = await supabase
                    .from('products')
                    .update(productPayload)
                    .eq('id', editProduct.id);
                if (error) throw error;
            } else {
                const { data, error } = await supabase
                    .from('products')
                    .insert(productPayload)
                    .select('id')
                    .single();
                if (error) throw error;
                productId = data.id;
            }

            if (productId) {
                // 3. Manage Images
                // A. Delete removed images from storage and DB
                if (deletedImageIds.length > 0) {
                    // Get URLs to delete from storage
                    const { data: imagesToDelete } = await supabase
                        .from('product_images')
                        .select('url') // Changed from image_url
                        .in('id', deletedImageIds);

                    // DB Delete
                    await supabase.from('product_images').delete().in('id', deletedImageIds);

                    // Storage Delete
                    if (imagesToDelete && imagesToDelete.length > 0) {
                        const paths = imagesToDelete.map(img => {
                            const urlParts = img.url.split('/'); // Changed from image_url
                            return `uploads/${urlParts[urlParts.length - 1]}`;
                        });
                        await supabase.storage.from('product-images').remove(paths);
                    }
                }

                // B. Insert New Images
                const newImages = images.filter(img => img.is_new);
                if (newImages.length > 0) {
                    const imageInserts = newImages.map((img) => ({
                        product_id: productId,
                        url: img.url, // Changed from image_url
                        is_primary: img.is_primary,
                        // Update sort order based on current list state
                        sort_order: images.findIndex(i => i.id === img.id)
                    }));

                    const { error: imgError } = await supabase.from('product_images').insert(imageInserts);
                    if (imgError) throw imgError;
                }

                // C. Update existing images (Primary status / Sort Order)
                const existingImages = images.filter(img => !img.is_new);
                for (const img of existingImages) {
                    await supabase
                        .from('product_images')
                        .update({
                            is_primary: img.is_primary,
                            sort_order: images.findIndex(i => i.id === img.id)
                        })
                        .eq('id', img.id);
                }
            }

            alert("Ürün başarıyla kaydedildi.");
            onSave();
            onClose();

        } catch (error: any) {
            console.error("Save error:", error);
            if (error.code === '23505' || error.message?.includes('duplicate key')) {
                alert("Bu 'Slug' (URL) değerine sahip bir ürün zaten var. Lütfen farklı bir slug yazın.");
            } else {
                alert(`Kaydetme sırasında hata oluştu: ${error.message}`);
            }
        } finally {
            setSaving(false);
        }
    };

    const renderCategoryTree = (nodes: Category[], level = 0) => {
        return nodes.map(node => (
            <div key={node.id} style={{ marginLeft: level * 20 }} className="py-1">
                <label className="inline-flex items-center cursor-pointer hover:bg-gray-50 px-2 py-1 rounded w-full">
                    <input
                        type="radio" // Changed from checkbox to radio
                        name="category_select" // Group for radio behavior
                        className="rounded-full border-gray-300 text-[#f0c961] focus:ring-[#f0c961]"
                        checked={selectedCategoryId === node.id}
                        onChange={() => setSelectedCategoryId(node.id)}
                    />
                    <span className="ml-2 text-sm text-gray-700">{node.name}</span>
                </label>
                {node.children && node.children.length > 0 && renderCategoryTree(node.children, level + 1)}
            </div>
        ));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl my-8">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center rounded-t-xl">
                    <h3 className="font-semibold text-gray-900 text-lg">
                        {editProduct ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500 text-2xl leading-none">&times;</button>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* LEFT COLUMN: Basic Info */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Adı <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#f0c961] focus:border-transparent"
                                    value={name}
                                    onChange={e => handleNameChange(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Slug <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#f0c961] focus:border-transparent text-gray-500 font-mono"
                                    value={slug}
                                    onChange={e => setSlug(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Marka</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#f0c961] focus:border-transparent"
                                    value={brand}
                                    onChange={e => setBrand(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                                <textarea
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#f0c961] focus:border-transparent h-32 resize-none"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                ></textarea>
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                                <div className="flex items-center h-5">
                                    <input
                                        id="is_active"
                                        type="checkbox"
                                        className="w-4 h-4 text-[#f0c961] border-gray-300 rounded focus:ring-[#f0c961]"
                                        checked={isActive}
                                        onChange={e => setIsActive(e.target.checked)}
                                    />
                                </div>
                                <label htmlFor="is_active" className="text-sm font-medium text-gray-700 select-none">Ürün Aktif</label>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Categories */}
                        <div className="border border-gray-200 rounded-lg flex flex-col h-[400px]">
                            <div className="p-3 bg-gray-50 border-b border-gray-200 font-medium text-sm text-gray-700">
                                Kategori Seçimi (Tekli)
                            </div>
                            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                                {loading ? (
                                    <div className="text-center text-gray-500 text-sm py-4">Kategoriler yükleniyor...</div>
                                ) : (
                                    renderCategoryTree(categories)
                                )}
                                {categories.length === 0 && !loading && (
                                    <div className="text-center text-gray-500 text-sm py-4">Kategori bulunamadı.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* FULL WIDTH COLUMN: Image Management */}
                    <div className="mt-8 border-t border-gray-100 pt-6">
                        <label className="block text-base font-medium text-gray-900 mb-4">Ürün Görselleri</label>
                        <ProductImageManager
                            images={images}
                            onImagesChange={setImages}
                            onDeleteImage={(img) => {
                                if (img.is_new) {
                                    setImages(prev => prev.filter(i => i.id !== img.id));
                                } else {
                                    setDeletedImageIds(prev => [...prev, img.id]);
                                    setImages(prev => prev.filter(i => i.id !== img.id));
                                }
                            }}
                        />
                    </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end gap-3 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        disabled={saving}
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 text-sm font-medium text-black bg-[#f0c961] hover:bg-[#e0b850] rounded-lg shadow-sm disabled:opacity-50 min-w-[100px]"
                        disabled={saving}
                    >
                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductModal;
