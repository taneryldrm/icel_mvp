import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { TURKEY_DATA } from '../constants/turkey-data';
import SearchableSelect from '../components/SearchableSelect';
import ProfileOrders from '../components/ProfileOrders';

// --- Types ---
interface Profile {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    role: string | null;
}

interface Address {
    id: string;
    profile_id: string;
    type: 'shipping' | 'billing';
    full_name: string;
    phone: string;
    country: string;
    city: string;
    district: string;
    address_line: string;
    postal_code: string;
    is_default: boolean;
}

const AccountPage: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'orders'>('profile');
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    // Data States
    const [profile, setProfile] = useState<Profile | null>(null);
    const [addresses, setAddresses] = useState<Address[]>([]);

    // Edit/Add States
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);
    const [saving, setSaving] = useState(false);

    // Initial Load
    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            navigate('/login');
            return;
        }
        setUser(session.user);
        fetchProfile(session.user.id);
        fetchAddresses(session.user.id);
        setLoading(false);
    };

    const fetchProfile = async (userId: string) => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (data) setProfile(data);
    };

    const fetchAddresses = async (userId: string) => {
        const { data } = await supabase
            .from('addresses')
            .select('*')
            .eq('profile_id', userId)
            .order('created_at', { ascending: false }); // Assuming created_at exists, if not remove order

        if (data) setAddresses(data);
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    // --- Profile Setup ---
    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;
        setSaving(true);

        const { error } = await supabase
            .from('profiles')
            .update({
                full_name: profile.full_name,
                phone: profile.phone,
                // avatar_url logic can be added later
            })
            .eq('id', profile.id);

        setSaving(false);
        if (error) alert('Profil güncellenirken hata oluştu.');
        else alert('Profil başarıyla güncellendi.');
    };

    // --- Address Logic ---
    const [selectedCity, setSelectedCity] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');

    useEffect(() => {
        if (isAddressModalOpen) {
            if (editingAddress) {
                // If editing, try to find matching city/district to ensure valid state
                // Note: If data in DB doesn't match predefined list, it might show empty or custom logic needed.
                // For now, we assume data consistency or just set the string.
                setSelectedCity(editingAddress.city || '');
                setSelectedDistrict(editingAddress.district || '');
            } else {
                setSelectedCity('');
                setSelectedDistrict('');
            }
        }
    }, [isAddressModalOpen, editingAddress]);

    const handleSaveAddress = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const formData = new FormData(e.target as HTMLFormElement);
        // Use selectedCity/District state instead of formData for these fields
        const addressData = {
            profile_id: user.id,
            type: formData.get('type') as string,
            full_name: formData.get('full_name') as string,
            phone: formData.get('phone') as string,
            country: 'Türkiye',
            city: selectedCity,
            district: selectedDistrict,
            address_line: formData.get('address_line') as string,
            postal_code: formData.get('postal_code') as string,
            is_default: false
        };

        if (!selectedCity || !selectedDistrict) {
            alert("Lütfen İl ve İlçe seçiniz.");
            setSaving(false);
            return;
        }

        try {
            if (editingAddress) {
                await supabase.from('addresses').update(addressData).eq('id', editingAddress.id);
            } else {
                await supabase.from('addresses').insert(addressData);
            }
            setIsAddressModalOpen(false);
            setEditingAddress(null);
            fetchAddresses(user.id);
        } catch (error) {
            console.error(error);
            alert('Adres kaydedilemedi.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAddress = async (id: string) => {
        if (!confirm('Bu adresi silmek istediğinize emin misiniz?')) return;
        await supabase.from('addresses').delete().eq('id', id);
        fetchAddresses(user.id);
    };

    if (loading) return <div className="p-10 text-center">Yükleniyor...</div>;

    const cityOptions = TURKEY_DATA.map(c => c.name).sort();
    const districtOptions = selectedCity
        ? TURKEY_DATA.find(c => c.name === selectedCity)?.districts.sort() || []
        : [];

    return (
        <div className="container mx-auto px-4 py-10 bg-[#fefcf5] min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-8 border-b pb-4">Hesabım</h1>

            <div className="flex flex-col md:flex-row gap-8">
                {/* LEFT SIDEBAR */}
                <div className="w-full md:w-64 flex-shrink-0">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#f0c961] flex items-center justify-center text-white font-bold">
                                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                                <p className="font-bold text-sm text-gray-800">{profile?.full_name || 'Kullanıcı'}</p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                        </div>
                        <nav className="flex flex-col p-2">
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`text-left px-4 py-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-[#f0c961] text-black' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                Profil Bilgileri
                            </button>
                            <button
                                onClick={() => setActiveTab('addresses')}
                                className={`text-left px-4 py-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'addresses' ? 'bg-[#f0c961] text-black' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                Adreslerim
                            </button>
                            <button
                                onClick={() => setActiveTab('orders')}
                                className={`text-left px-4 py-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'orders' ? 'bg-[#f0c961] text-black' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                Siparişlerim
                            </button>
                            <div className="h-px bg-gray-100 my-2"></div>
                            <button
                                onClick={handleSignOut}
                                className="text-left px-4 py-3 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                            >
                                Çıkış Yap
                            </button>
                        </nav>
                    </div>
                </div>

                {/* RIGHT CONTENT */}
                <div className="flex-1">
                    {activeTab === 'profile' && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-6">Profil Bilgileri</h2>
                            <form onSubmit={handleProfileUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Ad Soyad</label>
                                    <input
                                        type="text"
                                        value={profile?.full_name || ''}
                                        onChange={(e) => setProfile(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#f0c961] focus:border-[#f0c961] outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                                    <input
                                        type="tel"
                                        value={profile?.phone || ''}
                                        onChange={(e) => setProfile(prev => prev ? { ...prev, phone: e.target.value } : null)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#f0c961] focus:border-[#f0c961] outline-none"
                                        placeholder="05..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">E-posta</label>
                                    <input
                                        type="email"
                                        value={user.email}
                                        disabled
                                        className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed"
                                    />
                                </div>
                                <div className="md:col-span-2 pt-4">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-6 py-2 bg-[#f0c961] hover:bg-[#e0b850] text-black font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                                    >
                                        {saving ? 'Kaydediliyor...' : 'Güncelle'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'addresses' && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-800">Adreslerim</h2>
                                <button
                                    onClick={() => { setEditingAddress(null); setIsAddressModalOpen(true); }}
                                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-black transition-colors"
                                >
                                    + Yeni Adres Ekle
                                </button>
                            </div>

                            {addresses.length === 0 ? (
                                <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                    <p className="text-gray-500">Henüz kayıtlı adresiniz bulunmuyor.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {addresses.map(addr => (
                                        <div key={addr.id} className="border border-gray-200 rounded-lg p-4 hover:border-[#f0c961] transition-colors relative group">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${addr.type === 'shipping' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                                    {addr.type === 'shipping' ? 'Teslimat Adresi' : 'Fatura Adresi'}
                                                </span>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleDeleteAddress(addr.id)} className="text-red-500 hover:text-red-700 text-xs underline">Sil</button>
                                                </div>
                                            </div>
                                            <p className="font-bold text-gray-800 mb-1">{addr.full_name}</p>
                                            <p className="text-sm text-gray-600 mb-2">{addr.address_line}</p>
                                            <p className="text-sm text-gray-600 mb-1">{addr.district} / {addr.city}</p>
                                            <p className="text-xs text-gray-400 font-mono">{addr.postal_code}</p>
                                            <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                {addr.phone}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'orders' && (
                        <ProfileOrders userId={user.id} />
                    )}
                </div>
            </div>

            {/* NEW ADDRESS MODAL */}
            {isAddressModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800">{editingAddress ? 'Adres Düzenle' : 'Yeni Adres Ekle'}</h3>
                            <button onClick={() => setIsAddressModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleSaveAddress} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Adres Tipi</label>
                                    <select name="type" defaultValue={editingAddress?.type || 'shipping'} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-[#f0c961] focus:border-[#f0c961]">
                                        <option value="shipping">Teslimat Adresi</option>
                                        <option value="billing">Fatura Adresi</option>
                                    </select>
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
                                    <input required name="full_name" defaultValue={editingAddress?.full_name || ''} type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-[#f0c961] focus:border-[#f0c961]" />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                                    <input required name="phone" defaultValue={editingAddress?.phone || ''} type="tel" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-[#f0c961] focus:border-[#f0c961]" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">İl</label>
                                    <SearchableSelect
                                        options={cityOptions}
                                        value={selectedCity}
                                        onChange={(val) => { setSelectedCity(val); setSelectedDistrict(''); }}
                                        placeholder="İl Seçiniz"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">İlçe</label>
                                    <SearchableSelect
                                        options={districtOptions}
                                        value={selectedDistrict}
                                        onChange={(val) => setSelectedDistrict(val)}
                                        placeholder="İlçe Seçiniz"
                                        disabled={!selectedCity}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Açık Adres</label>
                                    <textarea required name="address_line" defaultValue={editingAddress?.address_line || ''} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-[#f0c961] focus:border-[#f0c961] resize-none"></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Posta Kodu</label>
                                    <input required name="postal_code" defaultValue={editingAddress?.postal_code || ''} type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-[#f0c961] focus:border-[#f0c961]" />
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsAddressModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">İptal</button>
                                <button type="submit" disabled={saving} className="px-6 py-2 text-sm bg-[#f0c961] hover:bg-[#e0b850] text-black font-bold rounded-lg shadow-sm">
                                    {saving ? 'Kaydediliyor...' : 'Adresi Kaydet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountPage;
