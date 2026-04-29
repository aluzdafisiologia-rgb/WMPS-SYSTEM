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

if (!supabase) {
  console.error('SERVER-SIDE SUPABASE INITIALIZATION FAILED: Missing URL or Service Key');
} else {
  console.log('SERVER-SIDE SUPABASE INITIALIZED SUCCESSFULLY');
}

export async function logAnamnesis(userId: string, data: any) {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('anamnesis')
      .upsert({
        athlete_id: userId,
        athlete_name: data.athleteName,
        data: data,
        date: new Date().toISOString().split('T')[0]
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error logging anamnesis:', error);
    throw error;
  }
}

export async function getAnamnesis() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('anamnesis')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting anamnesis:', error);
    return [];
  }
}

// --- PERMISSÕES E ROLES ---

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

export async function logWorkout(userId: string, formData: any) {
  try {
    if (!supabase) throw new Error('Banco de dados indisponível');
    
    await supabase.from('sessions').insert([{
      athlete_id: userId,
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
    console.error('Error logging workout:', e);
  }
}

export async function logWellness(userId: string, formData: any) {
  try {
    if (!supabase) throw new Error('Banco de dados indisponível');

    await supabase.from('wellness').insert([{
      athlete_id: userId,
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
    console.error('Error logging wellness:', e);
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

export async function registerProfile(profile: any) {
  const athlete_id = profile.fullName.toLowerCase().replace(/\s+/g, '-');
  const data = {
    athlete_id,
    full_name: profile.fullName,
    email: profile.email,
    birth_date: profile.birthDate,
    gender: profile.gender,
    height: profile.height,
    weight: profile.weight,
    sport: profile.sport,
    goal: profile.goal,
    experience_level: profile.experienceLevel
  };

  try {
    const result = await saveProfile(data); 
    revalidatePath('/');
    revalidatePath('/coach');
    return result;
  } catch (error) {
    console.error('Action error (registerProfile):', error);
    throw error;
  }
}

export async function checkMustChangePassword(userId: string) {
  if (!supabase) return false;
  const { data } = await supabase
    .from('profiles')
    .select('must_change_password')
    .eq('id', userId)
    .single();
  return data?.must_change_password || false;
}

export async function updateUserPassword(userId: string, newPassword: string) {
  if (!supabase) return { success: false };
  try {
    // 1. Atualizar no Auth
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword
    });
    if (authError) throw authError;

    // 2. Marcar como alterado no Profile
    const { error: profError } = await supabase
      .from('profiles')
      .update({ must_change_password: false })
      .eq('id', userId);
    
    if (profError) throw profError;

    return { success: true };
  } catch (error: any) {
    console.error('updateUserPassword error:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserRole(userId: string) {
  if (!supabase) {
    console.error('getUserRole: Supabase service client is NULL');
    return 'athlete';
  }
  try {
    console.log('getUserRole: Buscando papel para ID:', userId);
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('getUserRole: Erro na query:', error.message);
      return 'athlete';
    }
    
    if (!data) {
      console.warn('getUserRole: Nenhum perfil encontrado para ID:', userId);
      return 'athlete';
    }
    
    console.log('getUserRole: Papel encontrado:', data.role);
    return data.role;
  } catch (e) {
    console.error('getUserRole: Erro inesperado:', e);
    return 'athlete';
  }
}

export async function getAthletes() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'athlete')
      .order('full_name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting athletes:', error);
    return [];
  }
}

export async function saveTrainingPrescription(prescription: any) {
  if (!supabase) throw new Error('Supabase client not initialized');
  try {
    const { data, error } = await supabase
      .from('training_prescriptions')
      .insert([{
        athlete_id: prescription.athlete_id,
        coach_id: prescription.coach_id,
        athlete_name: prescription.athlete_name,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        data: prescription.data
      }])
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/athlete');
    return { success: true, data };
  } catch (error: any) {
    console.error('Error saving prescription:', error);
    return { success: false, error: error.message };
  }
}

export async function getActivePrescription(athleteId: string) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('training_prescriptions')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting active prescription:', error);
    return null;
  }
}

export async function completeTraining(prescriptionId: string, workoutData: any) {
  if (!supabase) throw new Error('Supabase client not initialized');
  try {
    // 1. Marcar prescrição como concluída
    const { error: pError } = await supabase
      .from('training_prescriptions')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', prescriptionId);

    if (pError) throw pError;

    // 2. Logar na tabela de sessões para cálculos de carga
    await supabase.from('sessions').insert([{
      athlete_id: workoutData.athleteId,
      athlete_name: workoutData.athleteName,
      date: new Date().toISOString().split('T')[0],
      rpe: workoutData.rpe,
      duration: workoutData.duration,
      load: workoutData.rpe * workoutData.duration,
      distance: workoutData.distance || 0,
      volume: workoutData.volume || 0,
      training_id: prescriptionId // Link para auditoria
    }]);

    revalidatePath('/coach');
    revalidatePath('/athlete');
    return { success: true };
  } catch (error: any) {
    console.error('Error completing training:', error);
    return { success: false, error: error.message };
  }
}

export async function approveRegistration(requestId: string) {
  if (!supabase) return { success: false, error: 'Supabase não configurado' };
  
  try {
    // 1. Buscar a solicitação
    const { data: request, error: reqError } = await supabase
      .from('registration_requests')
      .select('*')
      .eq('id', requestId)
      .single();
    
    if (reqError || !request) throw new Error('Solicitação não encontrada');

    // 2. Gerar senha provisória (8 caracteres alfanuméricos + prefixo)
    const tempPassword = Math.random().toString(36).slice(-8) + 'WMPS!';

    // 3. Criar usuário no Auth (Service Role permite isso)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: request.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: request.full_name }
    });

    if (authError) {
      // Se o erro for que o usuário já existe, tentamos apenas atualizar o status
      if (authError.message.includes('already registered')) {
         await supabase.from('registration_requests').update({ status: 'aprovado' }).eq('id', requestId);
         return { success: true, alreadyExists: true };
      }
      throw authError;
    }

    // 4. Criar perfil
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert([{
        id: authData.user.id,
        full_name: request.full_name,
        email: request.email,
        birth_date: request.birth_date,
        role: 'athlete',
        must_change_password: true
      }]);

    if (profileError) throw profileError;

    // 5. Atualizar status da solicitação
    await supabase
      .from('registration_requests')
      .update({ status: 'aprovado' })
      .eq('id', requestId);

    revalidatePath('/coach');
    return { 
      success: true, 
      email: request.email, 
      password: tempPassword,
      fullName: request.full_name
    };
  } catch (error: any) {
    console.error('Error approving registration:', error);
    return { success: false, error: error.message };
  }
}
