import { createClient } from '@supabase/supabase-js';
import { addDays, subDays, format } from 'date-fns';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function simulate() {
  console.log('Iniciando simulação de Sobrecarga (Risco Crítico)...');

  // 1. Pegar qualquer atleta ativo
  const { data: athletes, error: errAthletes } = await supabase.from('profiles').select('*').eq('role', 'athlete').limit(1);
  
  if (errAthletes || !athletes || athletes.length === 0) {
    console.error('Nenhum atleta encontrado para simular.');
    return;
  }
  
  const athlete = athletes[0];
  console.log(`Atleta selecionado: ${athlete.full_name} (${athlete.id})`);

  // Vamos apagar sessões recentes desse atleta para não misturar os cálculos
  await supabase.from('sessions').delete().eq('athlete_id', athlete.id);
  await supabase.from('wellness').delete().eq('athlete_id', athlete.id);

  // 2. Simular as últimas 4 semanas de treinos (para o motor calcular o ACWR Crônico)
  const sessionsToInsert = [];
  const wellnessToInsert = [];
  
  for (let i = 28; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Até 7 dias atrás (Crônico) -> Carga baixa
    if (i > 7) {
      if (i % 2 === 0) { // Treina dia sim, dia não
        sessionsToInsert.push({
          athlete_id: athlete.id,
          date: dateStr,
          rpe: 5,
          duration: 60,
          load: 300,
          series: 10,
          reps: 100,
          volume: 2000,
          distance: 0
        });
      }
    } else {
      // Semana Atual (Agudo) -> Spike Absurdo
      sessionsToInsert.push({
        athlete_id: athlete.id,
        date: dateStr,
        rpe: 19,
        duration: 120,
        load: 19 * 120,
        series: 30,
        reps: 300,
        volume: 8000,
        distance: 0
      });

      // E inserir dados de Wellness péssimos para esses últimos 7 dias
      wellnessToInsert.push({
        athlete_id: athlete.id,
        date: dateStr,
        sleep: 1,
        stress: 2,
        fatigue: 1,
        soreness: 1
      });
    }
  }

  const { error: sErr } = await supabase.from('sessions').insert(sessionsToInsert);
  const { error: wErr } = await supabase.from('wellness').insert(wellnessToInsert);

  if (sErr) console.error('Erro ao inserir sessões:', sErr);
  if (wErr) console.error('Erro ao inserir wellness:', wErr);

  console.log(`Simulação completa! Foram inseridas ${sessionsToInsert.length} sessões e ${wellnessToInsert.length} dias de wellness.`);
  console.log('Abra o Painel do Coach e veja o prontuário deste atleta.');
}

simulate();
