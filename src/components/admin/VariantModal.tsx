import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface VariantModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    productId: string;
    editVariant?: any; // or define a specific interface
}

const VariantModal: React.FC<VariantModalProps> = ({ isOpen, onClose, onSave, productId, editVariant }) => {
    const [name, setName] = useState('');
    const [sku, setSku] = useState('');
    const [stock, setStock] = useState(0);
    const [basePrice, setBasePrice] = useState(0);
    const [isActive, setIsActive] = useState(true);
    const [saving, setSaving] = useState(false);

    // Reset when modal opens
    React.useEffect(() => {
        if (isOpen) {
            if (editVariant) {
                // Edit Mode
                setName(editVariant.name);
                setSku(editVariant.sku);
                setStock(editVariant.stock);
                setBasePrice(editVariant.base_price);
                setIsActive(editVariant.is_active);
            } else {
                // Add Mode
                setName('');
                setSku('');
                setStock(0);
                setBasePrice(0);
                setIsActive(true);
            }
        }
    }, [isOpen, editVariant]);

    const handleSave = async () => {
        if (!name || !sku) {
            alert("Varyant adı ve SKU zorunludur.");
            return;
        }

        setSaving(true);
        try {
            // 1. SKU Unique Kontrolü (Kendisi hariç)
            const query = supabase
                .from('product_variants')
                .select('id')
                .eq('sku', sku)
                .maybeSingle();

            // Eğer edit yapıyorsak, kendi ID'mizi hariç tutmamız lazım ama Supabase v2 client'ta .neq 'i chained query içinde kullanabiliriz.
            // Ancak single() kullandığımız için client side check daha basit olabilir veya:

            const { data: existing } = await query;

            if (existing && (!editVariant || existing.id !== editVariant.id)) {
                alert("Bu SKU ile başka bir varyant zaten var.");
                setSaving(false);
                return;
            }

            // 2. Insert veya Update
            if (editVariant) {
                // UPDATE
                const { error } = await supabase
                    .from('product_variants')
                    .update({
                        name,
                        sku,
                        stock,
                        base_price: basePrice,
                        is_active: isActive
                    })
                    .eq('id', editVariant.id);

                if (error) throw error;
            } else {
                // INSERT
                const { error } = await supabase
                    .from('product_variants')
                    .insert({
                        product_id: productId,
                        name,
                        sku,
                        stock,
                        base_price: basePrice,
                        is_active: isActive
                    });

                if (error) throw error;
            }

            onSave();
            onClose();

        } catch (error) {
            console.error(error);
            alert("Varyant kaydedilirken hata oluştu.");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <h3 className="font-semibold text-gray-900">
                        {editVariant ? 'Varyantı Düzenle' : 'Yeni Varyant Ekle'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500 text-2xl leading-none">&times;</button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Varyant Adı <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#f0c961] focus:border-transparent"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Örn: 100W Panel"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">SKU (Stok Kodu) <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#f0c961] focus:border-transparent font-mono"
                            value={sku}
                            onChange={e => setSku(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Stok Adedi</label>
                            <input
                                type="number"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#f0c961] focus:border-transparent"
                                value={stock}
                                onChange={e => setStock(Number(e.target.value))}
                                min="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Base Fiyat (TL)</label>
                            <input
                                type="number"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#f0c961] focus:border-transparent"
                                value={basePrice}
                                onChange={e => setBasePrice(Number(e.target.value))}
                                min="0"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                        <input
                            type="checkbox"
                            id="variantActive"
                            className="w-4 h-4 text-[#f0c961] border-gray-300 rounded focus:ring-[#f0c961]"
                            checked={isActive}
                            onChange={e => setIsActive(e.target.checked)}
                        />
                        <label htmlFor="variantActive" className="text-sm text-gray-700 select-none">Aktif</label>
                    </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end gap-3 rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">İptal</button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 text-sm font-medium text-black bg-[#f0c961] hover:bg-[#e0b850] rounded-lg shadow-sm disabled:opacity-50"
                    >
                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VariantModal;
