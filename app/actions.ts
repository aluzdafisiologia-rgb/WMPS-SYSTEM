'use server'

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Conexão direta aqui dentro para evitar erro 500 de carregamento
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function submitRegistrationRequest(request: any) {
  try {
    console.log('Iniciando submissão...');
    
    if (!supabase) {
      return { success: false, error: 'As chaves do Supabase não foram encontradas na Vercel.' };
    }

    const { data, error } = await supabase.from('registration_requests').insert([{
      full_name: request.fullName,
      email: request.email,
      birth_date: request.birthDate,
      cpf: request.cpf,
      phone: request.phone,
      is_minor: request.isMinor,
      guardian_name: request.guardianName,
      guardian_cpf: request.guardianCpf,
      status: 'pendente'
    }]).select().single();

    if (error) {
      console.error('Erro no Supabase:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Erro fatal na ação:', err);
    return { success: false, error: err.message || 'Erro interno no servidor.' };
  }
}

export async function getRegistrationRequests() {
  try {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('registration_requests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) return [];
    return data || [];
  } catch (err) {
    return [];
  }
}
