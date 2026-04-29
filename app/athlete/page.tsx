'use client'

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Clock, Zap, Calendar, CheckCircle2, Save, LogOut, FileText, Mail, User } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { logWorkout, logWellness, logAnamnesis, getUserRole } from '../actions';

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
  const [activeTab, setActiveTab] = useState<'workout' | 'wellness' | 'anamnesis' | null>(null);
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
  const [anamnesisData, setAnamnesisData] = useState({
    q1: false, q2: false, q3: false, q4: false, q5: false, q6: false, q7: false,
    isPhysicallyActive: false,
    hasKnownDisease: false,
    hasSymptoms: false,
    desiredIntensity: 'moderate' as 'moderate' | 'vigorous',
    // Novos campos ACSM/NSCA
    familyHistory: false,
    smoking: false,
    hypertension: false,
    diabetes: false,
    obesity: false,
    previousInjuries: '',
    details: ''
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

  const handleSubmitWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.duration) return alert('Informe a duração.');
    setIsSubmitting(true);
    try {
      await logWorkout(user.id, {
        athleteName: formData.athleteName,
        rpe: formData.rpe,
        duration: Number(formData.duration),
        date: formData.date,
      });
      setShowSuccess(true);
      setFormData(prev => ({ ...prev, duration: '', rpe: 6 }));
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      alert('Erro ao salvar treino.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitWellness = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await logWellness(user.id, {
        athleteName: formData.athleteName,
        ...wellnessData,
        date: formData.date,
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      alert('Erro ao salvar wellness.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAnamnesis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      await logAnamnesis(user.id, {
        athleteName: formData.athleteName,
        ...anamnesisData
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      alert('Erro ao salvar anamnese.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 font-sans pb-20">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => activeTab ? setActiveTab(null) : window.location.href = role === 'admin' ? '/admin' : '/'} className="p-2 -ml-2 text-slate-400 hover:text-blue-500 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex flex-col items-center">
            <Link href="/" className="bg-black text-emerald-500 border-2 border-emerald-500 font-black px-2.5 py-0.5 rounded-lg text-lg italic skew-x-[-10deg]">WMPS</Link>
          </div>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 mt-8 space-y-8">
        {!activeTab ? (
          <div className="grid grid-cols-1 gap-6 py-12">
            <MenuCard title="Anamnese" sub="Triagem Inicial" icon={<FileText className="w-12 h-12 text-purple-500" />} onClick={() => setActiveTab('anamnesis')} color="hover:border-purple-500/50" />
            <MenuCard title="Wellness" sub="Pré-Treino" icon={<Zap className="w-12 h-12 text-emerald-500" />} onClick={() => setActiveTab('wellness')} color="hover:border-emerald-500/50" />
            <MenuCard title="Carga Treino" sub="Pós-Treino" icon={<Clock className="w-12 h-12 text-blue-500" />} onClick={() => setActiveTab('workout')} color="hover:border-blue-500/50" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bento-card bg-slate-800 border-slate-700 shadow-xl overflow-hidden p-0">
              <div className={`px-8 py-4 ${activeTab === 'workout' ? 'bg-blue-600' : activeTab === 'wellness' ? 'bg-emerald-600' : 'bg-purple-600'}`}>
                <h2 className="text-sm font-black text-white uppercase italic">{activeTab === 'workout' ? 'Treino' : activeTab === 'wellness' ? 'Wellness' : 'Anamnese'}</h2>
              </div>
              
              <div className="p-8 space-y-8">
                {activeTab === 'workout' && (
                  <form onSubmit={handleSubmitWorkout} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Data" type="date" value={formData.date} onChange={(v: string) => setFormData({...formData, date: v})} />
                      <Input label="Minutos" type="number" value={formData.duration} onChange={(v: string) => setFormData({...formData, duration: v})} />
                    </div>
                    <RPESelector value={formData.rpe} onChange={(v: number) => setFormData({...formData, rpe: v})} />
                    <SubmitButton loading={isSubmitting} />
                  </form>
                )}

                {activeTab === 'wellness' && (
                  <form onSubmit={handleSubmitWellness} className="space-y-8">
                    <RPESelector label="Recuperação (TQR)" value={wellnessData.recovery} onChange={(v: number) => setWellnessData({...wellnessData, recovery: v})} labels={TQR_LABELS} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <WellnessSlider label="Sono" value={wellnessData.sleep} onChange={(v: number) => setWellnessData({...wellnessData, sleep: v})} labels={WELLNESS_LABELS.sleep} />
                      <WellnessSlider label="Estresse" value={wellnessData.stress} onChange={(v: number) => setWellnessData({...wellnessData, stress: v})} labels={WELLNESS_LABELS.stress} />
                      <WellnessSlider label="Fadiga" value={wellnessData.fatigue} onChange={(v: number) => setWellnessData({...wellnessData, fatigue: v})} labels={WELLNESS_LABELS.fatigue} />
                      <WellnessSlider label="Dor" value={wellnessData.soreness} onChange={(v: number) => setWellnessData({...wellnessData, soreness: v})} labels={WELLNESS_LABELS.soreness} />
                    </div>
                    <SubmitButton loading={isSubmitting} color="bg-emerald-600 hover:bg-emerald-500" />
                  </form>
                )}

                {activeTab === 'anamnesis' && (
                  <form onSubmit={handleSubmitAnamnesis} className="space-y-8">
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-purple-400 uppercase italic">PAR-Q+ 2014</p>
                      {[
                        { id: 'q1', text: 'Problema de coração ou pressão alta?' },
                        { id: 'q2', text: 'Dor no peito em repouso ou esforço?' },
                        { id: 'q3', text: 'Tontura ou perda de consciência?' },
                        { id: 'q4', text: 'Outra condição crônica diagnosticada?' },
                        { id: 'q5', text: 'Toma remédio para condição crônica?' },
                        { id: 'q6', text: 'Problema ósseo/articular que piora com exercício?' },
                        { id: 'q7', text: 'Remédio para coração ou pressão?' },
                      ].map(q => (
                        <div key={q.id} className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-700 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-300 uppercase">{q.text}</span>
                          <div className="flex gap-2">
                            <BinaryToggle active={anamnesisData[q.id as keyof typeof anamnesisData] as boolean} onToggle={(v: boolean) => setAnamnesisData({...anamnesisData, [q.id]: v})} />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4 border-t border-slate-700 pt-6">
                      <p className="text-[10px] font-black text-blue-400 uppercase italic">Fatores de Risco (ACSM/NSCA)</p>
                      <ToggleItem label="Ativo regular? (3x/sem, 30min, 3m)" active={anamnesisData.isPhysicallyActive} onToggle={(v: boolean) => setAnamnesisData({...anamnesisData, isPhysicallyActive: v})} />
                      <ToggleItem label="Doença CV, Metabólica ou Renal?" active={anamnesisData.hasKnownDisease} onToggle={(v: boolean) => setAnamnesisData({...anamnesisData, hasKnownDisease: v})} />
                      <ToggleItem label="Sintomas (Dor, Falta de ar, Tontura)?" active={anamnesisData.hasSymptoms} onToggle={(v: boolean) => setAnamnesisData({...anamnesisData, hasSymptoms: v})} />
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ToggleItem label="Histórico Familiar (Infarto/Morte Súbita)?" active={anamnesisData.familyHistory} onToggle={(v: boolean) => setAnamnesisData({...anamnesisData, familyHistory: v})} />
                        <ToggleItem label="Fumante (ou parou há < 6 meses)?" active={anamnesisData.smoking} onToggle={(v: boolean) => setAnamnesisData({...anamnesisData, smoking: v})} />
                        <ToggleItem label="Hipertensão (>= 140/90 ou remédio)?" active={anamnesisData.hypertension} onToggle={(v: boolean) => setAnamnesisData({...anamnesisData, hypertension: v})} />
                        <ToggleItem label="Diabetes ou Glicose Elevada?" active={anamnesisData.diabetes} onToggle={(v: boolean) => setAnamnesisData({...anamnesisData, diabetes: v})} />
                        <ToggleItem label="Obesidade (IMC > 30 ou Cintura Larga)?" active={anamnesisData.obesity} onToggle={(v: boolean) => setAnamnesisData({...anamnesisData, obesity: v})} />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase italic">Histórico de Lesões (Ossos, Músculos, Articulações)</label>
                        <textarea 
                          value={anamnesisData.previousInjuries}
                          onChange={(e) => setAnamnesisData({...anamnesisData, previousInjuries: e.target.value})}
                          placeholder="Descreva lesões anteriores ou cirurgias..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-white focus:ring-1 focus:ring-blue-500 outline-none h-24"
                        />
                      </div>

                      <div className="space-y-4 pt-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase italic">Intensidade Desejada</p>
                        <div className="grid grid-cols-2 gap-4">
                          <button type="button" onClick={() => setAnamnesisData({...anamnesisData, desiredIntensity: 'moderate'})} className={`py-3 rounded-xl text-[10px] font-black uppercase italic border ${anamnesisData.desiredIntensity === 'moderate' ? 'bg-blue-600 border-blue-500' : 'bg-slate-900'}`}>Moderada</button>
                          <button type="button" onClick={() => setAnamnesisData({...anamnesisData, desiredIntensity: 'vigorous'})} className={`py-3 rounded-xl text-[10px] font-black uppercase italic border ${anamnesisData.desiredIntensity === 'vigorous' ? 'bg-purple-600 border-purple-500' : 'bg-slate-900'}`}>Vigorosa</button>
                        </div>
                      </div>
                    </div>
                    <SubmitButton loading={isSubmitting} color="bg-purple-600 hover:bg-purple-500" />
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
      </main>
    </div>
  );
}

function MenuCard({ title, sub, icon, onClick, color }: { title: string, sub: string, icon: React.ReactNode, onClick: () => void, color: string }) {
  return (
    <motion.button whileHover={{ y: -5 }} onClick={onClick} className={`p-8 bg-slate-800 border border-slate-700 rounded-[2rem] transition-all text-left relative overflow-hidden ${color}`}>
      <div className="absolute top-0 right-0 p-8 opacity-10">{icon}</div>
      <h3 className="text-2xl font-black text-white uppercase italic">{title}</h3>
      <p className="text-slate-500 text-[10px] font-bold uppercase mt-2">{sub}</p>
    </motion.button>
  );
}

function Input({ label, type, value, onChange }: { label: string, type: string, value: string, onChange: (val: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-500 uppercase italic">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold outline-none focus:ring-1 focus:ring-blue-500" />
    </div>
  );
}

function RPESelector({ value, onChange, label = 'Nível de Esforço (6-20)', labels = BORG_RPE_LABELS }: { value: number, onChange: (val: number) => void, label?: string, labels?: Record<number, string> }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between"><label className="text-[10px] font-black text-slate-500 uppercase italic">{label}</label><span className="text-[10px] font-black text-blue-400">{value}/20</span></div>
      <input type="range" min="6" max="20" value={value} onChange={e => onChange(parseInt(e.target.value))} className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-blue-500" />
      <div className="p-4 bg-slate-900 rounded-xl text-center text-[11px] font-black text-white uppercase italic">{labels[value]}</div>
    </div>
  );
}

function WellnessSlider({ label, value, onChange, labels }: { label: string, value: number, onChange: (val: number) => void, labels: string[] }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between"><label className="text-[10px] font-black text-slate-500 uppercase italic">{label}</label><span className="text-[10px] font-black text-emerald-400">{value}/5</span></div>
      <input type="range" min="1" max="5" value={value} onChange={e => onChange(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
      <div className="p-2 bg-slate-900/50 rounded-lg text-center text-[9px] font-black text-white uppercase italic">{labels[value-1]}</div>
    </div>
  );
}

function BinaryToggle({ active, onToggle }: { active: boolean, onToggle: (val: boolean) => void }) {
  return (
    <div className="flex gap-1">
      <button type="button" onClick={() => onToggle(true)} className={`px-3 py-1 rounded text-[9px] font-black uppercase ${active ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'}`}>Sim</button>
      <button type="button" onClick={() => onToggle(false)} className={`px-3 py-1 rounded text-[9px] font-black uppercase ${!active ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-500'}`}>Não</button>
    </div>
  );
}

function ToggleItem({ label, active, onToggle }: { label: string, active: boolean, onToggle: (val: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-700 rounded-xl">
      <span className="text-[9px] font-bold text-slate-400 uppercase pr-4">{label}</span>
      <BinaryToggle active={active} onToggle={onToggle} />
    </div>
  );
}

function SubmitButton({ loading, color = 'bg-blue-600 hover:bg-blue-500' }: { loading: boolean, color?: string }) {
  return (
    <button type="submit" disabled={loading} className={`w-full py-5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 italic text-white transition-all ${color} disabled:bg-slate-700`}>
      <Save className="w-5 h-5" /> {loading ? 'Enviando...' : 'Finalizar e Enviar'}
    </button>
  );
}
