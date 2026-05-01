'use client'

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Clock, Zap, CheckCircle2, Save, FileText, User, Dumbbell, Activity, Timer, MoveHorizontal, Footprints, Camera, Edit2, Check } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { logWorkout, logWellness, logAnamnesis, getUserRole, getActivePrescription, completeTraining, updateProfilePhoto } from '../actions';
import ForcePasswordReset from '../components/ForcePasswordReset';

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
  const [activeTab, setActiveTab] = useState<'workout' | 'wellness' | 'anamnesis' | 'training' | null>(null);
  const [formData, setFormData] = useState({
    athleteName: '',
    duration: '',
    rpe: 6,
    date: new Date().toISOString().split('T')[0],
    series: '',
    reps: '',
    weight: '',
    distance: '',
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
  const [role, setRole] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [activePrescription, setActivePrescription] = useState<any>(null);
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({});
  const [profile, setProfile] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
        setFormData(prev => ({ ...prev, athleteName: profileData.full_name }));
      }

      const prescription = await getActivePrescription(session.user.id);
      setActivePrescription(prescription);
    }
    checkAuth();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !supabase) return;

    try {
      setIsUploading(true);
      
      // 1. Upload para o Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Pegar URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      // 3. Atualizar Perfil no Banco
      const res = await updateProfilePhoto(user.id, publicUrl);
      
      if (res.success) {
        setProfile({ ...profile, photo_url: publicUrl });
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        throw new Error(res.error);
      }
    } catch (error: any) {
      alert('Erro ao fazer upload: ' + (error.message || 'Verifique se o bucket "profiles" existe no Supabase.'));
    } finally {
      setIsUploading(false);
    }
  };

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
        series: Number(formData.series) || 0,
        reps: Number(formData.reps) || 0,
        volume: (Number(formData.series) || 0) * (Number(formData.reps) || 0) * (Number(formData.weight) || 0),
        distance: Number(formData.distance) || 0,
      });
      setShowSuccess(true);
      setFormData(prev => ({ ...prev, duration: '', rpe: 6, series: '', reps: '', weight: '', distance: '' }));
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

  const handleCompleteTraining = async () => {
    if (!activePrescription) return;
    const allKeys = getPrescriptionKeys(activePrescription.data);
    const completedCount = allKeys.filter(k => completedExercises[k]).length;
    if (completedCount === 0) return alert('Marque pelo menos um bloco como concluído.');
    
    setIsSubmitting(true);
    try {
      const res = await completeTraining(activePrescription.id, {
        athleteId: user.id,
        athleteName: formData.athleteName,
        completedBlocks: completedCount,
        totalBlocks: allKeys.length,
      });

      if (res.success) {
        setShowSuccess(true);
        setActivePrescription(null);
        setCompletedExercises({});
        setActiveTab(null);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        alert('Erro ao concluir treino: ' + res.error);
      }
    } catch (error) {
      alert('Erro ao salvar conclusão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  function getPrescriptionKeys(data: any): string[] {
    if (!data) return [];
    return Object.keys(data).filter(k => {
      if (k === 'prevVolume') return false;
      const v = data[k];
      if (!v || typeof v !== 'object') return false;
      return Object.values(v).some(val => !!val);
    });
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 font-sans pb-20">
      {user?.id && <ForcePasswordReset userId={user.id} />}
      <header className="bg-slate-900/50 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-xl mx-auto px-6 h-20 flex items-center justify-between">
          <button onClick={() => activeTab ? setActiveTab(null) : window.location.href = role === 'admin' ? '/admin' : '/'} className="p-2 -ml-2 text-slate-400 hover:text-emerald-500 transition-all hover:scale-110">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex flex-col items-center gap-1">
            <div className="bg-black text-emerald-500 border-2 border-emerald-500 font-black px-4 py-1 rounded-lg text-lg italic skew-x-[-15deg] shadow-[0_0_20px_rgba(16,185,129,0.3)] border-l-4">
              WMPS
            </div>
            <div className="text-center">
              <h1 className="text-[8px] font-black leading-tight text-white uppercase italic tracking-[0.1em]">William Moreira</h1>
              <p className="text-[6px] text-emerald-500 uppercase tracking-[0.3em] font-black -mt-0.5">Performance System</p>
            </div>
          </div>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 mt-8 space-y-8 relative">
        {/* Profile Identity Section */}
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 blur-3xl rounded-[3rem] -z-10"></div>
          
          <div className="flex flex-col items-center text-center space-y-4 py-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden bg-slate-800 border-2 border-emerald-500/20 shadow-2xl relative">
                {profile?.photo_url ? (
                  <img src={profile.photo_url} alt={profile.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-900">
                    <User className="w-12 h-12 text-slate-700" />
                  </div>
                )}
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 disabled:opacity-100"
                >
                  {isUploading ? (
                    <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Camera className="w-8 h-8 text-white" />
                      <span className="text-[8px] font-black text-white uppercase tracking-widest">Mudar Foto</span>
                    </div>
                  )}
                </button>
              </div>
              
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>

            <div className="space-y-1">
              <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">{profile?.full_name || 'Carregando...'}</h2>
              {profile?.team_name ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black text-emerald-400 uppercase italic tracking-widest">
                    Atleta da equipe {profile.team_name}
                  </span>
                </div>
              ) : (
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Atleta Individual</p>
              )}
            </div>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="fixed top-1/4 -left-20 w-64 h-64 bg-emerald-500/10 blur-[100px] pointer-events-none rounded-full"></div>
        <div className="fixed bottom-1/4 -right-20 w-64 h-64 bg-blue-500/10 blur-[100px] pointer-events-none rounded-full"></div>

        {!activeTab ? (
          <div className="grid grid-cols-1 gap-6 py-8">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <MenuCard 
                title="Anamnese" 
                sub="Fase 0: Triagem Clínica" 
                icon={<FileText className="w-10 h-10 text-purple-400" />} 
                onClick={() => setActiveTab('anamnesis')} 
                color="bg-slate-800/80 hover:bg-slate-800 border-white/5 hover:border-purple-500/30"
                accentColor="from-purple-500/20 to-transparent"
              />
            </div>
            
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <MenuCard 
                title="PRÉ-TREINO" 
                sub="Diário de Prontidão" 
                icon={<Zap className="w-10 h-10 text-emerald-400" />} 
                onClick={() => setActiveTab('wellness')} 
                color="bg-slate-800/80 hover:bg-slate-800 border-white/5 hover:border-emerald-500/30"
                accentColor="from-emerald-500/20 to-transparent"
              />
            </div>

            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <MenuCard 
                title="PÓS-TREINO" 
                sub="Monitoramento PSE" 
                icon={<Clock className="w-10 h-10 text-blue-400" />} 
                onClick={() => setActiveTab('workout')} 
                color="bg-slate-800/80 hover:bg-slate-800 border-white/5 hover:border-blue-500/30"
                accentColor="from-blue-500/20 to-transparent"
              />
            </div>

            {activePrescription && (
               <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-[2rem] blur opacity-30 animate-pulse transition duration-1000"></div>
                <MenuCard 
                  title="Prescrição" 
                  sub="Treinamento Pendente" 
                  icon={<Dumbbell className="w-10 h-10 text-yellow-400" />} 
                  onClick={() => setActiveTab('training')} 
                  color="bg-slate-800/80 hover:bg-slate-800 border-white/5 hover:border-yellow-500/30"
                  accentColor="from-yellow-500/20 to-transparent"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bento-card bg-slate-800 border-slate-700 shadow-xl overflow-hidden p-0">
              <div className={`px-8 py-4 ${activeTab === 'workout' ? 'bg-blue-600' : activeTab === 'wellness' ? 'bg-emerald-600' : activeTab === 'training' ? 'bg-yellow-600' : 'bg-purple-600'}`}>
                <h2 className="text-sm font-black text-white uppercase italic">{activeTab === 'workout' ? 'Pós-Treino' : activeTab === 'wellness' ? 'Pré-Treino' : activeTab === 'training' ? 'Prescrição do Treinador' : 'Anamnese'}</h2>
              </div>
              
              <div className="p-8 space-y-8">
                {activeTab === 'workout' && (
                  <form onSubmit={handleSubmitWorkout} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input label="Data do Treino" type="date" value={formData.date} onChange={(v: string) => setFormData({...formData, date: v})} />
                      <Input label="Duração Total (minutos)" type="number" value={formData.duration} onChange={(v: string) => setFormData({...formData, duration: v})} />
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
                    {/* Bloco PAR-Q+ */}
                    <div className="bg-slate-900/60 p-6 rounded-[2rem] border border-slate-800 shadow-xl space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/30">
                          <FileText className="w-5 h-5 text-purple-400" />
                        </div>
                        <h3 className="text-sm font-black text-white uppercase italic tracking-widest">PAR-Q+ 2014</h3>
                      </div>
                      
                      <div className="space-y-3">
                        {[
                          { id: 'q1', text: 'Problema de coração ou pressão alta?' },
                          { id: 'q2', text: 'Dor no peito em repouso ou esforço?' },
                          { id: 'q3', text: 'Tontura ou perda de consciência?' },
                          { id: 'q4', text: 'Outra condição crônica diagnosticada?' },
                          { id: 'q5', text: 'Toma remédio para condição crônica?' },
                          { id: 'q6', text: 'Problema ósseo/articular que piora com exercício?' },
                          { id: 'q7', text: 'Remédio para coração ou pressão?' },
                        ].map(q => (
                          <div key={q.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-950/50 border border-slate-800/80 rounded-2xl gap-4 hover:border-purple-500/30 transition-colors">
                            <span className="text-[11px] font-bold text-slate-300 uppercase leading-relaxed">{q.text}</span>
                            <div className="flex-shrink-0 self-start sm:self-auto">
                              <BinaryToggle active={anamnesisData[q.id as keyof typeof anamnesisData] as boolean} onToggle={(v: boolean) => setAnamnesisData({...anamnesisData, [q.id]: v})} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bloco Fatores de Risco */}
                    <div className="bg-slate-900/60 p-6 rounded-[2rem] border border-slate-800 shadow-xl space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/30">
                          <Activity className="w-5 h-5 text-blue-400" />
                        </div>
                        <h3 className="text-sm font-black text-white uppercase italic tracking-widest">Fatores de Risco</h3>
                      </div>

                      <div className="space-y-3">
                        <ToggleItem label="Ativo regular? (3x/sem, 30min, 3m)" active={anamnesisData.isPhysicallyActive} onToggle={(v: boolean) => setAnamnesisData({...anamnesisData, isPhysicallyActive: v})} />
                        <ToggleItem label="Doença CV, Metabólica ou Renal?" active={anamnesisData.hasKnownDisease} onToggle={(v: boolean) => setAnamnesisData({...anamnesisData, hasKnownDisease: v})} />
                        <ToggleItem label="Sintomas (Dor, Falta de ar, Tontura)?" active={anamnesisData.hasSymptoms} onToggle={(v: boolean) => setAnamnesisData({...anamnesisData, hasSymptoms: v})} />
                        <ToggleItem label="Histórico Familiar (Infarto/Morte Súbita)?" active={anamnesisData.familyHistory} onToggle={(v: boolean) => setAnamnesisData({...anamnesisData, familyHistory: v})} />
                        <ToggleItem label="Fumante (ou parou há < 6 meses)?" active={anamnesisData.smoking} onToggle={(v: boolean) => setAnamnesisData({...anamnesisData, smoking: v})} />
                        <ToggleItem label="Hipertensão (>= 140/90 ou remédio)?" active={anamnesisData.hypertension} onToggle={(v: boolean) => setAnamnesisData({...anamnesisData, hypertension: v})} />
                        <ToggleItem label="Diabetes ou Glicose Elevada?" active={anamnesisData.diabetes} onToggle={(v: boolean) => setAnamnesisData({...anamnesisData, diabetes: v})} />
                        <ToggleItem label="Obesidade (IMC > 30 ou Cintura Larga)?" active={anamnesisData.obesity} onToggle={(v: boolean) => setAnamnesisData({...anamnesisData, obesity: v})} />
                      </div>
                      
                      <div className="pt-4 space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Histórico de Lesões</label>
                        <textarea 
                          value={anamnesisData.previousInjuries}
                          onChange={(e) => setAnamnesisData({...anamnesisData, previousInjuries: e.target.value})}
                          placeholder="Ossos, músculos, articulações ou cirurgias..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-xs font-bold text-white focus:border-blue-500 outline-none h-32 transition-colors resize-none"
                        />
                      </div>

                      <div className="pt-4 space-y-3">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Intensidade Desejada</p>
                        <div className="grid grid-cols-2 gap-3">
                          <button type="button" onClick={() => setAnamnesisData({...anamnesisData, desiredIntensity: 'moderate'})} className={`py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border-2 ${anamnesisData.desiredIntensity === 'moderate' ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20 scale-[1.02]' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}>Moderada</button>
                          <button type="button" onClick={() => setAnamnesisData({...anamnesisData, desiredIntensity: 'vigorous'})} className={`py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border-2 ${anamnesisData.desiredIntensity === 'vigorous' ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-500/20 scale-[1.02]' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}>Vigorosa</button>
                        </div>
                      </div>
                    </div>

                    <SubmitButton loading={isSubmitting} color="bg-purple-600 hover:bg-purple-500" />
                  </form>
                )}

                {activeTab === 'training' && activePrescription && (() => {
                  const prescKeys = getPrescriptionKeys(activePrescription.data);
                  const completedCount = prescKeys.filter(k => completedExercises[k]).length;
                  const totalCount = prescKeys.length;
                  const allDone = completedCount === totalCount && totalCount > 0;

                  const blockMeta: Record<string, { label: string; icon: React.ReactNode; color: string; accent: string }> = {
                    strength:      { label: 'Força',        icon: <Dumbbell className="w-5 h-5" />,       color: 'text-blue-400',    accent: 'border-blue-500/40 bg-blue-500/5' },
                    hiit:          { label: 'HIIT',         icon: <Zap className="w-5 h-5" />,            color: 'text-emerald-400', accent: 'border-emerald-500/40 bg-emerald-500/5' },
                    continuous:    { label: 'Contínuo',     icon: <Activity className="w-5 h-5" />,       color: 'text-cyan-400',    accent: 'border-cyan-500/40 bg-cyan-500/5' },
                    powerTraining: { label: 'Potência',     icon: <Zap className="w-5 h-5" />,            color: 'text-yellow-400',  accent: 'border-yellow-500/40 bg-yellow-500/5' },
                    cardio:        { label: 'Cardio',       icon: <Timer className="w-5 h-5" />,          color: 'text-emerald-400', accent: 'border-emerald-500/40 bg-emerald-500/5' },
                    agility:       { label: 'Agilidade',    icon: <Footprints className="w-5 h-5" />,     color: 'text-cyan-400',    accent: 'border-cyan-500/40 bg-cyan-500/5' },
                    flexibility:   { label: 'Flexibilidade',icon: <MoveHorizontal className="w-5 h-5" />, color: 'text-purple-400',  accent: 'border-purple-500/40 bg-purple-500/5' },
                  };

                  const fieldLabels: Record<string, string> = {
                    type: 'Tipo', method: 'Método', intensity: 'Intensidade', duration: 'Volume/Duração',
                    restSeries: 'Desc. Séries', restReps: 'Desc. Reps', protocol: 'Protocolo',
                    workDur: 'Estímulo (s)', recDur: 'Recuperação (s)', series: 'Séries',
                    reps: 'Reps', workInt: 'Velocidade (km/h)', bSeriesDur: 'Desc. Entre Séries',
                    modality: 'Modalidade', drill: 'Exercício/Drill', rest: 'Descanso',
                    jumpType: 'Tipo de Salto', height: 'Altura (cm)', load: 'Carga Extra',
                    experience: 'Nível', notes: 'Observações', distance: 'Distância (m)', weight: 'Carga (kg)'
                  };

                  return (
                    <div className="space-y-6">
                      {/* Progress Header */}
                      <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[10px] font-black text-slate-500 uppercase italic tracking-widest">Progresso da Sessão</p>
                          <span className={`text-sm font-black italic ${ allDone ? 'text-emerald-400' : 'text-yellow-400' }`}>
                            {completedCount}/{totalCount}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${ allDone ? 'bg-emerald-500' : 'bg-yellow-500' }`}
                            animate={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                          />
                        </div>
                        <p className="text-[9px] text-slate-600 font-bold uppercase mt-2 italic">
                          Marque cada bloco conforme executar. O PSE será registrado no Pós-Treino.
                        </p>
                      </div>

                      {/* Prescription Blocks */}
                      <div className="space-y-4">
                        {prescKeys.map(key => {
                          const value = activePrescription.data[key];
                          const meta = blockMeta[key] || { label: key, icon: <Dumbbell className="w-5 h-5" />, color: 'text-slate-400', accent: 'border-slate-700 bg-slate-900/30' };
                          const done = completedExercises[key] || false;

                          return (
                            <motion.div
                              key={key}
                              layout
                              className={`rounded-2xl border p-5 transition-all duration-300 ${
                                done ? 'border-emerald-500/60 bg-emerald-500/5 opacity-80' : meta.accent
                              }`}
                            >
                              {/* Block Header */}
                              <button
                                type="button"
                                onClick={() => setCompletedExercises(prev => ({ ...prev, [key]: !done }))}
                                className="w-full flex items-center justify-between gap-4 group"
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-xl bg-slate-900 border border-slate-800 ${ done ? 'opacity-50' : meta.color }`}>
                                    {meta.icon}
                                  </div>
                                  <div className="text-left">
                                    <p className={`text-xs font-black uppercase italic ${ done ? 'text-emerald-400 line-through decoration-emerald-500/50' : 'text-white' }`}>
                                      {meta.label}
                                    </p>
                                    {value.protocol && <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">{value.protocol}</p>}
                                    {value.modality && !value.protocol && <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">{value.modality}</p>}
                                    {value.drill && <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">{value.drill}</p>}
                                  </div>
                                </div>
                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                  done
                                    ? 'bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/30'
                                    : 'bg-transparent border-slate-600 group-hover:border-yellow-500'
                                }`}>
                                  {done && <CheckCircle2 className="w-5 h-5 text-white" />}
                                </div>
                              </button>

                              {/* Block Details (collapsed when done) */}
                              <AnimatePresence>
                                {!done && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="overflow-hidden"
                                  >
                                    {Array.isArray(value) ? (
                                      <div className="space-y-4 mt-5 pt-4 border-t border-white/5">
                                        {value.map((ex, i) => (
                                          <div key={i} className="p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                                            <div className="flex justify-between items-start mb-2">
                                              <p className="text-[10px] font-black text-white uppercase italic">{ex.name || 'Exercício'}</p>
                                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 uppercase">{ex.intensity}</span>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                                              {ex.type && (
                                                <div className="col-span-full mb-1">
                                                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500 uppercase">{ex.type}</span>
                                                </div>
                                              )}
                                              <div>
                                                <p className="text-[7px] font-black text-slate-600 uppercase">Séries x Reps</p>
                                                <p className="text-[10px] font-bold text-white">{ex.sets} x {ex.reps}</p>
                                              </div>
                                              {ex.weight && (
                                                <div>
                                                  <p className="text-[7px] font-black text-slate-600 uppercase">Carga</p>
                                                  <p className="text-[10px] font-bold text-emerald-400">{ex.weight}kg</p>
                                                </div>
                                              )}
                                              {ex.jumpType && (
                                                <div>
                                                  <p className="text-[7px] font-black text-slate-600 uppercase">Salto</p>
                                                  <p className="text-[10px] font-bold text-orange-400">{ex.jumpType === 'bipodal' ? 'Bipodal' : 'Unipodal'}</p>
                                                </div>
                                              )}
                                              {ex.distance && (
                                                <div>
                                                  <p className="text-[7px] font-black text-slate-600 uppercase">Distância</p>
                                                  <p className="text-[10px] font-bold text-cyan-400">{ex.distance}m</p>
                                                </div>
                                              )}
                                              {ex.velocity && (
                                                <div>
                                                  <p className="text-[7px] font-black text-slate-600 uppercase">Velocidade</p>
                                                  <p className="text-[10px] font-bold text-yellow-500">{ex.velocity} km/h</p>
                                                </div>
                                              )}
                                              {ex.duration && (
                                                <div>
                                                  <p className="text-[7px] font-black text-slate-600 uppercase">Tempo Alvo</p>
                                                  <p className="text-[10px] font-bold text-cyan-400">{ex.duration}s</p>
                                                </div>
                                              )}
                                              {ex.rest && (
                                                <div>
                                                  <p className="text-[7px] font-black text-slate-600 uppercase">Descanso</p>
                                                  <p className="text-[10px] font-bold text-slate-400">{ex.rest}</p>
                                                </div>
                                              )}
                                              {/* Cardio specific fields */}
                                              {ex.workDur && (
                                                <div>
                                                  <p className="text-[7px] font-black text-slate-600 uppercase">Estímulo</p>
                                                  <p className="text-[10px] font-bold text-white">{ex.workDur}s</p>
                                                </div>
                                              )}
                                              {ex.recDur && (
                                                <div>
                                                  <p className="text-[7px] font-black text-slate-600 uppercase">Recup.</p>
                                                  <p className="text-[10px] font-bold text-slate-400">{ex.recDur}s</p>
                                                </div>
                                              )}
                                              {ex.duration && !ex.workDur && (
                                                <div>
                                                  <p className="text-[7px] font-black text-slate-600 uppercase">Duração</p>
                                                  <p className="text-[10px] font-bold text-white">{ex.duration} min</p>
                                                </div>
                                              )}
                                              {ex.totalKm && Number(ex.totalKm) > 0 && (
                                                <div className="col-span-full mt-1 p-2 bg-slate-950 rounded-lg flex gap-4 border border-slate-800/50">
                                                  <div><p className="text-[7px] font-black text-slate-600 uppercase italic">Vol. Previsto</p><p className="text-[10px] font-bold text-emerald-400">{ex.totalKm} km</p></div>
                                                  {ex.totalTime && <div><p className="text-[7px] font-black text-slate-600 uppercase italic">Tempo</p><p className="text-[10px] font-bold text-cyan-400">{ex.totalTime} min</p></div>}
                                                </div>
                                              )}
                                              {ex.notes && (
                                                <div className="col-span-full">
                                                  <p className="text-[7px] font-black text-slate-600 uppercase">Obs</p>
                                                  <p className="text-[10px] text-slate-400 italic leading-tight">{ex.notes}</p>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-5 pt-4 border-t border-white/5">
                                        {Object.entries(value).map(([field, val]) => {
                                          if (!val || ['totalKm','totalTime','totalContacts','experience'].includes(field)) return null;
                                          return (
                                            <div key={field}>
                                              <p className="text-[8px] font-black text-slate-600 uppercase">{fieldLabels[field] || field}</p>
                                              <p className="text-[11px] font-bold text-white mt-0.5">{val as string}</p>
                                            </div>
                                          );
                                        })}
                                        {value.totalKm && Number(value.totalKm) > 0 && (
                                          <div className="col-span-2 mt-1 p-2 bg-slate-900 rounded-xl flex gap-4">
                                            <div><p className="text-[8px] font-black text-slate-600 uppercase">Volume KM</p><p className="text-[11px] font-bold text-emerald-400">{value.totalKm} km</p></div>
                                            {value.totalTime && <div><p className="text-[8px] font-black text-slate-600 uppercase">Tempo</p><p className="text-[11px] font-bold text-cyan-400">{value.totalTime} min</p></div>}
                                          </div>
                                        )}
                                        {value.totalContacts && Number(value.totalContacts) > 0 && (
                                          <div className="col-span-2 mt-1 p-2 bg-slate-900 rounded-xl">
                                            <p className="text-[8px] font-black text-slate-600 uppercase">Contatos Totais</p>
                                            <p className="text-[11px] font-bold text-orange-400">{value.totalContacts}</p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* Finish Button */}
                      <motion.button
                        type="button"
                        onClick={handleCompleteTraining}
                        disabled={isSubmitting || completedCount === 0}
                        whileTap={{ scale: 0.97 }}
                        className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 italic text-white transition-all ${
                          allDone
                            ? 'bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-600/20'
                            : completedCount > 0
                            ? 'bg-yellow-600 hover:bg-yellow-500'
                            : 'bg-slate-800 cursor-not-allowed text-slate-500'
                        } disabled:opacity-60`}
                      >
                        <CheckCircle2 className={`w-5 h-5 ${ isSubmitting ? 'animate-spin' : '' }`} />
                        {isSubmitting
                          ? 'Enviando...'
                          : allDone
                          ? 'Treino Completo — Confirmar!'
                          : completedCount > 0
                          ? `Concluir com ${completedCount}/${totalCount} blocos`
                          : 'Marque ao menos 1 bloco'
                        }
                      </motion.button>

                      <p className="text-center text-[9px] text-slate-600 font-bold uppercase italic">
                        Após confirmar, registre o PSE e duração real na aba "Carga Treino"
                      </p>
                    </div>
                  );
                })()}
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

function MenuCard({ title, sub, icon, onClick, color, accentColor }: { title: string, sub: string, icon: React.ReactNode, onClick: () => void, color: string, accentColor: string }) {
  return (
    <motion.button 
      whileHover={{ scale: 1.02, y: -4 }} 
      whileTap={{ scale: 0.98 }}
      onClick={onClick} 
      className={`w-full p-8 rounded-[2rem] border backdrop-blur-xl transition-all text-left relative overflow-hidden shadow-2xl ${color}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${accentColor} opacity-50`}></div>
      <div className="relative z-10 flex justify-between items-start">
        <div>
          <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">{title}</h3>
          <p className="text-slate-400 text-[10px] font-black uppercase mt-1 tracking-widest opacity-80">{sub}</p>
        </div>
        <div className="p-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
          {icon}
        </div>
      </div>
      
      {/* Decorative arrow */}
      <div className="absolute bottom-6 right-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 rotate-180 text-white" />
        </div>
      </div>
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
    <div className="space-y-4 p-6 bg-slate-900/60 rounded-[2rem] border border-slate-800 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500 opacity-5 rounded-bl-full blur-2xl"></div>
      
      <div className="flex justify-between items-center mb-2 relative z-10">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight w-1/2">{label}</label>
        <motion.div 
          key={value}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-14 h-14 rounded-2xl bg-slate-800 flex flex-col items-center justify-center shadow-lg border-2 border-slate-600"
        >
          <span className="text-xl font-black text-white">{value}</span>
        </motion.div>
      </div>
      
      <div className="relative pt-4 pb-2 z-10">
         <input 
           type="range" min="6" max="20" value={value} 
           onChange={e => onChange(parseInt(e.target.value))} 
           className="w-full h-3 bg-slate-950 rounded-full appearance-none cursor-pointer outline-none relative z-10 accent-slate-400" 
         />
      </div>
      <div className="p-4 bg-slate-950/50 rounded-xl text-center border border-slate-800/50">
         <span className="text-[13px] font-black text-slate-300 uppercase tracking-wider italic">{labels[value]}</span>
      </div>
    </div>
  );
}

function WellnessSlider({ label, value, onChange, labels }: { label: string, value: number, onChange: (val: number) => void, labels: string[] }) {
  return (
    <div className="space-y-4 p-5 bg-slate-900/60 rounded-[1.5rem] border border-slate-800 relative overflow-hidden">
      <div className="flex justify-between items-center mb-1">
        <label className="text-[11px] font-black text-white uppercase tracking-widest">{label}</label>
        <span className="text-[10px] font-black text-slate-300 px-2 py-0.5 bg-slate-800 rounded border border-slate-700">{value} / 5</span>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((v) => {
          const isActive = value === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className={`flex-1 h-12 flex flex-col items-center justify-center rounded-xl transition-all duration-300 border-2 ${
                isActive 
                  ? 'bg-slate-600 scale-110 shadow-lg z-10 text-white border-slate-400' 
                  : 'bg-slate-950 border-transparent text-slate-600 hover:bg-slate-800 hover:text-slate-400'
              }`}
            >
              <span className={`font-black ${isActive ? 'text-sm' : 'text-xs'}`}>{v}</span>
            </button>
          )
        })}
      </div>
      <div className="text-center">
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
          {labels[value-1]}
        </span>
      </div>
    </div>
  );
}

function BinaryToggle({ active, onToggle }: { active: boolean, onToggle: (val: boolean) => void }) {
  return (
    <div className="flex gap-1 bg-slate-950 p-1.5 rounded-[1rem] border border-slate-800">
      <button type="button" onClick={() => onToggle(true)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${active ? 'bg-slate-700 text-white shadow-md scale-105' : 'text-slate-500 hover:bg-slate-900'}`}>Sim</button>
      <button type="button" onClick={() => onToggle(false)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${!active ? 'bg-slate-700 text-white shadow-md scale-105' : 'text-slate-500 hover:bg-slate-900'}`}>Não</button>
    </div>
  );
}

function ToggleItem({ label, active, onToggle }: { label: string, active: boolean, onToggle: (val: boolean) => void }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-950/50 border border-slate-800/80 rounded-2xl gap-4 hover:border-blue-500/30 transition-colors">
      <span className="text-[11px] font-bold text-slate-300 uppercase leading-relaxed">{label}</span>
      <div className="flex-shrink-0 self-start sm:self-auto">
        <BinaryToggle active={active} onToggle={onToggle} />
      </div>
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
