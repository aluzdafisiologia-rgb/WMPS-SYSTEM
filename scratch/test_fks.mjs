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

const supabaseService = createClient(supabaseUrl, serviceKey);

async function testFK() {
  console.log('--- Testing Foreign Key Constraints ---');
  
  const dummyUUID = '00000000-0000-0000-0000-000000000000'; // Fake UUID
  
  // Test Session FK
  const { error: sessionError } = await supabaseService.from('sessions').insert([{
    athlete_id: dummyUUID,
    title: 'FK Test',
    type: 'treino_corrida',
    date: '2026-04-29T00:00:00Z',
    status: 'planned'
  }]);
  
  if (sessionError) {
    console.log(`Sessions table error on insert (expected if FK exists): ${sessionError.message} (Code: ${sessionError.code})`);
  } else {
    console.log(`Sessions table allowed insert with invalid athlete_id! (WARNING: No FK constraint!)`);
  }

  // Test Wellness FK
  const { error: wellnessError } = await supabaseService.from('wellness').insert([{
    athlete_id: dummyUUID,
    date: '2026-04-29',
    sleep_quality: 5,
    muscle_soreness: 5,
    stress_level: 5,
    energy_level: 5,
    hydration: true,
    nutrition: true
  }]);
  
  if (wellnessError) {
    console.log(`Wellness table error on insert (expected if FK exists): ${wellnessError.message} (Code: ${wellnessError.code})`);
  } else {
    console.log(`Wellness table allowed insert with invalid athlete_id! (WARNING: No FK constraint!)`);
  }

  // Also let's check Profiles User ID FK if it's connected to auth.users
  const { error: profileError } = await supabaseService.from('profiles').insert([{
    id: dummyUUID, // auth user ID
    full_name: 'Test Name',
    email: 'test@fk.com',
    role: 'athlete'
  }]);

  if (profileError) {
    console.log(`Profiles table error on insert: ${profileError.message} (Code: ${profileError.code})`);
  } else {
    console.log(`Profiles table allowed insert with fake UUID as ID.`);
    // Cleanup
    await supabaseService.from('profiles').delete().eq('id', dummyUUID);
  }
}

testFK();
