'use client'

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, Activity, AlertTriangle, CheckCircle2, 
  TrendingUp, ArrowRight, RefreshCcw, Info, BrainCircuit
} from 'lucide-react';
import { calculateACWR, calculateRiskScore, calculateMonotony } from '@/lib/periodization-engine';

interface WhatIfSimulatorProps {
  athlete: any;
  currentSessions: any[];
  currentWellness: any[];
  onClose: () => void;
}

export default function WhatIfSimulator({ athlete, currentSessions, currentWellness, onClose }: WhatIfSimulatorProps) {
  const [hypotheticalLoad, setHypotheticalLoad] = useState(500);
  const [hypotheticalDuration, setHypotheticalDuration] = useState(60);
  const [hypotheticalRpe, setHypotheticalRpe] = useState(7);
  
  const currentMetrics = useMemo(() => {
    const res = calculateACWR(currentSessions);
    const monotony = calculateMonotony(currentSessions);
    const avgWell = currentWellness.slice(0,7).reduce((acc, w) => acc + w.score, 0) / Math.min(currentWellness.length, 7) || 75;
    return { acwr: res.ratio, monotony, wellness: avgWell };
  }, [currentSessions, currentWellness]);

  const simulation = useMemo(() => {
    const load = hypotheticalLoad || (hypotheticalDuration * hypotheticalRpe);
    const simulatedSessions = [{ date: new Date().toISOString(), load, rpe: hypotheticalRpe, duration: hypotheticalDuration }, ...currentSessions];
    
    const acwrResult = calculateACWR(simulatedSessions);
    const monotony = calculateMonotony(simulatedSessions);
    const strain = acwrResult.acuteEWMA * monotony;
    
    const report = calculateRiskScore(
      acwrResult.ratio,
      monotony,
      strain,
      hypotheticalRpe,
      currentMetrics.wellness / 20,
      false
    );

    return {
      acwr: acwrResult.ratio,
      riskScore: report.score,
      classification: report.classification,
      alerts: report.alerts,
      suggestions: report.suggestions
    };
  }, [hypotheticalLoad, hypotheticalDuration, hypotheticalRpe, currentSessions, currentMetrics]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl"
      >
        <div className="p-8 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600/20 rounded-2xl border border-indigo-500/30">
               <BrainCircuit className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase italic tracking-widest">Simulador What-If</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Atleta: <span className="text-indigo-400">{athlete.full_name}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-all font-bold">FECHAR</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
          {/* Controls */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <RefreshCcw className="w-4 h-4" /> Parâmetros da Simulação
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Duração da Sessão (min)</label>
                    <span className="text-xs font-black text-white">{hypotheticalDuration}m</span>
                  </div>
                  <input 
                    type="range" min="10" max="180" step="5"
                    value={hypotheticalDuration}
                    onChange={(e) => setHypotheticalDuration(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Percepção de Esforço (PSE 1-10)</label>
                    <span className="text-xs font-black text-white">{hypotheticalRpe}</span>
                  </div>
                  <input 
                    type="range" min="1" max="10" step="1"
                    value={hypotheticalRpe}
                    onChange={(e) => setHypotheticalRpe(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                <div className="pt-4 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Carga Calculada (UA)</p>
                  <p className="text-3xl font-black text-white italic">{hypotheticalDuration * hypotheticalRpe}</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-blue-600/10 rounded-2xl border border-blue-500/20">
               <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-400 shrink-0" />
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                    Este simulador utiliza o modelo **EWMA** para prever o impacto fisiológico da sessão proposta. 
                    Mude os sliders para ver como o risco de lesão e o ACWR reagem em tempo real.
                  </p>
               </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" /> Impacto Projetado
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="bento-card bg-slate-800/40 p-6 space-y-2">
                <p className="text-[9px] font-black text-slate-500 uppercase">ACWR Projetado</p>
                <div className="flex items-baseline gap-2">
                  <h4 className={`text-4xl font-black italic ${simulation.acwr > 1.5 ? 'text-rose-500' : simulation.acwr > 1.3 ? 'text-yellow-500' : 'text-emerald-500'}`}>
                    {simulation.acwr.toFixed(2)}
                  </h4>
                  <div className="flex items-center gap-1">
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] font-bold text-slate-400">{currentMetrics.acwr.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="bento-card bg-slate-800/40 p-6 space-y-2">
                <p className="text-[9px] font-black text-slate-500 uppercase">Risk Score (0-100)</p>
                <h4 className={`text-4xl font-black italic ${simulation.riskScore >= 60 ? 'text-rose-500' : simulation.riskScore >= 40 ? 'text-yellow-500' : 'text-emerald-500'}`}>
                  {simulation.riskScore}
                </h4>
              </div>
            </div>

            <div className={`p-8 rounded-[2rem] border-2 transition-all duration-500 ${
              simulation.classification === 'Crítico' || simulation.classification === 'Alto' 
                ? 'bg-rose-600/10 border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.2)]' 
                : 'bg-emerald-600/10 border-emerald-500/30'
            }`}>
               <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Classificação de Risco</span>
                  <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                    simulation.classification === 'Crítico' ? 'bg-rose-600 text-white' : 
                    simulation.classification === 'Alto' ? 'bg-rose-500 text-white' : 
                    simulation.classification === 'Moderado' ? 'bg-yellow-500 text-black' : 'bg-emerald-500 text-white'
                  }`}>
                    {simulation.classification}
                  </div>
               </div>
               
               <div className="space-y-3">
                  {simulation.alerts.map((alert, i) => (
                    <div key={i} className="flex items-center gap-3 text-white font-bold text-xs italic">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" /> {alert}
                    </div>
                  ))}
                  {simulation.suggestions.map((sug, i) => (
                    <div key={i} className="flex items-center gap-3 text-slate-300 font-medium text-xs italic">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {sug}
                    </div>
                  ))}
               </div>
            </div>

            <button 
              onClick={onClose}
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all ${
                simulation.classification === 'Crítico' 
                  ? 'bg-rose-600 hover:bg-rose-500 text-white' 
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {simulation.classification === 'Crítico' ? 'Revisar Carga do Treino' : 'Confirmar Estratégia'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
