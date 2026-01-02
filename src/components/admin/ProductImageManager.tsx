import React, { useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';

export interface ProductImage {
    id: string; // Creates a temporary ID for new uploads, or DB ID for existing
    url: string;
    is_primary: boolean;
    sort_order: number;
    file?: File; // Only for new uploads
    is_new?: boolean; // To distinguish between existing db records and new uploads
}

interface ProductImageManagerProps {
    images: ProductImage[];
    onImagesChange: (images: ProductImage[]) => void;
    onDeleteImage: (image: ProductImage) => void;
}

const ProductImageManager: React.FC<ProductImageManagerProps> = ({ images, onImagesChange, onDeleteImage }) => {
    const [uploading, setUploading] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Upload Logic ---

    const processFiles = async (files: FileList | File[]) => {
        setUploading(true);
        const newImages: ProductImage[] = [];
        const fileArray = Array.from(files);

        try {
            for (const file of fileArray) {
                // Validate Image
                if (!file.type.startsWith('image/')) continue;

                // 1. Upload to Supabase Storage immediately
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                const filePath = `uploads/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                // 2. Get Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('product-images')
                    .getPublicUrl(filePath);

                // 3. Create State Object
                // If it's the first image overall, make it primary
                const isFirst = images.length === 0 && newImages.length === 0;

                newImages.push({
                    id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    url: publicUrl,
                    is_primary: isFirst,
                    sort_order: images.length + newImages.length,
                    file: file,
                    is_new: true
                });
            }

            if (newImages.length > 0) {
                onImagesChange([...images, ...newImages]);
            }

        } catch (error) {
            console.error('Upload Error:', error);
            alert('Görsel yüklenirken bir hata oluştu.');
        } finally {
            setUploading(false);
            // Reset input value to allow selecting same file again if needed
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(e.target.files);
        }
    };

    // --- Native Drop Zone Handlers ---

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDragOverZone = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragOver) setIsDragOver(true);
    };

    const handleDropZone = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(e.dataTransfer.files);
        }
    };

    // --- Image Sorting Handlers ---

    const handleSortDragStart = (e: React.DragEvent, index: number) => {
        setDraggedItemIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        // Ghost image hack if needed, but default is usually fine
    };

    const handleSortDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault(); // Necessary to allow drop
        e.dataTransfer.dropEffect = 'move';

        if (draggedItemIndex === null || draggedItemIndex === index) return;

        // Visual swap
        const items = [...images];
        const draggedItem = items[draggedItemIndex];
        items.splice(draggedItemIndex, 1);
        items.splice(index, 0, draggedItem);

        onImagesChange(items);
        setDraggedItemIndex(index);
    };

    const handleSortDragEnd = () => {
        setDraggedItemIndex(null);
    };

    // --- Actions ---

    const handleSetPrimary = (id: string) => {
        const updated = images.map(img => ({
            ...img,
            is_primary: img.id === id
        }));
        onImagesChange(updated);
    };

    const handleDelete = (image: ProductImage) => {
        if (!window.confirm("Bu görseli silmek istediğinize emin misiniz?")) return;
        onDeleteImage(image);
    };

    return (
        <div className="space-y-4">
            {/* Native Dropzone */}
            <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOverZone}
                onDragLeave={handleDragLeave}
                onDrop={handleDropZone}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200
                    ${isDragOver
                        ? 'border-[#f0c961] bg-[#f0c961]/10 scale-[1.01]'
                        : 'border-gray-300 hover:border-[#f0c961] hover:bg-gray-50'}`}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    accept="image/*"
                    className="hidden"
                />

                {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f0c961]"></div>
                        <p className="text-gray-500">Yükleniyor...</p>
                    </div>
                ) : (
                    <div className="space-y-2 pointer-events-none">
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" />
                        </svg>
                        <p className="text-gray-600 font-medium">Görselleri buraya sürükleyin veya seçin</p>
                        <p className="text-xs text-gray-400">PNG, JPG, WEBP</p>
                    </div>
                )}
            </div>

            {/* Grid */}
            {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {images.map((img, index) => (
                        <div
                            key={img.id}
                            draggable
                            onDragStart={(e) => handleSortDragStart(e, index)}
                            onDragOver={(e) => handleSortDragOver(e, index)}
                            onDragEnd={handleSortDragEnd}
                            className={`group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 transition-all hover:shadow-md cursor-grab active:cursor-grabbing
                                ${img.is_primary ? 'border-[#f0c961] ring-2 ring-[#f0c961]/20' : 'border-transparent hover:border-gray-300'}
                                ${draggedItemIndex === index ? 'opacity-50 scale-95' : 'opacity-100'}
                            `}
                        >
                            <img
                                src={img.url}
                                alt={`Görsel ${index + 1}`}
                                className="w-full h-full object-cover pointer-events-none select-none"
                            />

                            {/* Overlay Actions */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                                <div className="flex justify-end">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(img); }}
                                        className="p-1.5 bg-white/90 text-red-600 rounded-full hover:bg-white transition shadow-sm"
                                        title="Sil"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </div>

                                <div className="flex justify-center">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleSetPrimary(img.id); }}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition-all
                                            ${img.is_primary
                                                ? 'bg-[#f0c961] text-black cursor-default'
                                                : 'bg-white/90 text-gray-600 hover:bg-white hover:text-[#f0c961]'}`}
                                    >
                                        {img.is_primary ? '★ Ana Görsel' : '☆ Ana Yap'}
                                    </button>
                                </div>

                                {/* Drag Handle Indicator (Optional) */}
                                <div className="h-1 w-1/3 bg-white/50 mx-auto rounded-full mt-1"></div>
                            </div>

                            {/* Primary Badge */}
                            {img.is_primary && (
                                <div className="absolute top-2 left-2 bg-[#f0c961] text-black text-[10px] font-bold px-2 py-0.5 rounded shadow-sm z-10 pointer-events-none">
                                    ANA
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ProductImageManager;
