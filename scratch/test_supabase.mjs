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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConnection() {
  console.log('Checking connection to:', supabaseUrl);
  
  const tables = ['registration_requests', 'sessions', 'wellness', 'profiles'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.error(`- ${table}: FAILED (${error.message}, ${error.code})`);
    } else {
      console.log(`- ${table}: OK`);
    }
  }

  console.log('--- Testing insert into registration_requests ---');
  const testRequest = {
    full_name: 'Test Runner',
    email: 'test@example.com',
    status: 'pendente',
    birth_date: '2000-01-01' // Fixed the not-null constraint
  };
  const { data: insData, error: insError } = await supabase.from('registration_requests').insert([testRequest]).select();
  if (insError) {
    console.error('Insert error into registration_requests:', insError.message, insError.code);
  } else {
    console.log('Successfully inserted into registration_requests:', insData[0]?.id);
    if (insData && insData[0] && insData[0].id) {
        await supabase.from('registration_requests').delete().eq('id', insData[0].id);
        console.log('Deleted test record.');
    }
  }
}

checkConnection();
