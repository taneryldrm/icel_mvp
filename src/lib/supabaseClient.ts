import { createClient } from '@supabase/supabase-js';

// .env dosyasından Supabase bağlantı bilgilerini alıyoruz
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL veya Anon Key bulunamadı! Lütfen .env dosyasını kontrol edin.');
}

/**
 * Supabase istemcisini oluşturur.
 * Bu istemci veritabanı işlemleri ve kimlik doğrulama için kullanılır.
 */
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Bağlantı durumunu konsola bas (sadece geliştirme ortamında veya her zaman, isteğe bağlı)
console.log('Supabase connected (client initialized)');
