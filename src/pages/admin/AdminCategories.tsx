import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Link } from 'react-router-dom';

interface Category {
    id: string; // UUID
    parent_id: string | null;
    name: string;
    slug: string;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    children?: Category[]; // For tree structure
}

// Modal Component for Add/Edit
interface CategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    editCategory: Category | null;
    parentCategory: Category | null; // If adding sub-category
    categories: Category[]; // For parent selection dropdown
}

const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, onSave, editCategory, parentCategory, categories }) => {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [parentId, setParentId] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState(0);
    const [isActive, setIsActive] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (editCategory) {
                // Edit Mode
                setName(editCategory.name);
                setSlug(editCategory.slug);
                setParentId(editCategory.parent_id);
                setSortOrder(editCategory.sort_order);
                setIsActive(editCategory.is_active);
            } else {
                // Add Mode
                setName('');
                setSlug('');
                setParentId(parentCategory ? parentCategory.id : null);
                setSortOrder(0);
                setIsActive(true);
            }
        }
    }, [isOpen, editCategory, parentCategory]);

    // Auto-generate slug from name if adding new or slug is empty
    const handleNameChange = (val: string) => {
        setName(val);
        if (!editCategory) {
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
            alert("Lütfen isim ve slug alanlarını doldurun.");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name,
                slug,
                parent_id: parentId === 'root' ? null : parentId, // 'root' value handling from select
                sort_order: sortOrder,
                is_active: isActive
            };

            let error;
            if (editCategory) {
                const { error: err } = await supabase
                    .from('categories')
                    .update(payload)
                    .eq('id', editCategory.id);
                error = err;
            } else {
                const { error: err } = await supabase
                    .from('categories')
                    .insert(payload);
                error = err;
            }

            if (error) throw error;
            onSave();
            onClose();
        } catch (error) {
            console.error("Save error:", error);
            alert("Kaydetme sırasında hata oluştu.");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    // Filter categories to prevent selecting itself or its children as parent
    const availableParents = categories.filter(c => c.id !== editCategory?.id);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900">
                        {editCategory ? 'Kategoriyi Düzenle' : (parentCategory ? 'Alt Kategori Ekle' : 'Yeni Kategori Ekle')}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">&times;</button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Adı</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#f0c961] focus:border-transparent"
                            value={name}
                            onChange={e => handleNameChange(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#f0c961] focus:border-transparent text-gray-500 font-mono"
                            value={slug}
                            onChange={e => setSlug(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Üst Kategori</label>
                        <select
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#f0c961] focus:border-transparent"
                            value={parentId || 'root'}
                            onChange={e => setParentId(e.target.value === 'root' ? null : e.target.value)}
                        >
                            <option value="root">-- Ana Kategori --</option>
                            {availableParents.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sıralama</label>
                            <input
                                type="number"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#f0c961] focus:border-transparent"
                                value={sortOrder}
                                onChange={e => setSortOrder(parseInt(e.target.value))}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                            <div className="flex items-center h-[38px]">
                                <label className="inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={isActive}
                                        onChange={e => setIsActive(e.target.checked)}
                                    />
                                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                    <span className="ms-3 text-sm font-medium text-gray-700">{isActive ? 'Aktif' : 'Pasif'}</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        disabled={saving}
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#f0c961] hover:bg-[#e0b850] rounded-lg disabled:opacity-50 text-black"
                        disabled={saving}
                    >
                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
            </div>
        </div>
    );
};


const AdminCategories: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [parentForNew, setParentForNew] = useState<Category | null>(null);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('sort_order', { ascending: true })
                .order('created_at', { ascending: true });

            if (error) throw error;
            setCategories(data || []);
        } catch (error) {
            console.error("Error fetching categories:", error);
            alert("Kategoriler yüklenemedi.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    // Helper to get all descendant IDs
    const getAllDescendantIds = (catId: string, allCats: Category[]): string[] => {
        const children = allCats.filter(c => c.parent_id === catId);
        let ids = children.map(c => c.id);
        children.forEach(child => {
            ids = [...ids, ...getAllDescendantIds(child.id, allCats)];
        });
        return ids;
    };

    const handleDelete = async (category: Category) => {
        if (!window.confirm(`"${category.name}" kategorisini ve alt kategorilerini kalıcı olarak silmek istediğinize emin misiniz?`)) return;

        try {
            // 1. Collect all IDs (self + descendants)
            const descendants = getAllDescendantIds(category.id, categories);
            const targetIds = [category.id, ...descendants];

            // 2. Check usage in product_categories
            const { count, error: countError } = await supabase
                .from('product_categories')
                .select('*', { count: 'exact', head: true })
                .in('category_id', targetIds);

            if (countError) throw countError;

            if (count && count > 0) {
                alert(`Bu kategori veya alt kategorileri toplam ${count} üründe kullanılıyor. Silmek için önce ürünlerden çıkartmalısınız.`);
                return;
            }

            // 3. Hard Delete (Delete from categories)
            const { error: deleteError } = await supabase
                .from('categories')
                .delete()
                .in('id', targetIds);

            if (deleteError) throw deleteError;

            alert("Kategori ve alt kategoriler başarıyla silindi.");
            fetchCategories(); // Refresh

        } catch (error) {
            console.error("Delete error:", error);
            alert("Silme işlemi başarısız.");
        }
    };

    // Recursive Build Tree
    const buildTree = (cats: Category[], parentId: string | null = null): Category[] => {
        return cats
            .filter(c => c.parent_id === parentId)
            .map(c => ({
                ...c,
                children: buildTree(cats, c.id)
            }));
    };

    const tree = buildTree(categories);

    // Recursive Render Row
    const renderRow = (category: Category, level: number = 0) => {
        return (
            <React.Fragment key={category.id}>
                <tr className={`${!category.is_active ? 'opacity-50 grayscale' : ''} hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0`}>
                    <td className="p-4">
                        <div style={{ paddingLeft: `${level * 24}px` }} className="flex items-center gap-2">
                            {level > 0 && <span className="text-gray-300">└─</span>}
                            <span className={`font-medium ${level === 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                                {category.name}
                            </span>
                        </div>
                    </td>
                    <td className="p-4 text-gray-500 font-mono text-xs">{category.slug}</td>
                    <td className="p-4 text-center text-gray-500 text-xs">{category.sort_order}</td>
                    <td className="p-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${category.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                            {category.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                    </td>
                    <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                            <button
                                onClick={() => {
                                    setEditingCategory(null);
                                    setParentForNew(category);
                                    setIsModalOpen(true);
                                }}
                                className="text-xs text-yellow-700 hover:text-yellow-900 flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded"
                                title="Alt Kategori Ekle"
                            >
                                <span>+ Alt</span>
                            </button>
                            <button
                                onClick={() => {
                                    setEditingCategory(category);
                                    setParentForNew(null);
                                    setIsModalOpen(true);
                                }}
                                className="text-xs text-amber-600 hover:text-amber-900 bg-amber-50 px-2 py-1 rounded"
                            >
                                Düzenle
                            </button>
                            <button
                                onClick={() => handleDelete(category)}
                                className="text-xs text-red-600 hover:text-red-900 bg-red-50 px-2 py-1 rounded"
                            >
                                Sil
                            </button>
                        </div>
                    </td>
                </tr>
                {category.children && category.children.map(child => renderRow(child, level + 1))}
            </React.Fragment>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Kategori Yönetimi</h1>
                    <button
                        onClick={() => {
                            setEditingCategory(null);
                            setParentForNew(null);
                            setIsModalOpen(true);
                        }}
                        className="px-4 py-2 bg-[#f0c961] hover:bg-[#e0b850] text-black font-medium rounded-lg shadow-sm transition-colors text-sm flex items-center gap-2"
                    >
                        <span>+ Yeni Kategori</span>
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-100 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                            <tr>
                                <th className="p-4 w-1/3">Kategori Adı</th>
                                <th className="p-4">Slug</th>
                                <th className="p-4 text-center w-24">Sıra</th>
                                <th className="p-4 text-center w-24">Durum</th>
                                <th className="p-4 text-right w-48">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {categories.length === 0 && !loading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">Henüz kategori bulunmuyor.</td>
                                </tr>
                            ) : (
                                tree.map(cat => renderRow(cat))
                            )}
                        </tbody>
                    </table>
                    {loading && <div className="p-8 text-center text-gray-500">Yükleniyor...</div>}
                </div>
            </div>

            <CategoryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={fetchCategories}
                editCategory={editingCategory}
                parentCategory={parentForNew}
                categories={categories}
            />
        </div>
    );
};

export default AdminCategories;
