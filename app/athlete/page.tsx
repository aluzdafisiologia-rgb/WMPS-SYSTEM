'use client'

import dynamic from 'next/dynamic';
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Clock, Zap, CheckCircle2, Save, FileText, User, Dumbbell, Activity, Timer, MoveHorizontal, Footprints, Camera, Edit2, Check, TrendingUp, AlertTriangle, Info, Calendar, Droplets, Thermometer, Brain, Smile, Heart, Shield, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { logWorkout, logWellness, logAnamnesis, getUserRole, getActivePrescription, completeTraining, updateProfilePhoto, getAthleteProfile, updateAthleteProfile, saveMenstrualCycle, logMenstrualSymptoms, getMenstrualData, saveReadinessScore, getReadinessHistory, saveClinicalProfile, logClinicalData, getClinicalData, getLatestWellness } from '../actions';
import ForcePasswordReset from '../components/ForcePasswordReset';
import EvolutionModule from '../components/EvolutionModule';
import AthleteReportModule from '../components/AthleteReportModule';

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

function AthletePage() {
  const [activeTab, setActiveTab] = useState<'workout' | 'wellness' | 'anamnesis' | 'training' | 'evolution' | 'profile_edit' | 'menstrual' | 'clinical_profile' | 'daily_health' | null>(null);
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
    details: '',
    medications: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [activePrescription, setActivePrescription] = useState<any>(null);
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({});
  const [profile, setProfile] = useState<any>(null);
  const [menstrualData, setMenstrualData] = useState<any>({ cycle: null, symptoms: [] });
  const [readinessScore, setReadinessScore] = useState<{ score: number, class: string, color: string, recommendation: string } | null>(null);
  const [readinessHistory, setReadinessHistory] = useState<any[]>([]);
  const [clinicalProfile, setClinicalProfile] = useState<any>(null);
  const [clinicalLogs, setClinicalLogs] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editProfileData, setEditProfileData] = useState({
    full_name: '',
    email: '',
    gender: '',
    phone: '',
    cpf: '',
    birth_date: '',
    height: '',
    weight: '',
    sport: '',
    goal: '',
  });

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const profileData = await getAthleteProfile(user.id);
      if (profileData) {
        setProfile(profileData);
        // Carregar histórico de prontidão
        const history = await getReadinessHistory(user.id);
        setReadinessHistory(history);
        if (history.length > 0) {
          const last = history[0];
          let classification = "";
          let color = "";
          let recommendation = "";
          const score = last.score;
          if (score >= 85) { classification = "Alta Prontidão"; color = "text-emerald-500"; recommendation = "Dia excelente para quebrar recordes e treinar pesado!"; }
          else if (score >= 70) { classification = "Boa Prontidão"; color = "text-blue-500"; recommendation = "Ótimo dia para seguir a planilha com intensidade."; }
          else if (score >= 50) { classification = "Moderada"; color = "text-amber-500"; recommendation = "Escute seu corpo. Talvez reduzir 10-15% da carga seja prudente."; }
          else if (score >= 30) { classification = "Baixa"; color = "text-orange-500"; recommendation = "Reduza volume e foque em técnica ou flexibilidade."; }
          else { classification = "Muito Baixa"; color = "text-rose-500"; recommendation = "Priorize a recuperação total hoje. Sono e hidratação."; }
          setReadinessScore({ score, class: classification, color, recommendation });
        }
        const clinical = await getClinicalData(user.id);
        setClinicalProfile(clinical.profile);
        setClinicalLogs(clinical.logs);

        const latestWell = await getLatestWellness(user.id);
        if (latestWell) {
          setWellnessData({
            recovery: latestWell.recovery || 14,
            sleep: latestWell.sleep || 3,
            stress: latestWell.stress || 3,
            fatigue: latestWell.fatigue || 3,
            soreness: latestWell.soreness || 3,
          });
        }

        // ... restante da lógica de profile
        setFormData(prev => ({ ...prev, athleteName: profileData.full_name }));
        setEditProfileData({
          full_name: profileData.full_name || '',
          email: profileData.email || '',
          gender: profileData.gender || '',
          phone: profileData.phone || '',
          cpf: profileData.cpf || '',
          birth_date: profileData.birth_date || '',
          height: profileData.height?.toString() || '',
          weight: profileData.weight?.toString() || '',
          sport: profileData.sport || '',
          goal: profileData.goal || '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchMenstrualData = async () => {
    if (!user) return;
    const data = await getMenstrualData(user.id);
    setMenstrualData(data);
    if (wellnessData) calculateAndSaveReadiness(wellnessData, data);
  };

  const calculateAndSaveReadiness = async (well: any, mens: any) => {
    if (!user) return;
    
    // 1. Fatores de Bem-Estar (Max 70 se feminino, Max 100 se masculino)
    const sleepScore = (well.sleep / 5) * 20;
    const fatigueScore = (1 - (well.fatigue - 1) / 4) * 20;
    const sorenessScore = (1 - (well.soreness - 1) / 4) * 15;
    const stressScore = (1 - (well.stress - 1) / 4) * 15;
    
    let wellnessBase = sleepScore + fatigueScore + sorenessScore + stressScore; // Max 70
    
    let finalScore = 0;
    const isFemale = profile?.gender === 'Feminino';

    if (isFemale) {
      // 2. Fatores Hormonais (Max 30)
      const phase = mens.cycle ? calculateCyclePhase(mens.cycle.last_period_date, mens.cycle.cycle_duration) : null;
      let phasePoints = 0;
      if (phase?.name === 'Folicular') phasePoints = 15;
      else if (phase?.name === 'Ovulatória') phasePoints = 12;
      else if (phase?.name.includes('Lútea')) phasePoints = 8;
      else if (phase?.name === 'Menstrual') phasePoints = 5;

      const latestSymptoms = mens.symptoms[0] || { fatigue: 1, pain: 1, bloating: 1, mood: 1 };
      const avgSymptoms = (latestSymptoms.fatigue + latestSymptoms.pain + latestSymptoms.bloating + latestSymptoms.mood) / 4;
      const symptomPoints = (1 - (avgSymptoms - 1) / 4) * 15;

      finalScore = wellnessBase + phasePoints + symptomPoints;
    } else {
      // Normaliza bem-estar para 100
      finalScore = (wellnessBase / 70) * 100;
    }

    const score = Math.round(Math.max(0, Math.min(100, finalScore)));
    
    let classification = "";
    let color = "";
    let recommendation = "";

    if (score >= 85) { classification = "Alta Prontidão"; color = "text-emerald-500"; recommendation = "Dia excelente para quebrar recordes e treinar pesado!"; }
    else if (score >= 70) { classification = "Boa Prontidão"; color = "text-blue-500"; recommendation = "Ótimo dia para seguir a planilha com intensidade."; }
    else if (score >= 50) { classification = "Moderada"; color = "text-amber-500"; recommendation = "Escute seu corpo. Talvez reduzir 10-15% da carga seja prudente."; }
    else if (score >= 30) { classification = "Baixa"; color = "text-orange-500"; recommendation = "Reduza volume e foque em técnica ou flexibilidade."; }
    else { classification = "Muito Baixa"; color = "text-rose-500"; recommendation = "Priorize a recuperação total hoje. Sono e hidratação."; }

    setReadinessScore({ score, class: classification, color, recommendation });
    await saveReadinessScore(user.id, score, { wellness: well, menstrual: mens });
  };

  React.useEffect(() => {
    async function checkAuth() {
      if (!supabase) {
        window.location.href = '/';
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/';
        return;
      }
      setUser(session.user);
      
      const role = await getUserRole(session.user.id);
      setRole(role);
      
      const prescription = await getActivePrescription(session.user.id);
      setActivePrescription(prescription);
    }
    checkAuth();
  }, []);

  React.useEffect(() => {
    if (user) {
      fetchProfile();
      fetchMenstrualData();
    }
  }, [user]);

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
      const newClinicalProfile = {
        has_diabetes: anamnesisData.diabetes,
        has_hypertension: anamnesisData.hypertension,
        has_cardiac: anamnesisData.hasKnownDisease || anamnesisData.q1,
        has_orthopedic: anamnesisData.q6,
        medications: anamnesisData.medications || ''
      };
      await saveClinicalProfile(user.id, newClinicalProfile);
      setClinicalProfile(newClinicalProfile);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      alert('Erro ao salvar anamnese.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      const { email, ...updates } = editProfileData;
      
      const res = await updateAthleteProfile(user.id, {
        ...updates,
        height: parseFloat(editProfileData.height) || null,
        weight: parseFloat(editProfileData.weight) || null,
      });
      if (res.success) {
        await fetchProfile();
        setActiveTab(null);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        alert('Erro ao atualizar perfil: ' + res.error);
      }
    } catch (error) {
      console.error('Action error (handleUpdateProfile):', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- LÓGICA FISIOLÓGICA DO CICLO (MC2) ---
  const calculateCyclePhase = (lastDate: string, duration: number) => {
    if (!lastDate) return null;
    const start = new Date(lastDate);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) % duration;
    const day = diffDays + 1;

    if (day <= 5) return { name: 'Menstrual', day, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/30', desc: 'Hormônios em nível basal. Foco em recuperação.', strategy: 'Recuperação Ativa' };
    if (day <= 12) return { name: 'Folicular', day, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', desc: 'Janela anabólica (estrógeno alto). Foco em força.', strategy: 'Carga Máxima' };
    if (day <= 15) return { name: 'Ovulatória', day, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', desc: 'Pico de desempenho. Atenção a risco de lesão.', strategy: 'Performance' };
    if (day <= 22) return { name: 'Lútea Inicial', day, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30', desc: 'Aumento da temperatura e FC basal.', strategy: 'Resistência' };
    return { name: 'Lútea Tardia (TPM)', day, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/30', desc: 'Queda hormonal. Reduzir volume.', strategy: 'Regenerativo' };
  };

  const currentPhase = menstrualData.cycle ? calculateCyclePhase(menstrualData.cycle.last_period_date, menstrualData.cycle.cycle_duration) : null;

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
            <div className="space-y-3">
              <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">{profile?.full_name || 'Carregando...'}</h2>
              <div className="flex flex-col items-center gap-3">
                {profile?.team_name ? (
                  <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black text-emerald-400 uppercase italic tracking-widest">
                    Atleta da equipe {profile.team_name}
                  </span>
                ) : (
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Atleta Individual</p>
                )}
                
                <button 
                  onClick={() => setActiveTab('profile_edit')}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-800 border border-white/5 hover:border-emerald-500/30 rounded-xl transition-all group"
                >
                  <Edit2 className="w-3 h-3 text-emerald-500 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black text-white uppercase italic tracking-widest">Editar Cadastro</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {profile && (!profile.cpf || !profile.phone || !profile.gender) && !activeTab && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase italic tracking-widest">Seu perfil está incompleto</p>
                <p className="text-[10px] text-amber-500/70 font-bold uppercase">Complete seus dados para melhorar seu monitoramento.</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('profile_edit')}
              className="px-4 py-2 bg-amber-500 text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-400 transition-colors"
            >
              Completar Agora
            </button>
          </motion.div>
        )}

        {/* CLINICAL ALERTS */}
        {!activeTab && clinicalLogs.length > 0 && (
          <div className="space-y-4">
            {clinicalLogs[0].glucose_pre < 70 && clinicalProfile?.has_diabetes && (
              <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="p-4 bg-rose-500/20 border border-rose-500/40 rounded-2xl flex items-center gap-4">
                <AlertTriangle className="w-6 h-6 text-rose-500" />
                <div>
                  <p className="text-[10px] font-black text-white uppercase italic">Alerta de Hipoglicemia!</p>
                  <p className="text-[9px] text-rose-200/70 font-bold uppercase">Glicemia {clinicalLogs[0].glucose_pre} mg/dL. Não treine sem estabilizar.</p>
                </div>
              </motion.div>
            )}
            {(clinicalLogs[0].bp_sys > 160 || clinicalLogs[0].bp_dia > 100) && clinicalProfile?.has_hypertension && (
              <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="p-4 bg-rose-500/20 border border-rose-500/40 rounded-2xl flex items-center gap-4">
                <AlertTriangle className="w-6 h-6 text-rose-500" />
                <div>
                  <p className="text-[10px] font-black text-white uppercase italic">Alerta de Hipertensão!</p>
                  <p className="text-[9px] text-rose-200/70 font-bold uppercase">PA {clinicalLogs[0].bp_sys}/{clinicalLogs[0].bp_dia}. Risco cardiovascular elevado.</p>
                </div>
              </motion.div>
            )}
          </div>
        )}
        


        {!activeTab ? (
          <div className="grid grid-cols-1 gap-6 py-8">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <MenuCard 
                title="ANAMNESE" 
                sub="Histórico e Saúde" 
                icon={<ClipboardList className="w-10 h-10 text-cyan-400" />} 
                onClick={() => setActiveTab('anamnesis')} 
                color="bg-slate-800/80 hover:bg-slate-800 border-white/5 hover:border-cyan-500/30"
                accentColor="from-cyan-500/20 to-transparent"
              />
            </div>

            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <MenuCard 
                title="PRÉ-TREINO" 
                sub="Prontidão & Recuperação" 
                icon={<Activity className="w-10 h-10 text-blue-400" />} 
                onClick={() => setActiveTab('wellness')} 
                color="bg-slate-800/80 hover:bg-slate-800 border-white/5 hover:border-blue-500/30"
                accentColor="from-blue-500/20 to-transparent"
              />
            </div>

            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <MenuCard 
                title="MEU TREINO" 
                sub="Acesse sua planilha diária" 
                icon={<Dumbbell className="w-10 h-10 text-emerald-400" />} 
                onClick={() => setActiveTab('training')} 
                color="bg-slate-800/80 hover:bg-slate-800 border-white/5 hover:border-emerald-500/30"
                accentColor="from-emerald-500/20 to-transparent"
              />
            </div>

            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <MenuCard 
                title="PÓS-TREINO" 
                sub="Registro de Carga e PSE" 
                icon={<Timer className="w-10 h-10 text-orange-400" />} 
                onClick={() => setActiveTab('workout')} 
                color="bg-slate-800/80 hover:bg-slate-800 border-white/5 hover:border-orange-500/30"
                accentColor="from-orange-500/20 to-transparent"
              />
            </div>

            {profile?.gender === 'Feminino' && (
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-500 to-purple-500 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <MenuCard 
                  title="CICLO MENSTRUAL" 
                  sub="Fisiologia & Performance" 
                  icon={<Calendar className="w-10 h-10 text-rose-400" />} 
                  onClick={() => setActiveTab('menstrual')} 
                  color="bg-slate-800/80 hover:bg-slate-800 border-white/5 hover:border-rose-500/30"
                  accentColor="from-rose-500/20 to-transparent"
                />
              </div>
            )}

            {/* RELATÓRIO PROFISSIONAL */}
            <AthleteReportModule 
              data={{
                profile,
                clinicalProfile,
                clinicalLogs,
                readinessHistory,
                menstrualData
              }}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bento-card bg-slate-800 border-slate-700 shadow-xl overflow-hidden p-0">
              <div className={`px-8 py-4 ${activeTab === 'workout' ? 'bg-blue-600' : activeTab === 'wellness' ? 'bg-emerald-600' : activeTab === 'training' ? 'bg-yellow-600' : activeTab === 'profile_edit' ? 'bg-emerald-500' : 'bg-purple-600'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-white uppercase italic tracking-widest">
                    {activeTab === 'workout' ? 'Pós-Treino' : 
                     activeTab === 'wellness' ? 'Pré-Treino' : 
                     activeTab === 'training' ? 'Prescrição do Treinador' : 
                     activeTab === 'evolution' ? 'Evolução' : 
                     activeTab === 'profile_edit' ? 'Editar Cadastro' : 
                     activeTab === 'menstrual' ? 'Ciclo Menstrual' : 
                     'Anamnese'}
                  </h3>
                  <button onClick={() => setActiveTab(null)} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all">
                    <ArrowLeft className="w-5 h-5 text-white" />
                  </button>
                </div>
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
                        Após confirmar, registre o PSE e duração real na aba "Pós-Treino"
                      </p>
                    </div>
                  );
                })()}
                {activeTab === 'profile_edit' && (
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="bg-slate-900/60 p-6 rounded-[2rem] border border-slate-800 shadow-xl space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input 
                          label="E-mail de Login" 
                          type="email"
                          value={editProfileData.email} 
                          onChange={() => {}} 
                          disabled={true}
                        />
                        <div className="md:col-span-2 p-3 bg-slate-950/50 border border-slate-800 rounded-xl">
                          <p className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-2">
                             <Info className="w-3 h-3" /> O e-mail não pode ser alterado pois é utilizado para seu acesso ao sistema.
                          </p>
                        </div>
                        <Input 
                          label="Nome Completo" 
                          type="text"
                          value={editProfileData.full_name} 
                          onChange={(v) => setEditProfileData({...editProfileData, full_name: v})} 
                        />
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gênero</label>
                          <select 
                            value={editProfileData.gender}
                            onChange={(e) => setEditProfileData({...editProfileData, gender: e.target.value})}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-xs font-bold text-white focus:border-blue-500 outline-none transition-colors"
                          >
                            <option value="">Selecione</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Feminino">Feminino</option>
                            <option value="Outro">Outro</option>
                          </select>
                        </div>
                        <Input 
                          label="Telefone" 
                          type="text"
                          placeholder="(00) 00000-0000"
                          value={editProfileData.phone} 
                          onChange={(v) => {
                            const digits = v.replace(/\D/g, '').slice(0, 11);
                            let formatted = digits;
                            if (digits.length > 2) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
                            if (digits.length > 7) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
                            setEditProfileData({...editProfileData, phone: formatted});
                          }} 
                        />
                        <Input 
                          label="CPF / Documento" 
                          type="text"
                          placeholder="000.000.000-00"
                          value={editProfileData.cpf} 
                          onChange={(v) => {
                            const digits = v.replace(/\D/g, '').slice(0, 11);
                            let formatted = digits;
                            if (digits.length > 3) formatted = `${digits.slice(0, 3)}.${digits.slice(3)}`;
                            if (digits.length > 6) formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
                            if (digits.length > 9) formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
                            setEditProfileData({...editProfileData, cpf: formatted});
                          }} 
                        />
                        <Input 
                          label="Data de Nascimento" 
                          type="date"
                          value={editProfileData.birth_date} 
                          onChange={(v) => setEditProfileData({...editProfileData, birth_date: v})} 
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <Input 
                            label="Altura (m)" 
                            type="number"
                            value={editProfileData.height} 
                            onChange={(v) => setEditProfileData({...editProfileData, height: v})} 
                          />
                          <Input 
                            label="Peso (kg)" 
                            type="number"
                            value={editProfileData.weight} 
                            onChange={(v) => setEditProfileData({...editProfileData, weight: v})} 
                          />
                        </div>
                        <Input 
                          label="Esporte" 
                          type="text"
                          value={editProfileData.sport} 
                          onChange={(v) => setEditProfileData({...editProfileData, sport: v})} 
                        />
                        <Input 
                          label="Objetivo" 
                          type="text"
                          value={editProfileData.goal} 
                          onChange={(v) => setEditProfileData({...editProfileData, goal: v})} 
                        />
                      </div>
                    </div>
                    <SubmitButton loading={isSubmitting} color="bg-emerald-600 hover:bg-emerald-500" text="Salvar Alterações" />
                  </form>
                )}
                {activeTab === 'menstrual' && user && (
                  <MenstrualCycleModule 
                    userId={user.id} 
                    data={menstrualData} 
                    currentPhase={currentPhase}
                    onRefresh={fetchMenstrualData}
                  />
                )}
                {activeTab === 'anamnesis' && user && (
                  <AnamnesisModule 
                    userId={user.id} 
                    athleteName={profile?.full_name || ''}
                    clinicalProfile={clinicalProfile} 
                    onSave={() => { setActiveTab(null); fetchProfile(); }}
                  />
                )}
                {activeTab === 'evolution' && user && (
                  <EvolutionModule 
                    athletes={profile ? [profile] : []} 
                    initialAthleteId={user.id} 
                    hideSelector={true} 
                  />
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

function MenstrualCycleModule({ userId, data, currentPhase, onRefresh }: { userId: string, data: any, currentPhase: any, onRefresh: () => void }) {
  const [isSaving, setIsSaving] = useState(false);
  const [setupMode, setSetupMode] = useState(!data.cycle);
  const [config, setConfig] = useState({
    lastPeriodDate: data.cycle?.last_period_date || '',
    cycleDuration: data.cycle?.cycle_duration || 28,
    regular: data.cycle?.regular || true
  });

  const [symptoms, setSymptoms] = useState({
    fatigue: 3,
    pain: 1,
    bloating: 1,
    mood: 3,
    readiness: 4,
    notes: ''
  });

  const handleSaveConfig = async () => {
    setIsSaving(true);
    const res = await saveMenstrualCycle(userId, config);
    if (res.success) {
      setSetupMode(false);
      onRefresh();
    }
    setIsSaving(false);
  };

  const handleLogSymptoms = async () => {
    setIsSaving(true);
    const res = await logMenstrualSymptoms(userId, symptoms);
    if (res.success) {
      alert('Sintomas registrados com sucesso!');
      onRefresh();
    }
    setIsSaving(false);
  };

  if (setupMode) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-slate-900/60 p-8 rounded-[2.5rem] border border-rose-500/20 shadow-2xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-rose-500/20 rounded-2xl">
              <Calendar className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase italic">Configurar Ciclo</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Personalize seu monitoramento fisiológico</p>
            </div>
          </div>

          <div className="space-y-6">
            <Input label="Data da Última Menstruação" type="date" value={config.lastPeriodDate} onChange={(v: string) => setConfig({...config, lastPeriodDate: v})} />
            <Input label="Duração Média do Ciclo (dias)" type="number" value={config.cycleDuration.toString()} onChange={(v: string) => setConfig({...config, cycleDuration: parseInt(v) || 28})} />
            <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ciclo Regular?</span>
              <BinaryToggle active={config.regular} onToggle={(v: boolean) => setConfig({...config, regular: v})} />
            </div>
          </div>

          <div className="mt-8">
            <SubmitButton loading={isSaving} text="Salvar Configuração" onClick={handleSaveConfig} color="bg-rose-600 hover:bg-rose-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Status da Fase Atual */}
      <div className={`p-8 rounded-[2.5rem] border-2 shadow-2xl relative overflow-hidden ${currentPhase?.bg} ${currentPhase?.border}`}>
        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
          <div className="p-4 bg-white/5 rounded-full backdrop-blur-md">
            <Droplets className={`w-8 h-8 ${currentPhase?.color}`} />
          </div>
          <div>
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] opacity-60 ${currentPhase?.color}`}>Dia {currentPhase?.day} do Ciclo</span>
            <h3 className={`text-3xl font-black uppercase italic tracking-tight mt-1 ${currentPhase?.color}`}>{currentPhase?.name}</h3>
          </div>
          <div className="bg-white/5 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/5">
            <p className="text-xs font-bold text-white uppercase italic tracking-widest">Estratégia: {currentPhase?.strategy}</p>
          </div>
          <p className="text-xs text-slate-400 font-medium max-w-[250px] leading-relaxed italic">
            "{currentPhase?.desc}"
          </p>
        </div>
      </div>

      {/* Registro de Sintomas Diários */}
      <div className="bg-slate-900/60 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl space-y-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
            <Thermometer className="w-6 h-6 text-rose-500" />
          </div>
          <h4 className="text-sm font-black text-white uppercase italic tracking-widest">Sintomas Diários</h4>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <WellnessSlider label="Nível de Fadiga" value={symptoms.fatigue} onChange={(v: number) => setSymptoms({...symptoms, fatigue: v})} labels={['Disposta', 'Normal', 'Cansada', 'Fadigada', 'Exausta']} />
          <WellnessSlider label="Dores / Cólicas" value={symptoms.pain} onChange={(v: number) => setSymptoms({...symptoms, pain: v})} labels={['Nenhuma', 'Leve', 'Moderada', 'Forte', 'Insuportável']} />
          <WellnessSlider label="Inchaço" value={symptoms.bloating} onChange={(v: number) => setSymptoms({...symptoms, bloating: v})} labels={['Nenhum', 'Leve', 'Moderado', 'Visível', 'Incomoda']} />
          <WellnessSlider label="Humor / Disposição" value={symptoms.mood} onChange={(v: number) => setSymptoms({...symptoms, mood: v})} labels={['Excelente', 'Bom', 'Oscilante', 'Irritada', 'Triste']} />
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Notas Adicionais</label>
          <textarea 
            value={symptoms.notes}
            onChange={(e) => setSymptoms({...symptoms, notes: e.target.value})}
            placeholder="Como você está se sentindo hoje?..."
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-xs font-bold text-white focus:border-rose-500 outline-none h-24 transition-colors resize-none"
          />
        </div>

        <SubmitButton loading={isSaving} text="Registrar Sintomas" onClick={handleLogSymptoms} color="bg-rose-600 hover:bg-rose-500" />
      </div>

      <button onClick={() => setSetupMode(true)} className="w-full py-4 text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] hover:text-rose-400 transition-colors">
        Redefinir Configurações do Ciclo
      </button>
    </div>
  );
}

function AnamnesisModule({ userId, athleteName, clinicalProfile, onSave }: { userId: string, athleteName: string, clinicalProfile: any, onSave: () => void }) {
  const [data, setData] = useState({
    has_diabetes: clinicalProfile?.has_diabetes || false,
    has_hypertension: clinicalProfile?.has_hypertension || false,
    has_cardiac: clinicalProfile?.has_cardiac || false,
    has_orthopedic: clinicalProfile?.has_orthopedic || false,
    medications: clinicalProfile?.medications || '',
    glucose_pre: '',
    glucose_post: '',
    bp_sys: '',
    bp_dia: '',
    notes: '',
    // PAR-Q States
    q1: false, q2: false, q3: false, q4: false, q5: false, q6: false, q7: false,
    isPhysicallyActive: false,
    hasKnownDisease: false,
    hasSymptoms: false,
    familyHistory: false,
    smoking: false,
    diabetes: false,
    obesity: false,
    athleteName: athleteName,
    previousInjuries: '',
    desiredIntensity: 'moderate' as 'moderate' | 'vigorous'
  });
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'profile' | 'daily'>(clinicalProfile ? 'daily' : 'profile');

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await saveClinicalProfile(userId, {
        has_diabetes: data.has_diabetes || data.q6 || false,
        has_hypertension: data.has_hypertension || false,
        has_cardiac: data.has_cardiac || data.q1 || false,
        has_orthopedic: data.has_orthopedic || data.q5 || false,
        medications: data.medications
      });
      await logAnamnesis(userId, data);
      alert('Anamnese e Perfil Clínico atualizados!');
      setView('daily');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Erro ao salvar anamnese. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDaily = async () => {
    setLoading(true);
    try {
      await logClinicalData(userId, {
        glucose_pre: parseFloat(data.glucose_pre) || null,
        glucose_post: parseFloat(data.glucose_post) || null,
        bp_sys: parseFloat(data.bp_sys) || null,
        bp_dia: parseFloat(data.bp_dia) || null,
        notes: data.notes
      });
      alert('Medições registradas com sucesso!');
      onSave();
    } catch (error) {
      console.error('Error saving daily data:', error);
      alert('Erro ao salvar medições.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Selector */}
      <div className="flex gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
        <button 
          onClick={() => setView('profile')}
          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'profile' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-400'}`}
        >
          Histórico & PAR-Q
        </button>
        <button 
          onClick={() => setView('daily')}
          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'daily' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-400'}`}
        >
          Medições Diárias
        </button>
      </div>

      {view === 'profile' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 pb-8">
          {/* PAR-Q Section */}
          <div className="bg-slate-900/60 p-8 rounded-[2.5rem] border border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Questionário PAR-Q</h3>
            </div>
            
            <div className="space-y-4">
              {[
                { id: 'q1', text: 'Problema cardíaco e recomendação médica?' },
                { id: 'q2', text: 'Dor no peito durante atividade física?' },
                { id: 'q3', text: 'Dor no peito em repouso no último mês?' },
                { id: 'q4', text: 'Tontura ou perda de consciência?' },
                { id: 'q5', text: 'Problema ósseo ou articular limitante?' },
                { id: 'q6', text: 'Uso de remédios para pressão ou coração?' },
                { id: 'q7', text: 'Outra razão médica para não treinar?' }
              ].map(q => (
                <ToggleItem key={q.id} label={q.text} active={data[q.id as keyof typeof data] as boolean} onToggle={(v) => setData({...data, [q.id]: v})} />
              ))}
            </div>
          </div>

          {/* Risk Factors Section */}
          <div className="bg-slate-900/60 p-8 rounded-[2.5rem] border border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <Activity className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Fatores de Risco</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <ToggleItem label="Fumante (ou parou há < 6 meses)" active={data.smoking} onToggle={(v) => setData({...data, smoking: v})} />
              <ToggleItem label="Diabetes ou Glicose Elevada" active={data.has_diabetes} onToggle={(v) => setData({...data, has_diabetes: v})} />
              <ToggleItem label="Hipertensão" active={data.has_hypertension} onToggle={(v) => setData({...data, has_hypertension: v})} />
              <ToggleItem label="Histórico Familiar (Infarto/Morte Súbita)" active={data.familyHistory} onToggle={(v) => setData({...data, familyHistory: v})} />
              <ToggleItem label="Obesidade (IMC > 30)" active={data.obesity} onToggle={(v) => setData({...data, obesity: v})} />
              <ToggleItem label="Ativo regular (3x/sem)" active={data.isPhysicallyActive} onToggle={(v) => setData({...data, isPhysicallyActive: v})} />
            </div>
            
            <div className="pt-4 space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Lesões Prévias</label>
              <textarea 
                value={data.previousInjuries}
                onChange={(e) => setData({...data, previousInjuries: e.target.value})}
                placeholder="Ossos, músculos, articulações ou cirurgias..."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-xs font-bold text-white focus:border-blue-500 outline-none h-24 transition-colors resize-none"
              />
            </div>

            <div className="pt-4 space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Medicações em Uso</label>
              <textarea 
                value={data.medications}
                onChange={(e) => setData({...data, medications: e.target.value})}
                placeholder="Ex: Metformina 850mg (08h / 20h)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-xs font-bold text-white focus:border-cyan-500 outline-none h-24 transition-colors resize-none"
              />
            </div>

            <div className="pt-4 space-y-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Intensidade Desejada</p>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setData({...data, desiredIntensity: 'moderate'})} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${data.desiredIntensity === 'moderate' ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>Moderada</button>
                <button type="button" onClick={() => setData({...data, desiredIntensity: 'vigorous'})} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${data.desiredIntensity === 'vigorous' ? 'bg-purple-600 border-purple-400 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>Vigorosa</button>
              </div>
            </div>
            
            <SubmitButton loading={loading} onClick={handleSaveProfile} text="Finalizar e Salvar Anamnese" color="bg-purple-600 hover:bg-purple-500" />
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/60 p-8 rounded-[2.5rem] border border-slate-800 shadow-xl space-y-8 animate-in fade-in slide-in-from-right-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
              <Thermometer className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Medições Clínicas</h3>
          </div>
          
          {(data.has_diabetes) ? (
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Monitoramento de Glicemia</p>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Pré-Treino (mg/dL)" type="number" value={data.glucose_pre} onChange={(v) => setData({...data, glucose_pre: v})} />
                <Input label="Pós-Treino (mg/dL)" type="number" value={data.glucose_post} onChange={(v) => setData({...data, glucose_post: v})} />
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50 text-center">
              <p className="text-[10px] font-black text-slate-600 uppercase italic">Glicemia não habilitada no perfil clínico.</p>
            </div>
          )}

          {(data.has_hypertension) ? (
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Monitoramento de Pressão Arterial</p>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Sistólica (PAS)" type="number" placeholder="120" value={data.bp_sys} onChange={(v) => setData({...data, bp_sys: v})} />
                <Input label="Diastólica (PAD)" type="number" placeholder="80" value={data.bp_dia} onChange={(v) => setData({...data, bp_dia: v})} />
              </div>
            </div>
          ) : (
             <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50 text-center">
              <p className="text-[10px] font-black text-slate-600 uppercase italic">Pressão Arterial não habilitada no perfil clínico.</p>
            </div>
          )}

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Observações do Dia</label>
            <textarea 
              value={data.notes}
              onChange={(e) => setData({...data, notes: e.target.value})}
              placeholder="Como você se sente clinicamente hoje?..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-xs font-bold text-white focus:border-emerald-500 outline-none h-24 transition-colors resize-none"
            />
          </div>

          <SubmitButton loading={loading} onClick={handleSaveDaily} text="Salvar Medições" color="bg-emerald-600 hover:bg-emerald-500" />
        </div>
      )}
    </div>
  );
}

function Input({ label, type, value, onChange, disabled = false, placeholder = '' }: { label: string, type: string, value: string, onChange: (val: string) => void, disabled?: boolean, placeholder?: string }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <input 
        type={type} 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        disabled={disabled}
        placeholder={placeholder}
        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-950" 
      />
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

function SubmitButton({ loading, color = 'bg-blue-600 hover:bg-blue-500', text = 'Finalizar e Enviar', onClick }: { loading: boolean, color?: string, text?: string, onClick?: () => void }) {
  return (
    <button 
      type={onClick ? "button" : "submit"} 
      onClick={onClick}
      disabled={loading} 
      className={`w-full py-5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 italic text-white transition-all ${color} disabled:bg-slate-700`}
    >
      <Save className="w-5 h-5" /> {loading ? 'Enviando...' : text}
    </button>
  );
}

export default dynamic(() => Promise.resolve(AthletePage), { ssr: false });
