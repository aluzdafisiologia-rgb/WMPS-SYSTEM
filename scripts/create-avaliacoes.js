const { createClient } = require('@supabase/supabase-js');

const url = 'https://lilngtmfqbryqeuupxxz.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbG5ndG1mcWJyeXFldXVweHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMyNDIxNywiZXhwIjoyMDkyOTAwMjE3fQ.bbZ-W830Ng_HpdqDpEaeE4klE5phKY3wJiiaddxG4to';
const supabase = createClient(url, serviceKey);

async function run() {
  console.log('=== VERIFICANDO/CRIANDO tabela avaliacoes ===');

  // Check if table exists by querying it
  const { error: checkError } = await supabase.from('avaliacoes').select('id').limit(1);
  
  if (!checkError) {
    console.log('✅ Tabela avaliacoes ja existe e esta acessivel!');
    return;
  }
  
  console.log('Erro ao acessar avaliacoes:', checkError.code, checkError.message);
  
  if (checkError.code === '42P01') {
    console.log('Tabela nao existe. Criando via Management API...');
    
    // Use Supabase Management API to run SQL
    const res = await fetch(
      `https://api.supabase.com/v1/projects/lilngtmfqbryqeuupxxz/database/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`
        },
        body: JSON.stringify({
          query: `
            CREATE TABLE IF NOT EXISTS public.avaliacoes (
              id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
              athlete_id text NOT NULL,
              athlete_name text NOT NULL,
              type text NOT NULL,
              date date NOT NULL DEFAULT current_date,
              data jsonb NOT NULL,
              created_at timestamp with time zone DEFAULT now()
            );
            ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
            CREATE POLICY IF NOT EXISTS "Service role full access on avaliacoes"
              ON public.avaliacoes FOR ALL USING (true);
          `
        })
      }
    );
    const result = await res.json();
    console.log('Result:', JSON.stringify(result, null, 2));
  } else {
    console.log('OUTRO ERRO:', checkError.message);
  }
}

run().catch(console.error);
