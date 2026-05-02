import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Esta instância é segura para usar no navegador (client-side)
export const supabase = (typeof supabaseUrl === 'string' && supabaseUrl.startsWith('http') && typeof supabaseAnonKey === 'string') 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
