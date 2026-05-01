
import { calculateACWR, calculateMonotony, calculateRiskScore, generateFullPlan } from '../lib/periodization-engine';
import { calculateForecast } from '../lib/forecast-engine';

/**
 * WMPS QA Stress Test & Logic Validation
 */

const testResults: any[] = [];

function logTest(category: string, name: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, data?: any) {
  testResults.push({ category, name, status, message, data });
  console.log(`[${status}] ${category} - ${name}: ${message}`);
}

async function runLogicTests() {
  console.log("--- INICIANDO TESTES DE LÓGICA MATEMÁTICA ---");

  // 1. ACWR Validation
  const normalSessions = Array.from({length: 28}, (_, i) => ({ date: `2024-01-${i+1}`, load: 500, rpe: 5, duration: 100 }));
  const acwrNormal = calculateACWR(normalSessions);
  logTest('LOGICA', 'ACWR Normal', acwrNormal.ratio === 1 ? 'PASS' : 'FAIL', `Ratio: ${acwrNormal.ratio}`);

  const spikeSessions = [...normalSessions, { date: '2024-01-29', load: 2000, rpe: 10, duration: 200 }];
  const acwrSpike = calculateACWR(spikeSessions);
  logTest('LOGICA', 'ACWR Spike', acwrSpike.ratio > 1.2 ? 'PASS' : 'FAIL', `Ratio: ${acwrSpike.ratio} (Detectou pico)`);

  // 2. Risk Score Engine
  const lowRisk = calculateRiskScore(1.0, 1.2, 3000, 12, 4, false);
  logTest('LOGICA', 'Risk Score Baixo', lowRisk.classification === 'Baixo' ? 'PASS' : 'FAIL', `Score: ${lowRisk.score}`);

  const criticalRisk = calculateRiskScore(1.8, 2.5, 9000, 18, 1, true);
  logTest('LOGICA', 'Risk Score Crítico', criticalRisk.classification === 'Crítico' ? 'PASS' : 'FAIL', `Score: ${criticalRisk.score}`);

  // 3. Forecast Engine
  const history = [
    { date: '2024-01-01', value: 80 },
    { date: '2024-01-15', value: 78 },
    { date: '2024-02-01', value: 76 }
  ];
  const forecast = calculateForecast(history, 70, true, 1.0, 100);
  logTest('LOGICA', 'Forecast Peso (Meta 70kg)', forecast.daysToGoal && forecast.daysToGoal > 0 ? 'PASS' : 'FAIL', `Dias: ${forecast.daysToGoal}, Data: ${forecast.estimatedDate}`);

  // 4. Edge Cases: Division by Zero / NaN
  const emptyHistory: any[] = [];
  const forecastEmpty = calculateForecast(emptyHistory, 70);
  logTest('EDGE_CASE', 'Forecast Histórico Vazio', forecastEmpty.currentValue === 0 ? 'PASS' : 'FAIL', "Não quebrou com array vazio");

  const zeroWellnessRisk = calculateRiskScore(0, 0, 0, 0, 0, false);
  logTest('EDGE_CASE', 'Risk Score Zero Inputs', !isNaN(zeroWellnessRisk.score) ? 'PASS' : 'FAIL', `Score: ${zeroWellnessRisk.score}`);
}

async function runStressTests() {
  console.log("\n--- INICIANDO TESTES DE STRESS (SIMULAÇÃO) ---");
  
  // Simulating 1000 athletes calculation
  const start = Date.now();
  for (let i = 0; i < 1000; i++) {
    calculateRiskScore(Math.random() * 2, Math.random() * 3, Math.random() * 10000, 15, 3, i % 10 === 0);
  }
  const end = Date.now();
  logTest('STRESS', '1000 Risk Score Calcs', (end - start) < 100 ? 'PASS' : 'WARN', `Tempo: ${end - start}ms`);
}

async function runPhysiologicalValidation() {
  console.log("\n--- VALIDANDO COERÊNCIA FISIOLÓGICA ---");

  // Sprint Time (Lower is better)
  const sprintHistory = [
    { date: '2024-01-01', value: 12.5 },
    { date: '2024-01-15', value: 12.2 }
  ];
  const sprintForecast = calculateForecast(sprintHistory, 11.5, true);
  logTest('FISIO', 'Sprint Forecast (Melhora)', sprintForecast.rateOfChange < 0 ? 'PASS' : 'FAIL', `Rate: ${sprintForecast.rateOfChange} (Negativo = mais rápido)`);

  // Injury Simulation
  const postInjuryRisk = calculateRiskScore(2.5, 3.0, 12000, 20, 1, true);
  const hasUrgentAlert = postInjuryRisk.alerts.some(a => a.includes('🚨'));
  logTest('FISIO', 'Detecção de Lesão Iminente', hasUrgentAlert ? 'PASS' : 'FAIL', "Gerou alertas críticos para carga extrema");
}

async function main() {
  await runLogicTests();
  await runStressTests();
  await runPhysiologicalValidation();

  console.log("\n--- RELATÓRIO FINAL DE QA ---");
  const fails = testResults.filter(r => r.status === 'FAIL');
  if (fails.length === 0) {
    console.log("✅ TUDO OK: O sistema WMPS passou em todos os testes de lógica e stress.");
  } else {
    console.log(`❌ FALHAS DETECTADAS: ${fails.length}`);
    fails.forEach(f => console.log(`- ${f.category}: ${f.name} -> ${f.message}`));
  }
}

main();
