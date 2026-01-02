import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface HeroSlide {
    id: string;
    image_url: string;
    title: string;
    subtitle?: string;
    description?: string;
    button_text?: string;
    target_link?: string;
}

const Hero: React.FC = () => {
    const [slides, setSlides] = useState<HeroSlide[]>([]);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [loading, setLoading] = useState(true);

    // Fetch Slides
    useEffect(() => {
        const fetchSlides = async () => {
            const { data, error } = await supabase
                .from('hero_slides')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (!error && data) {
                setSlides(data);
            }
            setLoading(false);
        };
        fetchSlides();
    }, []);

    // Auto-play
    useEffect(() => {
        if (slides.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [slides.length]);

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
    };

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    };

    // --- Loading Skeleton ---
    if (loading) {
        return (
            <div className="relative h-[600px] md:h-[700px] bg-gray-900 animate-pulse flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="h-4 w-32 bg-gray-800 rounded mx-auto"></div>
                    <div className="h-12 w-64 md:w-96 bg-gray-800 rounded mx-auto"></div>
                    <div className="h-4 w-48 bg-gray-800 rounded mx-auto"></div>
                </div>
            </div>
        );
    }

    // --- No Slides Fallback (Optional: Show static content or nothing) ---
    if (slides.length === 0) {
        return (
            <div className="relative h-[500px] flex items-center justify-center bg-gray-100 text-gray-500">
                Slider verisi bulunamadı.
            </div>
        );
    }

    const slide = slides[currentSlide];

    return (
        <section className="relative h-[600px] md:h-[700px] flex items-center overflow-hidden bg-black">
            {/* Background Image Iteration for Smooth Transition */}
            <AnimatePresence mode='wait'>
                <motion.div
                    key={slide.id}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0 z-0"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent z-10" />
                    <img
                        src={slide.image_url}
                        alt={slide.title}
                        className="w-full h-full object-cover"
                    />
                </motion.div>
            </AnimatePresence>

            {/* Content */}
            <div className="container relative z-20 mx-auto px-4 md:px-16">
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={slide.id}
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -40 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="max-w-3xl text-white text-center md:text-left mx-auto md:mx-0"
                    >
                        {slide.subtitle && (
                            <div className="flex items-center justify-center md:justify-start gap-4 mb-4 md:mb-6">
                                <span className="h-[2px] w-8 md:w-12 bg-[#f0c961]" />
                                <span className="text-[#f0c961] font-bold tracking-[0.3em] text-xs md:text-sm uppercase">{slide.subtitle}</span>
                            </div>
                        )}

                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight mb-6 font-sans tracking-tight">
                            {slide.title}
                        </h1>

                        {slide.description && (
                            <p className="text-lg md:text-xl text-gray-200 mb-8 md:mb-10 max-w-xl mx-auto md:mx-0 font-light leading-relaxed">
                                {slide.description}
                            </p>
                        )}

                        <div className="flex flex-col md:flex-row flex-wrap gap-4 justify-center md:justify-start">
                            {slide.target_link && (
                                <Link
                                    to={slide.target_link}
                                    className="group relative px-8 py-4 bg-[#f0c961] text-black font-bold uppercase tracking-wider overflow-hidden rounded-lg shadow-[0_0_20px_rgba(240,201,97,0.4)]"
                                >
                                    <div className="absolute inset-0 w-full h-full bg-white/30 skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                    <span className="relative flex items-center justify-center gap-2">
                                        {slide.button_text || 'Hemen İncele'}
                                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                    </span>
                                </Link>
                            )}
                            {/* Static Contact Button (Optional - could also be dynamic later) */}
                            <button onClick={() => window.open('https://wa.me/905555555555')} className="px-8 py-4 border border-white/30 text-white font-bold uppercase tracking-wider rounded-lg hover:bg-white/10 backdrop-blur-sm transition-all">
                                Bize Ulaşın
                            </button>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Arrows */}
            {slides.length > 1 && (
                <>
                    <button
                        onClick={prevSlide}
                        className="absolute left-4 md:left-8 z-30 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all border border-white/10 hover:scale-110 hidden md:block"
                    >
                        <ChevronLeft className="w-8 h-8" />
                    </button>
                    <button
                        onClick={nextSlide}
                        className="absolute right-4 md:right-8 z-30 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all border border-white/10 hover:scale-110 hidden md:block"
                    >
                        <ChevronRight className="w-8 h-8" />
                    </button>

                    {/* Dots Indicator */}
                    <div className="absolute bottom-6 left-0 right-0 z-30 flex justify-center gap-2">
                        {slides.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentSlide(idx)}
                                className={`w-3 h-3 rounded-full transition-all ${idx === currentSlide ? 'bg-[#f0c961] w-8' : 'bg-white/50 hover:bg-white'}`}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* Floating Abstract Element - Hidden on Mobile (Original/Static part integration) */}
            <motion.div
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-20 right-20 z-20 hidden xl:block pointer-events-none"
            >
                {/* Keeping the abstract floating card as requested to preserve design DNA */}
                <div className="bg-white/10 backdrop-blur-xl p-8 rounded-2xl border border-white/20 shadow-2xl max-w-sm">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="p-3 bg-[#f0c961] rounded-lg">
                            <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">Yüksek Verimlilik</h3>
                            <p className="text-gray-300 text-sm mt-1">Son teknoloji ürünler ile enerji tasarrufu.</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </section>
    );
};

export default Hero;
