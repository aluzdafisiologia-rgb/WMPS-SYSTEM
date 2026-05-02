'use server'

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { addSession, addWellness, getDb, Session, WellnessEntry, saveProfile } from '@/lib/db';

// Conexão direta e segura
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = (typeof supabaseUrl === 'string' && supabaseUrl.startsWith('http') && typeof supabaseServiceKey === 'string') 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

if (!supabase) {
  console.error('SERVER-SIDE SUPABASE INITIALIZATION FAILED: Missing URL or Service Key');
} else {

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
      is_minor: request.is_minor || request.isMinor,
      guardian_name: request.guardianName,
      guardian_cpf: request.guardianCpf,
      guardian_phone: request.guardianPhone,
      guardian_relationship: request.guardianRelationship,
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
      volume: formData.volume || 0,
      series: formData.series || 0,
      reps: formData.reps || 0
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

export async function saveAssessment(payload: { athlete_id: string, athlete_name: string, type: string, date: string, data: any }) {
  try {
    if (!supabase) throw new Error('Banco de dados indisponível');
    
    const { data, error } = await supabase.from('avaliacoes').insert([payload]);
    if (error) {
      if (error.code === '42P01') {
        console.warn('Tabela avaliacoes não existe. Execute o SQL em sql/fix_avaliacoes_rls.sql no Supabase Dashboard.');
        return { success: false, error: 'Tabela avaliacoes não configurada. Execute sql/fix_avaliacoes_rls.sql no Supabase Dashboard.' };
      }
      if (error.code === '42501') {
        console.warn('Permissão negada para avaliacoes. Execute o SQL em sql/fix_avaliacoes_rls.sql no Supabase Dashboard para corrigir as políticas RLS.');
        return { success: false, error: 'Sem permissão na tabela avaliacoes. Execute sql/fix_avaliacoes_rls.sql no Supabase Dashboard.' };
      }
      throw error;
    }
    revalidatePath('/coach');
    return { success: true, data };
  } catch (e: any) {
    console.error('Error saving assessment:', e);
    return { success: false, error: e.message };
  }
}

export async function getAssessments(athleteId?: string) {
  try {
    if (!supabase) return [];
    let query = supabase.from('avaliacoes').select('*').order('date', { ascending: true });
    if (athleteId) query = query.eq('athlete_id', athleteId);
    
    const { data, error } = await query;
    if (error) {
      // Graceful fallback for table permission/existence issues
      if (error.code === '42P01' || error.code === '42501') return [];
      throw error;
    }
    return data || [];
  } catch (e) {
    console.error('Error getting assessments:', e);
    return [];
  }
}

export async function getSessions(athleteId?: string) {
  try {
    if (!supabase) return [];
    let query = supabase.from('sessions').select('*').order('date', { ascending: true });
    if (athleteId) query = query.eq('athlete_id', athleteId);
    const { data } = await query;
    return data || [];
  } catch (e) {
    return [];
  }
}

export async function getWellness(athleteId?: string) {
  try {
    if (!supabase) return [];
    let query = supabase.from('wellness').select('*').order('date', { ascending: true });
    if (athleteId) query = query.eq('athlete_id', athleteId);
    const { data } = await query;
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

export async function updateProfilePhoto(userId: string, photoUrl: string) {
  if (!supabase) return { success: false, error: 'Database not available' };
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ photo_url: photoUrl })
      .eq('id', userId);
    
    if (error) throw error;
    revalidatePath('/athlete');
    revalidatePath('/coach');
    return { success: true };
  } catch (err: any) {
    console.error('Error updating photo:', err);
    return { success: false, error: err.message };
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
  if (!supabase) return 'athlete';
  try {
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
    return data?.role || 'athlete';
  } catch (e) {
    return 'athlete';
  }
}

// Helper para validar acesso de coach/admin
async function validateCoachAccess() {
  // Nota: Em uma implementação ideal com @supabase/ssr, usaríamos auth.getUser()
  // Como estamos usando o service_role client no servidor, precisamos garantir
  // que o usuário que chama a ação tem permissão.
  // Por agora, assumimos que o middleware ou a lógica de página protege o acesso,
  // mas adicionamos esta camada de redundância onde possível.
  return true; // Placeholder para validação real de sessão
}

export async function getAthletes() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, athlete_id, full_name, sport, photo_url, role, team_name, birth_date, gender, weight, height')
      .eq('role', 'athlete')
      .order('full_name', { ascending: true });

    if (error) {
      console.error('SUPABASE ERROR IN getAthletes:', error);
      throw error;
    }
    console.log(`getAthletes: Found ${data?.length || 0} athletes`);
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

export async function getAthletePrescriptions(athleteId: string) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('training_prescriptions')
      .select('id, athlete_id, athlete_name, status, completed_at, completed_blocks, total_blocks, created_at, data')
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting athlete prescriptions:', error);
    return [];
  }
}

export async function getAllPrescriptions() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('training_prescriptions')
      .select('id, athlete_id, athlete_name, status, completed_at, completed_blocks, total_blocks, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting all prescriptions:', error);
    return [];
  }
}

export async function completeTraining(prescriptionId: string, workoutData: any) {
  if (!supabase) throw new Error('Supabase client not initialized');
  try {
    // Marcar prescrição como concluída, salvando metadados de blocos executados
    const { error: pError } = await supabase
      .from('training_prescriptions')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_blocks: workoutData.completedBlocks ?? null,
        total_blocks: workoutData.totalBlocks ?? null,
      })
      .eq('id', prescriptionId);

    if (pError) throw pError;

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
  
  // Proteção contra acesso não autorizado
  if (!await validateCoachAccess()) return { success: false, error: 'Não autorizado' };
  
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

    let userId = authData?.user?.id;

    if (authError) {
      // Se o erro for que o usuário já existe, buscamos o ID para tentar recuperar a criação do Profile
      if (authError.message.includes('already been registered') || authError.message.includes('already registered')) {
         const { data: listData } = await supabase.auth.admin.listUsers();
         const existingUser = listData?.users.find(u => u.email === request.email);
         if (existingUser) {
           userId = existingUser.id;
         } else {
           throw new Error('Usuário já registrado no Auth, mas ID não encontrado.');
         }
      } else {
        throw authError;
      }
    }

    // 4. Criar perfil
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert([{
        id: userId,
        full_name: request.full_name,
        email: request.email,
        phone: request.phone,
        birth_date: request.birth_date,
        is_minor: request.is_minor,
        guardian_name: request.guardian_name,
        guardian_phone: request.guardian_phone,
        guardian_relationship: request.guardian_relationship,
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

export async function deleteRegistrationRequest(requestId: string) {
  if (!supabase) return { success: false, error: 'Supabase não inicializado' };
  
  const { error } = await supabase
    .from('registration_requests')
    .delete()
    .eq('id', requestId);

  if (error) return { success: false, error: error.message };
  revalidatePath('/coach');
  return { success: true };
}
