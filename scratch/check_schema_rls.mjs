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
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey || !anonKey) {
  console.error('Supabase keys missing');
  process.exit(1);
}

const supabaseService = createClient(supabaseUrl, serviceKey);
const supabaseAnon = createClient(supabaseUrl, anonKey);

async function checkAccess() {
  const tables = ['profiles', 'sessions', 'wellness', 'registration_requests'];
  console.log('--- Checking Anon Key Access (RLS test) ---');
  
  for (const table of tables) {
    console.log(`\nTable: ${table}`);
    
    // Test SELECT
    const { data: selData, error: selError } = await supabaseAnon.from(table).select('*').limit(1);
    if (selError) {
      console.error(`  [Anon] SELECT blocked: ${selError.message} (Code: ${selError.code})`);
    } else {
      console.log(`  [Anon] SELECT allowed. Data count: ${selData?.length}`);
    }
    
    // Test INSERT
    const { error: insError } = await supabaseAnon.from(table).insert([{}]).select(); // Might throw malformed input, but if RLS blocked it will be 42501
    if (insError) {
      console.error(`  [Anon] INSERT blocked or failed: ${insError.message} (Code: ${insError.code})`);
    } else {
      console.log(`  [Anon] INSERT allowed (Unexpected)`);
    }
  }
  
  console.log('\n--- Checking Swagger Schema for Foreign Keys ---');
  try {
      const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${serviceKey}`);
      if(res.ok) {
          const schema = await res.json();
          const paths = schema.paths;
          for (const [path, methods] of Object.entries(paths)) {
             if (path.startsWith('/')) {
                 const tableName = path.substring(1);
                 if (tables.includes(tableName)) {
                     console.log(`\nSchema relationships for ${tableName}:`);
                     const def = schema.definitions[tableName];
                     if(def && def.properties) {
                         for (const [prop, details] of Object.entries(def.properties)) {
                             if(details.description && details.description.includes('Note:')) {
                                 console.log(`  - ${prop}: ${details.description}`);
                             }
                         }
                     }
                 }
             }
          }
      } else {
          console.error("Failed to fetch schema", res.statusText);
      }
  } catch (e) {
      console.error("Error fetching schema", e);
  }
}

checkAccess();
