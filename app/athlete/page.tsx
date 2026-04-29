'use client'

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Clock, Zap, Calendar, CheckCircle2, Save, LogOut } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { logWorkout, logWellness, getUserRole } from '../actions';



const WELLNESS_LABELS = {
  sleep: ['Muito ruim', 'Ruim', 'Médio', 'Bom', 'Muito bom'],
  stress: ['Muito estressado', 'Elevado', 'Médio', 'Pouco', 'Muito pouco'],
  fatigue: ['Muito fadigado', 'Elevado', 'Médio', 'Pouco', 'Muito pouco'],
  soreness: ['Muito dolorido', 'Elevada', 'Média', 'Pouca', 'Muito pouca']
};

const TQR_LABELS: Record<number, string> = {
  6: 'Em nada recuperado',
  7: 'Extremamente mal recuperado',
  8: 'Extremamente mal recuperado',
  9: 'Muito mal recuperado',
  10: 'Muito mal recuperado',
  11: 'Mal recuperado',
  12: 'Mal recuperado',
  13: 'Razoavelmente recuperado',
  14: 'Razoavelmente recuperado',
  15: 'Bem recuperado',
  16: 'Bem recuperado',
  17: 'Muito bem recuperado',
  18: 'Muito bem recuperado',
  19: 'Extremamente bem recuperado',
  20: 'Totalmente recuperado'
};

const BORG_RPE_LABELS: Record<number, string> = {
  6: 'Sem nenhum esforço',
  7: 'Extremamente leve',
  8: 'Extremamente leve',
  9: 'Muito leve',
  10: 'Muito leve',
  11: 'Leve',
  12: 'Leve',
  13: 'Um pouco intenso',
  14: 'Um pouco intenso',
  15: 'Intenso (pesado)',
  16: 'Intenso (pesado)',
  17: 'Muito intenso',
  18: 'Muito intenso',
  19: 'Extremamente intenso',
  20: 'Máximo esforço'
};

