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
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAnon = createClient(supabaseUrl, anonKey);
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function testLoginAndRole() {
  console.log('1. Trying to login...');
  const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
    email: 'professor@wmps.com',
    password: 'professor123'
  });

  if (authError) {
    console.error('Login error:', authError.message);
    return;
  }
  
  const user = authData.user;
  console.log('Login OK. User ID:', user.id);

  console.log('2. Trying to fetch profile with Anon Key (as the logged-in user)...');
  const { data: prof1, error: err1 } = await supabaseAnon.from('profiles').select('role, full_name').eq('email', 'professor@wmps.com').single();
  console.log('Profile via Email:', prof1, 'Error:', err1?.message);

  const { data: prof2, error: err2 } = await supabaseAnon.from('profiles').select('role, full_name').eq('id', user.id).single();
  console.log('Profile via ID:', prof2, 'Error:', err2?.message);

  console.log('3. Trying to fetch profile with Service Role (Bypassing RLS)...');
  const { data: prof3 } = await supabaseAdmin.from('profiles').select('role, full_name').eq('id', user.id).single();
  console.log('Actual Profile in DB:', prof3);
}

testLoginAndRole();
