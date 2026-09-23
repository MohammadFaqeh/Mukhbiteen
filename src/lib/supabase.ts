import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('لم يتم ضبط VITE_SUPABASE_URL أو VITE_SUPABASE_ANON_KEY في ملف .env.local');
}

export const supabase = createClient(url, anonKey);
