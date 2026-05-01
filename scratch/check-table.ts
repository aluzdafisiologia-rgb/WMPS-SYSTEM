import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { resolve } from 'path';

const envPath = resolve('.env.local');
let supabaseUrl = '';
let supabaseKey = '';
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  const lines = envFile.split('\n');
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
  }
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('assessments').select('*').limit(1);
  console.log("Error:", error);
  console.log("Data:", data);
}
check();
