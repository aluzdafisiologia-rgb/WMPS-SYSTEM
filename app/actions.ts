'use server'

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { addSession, addWellness, getDb, Session, WellnessEntry, saveProfile } from '@/lib/db';

// Conexão direta e segura
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// --- FUNÇÕES DE CADASTRO ---

export async function submitRegistrationRequest(request: any) {
  try {
    if (!supabase) {
      return { success: false, error: 'Chaves do Supabase não configuradas na Vercel.' };
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

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro interno.' };
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

// --- FUNÇÕES DE ATIVIDADE (Restauradas) ---

export async function logWorkout(formData: any) {
  try {
    if (!supabase) throw new Error('DB offline');
    const athlete_id = formData.athleteName.toLowerCase().replace(/\s+/g, '-');
    
    await supabase.from('sessions').insert([{
      athlete_id,
      athlete_name: formData.athleteName,
      date: formData.date,
      rpe: formData.rpe,
      duration: formData.duration,
      load: formData.rpe * formData.duration,
      distance: formData.distance || 0,
      volume: formData.volume || 0
    }]);

    revalidatePath('/coach');
  } catch (e) {
    console.error(e);
  }
}

export async function logWellness(formData: any) {
  try {
    if (!supabase) throw new Error('DB offline');
    const athlete_id = formData.athleteName.toLowerCase().replace(/\s+/g, '-');

    await supabase.from('wellness').insert([{
      athlete_id,
      athlete_name: formData.athleteName,
      date: formData.date,
      recovery: formData.recovery,
      sleep: formData.sleep,
      stress: formData.stress,
      fatigue: formData.fatigue,
      soreness: formData.soreness,
      score: Math.round((formData.recovery + formData.sleep + formData.stress + formData.fatigue + formData.soreness) / 5)
    }]);

    revalidatePath('/coach');
  } catch (e) {
    console.error(e);
  }
}

export async function getSessions() {
  try {
    if (!supabase) return [];
    const { data } = await supabase.from('sessions').select('*').order('date', { ascending: false });
    return data || [];
  } catch (e) {
    return [];
  }
}

export async function getWellness() {
  try {
    if (!supabase) return [];
    const { data } = await supabase.from('wellness').select('*').order('date', { ascending: false });
    return data || [];
  } catch (e) {
    return [];
  }
}
