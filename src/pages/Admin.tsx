import React from 'react';

/**
 * Yönetim paneli bileşeni.
 * Sadece yetkili kullanıcıların erişebileceği yönetim fonksiyonlarını içerir.
 */
const Admin: React.FC = () => {
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold">Yönetim Paneli</h1>
            <p>Burası admin sayfasıdır. Ürün ve sipariş yönetimi burada olacak.</p>
        </div>
    );
};

export default Admin;
