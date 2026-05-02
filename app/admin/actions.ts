'use server'

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = (typeof supabaseUrl === 'string' && supabaseUrl.startsWith('http') && typeof supabaseServiceKey === 'string') 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Obter solicitações pendentes
export async function getPendingRequests() {
  if (!supabase) return [];
  const { data } = await supabase
    .from('registration_requests')
    .select('*')
    .eq('status', 'pendente')
    .order('created_at', { ascending: false });
  return data || [];
}

// Obter todos os usuários (profiles)
export async function getAllUsers() {
  if (!supabase) return [];
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name', { ascending: true });
  return data || [];
}

// Aprovar Cadastro
export async function approveRegistration(request: any) {
  if (!supabase) return { success: false, error: 'Sem conexão' };

  try {
    // 1. Criar usuário no Auth com uma senha temporária (ex: 8 primeiros dígitos do CPF ou 'wmps123')
    const tempPassword = request.cpf ? request.cpf.replace(/\D/g, '').slice(0, 8) : 'wmps123';
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: request.email,
      password: tempPassword,
      email_confirm: true
    });

    if (authError && !authError.message.includes('already registered')) {
      return { success: false, error: 'Erro ao criar usuário: ' + authError.message };
    }

    let userId = authData?.user?.id;

    if (!userId) {
      // Se já estava registrado, busca o ID
      const { data: listData } = await supabase.auth.admin.listUsers();
      const existingUser = listData?.users.find(u => u.email === request.email);
      if (existingUser) {
        userId = existingUser.id;
      } else {
        return { success: false, error: 'Erro ao buscar usuário existente' };
      }
    }

    // 2. Criar Profile
    const profileData = {
      id: userId,
      athlete_id: request.full_name.toLowerCase().replace(/\s+/g, '-'),
      full_name: request.full_name,
      email: request.email,
      role: 'athlete',
      birth_date: request.birth_date,
      gender: 'N/A',
      height: 0,
      weight: 0,
      sport: 'N/A',
      goal: 'N/A',
      experience_level: 'N/A',
      must_change_password: true
    };

    const { error: profError } = await supabase.from('profiles').upsert([profileData]);
    if (profError) {
      return { success: false, error: 'Erro ao criar perfil: ' + profError.message };
    }

    // 3. Atualizar Status do Request
    await supabase.from('registration_requests').update({ status: 'aprovado' }).eq('id', request.id);

    revalidatePath('/admin');
    return { success: true, tempPassword };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Negar Cadastro
export async function denyRegistration(requestId: string) {
  if (!supabase) return { success: false };
  const { error } = await supabase.from('registration_requests').update({ status: 'negado' }).eq('id', requestId);
  revalidatePath('/admin');
  return { success: !error };
}

// Alterar Role do Usuário (Dar/Revogar Admin/Coach ou Bloquear)
export async function changeUserRole(userId: string, newRole: string) {
  if (!supabase) return { success: false };
  
  // Update Profile Role
  const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
  
  // Se for block, tentar dar ban no Auth
  if (newRole === 'blocked') {
    await supabase.auth.admin.updateUserById(userId, { ban_duration: '87600h' });
  } else {
    // Tira o ban caso esteja revogando o block
    await supabase.auth.admin.updateUserById(userId, { ban_duration: 'none' });
  }

  revalidatePath('/admin');
  return { success: !error, error: error?.message };
}
