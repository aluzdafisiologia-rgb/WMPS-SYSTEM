import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { resolve } from 'path';
import { calculateRiskScore, calculateMonotony, calculateACWR } from '../lib/periodization-engine.ts';

// Read .env.local manually
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

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ERRO: Faltam variáveis de ambiente do Supabase (.env.local)");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  console.log("🔹 INICIANDO TESTES DO SISTEMA WMPS...");

  // 1. Test Supabase Connection
  console.log("\n-> 1. Verificando conexão Supabase...");
  const { data: pingData, error: pingError } = await supabase.from('profiles').select('id').limit(1);
  if (pingError) {
    console.error("❌ Falha ao conectar no Supabase:", pingError.message);
  } else {
    console.log("✅ Supabase conectado com sucesso!");
  }

  // 2. Test CRUD (profiles, sessions, wellness)
  console.log("\n-> 2. Testando CRUD e dados base...");
  const { data: athletes, error: athError } = await supabase.from('profiles').select('*').eq('role', 'athlete').limit(5);
  if (athError || !athletes) {
    console.error("❌ Erro ao ler atletas:", athError?.message);
  } else {
    console.log(`✅ Lidos ${athletes.length} atletas com sucesso.`);
  }

  // 3. Test Risk Score & Dashboard Data
  console.log("\n-> 3. Testando Risk Score Engine...");
  if (athletes && athletes.length > 0) {
    const testAthleteId = athletes[0].id;
    
    const { data: sessions } = await supabase.from('sessions').select('*').eq('athlete_id', testAthleteId);
    const { data: wellness } = await supabase.from('wellness').select('*').eq('athlete_id', testAthleteId);
    
    if (sessions && wellness) {
      console.log(`✅ Dados do atleta base (${athletes[0].full_name}): ${sessions.length} sessões, ${wellness.length} wellness`);
      
      const acwrMetrics = calculateACWR(sessions);
      const monotony = calculateMonotony(sessions);
      const strain = sessions.reduce((acc, s) => acc + (s.load || 0), 0);
      const avgRpe = sessions.length > 0 ? sessions.reduce((acc, s) => acc + s.rpe, 0) / sessions.length : 6;
      const avgWellness = wellness.length > 0 ? wellness[0].score : 75;
      
      const riskReport = calculateRiskScore(acwrMetrics.ratio, monotony, strain, avgRpe, avgWellness / 20, false);
      
      console.log(`✅ Risk Score calculado: ${riskReport.score} (${riskReport.classification})`);
      if (riskReport.alerts.length > 0) {
        console.log(`   Alertas:`, riskReport.alerts);
      }
    } else {
      console.error("❌ Falha ao ler sessões ou wellness.");
    }
  } else {
    console.log("⚠️ Nenhum atleta encontrado para testar cálculo de risco.");
  }

  // 4. Test API Simulation (Mocking a save)
  console.log("\n-> 4. Testando inserção de novo registro (CRUD)...");
  const testId = 'test-' + Date.now();
  const { error: insError } = await supabase.from('registration_requests').insert({
    full_name: 'Usuário Teste Bot',
    email: `teste${Date.now()}@bot.com`,
    status: 'pendente',
    birth_date: '2000-01-01'
  });
  
  if (insError) {
    console.error("❌ Falha na inserção:", insError.message);
  } else {
    console.log("✅ Inserção de registro de solicitação OK.");
    // Cleanup
    await supabase.from('registration_requests').delete().like('full_name', 'Usuário Teste Bot');
    console.log("✅ Deleção (limpeza) OK.");
  }

  console.log("\n🔹 TESTES CONCLUÍDOS.");
}

runTests();
