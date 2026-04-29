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

async function setAdmin() {
  const { data, error } = await supabase.from('profiles').update({ role: 'admin' }).eq('email', 'professor@wmps.com');
  if (error) {
    console.error('Erro ao atualizar para admin:', error.message);
  } else {
    console.log('Professor promovido a Master Admin com sucesso.');
  }
}

setAdmin();
