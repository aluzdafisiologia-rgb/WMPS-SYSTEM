'use client'

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  TrendingUp, 
  Clock, 
  Activity, 
  Search,
  Download,
  AlertTriangle,
  History,
  Info,
  Calendar as CalendarIcon,
  LayoutDashboard,
  ClipboardList,
  Target,
  FileText,
  Dumbbell,
  Zap,
  Timer,
  MoveHorizontal,
  Footprints,
  Scale,
  Plus,
  UserPlus,
  Mail,
  User,
  LogOut,
  CheckCircle2,
  Trash2,
  X,
  Users,
  Phone,
  ChevronRight,
  Check,
  BrainCircuit
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getSessions, getWellness, getRegistrationRequests, getUserRole, getAnamnesis, getAthletes, saveTrainingPrescription, approveRegistration, getAthletePrescriptions, getAllPrescriptions, deleteRegistrationRequest, updateProfilePhoto, saveAssessment } from '../actions';
import ForcePasswordReset from '../components/ForcePasswordReset';
import { Session, WellnessEntry } from '@/lib/db';
import { calculateACWR, calculateMonotony, calculateRiskScore } from '@/lib/periodization-engine';
import PeriodizationWizard from '../components/PeriodizationWizard';
import EvolutionModule from '../components/EvolutionModule';
import ForecastModule from '../components/ForecastModule';
import WhatIfSimulator from '../components/WhatIfSimulator';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ReferenceLine,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  LabelList
} from 'recharts';
import { format, parseISO, eachDayOfInterval, isSameDay, differenceInDays, startOfDay, startOfWeek, startOfMonth, startOfYear, subDays, isAfter } from 'date-fns';

// Hooper Index Scale
const HOOPER_SCALE = {
  1: { label: 'Péssimo', abbr: 'P', color: 'text-red-500' },
  2: { label: 'Ruim', abbr: 'R', color: 'text-orange-500' },
  3: { label: 'Bom', abbr: 'B', color: 'text-emerald-500' },
  4: { label: 'Muito Bom', abbr: 'MB', color: 'text-blue-500' },
  5: { label: 'Ótimo', abbr: 'OT', color: 'text-blue-400' }
};


const WELLNESS_CLASS = (score: number) => {
  if (score < 40) return { label: 'MR', fullName: 'Muito Ruim', color: 'bg-red-500' };
  if (score < 60) return { label: 'R', fullName: 'Ruim', color: 'bg-orange-500' };
  if (score < 85) return { label: 'B', fullName: 'Bom', color: 'bg-emerald-500' };
  return { label: 'EX', fullName: 'Excelente', color: 'bg-blue-500' };
};

