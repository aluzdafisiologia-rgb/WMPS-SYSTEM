
'use client'

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Target, 
  Calendar, 
  TrendingUp, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  AlertTriangle,
  Activity,
  Dumbbell,
  Timer
} from 'lucide-react';
import { calculateACWR, generateFullPlan } from '@/lib/periodization-engine';
import { Session } from '@/lib/db';

interface PeriodizationWizardProps {
  athlete: any;
  sessions: Session[];
  onClose: () => void;
  onSave: (plan: any) => Promise<void>;
}

const GOALS = [
  { id: 'hypertrophy', label: 'Hipertrofia Muscular', icon: <Dumbbell className="w-5 h-5" />, color: 'from-blue-500 to-indigo-600', description: 'Tensão mecânica + estresse metabólico (70–85% 1RM)' },
  { id: 'strength', label: 'Força Máxima', icon: <Zap className="w-5 h-5" />, color: 'from-red-500 to-orange-600', description: 'Recrutamento máximo de unidades motoras (>85% 1RM)' },
  { id: 'power', label: 'Potência / RFD', icon: <Zap className="w-5 h-5 text-yellow-400" />, color: 'from-yellow-500 to-orange-500', description: 'Taxa de Desenvolvimento de Força — via fosfagênio' },
  { id: 'endurance', label: 'Resistência Aeróbica (Oxidativa)', icon: <Timer className="w-5 h-5" />, color: 'from-emerald-500 to-teal-600', description: 'Capacidade oxidativa (VO₂máx / Vcrit)' },
  { id: 'body_composition', label: 'Otimização da Composição Corporal', icon: <TrendingUp className="w-5 h-5" />, color: 'from-pink-500 to-rose-600', description: '↑ Massa Magra / ↓ Gordura Corporal — balanço energético' },
];

