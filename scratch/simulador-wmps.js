const fs = require('fs');

// --- WMPS ENGINE LOGIC (Mocked from lib/periodization-engine.ts) ---
function calculateEWMA(currentLoad, previousEWMA, days) {
  const lambda = 2 / (days + 1);
  return currentLoad * lambda + previousEWMA * (1 - lambda);
}

function processDay(session, state) {
  const load = session.load; // RPE * Duration
  state.acuteEWMA = calculateEWMA(load, state.acuteEWMA, 7);
  state.chronicEWMA = calculateEWMA(load, state.chronicEWMA, 28);
  state.ratio = state.chronicEWMA > 0 ? Number((state.acuteEWMA / state.chronicEWMA).toFixed(2)) : 0;
  
  // Track consecutive high RPE
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
  } else if (state.ratio > 1.3 || session.wellness < 5) { // wellness 1-10
    riskLevel = 'medium'; message = 'ATENÇÃO CARGA'; action = 'Monitorar próxima sessão';
  } else if (state.ratio > 0 && state.ratio < 0.8) {
    riskLevel = 'medium'; message = 'SUB-ESTÍMULO'; action = 'Aumentar carga progressivamente';
  }

  if (riskLevel !== 'low') {
    state.alerts.push({ day: session.day, week: session.week, message, action, ratio: state.ratio, rpe: session.rpe });
  }
}

// --- ATHLETES DEFINITION ---
const athletes = [
  { id: 1, name: 'Atleta 1 (Iniciante)', type: 'linear', baseLoad: 200, baseRPE: 4, goal: 'Hipertrofia' },
  { id: 2, name: 'Atleta 2 (Intermediário)', type: 'ondulatory', baseLoad: 400, baseRPE: 6, goal: 'Força+Hipertrofia' },
  { id: 3, name: 'Atleta 3 (Avançado)', type: 'tapering', baseLoad: 600, baseRPE: 7, goal: 'Potência' },
  { id: 4, name: 'Atleta 4 (Alto Risco)', type: 'overload', baseLoad: 500, baseRPE: 6, goal: 'Hipertrofia' },
  { id: 5, name: 'Atleta 5 (Jovem)', type: 'high_adaptation', baseLoad: 300, baseRPE: 5, goal: 'Velocidade' }
];

// --- SIMULATION (12 Weeks / 84 Days) ---
const report = {};

athletes.forEach(athlete => {
  const state = { acuteEWMA: athlete.baseLoad, chronicEWMA: athlete.baseLoad, recentRPEs: [], alerts: [] };
  const history = [];

  for (let day = 1; day <= 84; day++) {
    const week = Math.ceil(day / 7);
    const isRestDay = day % 7 === 0; // Domingo descanso
    
    let dailyLoad = isRestDay ? 0 : athlete.baseLoad;
    let rpe = isRestDay ? 0 : athlete.baseRPE;
    let wellness = isRestDay ? 8 : 7; // Escala 1-10

    // APLLY SCENARIOS (Mesocycle structures)
    // 3:1 Loading Paradigm (Weeks 4, 8, 12 are Deload)
    const isDeload = week === 4 || week === 8;
    
    if (isDeload && !isRestDay) {
      dailyLoad *= 0.6; // 40% reduction
      rpe = Math.max(3, rpe - 2);
    } else if (week % 4 === 3 && !isRestDay) { // Shock week (Week 3, 7, 11)
      dailyLoad *= 1.3;
      rpe = Math.min(10, rpe + 2);
    }

    // SPECIFIC SCENARIOS
    if (athlete.type === 'overload' && week === 6 && !isRestDay) {
      // Cenário 1: Aumento brusco
      dailyLoad *= 2.0; 
      rpe = 9;
      wellness = 3; // Baixa recup
    }

    if (athlete.type === 'overload' && week === 7 && day <= 45 && !isRestDay) {
      // Cenário 3: PSE elevado por vários dias
      rpe = 9;
      dailyLoad = athlete.baseLoad; // Carga normal, mas RPE alto (fadiga central)
    }

    if (athlete.type === 'tapering' && week >= 11 && !isRestDay) {
      // Cenário 6: Pico de performance (Tapering)
      dailyLoad *= 0.5; // Volume despenca
      rpe = 8; // Intensidade alta mantida
    }

    if (athlete.type === 'high_adaptation' && week >= 5 && !isRestDay) {
      // Assimila rápido, load sobe sem afetar rpe
      dailyLoad *= 1.2;
    }

    // Add noise (variability)
    if (!isRestDay) {
      dailyLoad += (Math.random() * 50 - 25);
    }

    const session = { day, week, duration: dailyLoad / (rpe || 1), rpe, load: dailyLoad, wellness };
    processDay(session, state);
    history.push({ day, load: dailyLoad, ratio: state.ratio, rpe });
  }

  report[athlete.name] = {
    history,
    alerts: state.alerts,
    finalEWMA: state.chronicEWMA
  };
});

// Output Summary
Object.keys(report).forEach(name => {
  console.log(`\n========================================`);
  console.log(`🏆 ${name.toUpperCase()}`);
  console.log(`========================================`);
  
  const alerts = report[name].alerts;
  const highRisk = alerts.filter(a => a.message === 'ACWR EXPLOSIVO').length;
  const fatigue = alerts.filter(a => a.message === 'FADIGA AGUDA').length;
  const under = alerts.filter(a => a.message === 'SUB-ESTÍMULO').length;

  console.log(`📊 Ocorrências: ${highRisk}x Danger Zone | ${fatigue}x Fadiga | ${under}x Under-training`);
  
  if (alerts.length > 0) {
    console.log(`🚨 Principais Alertas Gerados:`);
    // Print unique alerts
    const uniqueAlerts = [...new Set(alerts.map(a => `[Semana ${a.week}] ${a.message} (Ratio: ${a.ratio}) -> Ação: ${a.action}`))];
    uniqueAlerts.slice(0, 4).forEach(a => console.log(`   - ${a}`));
  } else {
    console.log(`✅ Nenhum alerta crítico. Planejamento perfeitamente assimilado.`);
  }
});
