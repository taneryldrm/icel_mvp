import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
    return (
        <footer className="bg-[#1a1a1a] text-white pt-16 md:pt-20 pb-10 border-t-4 border-[#f0c961]">
            <div className="container mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 mb-12 border-b border-gray-800 pb-12 text-center sm:text-left">

                {/* 1. Marka & Hakkında (Eski Yerinde) */}
                <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                    <div className="text-2xl font-black italic mb-6 text-white tracking-tighter">
                        <span className="text-[#f0c961]">İÇEL</span> SOLAR MARKET
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-sm mx-auto sm:mx-0">
                        Türkiye'nin enerji ve aydınlatma alanındaki lider markası. Yenilikçi çözümler, sürdürülebilir gelecek.
                    </p>
                </div>

                {/* 2. Kurumsal Linkler (Güncellendi ve Başa Alındı - Mantıklı Gruplama) */}
                <div>
                    <h4 className="font-bold text-white mb-6 uppercase text-sm tracking-widest text-[#f0c961]">Kurumsal</h4>
                    <ul className="space-y-3 text-sm text-gray-400">
                        <li><a href="#" className="hover:text-white transition-colors">Hakkımızda</a></li>

                        <li><Link to="/bayi-basvuru" className="hover:text-white transition-colors font-bold text-[#f0c961]">Bayilik Başvurusu</Link></li>
                    </ul>
                </div>

                {/* 3. KOŞUL VE POLİTİKALAR (YENİ SÜTUN) */}
                <div>
                    <h4 className="font-bold text-white mb-6 uppercase text-sm tracking-widest text-[#f0c961]">Koşul ve Politikalar</h4>
                    <ul className="space-y-3 text-sm text-gray-400">
                        <li><Link to="/kurumsal/cerez-politikasi" className="hover:text-white transition-colors">Çerez Politikası</Link></li>
                        <li><Link to="/kurumsal/kvkk-aydinlatma-metni" className="hover:text-white transition-colors">KVKK Aydınlatma Metni</Link></li>
                        <li><Link to="/kurumsal/mesafeli-satis-sozlesmesi" className="hover:text-white transition-colors">Mesafeli Satış Sözleşmesi</Link></li>
                        <li><Link to="/kurumsal/iptal-iade-kosullari" className="hover:text-white transition-colors">İptal ve İade Koşulları</Link></li>

                    </ul>
                </div>

                {/* 4. İletişim (Sona Kaydı) */}
                <div>
                    <h4 className="font-bold text-white mb-6 uppercase text-sm tracking-widest text-[#f0c961]">İletişim</h4>
                    <ul className="space-y-3 text-sm text-gray-400">
                        <li className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3">
                            <span className="text-[#f0c961]">📍</span>
                            <span>Merkez Mah. Güneşli Yolu Cad.<br />No: 15 Bağcılar / İstanbul</span>
                        </li>
                        <li className="flex items-center justify-center sm:justify-start gap-3">
                            <span className="text-[#f0c961]">📞</span>
                            <span className="text-white font-bold text-lg">+90 212 444 0 123</span>
                        </li>
                        <li className="flex items-center justify-center sm:justify-start gap-3">
                            <span className="text-[#f0c961]">✉️</span>
                            <span>info@icelsolarmarket.com</span>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="container mx-auto px-4 text-gray-600 text-xs flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-center md:text-left">&copy; 2025 İçel Solar Market E-Ticaret Sistemleri.</p>
                <div className="flex gap-4">
                    {/* Alt kısımdaki tekrarlı linkleri kaldırabiliriz veya tutabiliriz, üstte zaten var. Kullanım şartları vb. üstte var artık. Burayı sadeleştirelim. */}
                    <span className="opacity-50">Tüm hakları saklıdır.</span>
                </div>
            </div>
        </footer>
    );
}
