'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, Calendar, Target, AlertCircle, 
  CheckCircle2, Clock, Zap, Activity, Info, ArrowLeft,
  Search, BrainCircuit
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid, ReferenceLine, AreaChart, Area
} from 'recharts';
import { calculateForecast, ForecastResult } from '@/lib/forecast-engine';
import { calculateACWR } from '@/lib/periodization-engine';
import { getAssessments, getWellness, getSessions } from '../actions';

interface ForecastModuleProps {
  athletes: any[];
  onBack: () => void;
}

export default function ForecastModule({ athletes, onBack }: ForecastModuleProps) {
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [metricType, setMetricType] = useState<'weight' | 'bodyFat' | 'agility_time'>('weight');
  const [targetGoal, setTargetGoal] = useState<string>('');
  const [assessments, setAssessments] = useState<any[]>([]);
  const [wellness, setWellness] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);

  useEffect(() => {
    if (selectedAthleteId) {
      loadData(selectedAthleteId);
    }
  }, [selectedAthleteId]);

  const loadData = async (id: string) => {
    setLoading(true);
    const [evals, well, sess] = await Promise.all([
      getAssessments(id),
      getWellness(), // Filters are done in memory for now or we could optimize actions
      getSessions()
    ]);
    setAssessments(evals);
    setWellness(well.filter((w: any) => w.athlete_id === id));
    setSessions(sess.filter((s: any) => s.athlete_name === selectedAthlete?.full_name));
    setLoading(false);
  };

  const forecast = useMemo(() => {
    if (!selectedAthleteId || !targetGoal || assessments.length < 2) return null;

    // Filter assessments by type and extract values
    const filteredHistory = assessments
      .filter(a => {
        if (metricType === 'weight') return a.type === 'assessment_anthropometric' && a.data.weight;
        if (metricType === 'bodyFat') return a.type === 'assessment_anthropometric' && a.data.bodyFat;
        if (metricType === 'agility_time') return a.type === 'assessment_agility' && a.data.time;
        return false;
      })
      .map(a => ({
        date: a.date,
        value: metricType === 'weight' ? a.data.weight : 
               metricType === 'bodyFat' ? a.data.bodyFat : 
               a.data.time
      }));

    if (filteredHistory.length < 2) return null;

    // Calculate ACWR for adjustment
    const latestSessions = sessions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const acwr = calculateACWR(latestSessions);
    
    // Calculate Average Wellness
    const avgWellness = wellness.length > 0 
      ? wellness.slice(0, 7).reduce((acc, w) => acc + w.score, 0) / Math.min(wellness.length, 7)
      : 100;

    return calculateForecast(
      filteredHistory,
      parseFloat(targetGoal),
      metricType === 'agility_time' || metricType === 'bodyFat', // lower is better
      acwr.ratio,
      avgWellness
    );
  }, [selectedAthleteId, metricType, targetGoal, assessments, wellness, sessions]);

  const classificationColor = {
    'Accelerated': 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    'On Track': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    'Slow': 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
    'Stagnated': 'text-rose-500 bg-rose-500/10 border-rose-500/20'
  };

  const classificationLabel = {
    'Accelerated': 'Acelerado',
    'On Track': 'Dentro do Esperado',
    'Slow': 'Lento',
    'Stagnated': 'Estagnado'
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar ao Menu
        </button>
        
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedAthleteId}
            onChange={(e) => setSelectedAthleteId(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-blue-500 transition-colors"
          >
            <option value="">-- Selecionar Atleta --</option>
            {athletes.map(a => (
              <option key={a.id} value={a.id}>{a.full_name}</option>
            ))}
          </select>

          <select
            value={metricType}
            onChange={(e) => setMetricType(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-blue-500 transition-colors"
          >
            <option value="weight">Peso (kg)</option>
            <option value="bodyFat">Gordura (%)</option>
            <option value="agility_time">Agilidade (s)</option>
          </select>

          <div className="relative">
            <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
            <input 
              type="number" 
              placeholder="Meta"
              value={targetGoal}
              onChange={(e) => setTargetGoal(e.target.value)}
              className="pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:ring-1 focus:ring-blue-500 outline-none w-24"
            />
          </div>
        </div>
      </div>

      {!selectedAthleteId || !targetGoal ? (
        <div className="bento-card bg-slate-900/50 border-slate-800 flex flex-col items-center justify-center p-12 text-center h-[400px]">
          <BrainCircuit className="w-16 h-16 text-blue-500/20 mb-4 animate-pulse" />
          <h2 className="text-xl font-black text-white uppercase italic tracking-widest">Previsão de Resultados</h2>
          <p className="text-slate-500 font-medium mt-2 max-w-md">Configure o atleta, a métrica e a meta desejada para que a IA do WMPS calcule a projeção de tempo e data de alcance.</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center items-center h-64">
           <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : !forecast ? (
        <div className="bento-card bg-slate-900/50 border-slate-800 p-12 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-black text-white uppercase">Dados Insuficientes</h3>
          <p className="text-slate-500 mt-2">São necessárias pelo menos duas avaliações do mesmo tipo para gerar uma previsão.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Forecast Card */}
          <div className="lg:col-span-4 space-y-6">
            <div className={`bento-card p-8 border-none relative overflow-hidden ${
              forecast.status === 'attained' ? 'bg-emerald-600' : 
              forecast.status === 'attainable' ? 'bg-blue-600' : 'bg-slate-900 border border-slate-800'
            }`}>
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-white/60" />
                  <span className="text-[10px] font-black text-white/60 uppercase tracking-widest italic">Tempo Estimado</span>
                </div>
                
                <div>
                  {forecast.status === 'attained' ? (
                    <h2 className="text-4xl font-black text-white italic uppercase tracking-tight">Meta Atingida!</h2>
                  ) : forecast.daysToGoal ? (
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-6xl font-black text-white italic">{forecast.daysToGoal}</h2>
                      <span className="text-xl font-black text-white/40">DIAS</span>
                    </div>
                  ) : (
                    <h2 className="text-3xl font-black text-white italic">Imprevisível</h2>
                  )}
                  {forecast.estimatedDate && (
                    <p className="text-[10px] font-black text-white/60 uppercase mt-2">Data Estimada: {new Date(forecast.estimatedDate).toLocaleDateString('pt-BR')}</p>
                  )}
                </div>

                <div className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest text-center ${classificationColor[forecast.classification]}`}>
                  Status: {classificationLabel[forecast.classification]}
                </div>
              </div>
              
              <Activity className="absolute -right-8 -bottom-8 w-48 h-48 opacity-10 rotate-12 text-white" />
            </div>

            {/* Performance Indicators */}
            <div className="bento-card bg-slate-900/50 border-slate-800 p-6 space-y-6">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" /> Fatores de Ajuste (IA)
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[10px] font-black text-white mb-2 uppercase">
                    <span>Fadiga / Wellness</span>
                    <span className={forecast.adjustmentFactor < 0.7 ? 'text-rose-500' : 'text-emerald-500'}>
                      {Math.round(forecast.adjustmentFactor * 100)}% Eficiência
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${forecast.adjustmentFactor < 0.7 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${forecast.adjustmentFactor * 100}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                      {forecast.classification === 'Stagnated' ? 
                        "Evolução estagnada detectada. Recomenda-se ajuste de volume ou troca de método de treinamento." :
                        forecast.classification === 'Slow' ?
                        "Progresso mais lento que o esperado. Verifique sono e nutrição." :
                        "Ritmo de evolução positivo. Manter o planejamento atual."
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Projection Chart */}
          <div className="lg:col-span-8 bento-card bg-slate-900/50 border-slate-800 p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-sm font-black text-white uppercase italic tracking-widest">Gráfico de Projeção WMPS</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Linha contínua: Histórico | Linha tracejada: Projeção IA</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[9px] font-black text-slate-500 uppercase">Real</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full border border-blue-500 border-dashed" />
                  <span className="text-[9px] font-black text-slate-500 uppercase">Projeção</span>
                </div>
              </div>
            </div>

            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecast.projections}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickFormatter={(str) => new Date(str).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px' }}
                    formatter={(value: any, name: any, props: any) => [
                      `${parseFloat(value).toFixed(2)} ${metricType === 'weight' ? 'kg' : metricType === 'bodyFat' ? '%' : 's'}`,
                      props.payload.isProjection ? 'Projeção' : 'Real'
                    ]}
                  />
                  <ReferenceLine y={parseFloat(targetGoal)} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'META', position: 'right', fill: '#ef4444', fontSize: 10, fontWeight: 'black' }} />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                 <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Métrica Atual</p>
                 <p className="text-xl font-black text-white italic">{forecast.currentValue.toFixed(1)} {metricType === 'weight' ? 'kg' : metricType === 'bodyFat' ? '%' : 's'}</p>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                 <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Taxa Diária</p>
                 <p className={`text-xl font-black italic ${forecast.rateOfChange > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                   {forecast.rateOfChange > 0 ? '+' : ''}{forecast.rateOfChange.toFixed(3)}/dia
                 </p>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                 <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Probabilidade</p>
                 <p className={`text-xl font-black italic ${forecast.status === 'attainable' ? 'text-blue-400' : forecast.status === 'attained' ? 'text-emerald-500' : 'text-rose-500'}`}>
                   {forecast.status === 'attainable' ? 'Alta' : forecast.status === 'attained' ? 'Concluído' : 'Baixa'}
                 </p>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
