import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

function loadEnv() {
  try {
    const envFile = readFileSync('.env.local', 'utf8');
    envFile.split('\n').forEach(line => {
      const [key, ...value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.join('=').trim();
      }
    });
  } catch (e) {
    console.error('Could not read .env.local');
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function createCoach() {
  const email = 'professor@wmps.com';
  const password = 'professor123';

  // 1. Criar o usuário no Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true
  });

  if (authError) {
    console.error('Erro ao criar Auth User:', authError.message);
    // Se o usuário já existir, vamos buscar o id dele para atualizar o profile
    if (authError.message.includes('already registered')) {
        const { data: listData } = await supabase.auth.admin.listUsers();
        const user = listData?.users.find(u => u.email === email);
        if (user) {
            await createOrUpdateProfile(user.id, email);
        }
    }
    return;
  }

  console.log('Usuário Auth criado com sucesso! ID:', authData.user.id);
  await createOrUpdateProfile(authData.user.id, email);
}

async function createOrUpdateProfile(userId, email) {
  // 2. Criar ou atualizar o profile com role='coach'
  const profileData = {
    id: userId,
    athlete_id: userId, // para manter consistência caso a tabela exija
    full_name: 'Professor / Administrador',
    email: email,
    role: 'coach',
    birth_date: '1980-01-01',
    gender: 'N/A',
    height: 0,
    weight: 0,
    sport: 'N/A',
    goal: 'N/A',
    experience_level: 'N/A'
  };

  const { data: profData, error: profError } = await supabase.from('profiles').upsert([profileData]);

  if (profError) {
    console.error('Erro ao criar Profile:', profError.message);
  } else {
    console.log('Profile de Coach atualizado com sucesso!');
    console.log('--------------------------------------------------');
    console.log('LOGIN PRONTO:');
    console.log('Email: professor@wmps.com');
    console.log('Senha: professor123');
    console.log('--------------------------------------------------');
  }
}

createCoach();