export default function AthletePage() {
  const [activeTab, setActiveTab] = useState<'workout' | 'wellness' | null>(null);
  const [formData, setFormData] = useState({
    athleteName: '',
    duration: '',
    rpe: 6,
    date: new Date().toISOString().split('T')[0],
  });
  const [wellnessData, setWellnessData] = useState({
    recovery: 14,
    sleep: 3,
    stress: 3,
    fatigue: 3,
    soreness: 3,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);

  React.useEffect(() => {
    async function checkAuth() {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/';
        return;
      }
      setUser(session.user);
      
      const role = await getUserRole(session.user.id);
      setRole(role);
      
      // Auto-preencher o nome do atleta
      if (!supabase) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single();
      
      if (profile) {
        setFormData(prev => ({ ...prev, athleteName: profile.full_name }));
      }
    }
    checkAuth();
  }, []);

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    window.location.href = '/';
  };

  const handleSubmitWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.athleteName || !formData.duration || !formData.rpe) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    setIsSubmitting(true);
    try {
      await logWorkout({
        athleteName: formData.athleteName,
        rpe: formData.rpe,
        duration: Number(formData.duration),
        date: formData.date,
      });
      setShowSuccess(true);
      setFormData({
        athleteName: formData.athleteName, 
        duration: '',
        rpe: 6,
        date: new Date().toISOString().split('T')[0],
      });
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar treino.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitWellness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.athleteName) {
      alert('Por favor, insira seu nome.');
      return;
    }

    setIsSubmitting(true);
    try {
      await logWellness({
        athleteName: formData.athleteName,
        ...wellnessData,
        date: formData.date,
      });
      setShowSuccess(true);
      setWellnessData({
        recovery: 14,
        sleep: 3,
        stress: 3,
        fatigue: 3,
        soreness: 3,
      });
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar wellness.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 font-sans pb-20">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-6 h-16 flex items-center justify-between">
          <button 
            onClick={() => {
              if (activeTab) {
                setActiveTab(null);
              } else {
                window.location.href = role === 'admin' ? '/admin' : '/';
              }
            }}
            className="p-2 -ml-2 text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex flex-col items-center">
            <Link href="/" className="bg-black text-emerald-500 border-2 border-emerald-500 font-black px-2.5 py-0.5 rounded-lg text-lg italic skew-x-[-10deg] shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              WMPS
            </Link>
            <div className="text-center mt-0.5">
              <h1 className="text-[8px] font-black leading-tight text-white uppercase italic tracking-[0.05em]">William Moreira</h1>
              <p className="text-[7px] text-slate-500 uppercase tracking-[0.1em] font-bold -mt-1">Performance System</p>
            </div>
          </div>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 mt-8 space-y-8">
        {!activeTab ? (
          <div className="grid grid-cols-1 gap-6 py-12">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setActiveTab('wellness')}
              className="group p-8 bg-slate-800 border border-slate-700 rounded-[2rem] hover:border-emerald-500/50 transition-all text-left relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Zap className="w-24 h-24 text-emerald-500" />
              </div>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-2 italic">Fase 1: Preparação</p>
              <h3 className="text-2xl font-black text-white uppercase italic leading-tight">Wellness<br />(Pré-Treino)</h3>
              <p className="text-slate-500 text-[10px] font-bold mt-4 uppercase tracking-wider">Sono, Estresse, Fadiga e Recuperação</p>
            </motion.button>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 1 }}
              transition={{ delay: 0.1 }}
              onClick={() => setActiveTab('workout')}
              className="group p-8 bg-slate-800 border border-slate-700 rounded-[2rem] hover:border-blue-500/50 transition-all text-left relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Clock className="w-24 h-24 text-blue-500" />
              </div>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-2 italic">Fase 2: Execução</p>
              <h3 className="text-2xl font-black text-white uppercase italic leading-tight">Carga Treino<br />(Pós-Treino)</h3>
              <p className="text-slate-500 text-[10px] font-bold mt-4 uppercase tracking-wider">PSE, Duração e Intensidade</p>
            </motion.button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bento-card bg-slate-800 border-slate-700 shadow-xl overflow-hidden p-0">
              <div className={activeTab === 'workout' ? "bg-blue-600 px-8 py-4" : "bg-emerald-600 px-8 py-4"}>
                 <h2 className="text-sm font-black text-white uppercase tracking-widest italic">
                   {activeTab === 'workout' ? 'Nova Sessão de Treino' : 'Formulário Wellness'}
                 </h2>
              </div>
              
              <div className="p-8 space-y-8">
                {/* Athlete Name - Shared */}
                <div className="space-y-3">
                  <label className="label-caps italic">Identificação</label>
                  <input
                    type="text"
                    placeholder="Seu nome completo"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 focus:ring-1 focus:ring-blue-500 transition-all font-bold text-white placeholder:text-slate-600 outline-none"
                    value={formData.athleteName}
                    onChange={(e) => setFormData({ ...formData, athleteName: e.target.value })}
                    required
                  />
                </div>

                {activeTab === 'workout' ? (
                  <form onSubmit={handleSubmitWorkout} className="space-y-8">
                    {/* Grid for Date and Duration */}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="label-caps italic">Data</label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                          <input
                            type="date"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-12 pr-4 py-4 focus:ring-1 focus:ring-blue-500 transition-all font-bold text-white outline-none"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="label-caps italic">Minutos</label>
                        <div className="relative">
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                          <input
                            type="number"
                            placeholder="Duração"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-12 pr-4 py-4 focus:ring-1 focus:ring-blue-500 transition-all font-bold text-white placeholder:text-slate-600 outline-none"
                            value={formData.duration}
                            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* RPE Selector */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="label-caps italic">Nível de Esforço (RPE: 6-20)</label>
                        <span className="text-[10px] font-black text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded uppercase font-mono">
                          {formData.rpe}/20
                        </span>
                      </div>
                      
                      <div className="relative pt-2 pb-6">
                        <input 
                          type="range" min="6" max="20" 
                          value={formData.rpe}
                          onChange={(e) => setFormData({ ...formData, rpe: parseInt(e.target.value) })}
                          className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-blue-500 border border-slate-700 relative z-10" 
                        />
                        <div className="absolute top-2 left-0 w-full flex justify-between px-1 pointer-events-none">
                          {Array.from({ length: 15 }).map((_, idx) => (
                            <div key={idx} className={`w-0.5 h-2 rounded-full ${formData.rpe >= (idx + 6) ? 'bg-blue-500/50' : 'bg-slate-700'}`}></div>
                          ))}
                        </div>
                      </div>
                      
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={formData.rpe}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-xl bg-slate-900 border border-slate-700"
                        >
                          <div className="flex items-center gap-3">
                            <Zap className="w-5 h-5 text-blue-500" />
                            <span className="font-black uppercase tracking-tight text-[11px] text-white italic leading-tight">
                              {BORG_RPE_LABELS[formData.rpe]} ({formData.rpe})
                            </span>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-5 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 italic bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/20 active:scale-[0.98] disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"
                    >
                      <Save className="w-5 h-5" />
                      {isSubmitting ? 'Salvando...' : 'Confirmar Registro'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSubmitWellness} className="space-y-8">
                    {/* Recovery 6-20 */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="label-caps italic">Recuperação (TQR: 6-20)</label>
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded uppercase font-mono">
                          {wellnessData.recovery}/20
                        </span>
                      </div>
                      <div className="relative pt-2 pb-6">
                        <input 
                          type="range" min="6" max="20" 
                          value={wellnessData.recovery}
                          onChange={(e) => setWellnessData({...wellnessData, recovery: parseInt(e.target.value)})}
                          className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500 border border-slate-700 relative z-10" 
                        />
                        <div className="absolute top-2 left-0 w-full flex justify-between px-1 pointer-events-none">
                          {Array.from({ length: 15 }).map((_, idx) => (
                            <div key={idx} className={`w-0.5 h-2 rounded-full ${wellnessData.recovery >= (idx + 6) ? 'bg-emerald-500/50' : 'bg-slate-700'}`}></div>
                          ))}
                        </div>
                      </div>
                      
                      <motion.div 
                        key={wellnessData.recovery}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-slate-900 border border-slate-700 rounded-xl"
                      >
                        <p className="text-[11px] font-black text-white uppercase italic text-center leading-tight">
                          {TQR_LABELS[wellnessData.recovery]} ({wellnessData.recovery})
                        </p>
                      </motion.div>
                    </div>

                    {/* Grid for 1-5 metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                       <WellnessSlider 
                         label="Qualidade do Sono" 
                         value={wellnessData.sleep} 
                         onChange={(val) => setWellnessData({...wellnessData, sleep: val})} 
                         labels={WELLNESS_LABELS.sleep}
                       />
                       <WellnessSlider 
                         label="Nível de Estresse" 
                         value={wellnessData.stress} 
                         onChange={(val) => setWellnessData({...wellnessData, stress: val})} 
                         labels={WELLNESS_LABELS.stress}
                       />
                       <WellnessSlider 
                         label="Nível de Fadiga" 
                         value={wellnessData.fatigue} 
                         onChange={(val) => setWellnessData({...wellnessData, fatigue: val})} 
                         labels={WELLNESS_LABELS.fatigue}
                       />
                       <WellnessSlider 
                         label="Dor Muscular" 
                         value={wellnessData.soreness} 
                         onChange={(val) => setWellnessData({...wellnessData, soreness: val})} 
                         labels={WELLNESS_LABELS.soreness}
                       />
                    </div>

                    <div className="flex items-center gap-4 bg-slate-800/50 p-2 pl-4 rounded-xl border border-slate-700">
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">Ãrea do Aluno</p>
                        <p className="text-sm font-bold text-white">Treino & Saúde</p>
                      </div>
                      <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center font-black text-white italic">
                        {formData.athleteName ? formData.athleteName.substring(0, 2).toUpperCase() : 'AL'}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-5 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 italic bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 active:scale-[0.98] disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"
                    >
                      <Save className="w-5 h-5" />
                      {isSubmitting ? 'Salvando...' : 'Finalizar Bem-Estar'}
                    </button>
                  </form>
                )}
              </div>
            </div>
            
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setActiveTab(null)}
              className="w-full py-3 rounded-lg border border-slate-700 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-800 transition-all"
            >
              Voltar ao Menu
            </motion.button>
          </div>
        )}

        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-emerald-500 text-white p-4 rounded-xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest"
            >
              <CheckCircle2 className="w-5 h-5" />
              {activeTab === 'workout' ? 'Treino Salvo com Sucesso' : 'Bem-Estar Enviado com Sucesso'}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-center px-4 pt-4">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic leading-relaxed">
              &quot;A disciplina é a ponte entre metas e conquistas.&quot;
            </p>
        </div>
      </main>
    </div>
  );
}

function WellnessSlider({ label, value, onChange, labels }: { label: string, value: number, onChange: (val: number) => void, labels: string[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="label-caps italic">{label}</label>
        <span className="text-[10px] font-black text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded uppercase font-mono">
          {value}/5
        </span>
      </div>
      
      <div className="relative pt-2 pb-6">
        <input 
          type="range" min="1" max="5" 
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-blue-500 border border-slate-700 relative z-10" 
        />
        <div className="absolute top-2 left-0 w-full flex justify-between px-1 pointer-events-none">
          {[1, 2, 3, 4, 5].map((idx) => (
            <div key={idx} className={`w-0.5 h-2 rounded-full ${value >= idx ? 'bg-blue-500/50' : 'bg-slate-700'}`}></div>
          ))}
        </div>
      </div>

      <motion.div 
        key={value}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-3 bg-slate-900/50 border border-slate-700 rounded-xl"
      >
        <p className="text-[10px] font-black text-white uppercase italic text-center">
          {labels[value - 1]} ({value})
        </p>
      </motion.div>
    </div>
  );
}
