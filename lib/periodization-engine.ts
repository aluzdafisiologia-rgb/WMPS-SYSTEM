
import { Session, WellnessEntry } from './db';

/**
 * William Moreira Performance System (WMPS)
 * Periodization Engine - Scientific Core
 */

export interface PeriodizationConfig {
  goal: string[];
  durationWeeks: number;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'pro';
  baseVolume: number; // reference volume (100%)
}

export interface TrainingZone {
  name: string;
  minIntensity: number;
  maxIntensity: number;
  description: string;
}

export function generateFullPlan(athlete: any, goals: string[], durationWeeks: number, intensityMeta: number) {
  const plan = [];
  const phases = durationWeeks <= 8 ? ['Preparatória', 'Competitiva'] : ['Geral', 'Específica', 'Competitiva', 'Transição'];
  
  for (let w = 1; w <= durationWeeks; w++) {
    const progressFactor = w / durationWeeks;
    let type: 'Ordinário' | 'Choque' | 'Recuperação' | 'Tapering' = 'Ordinário';
    let intensity = 60 + (intensityMeta * progressFactor);
    let volume = 80;
    let method = 'Método de Repetições';

    // Lógica de Ondulação (3:1 ou 2:1)
    if (w % 4 === 0) {
      type = 'Recuperação';
      intensity *= 0.7;
      volume = 40;
      method = 'Recuperação Ativa';
    } else if (w % 3 === 0 && progressFactor > 0.4) {
      type = 'Choque';
      intensity *= 1.2;
      volume = 100;
      method = goals.includes('strength') ? 'Método de Esforço Máximo' : 'Método de Esforço Repetido';
    }

    // Tapering nas últimas 2 semanas
    if (w > durationWeeks - 2) {
      type = 'Tapering';
      intensity = 90; // Intensidade alta
      volume = 40; // Volume baixo (supercompensação)
      method = 'Específico / Polimento';
    }

    // Sugestão de Exercícios baseada no Objetivo
    const suggestions = [];
    if (goals.includes('hypertrophy')) suggestions.push('Exercícios Multiarticulares (6–12 reps, 70–85% 1RM)', 'Exercícios Monoarticulares (12–15 reps, 65–75% 1RM)');
    if (goals.includes('strength')) suggestions.push('Exercícios Básicos / Força Máxima (1–5 reps, >85% 1RM)', 'Cluster Sets / Método de Esforço Máximo');
    if (goals.includes('power')) suggestions.push('Pliometria (CEA — Ciclo Alongamento-Encurtamento)', 'Derivados de Levantamento Olímpico (30–60% 1RM, alta RFD)');
    if (goals.includes('endurance')) suggestions.push('HIIT (≥85% vVO₂máx, densidade 1:1–1:2)', 'Método Contínuo Extensivo (65–75% FC máx, >20 min)');
    if (goals.includes('body_composition')) suggestions.push('Método de Repetições Elevadas (15–20 reps, alta densidade)', 'Combinação Aeróbico + Resistência (HIIT + Força Moderada)');

    plan.push({
      week: w,
      phase: phases[Math.floor(progressFactor * (phases.length - 1))],
      type,
      intensity: Math.min(Math.round(intensity), 100),
      volume,
      method,
      suggestions
    });
  }

  return plan;
}

export const STRENGTH_ZONES: TrainingZone[] = [
  {
    name: 'Resistência Muscular Local (Anaeróbica)',
    minIntensity: 50,
    maxIntensity: 70,
    description: 'Tolerância ao acúmulo lático — alto volume (≥15 reps), densid. 1:1. Predominância glicolítica.'
  },
  {
    name: 'Zona de Tensão Mecânica (Hipertrofia Miofibrilar/Sarcoplasmática)',
    minIntensity: 70,
    maxIntensity: 85,
    description: 'Estresse mecânico e metabólico para adaptações hipertróficas (6–12 reps, Schoenfeld 2010).'
  },
  {
    name: 'Força Máxima (Recrutamento Neuromuscular)',
    minIntensity: 85,
    maxIntensity: 100,
    description: 'Recrutamento máximo de unidades motoras e sincronização intramuscular (1–5 reps, NSCA).'
  },
  {
    name: 'Potência / RFD (Fosfagênio — ATP-CP)',
    minIntensity: 30,
    maxIntensity: 60,
    description: 'Maximização da Taxa de Desenvolvimento de Força (RFD) e potência de pico (W) — alta velocidade de execução.'
  },
];

