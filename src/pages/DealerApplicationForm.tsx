import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';

const dealerFormSchema = z.object({
    company_name: z.string().min(2, "Firma adı en az 2 karakter olmalıdır"),
    contact_name: z.string().min(2, "Yetkili adı en az 2 karakter olmalıdır"),
    phone: z.string().min(10, "Geçerli bir telefon numarası giriniz"),
    email: z.string().email("Geçerli bir e-posta adresi giriniz"),
    address: z.string().min(10, "Lütfen açık adresinizi giriniz"),
    activity_field: z.string().min(2, "Faaliyet alanınızı giriniz"),
    tax_office: z.string().min(2, "Vergi dairesi gereklidir"),
    tax_number: z.string().min(10, "Vergi numarası veya TC Kimlik no gereklidir"),
});

type DealerFormData = z.infer<typeof dealerFormSchema>;

export default function DealerApplicationForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const { register, handleSubmit, formState: { errors } } = useForm<DealerFormData>({
        resolver: zodResolver(dealerFormSchema)
    });

    const onSubmit = async (data: DealerFormData) => {
        setIsSubmitting(true);
        setErrorMsg(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setErrorMsg("Başvuru yapmak için lütfen giriş yapınız.");
                setIsSubmitting(false);
                return;
            }

            const { error } = await supabase
                .from('b2b_requests')
                .insert([
                    {
                        ...data,
                        profile_id: user.id,
                        // status defaults to 'pending' in DB
                    }
                ]);

            if (error) throw error;

            setIsSuccess(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (error: any) {
            console.error('Error submitting form:', error);
            setErrorMsg("Başvuru gönderilirken bir hata oluştu. Lütfen tekrar deneyin.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-[#fffaf4] flex flex-col items-center justify-center px-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-green-100 text-center max-w-md w-full">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-black text-[#1a1a1a] mb-2">Başvurunuz Alındı!</h2>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                        Bayilik başvurunuz bize ulaştı. Ekibimiz bilgilerinizi inceledikten sonra en kısa sürede sizinle iletişime geçecektir.
                    </p>
                    <Link to="/" className="inline-block bg-[#1a1a1a] text-[#f0c961] font-bold px-8 py-4 rounded-xl hover:bg-[#333] transition-colors uppercase tracking-wider">
                        Anasayfaya Dön
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fffaf4] py-12 px-4">
            <div className="container mx-auto max-w-4xl">
                <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100">

                    <div className="text-center mb-10">
                        <h1 className="text-3xl md:text-5xl font-black text-[#1a1a1a] mb-4">Bayilik Başvurusu</h1>
                        <p className="text-gray-500 max-w-2xl mx-auto">
                            İçel Solar Market yetkili bayisi olmak için aşağıdaki formu doldurunuz.
                            Başvurunuz değerlendirildikten sonra size dönüş yapılacaktır.
                        </p>
                    </div>

                    {errorMsg && (
                        <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Firma Adı */}
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Firma Ünvanı</label>
                                <input
                                    {...register('company_name')}
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#f0c961] focus:ring-4 focus:ring-[#f0c961]/10 outline-none transition-all"
                                    placeholder="Şirketinizin tam ünvanı"
                                />
                                {errors.company_name && <span className="text-red-500 text-xs font-bold mt-1">{errors.company_name.message}</span>}
                            </div>

                            {/* Yetkili Ad Soyad */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Yetkili Adı Soyadı</label>
                                <input
                                    {...register('contact_name')}
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#f0c961] focus:ring-4 focus:ring-[#f0c961]/10 outline-none transition-all"
                                    placeholder="Adınız Soyadınız"
                                />
                                {errors.contact_name && <span className="text-red-500 text-xs font-bold mt-1">{errors.contact_name.message}</span>}
                            </div>

                            {/* Telefon */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Telefon Numarası</label>
                                <input
                                    {...register('phone')}
                                    type="tel"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#f0c961] focus:ring-4 focus:ring-[#f0c961]/10 outline-none transition-all"
                                    placeholder="05XX XXX XX XX"
                                />
                                {errors.phone && <span className="text-red-500 text-xs font-bold mt-1">{errors.phone.message}</span>}
                            </div>

                            {/* E-posta */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">E-posta Adresi</label>
                                <input
                                    {...register('email')}
                                    type="email"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#f0c961] focus:ring-4 focus:ring-[#f0c961]/10 outline-none transition-all"
                                    placeholder="ornek@sirket.com"
                                />
                                {errors.email && <span className="text-red-500 text-xs font-bold mt-1">{errors.email.message}</span>}
                            </div>

                            {/* Faaliyet Alanı */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Faaliyet Alanı</label>
                                <input
                                    {...register('activity_field')}
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#f0c961] focus:ring-4 focus:ring-[#f0c961]/10 outline-none transition-all"
                                    placeholder="Örn: Elektrik, İnşaat, Mühendislik..."
                                />
                                {errors.activity_field && <span className="text-red-500 text-xs font-bold mt-1">{errors.activity_field.message}</span>}
                            </div>

                            {/* Vergi Dairesi */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Vergi Dairesi</label>
                                <input
                                    {...register('tax_office')}
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#f0c961] focus:ring-4 focus:ring-[#f0c961]/10 outline-none transition-all"
                                    placeholder="Vergi Dairesi"
                                />
                                {errors.tax_office && <span className="text-red-500 text-xs font-bold mt-1">{errors.tax_office.message}</span>}
                            </div>

                            {/* Vergi No */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Vergi No / TC Kimlik No</label>
                                <input
                                    {...register('tax_number')}
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#f0c961] focus:ring-4 focus:ring-[#f0c961]/10 outline-none transition-all"
                                    placeholder="Vergi Numarası"
                                />
                                {errors.tax_number && <span className="text-red-500 text-xs font-bold mt-1">{errors.tax_number.message}</span>}
                            </div>

                            {/* Adres */}
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Açık Adres</label>
                                <textarea
                                    {...register('address')}
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#f0c961] focus:ring-4 focus:ring-[#f0c961]/10 outline-none transition-all resize-none"
                                    placeholder="Firma adres bilgileri..."
                                />
                                {errors.address && <span className="text-red-500 text-xs font-bold mt-1">{errors.address.message}</span>}
                            </div>

                        </div>

                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`
                                    w-full py-4 rounded-xl font-black uppercase tracking-widest text-lg shadow-lg flex items-center justify-center gap-3 transition-all
                                    ${isSubmitting
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        : 'bg-[#f0c961] text-[#1a1a1a] hover:bg-[#e0b950] hover:scale-[1.01] active:scale-[0.99]'}
                                `}
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-[#1a1a1a] border-t-transparent rounded-full animate-spin"></div>
                                        GÖNDERİLİYOR...
                                    </>
                                ) : (
                                    'BAŞVURUYU GÖNDER'
                                )}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}