export default function CoachPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [wellness, setWellness] = useState<WellnessEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeModule, setActiveModule] = useState<'menu' | 'dashboard' | 'assessment' | 'evolution' | 'forecast' | 'periodization' | 'prescription' | 'requests' | 'athletes' | 'teams' | 'assessment_strength' | 'assessment_power' | 'assessment_endurance' | 'assessment_flexibility' | 'assessment_agility' | 'assessment_anthropometric' | 'assessment_anamnesis' | 'force_manifestations'>('menu');
  const [requests, setRequests] = useState<any[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardAthlete, setWizardAthlete] = useState<any>(null);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [whatIfAthlete, setWhatIfAthlete] = useState<any>(null);

  const handleAssessmentSave = async (athleteId: string, name: string, type: string, data: any) => {
    const res = await saveAssessment({
      athlete_id: athleteId,
      athlete_name: name,
      type,
      date: new Date().toISOString(),
      data
    });
    if (!res.success) {
      alert('Erro ao salvar avaliação: ' + res.error);
    }
  };

  useEffect(() => {
    async function initAuth() {
      if (!supabase) {
        window.location.href = '/';
        return;
      }
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        setUser(u);
        const r = await getUserRole(u.id);
        setRole(r);
      }
    }
    initAuth();

    async function loadData() {
      const [s, w, reqs, aths] = await Promise.all([
        getSessions(),
        getWellness(),
        getRegistrationRequests(),
        getAthletes()
      ]);
      setSessions(s);
      setWellness(w);
      setRequests(reqs);
      setAthletes(aths);
      setLoading(false);
    }
    loadData();
  }, []);
  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    window.location.href = '/';
  };

  const filteredSessions = sessions.filter(s => 
    s.athlete_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredWellness = wellness.filter(w => 
    w.athlete_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // General Statistics
  const teamStats = useMemo(() => {
    const totalS = sessions.length || 1;
    const avgLoad = sessions.reduce((acc, curr) => acc + curr.load, 0) / totalS;
    const avgRecovery = wellness.reduce((acc, curr) => acc + curr.recovery, 0) / (wellness.length || 1);
    const avgWellBeing = wellness.reduce((acc, curr) => acc + curr.score, 0) / (wellness.length || 1);
    
    return {
      avgLoad: Math.round(avgLoad),
      avgRecovery: avgRecovery.toFixed(1),
      avgWellBeing: Math.round(avgWellBeing)
    };
  }, [sessions, wellness]);

  // Chart: Team Load Trend (Weekly)
  const chartData = useMemo(() => {
    const today = new Date();
    const ago = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
    const last7Days = eachDayOfInterval({ start: ago, end: today });

    return last7Days.map(day => {
      const daySessions = sessions.filter(s => isSameDay(parseISO(s.date), day));
      return {
        date: format(day, 'dd/MM'),
        load: Math.round(daySessions.reduce((acc, curr) => acc + curr.load, 0) / (daySessions.length || 1)) || 0
      };
    });
  }, [sessions]);

  // Athlete Comparison for Chart (Internal Load)
  const athleteComparisonData = useMemo(() => {
    const athleteSum: Record<string, { total: number, count: number }> = {};
    sessions.forEach(s => {
      if (!athleteSum[s.athlete_name]) athleteSum[s.athlete_name] = { total: 0, count: 0 };
      athleteSum[s.athlete_name].total += s.load;
      athleteSum[s.athlete_name].count += 1;
    });

    return Object.entries(athleteSum).map(([name, data]) => ({
      name,
      avg: Math.round(data.total / data.count)
    }));
  }, [sessions]);

  // Athlete ACWR & Quadrant Data
  const athleteMetrics = useMemo(() => {
    const athletes = Array.from(new Set(sessions.map(s => s.athlete_name)));
    const today = new Date();
    
    return athletes.map(name => {
      const athleteSessions = sessions.filter(s => s.athlete_name === name);
      const athleteWellness = wellness.filter(w => w.athlete_name === name);
      
      // Use the scientific engine for ACWR
      const acwrResult = calculateACWR(athleteSessions);
      const acwr = acwrResult.ratio;
      
      // Latest Wellness
      const latestWellnessEntry = athleteWellness[0];
      const wellnessScore = latestWellnessEntry?.score ?? 75;
      const avgWellness = athleteWellness.length > 0 
        ? athleteWellness.slice(0, 7).reduce((acc, w) => acc + w.score, 0) / Math.min(athleteWellness.length, 7)
        : 75;
      
      // Performance (Avg RPE)
      const acuteSessions = athleteSessions.filter(s => differenceInDays(today, parseISO(s.date)) <= 7);
      const avgRpe = acuteSessions.length > 0 
        ? acuteSessions.reduce((acc, curr) => acc + curr.rpe, 0) / acuteSessions.length 
        : 0;
      
      const acuteLoad = acuteSessions.reduce((acc, curr) => acc + curr.load, 0);
      const totalDistance = acuteSessions.reduce((acc, curr) => acc + (curr.distance || 0), 0);
      const totalVolume = acuteSessions.reduce((acc, curr) => acc + (curr.volume || 0), 0);

      return {
        name,
        acwr: Number(acwr.toFixed(2)),
        performance: Number(avgRpe.toFixed(1)),
        wellness: wellnessScore,
        avgWellness,
        distance: totalDistance,
        volume: totalVolume,
        load: acuteLoad,
        sessions: athleteSessions
      };
    });
  }, [sessions, wellness]);

  // Risk Alerts Analysis (Refined with ACWR)
  const riskAlerts = useMemo(() => {
    return athleteMetrics.map(metric => {
      // Use the advanced risk engine
      const monotony = calculateMonotony(metric.sessions);
      const strain = metric.load * monotony; // Simple estimation
      const report = calculateRiskScore(
        metric.acwr,
        monotony,
        strain,
        metric.performance * 2, // Map 1-10 PSE to something close to 6-20 if needed, or just use 1-10 as we updated the engine
        (metric.wellness / 20), // Map 0-100 to 1-5
        false // performanceDropFlag
      );

      if (report.score < 40) return null;

      return { 
        id: metric.name, 
        athlete_name: metric.name, 
        riskLevel: report.classification === 'Crítico' || report.classification === 'Alto' ? 'high' : 'medium', 
        message: report.classification.toUpperCase(), 
        action: report.suggestions[0] || 'Ajustar carga',
        wellnessScore: metric.wellness,
        load: metric.load,
        acwr: metric.acwr,
        alerts: report.alerts
      };
    }).filter(a => a !== null).slice(0, 5);
  }, [athleteMetrics]);

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 font-sans pb-12">
      {user?.id && <ForcePasswordReset userId={user.id} />}
      <header className="flex flex-col md:flex-row justify-between items-center p-8 px-10 gap-8 border-b border-white/5 bg-slate-900/20 backdrop-blur-sm">
        {/* Left: Branding */}
        <div className="flex items-center gap-6 w-full md:w-auto">
          <button 
            onClick={() => {
              if (activeModule.startsWith('assessment_')) {
                setActiveModule('assessment');
              } else if (activeModule !== 'menu') {
                setActiveModule('menu');
              } else {
                window.location.href = role === 'admin' ? '/admin' : '/';
              }
            }}
            className="group flex items-center gap-2 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white p-3 rounded-2xl border border-slate-700 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
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
        </div>

        {/* Center: Main Title */}
        <div className="flex flex-col items-center flex-1">
          <h2 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-[0.15em] drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            Área do Professor
          </h2>
          <div className="flex items-center gap-2 mt-1">
             <div className="h-[2px] w-8 bg-emerald-500 rounded-full"></div>
             <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] italic">William Moreira Performance System</span>
             <div className="h-[2px] w-8 bg-emerald-500 rounded-full"></div>
          </div>
        </div>

        {/* Right: Actions (Logout) */}
        <div className="w-full md:w-auto flex justify-end">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 bg-slate-800/40 hover:bg-rose-500/10 border border-slate-700 hover:border-rose-500/30 rounded-2xl text-slate-400 hover:text-rose-500 transition-all group"
          >
            <span className="text-[10px] font-black uppercase tracking-widest">Sair</span>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 sm:px-10 py-4 space-y-8">
        
        {activeModule === 'menu' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-12">
            <MenuButton 
              title="PÓS-TREINO" 
              subtitle="Carga e PSE" 
              icon={<LayoutDashboard className="w-8 h-8 text-blue-500" />} 
              onClick={() => setActiveModule('dashboard')} 
            />
            <MenuButton 
              title="Avaliações" 
              subtitle="Antropometria e Testes" 
              icon={<ClipboardList className="w-8 h-8 text-emerald-500" />} 
              onClick={() => setActiveModule('assessment')} 
            />
            <MenuButton 
              title="Periodização" 
              subtitle="Planejamento Macrociclo" 
              icon={<Target className="w-8 h-8 text-amber-500" />} 
              onClick={() => setActiveModule('periodization')} 
            />
            <MenuButton 
              title="Prescrição" 
              subtitle="Montagem de Treinos" 
              icon={<FileText className="w-8 h-8 text-purple-500" />} 
              onClick={() => setActiveModule('prescription')} 
            />
            <MenuButton 
              title="Solicitações" 
              subtitle={`${requests.length} pendente${requests.length !== 1 ? 's' : ''}`} 
              icon={<UserPlus className="w-8 h-8 text-rose-500" />} 
              onClick={() => setActiveModule('requests')} 
              badge={requests.length}
            />
            <MenuButton 
              title="Alunos" 
              subtitle="Gestão de Atletas" 
              icon={<User className="w-8 h-8 text-cyan-400" />} 
              onClick={() => setActiveModule('athletes')} 
            />
            <MenuButton 
              title="Equipes" 
              subtitle="Grupos e Elencos" 
              icon={<Users className="w-8 h-8 text-emerald-400" />} 
              onClick={() => setActiveModule('teams')} 
            />
            <MenuButton 
              title="Central de Evolução" 
              subtitle="Monitoramento Elite" 
              icon={<TrendingUp className="w-8 h-8 text-blue-500" />} 
              onClick={() => setActiveModule('evolution')} 
            />
            <MenuButton 
              title="Manifestações de Força" 
              subtitle="Zonas e Intensidades" 
              icon={<Zap className="w-8 h-8 text-orange-500" />} 
              onClick={() => setActiveModule('force_manifestations')} 
            />
            <MenuButton 
              title="Previsão (IA)" 
              subtitle="Forecast e Metas" 
              icon={<BrainCircuit className="w-8 h-8 text-indigo-400" />} 
              onClick={() => setActiveModule('forecast')} 
            />
          </div>

        ) : activeModule === 'assessment' ? (
          <div className="space-y-8">
            <button 
              onClick={() => setActiveModule('menu')}
              className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Voltar ao Menu
            </button>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 py-6">
              <MenuButton 
                title="Avaliação de Força" 
                subtitle="Testes de Carga Máxima" 
                icon={<Dumbbell className="w-8 h-8 text-blue-500" />} 
                onClick={() => setActiveModule('assessment_strength')} 
              />
              <MenuButton 
                title="Avaliação de Potência" 
                subtitle="Ciclagem e Explosão" 
                icon={<Zap className="w-8 h-8 text-yellow-500" />} 
                onClick={() => setActiveModule('assessment_power')} 
              />
              <MenuButton 
                title="Avaliação de Resistência" 
                subtitle="Capacidade Aeróbica" 
                icon={<Timer className="w-8 h-8 text-emerald-500" />} 
                onClick={() => setActiveModule('assessment_endurance')} 
              />
              <MenuButton 
                title="Avaliação de Flexibilidade" 
                subtitle="Amplitude de Movimento" 
                icon={<MoveHorizontal className="w-8 h-8 text-purple-500" />} 
                onClick={() => setActiveModule('assessment_flexibility')} 
              />
              <MenuButton 
                title="Avaliação de Agilidade" 
                subtitle="Mudança de Direção" 
                icon={<Footprints className="w-8 h-8 text-cyan-500" />} 
                onClick={() => setActiveModule('assessment_agility')} 
              />
              <MenuButton 
                title="Avaliação Antropométrica" 
                subtitle="Dobra Cutânea e Perímetros" 
                icon={<Scale className="w-8 h-8 text-rose-500" />} 
                onClick={() => setActiveModule('assessment_anthropometric')} 
              />
              <MenuButton 
                title="Anamnese" 
                subtitle="Histórico e Saúde" 
                icon={<FileText className="w-8 h-8 text-blue-400" />} 
                onClick={() => setActiveModule('assessment_anamnesis')} 
              />
            </div>
          </div>
        ) : activeModule === 'dashboard' ? (
          <>
            {/* Back to Menu */}
            <button 
              onClick={() => setActiveModule('menu')}
              className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Voltar ao Menu
            </button>

            {/* Risk Alerts */}
            {riskAlerts.length > 0 && (
          <div className="bento-card border-none bg-red-500/5 p-6 border-l-4 border-l-red-500">
             <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="text-sm font-black text-white uppercase italic tracking-widest">Alertas de Risco Ativos</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {riskAlerts.map(alert => (
                  <div key={alert.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between group">
                     <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-black text-white uppercase italic">{alert.athlete_name}</span>
                           <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase mt-1 w-fit ${
                             alert.riskLevel === 'high' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-black'
                           }`}>
                             {alert.message}
                           </span>
                        </div>
                        <div className="flex gap-2">
                           <button 
                              onClick={() => {
                                const ath = athletes.find(a => a.full_name === alert.athlete_name);
                                if (ath) {
                                  setWhatIfAthlete(ath);
                                  setShowWhatIf(true);
                                }
                              }}
                              className="p-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 rounded-lg transition-all"
                              title="Simular Cenário"
                           >
                              <BrainCircuit className="w-3 h-3" />
                           </button>
                           <button 
                              onClick={() => {
                                const ath = athletes.find(a => a.full_name === alert.athlete_name);
                                if (ath) {
                                  setWizardAthlete(ath);
                                  setShowWizard(true);
                                }
                              }}
                              className="p-2 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white border border-blue-500/20 rounded-lg transition-all"
                              title="Ajustar Periodização"
                           >
                              <Target className="w-3 h-3" />
                           </button>
                        </div>
                     </div>
                     <div className="mb-4">
                        <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Ação Sugerida:</p>
                        <p className={`text-[10px] font-bold italic ${alert.riskLevel === 'high' ? 'text-red-400' : 'text-yellow-500'}`}>
                           {alert.action}
                        </p>
                     </div>
                     <div className="flex justify-between items-end">
                        <div className="text-[9px] text-slate-500 font-bold uppercase">Load: <span className="text-white">{alert.load}</span></div>
                        <div className="text-[9px] text-slate-500 font-bold uppercase">ACWR: <span className={alert.acwr > 1.5 ? 'text-red-500' : 'text-blue-400'}>{alert.acwr}</span></div>
                        <div className="text-[9px] text-slate-500 font-bold uppercase">Wellness: <span className={alert.wellnessScore < 50 ? 'text-red-500' : 'text-yellow-500'}>{alert.wellnessScore}%</span></div>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard title="Pós-Treino Médio" value={`${teamStats.avgLoad} AU`} icon={<TrendingUp className="w-5 h-5 text-blue-400" />} color="bg-slate-900 border border-slate-800" />
          <StatCard title="Distância Total" value={`${athleteMetrics.reduce((acc, m) => acc + m.distance, 0).toFixed(1)} km`} icon={<Activity className="w-5 h-5 text-emerald-400" />} color="bg-slate-900 border border-slate-800" />
          <StatCard title="Volume Total" value={`${athleteMetrics.reduce((acc, m) => acc + m.volume, 0)} kg`} icon={<Activity className="w-5 h-5 text-yellow-400" />} color="bg-slate-900 border border-slate-800" />
          <div className="bento-card bg-blue-600 border-none flex flex-col justify-center">
             <p className="text-[9px] font-black text-white/50 uppercase italic mb-1 tracking-widest">Carga Semanal Acumulada</p>
             <h3 className="text-2xl font-black text-white italic">{sessions.reduce((acc, c) => acc + c.load, 0)} AU</h3>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-12 gap-8">
          
          {/* Internal Load Comparison */}
          <div className="col-span-12 lg:col-span-8 bento-card bg-slate-800/40">
             <div className="flex justify-between items-center mb-10">
                <div>
                   <p className="label-caps italic mb-1">Carga por Atleta</p>
                   <h3 className="text-xl font-black text-white uppercase italic">Pós-Treino vs Média da Equipe</h3>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-blue-500"></span>
                    <span className="text-[9px] font-black uppercase text-slate-500">Abaixo Méd.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-red-500"></span>
                    <span className="text-[9px] font-black uppercase text-slate-500">Acima Méd.</span>
                  </div>
                </div>
             </div>
             
             <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={athleteComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontWeight={800} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} fontWeight={800} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: '#334155', opacity: 0.4 }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                    <ReferenceLine y={teamStats.avgLoad} stroke="#ef4444" strokeDasharray="5 5" label={{ position: 'right', value: 'Referência', fill: '#ef4444', fontSize: 10, fontWeight: 900 }} />
                    <Bar dataKey="avg" radius={[4, 4, 0, 0]} barSize={40}>
                      {athleteComparisonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.avg > teamStats.avgLoad ? '#ef4444' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

           {/* Risk vs Performance Quadrant */}
           <div className="col-span-12 lg:col-span-4 bento-card bg-slate-900/50 border-slate-800">
              <div className="mb-6">
                 <p className="label-caps italic mb-1">Risco vs Performance</p>
                 <h3 className="text-xl font-black text-white uppercase italic">Quadrante de Monitoramento</h3>
              </div>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis 
                      type="number" 
                      dataKey="acwr" 
                      name="ACWR" 
                      stroke="#64748b" 
                      fontSize={10} 
                      fontWeight={800}
                      domain={[0, 2.5]}
                      label={{ value: 'ACWR (Risco)', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 10, fontWeight: 900 }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="performance" 
                      name="PSE" 
                      stroke="#64748b" 
                      fontSize={10} 
                      fontWeight={800}
                      domain={[0, 10]}
                      label={{ value: 'Performance (PSE)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10, fontWeight: 900 }}
                    />
                    <ZAxis type="number" dataKey="wellness" range={[50, 400]} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }} />
                    
                    <ReferenceLine x={1.5} stroke="#ef4444" strokeDasharray="3 3" />
                    <ReferenceLine x={0.8} stroke="#3b82f6" strokeDasharray="3 3" />
                    <ReferenceLine y={5} stroke="#334155" />
                    
                    <Scatter name="Atletas" data={athleteMetrics} fill="#3b82f6">
                      {athleteMetrics.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.acwr > 1.5 ? '#ef4444' : entry.acwr < 0.8 ? '#f59e0b' : '#10b981'} />
                      ))}
                      <LabelList dataKey="name" position="top" style={{ fill: '#64748b', fontSize: 8, fontWeight: 900 }} />
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-[8px] font-black uppercase text-slate-500">Alto Risco ({'>'}1.5)</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-[8px] font-black uppercase text-slate-500">Sweet Spot (0.8-1.3)</span>
                 </div>
              </div>
           </div>

          {/* HOOPER INDEX & WELLNESS SUMMARY */}
          <div className="col-span-12 bento-card bg-slate-900/30 border-slate-800">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Info className="w-4 h-4 text-slate-500" />
                    <p className="label-caps italic uppercase">Painel de Controle Interno</p>
                  </div>
                  <h3 className="text-xl font-black text-white uppercase italic">PRÉ-TREINO: Hooper & Bem-Estar</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                   {['OT', 'MB', 'B', 'R', 'P'].map((s) => (
                      <div key={s} className="px-2 py-0.5 rounded bg-slate-800 text-[8px] font-black italic border border-slate-700">{s}</div>
                   ))}
                </div>
             </div>

             <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
                <table className="w-full text-left border-collapse min-w-[800px]">
                   <thead>
                      <tr className="border-b border-slate-700 text-slate-500 text-[10px] font-black uppercase italic">
                         <th className="py-4">Atleta / Data</th>
                         <th className="py-4 text-center">Sono</th>
                         <th className="py-4 text-center">Estresse</th>
                         <th className="py-4 text-center">Fadiga</th>
                         <th className="py-4 text-center">Dor</th>
                         <th className="py-4 text-center">TQR</th>
                         <th className="py-4 text-center">B.Estar</th>
                         <th className="py-4 text-right">Trend</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800/50">
                      {filteredWellness.map((w) => {
                         const wellClass = WELLNESS_CLASS(w.score);
                         return (
                            <tr key={w.id} className="hover:bg-slate-800/20 transition-colors group">
                               <td className="py-5">
                                  <p className="text-xs font-black text-white italic uppercase">{w.athlete_name}</p>
                                  <p className="text-[9px] text-slate-600 font-bold italic">{format(parseISO(w.date), "dd/MM/yy")}</p>
                               </td>
                               <td className="text-center font-black">
                                  <HooperValue val={w.sleep} />
                               </td>
                               <td className="text-center font-black">
                                  <HooperValue val={w.stress} />
                               </td>
                               <td className="text-center font-black">
                                  <HooperValue val={w.fatigue} />
                               </td>
                               <td className="text-center font-black">
                                  <HooperValue val={w.soreness} />
                               </td>
                               <td className="text-center font-black">
                                  <div className={`text-xs ${w.recovery < 10 ? 'text-red-500' : 'text-emerald-500'}`}>{w.recovery}</div>
                               </td>
                               <td className="text-center">
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded italic text-white ${wellClass.color}`}>
                                     {wellClass.label}
                                  </span>
                               </td>
                               <td className="text-right">
                                  <div className="flex items-center justify-end gap-2 text-[9px] font-black uppercase italic text-slate-500">
                                     <span className={w.score > 70 ? 'text-emerald-500' : 'text-red-400'}>{w.score}%</span>
                                     <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                                        <div className={`h-full ${w.score > 70 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${w.score}%` }}></div>
                                     </div>
                                  </div>
                               </td>
                            </tr>
                         );
                      })}
                   </tbody>
                </table>
             </div>
          </div>

          {/* Weekly Summary Chart */}
          <div className="col-span-12 bento-card bg-slate-800/20 p-4 sm:p-8">
             <div className="flex items-center gap-2 mb-8">
                <CalendarIcon className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-black text-white uppercase italic tracking-widest">Resumo Semanal Pós-Treino</h3>
             </div>
             <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorLoadChart" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={9} fontWeight={900} axisLine={false} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={9} fontWeight={900} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }} />
                    <Area type="monotone" dataKey="load" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorLoadChart)" />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Activity Logs & Detailed Metrics */}
          <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="bento-card bg-slate-800/20 border-slate-700">
                <div className="flex items-center justify-between mb-8">
                   <p className="label-caps italic">Histórico Recente</p>
                   <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                      <input 
                         type="text" 
                         placeholder="Filtrar..."
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                         className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-[10px] font-bold text-white focus:ring-1 focus:ring-blue-500 outline-none w-32"
                      />
                   </div>
                </div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                   {filteredSessions.map((session) => (
                      <div key={session.id} className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/50 hover:border-blue-500/50 transition-all flex justify-between items-center">
                         <div>
                            <p className="text-[10px] font-black text-white italic uppercase">{session.athlete_name}</p>
                            <p className="text-[9px] text-slate-500 font-bold">{format(parseISO(session.date), "dd MMM")}</p>
                         </div>
                         <div className="text-right">
                            <div className={`text-xs font-black italic ${session.load > 500 ? 'text-red-500' : 'text-blue-400'}`}>
                              {session.load} AU
                            </div>
                            <div className="flex gap-2 justify-end mt-0.5">
                               {session.distance && <span className="text-[8px] text-emerald-500 bg-emerald-500/10 px-1 rounded uppercase font-black">{session.distance} km</span>}
                               {session.volume && <span className="text-[8px] text-yellow-500 bg-yellow-500/10 px-1 rounded uppercase font-black">{session.volume} kg</span>}
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             </div>

             <div className="bento-card bg-slate-800/20 border-slate-700">
                <div className="flex items-center gap-2 mb-8">
                   <History className="w-4 h-4 text-blue-500" />
                   <h3 className="text-sm font-black text-white uppercase italic tracking-widest">Resumo de Carga Externa (7d)</h3>
                </div>
                <div className="space-y-6">
                   {athleteMetrics.slice(0, 6).map(metric => (
                      <div key={metric.name} className="space-y-2">
                         <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-white uppercase italic">{metric.name}</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">{metric.distance.toFixed(1)} km / {metric.volume} kg</span>
                         </div>
                         <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                            <div 
                               className="h-full bg-blue-500 transition-all duration-1000" 
                               style={{ width: `${Math.min((metric.distance / 50) * 100, 100)}%` }}
                            ></div>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>

        </div>

          </>
        ) : activeModule === 'assessment_strength' ? (
          <div className="space-y-8">
            <button 
              onClick={() => setActiveModule('assessment')}
              className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Voltar para Avaliações
            </button>
            
            <StrengthAssessmentModule 
               athletes={athletes} 
               onSave={(id, name, data) => handleAssessmentSave(id, name, 'assessment_strength', data)} 
             />
          </div>
        ) : activeModule === 'assessment_power' ? (
          <div className="space-y-8">
            <button 
              onClick={() => setActiveModule('assessment')}
              className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Voltar para Avaliações
            </button>
            
            <PowerAssessmentModule 
               athletes={athletes} 
               onSave={(id, name, data) => handleAssessmentSave(id, name, 'assessment_power', data)} 
             />
          </div>
        ) : activeModule === 'assessment_anthropometric' ? (
          <div className="space-y-8">
            <button 
              onClick={() => setActiveModule('assessment')}
              className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Voltar para Avaliações
            </button>
            
            <AnthropometricAssessmentModule 
              athletes={athletes} 
              onSave={(id, name, data) => handleAssessmentSave(id, name, 'assessment_anthropometric', data)} 
            />
          </div>
        ) : activeModule === 'assessment_endurance' ? (
          <div className="space-y-8">
            <button 
              onClick={() => setActiveModule('assessment')}
              className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Voltar para Avaliações
            </button>
            
            <EnduranceAssessmentModule 
               athletes={athletes} 
               onSave={(id, name, data) => handleAssessmentSave(id, name, 'assessment_endurance', data)} 
             />
          </div>
        ) : activeModule === 'assessment_agility' ? (
          <div className="space-y-8">
            <button 
              onClick={() => setActiveModule('assessment')}
              className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Voltar para Avaliações
            </button>
            
            <AgilityAssessmentModule 
              athletes={athletes} 
              onSave={(id, name, data) => handleAssessmentSave(id, name, 'assessment_agility', data)} 
            />
          </div>
        ) : activeModule === 'assessment_flexibility' ? (
          <div className="space-y-8">
            <button 
              onClick={() => setActiveModule('assessment')}
              className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Voltar para Avaliações
            </button>
            
            <FlexibilityAssessmentModule 
               athletes={athletes} 
               onSave={(id, name, data) => handleAssessmentSave(id, name, 'assessment_flexibility', data)} 
             />
          </div>
        ) : activeModule === 'assessment_anamnesis' ? (
          <div className="space-y-8">
            <button 
              onClick={() => setActiveModule('assessment')}
              className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Voltar para Avaliações
            </button>
            
            <AnamnesisModule />
          </div>
        ) : activeModule === 'periodization' ? (
          <div className="space-y-8">
            <button 
              onClick={() => setActiveModule('menu')}
              className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Voltar ao Menu
            </button>
            <PeriodizationModule setWizardAthlete={setWizardAthlete} setShowWizard={setShowWizard} />
          </div>
        ) : activeModule === 'prescription' ? (
          <div className="space-y-8">
            <button 
              onClick={() => setActiveModule('menu')}
              className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Voltar ao Menu
            </button>
            
            <PrescriptionModule coachId={user?.id} />
          </div>
        ) : activeModule === 'requests' ? (
          <div className="space-y-8">
            <button 
              onClick={() => setActiveModule('menu')}
              className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Voltar ao Menu
            </button>
            
            <RequestsModule
              requests={requests}
              onApproved={(updatedReqs) => setRequests(updatedReqs)}
            />
          </div>
        ) : activeModule === 'athletes' ? (
          <div className="space-y-8">
            <button 
              onClick={() => setActiveModule('menu')}
              className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Voltar ao Menu
            </button>
            
            <AthletesModule coachId={user?.id} onPeriodize={(athlete) => { setWizardAthlete(athlete); setShowWizard(true); }} />
          </div>
        ) : activeModule === 'teams' ? (
          <div className="space-y-8">
            <button 
              onClick={() => setActiveModule('menu')}
              className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Voltar ao Menu
            </button>
            
            <TeamsModule />
          </div>
        ) : activeModule === 'evolution' ? (
          <EvolutionModule athletes={athletes} onBack={() => setActiveModule('menu')} />
        ) : activeModule === 'forecast' ? (
          <ForecastModule athletes={athletes} onBack={() => setActiveModule('menu')} />
        ) : activeModule === 'force_manifestations' ? (
          <ForceManifestationsModule onBack={() => setActiveModule('menu')} />
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center border border-slate-700">
               <Info className="w-10 h-10 text-slate-500" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase italic">Módulo em Desenvolvimento</h3>
              <p className="text-slate-500 text-sm font-medium mt-2">Esta funcionalidade estará disponível em breve no WMPS.</p>
            </div>
            <button 
              onClick={() => {
                const module = activeModule as string;
                if (module.startsWith('assessment_')) {
                  setActiveModule('assessment');
                } else {
                  setActiveModule('menu');
                }
              }}
              className="px-8 py-3 bg-slate-800 border border-slate-700 rounded-xl text-[10px] font-black text-white uppercase tracking-[0.2em] hover:bg-slate-700 transition-all"
            >
              Voltar
            </button>
          </div>
        )}

        <AnimatePresence>
          {showWizard && wizardAthlete && (
            <PeriodizationWizard 
              athlete={wizardAthlete}
              sessions={sessions}
              onClose={() => setShowWizard(false)}
              onSave={async (planData) => {
                const result = await saveTrainingPrescription({
                  athlete_id: planData.athlete_id,
                  coach_id: user?.id,
                  athlete_name: planData.athlete_name,
                  data: {
                    type: 'periodization_plan',
                    goals: planData.goals,
                    duration: planData.duration,
                    weeks: planData.plan
                  }
                });
                
                if (result.success) {
                  setShowWizard(false);
                  // Opcional: Adicionar um toast de sucesso aqui
                } else {
                  alert('Erro ao salvar: ' + result.error);
                }
              }}
            />
          )}
          {showWhatIf && whatIfAthlete && (
            <WhatIfSimulator
              athlete={whatIfAthlete}
              currentSessions={sessions.filter(s => s.athlete_id === whatIfAthlete.id)}
              currentWellness={wellness.filter(w => w.athlete_id === whatIfAthlete.id)}
              onClose={() => setShowWhatIf(false)}
            />
          )}
        </AnimatePresence>

        {/* Footer/System Bar */}
        <div className="col-span-12 bento-card bg-slate-900/50 border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-4 py-4 px-4 lg:px-10 text-center lg:text-left">
           <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6">
              <div className="flex items-center gap-2">
                 <AlertTriangle className="w-4 h-4 text-orange-500" />
                 <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic text-center">Monitoramento de Risco Ativo</span>
              </div>
              <div className="hidden sm:block h-4 w-px bg-slate-800"></div>
              <p className="hidden sm:block text-[10px] text-slate-600 font-bold italic text-center">Classificação Hooper baseada em P, R, B, MB, OT.</p>
           </div>
           <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.1em] text-center lg:text-right">
             William Moreira Performance System V1.0 <span className="mx-2 text-slate-700 hidden lg:inline">|</span> <br className="lg:hidden" />
             @2026 WMPS Todos os direitos reservados
           </p>
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}</style>
    </div>
  );
}

function HooperValue({ val }: { val: number }) {
  const item = HOOPER_SCALE[val as keyof typeof HOOPER_SCALE] || { abbr: '-', color: 'text-slate-700' };
  return (
    <div className={`text-xs font-black italic h-7 w-7 rounded-lg flex items-center justify-center mx-auto bg-slate-900 border border-slate-700 ${item.color}`}>
       {item.abbr}
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: string }) {
  return (
    <div className={`bento-card ${color} flex items-center justify-between group cursor-default`}>
      <div>
        <p className="label-caps italic mb-1 uppercase text-slate-500">{title}</p>
        <h3 className="text-2xl font-black text-white italic">{value}</h3>
      </div>
      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-white shadow-lg shadow-black/20 group-hover:scale-110 transition-transform">
        {icon}
      </div>
    </div>
  );
}

function MenuButton({ title, subtitle, icon, onClick, badge }: { title: string, subtitle: string, icon: React.ReactNode, onClick: () => void, badge?: number }) {
  return (
    <motion.button
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="p-8 bg-slate-800/40 border border-slate-800 rounded-[2rem] hover:bg-slate-800 hover:border-blue-500/50 transition-all text-left group relative overflow-hidden"
    >
      <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity">
        {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-32 h-32' })}
      </div>
      {badge !== undefined && badge > 0 && (
        <div className="absolute top-4 right-4 bg-rose-500 text-white text-[9px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30 animate-pulse">
          {badge > 9 ? '9+' : badge}
        </div>
      )}
      <div className="mb-6 p-4 bg-slate-900 border border-slate-700 rounded-2xl w-fit group-hover:border-blue-500/50 transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-black text-white uppercase italic tracking-widest">{title}</h3>
      <p className="text-[10px] text-slate-500 font-bold uppercase mt-2">{subtitle}</p>
    </motion.button>
  );
}

function IntensityZone({ label, range, reps, color }: { label: string, range: string, reps: string, color: string }) {
  return (
    <div className="flex items-center gap-4">
       <div className={`w-1 h-8 rounded-full bg-current ${color}`}></div>
       <div>
          <h4 className="text-[10px] font-black text-white uppercase italic">{label}</h4>
          <div className="flex gap-2 mt-1">
             <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Zona: <span className="text-white">{range}</span></span>
             <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Reps: <span className="text-white">{reps}</span></span>
          </div>
       </div>
    </div>
  );
}

function StrengthAssessmentModule({ athletes, onSave }: { athletes?: any[], onSave?: (athleteId: string, name: string, data: any) => void }) {
  const [weight, setWeight] = useState<string>('');
  const [reps, setReps] = useState<string>('');
  const [formula, setFormula] = useState<'brzycki' | 'epley'>('brzycki');
  const [exercise, setExercise] = useState('Supino Reto');
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  

  useEffect(() => {
    if (selectedAthleteId && athletes) {
      const athlete = athletes.find(a => a.id === selectedAthleteId);
      if (athlete) {
        if (athlete.weight != null && !weight) setWeight(athlete.weight.toString());
      }
    }
  }, [selectedAthleteId, athletes]);


  const oneRM = useMemo(() => {
    const w = parseFloat(weight);
    const r = parseFloat(reps);
    if (!w || !r) return 0;

    if (formula === 'brzycki') {
      // Brzycki Formula (Used by ACSM)
      return w / (1.0278 - (0.0278 * r));
    } else {
      // Epley Formula (Used by NSCA)
      return w * (1 + (r / 30));
    }
  }, [weight, reps, formula]);

  const intensities = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Input Section */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bento-card bg-slate-900/50 border-slate-800 p-8">
          <div className="mb-8">
            <p className="label-caps italic mb-1">Entrada de Dados</p>
            <h3 className="text-xl font-black text-white uppercase italic">Calculadora de 1RM</h3>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="label-caps italic text-xs">Exercício Avaliado</label>
              <select 
                value={exercise}
                onChange={(e) => setExercise(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white focus:ring-1 focus:ring-blue-500 outline-none"
              >
                {['Supino Reto', 'Agachamento Livre', 'Levantamento Terra', 'Desenvolvimento', 'Leg Press', 'Outro'].map(ex => (
                  <option key={ex} value={ex}>{ex}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="label-caps italic text-xs">Carga (kg)</label>
                <input 
                  type="number"
                  placeholder="0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-xl font-black text-white focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-700"
                />
              </div>
              <div className="space-y-3">
                <label className="label-caps italic text-xs">Reps (Máx 10)</label>
                <input 
                  type="number"
                  placeholder="0"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-xl font-black text-white focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-700"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="label-caps italic text-xs">Protocolo / Equação</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setFormula('brzycki')}
                  className={`py-3 rounded-xl text-[10px] font-black uppercase italic tracking-widest border transition-all ${
                    formula === 'brzycki' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 border-slate-700 text-slate-500'
                  }`}
                >
                  ACSM (Brzycki)
                </button>
                <button 
                  onClick={() => setFormula('epley')}
                  className={`py-3 rounded-xl text-[10px] font-black uppercase italic tracking-widest border transition-all ${
                    formula === 'epley' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 border-slate-700 text-slate-500'
                  }`}
                >
                  NSCA (Epley)
                </button>
              </div>
            </div>

            <div className="pt-4 p-6 bg-blue-600/10 border border-blue-500/20 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] font-black text-blue-400 uppercase italic">Referência Científica</span>
              </div>
              <p className="text-[9px] text-blue-400/70 font-bold uppercase leading-relaxed">
                As equações de predição de 1RM são recomendadas para até 10 repetições. Protocolos acimade 10 reps podem apresentar maior margem de erro.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Result Section */}
      <div className="lg:col-span-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bento-card border-none bg-blue-600 p-8 flex flex-col justify-between overflow-hidden relative">
             <div className="relative z-10">
                <p className="text-[10px] font-black text-white/60 uppercase italic tracking-[0.2em] mb-2">Estimativa de Carga Máxima</p>
                <h3 className="text-5xl font-black text-white italic">{Math.round(oneRM)}<span className="text-xl ml-2 opacity-50 underline decoration-white/20">KG</span></h3>
             </div>
             <Dumbbell className="absolute -right-8 -bottom-8 w-48 h-48 opacity-10 rotate-12" />
             <div className="relative z-10 mt-6 flex gap-3">
               <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black italic uppercase text-white">100% Intensidade</span>
               <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black italic uppercase text-white">{exercise}</span>
             </div>
          </div>

          <div className="bento-card bg-slate-900 border-slate-800 p-8">
             <p className="label-caps italic mb-4">Sobre o Protocolo</p>
             <div className="space-y-4">
                <div className="flex gap-4">
                   <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
                      <Zap className="w-5 h-5 text-yellow-500" />
                   </div>
                   <div>
                      <h4 className="text-xs font-black text-white uppercase italic">{formula === 'brzycki' ? 'ACSM (Brzycki)' : 'NSCA (Epley)'}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 leading-tight">
                        {formula === 'brzycki' 
                          ? 'Equação linear baseada na redução percentual por repetição. Amplamente utilizada em contextos clínicos e de saúde.' 
                          : 'Abordagem baseada no percentual de 1RM por repetição (3% por rep). Preferida pela NSCA para atletas de força.'}
                      </p>
                   </div>
                </div>
             </div>
          </div>
        </div>

        <div className="bento-card bg-slate-900 border-slate-800 p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="label-caps italic mb-1">Prescrição</p>
              <h3 className="text-xl font-black text-white uppercase italic">Zonas de Treinamento e Intensidade</h3>
            </div>
            <div className="flex gap-2">
               <span className="text-[10px] font-black text-blue-500 bg-blue-500/10 px-3 py-1 rounded-lg uppercase tracking-widest">Base: {Math.round(oneRM)}kg</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-4">
            {intensities.map(intensity => {
              const value = (oneRM * intensity) / 100;
              return (
                <motion.div 
                  key={intensity}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: intensity / 1000 }}
                  className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 flex flex-col items-center group hover:border-blue-500 transition-colors"
                >
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter group-hover:text-blue-500">{intensity}%</span>
                  <span className="text-lg font-black text-white italic mt-1">{Math.round(value)}<span className="text-[8px] ml-0.5 opacity-40">kg</span></span>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-slate-800">
             <IntensityZone label="Força Máxima (Recrutamento Neuromuscular)" range="85-100%" reps="1-6" color="text-red-500" />
             <IntensityZone label="Tensão Mecânica (Hipertrofia Miofibrilar)" range="70-85%" reps="6-12" color="text-yellow-500" />
             <IntensityZone label="Resistência Muscular Local (Anaeróbica)" range="50-70%" reps="15+" color="text-emerald-500" />
          </div>
        </div>
      </div>
      {athletes && onSave && (
        <div className="lg:col-span-12 mt-8">
          <div className="bento-card bg-slate-900 border-slate-800 p-8 flex flex-col md:flex-row items-end gap-6">
            <div className="flex-1 space-y-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Vincular a Atleta</span>
              <select
                value={selectedAthleteId}
                onChange={(e) => setSelectedAthleteId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-all h-[46px]"
              >
                <option value="">Selecione o Atleta</option>
                {athletes.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
              </select>
            </div>
            <button 
              disabled={!selectedAthleteId || !weight || !reps || isSaving}
              onClick={async () => {
                setIsSaving(true);
                const ath = athletes.find(a => a.id === selectedAthleteId);
                await onSave(selectedAthleteId, ath?.full_name, { 
                  exercise,
                  weight: parseFloat(weight), 
                  reps: parseFloat(reps), 
                  oneRM,
                  formula
                });
                setIsSaving(false);
                alert('Avaliação de força salva com sucesso!');
              }}
              className="px-10 h-[46px] bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              {isSaving ? 'Salvando...' : 'Salvar Avaliação'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PowerAssessmentModule({ athletes, onSave }: { athletes?: any[], onSave?: (athleteId: string, name: string, data: any) => void }) {
  const [testType, setTestType] = useState<string>('jump');
  const [mass, setMass] = useState<string>('75');
  const [value, setValue] = useState<string>('');
  const [sjHeight, setSjHeight] = useState<string>('');
  const [cmjHeight, setCmjHeight] = useState<string>('');
  const [contactTime, setContactTime] = useState<string>('');
  const [jumpHeightRsi, setJumpHeightRsi] = useState<string>('');
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const POWER_TESTS: Record<string, { title: string; subtitle: string; inputLabel?: string; unit: string; distance?: number; ballMass?: number; isSpecial?: boolean }> = {
    jump: { title: 'Salto Vertical (MIII)', subtitle: 'Sayers Equation', inputLabel: 'Altura do Salto (cm)', unit: 'W' },
    horizontal_jump: { title: 'Salto Horizontal', subtitle: 'Potência de Explosão', inputLabel: 'Distância do Salto (cm)', unit: 'W' },
    medball: { title: 'MedBall Throw (MS)', subtitle: 'Padrão 3kg', inputLabel: 'Distância do Lançamento (m)', unit: 'W', ballMass: 3 },
    sprint_10: { title: 'Sprint 10 metros', subtitle: 'Aceleração Inicial', inputLabel: 'Tempo (s)', unit: 'W', distance: 10 },
    sprint_20: { title: 'Sprint 20 metros', subtitle: 'Aceleração de Base', inputLabel: 'Tempo (s)', unit: 'W', distance: 20 },
    sprint_30: { title: 'Sprint 30 metros', subtitle: 'Velocidade de Transição', inputLabel: 'Tempo (s)', unit: 'W', distance: 30 },
    sprint_40: { title: 'Sprint 40 metros', subtitle: 'Velocidade Máxima Anaeróbica', inputLabel: 'Tempo (s)', unit: 'W', distance: 40 },
    kneeling_throw_l: { title: 'Kneeling Basketball Throw (L)', subtitle: 'Potência MS - Lado Esquerdo', inputLabel: 'Distância (m)', unit: 'W', ballMass: 0.625 },
    kneeling_throw_r: { title: 'Kneeling Basketball Throw (R)', subtitle: 'Potência MS - Lado Direito', inputLabel: 'Distância (m)', unit: 'W', ballMass: 0.625 },
    ssc_analytics: { title: 'Análise EUR & SSC%', subtitle: 'CMJ vs SJ Analytics', isSpecial: true, unit: '%' },
    rsi: { title: 'Índice Força Reativa (RSI)', subtitle: 'Capacidade Reativa / Pliometria', isSpecial: true, unit: 'RSI' }
  };

  useEffect(() => {
    if (selectedAthleteId && athletes) {
      const athlete = athletes.find(a => a.id === selectedAthleteId);
      if (athlete) {
        if (athlete.weight != null) setMass(athlete.weight.toString());
      }
    }
  }, [selectedAthleteId, athletes]);

  const results = useMemo(() => {
    const m = parseFloat(mass);
    if (!m) return null;

    const test = POWER_TESTS[testType];
    const v = parseFloat(value);

    if (testType === 'jump') {
      if (!v) return null;
      const peakPower = (60.7 * v) + (45.3 * m) - 2055;
      return { peakPower, relativePower: peakPower / m, label: test.title, unit: 'W', interpretation: peakPower > 4000 ? 'Potência de Nível Elite' : peakPower > 3000 ? 'Potência Adequada' : 'Necessário Desenvolvimento' };
    } 
    
    if (testType === 'horizontal_jump') {
      if (!v) return null;
      const distM = v / 100;
      const estPower = 2.21 * m * Math.sqrt(9.81 * distM);
      return { peakPower: estPower, relativePower: estPower / m, label: test.title, unit: 'W', interpretation: 'Estimativa baseada em deslocamento horizontal.' };
    }

    if (testType === 'medball' || testType.includes('throw')) {
      if (!v) return null;
      const ballM = test.ballMass || 3;
      const estPower = ballM * 9.81 * v;
      return { peakPower: estPower, relativePower: estPower / m, label: test.title, unit: 'W', interpretation: 'Avaliação de potência de membros superiores.' };
    }

    if (testType.startsWith('sprint')) {
      if (!v) return null;
      const d = test.distance || 40;
      const v_avg = d / v;
      const power = 0.5 * m * v_avg * v_avg / v;
      return { peakPower: power, relativePower: power / m, label: test.title, unit: 'W', interpretation: 'Capacidade de aceleração e potência anaeróbica.' };
    }

    if (testType === 'ssc_analytics') {
      const sj = parseFloat(sjHeight);
      const cmj = parseFloat(cmjHeight);
      if (!sj || !cmj) return null;
      
      const eur = cmj / sj;
      const sscDiff = ((cmj - sj) / sj) * 100;
      const sscTotal = (cmj / sj) * 100;

      let interpretation = "";
      let recommendation = "";
      let zoneClass = "";

      if (sscTotal > 110) {
        interpretation = "Déficit de Força Máxima Detectado";
        recommendation = "O atleta apresenta excelente elasticidade, mas baixa base de força. Ênfase recomendada: Treinamento de força máxima e recrutamento neuromuscular (Cargas > 85% 1RM).";
        zoneClass = "text-yellow-500";
      } else if (sscTotal < 100) {
        interpretation = "Baixa Eficiência do Ciclo Alongamento-Encurtamento (SSC)";
        recommendation = "Incapacidade de utilizar a energia elástica. Ênfase recomendada: Treinamento pliométrico de baixa e média intensidade, exercícios reativos e técnica de salto.";
        zoneClass = "text-rose-500";
      } else {
        interpretation = "Zona Ótima de Eficiência Neuromuscular";
        recommendation = "Equilíbrio ideal entre força e reatividade. Recomendação: Manutenção do programa atual com progressão equilibrada de cargas e saltos.";
        zoneClass = "text-emerald-500";
      }

      return { 
        eur, 
        sscDiff, 
        sscTotal,
        label: 'Análise Biomecânica SSC/EUR', 
        isAnalytics: true,
        interpretation,
        recommendation,
        zoneClass
      };
    }

    if (testType === 'rsi') {
      const jh = parseFloat(jumpHeightRsi);
      const ct = parseFloat(contactTime);
      if (!jh || !ct) return null;
      const rsi = jh / ct;

      let interpretation = "";
      let recommendation = "";
      if (rsi < 1.5) {
        interpretation = "Capacidade Reativa Limitada";
        recommendation = "Foco em pliometria extensiva e técnica de contato rápido com o solo.";
      } else if (rsi <= 2.0) {
        interpretation = "Capacidade Reativa Moderada";
        recommendation = "Atleta apto a pliometria de intensidade moderada.";
      } else if (rsi <= 2.5) {
        interpretation = "Boa Capacidade Reativa";
        recommendation = "Ênfase em pliometria de média e alta intensidade.";
      } else {
        interpretation = "Nível Elite de Força Reativa";
        recommendation = "Capacidade máxima de reatividade. Foco em manutenção e potência específica.";
      }

      return { 
        rsiValue: rsi, 
        label: test.title, 
        isRsi: true,
        interpretation,
        recommendation
      };
    }

    return null;
  }, [testType, mass, value, sjHeight, cmjHeight, contactTime, jumpHeightRsi]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* SELEÇÃO DO TESTE */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bento-card bg-slate-900/50 border-slate-800 p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Zap className="w-16 h-16 text-yellow-500" />
          </div>
          
          <div className="mb-8">
            <p className="label-caps italic mb-1 text-emerald-500">Módulo Científico</p>
            <h3 className="text-xl font-black text-white uppercase italic">Potência & Velocidade</h3>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="label-caps italic text-xs text-slate-400">Selecione o Protocolo</label>
              <select 
                value={testType}
                onChange={(e) => { setTestType(e.target.value); setValue(''); }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-sm font-black text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer hover:bg-slate-700"
              >
                {Object.entries(POWER_TESTS).map(([id, t]) => (
                  <option key={id} value={id}>{t.title}</option>
                ))}
              </select>
              <p className="text-[9px] text-slate-500 font-bold uppercase italic tracking-widest mt-1">
                {POWER_TESTS[testType].subtitle}
              </p>
            </div>

            <div className="space-y-4 pt-6 border-t border-white/5">
              <div className="space-y-2">
                <label className="label-caps italic text-xs">Massa Corporal (kg)</label>
                <input 
                  type="number"
                  value={mass}
                  onChange={(e) => setMass(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-black outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-lg"
                />
              </div>

              {testType === 'ssc_analytics' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="label-caps italic text-xs">Squat Jump (SJ - cm)</label>
                    <input 
                      type="number"
                      placeholder="Salto estático (90º)"
                      value={sjHeight}
                      onChange={(e) => setSjHeight(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-black outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="label-caps italic text-xs">Countermovement (CMJ - cm)</label>
                    <input 
                      type="number"
                      placeholder="Salto com contramovimento"
                      value={cmjHeight}
                      onChange={(e) => setCmjHeight(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-black outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              ) : testType === 'rsi' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="label-caps italic text-xs">Altura do Salto (cm)</label>
                    <input 
                      type="number"
                      placeholder="Altura (H)"
                      value={jumpHeightRsi}
                      onChange={(e) => setJumpHeightRsi(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-black outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="label-caps italic text-xs">Tempo de Contato (s)</label>
                    <input 
                      type="number"
                      step="0.001"
                      placeholder="Ex: 0.250"
                      value={contactTime}
                      onChange={(e) => setContactTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-black outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="label-caps italic text-xs">
                    {POWER_TESTS[testType].inputLabel}
                  </label>
                  <input 
                    type="number"
                    placeholder="0"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-black outline-none focus:ring-1 focus:ring-yellow-500 transition-all text-xl"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RESULTADOS E INTERPRETAÇÃO */}
      <div className="lg:col-span-8 space-y-8">
        {results ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {/* RESULTADOS VISUAIS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`bento-card border-none ${results.isAnalytics || results.isRsi ? 'bg-purple-600' : 'bg-yellow-500'} p-8 flex flex-col justify-between relative overflow-hidden shadow-xl`}>
                <div className="relative z-10">
                  <p className={`text-[10px] font-black ${results.isAnalytics || results.isRsi ? 'text-white/60' : 'text-black/60'} uppercase italic tracking-widest mb-2`}>Métrica Principal</p>
                  <h3 className={`text-6xl font-black ${results.isAnalytics || results.isRsi ? 'text-white' : 'text-black'} italic tracking-tighter`}>
                    {results.isAnalytics ? results.eur?.toFixed(2) : results.isRsi ? results.rsiValue?.toFixed(2) : Math.round(results.peakPower as number)}
                    <span className="text-xl ml-2 opacity-40 uppercase">{results.isAnalytics ? 'EUR' : results.isRsi ? 'RSI' : 'Watts'}</span>
                  </h3>
                </div>
                <Zap className={`absolute -right-8 -bottom-8 w-48 h-48 opacity-10 rotate-12 ${results.isAnalytics || results.isRsi ? 'text-white' : 'text-black'}`} />
              </div>

              <div className="bento-card bg-slate-900 border-slate-800 p-8 flex flex-col justify-between shadow-xl">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase italic tracking-widest mb-2">
                    {results.isAnalytics ? 'SSC Eficiência' : results.isRsi ? 'H/TC Ratio' : 'Potência Relativa'}
                  </p>
                  <h3 className="text-5xl font-black text-white italic tracking-tighter">
                    {results.isAnalytics ? `${results.sscTotal?.toFixed(1)}%` : results.isRsi ? (results.rsiValue as number).toFixed(2) : (results.relativePower as number).toFixed(1)}
                    <span className="text-xl ml-2 opacity-30 italic">{results.isAnalytics ? 'Ref' : results.isRsi ? 'Index' : 'W/kg'}</span>
                  </h3>
                </div>
                <div className="mt-6">
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${results.isAnalytics ? (results.sscTotal as number >= 100 && results.sscTotal as number <= 110 ? 'bg-emerald-500' : 'bg-yellow-500') : 'bg-blue-500'}`} 
                      style={{ width: `${Math.min(((results.isAnalytics ? results.sscTotal as number : results.relativePower as number * 2) / 120) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[8px] font-black text-slate-600 uppercase italic">Base</span>
                    <span className="text-[8px] font-black text-slate-600 uppercase italic">Alta Performance</span>
                  </div>
                </div>
              </div>
            </div>

            {/* INTERPRETAÇÃO CIENTÍFICA */}
            <div className="bento-card bg-slate-900 border-slate-800 p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-8">
                <BrainCircuit className="w-6 h-6 text-emerald-500" />
                <h3 className="text-xl font-black text-white uppercase italic tracking-widest">Interpretação e Análise</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Diagnóstico Neuromuscular</h4>
                  <div className={`text-lg font-black italic uppercase leading-tight ${results.zoneClass || 'text-white'}`}>
                    {results.interpretation}
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic">
                    Baseado em literatura consolidada sobre Eurcentric Utilization Ratio (EUR) e reatividade muscular.
                  </p>
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-[2rem] space-y-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Conduta Recomendada</h4>
                  </div>
                  <p className="text-[12px] text-slate-300 font-bold leading-relaxed">
                    {results.recommendation || "Continue o monitoramento periódico para validar a evolução da potência específica."}
                  </p>
                </div>
              </div>
            </div>

            {/* BOX DE REFERÊNCIA */}
            <div className="bg-slate-950/50 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row items-center gap-6 opacity-60">
               <div className="p-3 bg-slate-900 rounded-xl"><Info className="w-5 h-5 text-slate-500" /></div>
               <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed text-center md:text-left">
                 A análise de potência do WMPS segue diretrizes da NSCA e ACSM. O EUR (Eccentric Utilization Ratio) é calculado via CMJ/SJ, sendo o padrão-ouro para identificar a contribuição do componente elástico do músculo.
               </p>
            </div>
          </motion.div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-20 text-center bg-slate-900/10 border-2 border-dashed border-slate-800 rounded-[3rem]">
            <div className="w-20 h-20 bg-slate-900/50 rounded-full flex items-center justify-center mb-6">
              <Dumbbell className="w-10 h-10 text-slate-700" />
            </div>
            <h4 className="text-slate-500 font-black uppercase italic tracking-[0.2em]">Aguardando Dados</h4>
            <p className="text-slate-600 text-xs mt-3 max-w-[280px] font-medium">Selecione um teste e insira os resultados obtidos em campo para gerar a análise bioenergética.</p>
          </div>
        )}
      </div>

      {/* VINCULAÇÃO A ATLETA */}
      {athletes && onSave && (
        <div className="lg:col-span-12">
          <div className="bento-card bg-slate-900 border-slate-800 p-8 flex flex-col md:flex-row items-end gap-6 shadow-2xl">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Identificar Atleta</span>
              </div>
              <select
                value={selectedAthleteId}
                onChange={(e) => setSelectedAthleteId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-black text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all h-[52px]"
              >
                <option value="">Selecione o Aluno...</option>
                {athletes.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
              </select>
            </div>
            <button 
              disabled={!selectedAthleteId || !results || isSaving}
              onClick={async () => {
                setIsSaving(true);
                const ath = athletes.find(a => a.id === selectedAthleteId);
                await onSave(selectedAthleteId, ath?.full_name, { 
                  testType,
                  mass: parseFloat(mass),
                  results,
                  input: { value, sjHeight, cmjHeight, jumpHeightRsi, contactTime }
                });
                setIsSaving(false);
                alert('Avaliação de potência salva com sucesso!');
              }}
              className="px-12 h-[52px] bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black uppercase text-[11px] rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-600/20 tracking-widest"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Registrar Avaliação</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PowerClassCard({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="p-5 bg-slate-800/50 rounded-2xl border border-slate-800 group hover:border-yellow-500/50 transition-all">
       <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-slate-900 rounded-lg text-yellow-500">{icon}</div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{label}</span>
       </div>
       <div className="text-lg font-black text-white italic uppercase tracking-widest">{value}</div>
    </div>
  );
}

function AnthropometricAssessmentModule({ athletes, onSave }: { athletes?: any[], onSave?: (athleteId: string, name: string, data: any) => void }) {
  const [weight, setWeight] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    if (selectedAthleteId && athletes) {
      const athlete = athletes.find(a => a.id === selectedAthleteId);
      if (athlete) {
        if (athlete.weight) setWeight(athlete.weight.toString());
        if (athlete.height) setHeight(athlete.height.toString());
        if (athlete.gender) setGender(athlete.gender as any);
        if (athlete.birth_date) {
          const years = Math.floor(differenceInDays(new Date(), parseISO(athlete.birth_date)) / 365.25);
          setAge(years.toString());
        }
      }
    }
  }, [selectedAthleteId, athletes]);

  
  // Perimeters
  const [waist, setWaist] = useState<string>('');
  const [hip, setHip] = useState<string>('');

  // Skinfolds
  const [triceps, setTriceps] = useState<string>('');
  const [subscapular, setSubscapular] = useState<string>('');
  const [suprailiac, setSuprailiac] = useState<string>('');
  const [abdominal, setAbdominal] = useState<string>('');
  const [chest, setChest] = useState<string>('');
  const [thigh, setThigh] = useState<string>('');
  const [midaxillary, setMidaxillary] = useState<string>('');
  const [biceps, setBiceps] = useState<string>('');

  const results = useMemo(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100;
    const a = parseFloat(age);
    const wc = parseFloat(waist);
    const hc = parseFloat(hip);
    
    if (!w || !h) return null;

    const imc = w / (h * h);
    const rcq = wc && hc ? wc / hc : null;
    
    const tr = parseFloat(triceps) || 0;
    const sb = parseFloat(subscapular) || 0;
    const si = parseFloat(suprailiac) || 0;
    const ab = parseFloat(abdominal) || 0;
    const ch = parseFloat(chest) || 0;
    const th = parseFloat(thigh) || 0;
    const ma = parseFloat(midaxillary) || 0;
    const bi = parseFloat(biceps) || 0;

    const sum7 = tr + sb + si + ab + ch + th + ma;
    const sum4 = tr + bi + sb + si;
    
    let bodyFatPollock = null;
    let bodyFatSlaughter = null;
    let bodyFatDurnin = null;

    if (tr && sb && si && ab && ch && th && ma && a) {
      let density = 0;
      if (gender === 'male') {
        density = 1.112 - (0.00043499 * sum7) + (0.00000055 * sum7 * sum7) - (0.00028826 * a);
      } else {
        density = 1.097 - (0.00046971 * sum7) + (0.00000056 * sum7 * sum7) - (0.00012828 * a);
      }
      bodyFatPollock = ((4.95 / density) - 4.50) * 100;
    }

    if (tr && sb && a <= 18) {
      const sum2 = tr + sb;
      if (gender === 'male') {
        bodyFatSlaughter = 1.21 * sum2 - 0.008 * (sum2 * sum2) - 1.7;
      } else {
        bodyFatSlaughter = 1.33 * sum2 - 0.013 * (sum2 * sum2) - 2.5;
      }
    }

    if (tr && bi && sb && si && a) {
      const logSum = Math.log10(sum4);
      let density = 0;
      if (gender === 'male') {
        if (a < 20) density = 1.162 - 0.063 * logSum;
        else if (a < 30) density = 1.1631 - 0.0632 * logSum;
        else if (a < 40) density = 1.1422 - 0.0544 * logSum;
        else if (a < 50) density = 1.162 - 0.07 * logSum;
        else density = 1.1715 - 0.0779 * logSum;
      } else {
        if (a < 20) density = 1.1549 - 0.0678 * logSum;
        else if (a < 30) density = 1.1599 - 0.0717 * logSum;
        else if (a < 40) density = 1.1423 - 0.0632 * logSum;
        else if (a < 50) density = 1.1333 - 0.0612 * logSum;
        else density = 1.1339 - 0.0645 * logSum;
      }
      bodyFatDurnin = ((4.95 / density) - 4.50) * 100;
    }

    const bodyFat = bodyFatPollock || bodyFatDurnin || bodyFatSlaughter;
    const fatMassValue = bodyFat ? (w * bodyFat) / 100 : null;
    const leanMassValue = fatMassValue !== null ? w - fatMassValue : null;

    // Classification based on ACSM guidelines (simplified)
    let classification = "Não Calculado";
    if (bodyFat) {
      if (gender === 'male') {
        // ACSM 11th ed. (2022) norms - Men
        if (bodyFat < 6) classification = "Mínimo Essencial (Risco Fisiológico)";
        else if (bodyFat <= 13) classification = "Atleta (Excelente — Percentil â‰¥90)";
        else if (bodyFat <= 17) classification = "Acima da Média (Percentil 75–89)";
        else if (bodyFat <= 24) classification = "Média (Percentil 25–74)";
        else classification = "Excesso de Gordura Corporal (â‰¥Percentil 95)";
      } else {
        // ACSM 11th ed. (2022) norms - Women
        if (bodyFat < 14) classification = "Mínimo Essencial (Risco Fisiológico)";
        else if (bodyFat <= 20) classification = "Atleta (Excelente — Percentil â‰¥90)";
        else if (bodyFat <= 24) classification = "Acima da Média (Percentil 75–89)";
        else if (bodyFat <= 31) classification = "Média (Percentil 25–74)";
        else classification = "Excesso de Gordura Corporal (â‰¥Percentil 95)";
      }
    }

    return { 
      imc, 
      rcq, 
      bodyFat, 
      bodyFatPollock, 
      bodyFatSlaughter, 
      bodyFatDurnin,
      fatMass: fatMassValue, 
      leanMass: leanMassValue,
      classification,
      status: bodyFat ? 'Calculado' : 'Parcial' 
    };
  }, [weight, height, age, gender, triceps, subscapular, suprailiac, abdominal, chest, thigh, midaxillary, biceps, waist, hip]);

  return (
    <div className="flex flex-col gap-8">
      {/* Input Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Section 1: Basic Profile */}
        <div className="bento-card bg-slate-900 border-slate-800 p-6 space-y-6">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                <Scale className="w-4 h-4 text-blue-500" />
             </div>
             <h3 className="text-sm font-black text-white uppercase italic">Perfil Básico</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <InputField label="Peso (kg)" value={weight} set={setWeight} />
             <InputField label="Altura (cm)" value={height} set={setHeight} />
             <InputField label="Idade" value={age} set={setAge} />
             <div className="space-y-1">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Gênero</span>
                <select 
                  value={gender} 
                  onChange={e => setGender(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm h-[42px] focus:ring-1 focus:ring-blue-500 transition-all outline-none"
                >
                   <option value="male">Masc</option>
                   <option value="female">Fem</option>
                </select>
             </div>
          </div>
        </div>

        {/* Section 2: Perimeters */}
        <div className="bento-card bg-slate-900 border-slate-800 p-6 space-y-6">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center border border-emerald-500/30">
                <MoveHorizontal className="w-4 h-4 text-emerald-500" />
             </div>
             <h3 className="text-sm font-black text-white uppercase italic">Perímetros (cm)</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <InputField label="Cintura" value={waist} set={setWaist} />
             <InputField label="Quadril" value={hip} set={setHip} />
             <InputField label="Braço" value="" set={() => {}} disabled />
             <InputField label="Coxa" value="" set={() => {}} disabled />
          </div>
          <p className="text-[9px] text-slate-600 font-bold uppercase italic">* Cintura no ponto mais estreito</p>
        </div>

        {/* Section 3: Skinfolds */}
        <div className="bento-card bg-slate-900 border-slate-800 p-6 space-y-6 md:col-span-2 xl:col-span-1">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-rose-600/20 flex items-center justify-center border border-rose-500/30">
                <Zap className="w-4 h-4 text-rose-500" />
             </div>
             <h3 className="text-sm font-black text-white uppercase italic">Dobras (mm)</h3>
          </div>
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 xl:grid-cols-2 gap-3">
             <InputField label="Tríceps" value={triceps} set={setTriceps} />
             <InputField label="Subescap." value={subscapular} set={setSubscapular} />
             <InputField label="Supra-ilíaca" value={suprailiac} set={setSuprailiac} />
             <InputField label="Abdominal" value={abdominal} set={setAbdominal} />
             <InputField label="Peitoral" value={chest} set={setChest} />
             <InputField label="Coxa" value={thigh} set={setThigh} />
             <InputField label="Axilar M." value={midaxillary} set={setMidaxillary} />
             <InputField label="Bíceps" value={biceps} set={setBiceps} />
          </div>
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          {results ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bento-card bg-rose-600 border-none p-8 flex flex-col justify-between overflow-hidden relative shadow-2xl shadow-rose-900/20">
                  <div className="relative z-10">
                    <p className="text-[10px] font-black text-white/50 uppercase italic tracking-widest mb-2">Composição Corporal (%G)</p>
                    <div className="flex items-baseline gap-2">
                       <h3 className="text-6xl font-black text-white italic">{results.bodyFat?.toFixed(1) || "--"}</h3>
                       <span className="text-xl font-black text-white/40">%</span>
                    </div>
                    <div className="mt-4 px-3 py-1.5 bg-white/10 rounded-lg inline-flex items-center gap-2 border border-white/5">
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        <span className="text-[11px] font-black text-white uppercase">{results.classification}</span>
                    </div>
                  </div>
                  <Scale className="absolute -right-8 -bottom-8 w-48 h-48 opacity-10 rotate-12 text-white" />
                </div>

                <div className="bento-card bg-slate-900 border-slate-800 p-8 flex flex-col justify-between">
                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">IMC</p>
                         <h4 className="text-3xl font-black text-white italic">{results.imc.toFixed(1)}</h4>
                         <p className="text-[9px] font-bold text-rose-500 uppercase">{results.imc < 25 ? "Saudável" : "Risco"}</p>
                      </div>
                      <div className="space-y-1">
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">RCQ</p>
                         <h4 className="text-3xl font-black text-white italic">{results.rcq?.toFixed(2) || "--"}</h4>
                         <p className="text-[9px] font-bold text-emerald-500 uppercase">{results.rcq && results.rcq < 0.90 ? "Baixo Risco" : "Verificar"}</p>
                      </div>
                   </div>
                   <div className="mt-8 pt-6 border-t border-slate-800 space-y-4">
                      <MetricRow label="Massa Magra" value={results.leanMass?.toFixed(1)} unit="kg" color="text-white" />
                      <MetricRow label="Massa Gorda" value={results.fatMass?.toFixed(1)} unit="kg" color="text-rose-500" />
                   </div>
                </div>
              </div>

              {/* Protocol Analysis */}
              <div className="bento-card bg-slate-900/50 border-slate-800 p-8">
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                      <p className="label-caps italic mb-1">Cálculo Diferencial</p>
                      <h3 className="text-xl font-black text-white uppercase italic">Análise de Protocolos ACSM</h3>
                    </div>
                    <div className="flex gap-2">
                       <span className="px-3 py-1 bg-slate-800 rounded-lg text-[10px] font-black text-slate-400 border border-slate-700">7-G: {results.bodyFatPollock ? "OK" : "Pendente"}</span>
                       <span className="px-3 py-1 bg-slate-800 rounded-lg text-[10px] font-black text-slate-400 border border-slate-700">Idoso: Durnin</span>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <ProtocolSummary 
                      title="Pollock (Adultos)" 
                      val={results.bodyFatPollock} 
                      desc="Recomendado pela NSCA para atletas adultos." 
                    />
                    <ProtocolSummary 
                      title="Durnin (Geral)" 
                      val={results.bodyFatDurnin} 
                      desc="Sensível á densidade óssea por faixa etária." 
                    />
                    <ProtocolSummary 
                      title="Slaughter (Jovens)" 
                      val={results.bodyFatSlaughter} 
                      desc="Equação padrão para fase de maturação." 
                    />
                 </div>
              </div>
            </>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-900/50 border border-dashed border-slate-800 rounded-[2rem] p-12 text-center group">
               <Scale className="w-16 h-16 text-slate-800 mb-6 group-hover:scale-110 transition-transform" />
               <h3 className="text-xl font-black text-slate-500 uppercase italic">Dados Pendentes</h3>
               <p className="text-slate-600 text-[10px] font-bold uppercase mt-2 max-w-[280px] leading-relaxed">
                  Insira o peso e as dobras cutâneas para desbloquear a análise detalhada de composição corporal.
               </p>
            </div>
          )}
        </div>

        {/* Sidebar References */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bento-card border-none bg-gradient-to-br from-indigo-600 to-purple-600 p-8">
              <div className="flex items-center gap-3 mb-6 font-black uppercase italic tracking-widest text-[10px] text-white/60">
                 <Info className="w-4 h-4" /> Diretrizes Científicas
              </div>
              <div className="space-y-4">
                 <div className="p-4 bg-white/10 rounded-2xl border border-white/5 backdrop-blur-sm">
                    <h4 className="text-[10px] font-black text-white uppercase italic mb-1">Padrão Pollock</h4>
                    <p className="text-[9px] text-white/70 font-medium leading-relaxed">As medições devem ser realizadas do lado direito do corpo de acordo com o protocolo ACSM.</p>
                 </div>
                 <div className="p-4 bg-white/10 rounded-2xl border border-white/5 backdrop-blur-sm">
                    <h4 className="text-[10px] font-black text-white uppercase italic mb-1">WHR (RCQ)</h4>
                    <p className="text-[9px] text-white/70 font-medium leading-relaxed">Valores acima de 0.95 (Homens) e 0.86 (Mulheres) indicam risco coronariano elevado.</p>
                 </div>
              </div>
           </div>

           <div className="bento-card bg-slate-900 border-slate-800 p-8">
               <h4 className="text-[10px] font-black text-slate-500 uppercase italic mb-4">Normas ACSM — Classificação por Percentil</h4>
               <div className="space-y-3">
                  <RankingRow label="Atleta (â‰¥Percentil 90)" range="6–13% (M) | 14–20% (F)" active={results?.bodyFat ? results.bodyFat < 13 : false} />
                  <RankingRow label="Acima da Média (P75–89)" range="14–17% (M) | 21–24% (F)" active={results?.bodyFat ? results.bodyFat >= 14 && results.bodyFat <= 17 : false} />
                  <RankingRow label="Média (P25–74)" range="18–24% (M) | 25–31% (F)" active={results?.bodyFat ? results.bodyFat >= 18 && results.bodyFat <= 24 : false} />
                  <RankingRow label="Excesso de Gordura (â‰¥P95)" range=">25% (M) | >32% (F)" active={results?.bodyFat ? results.bodyFat > 25 : false} />
               </div>
           </div>
           
           {athletes && onSave && (
              <div className="bento-card bg-slate-900 border-slate-800 p-8 space-y-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Vincular a Atleta</span>
                  <select
                    value={selectedAthleteId}
                    onChange={(e) => setSelectedAthleteId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm outline-none focus:ring-1 focus:ring-rose-500 transition-all"
                  >
                    <option value="">Selecione o Atleta</option>
                    {athletes.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                  </select>
                </div>
                <button 
                  disabled={!selectedAthleteId || !weight || !height || isSaving}
                  onClick={async () => {
                    if (!selectedAthleteId || !weight || !height) return;
                    setIsSaving(true);
                    const ath = athletes.find(a => a.id === selectedAthleteId);
                    await onSave(selectedAthleteId, ath?.full_name, { 
                      weight: parseFloat(weight), 
                      height: parseFloat(height), 
                      bodyFat: results?.bodyFat,
                      imc: results?.imc
                    });
                    setIsSaving(false);
                    alert('Avaliação antropométrica salva com sucesso!');
                  }}
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black uppercase text-[10px] py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Avaliação'}
                </button>
              </div>
           )}
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, set, disabled = false }: { label: string, value: string, set: (v: string) => void, disabled?: boolean }) {
  return (
    <div className="space-y-1 group">
       <div className="flex justify-between items-center px-1">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest group-focus-within:text-blue-500 transition-colors">{label}</span>
       </div>
       <input 
         type="number" 
         disabled={disabled}
         value={value} 
         onChange={e => set(e.target.value)} 
         placeholder={disabled ? "--" : "0"}
         className={`w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-black text-lg focus:ring-1 focus:ring-blue-500 transition-all outline-none placeholder:text-slate-700 ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
       />
    </div>
  );
}

function MetricRow({ label, value, unit, color }: { label: string, value?: string, unit: string, color: string }) {
  return (
    <div className="flex items-center justify-between group">
       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
       <div className="flex items-baseline gap-1">
          <span className={`text-xl font-black italic ${color}`}>{value || "--"}</span>
          <span className="text-[10px] font-bold text-slate-600 uppercase">{unit}</span>
       </div>
    </div>
  );
}

function ProtocolSummary({ title, val, desc }: { title: string, val: number | null, desc: string }) {
  return (
    <div className={`p-5 rounded-2xl border transition-all ${val ? 'bg-slate-800 border-white/10' : 'bg-slate-900/30 border-slate-800 opacity-40'}`}>
       <h4 className="text-[11px] font-black text-white uppercase italic mb-1">{title}</h4>
       <div className="text-xl font-black text-blue-500 italic mb-2">{val ? val.toFixed(1) + "%" : "--"}</div>
       <p className="text-[9px] text-slate-500 font-bold uppercase leading-tight">{desc}</p>
    </div>
  );
}

function RankingRow({ label, range, active }: { label: string, range: string, active: boolean }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${active ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-600/20' : 'bg-slate-800/30 border-slate-800'}`}>
       <span className={`text-[9px] font-black uppercase ${active ? 'text-white' : 'text-slate-400'}`}>{label}</span>
       <span className={`text-[9px] font-bold uppercase ${active ? 'text-white/80' : 'text-slate-600'}`}>{range}</span>
    </div>
  );
}

function EnduranceAssessmentModule({ athletes, onSave }: { athletes?: any[], onSave?: (athleteId: string, name: string, data: any) => void }) {
  const [age, setAge] = useState<string>('');
  const [testType, setTestType] = useState<'beep' | 'yoyo' | 'vift' | 'vcrit' | 'submax' | 'vvo2_tlim'>('beep');
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // vVO2max + Tlim State
  const [vVO2maxInput, setVVO2maxInput] = useState<string>('');
  const [tlimInput, setTlimInput] = useState<string>('');

  useEffect(() => {
    if (selectedAthleteId && athletes) {
      const athlete = athletes.find(a => a.id === selectedAthleteId);
      if (athlete) {
        if (athlete.birth_date) {
          const years = Math.floor(differenceInDays(new Date(), parseISO(athlete.birth_date)) / 365.25);
          setAge(years.toString());
        }
      }
    }
  }, [selectedAthleteId, athletes]);

  
  // Beep Test State
  const [beepStage, setBeepStage] = useState<string>('');
  
  // Yo-Yo State
  const [yoyoLevel, setYoyoLevel] = useState<string>('');
  const [yoyoShuttles, setYoyoShuttles] = useState<string>('');
  
  // VIFT State
  const [viftFinalSpeed, setViftFinalSpeed] = useState<string>('');
  
  // Vcrit State
  const [vcritProtocol, setVcritProtocol] = useState<'2points' | '6min'>('2points');
  const [dist1, setDist1] = useState<string>('1200');
  const [time1, setTime1] = useState<string>('360'); // 6 min
  const [dist2, setDist2] = useState<string>('2400');
  const [time2, setTime2] = useState<string>('720'); // 12 min

  // Submax State
  const [submaxSpeed, setSubmaxSpeed] = useState<string>('');
  const [submaxHR, setSubmaxHR] = useState<string>('');
  const [restingHR, setRestingHR] = useState<string>('');

  const results = useMemo(() => {
    const a = parseFloat(age);
    if (!a && testType !== 'vcrit') return null;

    if (testType === 'submax') {
      const v = parseFloat(submaxSpeed);
      const hr = parseFloat(submaxHR);
      const rhr = parseFloat(restingHR);
      const maxHR_est = 208 - (0.7 * a); // Tanaka equation
      
      if (v && hr && rhr) {
        // ACSM Running VO2 (horizontal, grade=0): VO2 = 3.5 + 0.2 * v_mmin
        const v_mmin = v * 1000 / 60; // km/h to m/min
        const vo2_submax = 3.5 + (0.2 * v_mmin);
        
        // ãâ‚Â¦strand-Ryhming method adjusted by Tanaka FC_max:
        // VO2max = VO2_submax * (FC_max / FC_submax)
        const vo2max_est = vo2_submax * (maxHR_est / hr);
        
        // vVO2max: speed at VO2max (from ACSM equation inverted: v = (VO2max - 3.5) / 0.2)
        const v_mmin_vo2max = (vo2max_est - 3.5) / 0.2;  // m/min
        const vVO2max = v_mmin_vo2max * 60 / 1000; // back to km/h
        
        return { vo2max: vo2max_est, vVO2max, speed: v, type: 'Submáximo (Pred. ãâ‚Â¦strand/Tanaka)' };
      }
    }

    if (testType === 'beep') {
      const stage = parseFloat(beepStage);
      if (!stage) return null;
      
      // Speed (km/h) = 8.0 + (stage * 0.5)
      const speed = 8.0 + (stage * 0.5);
      
      // Léger et al. (1988) formula
      const vo2max = 31.025 + (3.238 * speed) - (3.248 * a) + (0.1536 * speed * a);
      const vVO2max = speed; // Approximation
      
      return { vo2max, vVO2max, speed, type: 'Beep Test' };
    }

    if (testType === 'yoyo') {
      // Bangsbo et al. (2008): VO2max = dist_total(m) * 0.0084 + 36.4
      // Input: total distance run (m) ââââ‚Â¬â‚Â registered directly from the test result sheet
      const dist = parseFloat(yoyoLevel); // yoyoLevel field repurposed as total distance
      if (!dist) return null;
      const vo2max = dist * 0.0084 + 36.4;
      return { vo2max, distance: dist, type: 'Yo-Yo IR1 (Bangsbo, 2008)' };
    }

    if (testType === 'vift') {
      const speed = parseFloat(viftFinalSpeed);
      if (!speed) return null;
      // VIFT specific logic
      return { viftSpeed: speed, type: 'VIFT 30-15' };
    }

    if (testType === 'vcrit') {
      if (vcritProtocol === '2points') {
        const d1 = parseFloat(dist1);
        const t1 = parseFloat(time1);
        const d2 = parseFloat(dist2);
        const t2 = parseFloat(time2);
        
        if (d1 && t1 && d2 && t2 && t2 !== t1) {
          const vcrit = (d2 - d1) / (t2 - t1); // m/s
          const vcritKmh = vcrit * 3.6;
          
          // Estimate vVO2max (usually Vcrit is ~85-88% of vVO2max)
          const vVO2max = vcritKmh / 0.88;
          const speed_mmin = vVO2max * 1000 / 60;
          const vo2max = 3.5 + (0.2 * speed_mmin);
          
          return { 
            vcrit: vcritKmh, 
            vVO2max, 
            vo2max,
            type: 'Vcrit (2 Pontos Linear)',
            isVcrit: true 
          };
        }
      } else {
        // Protocolo 6 Minutos (Billat et al.)
        // Speed at 6 min is approximately vVO2max
        const d1 = parseFloat(dist1);
        if (d1) {
          const vVO2max = (d1 / 360) * 3.6; // km/h
          const vcritKmh = vVO2max * 0.88; // Estimate Vcrit as 88% of vVO2max
          const speed_mmin = vVO2max * 1000 / 60;
          const vo2max = 3.5 + (0.2 * speed_mmin);
          
          return {
            vcrit: vcritKmh,
            vVO2max,
            vo2max,
            type: 'Vcrit (Predição 6 min)',
            isVcrit: true
          };
        }
      }
    }

    if (testType === 'vvo2_tlim') {
      const v = parseFloat(vVO2maxInput);
      const tlim = parseFloat(tlimInput);
      if (v && tlim) {
        const v_mmin = v * 1000 / 60;
        const vo2max = 3.5 + (0.2 * v_mmin);
        return { 
          vo2max, 
          vVO2max: v, 
          tlim, 
          type: 'vVO₂max + Tlim (Billat)',
          isTlim: true
        };
      }
    }

    return null;
  }, [testType, age, beepStage, yoyoLevel, yoyoShuttles, viftFinalSpeed, dist1, time1, dist2, time2, vVO2maxInput, tlimInput]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-4 space-y-6">
        <div className="bento-card bg-slate-900 border-slate-800 p-6 space-y-6">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center border border-emerald-500/30">
                <Timer className="w-4 h-4 text-emerald-500" />
             </div>
             <h3 className="text-sm font-black text-white uppercase italic">Configuração do Teste</h3>
          </div>

          <div className="space-y-4">
             <div className="space-y-1">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Protocolo</span>
                <select 
                  value={testType} 
                  onChange={e => setTestType(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                >
                   <option value="beep">Beep Test (20m Shuttle)</option>
                   <option value="yoyo">Yo-Yo Intermittent Recovery</option>
                   <option value="vift">VIFT 30-15</option>
                   <option value="submax">Submáximo (Esteira/Bike)</option>
                   <option value="vcrit">Velocidade Crítica (Vcrit)</option>
                   <option value="vvo2_tlim">vVO₂max + Tempo Limite (Tlim)</option>
                </select>
             </div>

             <InputField label="Idade do Atleta" value={age} set={setAge} />

             <div className="pt-4 border-t border-slate-800 space-y-4">
                {testType === 'submax' && (
                  <div className="space-y-4">
                    <InputField label="Velocidade Atual (km/h)" value={submaxSpeed} set={setSubmaxSpeed} />
                    <InputField label="Freq. Cardíaca no Teste (bpm)" value={submaxHR} set={setSubmaxHR} />
                    <InputField label="Freq. Cardíaca Repouso (bpm)" value={restingHR} set={setRestingHR} />
                  </div>
                )}
                
                {testType === 'beep' && (
                  <InputField label="Último Estágio Completado" value={beepStage} set={setBeepStage} />
                )}
                
                {testType === 'yoyo' && (
                  <div className="space-y-2">
                    <InputField label="Distância Total Percorrida (m)" value={yoyoLevel} set={setYoyoLevel} />
                    <p className="text-[9px] text-slate-600 font-bold italic">* Dist. total acumulada da folha de resultado (ex: 1120m)</p>
                  </div>
                )}

                {testType === 'vift' && (
                   <InputField label="VIFT Speed (km/h)" value={viftFinalSpeed} set={setViftFinalSpeed} />
                )}

                {testType === 'vcrit' && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Protocolo Vcrit</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setVcritProtocol('2points')}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter border transition-all ${vcritProtocol === '2points' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                        >
                          2 Pontos
                        </button>
                        <button 
                          onClick={() => setVcritProtocol('6min')}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter border transition-all ${vcritProtocol === '6min' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                        >
                          6 Minutos
                        </button>
                      </div>
                    </div>

                    {vcritProtocol === '2points' ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <InputField label="Distância 1 (m)" value={dist1} set={setDist1} />
                          <InputField label="Tempo 1 (seg)" value={time1} set={setTime1} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <InputField label="Distância 2 (m)" value={dist2} set={setDist2} />
                          <InputField label="Tempo 2 (seg)" value={time2} set={setTime2} />
                        </div>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <InputField label="Distância Máxima em 6 min (m)" value={dist1} set={setDist1} />
                        <p className="text-[9px] text-slate-600 font-bold italic">* Correr a maior distância possível em exatamente 360 segundos.</p>
                      </div>
                    )}
                  </div>
                )}

                {testType === 'vvo2_tlim' && (
                  <div className="space-y-4">
                    <InputField label="vVO₂max Identificada (km/h)" value={vVO2maxInput} set={setVVO2maxInput} />
                    <InputField label="Tempo Limite - Tlim (seg)" value={tlimInput} set={setTlimInput} />
                    <p className="text-[9px] text-slate-600 font-bold italic">* Correr na vVO₂max até a exaustão para medir o Tlim.</p>
                  </div>
                )}
             </div>
          </div>
        </div>
        
        {testType === 'beep' && <BeepReferenceTable />}
      </div>

      <div className="lg:col-span-8 space-y-6">
        {results ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bento-card bg-emerald-600 border-none p-8 flex flex-col justify-between overflow-hidden relative shadow-2xl">
                <div className="relative z-10">
                  <p className="text-[10px] font-black text-white/50 uppercase italic tracking-widest mb-2">VO2máx Estimado</p>
                  <div className="flex items-baseline gap-2">
                     <h3 className="text-6xl font-black text-white italic">{results.vo2max?.toFixed(1) || "--"}</h3>
                     <span className="text-xl font-black text-white/40">ml/kg/min</span>
                  </div>
                  <div className="mt-4 px-3 py-1.5 bg-white/10 rounded-lg inline-flex items-center gap-2 border border-white/5">
                      <Zap className="w-3 h-3 text-white" />
                      <span className="text-[11px] font-black text-white uppercase">{results.type}</span>
                  </div>
                </div>
                <Timer className="absolute -right-8 -bottom-8 w-48 h-48 opacity-10 rotate-12 text-white" />
              </div>

              <div className="bento-card bg-slate-900 border-slate-800 p-8 flex flex-col justify-between">
                 <div className="space-y-6">
                    <div>
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Velocidade Aeróbica Máxima (vVO2max)</p>
                       <div className="flex items-baseline gap-2 mt-1">
                          <h4 className="text-4xl font-black text-white italic">{results.vVO2max?.toFixed(1) || "--"}</h4>
                          <span className="text-sm font-black text-slate-600">km/h</span>
                       </div>
                    </div>
                    
                    <div className="pt-6 border-t border-slate-800 grid grid-cols-2 gap-6">
                       <div>
                          <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Limiar Sugerido</p>
                          <p className="text-xl font-black text-white italic">{(results.vVO2max ? results.vVO2max * 0.9 : 0).toFixed(1)} <span className="text-[10px] opacity-30">km/h (90%)</span></p>
                       </div>
                       {results.vcrit && (
                         <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Vcrit</p>
                            <p className="text-xl font-black text-emerald-500 italic">{results.vcrit.toFixed(1)} <span className="text-[10px] opacity-30">km/h</span></p>
                         </div>
                       )}
                       {results.isTlim && (
                         <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Tlim</p>
                            <p className="text-xl font-black text-emerald-500 italic">{results.tlim} <span className="text-[10px] opacity-30">seg</span></p>
                         </div>
                       )}
                    </div>
                 </div>
              </div>
            </div>

            <div className="bento-card bg-slate-900 border-slate-800 p-8">
               <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="label-caps italic mb-1">Predição de Performance</p>
                    <h3 className="text-xl font-black text-white uppercase italic">
                      Zonas de Treinamento Baseadas na {results.isVcrit ? 'Vcrit' : 'Velocidade'}
                    </h3>
                  </div>
               </div>
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <EnduranceZone 
                    label="Recuperação" 
                    pct={results.isVcrit ? "< 80% Vcrit" : "< 70%"} 
                    speed={results.isVcrit ? (results.vcrit! * 0.8).toFixed(1) : (results.vVO2max ? (results.vVO2max * 0.7).toFixed(1) : "--")} 
                  />
                  <EnduranceZone 
                    label="Aeróbico" 
                    pct={results.isVcrit ? "85-95% Vcrit" : "70-80%"} 
                    speed={results.isVcrit ? (results.vcrit! * 0.9).toFixed(1) : (results.vVO2max ? (results.vVO2max * 0.8).toFixed(1) : "--")} 
                  />
                  <EnduranceZone 
                    label="Limiar" 
                    pct={results.isVcrit ? "100% Vcrit" : "85-92%"} 
                    speed={results.isVcrit ? results.vcrit!.toFixed(1) : (results.vVO2max ? (results.vVO2max * 0.9).toFixed(1) : "--")} 
                  />
                  <EnduranceZone 
                    label="Intervalado" 
                    pct={results.isVcrit ? "> 105% Vcrit" : "> 100%"} 
                    speed={results.isVcrit ? (results.vcrit! * 1.05).toFixed(1) : (results.vVO2max ? (results.vVO2max * 1.1).toFixed(1) : "--")} 
                  />
               </div>

               {results.isTlim && (
                 <div className="mt-8 p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                       <BrainCircuit className="w-4 h-4 text-emerald-500" />
                       <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Prescrição de Treinamento (HIT Billat)</h4>
                    </div>
                    <p className="text-xs text-slate-300 font-bold leading-relaxed">
                      Protocolo de 50-60% do Tlim: Realizar séries de <span className="text-emerald-500">{Math.round(results.tlim! * 0.5)} segundos</span> na vVO₂max (<span className="text-emerald-500">{results.vVO2max.toFixed(1)} km/h</span>) com recuperação ativa de <span className="text-emerald-500">{Math.round(results.tlim! * 0.5)} segundos</span>.
                    </p>
                 </div>
               )}
            </div>
          </>
        ) : (
          <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-900/50 border border-dashed border-slate-800 rounded-[2rem] p-12 text-center group">
             <Timer className="w-16 h-16 text-slate-800 mb-6 group-hover:scale-110 transition-transform" />
             <h3 className="text-xl font-black text-slate-500 uppercase italic">Aguardando Execução</h3>
             <p className="text-slate-600 text-[10px] font-bold uppercase mt-2 max-w-[280px]">
                Selecione o protocolo e insira os dados do teste para visualizar os resultados de resistência aeróbica.
             </p>
          </div>
        )}
      </div>
      {athletes && onSave && (
        <div className="lg:col-span-12 mt-8">
          <div className="bento-card bg-slate-900 border-slate-800 p-8 flex flex-col md:flex-row items-end gap-6">
            <div className="flex-1 space-y-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Vincular a Atleta</span>
              <select
                value={selectedAthleteId}
                onChange={(e) => setSelectedAthleteId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm outline-none focus:ring-1 focus:ring-emerald-500 transition-all h-[46px]"
              >
                <option value="">Selecione o Atleta</option>
                {athletes.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
              </select>
            </div>
            <button 
              disabled={!selectedAthleteId || !results || isSaving}
              onClick={async () => {
                setIsSaving(true);
                const ath = athletes.find(a => a.id === selectedAthleteId);
                await onSave(selectedAthleteId, ath?.full_name, { 
                  testType,
                  age: parseFloat(age),
                  results
                });
                setIsSaving(false);
                alert('Avaliação de resistência salva com sucesso!');
              }}
              className="px-10 h-[46px] bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              {isSaving ? 'Salvando...' : 'Salvar Avaliação'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BeepReferenceTable() {
  const stages = [
    { s: 1, v: 8.5, m: 140 },
    { s: 4, v: 10.0, m: 640 },
    { s: 8, v: 12.0, m: 1440 },
    { s: 12, v: 14.0, m: 2360 },
    { s: 16, v: 16.0, m: 3400 },
  ];

  return (
    <div className="bento-card bg-slate-900 border-slate-800 p-6">
       <h4 className="text-[10px] font-black text-slate-500 uppercase italic mb-4">Referência: Beep Test</h4>
       <div className="space-y-2">
          {stages.map(item => (
            <div key={item.s} className="flex items-center justify-between p-2 hover:bg-slate-800 rounded-lg transition-colors group">
               <span className="text-[10px] font-black text-white italic">Estágio {item.s}</span>
               <div className="flex gap-4">
                  <span className="text-[10px] font-bold text-emerald-500">{item.v} km/h</span>
                  <span className="text-[10px] font-bold text-slate-600">{item.m}m</span>
               </div>
            </div>
          ))}
       </div>
       <p className="text-[8px] text-slate-600 font-bold uppercase italic mt-4">* Protocolo Léger et al. (1988)</p>
    </div>
  );
}

function EnduranceZone({ label, pct, speed }: { label: string, pct: string, speed: string }) {
  return (
    <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-800 hover:border-emerald-500/30 transition-colors">
       <p className="text-[9px] font-black text-slate-500 uppercase mb-1">{label} ({pct})</p>
       <p className="text-lg font-black text-white italic">{speed} <span className="text-[10px] opacity-30">km/h</span></p>
    </div>
  );
}

function AgilityAssessmentModule({ athletes, onSave }: { athletes?: any[], onSave?: (athleteId: string, name: string, data: any) => void }) {
  const [testType, setTestType] = useState<'t-test' | 'illinois' | 'pro-agility' | 'reactive'>('t-test');
  const [time, setTime] = useState<string>('');
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Reactive Timer State
  const [isWaiting, setIsWaiting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [stimulusType, setStimulusType] = useState<'visual' | 'auditory' | 'both'>('visual');

  useEffect(() => {
    if (selectedAthleteId && athletes) {
      // Agility doesn't have specific demographic auto-population for now
    }
  }, [selectedAthleteId, athletes]);

  const startReactiveTest = () => {
    setIsWaiting(true);
    setReactionTime(null);
    setHasStarted(false);
    
    const delay = Math.random() * 3000 + 2000; // 2-5 seconds
    setTimeout(() => {
      setIsWaiting(false);
      setHasStarted(true);
      setStartTime(performance.now());
    }, delay);
  };

  const handleStop = () => {
    if (startTime) {
      const end = performance.now();
      setReactionTime(end - startTime);
      setHasStarted(false);
      setStartTime(null);
    }
  };

  const classification = useMemo(() => {
    const t = parseFloat(time);
    if (!t) return null;

    if (testType === 't-test') {
      if (t < 9.5) return { label: 'Excelente', color: 'text-emerald-500' };
      if (t < 10.5) return { label: 'Bom', color: 'text-blue-500' };
      if (t < 11.5) return { label: 'Médio', color: 'text-yellow-500' };
      return { label: 'Abaixo da Média', color: 'text-rose-500' };
    }

    if (testType === 'illinois') {
      if (t < 15.2) return { label: 'Excelente', color: 'text-emerald-500' };
      if (t < 16.1) return { label: 'Bom', color: 'text-blue-500' };
      if (t < 18.1) return { label: 'Médio', color: 'text-yellow-500' };
      return { label: 'Pobre', color: 'text-rose-500' };
    }

    if (testType === 'pro-agility') {
      if (t < 4.4) return { label: 'Elite', color: 'text-emerald-500' };
      if (t < 4.7) return { label: 'Acima da Média', color: 'text-blue-500' };
      return { label: 'Média', color: 'text-slate-500' };
    }

    return null;
  }, [testType, time]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-4 space-y-6">
        <div className="bento-card bg-slate-900 border-slate-800 p-6 space-y-6">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-cyan-600/20 flex items-center justify-center border border-cyan-500/30">
                <Footprints className="w-4 h-4 text-cyan-500" />
             </div>
             <h3 className="text-sm font-black text-white uppercase italic">Protocolo de Agilidade</h3>
          </div>

          <div className="space-y-4">
             <div className="space-y-1">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Tipo de Teste</span>
                <select 
                  value={testType} 
                  onChange={e => setTestType(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                >
                   <option value="t-test">T-Test (NSCA)</option>
                   <option value="illinois">Illinois Agility Test</option>
                   <option value="pro-agility">Pro-Agility (5-10-5)</option>
                   <option value="reactive">Agilidade Reativa (Estímulo)</option>
                </select>
             </div>

             {testType !== 'reactive' ? (
               <InputField label="Tempo Total (segundos)" value={time} set={setTime} />
             ) : (
               <div className="space-y-4 pt-4 border-t border-slate-800">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Tipo de Comando</span>
                    <div className="grid grid-cols-3 gap-2">
                       {['visual', 'auditory', 'both'].map(type => (
                         <button 
                           key={type}
                           onClick={() => setStimulusType(type as any)}
                           className={`py-2 rounded-lg border text-[8px] font-black uppercase transition-all ${stimulusType === type ? 'bg-cyan-500 border-cyan-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                         >
                            {type === 'visual' ? 'Visual' : type === 'auditory' ? 'Sonoro' : 'Misto'}
                         </button>
                       ))}
                    </div>
                  </div>
               </div>
             )}
             
             {athletes && onSave && (
                <div className="pt-6 border-t border-slate-800 space-y-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Vincular a Atleta</span>
                    <select
                      value={selectedAthleteId}
                      onChange={(e) => setSelectedAthleteId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                    >
                      <option value="">Selecione o Atleta</option>
                      {athletes.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                    </select>
                  </div>
                  <button 
                    disabled={!selectedAthleteId || !time || isSaving}
                    onClick={async () => {
                      if (!selectedAthleteId || !time) return;
                      setIsSaving(true);
                      const ath = athletes.find(a => a.id === selectedAthleteId);
                      await onSave(selectedAthleteId, ath?.full_name, { time: parseFloat(time), protocol: testType });
                      setIsSaving(false);
                      alert('Avaliação de agilidade salva com sucesso!');
                    }}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase text-[10px] py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {isSaving ? 'Salvando...' : 'Salvar Avaliação'}
                  </button>
                </div>
             )}
          </div>
        </div>

        <AgilityGuide testType={testType} />
      </div>

      <div className="lg:col-span-8 space-y-6">
        {testType === 'reactive' ? (
          <div className="space-y-6">
            <div className={`bento-card border-none p-12 flex flex-col items-center justify-center text-center transition-all min-h-[300px] relative overflow-hidden ${
              isWaiting ? 'bg-amber-600/20 animate-pulse' : 
              hasStarted ? 'bg-emerald-500' : 'bg-slate-900 border border-slate-800'
            }`}>
               {hasStarted && <div className="absolute inset-0 bg-white/10 animate-ping" />}
               
               <div className="relative z-10 space-y-6">
                  {isWaiting ? (
                    <div className="space-y-4">
                       <Timer className="w-12 h-12 text-amber-500 mx-auto" />
                       <h4 className="text-xl font-black text-amber-500 uppercase italic">Aguardando Estímulo...</h4>
                       <p className="text-amber-500/60 text-[10px] font-black uppercase tracking-widest">Fique pronto para reagir</p>
                    </div>
                  ) : hasStarted ? (
                    <div className="space-y-4">
                       <Zap className="w-20 h-20 text-white mx-auto animate-bounce" />
                       <h4 className="text-3xl font-black text-white uppercase italic">GO! GO! GO!</h4>
                       <button 
                         onClick={handleStop}
                         className="px-10 py-4 bg-white rounded-full text-emerald-600 font-black uppercase tracking-widest text-lg shadow-2xl hover:scale-105 active:scale-95 transition-all"
                       >
                          Parar Cronômetro
                       </button>
                    </div>
                  ) : (
                    <button 
                      onClick={startReactiveTest}
                      className="group flex flex-col items-center gap-6"
                    >
                       <div className="w-32 h-32 rounded-full border-4 border-cyan-500 border-dashed flex items-center justify-center group-hover:rotate-180 transition-transform duration-1000">
                          <Zap className="w-12 h-12 text-cyan-500" />
                       </div>
                       <div className="space-y-2">
                          <h4 className="text-2xl font-black text-white uppercase italic">Iniciar Teste de Reação</h4>
                          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">O sinal será disparado aleatoriamente</p>
                       </div>
                    </button>
                  )}
               </div>
            </div>

            {reactionTime && (
              <div className="bento-card bg-emerald-600 border-none p-8 flex flex-col justify-between overflow-hidden relative shadow-2xl text-white">
                <div className="relative z-10">
                  <p className="text-[10px] font-black text-white/50 uppercase italic tracking-widest mb-2">Tempo de Reação</p>
                  <div className="flex items-baseline gap-2">
                     <h3 className="text-6xl font-black italic">{(reactionTime / 1000).toFixed(3)}</h3>
                     <span className="text-xl font-black text-white/40">segundos</span>
                  </div>
                </div>
                <Timer className="absolute -right-8 -bottom-8 w-48 h-48 opacity-10 rotate-12 text-white" />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {time ? (
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bento-card bg-cyan-600 border-none p-8 flex flex-col justify-between overflow-hidden relative shadow-2xl">
                  <div className="relative z-10">
                    <p className="text-[10px] font-black text-white/50 uppercase italic tracking-widest mb-2">Performance Agilidade</p>
                    <div className="flex items-baseline gap-2 text-white">
                       <h3 className="text-6xl font-black italic">{time}</h3>
                       <span className="text-xl font-black text-white/40">seg</span>
                    </div>
                    {classification && (
                      <div className="mt-4 px-3 py-1.5 bg-white/10 rounded-lg inline-flex items-center gap-2 border border-white/5">
                          <span className="text-[11px] font-black text-white uppercase">{classification.label}</span>
                      </div>
                    )}
                  </div>
                  <Footprints className="absolute -right-8 -bottom-8 w-48 h-48 opacity-10 rotate-12 text-white" />
                </div>

                <div className="bento-card bg-slate-900 border-slate-800 p-8 flex flex-col justify-center">
                   <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Comparativo {testType.toUpperCase()}</p>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                         <div 
                           className="h-full bg-cyan-500 transition-all duration-1000" 
                           style={{ width: `${Math.min(100, (20 / parseFloat(time)) * 100)}%` }} 
                         />
                      </div>
                      <p className="text-[8px] text-slate-600 font-bold uppercase italic mt-2">Classificação baseada em normas NSCA para atletas universitários.</p>
                   </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-900/50 border border-dashed border-slate-800 rounded-[2rem] p-12 text-center group">
                 <Footprints className="w-16 h-16 text-slate-800 mb-6 group-hover:scale-110 transition-transform" />
                 <h3 className="text-xl font-black text-slate-500 uppercase italic">Cronômetro Zerado</h3>
                 <p className="text-slate-600 text-[10px] font-bold uppercase mt-2 max-w-[280px]">
                    Insira o tempo final do percurso para visualizar a classificação de agilidade e mudança de direção.
                 </p>
              </div>
            )}
          </div>
        )}

        <div className="bento-card bg-slate-900 border-slate-800 p-8">
           <div className="flex items-center justify-between mb-8">
              <p className="label-caps italic">Explicação do Protocolo</p>
              <h3 className="text-sm font-black text-white uppercase italic">Diretrizes NSCA</h3>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                 <h4 className="text-[10px] font-black text-cyan-500 uppercase">Mudança de Direção (COD)</h4>
                 <p className="text-[10px] text-slate-500 leading-tight">Testes como Illinois e T-Test medem a capacidade pré-planejada de mudar de curso. Foco em biomecânica de frenagem e aceleração.</p>
              </div>
              <div className="space-y-3">
                 <h4 className="text-[10px] font-black text-rose-500 uppercase">Agilidade Reativa</h4>
                 <p className="text-[10px] text-slate-500 leading-tight">Envolve o componente cognitivo de processar um estímulo (visual/sonoro) antes da execução física. Essencial para esportes abertos.</p>
              </div>
           </div>
        </div>
      </div>
      {athletes && onSave && (
        <div className="lg:col-span-12 mt-8">
          <div className="bento-card bg-slate-900 border-slate-800 p-8 flex flex-col md:flex-row items-end gap-6">
            <div className="flex-1 space-y-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Vincular a Atleta</span>
              <select
                value={selectedAthleteId}
                onChange={(e) => setSelectedAthleteId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm outline-none focus:ring-1 focus:ring-cyan-500 transition-all h-[46px]"
              >
                <option value="">Selecione o Atleta</option>
                {athletes.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
              </select>
            </div>
            <button 
              disabled={!selectedAthleteId || !time || isSaving}
              onClick={async () => {
                setIsSaving(true);
                const ath = athletes.find(a => a.id === selectedAthleteId);
                await onSave(selectedAthleteId, ath?.full_name, { 
                  testType,
                  time: parseFloat(time),
                  stimulusType: testType === 'reactive' ? stimulusType : null,
                  reactionTime
                });
                setIsSaving(false);
                alert('Avaliação de agilidade salva com sucesso!');
              }}
              className="px-10 h-[46px] bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase text-[10px] rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20"
            >
              {isSaving ? 'Salvando...' : 'Salvar Avaliação'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AgilityGuide({ testType }: { testType: string }) {
  const content = {
    't-test': {
      title: 'Setup T-Test',
      steps: ['Corra 10m á frente', 'Deslocamento lateral 5m esquerda', 'Deslocamento lateral 10m direita', 'Lateral 5m volta ao centro', 'Corra 10m de costas para o início']
    },
    'illinois': {
      title: 'Setup Illinois',
      steps: ['Início deitado de bruços', 'Sprint 10m e volta', 'Drible entre 4 cones (3.3m cada)', 'Sprint final 10m']
    },
    'pro-agility': {
      title: 'Setup 5-10-5',
      steps: ['Explosão 5 jardas á esquerda', 'Cruzamento 10 jardas á direita', 'Sprint final 5 jardas ao ponto central']
    },
    'reactive': {
      title: 'Reactive Agility',
      steps: ['Sinal randômico (2-5s)', 'Estímulo Visual (Flash)', 'Estímulo Sonoro (Beep)', 'Foco em tempo de decisão + execução']
    }
  };

  const guide = content[testType as keyof typeof content] || content['t-test'];

  return (
    <div className="bento-card border-none bg-gradient-to-br from-cyan-600 to-blue-600 p-8">
       <h4 className="text-[10px] font-black text-white uppercase italic mb-4">{guide.title}</h4>
       <div className="space-y-3">
          {guide.steps.map((step, i) => (
            <div key={i} className="flex gap-3">
               <span className="text-[10px] font-black text-white/40">0{i+1}</span>
               <p className="text-[10px] text-white font-bold leading-tight">{step}</p>
            </div>
          ))}
       </div>
    </div>
  );
}

function FlexibilityAssessmentModule({ athletes, onSave }: { athletes?: any[], onSave?: (athleteId: string, name: string, data: any) => void }) {
  const [testType, setTestType] = useState<'sit-reach' | 'goniometry'>('sit-reach');
  const [sitProtocol, setSitProtocol] = useState<'wells' | 'floor'>('wells');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [resultVal, setResultVal] = useState<string>('');
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (selectedAthleteId && athletes) {
      const athlete = athletes.find(a => a.id === selectedAthleteId);
      if (athlete) {
        if (athlete.gender != null) setGender(athlete.gender as any);
      }
    }
  }, [selectedAthleteId, athletes]);

  
  // Goniometry State
  const [joint, setJoint] = useState<string>('Ombro - Flexão');
  const [angle, setAngle] = useState<string>('');
  const [side, setSide] = useState<'D' | 'E'>('D');

  // AAOS / ACSM Normal ROM values (degrees)
  const joints = [
    // Ombro
    { group: 'Ombro', name: 'Ombro - Flexão', normal: 180, range: '170-180°', low: 150 },
    { group: 'Ombro', name: 'Ombro - Extensão', normal: 60, range: '50-60°', low: 40 },
    { group: 'Ombro', name: 'Ombro - Abdução', normal: 180, range: '170-180°', low: 150 },
    { group: 'Ombro', name: 'Ombro - Rot. Interna', normal: 70, range: '60-90°', low: 45 },
    { group: 'Ombro', name: 'Ombro - Rot. Externa', normal: 90, range: '80-90°', low: 60 },
    // Cotovelo / Antebraço
    { group: 'Cotovelo', name: 'Cotovelo - Flexão', normal: 150, range: '140-150°', low: 120 },
    { group: 'Cotovelo', name: 'Cotovelo - Extensão', normal: 0, range: '0°', low: -10 },
    { group: 'Cotovelo', name: 'Antebraço - Pronação', normal: 80, range: '75-80°', low: 60 },
    { group: 'Cotovelo', name: 'Antebraço - Supinação', normal: 80, range: '80-85°', low: 60 },
    // Punho
    { group: 'Punho', name: 'Punho - Flexão', normal: 80, range: '70-80°', low: 60 },
    { group: 'Punho', name: 'Punho - Extensão', normal: 70, range: '60-70°', low: 50 },
    { group: 'Punho', name: 'Punho - Desvio Radial', normal: 20, range: '15-20°', low: 10 },
    { group: 'Punho', name: 'Punho - Desvio Ulnar', normal: 30, range: '30-35°', low: 20 },
    // Quadril
    { group: 'Quadril', name: 'Quadril - Flexão', normal: 120, range: '115-125°', low: 90 },
    { group: 'Quadril', name: 'Quadril - Extensão', normal: 20, range: '10-20°', low: 5 },
    { group: 'Quadril', name: 'Quadril - Abdução', normal: 45, range: '40-50°', low: 30 },
    { group: 'Quadril', name: 'Quadril - Adução', normal: 30, range: '20-30°', low: 15 },
    { group: 'Quadril', name: 'Quadril - Rot. Interna', normal: 45, range: '30-45°', low: 20 },
    { group: 'Quadril', name: 'Quadril - Rot. Externa', normal: 45, range: '40-60°', low: 25 },
    // Joelho
    { group: 'Joelho', name: 'Joelho - Flexão', normal: 140, range: '130-150°', low: 110 },
    { group: 'Joelho', name: 'Joelho - Extensão', normal: 0, range: '0°', low: -10 },
    // Tornozelo / Pé
    { group: 'Tornozelo', name: 'Tornozelo - Dorsiflexão', normal: 20, range: '15-20°', low: 10 },
    { group: 'Tornozelo', name: 'Tornozelo - Plantar Flexão', normal: 50, range: '45-50°', low: 30 },
    { group: 'Tornozelo', name: 'Subtalar - Inversão', normal: 35, range: '30-40°', low: 20 },
    { group: 'Tornozelo', name: 'Subtalar - Eversão', normal: 15, range: '10-20°', low: 5 },
    // Coluna
    { group: 'Coluna', name: 'Coluna - Flexão (lombar)', normal: 60, range: '40-60°', low: 30 },
    { group: 'Coluna', name: 'Coluna - Extensão (lombar)', normal: 25, range: '20-30°', low: 10 },
    { group: 'Coluna', name: 'Coluna - Rotação (cervical)', normal: 80, range: '70-80°', low: 50 },
    { group: 'Coluna', name: 'Coluna - Flexão Lateral', normal: 35, range: '25-35°', low: 15 },
  ];

  const groups = [...new Set(joints.map(j => j.group))];

  const currentJoint = joints.find(j => j.name === joint);

  const goniometryClassification = useMemo(() => {
    const a = parseFloat(angle);
    if (!a || !currentJoint) return null;
    const pct = (a / currentJoint.normal) * 100;
    if (pct >= 90) return { label: 'ADM Normal', color: 'text-emerald-400', bg: 'bg-emerald-500' };
    if (pct >= 75) return { label: 'Levemente Reduzida', color: 'text-yellow-400', bg: 'bg-yellow-500' };
    if (pct >= 50) return { label: 'Moderadamente Reduzida', color: 'text-orange-400', bg: 'bg-orange-500' };
    return { label: 'Severamente Reduzida', color: 'text-red-400', bg: 'bg-red-500' };
  }, [angle, currentJoint]);

  const classification = useMemo(() => {
    if (testType === 'sit-reach') {
      const val = parseFloat(resultVal);
      if (isNaN(val)) return null;
      if (sitProtocol === 'wells') {
        // ACSM Wells Bank ââââ‚Â¬â‚Â sex-specific norms (18-29 yrs reference)
        if (gender === 'male') {
          if (val >= 34) return { label: 'Excelente', color: 'bg-emerald-500' };
          if (val >= 28) return { label: 'Bom', color: 'bg-blue-500' };
          if (val >= 21) return { label: 'Médio', color: 'bg-yellow-500' };
          if (val >= 15) return { label: 'Abaixo da Média', color: 'bg-orange-500' };
          return { label: 'Fraco', color: 'bg-rose-500' };
        } else {
          if (val >= 38) return { label: 'Excelente', color: 'bg-emerald-500' };
          if (val >= 33) return { label: 'Bom', color: 'bg-blue-500' };
          if (val >= 26) return { label: 'Médio', color: 'bg-yellow-500' };
          if (val >= 20) return { label: 'Abaixo da Média', color: 'bg-orange-500' };
          return { label: 'Fraco', color: 'bg-rose-500' };
        }
      } else {
        if (val >= 15) return { label: 'Excelente', color: 'bg-emerald-500' };
        if (val >= 5) return { label: 'Bom', color: 'bg-blue-500' };
        if (val >= 0) return { label: 'Média', color: 'bg-yellow-500' };
        return { label: 'Limitado', color: 'bg-rose-500' };
      }
    }
    return null;
  }, [testType, sitProtocol, gender, resultVal]);

  // Goniometer angle capped at 180° for visual
  const visualAngle = Math.min(parseFloat(angle) || 0, 180);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-4 space-y-6">
        <div className="bento-card bg-slate-900 border-slate-800 p-6 space-y-6">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-pink-600/20 flex items-center justify-center border border-pink-500/30">
                <MoveHorizontal className="w-4 h-4 text-pink-500" />
             </div>
             <h3 className="text-sm font-black text-white uppercase italic">Teste de Flexibilidade</h3>
          </div>

          <div className="space-y-4">
             <div className="space-y-1">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Protocolo</span>
                <div className="grid grid-cols-2 gap-2">
                   <button 
                     onClick={() => setTestType('sit-reach')}
                     className={`py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${testType === 'sit-reach' ? 'bg-pink-500 border-pink-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                   >
                     Sentar e Alcançar
                   </button>
                   <button 
                     onClick={() => setTestType('goniometry')}
                     className={`py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${testType === 'goniometry' ? 'bg-pink-500 border-pink-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                   >
                     Goniometria
                   </button>
                </div>
             </div>

             {testType === 'sit-reach' ? (
               <div className="space-y-4 pt-4 border-t border-slate-800">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sexo</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setGender('male')} className={`py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${gender === 'male' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-500'}`}>Masc.</button>
                      <button onClick={() => setGender('female')} className={`py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${gender === 'female' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-500'}`}>Fem.</button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Equipamento</span>
                    <div className="grid grid-cols-2 gap-2">
                       <button 
                         onClick={() => setSitProtocol('wells')}
                         className={`py-2 rounded-lg text-[9px] font-black uppercase transition-all ${sitProtocol === 'wells' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-500'}`}
                       >
                         Banco de Wells
                       </button>
                       <button 
                         onClick={() => setSitProtocol('floor')}
                         className={`py-2 rounded-lg text-[9px] font-black uppercase transition-all ${sitProtocol === 'floor' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-500'}`}
                       >
                         No Chão (S/ Banco)
                       </button>
                    </div>
                  </div>
                  <InputField label={`Alcance (${sitProtocol === 'wells' ? 'cm' : 'cm +/-'})`} value={resultVal} set={setResultVal} />
               </div>
             ) : (
               <div className="space-y-4 pt-4 border-t border-slate-800">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Grupo Articular</span>
                    <select 
                      value={groups.find(g => joints.find(j => j.name === joint)?.group === g) || 'Ombro'}
                      onChange={e => { const first = joints.find(j => j.group === e.target.value); if (first) setJoint(first.name); }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm outline-none mb-2"
                    >
                      {groups.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Articulação / Movimento</span>
                    <select 
                      value={joint}
                      onChange={e => { setJoint(e.target.value); setAngle(''); }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm outline-none"
                    >
                      {joints.filter(j => j.group === (joints.find(jj => jj.name === joint)?.group || 'Ombro')).map(j => (
                        <option key={j.name} value={j.name}>{j.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Lado</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setSide('D')} className={`py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${side === 'D' ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-500'}`}>Direito (D)</button>
                      <button onClick={() => setSide('E')} className={`py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${side === 'E' ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-500'}`}>Esquerdo (E)</button>
                    </div>
                  </div>
                  <InputField label="Ângulo Medido (Graus °)" value={angle} set={setAngle} />
                  {currentJoint && (
                    <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                      <p className="text-[9px] font-black text-slate-500 uppercase">ADM Normal (AAOS)</p>
                      <p className="text-sm font-black text-white italic">{currentJoint.range}</p>
                    </div>
                  )}
               </div>
             )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-8 space-y-6">
        {testType === 'sit-reach' && resultVal ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className={`bento-card border-none p-8 flex flex-col justify-between text-white relative overflow-hidden shadow-2xl ${classification?.color || 'bg-pink-600'}`}>
               <div className="relative z-10">
                  <p className="text-[10px] font-black text-white/50 uppercase italic tracking-widest mb-2">Resultado ââââ‚Â¬â‚Â Sentar e Alcançar</p>
                  <div className="flex items-baseline gap-2">
                     <h3 className="text-6xl font-black italic">{resultVal}</h3>
                     <span className="text-xl font-black text-white/40">cm</span>
                  </div>
                  <div className="mt-4 px-3 py-1.5 bg-white/10 rounded-lg inline-flex items-center gap-2 border border-white/5">
                      <span className="text-[11px] font-black text-white uppercase">{classification?.label}</span>
                  </div>
               </div>
               <Activity className="absolute -right-8 -bottom-8 w-48 h-48 opacity-10 rotate-12" />
            </div>

            <div className="bento-card bg-slate-900 border-slate-800 p-8 flex flex-col justify-center">
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Normas ACSM ââââ‚Â¬â‚Â {gender === 'male' ? 'Masculino' : 'Feminino'}</p>
               <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-emerald-400">Excelente</span>
                    <span className="text-emerald-400">{sitProtocol === 'wells' ? (gender === 'male' ? 'ââ‚°≥ 34cm' : 'ââ‚°≥ 38cm') : 'ââ‚°≥ 15cm'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-blue-400">Bom</span>
                    <span className="text-blue-400">{sitProtocol === 'wells' ? (gender === 'male' ? '28-33cm' : '33-37cm') : '5-14cm'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-yellow-400">Médio</span>
                    <span className="text-yellow-400">{sitProtocol === 'wells' ? (gender === 'male' ? '21-27cm' : '26-32cm') : '0-4cm'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-rose-400">Abaixo</span>
                    <span className="text-rose-400">{sitProtocol === 'wells' ? (gender === 'male' ? '< 21cm' : '< 26cm') : '< 0cm'}</span>
                  </div>
               </div>
            </div>
          </div>
        ) : testType === 'goniometry' && angle && currentJoint ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Visual Goniometer */}
              <div className="bento-card bg-slate-900 border-slate-800 p-8 flex flex-col items-center justify-center">
                <p className="text-[9px] font-black text-pink-500 uppercase tracking-widest mb-6">{joint} ââââ‚Â¬â‚Â Lado {side}</p>
                <div className="relative w-44 h-44">
                  {/* Background arc */}
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="8" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#ec4899" strokeWidth="8"
                      strokeDasharray={`${(visualAngle / 360) * 283} 283`}
                      strokeDashoffset="70.75"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-white italic">{angle}°</span>
                    <span className={`text-[9px] font-black uppercase ${goniometryClassification?.color || 'text-slate-500'}`}>{goniometryClassification?.label}</span>
                  </div>
                </div>
              </div>

              {/* Reference & Classification */}
              <div className="bento-card bg-slate-900 border-slate-800 p-8 space-y-6">
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1">ADM Normal (AAOS)</p>
                  <p className="text-2xl font-black text-white italic">{currentJoint.range}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-2">% da ADM Normal</p>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ${goniometryClassification?.bg || 'bg-pink-500'}`}
                      style={{ width: `${Math.min((parseFloat(angle) / currentJoint.normal) * 100, 100)}%` }}
                    />
                  </div>
                  <p className={`text-right text-[10px] font-black mt-1 ${goniometryClassification?.color}`}>
                    {((parseFloat(angle) / currentJoint.normal) * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-800 space-y-2">
                  {[
                    { label: 'Normal (ââ‚°≥ 90%)', col: 'text-emerald-400' },
                    { label: 'Leve redução (75-89%)', col: 'text-yellow-400' },
                    { label: 'Moderada (50-74%)', col: 'text-orange-400' },
                    { label: 'Severa (< 50%)', col: 'text-red-400' },
                  ].map(r => (
                    <div key={r.label} className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full bg-current ${r.col}`} />
                      <span className={`text-[9px] font-black uppercase ${r.col}`}>{r.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bento-card bg-slate-900/50 border-slate-800 p-6">
              <p className="text-[9px] font-black text-pink-500 uppercase tracking-widest mb-2">Interpretação Clínica</p>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                {goniometryClassification?.label === 'ADM Normal'
                  ? `A amplitude de movimento de ${angle}° para ${joint} está dentro dos valores normais segundo a AAOS (${currentJoint.range}). Manutenção com exercícios de mobilidade preventiva.`
                  : `A amplitude de ${angle}° está abaixo do esperado para ${joint} (Normal: ${currentJoint.range}). Recomenda-se avaliação clínica detalhada e protocolo de mobilização articular específico.`
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-900/50 border border-dashed border-slate-800 rounded-[2rem] p-12 text-center group">
             <MoveHorizontal className="w-16 h-16 text-slate-800 mb-6 group-hover:scale-110 transition-transform" />
             <h3 className="text-xl font-black text-slate-500 uppercase italic">Dados de Flexibilidade</h3>
             <p className="text-slate-600 text-[10px] font-bold uppercase mt-2 max-w-[280px]">
                Selecione o protocolo de flexibilidade ou goniometria para registrar e classificar a amplitude de movimento.
             </p>
          </div>
        )}

        <div className="bento-card bg-slate-900 border-slate-800 p-8">
           <h4 className="text-[10px] font-black text-white uppercase italic mb-6">Importância da Flexibilidade</h4>
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { title: 'Performance', desc: 'Melhora a eficiência biomecânica do movimento esportivo.' },
                { title: 'Prevenção', desc: 'Reduz riscos de lesões em articulações e tecidos moles.' },
                { title: 'Funcionalidade', desc: 'Garante amplitude necessária para atividades diárias.' }
              ].map(item => (
                <div key={item.title} className="space-y-2">
                   <h5 className="text-[9px] font-black text-pink-500 uppercase">{item.title}</h5>
                   <p className="text-[10px] text-slate-500 leading-tight">{item.desc}</p>
                </div>
              ))}
           </div>
        </div>
      </div>
      {athletes && onSave && (
        <div className="lg:col-span-12 mt-8">
          <div className="bento-card bg-slate-900 border-slate-800 p-8 flex flex-col md:flex-row items-end gap-6">
            <div className="flex-1 space-y-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Vincular a Atleta</span>
              <select
                value={selectedAthleteId}
                onChange={(e) => setSelectedAthleteId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm outline-none focus:ring-1 focus:ring-pink-500 transition-all h-[46px]"
              >
                <option value="">Selecione o Atleta</option>
                {athletes.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
              </select>
            </div>
            <button 
              disabled={!selectedAthleteId || (!resultVal && !angle) || isSaving}
              onClick={async () => {
                setIsSaving(true);
                const ath = athletes.find(a => a.id === selectedAthleteId);
                await onSave(selectedAthleteId, ath?.full_name, { 
                  testType,
                  sitProtocol,
                  gender,
                  resultVal: parseFloat(resultVal),
                  angle: parseFloat(angle),
                  joint,
                  side,
                  classification: testType === 'sit-reach' ? classification : goniometryClassification
                });
                setIsSaving(false);
                alert('Avaliação de flexibilidade salva com sucesso!');
              }}
              className="px-10 h-[46px] bg-pink-600 hover:bg-pink-500 text-white font-black uppercase text-[10px] rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-pink-600/20"
            >
              {isSaving ? 'Salvando...' : 'Salvar Avaliação'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}



interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  intensity: string;
  load: string;
}

interface Microcycle {
  id: string;
  name: string;
  type: string;
  exercises: Exercise[];
}

interface Mesocycle {
  id: string;
  name: string;
  microcycles: Microcycle[];
}

interface PeriodizationPlan {
  mesocycles: Mesocycle[];
}

function PeriodizationModule({ setWizardAthlete, setShowWizard }: { setWizardAthlete: any, setShowWizard: any }) {
  const [view, setView] = useState<'setup' | 'dashboard' | 'tracking'>('setup');
  const [athletes, setAthletes] = useState<any[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [allPrescriptions, setAllPrescriptions] = useState<any[]>([]);
  const [loadingTracking, setLoadingTracking] = useState(false);

  useEffect(() => {
    async function loadAll() {
      const [aths, allP] = await Promise.all([getAthletes(), getAllPrescriptions()]);
      setAthletes(aths);
      setAllPrescriptions(allP);
    }
    loadAll();
  }, []);

  const handleSelectAthlete = async (id: string) => {
    setSelectedAthleteId(id);
    setLoadingTracking(true);
    const data = await getAthletePrescriptions(id);
    setPrescriptions(data);
    setLoadingTracking(false);
    setView('tracking');
  };

  const totalPrescribed = prescriptions.length;
  const totalCompleted = prescriptions.filter(p => p.status === 'completed').length;
  const progressPct = totalPrescribed > 0 ? Math.round((totalCompleted / totalPrescribed) * 100) : 0;
  const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);

  // Avanço por semana (últimas 8 semanas)
  const weeklyProgress = useMemo(() => {
    const weeks: { week: string; prescribed: number; completed: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - i * 7 - 6);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const label = `S${8 - i}`;
      const inWeek = prescriptions.filter(p => {
        const d = new Date(p.created_at);
        return d >= weekStart && d <= weekEnd;
      });
      weeks.push({
        week: label,
        prescribed: inWeek.length,
        completed: inWeek.filter(p => p.status === 'completed').length
      });
    }
    return weeks;
  }, [prescriptions]);

  // Summary por atleta (para visão geral)
  const athleteSummary = useMemo(() => {
    return athletes.map(a => {
      const ap = allPrescriptions.filter(p => p.athlete_id === a.id);
      return {
        ...a,
        total: ap.length,
        completed: ap.filter(p => p.status === 'completed').length,
        pending: ap.filter(p => p.status === 'pending').length,
      };
    }).filter(a => a.total > 0);
  }, [athletes, allPrescriptions]);

  if (view === 'tracking') {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('setup')} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] font-black uppercase italic">Voltar</span>
            </button>
            <div>
              <h2 className="text-2xl font-black text-white uppercase italic tracking-widest">{selectedAthlete?.full_name}</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Acompanhamento de Periodização Ativo</p>
            </div>
          </div>
          
          <button 
            onClick={() => {
              setWizardAthlete(selectedAthlete);
              setShowWizard(true);
            }}
            className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest italic shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group"
          >
            <Target className="w-4 h-4 group-hover:rotate-45 transition-transform" />
            Nova Periodização de Elite
          </button>
        </div>

        {loadingTracking ? (
          <div className="text-center py-20 font-black text-slate-500 uppercase italic animate-pulse">Carregando histórico...</div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bento-card bg-slate-900 border-slate-800 p-6 text-center">
                <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Sessões Prescritas</p>
                <p className="text-3xl font-black text-white italic">{totalPrescribed}</p>
              </div>
              <div className="bento-card bg-emerald-600 border-none p-6 text-center">
                <p className="text-[9px] font-black text-white/60 uppercase mb-1">Sessões Concluídas</p>
                <p className="text-3xl font-black text-white italic">{totalCompleted}</p>
              </div>
              <div className="bento-card bg-slate-900 border-slate-800 p-6 text-center">
                <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Pendentes</p>
                <p className="text-3xl font-black text-yellow-400 italic">{totalPrescribed - totalCompleted}</p>
              </div>
              <div className="bento-card bg-slate-900 border-slate-800 p-6 text-center">
                <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Adesão Geral</p>
                <p className={`text-3xl font-black italic ${progressPct >= 80 ? 'text-emerald-400' : progressPct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{progressPct}%</p>
              </div>
            </div>

            {/* Barra de progresso do macrociclo */}
            <div className="bento-card bg-slate-900 border-slate-800 p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="label-caps italic mb-1">Avanço do Macrociclo</p>
                  <h3 className="text-xl font-black text-white uppercase italic">Progressão Semanal â€" Prescrito vs Concluído</h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-blue-500"></span><span className="text-[9px] font-black uppercase text-slate-500">Prescrito</span></div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-500"></span><span className="text-[9px] font-black uppercase text-slate-500">Concluído</span></div>
                </div>
              </div>
              <div className="h-48 flex items-end gap-3">
                {weeklyProgress.map((w, i) => (
                  <div key={i} className="flex-1 flex flex-col gap-1 items-center justify-end h-full group relative">
                    <div className="w-full flex flex-col gap-0.5 justify-end" style={{ height: '160px' }}>
                      <div
                        className="w-full bg-blue-500/30 rounded-t transition-all"
                        style={{ height: `${w.prescribed > 0 ? (w.prescribed / Math.max(...weeklyProgress.map(x => x.prescribed), 1)) * 100 : 0}%`, minHeight: w.prescribed > 0 ? '4px' : '0' }}
                      />
                      <div
                        className="w-full bg-emerald-500 rounded-t transition-all"
                        style={{ height: `${w.completed > 0 ? (w.completed / Math.max(...weeklyProgress.map(x => x.prescribed), 1)) * 100 : 0}%`, minHeight: w.completed > 0 ? '4px' : '0' }}
                      />
                    </div>
                    <span className="text-[8px] font-black text-slate-600 uppercase mt-1">{w.week}</span>
                    {(w.prescribed > 0 || w.completed > 0) && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[8px] font-black text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {w.completed}/{w.prescribed}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Lista de sessões */}
            <div className="bento-card bg-slate-900 border-slate-800 p-8 space-y-4">
              <h3 className="text-sm font-black text-white uppercase italic">Histórico Detalhado</h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {prescriptions.length === 0 ? (
                  <div className="text-center py-10 text-slate-600 font-black uppercase italic text-xs">Nenhuma prescrição encontrada para este atleta.</div>
                ) : (
                  [...prescriptions].reverse().map((p, i) => {
                    const done = p.status === 'completed';
                    const blocksText = p.total_blocks ? `${p.completed_blocks ?? '?'}/${p.total_blocks} blocos` : '';
                    return (
                      <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        done ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-slate-900/50 border-slate-800'
                      }`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${
                            done ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'
                          }`}>
                            {done ? 'âÅ“"' : `${totalPrescribed - i}`}
                          </div>
                          <div>
                            <p className="text-xs font-black text-white uppercase italic">Sessão #{totalPrescribed - i}</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase">
                              {format(parseISO(p.created_at.split('T')[0]), 'dd/MM/yyyy')}
                              {blocksText && ` · ${blocksText}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg ${
                            done ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'
                          }`}>
                            {done ? 'Concluído' : 'Pendente'}
                          </span>
                          {done && p.completed_at && (
                            <p className="text-[8px] text-slate-600 mt-1">{format(parseISO(p.completed_at.split('T')[0]), 'dd/MM')}</p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  if (view === 'setup') {
    return (
      <div className="space-y-8">
        {/* Visão geral de adesão */}
        {athleteSummary.length > 0 && (
          <div className="bento-card bg-slate-900 border-slate-800 p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="label-caps italic mb-1">Monitoramento Real</p>
                <h3 className="text-xl font-black text-white uppercase italic">Adesão por Atleta</h3>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="space-y-4">
              {athleteSummary.map(a => {
                const pct = a.total > 0 ? Math.round((a.completed / a.total) * 100) : 0;
                return (
                  <button key={a.id} onClick={() => handleSelectAthlete(a.id)} className="w-full group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-white uppercase italic group-hover:text-amber-400 transition-colors">{a.full_name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">{a.completed}/{a.total} sessões</span>
                        <span className={`text-[10px] font-black italic ${ pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{pct}%</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${ pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Configuração da Periodização</h2>
          <p className="text-slate-400">Insira os dados do aluno para gerar a estrutura ideal de treinamento.</p>
        </div>
      </div>
    );
  }

  return null;
}


function PeriodizationModelBtn({ active, onClick, title, subtitle, icon }: { active: boolean, onClick: () => void, title: string, subtitle: string, icon: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className={`p-6 rounded-[2rem] border text-left transition-all group ${active ? 'bg-blue-600 border-blue-500 shadow-xl shadow-blue-600/20' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
    >
       <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors ${active ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500 group-hover:text-blue-500'}`}>
          {icon}
       </div>
       <h4 className={`text-sm font-black uppercase italic leading-none mb-1 ${active ? 'text-white' : 'text-slate-400'}`}>{title}</h4>
       <p className={`text-[10px] font-bold uppercase tracking-widest ${active ? 'text-white/60' : 'text-slate-600'}`}>{subtitle}</p>
    </button>
  );
}

function LegendItem({ color, label }: { color: string, label: string }) {
  return (
    <div className="flex items-center gap-2">
       <div className={`w-3 h-1 ${color} rounded-full`} />
       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    </div>
  );
}

function PhaseCard({ title, target, desc }: { title: string, target: string, desc: string }) {
  return (
    <div className="bento-card bg-slate-900 border-slate-800 p-6 hover:border-blue-500/50 transition-colors cursor-default">
       <p className="text-[10px] font-black text-blue-500 uppercase italic mb-1">{title}</p>
       <h4 className="text-sm font-black text-white uppercase italic mb-3">{target}</h4>
       <p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed">{desc}</p>
    </div>
  );
}

function GoalRow({ label, val }: { label: string, val: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
       <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
       <span className="text-[10px] font-black text-white uppercase italic">{val}</span>
    </div>
  );
}








function AnamnesisModule() {
  const [records, setRecords] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getAnamnesis();
      setRecords(data);
      setLoading(false);
    }
    load();
  }, []);

  const getACSMAnalysis = (data: any) => {
    const isPActive = data.isPhysicallyActive;
    const hasD = data.hasKnownDisease;
    const hasS = data.hasSymptoms;
    const intensity = data.desiredIntensity;

    if (!isPActive) {
      if (hasS) return { status: 'danger', msg: 'Liberação Médica OBRIGATÓRIA antes de iniciar.', action: 'Proibir exercício' };
      if (hasD) return { status: 'warning', msg: 'Liberação Médica recomendada.', action: 'Consultar Médico' };
      return { status: 'success', msg: 'Liberado para Intensidade Leve/Moderada.', action: 'Iniciar Gradual' };
    } else {
      if (hasS) return { status: 'danger', msg: 'DESCONTINUAR exercício e buscar liberação médica.', action: 'Interromper' };
      if (hasD) {
        if (intensity === 'vigorous') return { status: 'warning', msg: 'Liberação Médica recomendada para alta intensidade.', action: 'Consultar Médico' };
        return { status: 'success', msg: 'Liberado para Intensidade Moderada.', action: 'Manter' };
      }
      return { status: 'success', msg: 'Liberado para Intensidade Moderada/Vigorosa.', action: 'Liberado Total' };
    }
  };

  if (loading) return <div className="text-center py-20 font-black text-slate-500 uppercase italic">Carregando Anamneses...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white uppercase italic">Anamneses & Triagem</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Protocolo PAR-Q+ e Algoritmo ACSM</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {records.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/50 rounded-3xl border border-slate-800">
              <FileText className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 font-black uppercase italic text-xs">Nenhum registro encontrado</p>
            </div>
          ) : (
            records.map(rec => {
              const analysis = getACSMAnalysis(rec.data);
              return (
                <button 
                  key={rec.id}
                  onClick={() => setSelectedRecord(rec)}
                  className={`w-full p-6 text-left rounded-3xl border transition-all ${
                    selectedRecord?.id === rec.id ? 'bg-purple-600 border-purple-500 shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-black text-white uppercase italic">{rec.athlete_name}</h4>
                    <span className={`w-2 h-2 rounded-full ${analysis.status === 'danger' ? 'bg-red-500' : analysis.status === 'warning' ? 'bg-yellow-500' : 'bg-emerald-500'}`}></span>
                  </div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase mb-4">{format(parseISO(rec.date), "dd/MM/yyyy")}</p>
                  <div className={`text-[8px] font-black uppercase italic px-2 py-1 rounded inline-block ${
                    selectedRecord?.id === rec.id ? 'bg-white/10 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {analysis.action}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="md:col-span-2">
          {selectedRecord ? (
            <div className="bento-card bg-slate-900/50 border-slate-800 p-8 space-y-8 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center border-b border-slate-800 pb-6">
                <div>
                  <h3 className="text-2xl font-black text-white uppercase italic">{selectedRecord.athlete_name}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Relatório de Triagem Pré-Participação</p>
                </div>
                <div className={`px-6 py-2 rounded-xl border ${
                  getACSMAnalysis(selectedRecord.data).status === 'danger' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 
                  getACSMAnalysis(selectedRecord.data).status === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' : 
                  'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                }`}>
                  <p className="text-[10px] font-black uppercase italic">{getACSMAnalysis(selectedRecord.data).msg}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h5 className="text-[10px] font-black text-purple-400 uppercase italic tracking-[0.2em]">Respostas PAR-Q+</h5>
                  <div className="space-y-2">
                    {[
                      { l: 'Problema Coração/Pressão', v: selectedRecord.data.q1 },
                      { l: 'Dor no Peito', v: selectedRecord.data.q2 },
                      { l: 'Tontura/Desequilíbrio', v: selectedRecord.data.q3 },
                      { l: 'Condição Crônica', v: selectedRecord.data.q4 },
                      { l: 'Uso de Medicamentos', v: selectedRecord.data.q5 },
                      { l: 'Problema Ósseo/Artic.', v: selectedRecord.data.q6 },
                      { l: 'Remédio Coração/Pressão', v: selectedRecord.data.q7 },
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-slate-900 rounded-xl border border-slate-800">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">{item.l}</span>
                        <span className={`text-[10px] font-black uppercase ${item.v ? 'text-red-500' : 'text-emerald-500'}`}>
                          {item.v ? 'Sim' : 'Não'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h5 className="text-[10px] font-black text-blue-400 uppercase italic tracking-[0.2em]">Fatores de Risco (ACSM/NSCA)</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <RiskFactor label="Ativo regular?" value={selectedRecord.data.isPhysicallyActive} invert />
                    <RiskFactor label="Doença CV/Metab./Renal" value={selectedRecord.data.hasKnownDisease} />
                    <RiskFactor label="Sinais ou Sintomas" value={selectedRecord.data.hasSymptoms} />
                    <RiskFactor label="Histórico Familiar" value={selectedRecord.data.familyHistory} />
                    <RiskFactor label="Fumante" value={selectedRecord.data.smoking} />
                    <RiskFactor label="Hipertensão" value={selectedRecord.data.hypertension} />
                    <RiskFactor label="Diabetes" value={selectedRecord.data.diabetes} />
                    <RiskFactor label="Obesidade" value={selectedRecord.data.obesity} />
                  </div>
                  <div className="mt-4 p-4 bg-slate-900 rounded-2xl border border-slate-800">
                    <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Intensidade Desejada</p>
                    <p className="text-sm font-black text-white uppercase italic">{selectedRecord.data.desiredIntensity === 'vigorous' ? 'Vigorosa' : 'Moderada'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {selectedRecord.data.previousInjuries && (
                  <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
                    <p className="text-[10px] font-black text-rose-400 uppercase italic mb-2">Histórico de Lesões</p>
                    <p className="text-xs text-white font-medium leading-relaxed">{selectedRecord.data.previousInjuries}</p>
                  </div>
                )}
                {selectedRecord.data.details && (
                  <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
                    <p className="text-[10px] font-black text-slate-500 uppercase italic mb-2">Observações Adicionais</p>
                    <p className="text-xs text-white font-medium leading-relaxed">{selectedRecord.data.details}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-20 bento-card bg-slate-900/30 border-dashed border-slate-800">
              <User className="w-16 h-16 text-slate-800 mb-4" />
              <p className="text-slate-600 font-black uppercase italic tracking-widest text-sm">Selecione um aluno para visualizar o relatório</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RiskFactor({ label, value, invert = false }: { label: string, value: boolean, invert?: boolean }) {
  const isDanger = invert ? !value : value;
  return (
    <div className="flex justify-between items-center p-3 bg-slate-900 rounded-xl border border-slate-800">
      <span className="text-[9px] font-bold text-slate-500 uppercase">{label}</span>
      <span className={`text-[10px] font-black uppercase ${isDanger ? 'text-red-500' : 'text-emerald-500'}`}>
        {value ? 'Sim' : 'Não'}
      </span>
    </div>
  );
}

function RequestsModule({ requests, onApproved }: { requests: any[], onApproved: (updated: any[]) => void }) {
  const [localRequests, setLocalRequests] = useState(requests);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ fullName: string; email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleApprove = async (req: any) => {
    setLoadingId(req.id);
    try {
      const result = await approveRegistration(req.id);
      if (result.success && !result.alreadyExists) {
        const updated = localRequests.filter(r => r.id !== req.id);
        setLocalRequests(updated);
        onApproved(updated);
        setCredentials({
          fullName: result.fullName!,
          email: result.email!,
          password: result.password!
        });
        setCopied(false);
      } else if (result.alreadyExists) {
        const updated = localRequests.filter(r => r.id !== req.id);
        setLocalRequests(updated);
        onApproved(updated);
        alert(`O e-mail ${req.email} já possui uma conta cadastrada. Status atualizado para aprovado.`);
      } else {
        alert('Erro ao aprovar: ' + result.error);
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (requestId: string) => {
    if (!confirm('Tem certeza que deseja remover esta solicitação?')) return;
    setLoadingId(requestId);
    try {
      const result = await deleteRegistrationRequest(requestId);
      if (result.success) {
        const updated = localRequests.filter(r => r.id !== requestId);
        setLocalRequests(updated);
        onApproved(updated);
      } else {
        alert('Erro ao remover: ' + result.error);
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handleCopyCredentials = () => {
    if (!credentials) return;
    const text = `Olá, ${credentials.fullName}!\nÉ com grande alegria que te recebemos no William Moreira Performance System (WMPS).\nSeja muito bem-vindo!\nA partir de hoje, iniciamos uma nova jornada focada em evolução, performance e resultados.\n\nLogin (E-mail): ${credentials.email}\nSenha provisória: ${credentials.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Modal de Credenciais */}
      {credentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 shadow-2xl shadow-emerald-500/10 space-y-6 animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/30">
                <UserPlus className="w-7 h-7 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase italic">Acesso Criado!</h3>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Envie as credenciais ao aluno</p>
              </div>
            </div>

            {/* Athlete Name */}
            <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
              <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Atleta</p>
              <p className="text-base font-black text-white uppercase italic">{credentials.fullName}</p>
            </div>

            {/* Credentials Box */}
            <div className="space-y-3">
              <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 flex justify-between items-center">
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-0.5">Login (E-mail)</p>
                  <p className="text-sm font-bold text-white">{credentials.email}</p>
                </div>
                <Mail className="w-4 h-4 text-blue-500" />
              </div>
              <div className="bg-slate-950 rounded-2xl p-4 border border-emerald-500/20 flex justify-between items-center">
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-0.5">Senha Provisória</p>
                  <p className="text-lg font-black text-emerald-400 tracking-widest font-mono">{credentials.password}</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>

            {/* Welcome Message Preview */}
            <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700 text-[10px] text-slate-400 leading-relaxed font-medium space-y-1">
              <p className="font-black text-slate-300 uppercase text-[9px] tracking-widest mb-2">Prévia da mensagem de boas-vindas:</p>
              <p>Olá, <strong className="text-white">{credentials.fullName}</strong>!</p>
              <p>É com grande alegria que te recebemos no William Moreira Performance System (WMPS).</p>
              <p>Seja muito bem-vindo!</p>
              <p>A partir de hoje, iniciamos uma nova jornada focada em evolução, performance e resultados.</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCopyCredentials}
                className={`flex-1 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 ${
                  copied
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                }`}
              >
                {copied ? '✓ Copiado!' : '📋 Copiar Mensagem'}
              </button>
              <button
                onClick={() => setCredentials(null)}
                className="flex-1 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black uppercase text-[10px] tracking-widest transition-all border border-slate-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white uppercase italic">Solicitações de Acesso</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Gerencie os novos cadastros de atletas</p>
        </div>
        {localRequests.length > 0 && (
          <span className="bg-rose-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
            {localRequests.length} pendente{localRequests.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {localRequests.length === 0 ? (
          <div className="bento-card bg-slate-900/50 border-slate-800 p-16 text-center">
            <UserPlus className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 font-black uppercase italic text-sm">Nenhuma solicitação pendente</p>
            <p className="text-slate-700 text-[10px] font-bold uppercase mt-2">Todos os cadastros foram processados</p>
          </div>
        ) : (
          localRequests.map((req) => (
            <div key={req.id} className="bento-card bg-slate-900 border-slate-800 p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-rose-500/30 transition-all">
              <div className="flex items-center gap-6 w-full">
                <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 font-black italic text-2xl border border-rose-500/20">
                  {req.full_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-white uppercase italic truncate">{req.full_name}</h3>
                  <div className="flex flex-wrap gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                      <Mail className="w-3 h-3 text-rose-500 shrink-0" />
                      <span className="truncate max-w-[200px]">{req.email}</span>
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                      <User className="w-3 h-3 text-blue-500 shrink-0" />
                      CPF: {req.cpf}
                    </span>
                    {req.phone && (
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Tel: {req.phone}</span>
                    )}
                    {req.is_minor && (
                      <span className="text-[9px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-black uppercase border border-amber-500/20">
                        Menor de Idade
                      </span>
                    )}
                  </div>
                  {req.guardian_name && (
                    <p className="text-[9px] text-slate-600 font-bold uppercase mt-1">
                      Responsável: {req.guardian_name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
                <button
                  onClick={() => handleDelete(req.id)}
                  disabled={loadingId === req.id}
                  className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all border border-red-500/20"
                  title="Remover solicitação"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleApprove(req)}
                  disabled={loadingId === req.id}
                  className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {loadingId === req.id ? (
                    <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processando...</>
                  ) : (
                    <><UserPlus className="w-3.5 h-3.5" />Aprovar e Criar Acesso</>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const STRENGTH_EXERCISES = [
  'Agachamento (Squat)',
  'Supino (Bench Press)',
  'Levantamento Terra (Deadlift)',
  'Prensa de Pernas (Leg Press)',
  'Extensão de Pernas',
  'Flexão de Pernas',
  'Puxada Alta (Lat Pulldown)',
  'Remada Baixa',
  'Desenvolvimento (Shoulder Press)',
  'Rosca Direta',
  'Tríceps Pulley',
  'Afundo (Lunge)',
  'Elevação Lateral',
  'Prancha Abdominal',
  'Flexão de Braços (Push-up)'
];

const INTENSITY_OPTIONS = [
  '60% 1RM (Força Iniciante)',
  '70% 1RM (Força Intermediária)',
  '80% 1RM (Força Avançada)',
  '85% 1RM (Força Máxima)',
  '90% 1RM (Potência)',
  'RPE 6 (Muito Leve)',
  'RPE 7 (Leve)',
  'RPE 8 (Moderado)',
  'RPE 9 (Forte)',
  'RPE 10 (Máximo)'
];

const LPO_EXERCISES = [
  'Snatch (Arranco)',
  'Clean & Jerk (Arremesso)',
  'Power Clean',
  'Power Snatch',
  'Hang Clean',
  'Hang Snatch',
  'Push Press',
  'Jerk',
  'Clean Pull',
  'Snatch Pull'
];

const JUMP_TYPES = [
  { id: 'bipodal', name: 'Bipodal (2 contatos)', multiplier: 2 },
  { id: 'unipodal', name: 'Unipodal (1 contato)', multiplier: 1 }
];

const PLYO_EXERCISES = [
  'Pogos', 'Side-to-side ankle hop', 'Jump and reach', 'Squat jump', 'Standing long jump', 
  'Cone hops', 'Skipping', 'MB Chest pass', 'Barrier jumps', 'Tuck jumps', 'Split squat jump', 
  'Double leg hops', 'Box jumps', 'Plyo push-up', 'Triple jump', 'Pike jump', 
  'Single-leg vertical jump', 'Single-leg hops', 'Depth plyo push-up', 'Single-leg bounding', 'Depth jump'
];

const PLYO_INTENSITY_OPTIONS = ['Baixa', 'Média', 'Alta'];

const SPRINT_TYPES = ['Sprint Linear', 'Sprint com Mudança de Direção', 'Sprint Resistido', 'Sprint em Ladeira', 'Sprint Curvado'];
const SPRINT_DISTANCES = [5, 10, 20, 30, 40, 50, 60, 80, 100, 150, 200, 400];
const SPRINT_VELOCITIES = Array.from({ length: 43 }, (_, i) => i + 3); // 3 to 45 km/h
const POWER_SETS = Array.from({ length: 10 }, (_, i) => i + 1);
const POWER_REPS = Array.from({ length: 20 }, (_, i) => i + 1);
const POWER_REST = ['30s', '60s', '90s', '2 min', '3 min', '4 min', '5 min'];
const POWER_WEIGHTS = Array.from({ length: 61 }, (_, i) => i * 5); // 0 to 300kg
const LPO_INTENSITY_OPTIONS = Array.from({ length: 19 }, (_, i) => `${10 + (i * 5)}% 1RM`);
const VOLUME_OPTIONS = Array.from({ length: 15 }, (_, i) => 100 - (i * 5)).filter(v => v >= 30);

function AdvancedStrengthCard({ values, onChange }: { values: any[], onChange: (newList: any[]) => void }) {
  const addExercise = () => {
    onChange([...values, { name: '', intensity: '', sets: '4', reps: '10', rest: '90s', weight: '', volumePercent: '100' }]);
  };

  const removeExercise = (index: number) => {
    if (values.length <= 1) return;
    const newList = [...values];
    newList.splice(index, 1);
    onChange(newList);
  };

  const updateExercise = (index: number, field: string, val: string) => {
    const newList = [...values];
    newList[index] = { ...newList[index], [field]: val };
    onChange(newList);
  };

  return (
    <div className="bento-card bg-slate-900 border-slate-800 p-6 space-y-6 md:col-span-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800 rounded-xl border border-slate-700">
            <Dumbbell className="w-5 h-5 text-blue-500" />
          </div>
          <h4 className="text-sm font-black text-white uppercase italic">Treinamento de Força</h4>
        </div>
        <button 
          onClick={addExercise}
          className="p-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-all shadow-lg shadow-blue-600/20"
          title="Adicionar Exercício"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {values.map((ex, idx) => {
          const volumeTotal = (parseInt(ex.sets) || 0) * (parseInt(ex.reps) || 0);
          const effectiveVolume = Math.round(volumeTotal * (parseInt(ex.volumePercent) || 100) / 100);
          const loadTotal = volumeTotal * (parseFloat(ex.weight) || 0);

          return (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl space-y-4 relative group"
            >
              {values.length > 1 && (
                <button 
                  onClick={() => removeExercise(idx)}
                  className="absolute top-4 right-4 text-slate-700 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Exercício</label>
                  <select 
                    value={ex.name}
                    onChange={(e) => updateExercise(idx, 'name', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:ring-1 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Selecione...</option>
                    {STRENGTH_EXERCISES.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Intensidade</label>
                  <select 
                    value={ex.intensity}
                    onChange={(e) => updateExercise(idx, 'intensity', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:ring-1 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Selecione...</option>
                    {INTENSITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Intervalo Descanso</label>
                  <input 
                    value={ex.rest}
                    onChange={(e) => updateExercise(idx, 'rest', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="Ex: 90s"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Séries</label>
                  <input 
                    type="number"
                    value={ex.sets}
                    onChange={(e) => updateExercise(idx, 'sets', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Repetições</label>
                  <input 
                    type="number"
                    value={ex.reps}
                    onChange={(e) => updateExercise(idx, 'reps', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Carga (kg)</label>
                  <input 
                    type="number"
                    value={ex.weight}
                    onChange={(e) => updateExercise(idx, 'weight', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none"
                    placeholder="Opcional"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1">% Volume Prescrito</label>
                  <select 
                    value={ex.volumePercent}
                    onChange={(e) => updateExercise(idx, 'volumePercent', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none appearance-none cursor-pointer"
                  >
                    {VOLUME_OPTIONS.map(p => <option key={p} value={p}>{p}%</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/50">
                  <p className="text-[8px] font-black text-slate-600 uppercase">Volume Total ({ex.volumePercent}%)</p>
                  <p className="text-sm font-black text-emerald-400 italic">{effectiveVolume} <span className="text-[9px] text-slate-500 not-italic">reps</span></p>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/50">
                  <p className="text-[8px] font-black text-slate-600 uppercase">Load Total (Volume x Kg)</p>
                  <p className="text-sm font-black text-blue-400 italic">{loadTotal.toLocaleString()} <span className="text-[9px] text-slate-500 not-italic">kg</span></p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function AdvancedPowerTrainingCard({ values, onChange }: { values: any[], onChange: (newList: any[]) => void }) {
  const addExercise = () => {
    onChange([...values, { 
      type: 'LPO', // LPO, Pliometria, Sprint
      name: '', 
      intensity: '', 
      sets: '3', 
      reps: '5', 
      rest: '2 min', 
      weight: '', 
      volumePercent: '100',
      jumpType: 'bipodal', // for Plyo
      distance: '', // for Sprint
      velocity: '', // for Sprint (km/h)
      duration: '' // for Sprint (calculated)
    }]);
  };

  const removeExercise = (index: number) => {
    if (values.length <= 1) return;
    const newList = [...values];
    newList.splice(index, 1);
    onChange(newList);
  };

  const updateExercise = (index: number, field: string, val: string) => {
    const newList = [...values];
    newList[index] = { ...newList[index], [field]: val };
    onChange(newList);
  };

  return (
    <div className="bento-card bg-slate-900 border-slate-800 p-6 space-y-6 md:col-span-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800 rounded-xl border border-slate-700">
            <Zap className="w-5 h-5 text-yellow-500" />
          </div>
          <h4 className="text-sm font-black text-white uppercase italic">Treinamento de Potência</h4>
        </div>
        <button 
          onClick={addExercise}
          className="p-2 bg-yellow-600 hover:bg-yellow-500 rounded-xl text-white transition-all shadow-lg shadow-yellow-600/20"
          title="Adicionar Exercício de Potência"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {values.map((ex, idx) => {
          const isPlyo = ex.type === 'Pliometria';
          const isLPO = ex.type === 'LPO';
          const isSprint = ex.type === 'Sprint';

          let volumeTotal = 0;
          let metricLabel = 'reps';

          if (isLPO) {
            volumeTotal = (parseInt(ex.sets) || 0) * (parseInt(ex.reps) || 0);
          } else if (isPlyo) {
            const multiplier = JUMP_TYPES.find(j => j.id === ex.jumpType)?.multiplier || 1;
            volumeTotal = (parseInt(ex.sets) || 0) * (parseInt(ex.reps) || 0) * multiplier;
            metricLabel = 'contatos';
          } else if (isSprint) {
            volumeTotal = (parseInt(ex.sets) || 0) * (parseInt(ex.reps) || 0) * (parseFloat(ex.distance) || 0);
            metricLabel = 'metros';
          }

          const effectiveVolume = Math.round(volumeTotal * (parseInt(ex.volumePercent) || 100) / 100);
          
          // Sprint calculation: Time = Dist / (Vel / 3.6)
          const calculatedSprintTime = isSprint && ex.distance && ex.velocity 
            ? (parseFloat(ex.distance) / (parseFloat(ex.velocity) / 3.6)).toFixed(2)
            : null;

          // Sync duration for athlete view
          if (isSprint && calculatedSprintTime && ex.duration !== calculatedSprintTime) {
            setTimeout(() => updateExercise(idx, 'duration', calculatedSprintTime), 0);
          }

          return (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl space-y-4 relative group"
            >
              {values.length > 1 && (
                <button 
                  onClick={() => removeExercise(idx)}
                  className="absolute top-4 right-4 text-slate-700 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Tipo</label>
                  <select 
                    value={ex.type}
                    onChange={(e) => updateExercise(idx, 'type', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none appearance-none cursor-pointer"
                  >
                    <option value="LPO">LPO</option>
                    <option value="Pliometria">Pliometria</option>
                    <option value="Sprint">Sprint</option>
                  </select>
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1">
                    {isPlyo ? 'Salto / Exercício' : isSprint ? 'Tipo de Sprint' : 'Exercício LPO'}
                  </label>
                  {isLPO ? (
                    <select 
                      value={ex.name}
                      onChange={(e) => updateExercise(idx, 'name', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none appearance-none cursor-pointer"
                    >
                      <option value="">Selecione LPO...</option>
                      {LPO_EXERCISES.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  ) : isPlyo ? (
                    <select 
                      value={ex.name}
                      onChange={(e) => updateExercise(idx, 'name', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none appearance-none cursor-pointer"
                    >
                      <option value="">Selecione Salto...</option>
                      {PLYO_EXERCISES.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  ) : (
                    <select 
                      value={ex.name}
                      onChange={(e) => updateExercise(idx, 'name', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none appearance-none cursor-pointer"
                    >
                      <option value="">Selecione Sprint...</option>
                      {SPRINT_TYPES.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  )}
                </div>

                {!isSprint && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Intensidade</label>
                    {isPlyo ? (
                      <select 
                        value={ex.intensity}
                        onChange={(e) => updateExercise(idx, 'intensity', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none appearance-none cursor-pointer"
                      >
                        <option value="">Selecione...</option>
                        {PLYO_INTENSITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <select 
                        value={ex.intensity}
                        onChange={(e) => updateExercise(idx, 'intensity', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none appearance-none cursor-pointer"
                      >
                        <option value="">Selecione...</option>
                        {LPO_INTENSITY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    )}
                  </div>
                )}
                {isSprint && (
                   <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Tempo Previsto</label>
                    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-black text-yellow-500 italic">
                      {calculatedSprintTime ? `${calculatedSprintTime}s` : '--'}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {isPlyo && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Tipo Salto</label>
                    <select 
                      value={ex.jumpType}
                      onChange={(e) => updateExercise(idx, 'jumpType', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none appearance-none cursor-pointer"
                    >
                      {JUMP_TYPES.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                    </select>
                  </div>
                )}
                {isSprint && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Distância (m)</label>
                      <select 
                        value={ex.distance}
                        onChange={(e) => updateExercise(idx, 'distance', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none appearance-none cursor-pointer"
                      >
                        <option value="">Selecione...</option>
                        {SPRINT_DISTANCES.map(d => <option key={d} value={d}>{d}m</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Velocidade (km/h)</label>
                      <select 
                        value={ex.velocity}
                        onChange={(e) => updateExercise(idx, 'velocity', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none appearance-none cursor-pointer"
                      >
                        <option value="">Selecione...</option>
                        {SPRINT_VELOCITIES.map(v => <option key={v} value={v}>{v} km/h</option>)}
                      </select>
                    </div>
                  </>
                )}
                {isLPO && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Carga (kg)</label>
                    <select 
                      value={ex.weight}
                      onChange={(e) => updateExercise(idx, 'weight', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none appearance-none cursor-pointer"
                    >
                      <option value="">Selecione...</option>
                      {POWER_WEIGHTS.map(w => <option key={w} value={w}>{w}kg</option>)}
                    </select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Séries</label>
                  <select 
                    value={ex.sets}
                    onChange={(e) => updateExercise(idx, 'sets', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none appearance-none cursor-pointer"
                  >
                    {POWER_SETS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Reps / Ciclo</label>
                  <select 
                    value={ex.reps}
                    onChange={(e) => updateExercise(idx, 'reps', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none appearance-none cursor-pointer"
                  >
                    {POWER_REPS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Descanso</label>
                  <select 
                    value={ex.rest}
                    onChange={(e) => updateExercise(idx, 'rest', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none appearance-none cursor-pointer"
                  >
                    {POWER_REST.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1">% Volume</label>
                  <select 
                    value={ex.volumePercent}
                    onChange={(e) => updateExercise(idx, 'volumePercent', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none appearance-none cursor-pointer"
                  >
                    {VOLUME_OPTIONS.map(p => <option key={p} value={p}>{p}%</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/50">
                <p className="text-[8px] font-black text-slate-600 uppercase">Volume Final ({ex.volumePercent}%)</p>
                <p className="text-sm font-black text-yellow-500 italic">{effectiveVolume.toLocaleString()} <span className="text-[9px] text-slate-500 not-italic">{metricLabel}</span></p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function PrescriptionModule({ coachId }: { coachId?: string }) {
  const [athletes, setAthletes] = useState<any[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [searchAthlete, setSearchAthlete] = useState('');
  const [sending, setSending] = useState(false);
  const [prescription, setPrescription] = useState({
    strength: [{ name: '', intensity: '', sets: '4', reps: '10', rest: '90s', weight: '', volumePercent: '100' }],
    cardio: [{ type: 'HIIT', protocol: '', workDur: '', recDur: '', workInt: '', recInt: '', series: '', reps: '', bSeriesDur: '', totalKm: '0', totalTime: '0', modality: '', duration: '', notes: '' }],
    powerTraining: [{ type: 'LPO', name: '', intensity: '', sets: '3', reps: '5', rest: '2 min', weight: '', volumePercent: '100', jumpType: 'bipodal', distance: '', duration: '' }],
    prevVolume: ''
  });

  const handleSendPrescription = async () => {
    if (!selectedAthlete || !coachId) return;
    
    setSending(true);
    try {
      const result = await saveTrainingPrescription({
        athlete_id: selectedAthlete.id,
        coach_id: coachId,
        athlete_name: selectedAthlete.full_name,
        data: prescription
      });

      if (result.success) {
        alert('Prescrição enviada com sucesso para ' + selectedAthlete.full_name);
      } else {
        alert('Erro ao enviar: ' + result.error);
      }
    } catch (error) {
      console.error(error);
      alert('Erro inesperado ao enviar prescrição.');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    async function load() {
      const data = await getAthletes();
      const allSessions = await getSessions();
      setAthletes(data);
      setSessions(allSessions);
      setLoading(false);
    }
    load();
  }, []);

  const athleteSessions = useMemo(() => {
    if (!selectedAthlete) return [];
    return sessions.filter(s => s.athlete_id === selectedAthlete.id || s.athlete_name === selectedAthlete.full_name);
  }, [selectedAthlete, sessions]);

  const internalLoadData = useMemo(() => {
    return athleteSessions.slice(0, 10).reverse().map(s => ({
      date: format(parseISO(s.date), 'dd/MM'),
      load: s.load
    }));
  }, [athleteSessions]);

  const filteredAthletes = useMemo(() => {
    return athletes.filter(a => 
      a.full_name?.toLowerCase().includes(searchAthlete.toLowerCase()) ||
      a.sport?.toLowerCase().includes(searchAthlete.toLowerCase())
    );
  }, [athletes, searchAthlete]);

  if (loading) return <div className="text-center py-20 font-black text-slate-500 uppercase italic">Carregando Atletas...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white uppercase italic">Prescrição de Treinamento</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Painel de Controle Individual do Atleta</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Athlete List */}
        <div className="lg:col-span-3 space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar atleta..."
              value={searchAthlete}
              onChange={(e) => setSearchAthlete(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs font-bold text-white focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          
          {filteredAthletes.map(athlete => (
            <button 
              key={athlete.id}
              onClick={() => setSelectedAthlete(athlete)}
              className={`w-full p-4 text-left rounded-2xl border transition-all flex items-center gap-4 ${
                selectedAthlete?.id === athlete.id ? 'bg-blue-600 border-blue-500 shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black italic text-sm ${selectedAthlete?.id === athlete.id ? 'bg-white/20 text-white' : 'bg-slate-800 text-blue-500'}`}>
                {athlete.full_name?.charAt(0)}
              </div>
              <div>
                <h4 className="text-xs font-black text-white uppercase italic">{athlete.full_name}</h4>
                <p className="text-[9px] text-slate-500 font-bold uppercase">{athlete.sport || 'N/A'}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Prescription Dashboard */}
        <div className="lg:col-span-9">
          {selectedAthlete ? (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
              {/* Athlete Summary Card */}
              <div className="bento-card bg-slate-900 border-slate-800 p-8 grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-3xl font-black text-white italic">
                      {selectedAthlete.full_name?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white uppercase italic">{selectedAthlete.full_name}</h3>
                      <p className="text-xs text-blue-400 font-black uppercase italic tracking-widest">{selectedAthlete.goal || 'Objetivo não definido'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase">Idade</p>
                      <p className="text-sm font-black text-white italic">{differenceInDays(new Date(), parseISO(selectedAthlete.birth_date)) / 365 | 0} Anos</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase">Esporte</p>
                      <p className="text-sm font-black text-white italic">{selectedAthlete.sport || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase">Altura</p>
                      <p className="text-sm font-black text-white italic">{selectedAthlete.height} cm</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase">Peso</p>
                      <p className="text-sm font-black text-white italic">{selectedAthlete.weight} kg</p>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                   <div className="flex items-center justify-between">
                      <p className="label-caps italic">Carga Interna Recente</p>
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                   </div>
                   <div className="h-[120px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={internalLoadData}>
                          <defs>
                            <linearGradient id="colorPrescLoad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="load" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPrescLoad)" strokeWidth={2} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                   </div>
                </div>
              </div>

              {/* physiological metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricBox label="% 1RM" value="85%" subValue="Força" color="text-red-500" />
                <MetricBox label="% vVO2max" value="105%" subValue="Cardio" color="text-blue-500" />
                <MetricBox label="% FCmax" value="92%" subValue="Esforço" color="text-orange-500" />
                <MetricBox label="% FCres" value="80%" subValue="Reserva" color="text-emerald-500" />
              </div>

              {/* Prescription Forms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <AdvancedStrengthCard 
                  values={prescription.strength}
                  onChange={(newList) => setPrescription({...prescription, strength: newList})}
                />
                <AdvancedCardioCard 
                  values={prescription.cardio}
                  onChange={(newList) => setPrescription({...prescription, cardio: newList})}
                />
                <AdvancedPowerTrainingCard 
                  values={prescription.powerTraining}
                  onChange={(newList) => setPrescription({...prescription, powerTraining: newList})}
                />
              </div>

              {/* Final Send Button */}

               <button 
                onClick={handleSendPrescription}
                disabled={sending}
                className={`w-full py-6 text-white font-black uppercase italic tracking-widest rounded-3xl shadow-xl transition-all flex items-center justify-center gap-3 group ${
                  sending ? 'bg-slate-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
                }`}
              >
                <Download className={`w-5 h-5 ${sending ? 'animate-spin' : 'group-hover:translate-y-1 transition-transform'}`} />
                {sending ? 'Enviando...' : 'Salvar e Enviar Prescrição'}
              </button>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-20 bento-card bg-slate-900/30 border-dashed border-slate-800">
              <User className="w-16 h-16 text-slate-800 mb-4" />
              <p className="text-slate-600 font-black uppercase italic tracking-widest text-sm">Selecione um atleta para iniciar a prescrição</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricBox({ label, value, subValue, color }: { label: string, value: string, subValue: string, color: string }) {
  return (
    <div className="bento-card bg-slate-900 border-slate-800 p-4 flex flex-col items-center justify-center text-center">
      <p className="text-[10px] font-black text-slate-500 uppercase mb-1">{label}</p>
      <h4 className={`text-2xl font-black italic ${color}`}>{value}</h4>
      <p className="text-[8px] font-bold text-slate-600 uppercase mt-1">{subValue}</p>
    </div>
  );
}

function AdvancedCardioCard({ values, onChange }: { values: any[], onChange: (newList: any[]) => void }) {
  const protocols = [
    { id: 'sit', name: 'SIT (Sprint Interval)', workDur: '30', recDur: '120', workInt: '18', series: '1', reps: '6' },
    { id: 'rst', name: 'RST (Repeated Sprint)', workDur: '6', recDur: '20', workInt: '22', series: '2', reps: '8' },
    { id: 'short', name: 'HIIT Curto', workDur: '30', recDur: '30', workInt: '15', series: '2', reps: '12' },
    { id: 'long', name: 'HIIT Longo', workDur: '120', recDur: '120', workInt: '11.5', series: '1', reps: '4' }
  ];

  const calculateHIITVolume = (workDur: string, speed: string, series: string, reps: string) => {
    const s = parseFloat(speed) || 0;
    const d = parseFloat(workDur) || 0;
    const r = parseInt(reps) || 0;
    const se = parseInt(series) || 0;
    const distPerRep = (s * d) / 3.6;
    return ((distPerRep * r * se) / 1000).toFixed(3);
  };

  const calculateHIITTime = (workDur: string, recDur: string, series: string, reps: string, bSeriesDur: string = '0') => {
    const d = parseFloat(workDur) || 0;
    const r = parseFloat(recDur) || 0;
    const rp = parseInt(reps) || 0;
    const se = parseInt(series) || 0;
    const bs = parseFloat(bSeriesDur) || 0;
    const timeWork = (d * rp * se) / 60;
    const timeRec = (r * (rp - 1) * se) / 60;
    const timeBSeries = (bs * (se - 1)) / 60;
    return (timeWork + timeRec + timeBSeries).toFixed(1);
  };

  const addSession = () => {
    onChange([...values, { type: 'HIIT', protocol: '', workDur: '', recDur: '', workInt: '', recInt: '', series: '1', reps: '4', bSeriesDur: '0', totalKm: '0', totalTime: '0', modality: '', duration: '', notes: '' }]);
  };

  const removeSession = (idx: number) => {
    onChange(values.filter((_, i) => i !== idx));
  };

  const updateSession = (idx: number, field: string, val: any) => {
    const newList = [...values];
    newList[idx] = { ...newList[idx], [field]: val };

    // Auto-calculations
    const s = newList[idx];
    if (s.type === 'HIIT') {
      s.totalKm = calculateHIITVolume(s.workDur, s.workInt, s.series, s.reps);
      s.totalTime = calculateHIITTime(s.workDur, s.recDur, s.series, s.reps);
    } else {
      const time = parseFloat(s.duration) || 0;
      const speed = parseFloat(s.workInt) || 0;
      if (time > 0 && speed > 0) {
        s.totalKm = ((speed * time) / 60).toFixed(2);
        s.totalTime = time.toString();
      }
    }

    onChange(newList);
  };

  return (
    <div className="bento-card bg-slate-900 border-slate-800 p-6 space-y-6 md:col-span-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800 rounded-xl border border-slate-700">
            <Timer className="w-5 h-5 text-emerald-500" />
          </div>
          <h4 className="text-sm font-black text-white uppercase italic">Treinamento Cardiovascular</h4>
        </div>
        <button onClick={addSession} className="p-2 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-lg shadow-blue-600/20">
          <Plus className="w-4 h-4 text-white" />
        </button>
      </div>

      <div className="space-y-4">
        {values.map((s, idx) => (
          <div key={idx} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-4 relative group">
            <button onClick={() => removeSession(idx)} className="absolute -top-2 -right-2 p-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100">
              <X className="w-3 h-3" />
            </button>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Tipo</label>
                <select 
                  value={s.type}
                  onChange={(e) => updateSession(idx, 'type', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none"
                >
                  <option value="HIIT">HIIT</option>
                  <option value="Contínuo">Contínuo</option>
                </select>
              </div>

              {s.type === 'HIIT' ? (
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Protocolo</label>
                  <select 
                    onChange={(e) => {
                      const p = protocols.find(x => x.id === e.target.value);
                      if (p) {
                        const newList = [...values];
                        newList[idx] = { 
                          ...newList[idx], 
                          protocol: p.name, 
                          workDur: p.workDur, 
                          recDur: p.recDur, 
                          workInt: p.workInt, 
                          series: p.series, 
                          reps: p.reps,
                          totalKm: calculateHIITVolume(p.workDur, p.workInt, p.series, p.reps),
                          totalTime: calculateHIITTime(p.workDur, p.recDur, p.series, p.reps)
                        };
                        onChange(newList);
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none"
                  >
                    <option value="">Personalizado / Formatos...</option>
                    {protocols.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Modalidade</label>
                  <input 
                    value={s.modality}
                    onChange={(e) => updateSession(idx, 'modality', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none"
                    placeholder="Ex: Corrida, Bike..."
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Total KM</label>
                <div className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-black text-emerald-500 italic">
                  {s.totalKm} KM
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">
                  {s.type === 'HIIT' ? 'Velocidade (km/h)' : 'Velocidade (km/h)'}
                </label>
                <input 
                  type="number" step="0.1"
                  value={s.workInt}
                  onChange={(e) => updateSession(idx, 'workInt', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {s.type === 'HIIT' ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Estímulo (seg)</label>
                    <input 
                      type="number"
                      value={s.workDur}
                      onChange={(e) => updateSession(idx, 'workDur', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Recuperação (seg)</label>
                    <input 
                      type="number"
                      value={s.recDur}
                      onChange={(e) => updateSession(idx, 'recDur', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Séries</label>
                    <input 
                      type="number"
                      value={s.series}
                      onChange={(e) => updateSession(idx, 'series', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Reps</label>
                    <input 
                      type="number"
                      value={s.reps}
                      onChange={(e) => updateSession(idx, 'reps', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Duração (min)</label>
                    <input 
                      type="number"
                      value={s.duration}
                      onChange={(e) => updateSession(idx, 'duration', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-3">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Observações</label>
                    <input 
                      value={s.notes}
                      onChange={(e) => updateSession(idx, 'notes', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none"
                      placeholder="Pace, FC, etc..."
                    />
                  </div>
                </>
              )}
            </div>
            
            {s.type === 'HIIT' && (
              <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800/50 flex justify-between items-center">
                 <p className="text-[8px] font-black text-slate-500 uppercase">Tempo Total Previsto: <span className="text-white ml-2 text-[10px]">{s.totalTime} MIN</span></p>
                 <p className="text-[8px] font-black text-slate-500 uppercase">Modalidade: <input value={s.modality} onChange={e => updateSession(idx, 'modality', e.target.value)} className="bg-transparent border-none text-right text-[10px] font-black text-white outline-none w-20" placeholder="Ex: Rua" /></p>
              </div>
            )}
          </div>
        ))}
        {values.length === 0 && (
          <div className="text-center py-10 border-2 border-dashed border-slate-800 rounded-3xl">
            <p className="text-[10px] font-black text-slate-600 uppercase">Nenhuma sessão cardiovascular adicionada</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AthletesModule({ coachId, onPeriodize }: { coachId?: string, onPeriodize?: (athlete: any) => void }) {
  const [athletes, setAthletes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAthlete, setSelectedAthlete] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const data = await getAthletes();
      setAthletes(data);
      setLoading(false);
    }
    load();
  }, []);

  const filteredAthletes = useMemo(() => {
    return athletes.filter(a => 
      a.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.sport?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [athletes, searchTerm]);

  if (loading) return (
    <div className="py-20 flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      <p className="mt-4 text-[10px] font-black text-slate-500 uppercase italic">Carregando Elenco...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/50 p-8 rounded-[2rem] border border-slate-800">
        <div>
          <h2 className="text-3xl font-black text-white uppercase italic">Gestão de Alunos</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Total de {athletes.length} atletas ativos no sistema</p>
        </div>
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar por nome, esporte ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-white outline-none focus:border-cyan-500/50 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredAthletes.map(athlete => (
          <motion.div 
            key={athlete.id}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedAthlete(athlete)}
            className="group bg-slate-900 border border-slate-800 rounded-[2rem] p-6 hover:border-cyan-500/50 transition-all text-left relative overflow-hidden cursor-pointer"
          >
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
              <User className="w-32 h-32 text-white" />
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center relative">
                {athlete.photo_url ? (
                  <img src={athlete.photo_url} alt={athlete.full_name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-slate-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-white uppercase italic truncate">{athlete.full_name}</h3>
                <div className="flex flex-col">
                  <p className="text-[9px] text-cyan-500 font-black uppercase tracking-widest">{athlete.sport || 'Esporte N/A'}</p>
                  {athlete.team_name && (
                    <p className="text-[8px] text-emerald-500 font-bold uppercase italic tracking-tighter">Equipe: {athlete.team_name}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-500">
                <Mail className="w-3 h-3" />
                <span className="text-[10px] font-bold truncate">{athlete.email}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <Phone className="w-3 h-3" />
                <span className="text-[10px] font-bold">{athlete.phone || '--'}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/50 flex flex-col gap-3">
               <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (onPeriodize) onPeriodize(athlete);
                }}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl text-[9px] font-black text-white uppercase tracking-widest italic shadow-lg shadow-amber-500/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group/btn"
               >
                 <Target className="w-3 h-3 group-hover/btn:rotate-45 transition-transform" />
                 Periodizar Elite
               </button>
               
               <div className="flex justify-between items-center px-1">
                 <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">Acessar Prontuário</span>
                 <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
               </div>
            </div>
          </motion.div>
        ))}

        {filteredAthletes.length === 0 && (
          <div className="col-span-full py-20 text-center bento-card bg-slate-900/20 border-dashed border-slate-800">
            <User className="w-12 h-12 text-slate-800 mx-auto mb-4" />
            <p className="text-[10px] font-black text-slate-600 uppercase italic">Nenhum atleta encontrado para "{searchTerm}"</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedAthlete && (
          <AthleteProfileModal 
            athlete={selectedAthlete} 
            onClose={() => setSelectedAthlete(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AthleteProfileModal({ athlete, onClose }: { athlete: any, onClose: () => void }) {
  const [selectedMetric, setSelectedMetric] = useState<'series' | 'reps' | 'kilagem' | 'kilometragem'>('kilagem');
  const [selectedPeriod, setSelectedPeriod] = useState<'diário' | 'semanal' | 'quinzenal' | 'mensal' | 'anual'>('semanal');
  const [sessions, setSessions] = useState<any[]>([]);
  
  const [teamName, setTeamName] = useState(athlete.team_name || '');
  const [isUpdatingTeam, setIsUpdatingTeam] = useState(false);
  const [isInjured, setIsInjured] = useState(athlete.is_injured || false);
  const [injuryDesc, setInjuryDesc] = useState(athlete.injury_description || '');
  const [isUpdatingDM, setIsUpdatingDM] = useState(false);
  const [wellnessData, setWellnessData] = useState<any[]>([]);

  useEffect(() => {
    async function loadSessions() {
      const allSessions = await getSessions();
      const athleteSessions = allSessions.filter((s: any) => s.athlete_id === athlete.id);
      setSessions(athleteSessions);

      const allWellness = await getWellness();
      const athleteWellness = allWellness.filter((w: any) => w.athlete_id === athlete.id);
      setWellnessData(athleteWellness);
    }
    loadSessions();
  }, [athlete.id]);

  const riskReport = useMemo(() => {
    const acwrData = calculateACWR(sessions);
    const acwr = acwrData.ratio;
    const monotony = calculateMonotony(sessions);
    
    const sortedSessions = [...sessions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const last7Sessions = sortedSessions.slice(0,7);
    const weeklyLoad = last7Sessions.reduce((acc, s) => acc + (s.load || (s.rpe * s.duration) || 0), 0);
    const strain = weeklyLoad * monotony;

    const avgRpe = last7Sessions.length > 0 ? last7Sessions.reduce((acc, s) => acc + (s.rpe || 6), 0) / last7Sessions.length : 6;
    
    const sortedWellness = [...wellnessData].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const last7Wellness = sortedWellness.slice(0,7);
    const avgWellnessValue = last7Wellness.length > 0 
      ? last7Wellness.reduce((acc, w) => acc + ((w.sleep + w.stress + w.fatigue + w.soreness) / 4), 0) / last7Wellness.length 
      : 5;

    // Simplificação temporária de performance drop
    const performanceDrop = false;

    return calculateRiskScore(acwr, monotony, strain, avgRpe, avgWellnessValue, performanceDrop);
  }, [sessions, wellnessData]);

  const handleSaveDM = async () => {
    if (!supabase) return;
    setIsUpdatingDM(true);
    const { error } = await supabase
      .from('profiles')
      .update({ is_injured: isInjured, injury_description: injuryDesc })
      .eq('id', athlete.id);
    
    if (!error) {
      athlete.is_injured = isInjured;
      athlete.injury_description = injuryDesc;
      alert('Status médico atualizado com sucesso!');
    } else {
      alert('Erro ao atualizar status médico: ' + error.message);
    }
    setIsUpdatingDM(false);
  };

  const handleSaveTeam = async () => {
    if (!supabase) return;
    setIsUpdatingTeam(true);
    const { error } = await supabase
      .from('profiles')
      .update({ team_name: teamName })
      .eq('id', athlete.id);
    
    if (!error) {
      athlete.team_name = teamName;
      alert('Equipe atualizada com sucesso!');
    } else {
      alert('Erro ao atualizar equipe: ' + error.message);
    }
    setIsUpdatingTeam(false);
  };

  const metricValue = useMemo(() => {
    const now = startOfDay(new Date());
    let startDate: Date;

    switch (selectedPeriod) {
      case 'diário': startDate = now; break;
      case 'semanal': startDate = startOfWeek(now, { weekStartsOn: 1 }); break;
      case 'quinzenal': startDate = subDays(now, 14); break;
      case 'mensal': startDate = startOfMonth(now); break;
      case 'anual': startDate = startOfYear(now); break;
      default: startDate = now;
    }

    return sessions
      .filter(s => isAfter(startOfDay(parseISO(s.date)), startDate) || isSameDay(parseISO(s.date), startDate))
      .reduce((acc, s) => {
        if (selectedMetric === 'kilagem') return acc + (s.volume || 0);
        if (selectedMetric === 'kilometragem') return acc + (s.distance || 0);
        if (selectedMetric === 'series') return acc + (s.series || 0);
        if (selectedMetric === 'reps') return acc + (s.reps || 0);
        return acc;
      }, 0);
  }, [sessions, selectedMetric, selectedPeriod]);

  const age = athlete.birth_date ? Math.floor((new Date().getTime() - new Date(athlete.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : '--';

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 h-full max-h-[90vh] overflow-y-auto">
          {/* Sidebar - Photo & Basic Info */}
          <div className="lg:col-span-4 bg-slate-950/50 p-10 flex flex-col items-center text-center border-r border-slate-800">
            <div className="w-48 h-48 rounded-[2rem] overflow-hidden bg-slate-900 border-2 border-cyan-500/20 mb-8 relative group shadow-2xl">
              {athlete.photo_url ? (
                <img src={athlete.photo_url} alt={athlete.full_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <User className="w-16 h-16 text-slate-800" />
                  <span className="text-[8px] font-black text-slate-700 uppercase italic">Foto não disponível</span>
                </div>
              )}
            </div>
            
            <h3 className="text-2xl font-black text-white uppercase italic mb-2">{athlete.full_name}</h3>
            
            <div className="w-full space-y-4 mb-6">
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Equipe Atual</span>
                {athlete.team_name ? (
                  <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-black text-emerald-400 uppercase italic">
                    {athlete.team_name}
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-slate-500 uppercase italic">Sem equipe definida</span>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800/50 w-full">
                <p className="text-[8px] font-black text-slate-500 uppercase mb-2">Vincular a Equipe</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Nome da equipe..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-[10px] text-white outline-none focus:border-cyan-500"
                  />
                  <button 
                    onClick={handleSaveTeam}
                    disabled={isUpdatingTeam}
                    className="bg-cyan-600 hover:bg-cyan-500 p-2 rounded-lg text-white transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <span className="px-4 py-1.5 bg-cyan-600/10 border border-cyan-500/20 rounded-full text-cyan-400 text-[10px] font-black uppercase italic tracking-widest">
              {athlete.sport || 'Esporte não definido'}
            </span>

            <div className="w-full mt-10 space-y-4 pt-8 border-t border-slate-800/50">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-600 uppercase">Status Clínico</span>
                  <button 
                    onClick={() => setIsInjured(!isInjured)}
                    className={`text-[9px] font-black uppercase italic px-3 py-1 rounded transition-colors ${isInjured ? 'bg-red-500/10 border border-red-500/20 text-red-500' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'}`}
                  >
                    {isInjured ? 'Em Reabilitação (DM)' : 'Ativo'}
                  </button>
                </div>
                {isInjured && (
                  <div className="flex flex-col gap-2 mt-2 animate-in fade-in zoom-in-95">
                    <input 
                      type="text" 
                      value={injuryDesc}
                      onChange={(e) => setInjuryDesc(e.target.value)}
                      placeholder="Diagnóstico / Fase RTP..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-[10px] font-bold text-red-400 outline-none focus:border-red-500/50"
                    />
                    <button 
                      onClick={handleSaveDM}
                      disabled={isUpdatingDM}
                      className="w-full py-2 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                    >
                      Salvar Prontuário Médico
                    </button>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-600 uppercase">Idade</span>
                <span className="text-[9px] font-black text-white italic">{age} Anos</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-600 uppercase">Sexo</span>
                <span className="text-[9px] font-black text-white italic uppercase">{athlete.gender === 'male' ? 'Masculino' : athlete.gender === 'female' ? 'Feminino' : '--'}</span>
              </div>
            </div>
          </div>

          {/* Main Content - Prontuário */}
          <div className="lg:col-span-8 p-10 space-y-10">
            {/* Risk Score Widget */}
            <div className={`p-8 rounded-[2rem] border relative overflow-hidden transition-all duration-500 ${
              riskReport.classification === 'Crítico' ? 'bg-red-950/40 border-red-500/50 shadow-[0_0_50px_-12px_rgba(239,68,68,0.4)]' :
              riskReport.classification === 'Alto' ? 'bg-orange-950/40 border-orange-500/50' :
              riskReport.classification === 'Moderado' ? 'bg-yellow-950/40 border-yellow-500/50' :
              'bg-emerald-950/40 border-emerald-500/50'
            }`}>
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <AlertTriangle className={`w-32 h-32 ${
                  riskReport.classification === 'Crítico' ? 'text-red-500' :
                  riskReport.classification === 'Alto' ? 'text-orange-500' :
                  riskReport.classification === 'Moderado' ? 'text-yellow-500' :
                  'text-emerald-500'
                }`} />
              </div>
              
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Activity className={`w-6 h-6 ${
                      riskReport.classification === 'Crítico' ? 'text-red-400' :
                      riskReport.classification === 'Alto' ? 'text-orange-400' :
                      riskReport.classification === 'Moderado' ? 'text-yellow-400' :
                      'text-emerald-400'
                    }`} />
                    <h4 className="text-xl font-black text-white uppercase italic tracking-widest">Injury Risk Score</h4>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-sm">
                    Motor de Inteligência Artificial para prevenção preditiva de lesões baseado em carga e prontidão.
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className={`text-5xl font-black italic tracking-tighter ${
                      riskReport.classification === 'Crítico' ? 'text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]' :
                      riskReport.classification === 'Alto' ? 'text-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]' :
                      riskReport.classification === 'Moderado' ? 'text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]' :
                      'text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                    }`}>
                      {riskReport.score}
                      <span className="text-2xl text-white/50">/100</span>
                    </p>
                    <span className={`px-4 py-1 mt-2 inline-block rounded-full text-[11px] font-black uppercase tracking-widest text-white border ${
                      riskReport.classification === 'Crítico' ? 'bg-red-600 border-red-500 animate-pulse' :
                      riskReport.classification === 'Alto' ? 'bg-orange-600 border-orange-500' :
                      riskReport.classification === 'Moderado' ? 'bg-yellow-600 border-yellow-500' :
                      'bg-emerald-600 border-emerald-500'
                    }`}>
                      {riskReport.classification}
                    </span>
                  </div>
                </div>
              </div>

              {/* Alerts & Suggestions AI Output */}
              {(riskReport.alerts.length > 0 || riskReport.suggestions.length > 0) && (
                <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                  {riskReport.alerts.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alertas do Sistema</p>
                      {riskReport.alerts.map((alert, idx) => (
                        <div key={idx} className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <p className="text-xs font-bold text-red-200">{alert}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {riskReport.suggestions.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conduta Sugerida (AI)</p>
                      {riskReport.suggestions.map((sug, idx) => (
                        <div key={idx} className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl">
                          <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                          <p className="text-xs font-bold text-blue-200">{sug}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Análise de Desempenho */}
            <div className="bg-slate-950/40 border border-slate-800/50 rounded-[2rem] p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                  </div>
                  <h4 className="text-sm font-black text-white uppercase italic tracking-widest">Análise de Desempenho</h4>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Métrica</label>
                  <select 
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-all cursor-pointer"
                  >
                    <option value="series">Séries</option>
                    <option value="reps">Repetições</option>
                    <option value="kilagem">Tonelagem (Volume)</option>
                    <option value="kilometragem">Kilometragem</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Período</label>
                  <select 
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-all cursor-pointer"
                  >
                    <option value="diário">Diário</option>
                    <option value="semanal">Semanal</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-2xl p-6 flex items-center justify-between border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                   <Activity className="w-20 h-20 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Total Acumulado</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-4xl font-black text-blue-400 italic">
                      {metricValue.toLocaleString('pt-BR')}
                    </h3>
                    <span className="text-xs font-black text-slate-600 uppercase italic">
                      {selectedMetric === 'kilagem' ? 'kg' : selectedMetric === 'kilometragem' ? 'km' : selectedMetric === 'series' ? 'séries' : 'reps'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic">Dados do Sistema WMPS</p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-6">
                <Activity className="w-5 h-5 text-cyan-400" />
                <h4 className="text-sm font-black text-white uppercase italic tracking-widest">Prontuário de Identificação</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <InfoItem label="Email de Acesso" value={athlete.email} icon={<Mail className="w-3.5 h-3.5" />} />
                <InfoItem label="Telefone de Contato" value={athlete.phone || '--'} icon={<Phone className="w-3.5 h-3.5" />} />
                <InfoItem label="Data de Nascimento" value={athlete.birth_date ? format(parseISO(athlete.birth_date), 'dd/MM/yyyy') : '--'} icon={<CalendarIcon className="w-3.5 h-3.5" />} />
                <InfoItem label="Objetivo Principal" value={athlete.goal || '--'} icon={<Target className="w-3.5 h-3.5" />} />
              </div>
            </div>

            {athlete.is_minor && (
              <div className="p-8 bg-amber-500/5 border border-amber-500/20 rounded-3xl animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-1.5 bg-amber-500/20 rounded-lg">
                    <Users className="w-4 h-4 text-amber-500" />
                  </div>
                  <h4 className="text-[11px] font-black text-amber-500 uppercase italic tracking-widest">Responsável Legal (Atleta Menor)</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <InfoItem label="Nome do Responsável" value={athlete.guardian_name || '--'} light />
                  <InfoItem label="Grau de Parentesco" value={athlete.guardian_relationship || '--'} light />
                  <InfoItem label="Telefone do Responsável" value={athlete.guardian_phone || '--'} icon={<Phone className="w-3.5 h-3.5" />} light />
                  <InfoItem label="CPF" value={athlete.guardian_cpf || '--'} light />
                </div>
              </div>
            )}

            <div className="pt-8 border-t border-slate-800">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MiniStat label="Altura" value={athlete.height ? `${athlete.height}cm` : '--'} />
                <MiniStat label="Peso" value={athlete.weight ? `${athlete.weight}kg` : '--'} />
                <MiniStat label="Nível" value={athlete.experience_level || '--'} />
                <MiniStat label="Cadastro" value={athlete.created_at ? format(parseISO(athlete.created_at), 'dd/MM/yy') : '--'} />
              </div>
            </div>

            <div className="flex justify-end pt-6">
               <button 
                onClick={onClose}
                className="px-8 py-3 bg-slate-800 border border-slate-700 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-slate-700 transition-all"
               >
                 Fechar Prontuário
               </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function InfoItem({ label, value, icon, light = false }: { label: string, value: string, icon?: React.ReactNode, light?: boolean }) {
  return (
    <div className="space-y-2">
      <p className={`text-[9px] font-black uppercase tracking-[0.1em] ${light ? 'text-amber-500/60' : 'text-slate-500'}`}>{label}</p>
      <div className="flex items-center gap-2.5">
        {icon && <div className="text-cyan-500/50">{icon}</div>}
        <span className="text-sm font-bold text-white tracking-tight">{value}</span>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string, value: string }) {
  return (
    <div className="bg-slate-950/40 border border-slate-800/50 p-4 rounded-2xl">
      <p className="text-[8px] font-black text-slate-600 uppercase mb-1">{label}</p>
      <p className="text-xs font-black text-white italic">{value}</p>
    </div>
  );
}

function TeamsModule() {
  const [athletes, setAthletes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAthlete, setSelectedAthlete] = useState<any>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const data = await getAthletes();
      setAthletes(data);
      setLoading(false);
    }
    load();
  }, []);

  const teams = useMemo(() => {
    const groups: Record<string, any[]> = {};
    athletes.forEach(a => {
      if (!a.team_name) return; // Ignorar atletas sem equipe
      const team = a.team_name;
      if (!groups[team]) groups[team] = [];
      groups[team].push(a);
    });
    return groups;
  }, [athletes]);

  if (loading) return (
    <div className="py-20 flex flex-col items-center justify-center text-center">
      <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">Organizando Elencos...</p>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/50 p-8 rounded-[2rem] border border-slate-800">
        <div>
          <h2 className="text-3xl font-black text-white uppercase italic">Gestão de Equipes</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Total de {Object.keys(teams).length} grupos identificados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {Object.entries(teams).map(([teamName, teamAthletes]) => (
          <div 
            key={teamName}
            className="group bento-card bg-slate-900 border-slate-800 hover:border-emerald-500/30 transition-all p-8 flex flex-col h-full"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-lg font-black text-white uppercase italic tracking-tight truncate max-w-[180px]">
                  {teamName}
                </h3>
              </div>
              <span className="bg-slate-800 px-3 py-1 rounded-full text-[10px] font-black text-slate-400 uppercase italic">
                {teamAthletes.length} Atletas
              </span>
            </div>

            <div className="flex-1 space-y-3 mb-8 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
              {teamAthletes.map(athlete => (
                <button
                  key={athlete.id}
                  onClick={() => setSelectedAthlete(athlete)}
                  className="w-full flex items-center justify-between p-3 bg-slate-950/50 border border-slate-800 hover:border-emerald-500/40 rounded-xl group/item transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-900 border border-slate-800">
                      {athlete.photo_url ? (
                        <img src={athlete.photo_url} alt={athlete.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><User className="w-4 h-4 text-slate-700" /></div>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black text-white uppercase italic group-hover/item:text-emerald-400 transition-colors">{athlete.full_name}</p>
                      <p className="text-[8px] font-bold text-slate-600 uppercase">{athlete.sport || 'Esporte N/A'}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-800 group-hover/item:text-emerald-500 group-hover/item:translate-x-1 transition-all" />
                </button>
              ))}
            </div>

            <div className="mt-auto pt-6 border-t border-slate-800/50 flex flex-col gap-4">
               <div className="flex gap-2">
                 {teamAthletes.slice(0, 5).map((a, i) => (
                   <div key={i} className="w-6 h-6 rounded-full border border-slate-900 bg-slate-800 overflow-hidden -ml-2 first:ml-0">
                      {a.photo_url ? <img src={a.photo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-slate-900"><User className="w-3 h-3 text-slate-700" /></div>}
                   </div>
                 ))}
                 {teamAthletes.length > 5 && (
                   <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-900 flex items-center justify-center text-[8px] font-black text-slate-500 -ml-2">
                     +{teamAthletes.length - 5}
                   </div>
                 )}
               </div>

               <button 
                onClick={() => setSelectedTeam(teamName)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-[9px] font-black text-white uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20"
               >
                 Gerenciar Equipe
               </button>
            </div>
          </div>
        ))}

        {Object.keys(teams).length === 0 && (
          <div className="col-span-full py-32 text-center bento-card bg-slate-900/20 border-dashed border-slate-800">
            <Users className="w-16 h-16 text-slate-800 mx-auto mb-6" />
            <p className="text-xs font-black text-slate-600 uppercase italic tracking-widest">Nenhuma equipe ou atleta encontrado no sistema.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedAthlete && (
          <AthleteProfileModal 
            athlete={selectedAthlete} 
            onClose={() => setSelectedAthlete(null)} 
          />
        )}
        {selectedTeam && (
          <TeamDetailsModal 
            teamName={selectedTeam} 
            teamAthletes={teams[selectedTeam]} 
            allAthletes={athletes}
            onClose={() => setSelectedTeam(null)}
            onUpdate={() => {
              // Refresh athletes
              getAthletes().then(setAthletes);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TeamDetailsModal({ teamName, teamAthletes, allAthletes, onClose, onUpdate }: { 
  teamName: string, 
  teamAthletes: any[], 
  allAthletes: any[],
  onClose: () => void,
  onUpdate: () => void
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const athletesWithoutTeam = allAthletes.filter(a => !a.team_name);

  const handleRemove = async (athleteId: string) => {
    if (!supabase) return;
    setIsUpdating(true);
    const { error } = await supabase
      .from('profiles')
      .update({ team_name: null })
      .eq('id', athleteId);
    
    if (!error) {
      onUpdate();
    } else {
      alert('Erro ao remover: ' + error.message);
    }
    setIsUpdating(false);
  };

  const handleAdd = async (athleteId: string) => {
    if (!supabase) return;
    setIsUpdating(true);
    const { error } = await supabase
      .from('profiles')
      .update({ team_name: teamName })
      .eq('id', athleteId);
    
    if (!error) {
      onUpdate();
    } else {
      alert('Erro ao adicionar: ' + error.message);
    }
    setIsUpdating(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 30 }}
        className="bg-slate-900 border border-slate-800 w-full max-w-5xl rounded-[3rem] overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
              <Users className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white uppercase italic">{teamName}</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Gestão de Elenco e Atletas</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl text-slate-400 hover:text-white transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 overflow-hidden">
          {/* List of current team athletes */}
          <div className="p-8 border-r border-slate-800 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xs font-black text-emerald-400 uppercase italic tracking-widest">Atletas na Equipe ({teamAthletes.length})</h4>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {teamAthletes.map(a => (
                <div key={a.id} className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-800">
                      {a.photo_url ? <img src={a.photo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-slate-900"><User className="w-5 h-5 text-slate-800" /></div>}
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-white uppercase italic">{a.full_name}</p>
                      <p className="text-[9px] font-bold text-slate-600 uppercase">{a.sport || 'Esporte N/A'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemove(a.id)}
                    disabled={isUpdating}
                    className="p-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {teamAthletes.length === 0 && (
                <p className="text-center py-10 text-[10px] font-black text-slate-700 uppercase italic">Nenhum atleta nesta equipe</p>
              )}
            </div>
          </div>

          {/* List of athletes without a team */}
          <div className="p-8 bg-slate-950/20 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xs font-black text-blue-400 uppercase italic tracking-widest">Adicionar Atletas ({athletesWithoutTeam.length})</h4>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {athletesWithoutTeam.map(a => (
                <div key={a.id} className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800/50 rounded-2xl group hover:border-blue-500/30 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-800">
                      {a.photo_url ? <img src={a.photo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-slate-900"><User className="w-5 h-5 text-slate-800" /></div>}
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-white uppercase italic">{a.full_name}</p>
                      <p className="text-[9px] font-bold text-slate-600 uppercase">{a.sport || 'Esporte N/A'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleAdd(a.id)}
                    disabled={isUpdating}
                    className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-all disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {athletesWithoutTeam.length === 0 && (
                <p className="text-center py-10 text-[10px] font-black text-slate-700 uppercase italic">Todos os atletas já possuem equipe</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-10 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest transition-all"
          >
            Fechar Gestão
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ForceManifestationsModule({ onBack }: { onBack: () => void }) {
  const [filter, setFilter] = useState<'all' | 'neural' | 'metabolic' | 'mechanical'>('all');
  const [selectedZone, setSelectedZone] = useState<number | null>(null);

  const manifestations = [
    // FORÇA NEURAL
    {
      id: 'max-force',
      category: 'neural',
      title: 'Força Máxima',
      definition: 'A maior força que o sistema neuromuscular pode exercer em uma contração voluntária máxima.',
      physiologicalGoal: 'Recrutamento de unidades motoras e coordenação intramuscular.',
      intensity: '85-100% 1RM',
      zone: 5,
      examples: 'Agachamento 1-3 RM, Levantamento Terra pesado.',
      indication: 'Atletas de alto rendimento, powerlifting, base para potência.',
      color: 'bg-red-600',
      icon: <Dumbbell className="w-5 h-5" />
    },
    {
      id: 'explosive-force',
      category: 'neural',
      title: 'Força Explosiva',
      definition: 'Capacidade de produzir a maior tensão possível no menor tempo (Taxa de Desenvolvimento de Força - RFD).',
      physiologicalGoal: 'Sincronização de unidades motoras de contração rápida.',
      intensity: '30-60% 1RM (Alta Velocidade)',
      zone: 5,
      examples: 'Saltos, Arremessos, Levantamento Olímpico.',
      indication: 'Esportes de explosão (sprint, saltos), esportes de combate.',
      color: 'bg-orange-600',
      icon: <Zap className="w-5 h-5" />
    },
    {
      id: 'power',
      category: 'neural',
      title: 'Potência',
      definition: 'Produto da força pela velocidade. Capacidade de realizar trabalho no menor tempo.',
      physiologicalGoal: 'Otimização da curva força-velocidade.',
      intensity: '30-70% 1RM',
      zone: 4,
      examples: 'Clean & Jerk, Pliometria de alta intensidade.',
      indication: 'Futebol, Basquete, Vôlei (mudanças de direção e saltos).',
      color: 'bg-yellow-600',
      icon: <Zap className="w-5 h-5" />
    },
    {
      id: 'fast-force',
      category: 'neural',
      title: 'Força Rápida',
      definition: 'Capacidade de vencer resistências com alta velocidade de contração.',
      physiologicalGoal: 'Melhora da velocidade de execução sob carga moderada.',
      intensity: '40-70% 1RM',
      zone: 4,
      examples: 'Sprints com carga, movimentos balísticos.',
      indication: 'Esportes coletivos e provas de atletismo.',
      color: 'bg-amber-600',
      icon: <Activity className="w-5 h-5" />
    },

    // FORÇA METABÓLICA
    {
      id: 'resistance-aerobic',
      category: 'metabolic',
      title: 'Resistência de Força Aeróbica',
      definition: 'Capacidade de manter a produção de força por longos períodos sob predominância aeróbica.',
      physiologicalGoal: 'Aumento da densidade mitocondrial e eficiência oxidativa.',
      intensity: '< 50% 1RM',
      zone: 2,
      examples: 'Método Contínuo Extensivo (>20 min, <50% 1RM), séries longas multiarticulares (>3 min por série).',
      indication: 'Atletas de resistência aeróbica (triatlo, ciclismo de longa distância, corrida de fundo).',
      color: 'bg-emerald-600',
      icon: <Timer className="w-5 h-5" />
    },
    {
      id: 'resistance-anaerobic',
      category: 'metabolic',
      title: 'Resistência de Força Anaeróbica',
      definition: 'Capacidade de manter alta intensidade de força sob acúmulo de metabólitos.',
      physiologicalGoal: 'Tolerância ao lactato e capacidade de tamponamento.',
      intensity: '50-70% 1RM',
      zone: 3,
      examples: 'Séries de 15-25 reps com alta densidade esforço:pausa (1:1), métodos de tolerância ao lactato.',
      indication: 'Remo, Lutas (MMA/Jiu-Jitsu), 400m rasos.',
      color: 'bg-blue-600',
      icon: <Zap className="w-5 h-5" />
    },

    // FORÇA MECÂNICA
    {
      id: 'isometric',
      category: 'mechanical',
      title: 'Força Isométrica',
      definition: 'Contração sem alteração no comprimento do músculo ou ângulo articular.',
      physiologicalGoal: 'Estabilidade articular e fortalecimento em ângulos específicos.',
      intensity: 'Variável (conforme tempo)',
      zone: 3,
      examples: 'Prancha, agachamento estático (wall sit).',
      indication: 'Reabilitação, escalada, ginástica artística.',
      color: 'bg-slate-600',
      icon: <MoveHorizontal className="w-5 h-5" />
    },
    {
      id: 'eccentric',
      category: 'mechanical',
      title: 'Força Excêntrica',
      definition: 'Capacidade de produzir tensão enquanto o músculo se alonga (fase de frenagem).',
      physiologicalGoal: 'Dano tecidual controlado e síntese de colágeno (tendões).',
      intensity: '80-120% 1RM',
      zone: 5,
      examples: 'Nórdico, descida controlada no supino com sobrecarga.',
      indication: 'Prevenção de lesões, hipertrofia sarcoplasmática.',
      color: 'bg-rose-600',
      icon: <Scale className="w-5 h-5" />
    },
    {
      id: 'concentric',
      category: 'mechanical',
      title: 'Força Concêntrica',
      definition: 'Produção de tensão enquanto o músculo encurta.',
      physiologicalGoal: 'Trabalho mecânico positivo e hipertrofia.',
      intensity: '30-100% 1RM',
      zone: 4,
      examples: 'Subida do agachamento, fase de puxada.',
      indication: 'Base do treinamento de força convencional.',
      color: 'bg-indigo-600',
      icon: <Dumbbell className="w-5 h-5" />
    },
    {
      id: 'reactive',
      category: 'mechanical',
      title: 'Força Reativa',
      definition: 'Capacidade de utilizar a energia elástica (Ciclo Alongamento-Encurtamento - CEA).',
      physiologicalGoal: 'Eficiência mecânica e rigidez tendínea (stiffness).',
      intensity: 'Alta Velocidade / Baixo Contato',
      zone: 5,
      examples: 'Pliometria, Drop Jumps, Pulos de corda rápidos.',
      indication: 'Basquete, Atletismo, Futebol (agilidade e impulsão).',
      color: 'bg-cyan-600',
      icon: <Footprints className="w-5 h-5" />
    },
    {
      id: 'relative-force',
      category: 'mechanical',
      title: 'Força Relativa',
      definition: 'Força máxima dividida pelo peso corporal do indivíduo.',
      physiologicalGoal: 'Otimização da potência-peso.',
      intensity: 'Foco em força neural',
      zone: 4,
      examples: 'Barra fixa, flexão de braço com carga.',
      indication: 'Ginastas, lutadores com divisão de peso, escaladores.',
      color: 'bg-violet-600',
      icon: <Activity className="w-5 h-5" />
    },
    {
      id: 'absolute-force',
      category: 'mechanical',
      title: 'Força Absoluta',
      definition: 'Capacidade máxima de força independente do peso corporal.',
      physiologicalGoal: 'Capacidade bruta de tensão muscular.',
      intensity: 'Máxima',
      zone: 5,
      examples: 'Strongman, Levantamento Terra 1RM.',
      indication: 'Lançadores de peso, Linha ofensiva (futebol americano).',
      color: 'bg-stone-600',
      icon: <Dumbbell className="w-5 h-5" />
    }
  ];

  const zones = [
    { id: 1, label: 'Zona 1', title: 'Muito Leve', desc: 'Recuperação Ativa', color: 'bg-slate-400' },
    { id: 2, label: 'Zona 2', title: 'Leve', desc: 'Base Aeróbica', color: 'bg-emerald-500' },
    { id: 3, label: 'Zona 3', title: 'Moderada', desc: 'Hipertrofia / Resistência', color: 'bg-blue-500' },
    { id: 4, label: 'Zona 4', title: 'Alta', desc: 'Potência / Força Rápida', color: 'bg-orange-500' },
    { id: 5, label: 'Zona 5', title: 'Máxima', desc: 'Força Pura / Explosão', color: 'bg-red-600' }
  ];

  const filteredManifestations = manifestations.filter(m => {
    const categoryMatch = filter === 'all' || m.category === filter;
    const zoneMatch = selectedZone === null || m.zone === selectedZone;
    return categoryMatch && zoneMatch;
  });

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all group mb-4"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Voltar ao Menu
          </button>
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Manifestações de Força</h2>
          <p className="text-slate-500 text-sm font-bold uppercase italic mt-1">Organização Técnica e Aplicação Prática WMPS</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => { setFilter('all'); setSelectedZone(null); }}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filter === 'all' && selectedZone === null ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            Todos
          </button>
          <button 
            onClick={() => setFilter('neural')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filter === 'neural' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            Neural
          </button>
          <button 
            onClick={() => setFilter('metabolic')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filter === 'metabolic' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            Metabólica
          </button>
          <button 
            onClick={() => setFilter('mechanical')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filter === 'mechanical' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            Mecânica
          </button>
        </div>
      </div>

      {/* Training Zones Dashboard */}
      <div className="bento-card bg-slate-900 border-slate-800 p-8 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <TrendingUp className="w-32 h-32 text-blue-500" />
        </div>
        <div className="relative z-10">
          <div className="mb-8">
            <p className="label-caps italic mb-1">Prescrição</p>
            <h3 className="text-2xl font-black text-white uppercase italic">Zonas de Treinamento e Intensidade</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {zones.map(z => (
              <button 
                key={z.id}
                onClick={() => setSelectedZone(selectedZone === z.id ? null : z.id)}
                className={`p-6 rounded-2xl border transition-all text-left group ${selectedZone === z.id ? 'bg-slate-800 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-800/30 border-slate-800 hover:border-slate-700'}`}
              >
                <div className={`w-8 h-1 rounded-full mb-4 ${z.color}`}></div>
                <h4 className="text-[10px] font-black text-white uppercase italic tracking-widest">{z.label}</h4>
                <p className="text-lg font-black text-white italic mt-1 leading-none">{z.title}</p>
                <p className="text-[9px] text-slate-500 font-bold uppercase mt-2">{z.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Manifestations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredManifestations.map((m, idx) => (
            <motion.div
              layout
              key={m.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: idx * 0.05 }}
              className="bento-card bg-slate-900 border-slate-800 hover:border-blue-500/30 transition-all flex flex-col group h-full"
            >
              <div className="p-8 space-y-6 flex-1">
                <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-xl ${m.color} text-white shadow-lg`}>
                    {m.icon}
                  </div>
                  <div className="flex flex-col items-end text-right">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic mb-1">{m.category}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded italic text-white ${zones.find(z => z.id === m.zone)?.color || 'bg-slate-700'}`}>
                      Zona {m.zone}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tighter group-hover:text-blue-400 transition-colors">{m.title}</h3>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-2">{m.definition}</p>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-800/50">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Objetivo Fisiológico</p>
                    <p className="text-[10px] text-slate-300 font-bold italic">{m.physiologicalGoal}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Intensidade</p>
                    <p className="text-[10px] text-white font-black italic">{m.intensity}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/30 p-6 rounded-b-[2rem] border-t border-slate-800/50 space-y-3">
                <div className="flex items-start gap-2">
                  <Dumbbell className="w-3 h-3 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-[8px] font-black text-slate-500 uppercase">Exemplos Práticos</p>
                    <p className="text-[10px] text-slate-400 font-bold italic">{m.examples}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Target className="w-3 h-3 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="text-[8px] font-black text-slate-500 uppercase">Indicação de Uso</p>
                    <p className="text-[10px] text-slate-400 font-bold italic">{m.indication}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Performance Graph Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bento-card bg-slate-900 border-slate-800 p-8">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic mb-6">Correlação Força-Velocidade</h4>
          <div className="h-[200px] flex items-end gap-2 relative">
             <div className="absolute left-0 bottom-0 top-0 w-px bg-slate-800"></div>
             <div className="absolute left-0 right-0 bottom-0 h-px bg-slate-800"></div>
             {/* Force Curve Representation */}
             <svg className="absolute inset-0 w-full h-full overflow-visible">
                <path 
                  d="M 10 20 Q 50 180 300 190" 
                  fill="none" 
                  stroke="url(#gradient-curve)" 
                  strokeWidth="4" 
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient-curve" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
             </svg>
             <div className="absolute left-4 top-4 text-[8px] font-black text-red-500 uppercase">Alta Força / Baixa Vel.</div>
             <div className="absolute right-4 bottom-4 text-[8px] font-black text-blue-500 uppercase">Baixa Força / Alta Vel.</div>
          </div>
          <div className="mt-4 flex justify-between text-[8px] font-black text-slate-600 uppercase tracking-widest italic">
            <span>Força Absoluta</span>
            <span>Potência</span>
            <span>Velocidade</span>
          </div>
        </div>

        <div className="bento-card bg-slate-900 border-slate-800 p-8 space-y-4">
           <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic mb-2">Resumo de Categorização</h4>
           <div className="space-y-4">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-orange-600/10 border border-orange-600/20 flex items-center justify-center text-orange-600 font-black italic">N</div>
                 <div>
                    <p className="text-[10px] font-black text-white uppercase italic">Força Neural</p>
                    <p className="text-[9px] text-slate-500 font-bold">Foco em sistema nervoso e coordenação motora.</p>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-600 font-black italic">M</div>
                 <div>
                    <p className="text-[10px] font-black text-white uppercase italic">Força Metabólica</p>
                    <p className="text-[9px] text-slate-500 font-bold">Foco em sistemas energéticos e tolerância à fadiga.</p>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-indigo-600 font-black italic">MC</div>
                 <div>
                    <p className="text-[10px] font-black text-white uppercase italic">Força Mecânica</p>
                    <p className="text-[9px] text-slate-500 font-bold">Foco em tipos de contração e vetores de força.</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