export default function PeriodizationWizard({ athlete, sessions, onClose, onSave }: PeriodizationWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [durationWeeks, setDurationWeeks] = useState(12);
  const [intensityMeta, setIntensityMeta] = useState(10); // % de evolução esperada
  const [isSaving, setIsSaving] = useState(false);
  const [activeWeek, setActiveWeek] = useState(1);

  const acwr = useMemo(() => calculateACWR(sessions.filter(s => s.athlete_id === athlete.id)), [sessions, athlete.id]);

  const toggleGoal = (id: string) => {
    setSelectedGoals(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const generatedPlan = useMemo(() => {
    return generateFullPlan(athlete, selectedGoals, durationWeeks, intensityMeta);
  }, [selectedGoals, durationWeeks, intensityMeta]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        athlete_id: athlete.id,
        athlete_name: athlete.full_name,
        goals: selectedGoals,
        duration: durationWeeks,
        plan: generatedPlan
      });
    } catch (error) {
      console.error('Erro ao salvar periodização:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const currentWeekData = generatedPlan[activeWeek - 1] || generatedPlan[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <Target className="w-5 h-5 text-blue-500" />
              </div>
              <h2 className="text-xl font-black text-white uppercase italic tracking-widest">Motor de Periodização</h2>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Atleta: <span className="text-blue-400">{athlete.full_name}</span></p>
          </div>
          
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`w-8 h-1.5 rounded-full transition-all duration-500 ${step >= s ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-slate-800'}`} />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Status Card */}
                  <div className="p-6 bg-slate-800/40 border border-slate-800 rounded-3xl space-y-6">
                    <h3 className="text-xs font-black text-white uppercase italic tracking-widest flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-500" /> Status Bioenergético
                    </h3>
                    
                    <div className="space-y-4">
                       <div className="flex justify-between items-center p-4 bg-slate-900/50 rounded-2xl border border-slate-700/50">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">ACWR (Carga)</span>
                          <div className="text-right">
                             <div className={`text-xl font-black italic ${acwr.status === 'high' ? 'text-red-500' : 'text-blue-400'}`}>{acwr.ratio}</div>
                             <div className="text-[8px] font-black uppercase text-slate-600">{acwr.status}</div>
                          </div>
                       </div>
                       <div className="flex justify-between items-center p-4 bg-slate-900/50 rounded-2xl border border-slate-700/50">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Experiência</span>
                          <span className="text-sm font-black text-white uppercase italic">{athlete.experience_level || 'Intermediário'}</span>
                       </div>
                    </div>
                  </div>

                  {/* Warning Box */}
                  <div className={`p-6 rounded-3xl border flex flex-col justify-center gap-4 ${acwr.status === 'high' ? 'bg-red-500/10 border-red-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
                    <div className="flex items-center gap-3">
                       <AlertTriangle className={`w-6 h-6 ${acwr.status === 'high' ? 'text-red-500' : 'text-blue-500'}`} />
                       <h4 className={`text-sm font-black uppercase italic ${acwr.status === 'high' ? 'text-red-500' : 'text-blue-500'}`}>Recomendação do Sistema</h4>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {acwr.message} {acwr.status === 'high' ? 'Sugerimos um microciclo de recuperação imediata antes de iniciar o novo macrociclo.' : 'O atleta está em condições ideais para progressão de carga.'}
                    </p>
                  </div>
                </div>

                <div className="p-8 bg-blue-600/5 border border-blue-500/10 rounded-[2rem] text-center">
                   <h3 className="text-white font-black uppercase italic tracking-widest mb-4">Pronto para Periodizar?</h3>
                   <p className="text-slate-500 text-[10px] uppercase font-bold max-w-md mx-auto">Vamos configurar os objetivos e o cronograma para gerar o planejamento automático baseado em Bompa e Matveev.</p>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-white uppercase italic tracking-widest">Selecione os Objetivos Primários</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {GOALS.map(goal => (
                      <button 
                        key={goal.id}
                        onClick={() => toggleGoal(goal.id)}
                        className={`p-6 rounded-3xl border transition-all flex flex-col gap-3 group relative overflow-hidden ${
                          selectedGoals.includes(goal.id) 
                            ? 'bg-gradient-to-br border-transparent shadow-xl' 
                            : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                        } ${selectedGoals.includes(goal.id) ? goal.color : ''}`}
                      >
                        <div className={`p-3 rounded-xl w-fit ${selectedGoals.includes(goal.id) ? 'bg-white/20 text-white' : 'bg-slate-900 text-slate-500 group-hover:text-white transition-colors'}`}>
                          {goal.icon}
                        </div>
                         <span className={`text-xs font-black uppercase italic tracking-widest ${selectedGoals.includes(goal.id) ? 'text-white' : 'text-slate-500 group-hover:text-white'}`}>
                           {goal.label}
                         </span>
                         {selectedGoals.includes(goal.id) && (
                           <div className="absolute top-4 right-4">
                             <Check className="w-4 h-4 text-white" />
                           </div>
                         )}
                         {'description' in goal && (
                           <span className={`text-[8px] font-bold uppercase leading-tight mt-1 ${selectedGoals.includes(goal.id) ? 'text-white/60' : 'text-slate-600'}`}>
                             {(goal as any).description}
                           </span>
                         )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Duração do Macrociclo (Semanas)</label>
                      <input 
                        type="range" 
                        min="4" 
                        max="24" 
                        step="4"
                        value={durationWeeks}
                        onChange={(e) => setDurationWeeks(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                      <div className="flex justify-between text-[10px] font-black text-blue-500 italic">
                         <span>4 Semanas</span>
                         <span className="text-lg">{durationWeeks} Semanas</span>
                         <span>24 Semanas</span>
                      </div>
                   </div>
                   
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Meta de Evolução (%)</label>
                      <div className="flex gap-4">
                         {[5, 10, 15, 20].map(val => (
                           <button 
                             key={val}
                             onClick={() => setIntensityMeta(val)}
                             className={`flex-1 py-3 rounded-xl border text-xs font-black transition-all ${intensityMeta === val ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                           >
                              +{val}%
                           </button>
                         ))}
                      </div>
                   </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-end">
                   <div>
                      <h3 className="text-xl font-black text-white uppercase italic tracking-widest mb-1">Planejamento Gerado</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Modelo: <span className="text-emerald-500">ATR/Linear Híbrido</span></p>
                   </div>
                   <div className="text-right">
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Pico de Intensidade</p>
                      <div className="text-2xl font-black text-rose-500 italic">95% <span className="text-xs opacity-50">1RM</span></div>
                   </div>
                </div>

                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
                   {generatedPlan.map(week => (
                     <button 
                       key={week.week} 
                       onClick={() => setActiveWeek(week.week)}
                       className={`flex flex-col gap-2 transition-all ${activeWeek === week.week ? 'scale-110' : 'opacity-50 hover:opacity-80'}`}
                     >
                        <div className={`h-24 rounded-xl border flex flex-col items-center justify-end p-1 relative overflow-hidden group ${activeWeek === week.week ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-800/40'}`}>
                           <div 
                             className={`w-full rounded-lg transition-all duration-1000 ${
                               week.type === 'Choque' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 
                               week.type === 'Recuperação' ? 'bg-emerald-500' : 'bg-blue-500'
                             }`}
                             style={{ height: `${week.intensity}%` }}
                           />
                           <span className="absolute top-2 text-[8px] font-black text-white/50">{week.intensity}%</span>
                        </div>
                        <span className={`text-[8px] font-black text-center ${activeWeek === week.week ? 'text-blue-500' : 'text-slate-600'}`}>S{week.week}</span>
                     </button>
                   ))}
                </div>

                <div className="flex flex-wrap gap-4 py-2 border-b border-slate-800/50">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Ordinário (Base)</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-500" />
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Choque (Intensivo)</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Recuperação (Deload)</span>
                   </div>
                </div>

                <div className="p-4 bg-blue-600/5 border border-blue-500/10 rounded-2xl">
                   <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-3 h-3 text-blue-400" />
                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest italic">Raciocínio Clínico do Sistema</span>
                   </div>
                   <p className="text-[10px] text-blue-400/70 font-medium leading-relaxed italic">
                       Planejamento estruturado em modelo {durationWeeks > 8 ? 'Macrociclo (Matveev / ATR)' : 'Modelo ATR Curto (Issurin, 4–8 semanas)'}. 
                       A distribuição prioriza {selectedGoals.join(' + ')} com ondas de carga progressivas (sobrecarga linear/ondulária) e tapering final para supercompensação máxima.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-3 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                         <Calendar className="w-12 h-12 text-blue-500" />
                      </div>
                      <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Fase Atual: {currentWeekData.phase}</h4>
                      <div className="text-xl font-black text-white italic uppercase tracking-tighter">Microciclo {currentWeekData.type}</div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed">Status da Semana {currentWeekData.week}</p>
                   </div>
                   
                   <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
                      <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Método Recomendado</h4>
                      <div className="text-xl font-black text-white italic uppercase tracking-tighter">{currentWeekData.method}</div>
                      <div className="flex gap-2">
                         <span className="px-2 py-1 bg-rose-500/10 border border-rose-500/20 rounded text-[8px] font-black text-rose-500 uppercase">Intensidade: {currentWeekData.intensity}%</span>
                      </div>
                   </div>

                   <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
                      <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Conteúdo do Treino</h4>
                      <div className="space-y-1">
                         {currentWeekData.suggestions.map((s: string, i: number) => (
                           <div key={i} className="flex items-center gap-2">
                              <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                              <span className="text-[10px] font-bold text-slate-300 uppercase">{s}</span>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-slate-800 bg-slate-900/50 flex justify-between gap-4">
          <button 
            disabled={isSaving}
            onClick={step === 1 ? onClose : () => setStep(s => s - 1)}
            className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </button>
          
          <button 
            onClick={step === 3 ? handleSave : () => setStep(s => s + 1)}
            disabled={(step === 2 && selectedGoals.length === 0) || isSaving}
            className={`px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 shadow-xl ${
              (step === 2 && selectedGoals.length === 0) || isSaving
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
            }`}
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processando...
              </div>
            ) : (
              <>
                {step === 3 ? 'Finalizar e Salvar' : 'Continuar'}
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
