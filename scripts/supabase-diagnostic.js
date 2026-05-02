const { createClient } = require('@supabase/supabase-js');

const url = 'https://lilngtmfqbryqeuupxxz.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbG5ndG1mcWJyeXFldXVweHh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMyNDIxNywiZXhwIjoyMDkyOTAwMjE3fQ.bbZ-W830Ng_HpdqDpEaeE4klE5phKY3wJiiaddxG4to';
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false }
});

async function run() {
  console.log('=== DIAGNOSTICO COMPLETO DE TABELAS ===');
  
  // Test all tables
  const tables = ['sessions', 'wellness', 'avaliacoes', 'profiles', 'registration_requests', 'training_prescriptions', 'anamnesis'];
  for (const t of tables) {
    const { data, error, count } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`${t}: ${error ? '❌ ' + error.code + ' - ' + error.message : '✅ acessivel'}`);
  }
  
  console.log('\n=== TESTE DE ESCRITA ===');
  // Test write on sessions
  const { error: we } = await supabase.from('sessions').insert([{
    athlete_id: 'test-diag-001',
    athlete_name: 'DIAG TEST',
    date: '2026-05-01',
    rpe: 7,
    duration: 60,
    load: 420
  }]);
  console.log('sessions INSERT:', we ? '❌ ' + we.message : '✅ OK');
  
  if (!we) {
    const { error: de } = await supabase.from('sessions').delete().eq('athlete_id', 'test-diag-001');
    console.log('sessions DELETE (cleanup):', de ? '❌ ' + de.message : '✅ OK');
  }
  
  // Check auth connection
  const { data: authCheck, error: authErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 5 });
  console.log('\n=== AUTH ===');
  console.log('Auth Admin API:', authErr ? '❌ ' + authErr.message : '✅ Conectado, ' + authCheck.users.length + ' usuarios encontrados');
  authCheck?.users.forEach(u => console.log('  -', u.email, '| Role:', u.user_metadata?.role || 'N/A'));
}

run().catch(console.error);
