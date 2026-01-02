import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { motion } from 'framer-motion';

import Hero from '../components/Hero';

export default function Home() {
  const [featuredCollections, setFeaturedCollections] = useState<any[]>([]);

  useEffect(() => {
    fetchFeaturedCollections();
  }, []);

  const fetchFeaturedCollections = async () => {
    const { data } = await supabase
      .from('featured_collections')
      .select('*, categories(slug)')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (data) setFeaturedCollections(data);
  };



  return (
    <div className="min-h-screen bg-[#fffaf4] pb-20">
      <Hero />

      {/* WHY CHOOSE US - Animated Strip */}
      <div className="bg-[#1a1a1a] py-12 md:py-16 border-b-4 border-[#f0c961]">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          {[
            { title: "2 Yıl Garanti", desc: "Tüm ürünlerde birebir değişim.", icon: "🛡️" },
            { title: "Hızlı Kargo", desc: "Aynı gün kargo imkanı.", icon: "🚛" },
            { title: "Orjinal Ürün", desc: "%100 Distribütör garantili.", icon: "✨" }
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2 }}
              className="group flex flex-col md:flex-row items-center gap-4 md:gap-6 p-6 rounded-2xl hover:bg-white/5 transition-colors cursor-default border border-transparent hover:border-white/10"
            >
              <span className="text-4xl bg-[#f0c961] w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center transform group-hover:rotate-6 transition-transform shadow-lg shadow-[#f0c961]/20 text-black shrink-0">{item.icon}</span>
              <div>
                <h4 className="text-white font-black text-xl tracking-wide uppercase mb-1">{item.title}</h4>
                <p className="text-gray-400 text-sm group-hover:text-white transition-colors">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* FEATURED CATEGORIES - Hover Lift Cards */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="text-center mb-12 md:mb-20"
        >
          <span className="text-[#f0c961] font-bold text-sm tracking-widest uppercase mb-3 block">Kategoriler</span>
          <h2 className="text-3xl md:text-5xl font-black text-[#1a1a1a]">Öne Çıkan Koleksiyonlar</h2>
          <div className="w-24 h-1.5 bg-[#f0c961] mx-auto mt-6 md:mt-8 rounded-full" />
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
          {featuredCollections.map((cat, idx) => (
            <Link to={cat.categories ? `/kategori/${cat.categories.slug}` : '/products'} key={cat.id}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -15, scale: 1.02 }}
                className="group relative h-[450px] rounded-[2rem] overflow-hidden shadow-2xl cursor-pointer"
              >
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors z-10" />
                <motion.img
                  src={cat.image_url}
                  alt={cat.title}
                  className="w-full h-full object-cover"
                  whileHover={{ scale: 1.15 }}
                  transition={{ duration: 0.7 }}
                />
                <div className="absolute bottom-0 left-0 w-full p-8 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                  <h3 className="text-3xl font-black text-white mb-2">{cat.title}</h3>
                  <span className="text-[#f0c961] font-bold text-sm uppercase tracking-wider flex items-center gap-2 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                    {cat.subtitle || 'Ürünleri Gör'} <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </span>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="bg-black text-white py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        <div className="container relative z-10 mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-8">Enerji Çözümlerinde <span className="text-[#f0c961]">Lider Marka</span></h2>
          <p className="text-gray-400 max-w-2xl mx-auto mb-12 text-lg">Projeleriniz için en uygun çözümleri sunuyoruz. Kurumsal teklifler ve bayilik fırsatları için bizimle iletişime geçin.</p>
          <button onClick={() => window.open('https://wa.me/905555555555')} className="inline-flex items-center gap-3 bg-[#f0c961] text-black px-10 py-5 rounded-xl font-bold text-lg hover:bg-white transition-colors">
            HEMEN TEKLİF AL
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </button>
        </div>
      </section>
    </div>
  );
}
