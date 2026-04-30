'use client'

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
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
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getSessions, getWellness, getRegistrationRequests, getUserRole, getAnamnesis, getAthletes, saveTrainingPrescription, approveRegistration, getAthletePrescriptions, getAllPrescriptions } from '../actions';
import ForcePasswordReset from '../components/ForcePasswordReset';
import { Session, WellnessEntry } from '@/lib/db';
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
import { format, parseISO, eachDayOfInterval, isSameDay, differenceInDays } from 'date-fns';

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
  const [activeModule, setActiveModule] = useState<'menu' | 'dashboard' | 'assessment' | 'periodization' | 'prescription' | 'requests' | 'assessment_strength' | 'assessment_power' | 'assessment_endurance' | 'assessment_flexibility' | 'assessment_agility' | 'assessment_anthropometric' | 'assessment_anamnesis'>('menu');
  const [requests, setRequests] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
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
      
      // ACWR Logic
      const acuteSessions = athleteSessions.filter(s => differenceInDays(today, parseISO(s.date)) <= 7);
      const chronicSessions = athleteSessions.filter(s => differenceInDays(today, parseISO(s.date)) <= 28);
      
      const acuteLoad = acuteSessions.reduce((acc, curr) => acc + curr.load, 0);
      const chronicLoad = chronicSessions.reduce((acc, curr) => acc + curr.load, 0);
      
      const acuteAvg = acuteLoad / 7; // Average daily load in last 7 days
      const chronicAvg = chronicLoad / 28; // Average daily load in last 28 days
      
      const acwr = chronicAvg > 0 ? (acuteAvg / chronicAvg) : 0;
      
      // Performance (Avg RPE or Max Load in acute period)
      const avgRpe = acuteSessions.length > 0 
        ? acuteSessions.reduce((acc, curr) => acc + curr.rpe, 0) / acuteSessions.length 
        : 0;
      
      // Latest Wellness
      const latestWellness = athleteWellness[0]?.score ?? 75;
      
      // External Load Totals (Acute)
      const totalDistance = acuteSessions.reduce((acc, curr) => acc + (curr.distance || 0), 0);
      const totalVolume = acuteSessions.reduce((acc, curr) => acc + (curr.volume || 0), 0);

      return {
        name,
        acwr: Number(acwr.toFixed(2)),
        performance: Number(avgRpe.toFixed(1)),
        wellness: latestWellness,
        distance: totalDistance,
        volume: totalVolume,
        load: acuteLoad
      };
    });
  }, [sessions, wellness]);

  // Risk Alerts Analysis (Refined with ACWR)
  const riskAlerts = useMemo(() => {
    return athleteMetrics.map(metric => {
      let riskLevel: 'high' | 'medium' | 'low' = 'low';
      let message = 'Estável';

      if (metric.acwr > 1.5) {
        riskLevel = 'high';
        message = 'ACWR EXPLOSIVO';
      } else if (metric.acwr > 1.3 || metric.wellness < 50) {
        riskLevel = 'medium';
        message = 'ATENÇÃO CARGA';
      } else if (metric.acwr < 0.8 && metric.load > 0) {
        riskLevel = 'medium';
        message = 'UNDER-TRAINING';
      }

      return { 
        id: metric.name, 
        athlete_name: metric.name, 
        riskLevel, 
        message, 
        wellnessScore: metric.wellness,
        load: metric.load,
        acwr: metric.acwr
      };
    }).filter(a => a.riskLevel !== 'low').slice(0, 3);
  }, [athleteMetrics]);

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 font-sans pb-12">
      {user?.id && <ForcePasswordReset userId={user.id} />}
      <header className="flex flex-col sm:flex-row justify-between items-center p-6 px-10 gap-4">
        <div className="flex items-center gap-4">
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
            className="group flex items-center gap-2 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white p-2.5 rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col items-center gap-1">
            <Link href="/" className="bg-black text-emerald-500 border-2 border-emerald-500 font-black px-6 py-1 rounded-lg text-2xl italic skew-x-[-10deg] shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-transform hover:scale-105 active:scale-95">
              WMPS
            </Link>
            <div className="text-center">
              <h1 className="text-xs font-black leading-tight text-white uppercase italic tracking-[0.2em]">William Moreira</h1>
              <p className="text-[10px] text-emerald-500 uppercase tracking-[0.3em] font-black -mt-0.5">Performance System</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-slate-800/50 p-2 pl-4 rounded-xl border border-slate-700">
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">Ã rea do Professor</p>
            <p className="text-sm font-bold text-white">Monitoramento Ativo</p>
          </div>
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center font-black text-white italic">WM</div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 sm:px-10 py-4 space-y-8">
        
        {activeModule === 'menu' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-12">
            <MenuButton 
              title="Dashboard" 
              subtitle="Monitoramento de Carga" 
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
                  <div key={alert.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                     <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black text-white uppercase italic">{alert.athlete_name}</span>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                          alert.riskLevel === 'high' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-black'
                        }`}>
                          {alert.message}
                        </span>
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
          <StatCard title="Carga Média Equipe" value={`${teamStats.avgLoad} AU`} icon={<TrendingUp className="w-5 h-5 text-blue-400" />} color="bg-slate-900 border border-slate-800" />
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
                   <h3 className="text-xl font-black text-white uppercase italic">Comparativo vs Média da Equipe</h3>
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
                  <h3 className="text-xl font-black text-white uppercase italic">Índice de Hooper & Bem-Estar Geral</h3>
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
                <h3 className="text-sm font-black text-white uppercase italic tracking-widest">Resumo Semanal de Carga</h3>
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
                   <p className="label-caps italic">HistÃ Â³rico Recente</p>
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
            
            <StrengthAssessmentModule />
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
            
            <PowerAssessmentModule />
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
            
            <AnthropometricAssessmentModule />
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
            
            <EnduranceAssessmentModule />
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
            
            <AgilityAssessmentModule />
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
            
            <FlexibilityAssessmentModule />
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
            
            <PeriodizationModule />
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
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center border border-slate-700">
               <Info className="w-10 h-10 text-slate-500" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase italic">Módulo em Desenvolvimento</h3>
              <p className="text-slate-500 text-sm font-medium mt-2">Esta funcionalidade estarÃ¡ disponível em breve no WMPS.</p>
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

        {/* Footer/System Bar */}
        <div className="col-span-12 bento-card bg-slate-900/50 border-slate-800 flex items-center justify-between py-4 px-10">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                 <AlertTriangle className="w-4 h-4 text-orange-500" />
                 <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Monitoramento de Risco Ativo</span>
              </div>
              <div className="hidden sm:block h-4 w-px bg-slate-800"></div>
              <p className="hidden sm:block text-[10px] text-slate-600 font-bold italic">Classificação Hooper baseada em P, R, B, MB, OT.</p>
           </div>
           <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.1em] text-center sm:text-right">
             William Moreira Performance System V1.0 <span className="mx-2 text-slate-700 hidden sm:inline">|</span> <br className="sm:hidden" />
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

function StrengthAssessmentModule() {
  const [weight, setWeight] = useState<string>('');
  const [reps, setReps] = useState<string>('');
  const [formula, setFormula] = useState<'brzycki' | 'epley'>('brzycki');
  const [exercise, setExercise] = useState('Supino Reto');

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
              <label className="label-caps italic text-xs">ExercÃ­cio Avaliado</label>
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
                <label className="label-caps italic text-xs">Reps (MÃ¡x 10)</label>
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
                <span className="text-[10px] font-black text-blue-400 uppercase italic">ReferÃªncia CientÃ­fica</span>
              </div>
              <p className="text-[9px] text-blue-400/70 font-bold uppercase leading-relaxed">
                As equaÃ§Ãµes de prediÃ§Ã£o de 1RM sÃƒÃƒâ€šÃ‚Â£o recomendadas para atÃ© 10 repetições. Protocolos acimade 10 reps podem apresentar maior margem de erro.
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
                          ? 'Equação linear baseada na reduÃ§Ã£o percentual por repetiÃ§Ã£o. Amplamente utilizada em contextos clÃ­nicos e de saÃºde.' 
                          : 'Abordagem baseada no percentual de 1RM por repetiÃ§Ã£o (3% por rep). Preferida pela NSCA para atletas de forÃ§a.'}
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
             <IntensityZone label="Força Máxima" range="85-100%" reps="1-6" color="text-red-500" />
             <IntensityZone label="Hipertrofia" range="70-85%" reps="6-12" color="text-yellow-500" />
             <IntensityZone label="Resistência" range="50-70%" reps="15+" color="text-emerald-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PowerAssessmentModule() {
  const [testType, setTestType] = useState<'jump' | 'medball' | 'sprint' | 'horizontal_jump' | 'ssc_analytics' | 'rsi'>('jump');
  const [mass, setMass] = useState<string>('75');
  const [value, setValue] = useState<string>(''); // generic value
  const [sjHeight, setSjHeight] = useState<string>('');
  const [cmjHeight, setCmjHeight] = useState<string>('');
  const [contactTime, setContactTime] = useState<string>('');
  const [jumpHeightRsi, setJumpHeightRsi] = useState<string>('');

  const results = useMemo(() => {
    const m = parseFloat(mass);
    if (!m) return null;

    if (testType === 'jump') {
      const v = parseFloat(value);
      if (!v) return null;
      // Sayers Equation (Watts) - Peak Power
      const peakPower = (60.7 * v) + (45.3 * m) - 2055;
      const relativePower = peakPower / m;
      return { peakPower, relativePower, label: 'Potência de Pico (Vertical)', unit: 'W' };
    } else if (testType === 'horizontal_jump') {
      const v = parseFloat(value);
      if (!v) return null;
      // Power estimation from horizontal jump
      const distM = v / 100;
      const estPower = 2.21 * m * Math.sqrt(9.81 * distM);
      return { peakPower: estPower, relativePower: estPower / m, label: 'Potência Estimada (Horizontal)', unit: 'W' };
    } else if (testType === 'medball') {
      const v = parseFloat(value); // distance in meters
      if (!v) return null;
      // van den Tillaar & Ettema (2004): P = m_ball * g * d
      // The system uses a 3kg med ball as standard; relative power = W/kg body mass
      const ballMass = 3; // kg (standard med ball for upper body test)
      const estPower = ballMass * 9.81 * v;
      return { peakPower: estPower, relativePower: estPower / m, label: 'Potência Estimada (MS Ã¢Ã¢Ã¢â‚¬Å¡Ã‚Â¬Ã¢Ã¢â€šÂ¬Ã‚Â Med Ball 3kg)', unit: 'W' };
    } else if (testType === 'sprint') {
      const v = parseFloat(value);
      if (!v) return null;
      // Samozino et al. (2016): P_mean = 0.5 * m * (d/t)^2 / t
      const dist = 40;
      const v_avg = dist / v;
      const power = 0.5 * m * v_avg * v_avg / v;
      return { peakPower: power, relativePower: power / m, label: 'Potência AnaerÃ Â³bica (Sprint)', unit: 'W' };
    } else if (testType === 'ssc_analytics') {
      const sj = parseFloat(sjHeight);
      const cmj = parseFloat(cmjHeight);
      if (!sj || !cmj) return null;
      const eur = cmj / sj;
      const sscDiff = ((cmj - sj) / sj) * 100;
      return { 
        peakPower: eur, 
        relativePower: sscDiff, 
        label: 'AnÃ¡lise de Ciclo (SSC)', 
        isAnalytics: true,
        eur,
        sscDiff
      };
    } else if (testType === 'rsi') {
      const jh = parseFloat(jumpHeightRsi);
      const ct = parseFloat(contactTime);
      if (!jh || !ct) return null;
      const rsi = jh / ct;
      return { 
        peakPower: rsi, 
        relativePower: rsi, 
        label: 'ÃƒÃƒâ€šÃ‚Ândice de Força Reativa (RSI)', 
        isRsi: true,
        rsiValue: rsi
      };
    }
    return null;
  }, [testType, mass, value, sjHeight, cmjHeight, contactTime, jumpHeightRsi]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-4 space-y-6">
        <div className="bento-card bg-slate-900/50 border-slate-800 p-8">
          <div className="mb-8">
            <p className="label-caps italic mb-1">Avaliação BioenergÃ©tica</p>
            <h3 className="text-xl font-black text-white uppercase italic">Capacidade de Potência</h3>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="label-caps italic text-xs">Tipo de Teste</label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: 'jump', title: 'Salto Vertical (MIII)', subtitle: 'Sayers Equation' },
                  { id: 'horizontal_jump', title: 'Salto Horizontal', subtitle: 'Potência de ExplosÃƒÃƒâ€šÃ‚Â£o' },
                  { id: 'medball', title: 'MedBall Throw (MS)', subtitle: 'Membros Superiores' },
                  { id: 'sprint', title: 'Sprint 40m', subtitle: 'Protocolo AnaerÃ Â³bico' },
                  { id: 'ssc_analytics', title: 'AnÃ¡lise EUR & SSC%', subtitle: 'CMJ vs SJ Analytics' },
                  { id: 'rsi', title: 'ÃƒÃƒâ€šÃ‚Ândice Força Reativa', subtitle: 'RSI (Relação H/TC)' }
                ].map(t => (
                  <button 
                    key={t.id}
                    onClick={() => { setTestType(t.id as any); setValue(''); }}
                    className={`p-4 rounded-xl text-left border transition-all ${
                      testType === t.id ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-600/20' : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <div className="font-black text-white uppercase italic text-xs mb-1">{t.title}</div>
                    <div className={`text-[9px] font-bold uppercase ${testType === t.id ? 'text-white/70' : 'text-slate-500'}`}>{t.subtitle}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="space-y-2">
                <label className="label-caps italic text-xs">Massa Corporal (kg)</label>
                <input 
                  type="number"
                  value={mass}
                  onChange={(e) => setMass(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              {testType === 'ssc_analytics' ? (
                <>
                  <div className="space-y-2">
                    <label className="label-caps italic text-xs">Salto Squat Jump (SJ - cm)</label>
                    <input 
                      type="number"
                      placeholder="Sem contramovimento"
                      value={sjHeight}
                      onChange={(e) => setSjHeight(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="label-caps italic text-xs">Salto Countermovement (CMJ - cm)</label>
                    <input 
                      type="number"
                      placeholder="Com contramovimento"
                      value={cmjHeight}
                      onChange={(e) => setCmjHeight(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </>
              ) : testType === 'rsi' ? (
                <>
                  <div className="space-y-2">
                    <label className="label-caps italic text-xs">Altura do Salto (cm)</label>
                    <input 
                      type="number"
                      placeholder="H (cm)"
                      value={jumpHeightRsi}
                      onChange={(e) => setJumpHeightRsi(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="label-caps italic text-xs">Tempo de Contato (s)</label>
                    <input 
                      type="number"
                      step="0.001"
                      placeholder="TC (ms ou s)"
                      value={contactTime}
                      onChange={(e) => setContactTime(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <label className="label-caps italic text-xs">
                    {testType === 'jump' ? 'Altura do Salto (cm)' : testType === 'horizontal_jump' ? 'Distância do Salto (cm)' : testType === 'medball' ? 'Distância do LanÃ§amento (m)' : 'Tempo do Sprint 40m (s)'}
                  </label>
                  <input 
                    type="number"
                    placeholder="0"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-8 space-y-8">
        {results ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`bento-card border-none ${testType.includes('analytics') || testType === 'rsi' ? 'bg-purple-600' : 'bg-yellow-500'} p-8 flex flex-col justify-between relative overflow-hidden`}>
                <div className="relative z-10">
                  <p className={`text-[10px] font-black ${testType.includes('analytics') || testType === 'rsi' ? 'text-white/60' : 'text-black/60'} uppercase italic tracking-widest mb-2`}>{results.label}</p>
                  <h3 className={`text-5xl font-black ${testType.includes('analytics') || testType === 'rsi' ? 'text-white' : 'text-black'} italic`}>
                    {testType === 'ssc_analytics' ? results.eur?.toFixed(2) : testType === 'rsi' ? results.rsiValue?.toFixed(2) : Math.round(results.peakPower as number)}
                    <span className="text-xl ml-2 opacity-50 underline decoration-black/20">{testType === 'ssc_analytics' ? 'EUR' : testType === 'rsi' ? 'RSI' : 'W'}</span>
                  </h3>
                </div>
                <Zap className={`absolute -right-8 -bottom-8 w-48 h-48 opacity-10 rotate-12 ${testType.includes('analytics') || testType === 'rsi' ? 'text-white' : 'text-black'}`} />
                <div className="relative z-10 mt-6 flex gap-3">
                  <span className={`px-3 py-1 ${testType.includes('analytics') || testType === 'rsi' ? 'bg-white/10 text-white' : 'bg-black/10 text-black'} rounded-full text-[10px] font-black italic uppercase`}>
                    {testType === 'ssc_analytics' ? 'Taxa de Utilização' : testType === 'rsi' ? 'ÃƒÃƒâ€šÃ‚Ândice Reativo' : 'Potência Estimada'}
                  </span>
                </div>
              </div>

              <div className="bento-card border-none bg-slate-900 border-slate-800 p-8 flex flex-col justify-between relative overflow-hidden">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase italic tracking-widest mb-2">
                    {testType === 'ssc_analytics' ? 'DiferenÃ§a SSC%' : testType === 'rsi' ? 'H/TC Ratio' : 'Relativa por Massa'}
                  </p>
                  <h3 className="text-5xl font-black text-white italic">
                    {testType === 'ssc_analytics' ? `${results.sscDiff?.toFixed(1)}%` : testType === 'rsi' ? (results.rsiValue as number).toFixed(1) : (results.relativePower as number).toFixed(1)}
                    <span className="text-xl ml-2 opacity-30 italic">{testType === 'ssc_analytics' ? 'Diff' : testType === 'rsi' ? 'Index' : 'W/kg'}</span>
                  </h3>
                </div>
                <div className="mt-6">
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-1000" 
                      style={{ width: `${Math.min(((testType === 'ssc_analytics' ? results.sscDiff as number : results.relativePower as number) / 60) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[8px] font-black text-slate-600 uppercase">Base</span>
                    <span className="text-[8px] font-black text-slate-600 uppercase">Elite</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bento-card bg-slate-900 border-slate-800 p-8">
              <div className="mb-8">
                <p className="label-caps italic mb-1">AnÃ¡lise Normativa</p>
                <h3 className="text-xl font-black text-white uppercase italic">Classificação e Zonas</h3>
              </div>

              <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <PowerClassCard 
                      label="Explosão" 
                      value={testType === 'ssc_analytics' ? (results.sscDiff as number > 15 ? 'AltÃ­ssima' : 'Normal') : 'Avaliado'} 
                      icon={<Zap className="w-5 h-5" />} 
                    />
                    <PowerClassCard 
                      label="EficiÃªncia" 
                      value={testType === 'rsi' ? (results.rsiValue as number > 2.5 ? 'Excelente' : 'Bom') : 'Base'} 
                      icon={<Target className="w-5 h-5" />} 
                    />
                    <PowerClassCard label="ReferÃªncia" value={testType === 'ssc_analytics' ? 'Meta >1.10' : 'Norma ACSM'} icon={<Info className="w-5 h-5" />} />
                 </div>

                 <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-800">
                    <h4 className="text-[10px] font-black text-white uppercase italic mb-4">TransferÃªncia para o Treinamento</h4>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                      {testType === 'ssc_analytics' ? (
                        `O Ciclo Alongamento-Encurtamento (SSC) apresenta uma vantagem de ${results.sscDiff?.toFixed(1)}%. Um EUR acima de 1.10 indica boa utilização elÃ¡stica. 
                        Se estiver abaixo desse valor, priorize treinamentos de potÃªncia explosiva e saltos pliomÃ©tricos.`
                      ) : testType === 'rsi' ? (
                        `O Ãndice de Força Reativa de ${results.rsiValue?.toFixed(2)} indica a capacidade de transiÃ§Ã£o rÃ¡pida da ação excÃªntrica para a concÃªntrica. 
                        Valores acima de 2.0 sÃ£o tÃ­picos de atletas bem treinados em pliometria.`
                      ) : (
                        `Capacidade detectada para o teste de ${testType}. Os dados sugerem foco em ${results.relativePower as number < 40 ? 'Potência de Base' : 'Pliometria e Velocidade'}.`
                      )}
                    </p>
                 </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-slate-900/20 border border-dashed border-slate-800 rounded-[2rem]">
            <Zap className="w-12 h-12 text-slate-700 mb-4" />
            <h4 className="text-slate-500 font-black uppercase italic tracking-widest">Insira os dados para calcular</h4>
            <p className="text-slate-600 text-[10px] mt-2 max-w-[200px]">Utilize instrumentos validados (fita mÃ©trica ou cronÃ´metro) para maior precisÃ£o.</p>
          </div>
        )}
      </div>
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

function AnthropometricAssessmentModule() {
  const [weight, setWeight] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  
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
    let classification = "Normal";
    if (bodyFat) {
      if (gender === 'male') {
        // ACSM 11th ed. (2022) norms - Men
        if (bodyFat < 6) classification = "Mínimo Essencial";
        else if (bodyFat <= 13) classification = "Atleta/Excelente";
        else if (bodyFat <= 17) classification = "Fitness/Bom";
        else if (bodyFat <= 24) classification = "AceitÃ¡vel";
        else classification = "Obesidade/Risco";
      } else {
        // ACSM 11th ed. (2022) norms - Women
        if (bodyFat < 14) classification = "Mínimo Essencial";
        else if (bodyFat <= 20) classification = "Atleta/Excelente";
        else if (bodyFat <= 24) classification = "Fitness/Bom";
        else if (bodyFat <= 31) classification = "AceitÃ¡vel";
        else classification = "Obesidade/Risco";
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
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">GÃªnero</span>
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
             <InputField label="BraÃ§o" value="" set={() => {}} disabled />
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
             <InputField label="Supra-ilÃ­aca" value={suprailiac} set={setSuprailiac} />
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
                    <p className="text-[10px] font-black text-white/50 uppercase italic tracking-widest mb-2">ComposiÃ§Ã£o Corporal (%G)</p>
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
                         <p className="text-[9px] font-bold text-rose-500 uppercase">{results.imc < 25 ? "SaudÃ¡vel" : "Risco"}</p>
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
                      <p className="label-caps italic mb-1">CÃ¡lculo Diferencial</p>
                      <h3 className="text-xl font-black text-white uppercase italic">AnÃ¡lise de Protocolos ACSM</h3>
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
                      desc="SensÃ­vel ÃƒÃƒâ€šÃ‚Â  densidade Ã Â³ssea por faixa etÃ¡ria." 
                    />
                    <ProtocolSummary 
                      title="Slaughter (Jovens)" 
                      val={results.bodyFatSlaughter} 
                      desc="Equação padrÃƒÃƒâ€šÃ‚Â£o para fase de maturação." 
                    />
                 </div>
              </div>
            </>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-900/50 border border-dashed border-slate-800 rounded-[2rem] p-12 text-center group">
               <Scale className="w-16 h-16 text-slate-800 mb-6 group-hover:scale-110 transition-transform" />
               <h3 className="text-xl font-black text-slate-500 uppercase italic">Dados Pendentes</h3>
               <p className="text-slate-600 text-[10px] font-bold uppercase mt-2 max-w-[280px] leading-relaxed">
                  Insira o peso e as dobras cutÃ¢neas para desbloquear a anÃ¡lise detalhada de composiÃ§Ã£o corporal.
               </p>
            </div>
          )}
        </div>

        {/* Sidebar References */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bento-card border-none bg-gradient-to-br from-indigo-600 to-purple-600 p-8">
              <div className="flex items-center gap-3 mb-6 font-black uppercase italic tracking-widest text-[10px] text-white/60">
                 <Info className="w-4 h-4" /> Diretrizes CientÃ­ficas
              </div>
              <div className="space-y-4">
                 <div className="p-4 bg-white/10 rounded-2xl border border-white/5 backdrop-blur-sm">
                    <h4 className="text-[10px] font-black text-white uppercase italic mb-1">PadrÃƒÃƒâ€šÃ‚Â£o Pollock</h4>
                    <p className="text-[9px] text-white/70 font-medium leading-relaxed">As mediÃ§Ãµes devem ser realizadas do lado direito do corpo de acordo com o protocolo ACSM.</p>
                 </div>
                 <div className="p-4 bg-white/10 rounded-2xl border border-white/5 backdrop-blur-sm">
                    <h4 className="text-[10px] font-black text-white uppercase italic mb-1">WHR (RCQ)</h4>
                    <p className="text-[9px] text-white/70 font-medium leading-relaxed">Valores acima de 0.95 (Homens) e 0.86 (Mulheres) indicam risco coronariano elevado.</p>
                 </div>
              </div>
           </div>

           <div className="bento-card bg-slate-900 border-slate-800 p-8">
              <h4 className="text-[10px] font-black text-slate-500 uppercase italic mb-4">Normas de Classificação</h4>
               <div className="space-y-3">
                  <RankingRow label="Atleta" range="6-13% (M) | 12-20% (F)" active={results?.bodyFat ? results.bodyFat < 13 : false} />
                  <RankingRow label="SaudÃ¡vel" range="14-17% (M) | 21-25% (F)" active={results?.bodyFat ? results.bodyFat >= 14 && results.bodyFat <= 17 : false} />
                  <RankingRow label="Média" range="18-24% (M) | 26-31% (F)" active={results?.bodyFat ? results.bodyFat >= 18 && results.bodyFat <= 24 : false} />
                  <RankingRow label="Excesso" range=">25% (M) | >32% (F)" active={results?.bodyFat ? results.bodyFat > 25 : false} />
               </div>
           </div>
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

function EnduranceAssessmentModule() {
  const [age, setAge] = useState<string>('');
  const [testType, setTestType] = useState<'beep' | 'yoyo' | 'vift' | 'vcrit' | 'submax'>('beep');
  
  // Beep Test State
  const [beepStage, setBeepStage] = useState<string>('');
  
  // Yo-Yo State
  const [yoyoLevel, setYoyoLevel] = useState<string>('');
  const [yoyoShuttles, setYoyoShuttles] = useState<string>('');
  
  // VIFT State
  const [viftFinalSpeed, setViftFinalSpeed] = useState<string>('');
  
  // Vcrit State
  const [dist1, setDist1] = useState<string>('1200');
  const [time1, setTime1] = useState<string>('');
  const [dist2, setDist2] = useState<string>('2400');
  const [time2, setTime2] = useState<string>('');

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
        
        // ÃƒÃ¢Ã¢â€šÂ¬Ã‚Â¦strand-Ryhming method adjusted by Tanaka FC_max:
        // VO2max = VO2_submax * (FC_max / FC_submax)
        const vo2max_est = vo2_submax * (maxHR_est / hr);
        
        // vVO2max: speed at VO2max (from ACSM equation inverted: v = (VO2max - 3.5) / 0.2)
        const v_mmin_vo2max = (vo2max_est - 3.5) / 0.2;  // m/min
        const vVO2max = v_mmin_vo2max * 60 / 1000; // back to km/h
        
        return { vo2max: vo2max_est, vVO2max, speed: v, type: 'Submáximo (Pred. ÃƒÃ¢Ã¢â€šÂ¬Ã‚Â¦strand/Tanaka)' };
      }
    }

    if (testType === 'beep') {
      const stage = parseFloat(beepStage);
      if (!stage) return null;
      
      // Speed (km/h) = 8.0 + (stage * 0.5)
      const speed = 8.0 + (stage * 0.5);
      
      // LÃ©ger et al. (1988) formula
      const vo2max = 31.025 + (3.238 * speed) - (3.248 * a) + (0.1536 * speed * a);
      const vVO2max = speed; // Approximation
      
      return { vo2max, vVO2max, speed, type: 'Beep Test' };
    }

    if (testType === 'yoyo') {
      // Bangsbo et al. (2008): VO2max = dist_total(m) * 0.0084 + 36.4
      // Input: total distance run (m) Ã¢Ã¢Ã¢â‚¬Å¡Ã‚Â¬Ã¢Ã¢â€šÂ¬Ã‚Â registered directly from the test result sheet
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
      const d1 = parseFloat(dist1);
      const t1 = parseFloat(time1);
      const d2 = parseFloat(dist2);
      const t2 = parseFloat(time2);
      
      if (d1 && t1 && d2 && t2) {
        const vcrit = (d2 - d1) / (t2 - t1); // m/s
        const vcritKmh = vcrit * 3.6;
        return { vcrit: vcritKmh, type: 'Velocidade CrÃ­tica' };
      }
    }

    return null;
  }, [testType, age, beepStage, yoyoLevel, yoyoShuttles, viftFinalSpeed, dist1, time1, dist2, time2]);

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
                   <option value="vcrit">Velocidade CrÃ­tica (Vcrit)</option>
                </select>
             </div>

             <InputField label="Idade do Atleta" value={age} set={setAge} />

             <div className="pt-4 border-t border-slate-800 space-y-4">
                {testType === 'submax' && (
                  <div className="space-y-4">
                    <InputField label="Velocidade Atual (km/h)" value={submaxSpeed} set={setSubmaxSpeed} />
                    <InputField label="Freq. CardÃ­aca no Teste (bpm)" value={submaxHR} set={setSubmaxHR} />
                    <InputField label="Freq. CardÃ­aca Repouso (bpm)" value={restingHR} set={setRestingHR} />
                  </div>
                )}
                
                {testType === 'beep' && (
                  <InputField label="ÃƒÃƒâ€¦Ã‚Â¡ltimo Estágio Completado" value={beepStage} set={setBeepStage} />
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
                    <div className="grid grid-cols-2 gap-4">
                      <InputField label="Distância 1 (m)" value={dist1} set={setDist1} />
                      <InputField label="Tempo 1 (seg)" value={time1} set={setTime1} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <InputField label="Distância 2 (m)" value={dist2} set={setDist2} />
                      <InputField label="Tempo 2 (seg)" value={time2} set={setTime2} />
                    </div>
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
                  <p className="text-[10px] font-black text-white/50 uppercase italic tracking-widest mb-2">VO2mÃ¡x Estimado</p>
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
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Velocidade AerÃ Â³bica Máxima (vVO2max)</p>
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
                    </div>
                 </div>
              </div>
            </div>

            <div className="bento-card bg-slate-900 border-slate-800 p-8">
               <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="label-caps italic mb-1">PrediÃ§Ã£o de Performance</p>
                    <h3 className="text-xl font-black text-white uppercase italic">Zonas de Treinamento Baseadas na Velocidade</h3>
                  </div>
               </div>
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <EnduranceZone label="Recuperação" pct="< 70%" speed={results.vVO2max ? (results.vVO2max * 0.7).toFixed(1) : "--"} />
                  <EnduranceZone label="AerÃ Â³bico" pct="70-80%" speed={results.vVO2max ? (results.vVO2max * 0.8).toFixed(1) : "--"} />
                  <EnduranceZone label="Limiar" pct="85-92%" speed={results.vVO2max ? (results.vVO2max * 0.9).toFixed(1) : "--"} />
                  <EnduranceZone label="Intervalado" pct="> 100%" speed={results.vVO2max ? (results.vVO2max * 1.1).toFixed(1) : "--"} />
               </div>
            </div>
          </>
        ) : (
          <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-900/50 border border-dashed border-slate-800 rounded-[2rem] p-12 text-center group">
             <Timer className="w-16 h-16 text-slate-800 mb-6 group-hover:scale-110 transition-transform" />
             <h3 className="text-xl font-black text-slate-500 uppercase italic">Aguardando ExecuÃ§Ã£o</h3>
             <p className="text-slate-600 text-[10px] font-bold uppercase mt-2 max-w-[280px]">
                Selecione o protocolo e insira os dados do teste para visualizar os resultados de resistÃªncia aerÃ Â³bica.
             </p>
          </div>
        )}
      </div>
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
       <h4 className="text-[10px] font-black text-slate-500 uppercase italic mb-4">ReferÃªncia: Beep Test</h4>
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
       <p className="text-[8px] text-slate-600 font-bold uppercase italic mt-4">* Protocolo LÃ©ger et al. (1988)</p>
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

function AgilityAssessmentModule() {
  const [testType, setTestType] = useState<'t-test' | 'illinois' | 'pro-agility' | 'reactive'>('t-test');
  const [time, setTime] = useState<string>('');
  
  // Reactive Timer State
  const [isWaiting, setIsWaiting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [stimulusType, setStimulusType] = useState<'visual' | 'auditory' | 'both'>('visual');

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
      if (t < 11.5) return { label: 'MÃ©dio', color: 'text-yellow-500' };
      return { label: 'Abaixo da Média', color: 'text-rose-500' };
    }

    if (testType === 'illinois') {
      if (t < 15.2) return { label: 'Excelente', color: 'text-emerald-500' };
      if (t < 16.1) return { label: 'Bom', color: 'text-blue-500' };
      if (t < 18.1) return { label: 'MÃ©dio', color: 'text-yellow-500' };
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
                   <option value="reactive">Agilidade Reativa (EstÃ­mulo)</option>
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
                       <h4 className="text-xl font-black text-amber-500 uppercase italic">Aguardando EstÃ­mulo...</h4>
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
                          Parar CronÃƒÃƒâ€šÃ‚Â´metro
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
                          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">O sinal serÃ¡ disparado aleatoriamente</p>
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
                      <p className="text-[8px] text-slate-600 font-bold uppercase italic mt-2">Classificação baseada em normas NSCA para atletas universitÃ¡rios.</p>
                   </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-900/50 border border-dashed border-slate-800 rounded-[2rem] p-12 text-center group">
                 <Footprints className="w-16 h-16 text-slate-800 mb-6 group-hover:scale-110 transition-transform" />
                 <h3 className="text-xl font-black text-slate-500 uppercase italic">CronÃƒÃƒâ€šÃ‚Â´metro Zerado</h3>
                 <p className="text-slate-600 text-[10px] font-bold uppercase mt-2 max-w-[280px]">
                    Insira o tempo final do percurso para visualizar a classificação de agilidade e mudanÃ§a de direÃ§Ã£o.
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
                 <p className="text-[10px] text-slate-500 leading-tight">Testes como Illinois e T-Test medem a capacidade prÃ©-planejada de mudar de curso. Foco em biomecÃ¢nica de frenagem e aceleração.</p>
              </div>
              <div className="space-y-3">
                 <h4 className="text-[10px] font-black text-rose-500 uppercase">Agilidade Reativa</h4>
                 <p className="text-[10px] text-slate-500 leading-tight">Envolve o componente cognitivo de processar um estÃ­mulo (visual/sonoro) antes da execuÃ§Ã£o física. Essencial para esportes abertos.</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function AgilityGuide({ testType }: { testType: string }) {
  const content = {
    't-test': {
      title: 'Setup T-Test',
      steps: ['Corra 10m ÃƒÃƒâ€šÃ‚Â  frente', 'Deslocamento lateral 5m esquerda', 'Deslocamento lateral 10m direita', 'Lateral 5m volta ao centro', 'Corra 10m de costas para o início']
    },
    'illinois': {
      title: 'Setup Illinois',
      steps: ['Início deitado de bruÃ§os', 'Sprint 10m e volta', 'Drible entre 4 cones (3.3m cada)', 'Sprint final 10m']
    },
    'pro-agility': {
      title: 'Setup 5-10-5',
      steps: ['ExplosÃƒÃƒâ€šÃ‚Â£o 5 jardas ÃƒÃƒâ€šÃ‚Â  esquerda', 'Cruzamento 10 jardas ÃƒÃƒâ€šÃ‚Â  direita', 'Sprint final 5 jardas ao ponto central']
    },
    'reactive': {
      title: 'Reactive Agility',
      steps: ['Sinal randÃƒÃƒâ€šÃ‚Â´mico (2-5s)', 'EstÃ­mulo Visual (Flash)', 'EstÃ­mulo Sonoro (Beep)', 'Foco em tempo de decisÃƒÃƒâ€šÃ‚Â£o + execuÃ§Ã£o']
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

function FlexibilityAssessmentModule() {
  const [testType, setTestType] = useState<'sit-reach' | 'goniometry'>('sit-reach');
  const [sitProtocol, setSitProtocol] = useState<'wells' | 'floor'>('wells');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [resultVal, setResultVal] = useState<string>('');
  
  // Goniometry State
  const [joint, setJoint] = useState<string>('Ombro - FlexÃƒÃƒâ€šÃ‚Â£o');
  const [angle, setAngle] = useState<string>('');
  const [side, setSide] = useState<'D' | 'E'>('D');

  // AAOS / ACSM Normal ROM values (degrees)
  const joints = [
    // Ombro
    { group: 'Ombro', name: 'Ombro - FlexÃƒÃƒâ€šÃ‚Â£o', normal: 180, range: '170-180ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: 150 },
    { group: 'Ombro', name: 'Ombro - ExtensÃƒÃƒâ€šÃ‚Â£o', normal: 60, range: '50-60ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: 40 },
    { group: 'Ombro', name: 'Ombro - AbduÃ§Ã£o', normal: 180, range: '170-180ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: 150 },
    { group: 'Ombro', name: 'Ombro - Rot. Interna', normal: 70, range: '60-90ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: 45 },
    { group: 'Ombro', name: 'Ombro - Rot. Externa', normal: 90, range: '80-90ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: 60 },
    // Cotovelo / AntebraÃ§o
    { group: 'Cotovelo', name: 'Cotovelo - FlexÃƒÃƒâ€šÃ‚Â£o', normal: 150, range: '140-150ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: 120 },
    { group: 'Cotovelo', name: 'Cotovelo - ExtensÃƒÃƒâ€šÃ‚Â£o', normal: 0, range: '0ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: -10 },
    { group: 'Cotovelo', name: 'AntebraÃ§o - Pronação', normal: 80, range: '75-80ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: 60 },
    { group: 'Cotovelo', name: 'AntebraÃ§o - Supinação', normal: 80, range: '80-85ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: 60 },
    // Punho
    { group: 'Punho', name: 'Punho - FlexÃƒÃƒâ€šÃ‚Â£o', normal: 80, range: '70-80ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: 60 },
    { group: 'Punho', name: 'Punho - ExtensÃƒÃƒâ€šÃ‚Â£o', normal: 70, range: '60-70ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: 50 },
    { group: 'Punho', name: 'Punho - Desvio Radial', normal: 20, range: '15-20ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: 10 },
    { group: 'Punho', name: 'Punho - Desvio Ulnar', normal: 30, range: '30-35ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: 20 },
    // Quadril
    { group: 'Quadril', name: 'Quadril - FlexÃƒÃƒâ€šÃ‚Â£o', normal: 120, range: '115-125ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: 90 },
    { group: 'Quadril', name: 'Quadril - ExtensÃƒÃƒâ€šÃ‚Â£o', normal: 20, range: '10-20ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: 5 },
    { group: 'Quadril', name: 'Quadril - AbduÃ§Ã£o', normal: 45, range: '40-50ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: 30 },
    { group: 'Quadril', name: 'Quadril - AduÃ§Ã£o', normal: 30, range: '20-30ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: 15 },
    { group: 'Quadril', name: 'Quadril - Rot. Interna', normal: 45, range: '30-45ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: 20 },
    { group: 'Quadril', name: 'Quadril - Rot. Externa', normal: 45, range: '40-60ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: 25 },
    // Joelho
    { group: 'Joelho', name: 'Joelho - FlexÃƒÃƒâ€šÃ‚Â£o', normal: 140, range: '130-150ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: 110 },
    { group: 'Joelho', name: 'Joelho - ExtensÃƒÃƒâ€šÃ‚Â£o', normal: 0, range: '0ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: -10 },
    // Tornozelo / PÃ©
    { group: 'Tornozelo', name: 'Tornozelo - DorsiflexÃƒÃƒâ€šÃ‚Â£o', normal: 20, range: '15-20ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: 10 },
    { group: 'Tornozelo', name: 'Tornozelo - Plantar FlexÃƒÃƒâ€šÃ‚Â£o', normal: 50, range: '45-50ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: 30 },
    { group: 'Tornozelo', name: 'Subtalar - InversÃƒÃƒâ€šÃ‚Â£o', normal: 35, range: '30-40ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: 20 },
    { group: 'Tornozelo', name: 'Subtalar - EversÃƒÃƒâ€šÃ‚Â£o', normal: 15, range: '10-20ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: 5 },
    // Coluna
    { group: 'Coluna', name: 'Coluna - FlexÃƒÃƒâ€šÃ‚Â£o (lombar)', normal: 60, range: '40-60ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: 30 },
    { group: 'Coluna', name: 'Coluna - ExtensÃƒÃƒâ€šÃ‚Â£o (lombar)', normal: 25, range: '20-30ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: 10 },
    { group: 'Coluna', name: 'Coluna - Rotação (cervical)', normal: 80, range: '70-80ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: 50 },
    { group: 'Coluna', name: 'Coluna - FlexÃƒÃƒâ€šÃ‚Â£o Lateral', normal: 35, range: '25-35ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°', low: 15 },
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
        // ACSM Wells Bank Ã¢Ã¢Ã¢â‚¬Å¡Ã‚Â¬Ã¢Ã¢â€šÂ¬Ã‚Â sex-specific norms (18-29 yrs reference)
        if (gender === 'male') {
          if (val >= 34) return { label: 'Excelente', color: 'bg-emerald-500' };
          if (val >= 28) return { label: 'Bom', color: 'bg-blue-500' };
          if (val >= 21) return { label: 'MÃ©dio', color: 'bg-yellow-500' };
          if (val >= 15) return { label: 'Abaixo da Média', color: 'bg-orange-500' };
          return { label: 'Fraco', color: 'bg-rose-500' };
        } else {
          if (val >= 38) return { label: 'Excelente', color: 'bg-emerald-500' };
          if (val >= 33) return { label: 'Bom', color: 'bg-blue-500' };
          if (val >= 26) return { label: 'MÃ©dio', color: 'bg-yellow-500' };
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

  // Goniometer angle capped at 180ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â° for visual
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
                     Sentar e AlcanÃ§ar
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
                         No ChÃƒÃƒâ€šÃ‚Â£o (S/ Banco)
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
                  <InputField label="ÃƒÃ¢Ã¢â€šÂ¬Ã…Â¡ngulo Medido (Graus ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°)" value={angle} set={setAngle} />
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
                  <p className="text-[10px] font-black text-white/50 uppercase italic tracking-widest mb-2">Resultado Ã¢Ã¢Ã¢â‚¬Å¡Ã‚Â¬Ã¢Ã¢â€šÂ¬Ã‚Â Sentar e AlcanÃ§ar</p>
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
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Normas ACSM Ã¢Ã¢Ã¢â‚¬Å¡Ã‚Â¬Ã¢Ã¢â€šÂ¬Ã‚Â {gender === 'male' ? 'Masculino' : 'Feminino'}</p>
               <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-emerald-400">Excelente</span>
                    <span className="text-emerald-400">{sitProtocol === 'wells' ? (gender === 'male' ? 'Ã¢Ã¢Ã¢â€šÂ¬Ã‚Â°Ãƒâ€šÃ‚Â¥ 34cm' : 'Ã¢Ã¢Ã¢â€šÂ¬Ã‚Â°Ãƒâ€šÃ‚Â¥ 38cm') : 'Ã¢Ã¢Ã¢â€šÂ¬Ã‚Â°Ãƒâ€šÃ‚Â¥ 15cm'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-blue-400">Bom</span>
                    <span className="text-blue-400">{sitProtocol === 'wells' ? (gender === 'male' ? '28-33cm' : '33-37cm') : '5-14cm'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-yellow-400">MÃ©dio</span>
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
                <p className="text-[9px] font-black text-pink-500 uppercase tracking-widest mb-6">{joint} Ã¢Ã¢Ã¢â‚¬Å¡Ã‚Â¬Ã¢Ã¢â€šÂ¬Ã‚Â Lado {side}</p>
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
                    <span className="text-3xl font-black text-white italic">{angle}ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°</span>
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
                    { label: 'Normal (Ã¢Ã¢Ã¢â€šÂ¬Ã‚Â°Ãƒâ€šÃ‚Â¥ 90%)', col: 'text-emerald-400' },
                    { label: 'Leve reduÃ§Ã£o (75-89%)', col: 'text-yellow-400' },
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
              <p className="text-[9px] font-black text-pink-500 uppercase tracking-widest mb-2">Interpretação ClÃ­nica</p>
              <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                {goniometryClassification?.label === 'ADM Normal'
                  ? `A amplitude de movimento de ${angle}ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â° para ${joint} estÃ¡ dentro dos valores normais segundo a AAOS (${currentJoint.range}). ManutenÃ§Ã£o com exercÃ­cios de mobilidade preventiva.`
                  : `A amplitude de ${angle}ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â° estÃ¡ abaixo do esperado para ${joint} (Normal: ${currentJoint.range}). Recomenda-se avaliação clÃ­nica detalhada e protocolo de mobilização articular especÃ­fico.`
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-900/50 border border-dashed border-slate-800 rounded-[2rem] p-12 text-center group">
             <MoveHorizontal className="w-16 h-16 text-slate-800 mb-6 group-hover:scale-110 transition-transform" />
             <h3 className="text-xl font-black text-slate-500 uppercase italic">Dados de Mobilidade</h3>
             <p className="text-slate-600 text-[10px] font-bold uppercase mt-2 max-w-[280px]">
                Selecione o protocolo de flexibilidade ou goniometria para registrar e classificar a amplitude de movimento.
             </p>
          </div>
        )}

        <div className="bento-card bg-slate-900 border-slate-800 p-8">
           <h4 className="text-[10px] font-black text-white uppercase italic mb-6">ImportÃ¢ncia da Flexibilidade</h4>
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { title: 'Performance', desc: 'Melhora a eficiÃªncia biomecÃ¢nica do movimento esportivo.' },
                { title: 'PrevenÃ§Ã£o', desc: 'Reduz riscos de lesÃµes em articulaÃ§Ãµes e tecidos moles.' },
                { title: 'Funcionalidade', desc: 'Garante amplitude necessÃ¡ria para atividades diÃ¡rias.' }
              ].map(item => (
                <div key={item.title} className="space-y-2">
                   <h5 className="text-[9px] font-black text-pink-500 uppercase">{item.title}</h5>
                   <p className="text-[10px] text-slate-500 leading-tight">{item.desc}</p>
                </div>
              ))}
           </div>
        </div>
      </div>
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

function PeriodizationModule() {
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

  // AvanÃ§o por semana (Ãºltimas 8 semanas)
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

  // Summary por atleta (para visÃ£o geral)
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
        <div className="flex items-center gap-4">
          <button onClick={() => setView('setup')} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase italic">Voltar</span>
          </button>
          <div>
            <h2 className="text-2xl font-black text-white uppercase italic">
              {selectedAthlete?.full_name} <span className="text-amber-500">â€” Progressão Real</span>
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Histórico de PrescriÃ§Ãµes Concluídas</p>
          </div>
        </div>

        {loadingTracking ? (
          <div className="text-center py-20 font-black text-slate-500 uppercase italic animate-pulse">Carregando histÃ³rico...</div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bento-card bg-slate-900 border-slate-800 p-6 text-center">
                <p className="text-[9px] font-black text-slate-500 uppercase mb-1">SessÃµes Prescritas</p>
                <p className="text-3xl font-black text-white italic">{totalPrescribed}</p>
              </div>
              <div className="bento-card bg-emerald-600 border-none p-6 text-center">
                <p className="text-[9px] font-black text-white/60 uppercase mb-1">SessÃµes Concluídas</p>
                <p className="text-3xl font-black text-white italic">{totalCompleted}</p>
              </div>
              <div className="bento-card bg-slate-900 border-slate-800 p-6 text-center">
                <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Pendentes</p>
                <p className="text-3xl font-black text-yellow-400 italic">{totalPrescribed - totalCompleted}</p>
              </div>
              <div className="bento-card bg-slate-900 border-slate-800 p-6 text-center">
                <p className="text-[9px] font-black text-slate-500 uppercase mb-1">AdesÃ£o Geral</p>
                <p className={`text-3xl font-black italic ${progressPct >= 80 ? 'text-emerald-400' : progressPct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{progressPct}%</p>
              </div>
            </div>

            {/* Barra de progresso do macrociclo */}
            <div className="bento-card bg-slate-900 border-slate-800 p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="label-caps italic mb-1">AvanÃ§o do Macrociclo</p>
                  <h3 className="text-xl font-black text-white uppercase italic">ProgressÃ£o Semanal â€” Prescrito vs Concluído</h3>
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

            {/* Lista de sessÃµes */}
            <div className="bento-card bg-slate-900 border-slate-800 p-8 space-y-4">
              <h3 className="text-sm font-black text-white uppercase italic">Histórico Detalhado</h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {prescriptions.length === 0 ? (
                  <div className="text-center py-10 text-slate-600 font-black uppercase italic text-xs">Nenhuma prescriÃ§Ã£o encontrada para este atleta.</div>
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
                            {done ? 'âœ“' : `${totalPrescribed - i}`}
                          </div>
                          <div>
                            <p className="text-xs font-black text-white uppercase italic">Sessão #{totalPrescribed - i}</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase">
                              {format(parseISO(p.created_at.split('T')[0]), 'dd/MM/yyyy')}
                              {blocksText && ` Â· ${blocksText}`}
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
        {/* VisÃ£o geral de adesÃ£o */}
        {athleteSummary.length > 0 && (
          <div className="bento-card bg-slate-900 border-slate-800 p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="label-caps italic mb-1">Monitoramento Real</p>
                <h3 className="text-xl font-black text-white uppercase italic">AdesÃ£o por Atleta</h3>
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
                        <span className="text-[9px] font-bold text-slate-500 uppercase">{a.completed}/{a.total} sessÃµes</span>
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
      if (hasS) return { status: 'danger', msg: 'Liberação MÃ©dica OBRIGATÃ“RIA antes de iniciar.', action: 'Proibir exercÃ­cio' };
      if (hasD) return { status: 'warning', msg: 'Liberação MÃ©dica recomendada.', action: 'Consultar MÃ©dico' };
      return { status: 'success', msg: 'Liberado para Intensidade Leve/Moderada.', action: 'Iniciar Gradual' };
    } else {
      if (hasS) return { status: 'danger', msg: 'DESCONTINUAR exercÃ­cio e buscar liberação mÃ©dica.', action: 'Interromper' };
      if (hasD) {
        if (intensity === 'vigorous') return { status: 'warning', msg: 'Liberação MÃ©dica recomendada para alta intensidade.', action: 'Consultar MÃ©dico' };
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
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">RelatÃ³rio de Triagem Pré-Participação</p>
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
                      { l: 'Problema Coração/PressÃ£o', v: selectedRecord.data.q1 },
                      { l: 'Dor no Peito', v: selectedRecord.data.q2 },
                      { l: 'Tontura/DesequilÃ­brio', v: selectedRecord.data.q3 },
                      { l: 'CondiÃ§Ã£o CrÃ´nica', v: selectedRecord.data.q4 },
                      { l: 'Uso de Medicamentos', v: selectedRecord.data.q5 },
                      { l: 'Problema Ã“sseo/Artic.', v: selectedRecord.data.q6 },
                      { l: 'RemÃ©dio Coração/PressÃ£o', v: selectedRecord.data.q7 },
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
                    <RiskFactor label="DoenÃ§a CV/Metab./Renal" value={selectedRecord.data.hasKnownDisease} />
                    <RiskFactor label="Sinais ou Sintomas" value={selectedRecord.data.hasSymptoms} />
                    <RiskFactor label="Histórico Familiar" value={selectedRecord.data.familyHistory} />
                    <RiskFactor label="Fumante" value={selectedRecord.data.smoking} />
                    <RiskFactor label="HipertensÃ£o" value={selectedRecord.data.hypertension} />
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
                    <p className="text-[10px] font-black text-rose-400 uppercase italic mb-2">Histórico de LesÃµes</p>
                    <p className="text-xs text-white font-medium leading-relaxed">{selectedRecord.data.previousInjuries}</p>
                  </div>
                )}
                {selectedRecord.data.details && (
                  <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800">
                    <p className="text-[10px] font-black text-slate-500 uppercase italic mb-2">ObservaÃ§Ãµes Adicionais</p>
                    <p className="text-xs text-white font-medium leading-relaxed">{selectedRecord.data.details}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-20 bento-card bg-slate-900/30 border-dashed border-slate-800">
              <User className="w-16 h-16 text-slate-800 mb-4" />
              <p className="text-slate-600 font-black uppercase italic tracking-widest text-sm">Selecione um aluno para visualizar o relatÃ³rio</p>
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
        alert(`O e-mail ${req.email} jÃ¡ possui uma conta cadastrada. Status atualizado para aprovado.`);
      } else {
        alert('Erro ao aprovar: ' + result.error);
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handleCopyCredentials = () => {
    if (!credentials) return;
    const text = `ðŸ‹ï¸ WMPS â€” William Moreira Performance System\n\nOlÃ¡, ${credentials.fullName}!\n\nSeu acesso foi aprovado. Utilize as credenciais abaixo para entrar na plataforma:\n\nðŸ“§ Login (E-mail): ${credentials.email}\nðŸ”‘ Senha provisÃ³ria: ${credentials.password}\n\nâš ï¸ IMPORTANTE: Ao fazer o primeiro acesso, vocÃª serÃ¡ solicitado(a) a criar uma nova senha pessoal.\n\nAcesse em: ${typeof window !== 'undefined' ? window.location.origin : ''}\n\nBem-vindo(a) Ã  equipe! ðŸ’ª`;
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
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-0.5">Senha ProvisÃ³ria</p>
                  <p className="text-lg font-black text-emerald-400 tracking-widest font-mono">{credentials.password}</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>

            {/* Welcome Message Preview */}
            <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700 text-[10px] text-slate-400 leading-relaxed font-medium space-y-1">
              <p className="font-black text-slate-300 uppercase text-[9px] tracking-widest mb-2">Prévia da mensagem de boas-vindas:</p>
              <p>ðŸ‹ï¸ <strong className="text-white">WMPS â€” William Moreira Performance System</strong></p>
              <p>OlÃ¡, <strong className="text-white">{credentials.fullName}</strong>!</p>
              <p>Seu acesso foi aprovado. Utilize as credenciais acima para entrar na plataforma.</p>
              <p className="text-yellow-500">âš ï¸ No primeiro acesso, vocÃª criarÃ¡ uma nova senha pessoal.</p>
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
                {copied ? 'âœ“ Copiado!' : 'ðŸ“‹ Copiar Mensagem'}
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
                      ResponsÃ¡vel: {req.guardian_name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
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
          <h4 className="text-sm font-black text-white uppercase italic">!!! NOVO - LISTA DE EXERCÍCIOS !!!</h4>
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
                    {[100, 90, 80, 70, 60, 50, 40, 30].map(p => <option key={p} value={p}>{p}%</option>)}
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

function PrescriptionModule({ coachId }: { coachId?: string }) {
  const [athletes, setAthletes] = useState<any[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [searchAthlete, setSearchAthlete] = useState('');
  const [sending, setSending] = useState(false);
  const [prescription, setPrescription] = useState({
    strength: [{ name: '', intensity: '', sets: '4', reps: '10', rest: '90s', weight: '', volumePercent: '100' }],
    hiit: { protocol: '', workDur: '', recDur: '', workInt: '', recInt: '', series: '', reps: '', bSeriesDur: '', totalKm: '0', totalTime: '0', modality: '' },
    continuous: { intensity: '', duration: '', modality: '', totalKm: '0', totalTime: '0' },
    agility: { protocol: '', drills: '', series: '', reps: '', restSeries: '', notes: '' },
    plyometrics: { drill: '', experience: 'Beginner', jumpType: 'Bilateral', series: '', reps: '', restSeries: '', totalContacts: '0', notes: '' },
    flexibility: { method: '', intensity: '', duration: '', restSeries: '', restReps: '' },
    power: { method: '', intensity: '', duration: '', restSeries: '', restReps: '' },
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
      alert('Erro inesperado ao enviar prescriÃ§Ã£o.');
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
                      <p className="text-xs text-blue-400 font-black uppercase italic tracking-widest">{selectedAthlete.goal || 'Objetivo nÃ£o definido'}</p>
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
                <MetricBox label="% FCmax" value="92%" subValue="EsforÃ§o" color="text-orange-500" />
                <MetricBox label="% FCres" value="80%" subValue="Reserva" color="text-emerald-500" />
              </div>

              {/* Prescription Forms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <AdvancedStrengthCard 
                  values={prescription.strength}
                  onChange={(newList) => setPrescription({...prescription, strength: newList})}
                />
                <HIITCard 
                  values={prescription.hiit}
                  onChange={(field, val) => setPrescription({...prescription, hiit: {...prescription.hiit, [field]: val}})}
                />
                <ContinuousCard 
                  values={prescription.continuous}
                  onChange={(field, val) => setPrescription({...prescription, continuous: {...prescription.continuous, [field]: val}})}
                />
                <AgilityCard 
                  values={prescription.agility}
                  onChange={(field, val) => setPrescription({...prescription, agility: {...prescription.agility, [field]: val}})}
                />
                <PlyometricsCard 
                  values={prescription.plyometrics}
                  onChange={(field, val) => setPrescription({...prescription, plyometrics: {...prescription.plyometrics, [field]: val}})}
                />
                <PrescriptionCard 
                  title="Potência / Explosão" 
                  icon={<Zap className="w-5 h-5 text-yellow-500" />}
                  values={prescription.power}
                  onChange={(field, val) => setPrescription({...prescription, power: {...prescription.power, [field]: val}})}
                />
                <PrescriptionCard 
                  title="Flexibilidade / Mobilidade" 
                  icon={<MoveHorizontal className="w-5 h-5 text-purple-500" />}
                  values={prescription.flexibility}
                  onChange={(field, val) => setPrescription({...prescription, flexibility: {...prescription.flexibility, [field]: val}})}
                />
              </div>

              {/* Load Analysis and Alerts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bento-card bg-slate-900 border-slate-800 p-6 flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black text-slate-500 uppercase italic">AnÃ¡lise de ProgressÃ£o (KM)</p>
                    <Scale className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 space-y-1">
                      <label className="text-[8px] font-black text-slate-600 uppercase">Vol. Semana Anterior (KM)</label>
                      <input 
                        type="number" 
                        value={prescription.prevVolume}
                        onChange={(e) => setPrescription({...prescription, prevVolume: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none"
                        placeholder="Ex: 15"
                      />
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-[8px] font-black text-slate-600 uppercase">Variação %</p>
                      {(() => {
                        const currentVol = (Number(prescription.hiit.totalKm) || 0) + (Number(prescription.continuous.totalKm) || 0);
                        const prevVol = Number(prescription.prevVolume) || 0;
                        if (!prevVol) return <p className="text-xl font-black text-slate-500">--</p>;
                        const diff = ((currentVol - prevVol) / prevVol) * 100;
                        const isHighRisk = diff > 10;
                        return (
                          <div className="space-y-1">
                            <p className={`text-xl font-black italic ${diff > 0 ? (isHighRisk ? 'text-red-500' : 'text-emerald-500') : 'text-blue-500'}`}>
                              {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                            </p>
                            {isHighRisk && (
                              <div className="flex items-center justify-center gap-1 text-[8px] font-black text-red-500 uppercase animate-pulse">
                                <AlertTriangle className="w-3 h-3" /> Risco de LesÃ£o
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="bento-card bg-slate-900 border-slate-800 p-6 flex flex-col justify-center">
                   <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-black text-slate-500 uppercase italic">Volume Total Prescrito</p>
                      <Activity className="w-4 h-4 text-emerald-500" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[8px] font-black text-slate-600 uppercase">Distância Total</p>
                        <p className="text-2xl font-black text-white italic">
                          {((Number(prescription.hiit.totalKm) || 0) + (Number(prescription.continuous.totalKm) || 0)).toFixed(2)} <span className="text-xs text-slate-500 not-italic">KM</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-600 uppercase">Tempo Total</p>
                        <p className="text-2xl font-black text-white italic">
                          {((Number(prescription.hiit.totalTime) || 0) + (Number(prescription.continuous.totalTime) || 0)).toFixed(0)} <span className="text-xs text-slate-500 not-italic">MIN</span>
                        </p>
                      </div>
                   </div>
                </div>
              </div>

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
              <p className="text-slate-600 font-black uppercase italic tracking-widest text-sm">Selecione um atleta para iniciar a prescriÃ§Ã£o</p>
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

function PrescriptionCard({ title, icon, values, onChange }: { title: string, icon: React.ReactNode, values: any, onChange: (field: string, val: string) => void }) {
  return (
    <div className="bento-card bg-slate-900 border-slate-800 p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-800 rounded-xl border border-slate-700">{icon}</div>
        <h4 className="text-sm font-black text-white uppercase italic">{title}</h4>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Meio / Método</label>
            <input 
              value={values.method}
              onChange={(e) => onChange('method', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:ring-1 focus:ring-blue-500 outline-none" 
              placeholder="Ex: Musculação"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Intensidade</label>
            <input 
              value={values.intensity}
              onChange={(e) => onChange('intensity', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="Ex: 85% 1RM"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Duração / Volume</label>
          <input 
            value={values.duration}
            onChange={(e) => onChange('duration', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:ring-1 focus:ring-blue-500 outline-none"
            placeholder="Ex: 4 x 8-10 reps"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Desc. Séries</label>
            <input 
              value={values.restSeries}
              onChange={(e) => onChange('restSeries', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="Ex: 90s"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Desc. Reps (se houver)</label>
            <input 
              value={values.restReps}
              onChange={(e) => onChange('restReps', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="Ex: 10s"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
function HIITCard({ values, onChange }: { values: any, onChange: (field: string, val: string) => void }) {
  const protocols = [
    { id: 'sit', name: 'SIT (Sprint Interval)', desc: '160-180% vVO2 | 85-95% MSS', workDur: '30s', recDur: '2-4 min', workInt: '18', recInt: '0', series: '1', reps: '6' },
    { id: 'rst', name: 'RST (Repeated Sprint)', desc: '120-160% vVO2 | 75-85% MSS', workDur: '6s', recDur: '20s', workInt: '22', recInt: '0', series: '2', reps: '8' },
    { id: 'short', name: 'HIIT Curto Intervalo', desc: '100-120% vVO2', workDur: '30s', recDur: '30s', workInt: '15', recInt: '8', series: '2', reps: '12' },
    { id: 'long', name: 'HIIT Longo Intervalo', desc: '90-100% vVO2', workDur: '120s', recDur: '120s', workInt: '11.5', recInt: '8', series: '1', reps: '4' }
  ];

  useEffect(() => {
    const speed = parseFloat(values.workInt) || 0;
    const workDur = parseFloat(values.workDur) || 0;
    const reps = parseInt(values.reps) || 0;
    const series = parseInt(values.series) || 0;
    const recDur = parseFloat(values.recDur) || 0;
    const bSeriesDur = parseFloat(values.bSeriesDur) || 0;

    const distPerRep = (speed * workDur) / 3.6;
    const totalDist = (distPerRep * reps * series) / 1000;
    
    const timeWork = (workDur * reps * series) / 60;
    const timeRec = (recDur * (reps - 1) * series) / 60;
    const timeBSeries = (bSeriesDur * (series - 1)) / 60;
    const totalTime = timeWork + timeRec + timeBSeries;

    if (totalDist !== values.totalKm || totalTime !== values.totalTime) {
      onChange('totalKm', totalDist.toFixed(3));
      onChange('totalTime', totalTime.toFixed(1));
    }
  }, [values.workInt, values.workDur, values.reps, values.series, values.recDur, values.bSeriesDur]);

  return (
    <div className="bento-card bg-slate-900 border-slate-800 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800 rounded-xl border border-slate-700">
            <Timer className="w-5 h-5 text-emerald-500" />
          </div>
          <h4 className="text-sm font-black text-white uppercase italic">HIIT (Volume Auto)</h4>
        </div>
        <select 
          onChange={(e) => {
            const p = protocols.find(x => x.id === e.target.value);
            if (p) {
              onChange('protocol', p.name);
              onChange('workDur', p.workDur);
              onChange('recDur', p.recDur);
              onChange('workInt', p.workInt);
              onChange('recInt', p.recInt);
              onChange('series', p.series);
              onChange('reps', p.reps);
            }
          }}
          className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[10px] font-bold text-white focus:outline-none"
        >
          <option value="">Formatos...</option>
          {protocols.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
           <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Velocidade (km/h)</label>
              <input type="number" step="0.1" value={values.workInt} onChange={e => onChange('workInt', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-white focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Ex: 11.5" />
           </div>
           <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-1">EstÃ­mulo (seg)</label>
              <input type="number" value={values.workDur} onChange={e => onChange('workDur', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-white focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Ex: 120" />
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Recuperação (seg)</label>
              <input type="number" value={values.recDur} onChange={e => onChange('recDur', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-white focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Ex: 120" />
           </div>
           <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Desc. Séries (seg)</label>
              <input type="number" value={values.bSeriesDur} onChange={e => onChange('bSeriesDur', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-white focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Ex: 120" />
           </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
           <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Séries</label>
              <input type="number" value={values.series} onChange={e => onChange('series', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-white focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Ex: 1" />
           </div>
           <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Reps</label>
              <input type="number" value={values.reps} onChange={e => onChange('reps', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-white focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Ex: 4" />
           </div>
           <div className="flex flex-col justify-end pb-1 text-center">
              <p className="text-[8px] font-black text-slate-500 uppercase">Total KM</p>
              <p className="text-sm font-black text-emerald-500 italic">{values.totalKm} KM</p>
           </div>
        </div>

        <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 flex justify-between items-center">
           <div>
              <p className="text-[8px] font-black text-slate-600 uppercase">Tempo Total Previsto</p>
              <p className="text-lg font-black text-white italic">{values.totalTime} <span className="text-[10px] text-slate-500 not-italic">MINUTOS</span></p>
           </div>
           <div className="text-right">
              <p className="text-[8px] font-black text-slate-600 uppercase">Modalidade</p>
              <input value={values.modality} onChange={e => onChange('modality', e.target.value)} className="bg-transparent border-none text-right text-xs font-black text-white outline-none focus:text-emerald-400" placeholder="Ex: Rua" />
           </div>
        </div>
      </div>
    </div>
  );
}

function ContinuousCard({ values, onChange }: { values: any, onChange: (field: string, val: string) => void }) {
  useEffect(() => {
    const time = parseFloat(values.duration) || 0;
    const speed = parseFloat(values.intensity) || 0;
    
    if (time > 0 && speed > 0) {
      const dist = (speed * time) / 60;
      if (dist.toFixed(2) !== values.totalKm || time.toString() !== values.totalTime) {
        onChange('totalKm', dist.toFixed(2));
        onChange('totalTime', time.toString());
      }
    }
  }, [values.duration, values.intensity]);

  return (
    <div className="bento-card bg-slate-900 border-slate-800 p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-800 rounded-xl border border-slate-700">
          <Activity className="w-5 h-5 text-blue-400" />
        </div>
        <h4 className="text-sm font-black text-white uppercase italic">Treinamento ContÃ­nuo</h4>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Modalidade</label>
            <input 
              value={values.modality}
              onChange={(e) => onChange('modality', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-white focus:ring-1 focus:ring-emerald-500 outline-none" 
              placeholder="Ex: Corrida"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Velocidade (km/h)</label>
            <input 
              value={values.intensity}
              onChange={(e) => onChange('intensity', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-white focus:ring-1 focus:ring-emerald-500 outline-none"
              placeholder="Ex: 12"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Duração (minutos)</label>
            <input 
              value={values.duration}
              onChange={(e) => onChange('duration', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-white focus:ring-1 focus:ring-emerald-500 outline-none"
              placeholder="Ex: 45"
            />
          </div>
          <div className="flex flex-col justify-end pb-1 text-center">
              <p className="text-[8px] font-black text-slate-500 uppercase">Total KM</p>
              <p className="text-sm font-black text-blue-400 italic">{values.totalKm} KM</p>
           </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-slate-500 uppercase ml-1">ObservaÃ§Ãµes</label>
          <textarea 
            value={values.notes}
            onChange={(e) => onChange('notes', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-[10px] font-medium text-slate-400 focus:ring-1 focus:ring-blue-500 outline-none h-16 resize-none"
            placeholder="Pace alvo, controle de FC..."
          />
        </div>
      </div>
    </div>
  );
}

function AgilityCard({ values, onChange }: { values: any, onChange: (field: string, val: string) => void }) {
  const drills = [
    { id: 't_drill', name: 'T-Drill', desc: 'Mudança de direÃ§Ã£o em T' },
    { id: 'shuttle_20', name: '20-yd Shuttle', desc: 'Pro Agility Drill' },
    { id: 'shuttle_60', name: '60-yd Shuttle Run', desc: 'Resistência de Agilidade' },
    { id: 'sprint_40', name: '40-yd Sprint Variations', desc: 'Aceleração e Troca' },
    { id: 'figure_8', name: 'Figure 8 Drill', desc: 'Controle de Curva' },
    { id: 'square', name: 'Square Drills', desc: 'Deslocamento Lateral' },
    { id: 'x_pattern', name: 'X-Pattern Drills', desc: 'Crossover' },
    { id: 'triangle', name: 'Right Triangle Drills', desc: 'Ã‚ngulos Agudos' },
    { id: 'ekg', name: 'EKG Drill', desc: 'Zigue-zague complexo' }
  ];

  return (
    <div className="bento-card bg-slate-900 border-slate-800 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800 rounded-xl border border-slate-700">
            <Footprints className="w-5 h-5 text-cyan-500" />
          </div>
          <h4 className="text-sm font-black text-white uppercase italic">Agilidade / COD</h4>
        </div>
        <select 
          onChange={(e) => {
            const d = drills.find(x => x.id === e.target.value);
            if (d) {
              onChange('drill', d.name);
              onChange('notes', d.desc);
            }
          }}
          className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[10px] font-bold text-white focus:outline-none"
        >
          <option value="">Drills ACSM...</option>
          {drills.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-slate-500 uppercase ml-1">ExercÃ­cio / Drill</label>
          <input 
            value={values.drill}
            onChange={(e) => onChange('drill', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:ring-1 focus:ring-cyan-500 outline-none"
            placeholder="Ex: T-Drill"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Séries</label>
            <input 
              value={values.series}
              onChange={(e) => onChange('series', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:ring-1 focus:ring-cyan-500 outline-none"
              placeholder="Ex: 4"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Reps / Ciclo</label>
            <input 
              value={values.reps}
              onChange={(e) => onChange('reps', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:ring-1 focus:ring-cyan-500 outline-none"
              placeholder="Ex: 3"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Descanso</label>
            <input 
              value={values.rest}
              onChange={(e) => onChange('rest', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:ring-1 focus:ring-cyan-500 outline-none"
              placeholder="Ex: 2 min"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-slate-500 uppercase ml-1">ObservaÃ§Ãµes Técnicas</label>
          <textarea 
            value={values.notes}
            onChange={(e) => onChange('notes', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-[10px] font-medium text-slate-400 focus:ring-1 focus:ring-cyan-500 outline-none h-16 resize-none"
            placeholder="Foco na frenagem e centro de gravidade..."
          />
        </div>
      </div>
    </div>
  );
}
function PlyometricsCard({ values, onChange }: { values: any, onChange: (field: string, val: string) => void }) {
  const intensityContinuum = {
    low: ['Pogos', 'Side-to-side ankle hop', 'Jump and reach', 'Squat jump', 'Standing long jump', 'Cone hops', 'Skipping', 'MB Chest pass'],
    mod: ['Barrier jumps', 'Tuck jumps', 'Split squat jump', 'Double leg hops', 'Box jumps', 'Plyo push-up', 'Triple jump'],
    high: ['Pike jump', 'Single-leg vertical jump', 'Single-leg hops', 'Depth plyo push-up', 'Single-leg bounding', 'Depth jump']
  };

  const volumeTargets = {
    Beginner: '80-100',
    Intermediate: '100-120',
    Advanced: '120-140'
  };

  useEffect(() => {
    const s = parseInt(values.series) || 0;
    const r = parseInt(values.reps) || 0;
    const multiplier = values.jumpType === 'Bilateral' ? 2 : 1;
    const total = s * r * multiplier;
    if (total !== values.totalContacts) {
      onChange('totalContacts', total.toString());
    }
  }, [values.series, values.reps, values.jumpType]);

  const getIntensity = (drill: string) => {
    if (intensityContinuum.high.some(d => drill.includes(d))) return { label: 'ALTA', color: 'text-red-500' };
    if (intensityContinuum.mod.some(d => drill.includes(d))) return { label: 'MÃ‰DIA', color: 'text-orange-500' };
    return { label: 'BAIXA', color: 'text-emerald-500' };
  };

  const intensity = getIntensity(values.drill);

  return (
    <div className="bento-card bg-slate-900 border-slate-800 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800 rounded-xl border border-slate-700">
            <Zap className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white uppercase italic">Pliometria AvanÃ§ada</h4>
            <div className="flex items-center gap-2">
              <span className={`text-[8px] font-black uppercase ${intensity.color}`}>Intensidade: {intensity.label}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <select 
            value={values.experience}
            onChange={(e) => onChange('experience', e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[9px] font-bold text-white focus:outline-none"
          >
            <option value="Beginner">Iniciante</option>
            <option value="Intermediate">IntermediÃ¡rio</option>
            <option value="Advanced">Avançado</option>
          </select>
          <p className="text-[8px] font-black text-slate-500 uppercase italic">Meta: {volumeTargets[values.experience as keyof typeof volumeTargets]} contatos</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">ExercÃ­cio (Continuum)</label>
            <input 
              value={values.drill}
              onChange={(e) => onChange('drill', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-white focus:ring-1 focus:ring-orange-500 outline-none" 
              placeholder="Ex: Depth Jump"
              list="plyo-drills"
            />
            <datalist id="plyo-drills">
              {[...intensityContinuum.low, ...intensityContinuum.mod, ...intensityContinuum.high].map(d => <option key={d} value={d} />)}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Tipo de Salto</label>
            <select 
              value={values.jumpType}
              onChange={(e) => onChange('jumpType', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-white focus:ring-1 focus:ring-orange-500 outline-none"
            >
              <option value="Bilateral">Bipodal (2 contatos)</option>
              <option value="Unilateral">Unipodal (1 contato)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Altura (cm)</label>
            <input 
              value={values.height}
              onChange={(e) => onChange('height', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-white focus:ring-1 focus:ring-orange-500 outline-none"
              placeholder="Ex: 50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Carga Extra (kg)</label>
            <input 
              value={values.load}
              onChange={(e) => onChange('load', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-white focus:ring-1 focus:ring-orange-500 outline-none"
              placeholder="Ex: 0"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Séries</label>
            <input 
              value={values.series}
              onChange={(e) => onChange('series', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-white focus:ring-1 focus:ring-orange-500 outline-none"
              placeholder="Ex: 3"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Reps / Ciclo</label>
            <input 
              value={values.reps}
              onChange={(e) => onChange('reps', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-white focus:ring-1 focus:ring-orange-500 outline-none"
              placeholder="Ex: 8"
            />
          </div>
          <div className="flex flex-col justify-end pb-1 text-center">
              <p className="text-[8px] font-black text-slate-500 uppercase italic">Vol. Calculado</p>
              <div className="flex items-center justify-center gap-1">
                <p className={`text-sm font-black italic ${Number(values.totalContacts) > parseInt(volumeTargets[values.experience as keyof typeof volumeTargets].split('-')[1]) ? 'text-red-500' : 'text-orange-500'}`}>
                  {values.totalContacts}
                </p>
                <span className="text-[8px] text-slate-600 font-bold uppercase">Contatos</span>
              </div>
           </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Notas Técnicas (Fase Amortização)</label>
          <textarea 
            value={values.notes}
            onChange={(e) => onChange('notes', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-[10px] font-medium text-slate-400 focus:ring-1 focus:ring-orange-500 outline-none h-12 resize-none"
            placeholder="Minimizar tempo de contato..."
          />
        </div>
      </div>
    </div>
  );
}
