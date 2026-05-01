
// Simulação Manual da Lógica do Periodization Engine
function calculateACWR(sessions) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  const acuteSessions = sessions.filter(s => new Date(s.date) >= sevenDaysAgo);
  const chronicSessions = sessions.filter(s => new Date(s.date) >= twentyEightDaysAgo);

  const acuteLoad = acuteSessions.reduce((acc, s) => acc + (s.rpe * s.duration), 0) / 7;
  const chronicLoad = chronicSessions.reduce((acc, s) => acc + (s.rpe * s.duration), 0) / 28;

  if (chronicLoad === 0) return { ratio: 0, status: 'low' };

  const ratio = Number((acuteLoad / chronicLoad).toFixed(2));
  let status = 'optimal';
  if (ratio > 1.5) status = 'high';
  else if (ratio < 0.8) status = 'low';

  return { ratio, status, acuteLoad, chronicLoad };
}

const mockSessions = [];
const now = new Date();

// Simulação de 28 dias
for (let i = 27; i >= 0; i--) {
  const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
  let rpe = 5; let duration = 60; // 300 UA base
  if (i < 7) { rpe = 8; duration = 90; } // 720 UA pico

  mockSessions.push({ date: date.toISOString(), rpe, duration });
}

const result = calculateACWR(mockSessions);
console.log('--- RELATÓRIO TÉCNICO DE MONITORAMENTO ---');
console.log(`Carga Aguda (7d): ${result.acuteLoad.toFixed(1)} UA`);
console.log(`Carga Crônica (28d): ${result.chronicLoad.toFixed(1)} UA`);
console.log(`ACWR Ratio: ${result.ratio}`);
console.log(`Status Fisiológico: ${result.status.toUpperCase()}`);

if (result.ratio > 1.5) {
    console.log('CONCLUSAO: Sistema detectou corretamente o risco de sobrecarga (> 1.5).');
} else {
    console.log('CONCLUSAO: Resultado inconsistente com o esperado para o pico de carga.');
}
