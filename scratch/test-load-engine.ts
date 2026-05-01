
import { calculateACWR } from '../lib/periodization-engine';

const mockSessions = [];
const now = new Date();

// Simulação de 28 dias
for (let i = 27; i >= 0; i--) {
  const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
  
  // Primeiros 21 dias: Carga Estável (60 min @ PSE 5 = 300 UA)
  let load = 300;
  let rpe = 5;
  let duration = 60;

  // Últimos 7 dias: Pico de Carga (90 min @ PSE 8 = 720 UA)
  if (i < 7) {
    rpe = 8;
    duration = 90;
    load = 720;
  }

  mockSessions.push({
    id: `s-${i}`,
    athlete_id: 'test-athlete',
    date: date.toISOString(),
    rpe,
    duration,
    load,
    distance: 5000,
    volume: 2000,
    series: 10,
    reps: 100
  });
}

const result = calculateACWR(mockSessions as any);
console.log('--- RELATÓRIO DE SIMULAÇÃO ACWR ---');
console.log('Atleta: Simulação de Overreaching');
console.log(`Ratio Calculado: ${result.ratio}`);
console.log(`Status: ${result.status.toUpperCase()}`);
console.log(`Mensagem: ${result.message}`);

// Verificação Matemática
const acuteSum = 720 * 7;
const chronicSum = (300 * 21) + (720 * 7);
const acuteAvg = acuteSum / 7;
const chronicAvg = chronicSum / 28;
const manualRatio = acuteAvg / chronicAvg;

console.log(`\nValidação Manual:`);
console.log(`Soma Aguda: ${acuteSum} UA`);
console.log(`Soma Crônica: ${chronicSum} UA`);
console.log(`Média Aguda: ${acuteAvg} UA`);
console.log(`Média Crônica: ${chronicAvg.toFixed(2)} UA`);
console.log(`Ratio Manual: ${manualRatio.toFixed(2)}`);
