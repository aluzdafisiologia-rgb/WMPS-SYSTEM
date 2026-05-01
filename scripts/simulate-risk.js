// Script de simulação de sobrecarga - versão JavaScript puro (sem TypeScript)
const { createClient } = require('@supabase/supabase-js');
const { subDays, format } = require('date-fns');
const fs = require('fs');
const path = require('path');

// Ler .env.local manualmente
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) envVars[key.trim()] = rest.join('=').trim();
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'] || '';
const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Variáveis de ambiente não encontradas! Verifique o .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function simulate() {
  console.log('\n🏋️  WMPS Risk Simulator - Cenário: SOBRECARGA CRÍTICA');
  console.log('='.repeat(60));

  const { data: athletes, error: errAthletes } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'athlete')
    .limit(1);

  if (errAthletes || !athletes || athletes.length === 0) {
    console.error('❌ Nenhum atleta encontrado no banco. Cadastre um atleta primeiro.');
    console.error(errAthletes?.message);
    return;
  }

  const athlete = athletes[0];
  console.log(`✅ Atleta selecionado: ${athlete.full_name}`);
  console.log(`   ID: ${athlete.id}`);
  console.log('');

  // Limpar dados antigos do atleta
  console.log('🗑️  Limpando histórico anterior...');
  await supabase.from('sessions').delete().eq('athlete_id', athlete.id);
  await supabase.from('wellness').delete().eq('athlete_id', athlete.id);

  const sessionsToInsert = [];
  const wellnessToInsert = [];

  const today = new Date();
  const athleteName = athlete.full_name;

  // === SEMANAS 1-3: Carga crônica moderada ===
  const moderateDays = [1, 2, 3, 4, 5];
  for (let weekBack = 3; weekBack >= 1; weekBack--) {
    for (const dayOfWeek of moderateDays) {
      const daysBack = (weekBack * 7) - dayOfWeek + 1;
      const date = subDays(today, daysBack);
      sessionsToInsert.push({
        athlete_id: athlete.id,
        athlete_name: athleteName,
        date: format(date, 'yyyy-MM-dd'),
        rpe: 10,
        duration: 60,
        load: 10 * 60,
        series: 12,
        reps: 120,
        volume: 3000,
        distance: 5
      });
      wellnessToInsert.push({
        athlete_id: athlete.id,
        athlete_name: athleteName,
        date: format(date, 'yyyy-MM-dd'),
        sleep: 4,
        stress: 4,
        fatigue: 4,
        soreness: 4
      });
    }
  }

  // === SEMANA 4 (ATUAL): Spike de Carga Extremo ===
  console.log('⚠️  Injetando semana de SOBRECARGA EXTREMA (últimos 7 dias)...');
  for (let i = 6; i >= 0; i--) {
    const date = subDays(today, i);
    const dateStr = format(date, 'yyyy-MM-dd');

    sessionsToInsert.push({
      athlete_id: athlete.id,
      athlete_name: athleteName,
      date: dateStr,
      rpe: 19,
      duration: 120,
      load: 19 * 120,
      series: 30,
      reps: 300,
      volume: 9000,
      distance: 15
    });

    wellnessToInsert.push({
      athlete_id: athlete.id,
      athlete_name: athleteName,
      date: dateStr,
      sleep: 1,
      stress: 1,
      fatigue: 1,
      soreness: 1
    });
  }

  // Inserir tudo
  console.log(`📝 Inserindo ${sessionsToInsert.length} sessões de treino...`);
  const { error: sErr } = await supabase.from('sessions').insert(sessionsToInsert);
  if (sErr) {
    console.error('❌ Erro ao inserir sessões:', sErr.message);
    return;
  }

  console.log(`📝 Inserindo ${wellnessToInsert.length} registros de wellness...`);
  const { error: wErr } = await supabase.from('wellness').insert(wellnessToInsert);
  if (wErr) {
    console.error('❌ Erro ao inserir wellness:', wErr.message);
    return;
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('✅ SIMULAÇÃO COMPLETA!');
  console.log('');
  console.log('📊 Cenário criado:');
  console.log('   • Semanas 1-3: Carga crônica moderada (RPE 10, 60min/dia, 5x/sem)');
  console.log('   • Semana 4:    SPIKE CRÍTICO (RPE 19, 120min/dia, 7x/sem)');
  console.log('   • ACWR esperado: ~7.6x (ZONA DE PERIGO MÁXIMA)');
  console.log('   • Wellness: 1/5 em todas as dimensões (pior possível)');
  console.log('');
  console.log('🔴 Abra o Painel do Coach → clique no atleta → veja o Risk Score!');
  console.log(`   Atleta: ${athlete.full_name}`);
}

simulate().catch(console.error);
