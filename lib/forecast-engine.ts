
/**
 * Forecast Engine for WMPS
 * Predictive analytics for athlete performance and goal attainment.
 */

export interface ForecastDataPoint {
  date: string;
  value: number;
  isProjection: boolean;
}

export interface ForecastResult {
  currentValue: number;
  goalValue: number;
  rateOfChange: number; // units per day
  daysToGoal: number | null;
  estimatedDate: string | null;
  classification: 'Accelerated' | 'On Track' | 'Slow' | 'Stagnated';
  projections: ForecastDataPoint[];
  status: 'attainable' | 'unlikely' | 'attained';
  adjustmentFactor: number; // 0 to 1, where 1 is optimal progress
}

export function calculateForecast(
  history: { date: string; value: number }[],
  goalValue: number,
  lowerIsBetter: boolean = false,
  acwr: number = 1.0,
  wellnessScore: number = 100 // 0-100
): ForecastResult {
  if (history.length < 2) {
    return {
      currentValue: history[0]?.value || 0,
      goalValue,
      rateOfChange: 0,
      daysToGoal: null,
      estimatedDate: null,
      classification: 'Stagnated',
      projections: [],
      status: 'unlikely',
      adjustmentFactor: 1
    };
  }

  // Sort by date
  const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const initial = sorted[0];
  const latest = sorted[sorted.length - 1];

  const daysPassed = (new Date(latest.date).getTime() - new Date(initial.date).getTime()) / (1000 * 60 * 60 * 24);
  
  // Recent trend (last 3 entries)
  const recentEntries = sorted.slice(-3);
  let recentRate = 0;
  if (recentEntries.length >= 2) {
    const firstRecent = recentEntries[0];
    const lastRecent = recentEntries[recentEntries.length - 1];
    const recentDays = (new Date(lastRecent.date).getTime() - new Date(firstRecent.date).getTime()) / (1000 * 60 * 60 * 24);
    recentRate = recentDays > 0 ? (lastRecent.value - firstRecent.value) / recentDays : 0;
  }

  // Overall rate
  const overallRate = daysPassed > 0 ? (latest.value - initial.value) / daysPassed : 0;
  
  // Weight recent rate more (70/30)
  let baseRate = (recentRate * 0.7) + (overallRate * 0.3);

  // Adjustment based on Fatigue and Risk
  // ACWR > 1.5 is danger, ACWR < 0.8 is undertraining
  let riskFactor = 1.0;
  if (acwr > 1.5) riskFactor = 0.4; // 60% slowdown due to injury risk/fatigue
  else if (acwr > 1.3) riskFactor = 0.8;
  else if (acwr < 0.8) riskFactor = 0.9; // Slight slowdown due to sub-optimal stimulus

  // Wellness Score (0-100)
  const wellnessFactor = wellnessScore / 100;

  const adjustmentFactor = riskFactor * wellnessFactor;
  const adjustedRate = baseRate * adjustmentFactor;

  // Calculation for goal
  const diffToGoal = goalValue - latest.value;
  let daysToGoal: number | null = null;

  // Directional check
  const isProgressing = lowerIsBetter ? adjustedRate < 0 : adjustedRate > 0;
  const hasAttained = lowerIsBetter ? latest.value <= goalValue : latest.value >= goalValue;

  if (hasAttained) {
    daysToGoal = 0;
  } else if (isProgressing && Math.abs(adjustedRate) > 0.0001) {
    daysToGoal = diffToGoal / adjustedRate;
  }

  // Classification
  let classification: ForecastResult['classification'] = 'Stagnated';
  const absRate = Math.abs(adjustedRate);
  if (absRate < 0.001) classification = 'Stagnated';
  else if (absRate > Math.abs(overallRate) * 1.2) classification = 'Accelerated';
  else if (absRate > Math.abs(overallRate) * 0.8) classification = 'On Track';
  else classification = 'Slow';

  // Projections
  const projections: ForecastDataPoint[] = sorted.map(d => ({ ...d, isProjection: false }));
  if (daysToGoal && daysToGoal > 0 && daysToGoal < 365) {
    // Add 3 projection points
    for (let i = 1; i <= 3; i++) {
      const projDays = (daysToGoal / 3) * i;
      const projDate = new Date(new Date(latest.date).getTime() + projDays * 24 * 60 * 60 * 1000);
      projections.push({
        date: projDate.toISOString().split('T')[0],
        value: latest.value + adjustedRate * projDays,
        isProjection: true
      });
    }
  }

  let estimatedDate = null;
  if (daysToGoal && daysToGoal > 0) {
    estimatedDate = new Date(new Date(latest.date).getTime() + daysToGoal * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }

  return {
    currentValue: latest.value,
    goalValue,
    rateOfChange: adjustedRate,
    daysToGoal: daysToGoal && daysToGoal > 0 ? Math.ceil(daysToGoal) : null,
    estimatedDate,
    classification,
    projections,
    status: hasAttained ? 'attained' : (daysToGoal && daysToGoal < 180 ? 'attainable' : 'unlikely'),
    adjustmentFactor
  };
}
