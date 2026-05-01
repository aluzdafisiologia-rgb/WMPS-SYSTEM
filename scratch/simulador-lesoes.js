const fs = require('fs');

// --- WMPS ENGINE LOGIC (Mocked) ---
function calculateEWMA(currentLoad, previousEWMA, days) {
  const lambda = 2 / (days + 1);
  return currentLoad * lambda + previousEWMA * (1 - lambda);
}

function processDay(session, state) {
  const load = session.load;
  state.acuteEWMA = calculateEWMA(load, state.acuteEWMA, 7);
  state.chronicEWMA = calculateEWMA(load, state.chronicEWMA, 28);
  state.ratio = state.chronicEWMA > 0 ? Number((state.acuteEWMA / state.chronicEWMA).toFixed(2)) : 0;
  
  state.recentRPEs.push(session.rpe);
  if (state.recentRPEs.length > 3) state.recentRPEs.shift();
  const consecutiveHighRpe = state.recentRPEs.length === 3 && state.recentRPEs.every(r => r >= 8);

  let riskLevel = 'low';
  let message = 'Estável';
  let action = 'Manter plano';

  if (state.ratio > 1.5) {
    riskLevel = 'high'; message = 'ACWR EXPLOSIVO'; action = 'Redução imediata de 40% no volume';
  } else if (consecutiveHighRpe) {
    riskLevel = 'high'; message = 'FADIGA AGUDA'; action = 'Inserir dia de recuperação total';
  } else if (state.ratio > 1.3 || session.wellness < 4) {
    riskLevel = 'medium'; message = 'ATENÇÃO CARGA'; action = 'Monitorar próxima sessão';
  } else if (state.ratio > 0 && state.ratio < 0.8 && !session.isRTP) {
    riskLevel = 'medium'; message = 'SUB-ESTÍMULO'; action = 'Aumentar carga progressivamente';
  }

  if (riskLevel !== 'low') {
    state.alerts.push({ day: session.day, week: session.week, message, action, ratio: state.ratio, rpe: session.rpe, phase: session.phase });
  }
}

// --- ATHLETES DEFINITION ---
const athletes = [
  { 
    id: 1, name: 'Atleta 1 (Velocista)', baseLoad: 300, baseRPE: 6,
    injuryType: 'Posterior de Coxa (Grau 2)', injuryWeek: 6
  },
  { 
    id: 2, name: 'Atleta 2 (Futebol)', baseLoad: 500, baseRPE: 7,
    injuryType: 'Ruptura LCA', injuryWeek: 8
  },
  { 
    id: 3, name: 'Atleta 3 (Musculação)', baseLoad: 400, baseRPE: 6,
    injuryType: 'Estiramento Lombar', injuryWeek: 10
  }
];

// --- SIMULATION (16 Weeks / 112 Days) ---
const report = {};