/**
 * Calculates Training Impulse (TRIMP) based on Banister's equation
 * deltaHR = (HR_avg - HR_rest) / (HR_max - HR_rest)
 */
export function calculateTRIMP(duration: number, avgHR: number, restHR: number, maxHR: number, gender: 'male' | 'female' = 'male'): number {
  if (!avgHR || !restHR || !maxHR) return 0;
  
  const deltaHR = (avgHR - restHR) / (maxHR - restHR);
  const factor = gender === 'male' ? 0.64 : 0.86;
  const exponent = gender === 'male' ? 1.92 : 1.67;
  
  return duration * deltaHR * factor * Math.exp(exponent * deltaHR);
}

/**
 * Calculates Exponentially Weighted Moving Average (EWMA)
 * lambda = 2 / (N + 1)
 */
export function calculateEWMA(currentLoad: number, previousEWMA: number, days: number): number {
  const lambda = 2 / (days + 1);
  return currentLoad * lambda + previousEWMA * (1 - lambda);
}

/**
 * Calculates ACWR using EWMA model (More sensitive to recent spikes)
 */
export function calculateACWR(sessions: Session[]): { ratio: number; status: 'low' | 'optimal' | 'high'; message: string; acuteEWMA: number; chronicEWMA: number } {
  // Sort sessions by date
  const sortedSessions = [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  let acuteEWMA = sortedSessions.length > 0 ? (sortedSessions[0].load || (sortedSessions[0].rpe * sortedSessions[0].duration) || 0) : 0;
  let chronicEWMA = acuteEWMA;

  sortedSessions.forEach((session, index) => {
    if (index === 0) return; // Skip first as it's the baseline
    const load = session.load || (session.rpe * session.duration) || 0;
    acuteEWMA = calculateEWMA(load, acuteEWMA, 7);
    chronicEWMA = calculateEWMA(load, chronicEWMA, 28);
  });

  if (chronicEWMA === 0) return { ratio: 0, status: 'low', message: 'Dados insuficientes.', acuteEWMA: 0, chronicEWMA: 0 };

  const ratio = Number((acuteEWMA / chronicEWMA).toFixed(2));
  let status: 'low' | 'optimal' | 'high' = 'optimal';
  let message = 'Zona de Sobrecarga Funcional (ACWR 0.8–1.3) — Adaptação Ótima';

  if (ratio > 1.5) {
    status = 'high';
    message = 'Zona de Alto Risco (ACWR >1.5) — Sobrecarga Aguda Não Funcional';
  } else if (ratio < 0.8) {
    status = 'low';
    message = 'Síndrome de Subtreinamento (ACWR <0.8) — Destreinamento Progressivo';
  }

  return { ratio, status, message, acuteEWMA, chronicEWMA };
}

/**
 * Calculates Training Monotony (Standard Deviation of Load)
 * monotony = average_daily_load / standard_deviation
 */
export function calculateMonotony(sessions: Session[]): number {
  if (sessions.length < 7) return 0;
  const loads = sessions.slice(0, 7).map(s => s.load || (s.rpe * s.duration));
  const avg = loads.reduce((a, b) => a + b, 0) / 7;
  const stdDev = Math.sqrt(loads.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / 7);
  return stdDev === 0 ? 0 : Number((avg / stdDev).toFixed(2));
}

export interface RiskReport {
  score: number;
  classification: 'Baixo' | 'Moderado' | 'Alto' | 'Crítico';
  alerts: string[];
  suggestions: string[];
  breakdown: {
    acwrScore: number;
    monotonyScore: number;
    strainScore: number;
    fatigueScore: number;
    performanceScore: number;
  }
}

/**
 * Advanced Injury Risk Score Engine
 * Combines 5 variables into a 0-100 score using weighted algorithms and intelligent thresholds.
 */
export function calculateRiskScore(
  acwrRatio: number,
  monotony: number,
  strain: number,
  avgRpe: number, // 6-20
  avgWellness: number, // 1-5 (lower is worse)
  performanceDropFlag: boolean
): RiskReport {
  // 1. ACWR (30% weight) -> Convert ratio to a 0-100 danger scale
  let acwrDanger = 0;
  if (acwrRatio > 1.5) acwrDanger = 80 + (acwrRatio - 1.5) * 40;
  else if (acwrRatio > 1.3) acwrDanger = 50 + (acwrRatio - 1.3) * 150;
  else if (acwrRatio < 0.8) acwrDanger = 60; // Under-training risk
  else acwrDanger = 10;
  acwrDanger = Math.min(100, Math.max(0, acwrDanger));

  // 2. Monotony (20% weight) -> Normal < 1.5, High > 2.0
  let monotonyDanger = 0;
  if (monotony > 2.0) monotonyDanger = 80 + (monotony - 2.0) * 40;
  else if (monotony > 1.5) monotonyDanger = 40 + (monotony - 1.5) * 80;
  else monotonyDanger = 10;
  monotonyDanger = Math.min(100, Math.max(0, monotonyDanger));

  // 3. Strain (20% weight) -> High strain usually > 6000
  let strainDanger = (strain / 8000) * 100; 
  strainDanger = Math.min(100, Math.max(0, strainDanger));

  // 4. Fatigue (15% weight) -> High RPE (8-10) + Bad Wellness (1-2)
  const rpeFactor = ((Math.max(1, Math.min(10, avgRpe)) - 1) / 9) * 100;
  const wellnessFactor = ((5 - Math.max(1, Math.min(5, avgWellness))) / 4) * 100;
  let fatigueDanger = (rpeFactor * 0.5) + (wellnessFactor * 0.5);
  fatigueDanger = Math.min(100, Math.max(0, fatigueDanger));

  // 5. Performance Drop (15% weight)
  let performanceDanger = performanceDropFlag ? 100 : 0;

  // INTELLIGENT RULES (Context Awareness)
  if (acwrRatio > 1.5 && fatigueDanger > 75) {
    acwrDanger = 100; 
    fatigueDanger = 100;
  }
  if (monotony > 2.0 && strainDanger > 70) {
    monotonyDanger = 100;
    strainDanger = 100;
  }

  // Calculate Weighted Score
  const score = Math.round(
    (acwrDanger * 0.30) +
    (monotonyDanger * 0.20) +
    (strainDanger * 0.20) +
    (fatigueDanger * 0.15) +
    (performanceDanger * 0.15)
  );

  // Classify Risk
  let classification: RiskReport['classification'] = 'Baixo';
  if (score >= 80) classification = 'Crítico';
  else if (score >= 60) classification = 'Alto';
  else if (score >= 40) classification = 'Moderado';

  // Generate Automated Alerts & Suggestions
  const alerts: string[] = [];
  const suggestions: string[] = [];

  if (acwrDanger >= 80) {
    alerts.push('🚨 Alerta Crítico: ACWR (>1.5). Pico massivo de carga aguda detectado.');
    suggestions.push('Redução imediata de volume no próximo microciclo (Deload Obrigatório).');
  }
  if (monotonyDanger >= 80) {
    alerts.push('⚠️ Atenção: Monotonia excessiva. Risco de Overtraining por falta de variabilidade.');
    suggestions.push('Introduzir sessões regenerativas e alternar estímulos (Alto/Baixo).');
  }
  if (fatigueDanger >= 80) {
    alerts.push('🚨 Esgotamento Central: Fadiga alta (PSE Elevada + Prontidão Baixa).');
    suggestions.push('Priorizar recuperação fisiológica. Reduzir intensidade tensional/metabólica.');
  }
  if (performanceDropFlag && acwrRatio > 1.2) {
    alerts.push('⚠️ Risco Mecânico: Queda de performance detectada durante bloco de sobrecarga.');
    suggestions.push('Sinal clássico de Overreaching Não Funcional. Ajustar carga prescrita na próxima sessão.');
  }

  if (score < 40) {
    suggestions.push('Risco controlado. Seguro manter a progressão de sobrecarga (Overload progressivo).');
  }

  return {
    score,
    classification,
    alerts,
    suggestions,
    breakdown: {
      acwrScore: Math.round(acwrDanger),
      monotonyScore: Math.round(monotonyDanger),
      strainScore: Math.round(strainDanger),
      fatigueScore: Math.round(fatigueDanger),
      performanceScore: Math.round(performanceDanger)
    }
  };
}