athletes.forEach(athlete => {
  const state = { acuteEWMA: athlete.baseLoad, chronicEWMA: athlete.baseLoad, recentRPEs: [], alerts: [] };
  const history = [];
  let isInjured = false;
  let rtpPhase = 0; // 0: healthy, 1: acute, 2: functional, 3: reconditioning, 4: return, 5: performance

  for (let day = 1; day <= 112; day++) {
    const week = Math.ceil(day / 7);
    const isRestDay = day % 7 === 0;
    
    let dailyLoad = isRestDay ? 0 : athlete.baseLoad;
    let rpe = isRestDay ? 0 : athlete.baseRPE;
    let wellness = isRestDay ? 8 : 7;
    let phaseDesc = "Treinamento Normal";
    let isRTP = false;

    // --- PRE-INJURY OVERLOAD LOGIC ---
    if (!isInjured && week === athlete.injuryWeek - 2 && !isRestDay) {
      // Semana -2: Acúmulo de fadiga (RPE sobe, wellness cai)
      rpe += 2; wellness -= 2; dailyLoad *= 1.4;
      phaseDesc = "Sobrecarga Inicial";
    }
    
    if (!isInjured && week === athlete.injuryWeek - 1 && !isRestDay) {
      // Semana -1: Spike massivo (ACWR > 1.5 induzido)
      dailyLoad *= 1.8; rpe = 9; wellness = 3;
      phaseDesc = "Pico de Risco (Spike)";
    }

    if (!isInjured && week === athlete.injuryWeek && day % 7 === 3) {
      // EVENTO DE LESÃO (Quarta-feira da semana crítica)
      isInjured = true;
      rtpPhase = 1;
      dailyLoad = 0; rpe = 10; wellness = 1;
      phaseDesc = `EVENTO: ${athlete.injuryType}`;
    }

    // --- POST-INJURY RTP LOGIC ---
    if (isInjured && day % 7 !== 3) {
      isRTP = true;
      const weeksPostInjury = week - athlete.injuryWeek;

      if (athlete.injuryType === 'Ruptura LCA') {
        // LCA: RTP muito longo (Meses)
        if (weeksPostInjury < 4) { rtpPhase = 1; dailyLoad = 0; rpe = 0; phaseDesc = "Pós-Cirúrgico (Repouso)"; }
        else if (weeksPostInjury < 8) { rtpPhase = 2; dailyLoad = athlete.baseLoad * 0.2; rpe = 3; phaseDesc = "Fisioterapia (Fase 1)"; }
        else { rtpPhase = 3; dailyLoad = athlete.baseLoad * 0.4; rpe = 5; phaseDesc = "Recondicionamento Base"; }
      } 
      else if (athlete.injuryType === 'Posterior de Coxa (Grau 2)') {
        // Posterior de Coxa: RTP médio (4-6 semanas)
        if (weeksPostInjury < 2) { rtpPhase = 1; dailyLoad = athlete.baseLoad * 0.1; rpe = 2; phaseDesc = "Fase Aguda (Gelo/Isometria)"; }
        else if (weeksPostInjury < 4) { rtpPhase = 2; dailyLoad = athlete.baseLoad * 0.4; rpe = 5; phaseDesc = "Força Excêntrica Leve"; }
        else if (weeksPostInjury < 5) { rtpPhase = 4; dailyLoad = athlete.baseLoad * 0.7; rpe = 6; phaseDesc = "Retorno ao Treino (RTP)"; }
        else { rtpPhase = 5; dailyLoad = athlete.baseLoad * 0.9; rpe = 7; phaseDesc = "Retorno à Performance (RTPer)"; isInjured = false; }
      }
      else {
        // Lombalgia: RTP curto (2-3 semanas)
        if (weeksPostInjury < 1) { rtpPhase = 1; dailyLoad = 0; rpe = 0; phaseDesc = "Repouso Absoluto"; }
        else if (weeksPostInjury < 2) { rtpPhase = 2; dailyLoad = athlete.baseLoad * 0.5; rpe = 4; phaseDesc = "Mobilidade/Core"; }
        else { rtpPhase = 5; dailyLoad = athlete.baseLoad * 0.9; rpe = 6; phaseDesc = "RTP"; isInjured = false; }
      }
    }

    if (!isRestDay && !isInjured && rtpPhase === 0) {
      dailyLoad += (Math.random() * 40 - 20); // Ruído normal
    }

    const session = { day, week, rpe, load: dailyLoad, wellness, phase: phaseDesc, isRTP };
    processDay(session, state);
    
    // Salvar hitórico da lesão/pré-lesão para o relatório
    if (week >= athlete.injuryWeek - 2 && week <= athlete.injuryWeek + 2 && day % 7 === 3) {
      history.push({ week, phase: phaseDesc, ratio: state.ratio, load: Math.round(dailyLoad) });
    }
  }

  report[athlete.name] = {
    history,
    alerts: state.alerts,
    injuryWeek: athlete.injuryWeek
  };
});

// Output Summary
Object.keys(report).forEach(name => {
  const data = report[name];
  console.log(`\n========================================================`);
  console.log(`🚑 ${name.toUpperCase()}`);
  console.log(`========================================================`);
  
  console.log(`\n📅 LINHA DO TEMPO CRÍTICA (-2 sem até +2 sem da lesão):`);
  data.history.forEach(h => {
    console.log(`  Semana ${h.week} | ACWR: ${h.ratio.toFixed(2)} | Carga: ${h.load} | ${h.phase}`);
  });

  const preInjuryAlerts = data.alerts.filter(a => a.week < data.injuryWeek && a.message !== 'SUB-ESTÍMULO');
  console.log(`\n🚨 ALERTAS GERADOS *ANTES* DA LESÃO: ${preInjuryAlerts.length}`);
  const uniquePreAlerts = [...new Set(preInjuryAlerts.map(a => `  [Semana ${a.week}] ${a.message} (ACWR: ${a.ratio}) -> WMPS Sugeriu: ${a.action}`))];
  uniquePreAlerts.slice(0, 3).forEach(a => console.log(a));
});
