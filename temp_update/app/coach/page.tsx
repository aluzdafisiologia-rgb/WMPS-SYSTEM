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
  Scale
} from 'lucide-react';
import Link from 'next/link';
import { getSessions, getWellness } from '../actions';
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
  const [activeModule, setActiveModule] = useState<'menu' | 'dashboard' | 'assessment' | 'periodization' | 'prescription' | 'assessment_strength' | 'assessment_power' | 'assessment_endurance' | 'assessment_flexibility' | 'assessment_agility' | 'assessment_anthropometric'>('menu');

  useEffect(() => {
    async function loadData() {
      try {
        const [sessionData, wellnessData] = await Promise.all([
          getSessions(),
          getWellness()
        ]);
        setSessions(sessionData);
        setWellness(wellnessData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredSessions = sessions.filter(s => 
    s.athleteName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredWellness = wellness.filter(w => 
    w.athleteName.toLowerCase().includes(searchTerm.toLowerCase())
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
      if (!athleteSum[s.athleteName]) athleteSum[s.athleteName] = { total: 0, count: 0 };
      athleteSum[s.athleteName].total += s.load;
      athleteSum[s.athleteName].count += 1;
    });

    return Object.entries(athleteSum).map(([name, data]) => ({
      name,
      avg: Math.round(data.total / data.count)
    }));
  }, [sessions]);

  // Athlete ACWR & Quadrant Data
  const athleteMetrics = useMemo(() => {
    const athletes = Array.from(new Set(sessions.map(s => s.athleteName)));
    const today = new Date();
    
    return athletes.map(name => {
      const athleteSessions = sessions.filter(s => s.athleteName === name);
      const athleteWellness = wellness.filter(w => w.athleteName === name);
      
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
        athleteName: metric.name, 
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
      <header className="flex flex-col sm:flex-row justify-between items-center p-6 px-10 gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (activeModule.startsWith('assessment_')) {
                setActiveModule('assessment');
              } else if (activeModule !== 'menu') {
                setActiveModule('menu');
              } else {
                window.location.href = '/';
              }
            }}
            className="group flex items-center gap-2 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white p-2.5 rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col items-center gap-1">
            <Link href="/" className="bg-black text-emerald-500 border-2 border-emerald-500 font-black px-3 py-0.5 rounded text-xl italic skew-x-[-10deg] shadow-[0_0_10px_rgba(16,185,129,0.25)]">
              WMPS
            </Link>
            <div className="text-center">
              <h1 className="text-[10px] font-black leading-tight text-white uppercase italic tracking-[0.1em]">William Moreira</h1>
              <p className="text-[8px] text-slate-500 uppercase tracking-[0.2em] font-bold -mt-0.5">Performance System</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-slate-800/50 p-2 pl-4 rounded-xl border border-slate-700">
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">Coach Hub</p>
            <p className="text-sm font-bold text-white">Monitoring Active</p>
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
          </div>
        ) : activeModule === 'assessment' ? (
          <div className="space-y-8">
            <button 
              onClick={() => setActiveModule('menu')}
              className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Voltar ao Hub
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
              Voltar ao Hub
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
                        <span className="text-[10px] font-black text-white uppercase italic">{alert.athleteName}</span>
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

             <div className="overflow-x-auto">
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
                                  <p className="text-xs font-black text-white italic uppercase">{w.athleteName}</p>
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
          <div className="col-span-12 bento-card bg-slate-800/20">
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
                            <p className="text-[10px] font-black text-white italic uppercase">{session.athleteName}</p>
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
                if (activeModule.startsWith('assessment_')) {
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

function MenuButton({ title, subtitle, icon, onClick }: { title: string, subtitle: string, icon: React.ReactNode, onClick: () => void }) {
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
      const v = parseFloat(value);
      if (!v) return null;
      const estPower = (m * v * 9.81) / 2;
      return { peakPower: estPower, relativePower: estPower / m, label: 'Potência Estimada (MS)', unit: 'W' };
    } else if (testType === 'sprint') {
      const v = parseFloat(value);
      if (!v) return null;
      const time = v;
      const dist = 40; 
      const power = (m * Math.pow(dist, 2)) / Math.pow(time, 3);
      return { peakPower: power, relativePower: power / m, label: 'Potência Anaeróbica (Sprint)', unit: 'W' };
    } else if (testType === 'ssc_analytics') {
      const sj = parseFloat(sjHeight);
      const cmj = parseFloat(cmjHeight);
      if (!sj || !cmj) return null;
      const eur = cmj / sj;
      const sscDiff = ((cmj - sj) / sj) * 100;
      return { 
        peakPower: eur, 
        relativePower: sscDiff, 
        label: 'Análise de Ciclo (SSC)', 
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
        label: 'Índice de Força Reativa (RSI)', 
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
            <p className="label-caps italic mb-1">Avaliação Bioenergética</p>
            <h3 className="text-xl font-black text-white uppercase italic">Capacidade de Potência</h3>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="label-caps italic text-xs">Tipo de Teste</label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: 'jump', title: 'Salto Vertical (MIII)', subtitle: 'Sayers Equation' },
                  { id: 'horizontal_jump', title: 'Salto Horizontal', subtitle: 'Potência de Explosão' },
                  { id: 'medball', title: 'MedBall Throw (MS)', subtitle: 'Membros Superiores' },
                  { id: 'sprint', title: 'Sprint 40m', subtitle: 'Protocolo Anaeróbico' },
                  { id: 'ssc_analytics', title: 'Análise EUR & SSC%', subtitle: 'CMJ vs SJ Analytics' },
                  { id: 'rsi', title: 'Índice Força Reativa', subtitle: 'RSI (Relação H/TC)' }
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
                    {testType === 'jump' ? 'Altura do Salto (cm)' : testType === 'horizontal_jump' ? 'Distância do Salto (cm)' : testType === 'medball' ? 'Distância do Lançamento (m)' : 'Tempo do Sprint 40m (s)'}
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
                    {testType === 'ssc_analytics' ? 'Taxa de Utilização' : testType === 'rsi' ? 'Índice Reativo' : 'Potência Estimada'}
                  </span>
                </div>
              </div>

              <div className="bento-card border-none bg-slate-900 border-slate-800 p-8 flex flex-col justify-between relative overflow-hidden">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase italic tracking-widest mb-2">
                    {testType === 'ssc_analytics' ? 'Diferença SSC%' : testType === 'rsi' ? 'H/TC Ratio' : 'Relativa por Massa'}
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
                <p className="label-caps italic mb-1">Análise Normativa</p>
                <h3 className="text-xl font-black text-white uppercase italic">Classificação e Zonas</h3>
              </div>

              <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <PowerClassCard 
                      label="Explosão" 
                      value={testType === 'ssc_analytics' ? (results.sscDiff as number > 15 ? 'Altíssima' : 'Normal') : 'Avaliado'} 
                      icon={<Zap className="w-5 h-5" />} 
                    />
                    <PowerClassCard 
                      label="Eficiência" 
                      value={testType === 'rsi' ? (results.rsiValue as number > 2.5 ? 'Excelente' : 'Bom') : 'Base'} 
                      icon={<Target className="w-5 h-5" />} 
                    />
                    <PowerClassCard label="Referência" value={testType === 'ssc_analytics' ? 'Meta >1.10' : 'Norma ACSM'} icon={<Info className="w-5 h-5" />} />
                 </div>

                 <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-800">
                    <h4 className="text-[10px] font-black text-white uppercase italic mb-4">Transferência para o Treino</h4>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                      {testType === 'ssc_analytics' ? (
                        `O Ciclo Alongamento-Encurtamento (SSC) apresenta uma vantagem de ${results.sscDiff?.toFixed(1)}%. Um EUR acima de 1.10 indica boa utilização elástica. 
                        Se abaixo disto, foque em treinos de potência explosiva e saltos pliométricos.`
                      ) : testType === 'rsi' ? (
                        `O Índice de Força Reativa de ${results.rsiValue?.toFixed(2)} indica a capacidade de mudar rapidamente de ação excêntrica para concêntrica. 
                        Valores acima de 2.0 são típicos de atletas bem treinados para pliometria.`
                      ) : (
                        `Capacidade detectada para o teste de ${testType}. Os dados sugerem foco em ${results.relativePower as number < 40 ? 'Potência Base' : 'Pliometria e Velocidade'}.`
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
            <p className="text-slate-600 text-[10px] mt-2 max-w-[200px]">Utilize instrumentos validados (fita métrica ou cronômetro) para maior precisão.</p>
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
        if (bodyFat < 8) classification = "Atleta/Excepcional";
        else if (bodyFat <= 15) classification = "Bom/Excelente";
        else if (bodyFat <= 20) classification = "Média";
        else if (bodyFat <= 25) classification = "Acima da Média";
        else classification = "Risco/Obesidade";
      } else {
        if (bodyFat < 15) classification = "Atleta/Excepcional";
        else if (bodyFat <= 23) classification = "Bom/Excelente";
        else if (bodyFat <= 28) classification = "Média";
        else if (bodyFat <= 32) classification = "Acima da Média";
        else classification = "Risco/Obesidade";
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
                      desc="Sensível à densidade óssea por faixa etária." 
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
              <h4 className="text-[10px] font-black text-slate-500 uppercase italic mb-4">Normas de Classificação</h4>
               <div className="space-y-3">
                  <RankingRow label="Atleta" range="6-13% (M) | 12-20% (F)" active={results?.bodyFat ? results.bodyFat < 13 : false} />
                  <RankingRow label="Saudável" range="14-17% (M) | 21-25% (F)" active={results?.bodyFat ? results.bodyFat >= 14 && results.bodyFat <= 17 : false} />
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
        // Simple linear extrapolation for VO2max
        // VO2 at v (km/h) (ACSM Running: 3.5 + 0.2*v + 0.9*v*grade)
        const vo2_at_v = 3.5 + (0.2 * (v * 1000 / 60)); // speed in m/min
        const vo2max_est = ((maxHR_est - rhr) / (hr - rhr)) * (vo2_at_v - 3.5) + 3.5;
        const vVO2max = (vo2max_est - 3.5) / 0.2 / 16.67; // in km/h
        
        return { vo2max: vo2max_est, vVO2max, speed: v, type: 'Submáximo (Predição)' };
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
      const dist = (parseFloat(yoyoLevel) * 40) + (parseFloat(yoyoShuttles) * 40); // Simplification
      if (!dist) return null;
      // IR1 formula: VO2max (ml/kg/min) = distance (m) × 0.0084 + 36.4
      const vo2max = dist * 0.0084 + 36.4;
      return { vo2max, distance: dist, type: 'Yo-Yo IR1' };
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
        return { vcrit: vcritKmh, type: 'Velocidade Crítica' };
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
                   <option value="vcrit">Velocidade Crítica (Vcrit)</option>
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
                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="Nível" value={yoyoLevel} set={setYoyoLevel} />
                    <InputField label="Shuttles" value={yoyoShuttles} set={setYoyoShuttles} />
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
                    </div>
                 </div>
              </div>
            </div>

            <div className="bento-card bg-slate-900 border-slate-800 p-8">
               <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="label-caps italic mb-1">Predição de Performance</p>
                    <h3 className="text-xl font-black text-white uppercase italic">Zonas de Treinamento Baseadas na Velocidade</h3>
                  </div>
               </div>
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <EnduranceZone label="Recuperação" pct="< 70%" speed={results.vVO2max ? (results.vVO2max * 0.7).toFixed(1) : "--"} />
                  <EnduranceZone label="Aeróbico" pct="70-80%" speed={results.vVO2max ? (results.vVO2max * 0.8).toFixed(1) : "--"} />
                  <EnduranceZone label="Limiar" pct="85-92%" speed={results.vVO2max ? (results.vVO2max * 0.9).toFixed(1) : "--"} />
                  <EnduranceZone label="Intervalado" pct="> 100%" speed={results.vVO2max ? (results.vVO2max * 1.1).toFixed(1) : "--"} />
               </div>
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
    </div>
  );
}

function AgilityGuide({ testType }: { testType: string }) {
  const content = {
    't-test': {
      title: 'Setup T-Test',
      steps: ['Corra 10m à frente', 'Deslocamento lateral 5m esquerda', 'Deslocamento lateral 10m direita', 'Lateral 5m volta ao centro', 'Corra 10m de costas para o início']
    },
    'illinois': {
      title: 'Setup Illinois',
      steps: ['Início deitado de bruços', 'Sprint 10m e volta', 'Drible entre 4 cones (3.3m cada)', 'Sprint final 10m']
    },
    'pro-agility': {
      title: 'Setup 5-10-5',
      steps: ['Explosão 5 jardas à esquerda', 'Cruzamento 10 jardas à direita', 'Sprint final 5 jardas ao ponto central']
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

function FlexibilityAssessmentModule() {
  const [testType, setTestType] = useState<'sit-reach' | 'goniometry'>('sit-reach');
  const [sitProtocol, setSitProtocol] = useState<'wells' | 'floor'>('wells');
  const [resultVal, setResultVal] = useState<string>('');
  
  // Goniometry State
  const [joint, setJoint] = useState<string>('Shoulder Flexion');
  const [angle, setAngle] = useState<string>('');

  const joints = [
    { name: 'Ombro - Flexão', normal: '180°' },
    { name: 'Ombro - Extensão', normal: '45-60°' },
    { name: 'Cotovelo - Flexão', normal: '140-150°' },
    { name: 'Quadril - Flexão', normal: '120°' },
    { name: 'Joelho - Flexão', normal: '135°' },
    { name: 'Tornozelo - Dorsiflexão', normal: '20°' },
  ];

  const classification = useMemo(() => {
    if (testType === 'sit-reach') {
      const val = parseFloat(resultVal);
      if (isNaN(val)) return null;

      // Simplistic classification for illustrative purposes
      if (sitProtocol === 'wells') {
        if (val >= 34) return { label: 'Excelente', color: 'bg-emerald-500' };
        if (val >= 28) return { label: 'Bom', color: 'bg-blue-500' };
        if (val >= 21) return { label: 'Médio', color: 'bg-yellow-500' };
        return { label: 'Abaixo da Média', color: 'bg-rose-500' };
      } else {
        // Floor protocol (no bench) typically has different benchmarks (often 0 is touching toes)
        if (val >= 15) return { label: 'Excelente', color: 'bg-emerald-500' };
        if (val >= 5) return { label: 'Bom', color: 'bg-blue-500' };
        if (val >= 0) return { label: 'Média', color: 'bg-yellow-500' };
        return { label: 'Limitado', color: 'bg-rose-500' };
      }
    }
    return null;
  }, [testType, sitProtocol, resultVal]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-4 space-y-6">
        <div className="bento-card bg-slate-900 border-slate-800 p-6 space-y-6">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-pink-600/20 flex items-center justify-center border border-pink-500/30">
                <Dumbbell className="w-4 h-4 text-pink-500" />
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
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Articulação</span>
                    <select 
                      value={joint}
                      onChange={e => setJoint(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm outline-none"
                    >
                      {joints.map(j => <option key={j.name} value={j.name}>{j.name}</option>)}
                    </select>
                  </div>
                  <InputField label="Ângulo Medido (Graus)" value={angle} set={setAngle} />
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
                  <p className="text-[10px] font-black text-white/50 uppercase italic tracking-widest mb-2">Resultado Flexibilidade</p>
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
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Critérios de Avaliação</p>
               <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-slate-400">Excelente</span>
                    <span className="text-emerald-500">{sitProtocol === 'wells' ? '> 34cm' : '> 15cm'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-slate-400">Regular</span>
                    <span className="text-yellow-500">{sitProtocol === 'wells' ? '21-27cm' : '0-4cm'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-slate-400">Pobre</span>
                    <span className="text-rose-500">{sitProtocol === 'wells' ? '< 21cm' : '< 0cm'}</span>
                  </div>
               </div>
            </div>
          </div>
        ) : testType === 'goniometry' && angle ? (
          <div className="bento-card bg-slate-900 border-slate-800 p-8 overflow-hidden relative">
             <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="space-y-2">
                   <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest leading-none mb-2">{joint}</p>
                   <h3 className="text-6xl font-black text-white italic">{angle}°</h3>
                   <div className="pt-4 border-t border-slate-800">
                      <p className="text-[9px] font-black text-slate-600 uppercase">Valores de Referência (Normal):</p>
                      <p className="text-xl font-black text-slate-400 italic">{joints.find(j => j.name === joint)?.normal}</p>
                   </div>
                </div>
                <div className="w-48 h-48 rounded-full border-8 border-pink-500/10 flex items-center justify-center relative">
                   <div 
                     className="absolute w-2 h-24 bg-pink-500 rounded-full origin-bottom" 
                     style={{ transform: `rotate(${parseFloat(angle)}deg)`, top: '0' }} 
                   />
                   <div className="w-4 h-4 bg-white rounded-full z-20 shadow-lg" />
                </div>
             </div>
          </div>
        ) : (
          <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-900/50 border border-dashed border-slate-800 rounded-[2rem] p-12 text-center group">
             <Activity className="w-16 h-16 text-slate-800 mb-6 group-hover:scale-110 transition-transform" />
             <h3 className="text-xl font-black text-slate-500 uppercase italic">Dados de Mobilidade</h3>
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
  const [view, setView] = useState<'setup' | 'dashboard'>('setup');
  const [model, setModel] = useState<'matveyev' | 'verkhoshansky' | 'issurin' | 'bompa'>('matveyev');
  const [plans, setPlans] = useState<Record<string, PeriodizationPlan>>({});
  const [config, setConfig] = useState({
    age: '',
    frequency: '3',
    goalType: 'aesthetic' as 'aesthetic' | 'sport',
    aestheticGoal: 'hypertrophy',
    sportType: 'futebol',
    sportCapacities: {
      strength: 5,
      speed: 5,
      resistance: 5,
      technique: 5,
    }
  });

  const generateExercises = (goal: string, phase: string): Exercise[] => {
    let exercises = [
      { name: 'Agachamento Livre', sets: 4, reps: '8-12', intensity: '75%', load: '80kg' },
      { name: 'Supino Reto', sets: 4, reps: '8-12', intensity: '75%', load: '70kg' },
      { name: 'Levantamento Terra', sets: 3, reps: '5', intensity: '80%', load: '100kg' },
      { name: 'Remada Curvada', sets: 4, reps: '10', intensity: '70%', load: '60kg' },
      { name: 'Desenvolvimento Militar', sets: 3, reps: '10', intensity: '70%', load: '40kg' },
    ];

    if (config.goalType === 'sport') {
      if (config.sportType === 'futebol') {
        exercises = [
          { name: 'Avanço com Halteres', sets: 3, reps: '10', intensity: '75%', load: '20kg' },
          { name: 'Salto Vertical', sets: 4, reps: '6', intensity: '100%', load: 'BW' },
          { name: 'Sprint 30m', sets: 6, reps: '1', intensity: '95%', load: 'N/A' },
          { name: 'Pliometria Box Jump', sets: 4, reps: '8', intensity: 'Máx', load: 'N/A' },
          { name: 'Copenhagen Plank', sets: 3, reps: '30s', intensity: 'Mod', load: 'BW' },
        ];
      } else if (config.sportType === 'crossfit') {
        exercises = [
          { name: 'Clean & Jerk', sets: 5, reps: '3', intensity: '80%', load: '60kg' },
          { name: 'Thrusters', sets: 3, reps: '15', intensity: '70%', load: '40kg' },
          { name: 'Pull Ups (Butterfly)', sets: 4, reps: 'Max', intensity: 'Intenso', load: 'BW' },
          { name: 'Burpees over bar', sets: 4, reps: '20', intensity: 'Máx', load: 'BW' },
          { name: 'Double Unders', sets: 3, reps: 'Max', intensity: 'Mod', load: 'N/A' },
        ];
      }
    } else {
      if (config.aestheticGoal === 'powerlifting') {
        exercises = [
          { name: 'Agachamento (Competition)', sets: 5, reps: '3', intensity: '85%', load: '140kg' },
          { name: 'Supino (Competition)', sets: 5, reps: '3', intensity: '85%', load: '100kg' },
          { name: 'Terra (Sumo/Conv)', sets: 3, reps: '2', intensity: '90%', load: '180kg' },
          { name: 'Good Morning', sets: 3, reps: '8', intensity: '60%', load: '60kg' },
          { name: 'Board Press', sets: 3, reps: '5', intensity: '80%', load: '110kg' },
        ];
      }
    }

    if (phase.toLowerCase().includes('choque') || phase.toLowerCase().includes('máxima') || phase.toLowerCase().includes('trans')) {
      return exercises.map(ex => ({
        ...ex,
        id: Math.random().toString(36).substr(2, 9),
        reps: ex.reps.includes('s') || ex.reps === 'BW' ? ex.reps : '3-5',
        intensity: '85-90%',
        load: ex.load === 'BW' || ex.load === 'N/A' ? ex.load : (parseInt(ex.load) * 1.15).toFixed(0) + 'kg'
      }));
    }

    if (phase.toLowerCase().includes('realização') || phase.toLowerCase().includes('competitiva')) {
      return exercises.map(ex => ({
        ...ex,
        id: Math.random().toString(36).substr(2, 9),
        reps: ex.reps.includes('s') || ex.reps === 'BW' ? ex.reps : '1-3',
        intensity: '95-100%',
        load: ex.load === 'BW' || ex.load === 'N/A' ? ex.load : (parseInt(ex.load) * 1.25).toFixed(0) + 'kg'
      }));
    }

    return exercises.map(ex => ({
      ...ex,
      id: Math.random().toString(36).substr(2, 9),
    }));
  };

  const generatePlan = (modelType: string): PeriodizationPlan => {
    const mesocycles: Mesocycle[] = [];
    
    if (modelType === 'matveyev') {
      const phases = ['Prep. Geral', 'Prep. Específica', 'Competitiva'];
      phases.forEach((p, i) => {
        const micros: Microcycle[] = [];
        for (let m = 1; m <= 4; m++) {
          micros.push({
            id: `mat-${i}-${m}`,
            name: `Micro ${m + i * 4}`,
            type: m === 4 ? 'Recuperação' : 'Ordinário',
            exercises: generateExercises(config.aestheticGoal, p)
          });
        }
        mesocycles.push({ id: `meso-mat-${i}`, name: p, microcycles: micros });
      });
    } else if (modelType === 'issurin') {
      const phases = ['Acumulação', 'Transmutação', 'Realização'];
      phases.forEach((p, i) => {
        const micros: Microcycle[] = [];
        for (let m = 1; m <= 4; m++) {
          micros.push({
            id: `iss-${i}-${m}`,
            name: `Micro ${m + i * 4}`,
            type: p,
            exercises: generateExercises(config.aestheticGoal, p)
          });
        }
        mesocycles.push({ id: `meso-iss-${i}`, name: p, microcycles: micros });
      });
    } else if (modelType === 'verkhoshansky') {
      const phases = ['Bloco A (Carga)', 'Bloco B (Conversão)', 'Bloco C (Competição)'];
      phases.forEach((p, i) => {
        const micros: Microcycle[] = [];
        for (let m = 1; m <= 4; m++) {
          micros.push({
            id: `verk-${i}-${m}`,
            name: `Micro ${m + i * 4}`,
            type: p,
            exercises: generateExercises(config.aestheticGoal, p)
          });
        }
        mesocycles.push({ id: `meso-verk-${i}`, name: p, microcycles: micros });
      });
    } else {
      const phases = ['Adaptação', 'Força Máxima', 'Conversão'];
      phases.forEach((p, i) => {
        const micros: Microcycle[] = [];
        for (let m = 1; m <= 4; m++) {
          micros.push({
            id: `bom-${i}-${m}`,
            name: `Micro ${m + i * 4}`,
            type: p,
            exercises: generateExercises(config.aestheticGoal, p)
          });
        }
        mesocycles.push({ id: `meso-bom-${i}`, name: p, microcycles: micros });
      });
    }

    return { mesocycles };
  };

  const handleGenerate = () => {
    const newPlans = {
      matveyev: generatePlan('matveyev'),
      issurin: generatePlan('issurin'),
      verkhoshansky: generatePlan('verkhoshansky'),
      bompa: generatePlan('bompa')
    };
    setPlans(newPlans);

    // Logic to select model based on inputs
    if (config.goalType === 'sport') {
      if (config.sportCapacities.strength > 7) setModel('verkhoshansky');
      else setModel('issurin');
    } else {
      if (parseInt(config.frequency) >= 5) setModel('bompa');
      else setModel('matveyev');
    }
    setView('dashboard');
  };

  const updateExercise = (modelKey: string, mesoId: string, microId: string, exId: string, field: keyof Exercise, value: string) => {
    setPlans(prev => {
      const newPlans = { ...prev };
      const plan = newPlans[modelKey];
      const meso = plan.mesocycles.find(m => m.id === mesoId);
      const micro = meso?.microcycles.find(m => m.id === microId);
      const ex = micro?.exercises.find(e => e.id === exId);
      if (ex) {
        (ex as any)[field] = value;
      }
      return newPlans;
    });
  };

  if (view === 'setup') {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Configuração da Periodização</h2>
          <p className="text-slate-400">Insira os dados do aluno para gerar a estrutura ideal de treinamento.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bento-card bg-slate-900 border-slate-800 p-6 space-y-6">
            <h3 className="flex items-center gap-2 text-white font-bold uppercase italic text-sm">
              <ClipboardList className="w-4 h-4 text-blue-500" />
              Dados Básicos e Avaliação
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-slate-500 italic">Idade</label>
                <input 
                  type="number" 
                  value={config.age}
                  onChange={(e) => setConfig({...config, age: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Ex: 25"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-slate-500 italic">Freq. Semanal</label>
                <select 
                  value={config.frequency}
                  onChange={(e) => setConfig({...config, frequency: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
                >
                  {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}x por semana</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/50 space-y-3">
                <p className="text-[10px] uppercase font-black text-slate-500 italic">Resultados de Avaliação (Opcional)</p>
                <div className="grid grid-cols-2 gap-3">
                   <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                     <span className="text-[10px] text-slate-400">Gordura %</span>
                     <span className="text-xs font-bold text-white">18.5%</span>
                   </div>
                   <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800 flex items-center justify-between">
                     <span className="text-[10px] text-slate-400">Peso (kg)</span>
                     <span className="text-xs font-bold text-white">82.0</span>
                   </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bento-card bg-slate-900 border-slate-800 p-6 space-y-6">
            <h3 className="flex items-center gap-2 text-white font-bold uppercase italic text-sm">
              <Target className="w-4 h-4 text-rose-500" />
              Objetivo do Macrocliclo
            </h3>

            <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button 
                onClick={() => setConfig({...config, goalType: 'aesthetic'})}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase italic transition-all ${config.goalType === 'aesthetic' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Estético / Saúde
              </button>
              <button 
                onClick={() => setConfig({...config, goalType: 'sport'})}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase italic transition-all ${config.goalType === 'sport' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Esportivo / Performance
              </button>
            </div>

            {config.goalType === 'aesthetic' ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 gap-2">
                  {['Hipertrofia', 'Emagrecimento', 'Condicionamento Geral', 'Powerlifting'].map(goal => (
                    <button 
                      key={goal}
                      onClick={() => setConfig({...config, aestheticGoal: goal.toLowerCase()})}
                      className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${config.aestheticGoal === goal.toLowerCase() ? 'bg-blue-500/10 border-blue-500/50' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                    >
                      <span className={`text-xs font-bold ${config.aestheticGoal === goal.toLowerCase() ? 'text-blue-400' : 'text-slate-400'}`}>{goal}</span>
                      {config.aestheticGoal === goal.toLowerCase() && <Activity className="w-4 h-4 text-blue-500" />}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="space-y-3">
                  {Object.entries(config.sportCapacities).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] uppercase font-black text-slate-500 italic">
                          {key === 'strength' && 'Capacidade de Força'}
                          {key === 'speed' && 'Capacidade de Velocidade'}
                          {key === 'resistance' && 'Capacidade de Resistência'}
                          {key === 'technique' && 'Capacidade Técnica'}
                        </label>
                        <span className="text-[10px] font-bold text-white">{value}/10</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="10" 
                        value={value}
                        onChange={(e) => setConfig({
                          ...config, 
                          sportCapacities: {...config.sportCapacities, [key]: parseInt(e.target.value)}
                        })}
                        className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-rose-500 border border-slate-800"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={handleGenerate}
          className="w-full bg-white text-black p-6 rounded-3xl font-black uppercase italic text-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(255,255,255,0.1)]"
        >
          <Zap className="w-6 h-6 fill-black" />
          Gerar Periodização Automática
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={() => setView('setup')} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase italic">Voltar para Configuração</span>
        </button>
        
        <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-2xl">
          <div className="flex flex-col">
            <span className="text-[10px] text-blue-500 font-black uppercase italic leading-none">Recomendação WMPS</span>
            <span className="text-xs text-white font-bold">
              {config.goalType === 'aesthetic' ? `Foco em ${config.aestheticGoal}` : `Treino de Performance (${config.sportType})`}
            </span>
          </div>
          <div className="w-px h-6 bg-blue-500/20" />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-black uppercase italic leading-none">Freq. Semanal</span>
            <span className="text-xs text-white font-bold">{config.frequency}x</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PeriodizationModelBtn 
          active={model === 'matveyev'} 
          onClick={() => setModel('matveyev')}
          title="Matveyev"
          subtitle="Clássico Linear"
          icon={<Activity className="w-5 h-5" />}
        />
        <PeriodizationModelBtn 
          active={model === 'verkhoshansky'} 
          onClick={() => setModel('verkhoshansky')}
          title="Verkhoshansky"
          subtitle="Blocos de Choque"
          icon={<Zap className="w-5 h-5" />}
        />
        <PeriodizationModelBtn 
          active={model === 'issurin'} 
          onClick={() => setModel('issurin')}
          title="Issurin (ATR)"
          subtitle="Acum-Trans-Real"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <PeriodizationModelBtn 
          active={model === 'bompa'} 
          onClick={() => setModel('bompa')}
          title="Bompa"
          subtitle="Sistematização"
          icon={<Dumbbell className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-12 space-y-8">
            <div className="bento-card bg-slate-900 border-slate-800 p-8 overflow-hidden relative">
               <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                  <div>
                    <p className="label-caps italic mb-1 text-blue-500">WMPS - Estrutura de Treino Dinâmica</p>
                    <h3 className="text-2xl font-black text-white uppercase italic">
                      {model === 'matveyev' && 'Periodização Clássica (Matveyev)'}
                      {model === 'verkhoshansky' && 'Treinamento em Bloco (Verkhoshansky)'}
                      {model === 'issurin' && 'Modelo ATR (Issurin)'}
                      {model === 'bompa' && 'Sistematização de Bompa'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 bg-slate-950/50 p-3 rounded-2xl border border-slate-800">
                     <LegendItem color="bg-blue-500" label="Volume" />
                     <LegendItem color="bg-rose-500" label="Intensidade" />
                  </div>
               </div>

               <div className="h-64 flex items-end gap-1.5 sm:gap-3 px-2 relative">
                  <div className="absolute inset-x-0 top-0 bottom-12 flex flex-col justify-between py-2 opacity-5 pointer-events-none">
                     {[1,2,3,4,5].map(i => <div key={i} className="border-t border-slate-500 w-full" />)}
                  </div>
                  {Array.from({ length: 12 }).map((_, i) => {
                    const volume = model === 'matveyev' ? (95 - i * 5) : 
                                   model === 'issurin' ? (i < 4 ? 90 : i < 8 ? 60 : 35) :
                                   model === 'verkhoshansky' ? (i < 6 ? 95 : 25) : 85;
                    
                    const intensity = model === 'matveyev' ? (25 + i * 6) : 
                                      model === 'issurin' ? (i < 4 ? 35 : i < 8 ? 85 : 100) :
                                      model === 'verkhoshansky' ? (i < 6 ? 35 : 95) : i * 8 + 10;

                    return (
                      <div key={i} className="flex-1 flex flex-col gap-1 items-center group relative h-full justify-end">
                         <div 
                           className="w-full bg-blue-500/60 rounded-t-sm transition-all duration-700 hover:bg-blue-400" 
                           style={{ height: `${volume}%` }}
                         />
                         <div 
                           className="w-full bg-rose-500/60 rounded-t-sm transition-all duration-700 hover:bg-rose-400" 
                           style={{ height: `${intensity}%` }}
                         />
                         <div className="absolute -bottom-6 text-[8px] font-black text-slate-600 uppercase">S{i+1}</div>
                      </div>
                    );
                  })}
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
               <div className="lg:col-span-8 flex flex-col justify-between p-8 bento-card bg-indigo-600 text-white overflow-hidden relative shadow-2xl">
                  <div className="relative z-10">
                     <h4 className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-60">Fundamentação Metodológica</h4>
                     <p className="text-sm font-bold leading-relaxed max-w-2xl">
                       {model === 'matveyev' && 'Matveyev (Clássico): Baseada na variação ondulatória onde o volume cai e a intensidade sobe linearmente ao longo do tempo.'}
                       {model === 'issurin' && 'Issurin (ATR): Focada na superposição de efeitos residuais através de blocos altamente concentrados (Acumulação, Transmutação e Realização).'}
                       {model === 'verkhoshansky' && 'Verkhoshansky (Choque): Caracterizada por cargas extremamente elevadas e concentradas seguidas por restauração completa e pico.'}
                       {model === 'bompa' && 'Bompa (Sistematização): Combina períodos de adaptação com foco em pico de força máxima antes da conversão para potências específicas.'}
                     </p>
                  </div>
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                    <PhaseCard title="Objetivo" target={config.goalType === 'aesthetic' ? config.aestheticGoal : config.sportType} desc="Meta primária do ciclo." />
                    <PhaseCard title="Nível" target={parseInt(config.age) > 40 ? 'Master' : 'Elite'} desc="Perfil fisiológico." />
                    <PhaseCard title="Volumes" target={model === 'matveyev' ? 'Ondulatório' : 'Concentrado'} desc="Distribuição de carga." />
                  </div>
                  <Activity className="absolute -right-8 -bottom-8 w-48 h-48 opacity-10" />
               </div>

               <div className="lg:col-span-4 bento-card bg-slate-900 border-slate-800 p-8 space-y-6 flex flex-col justify-center">
                  <h4 className="label-caps italic text-white mb-2">Checklist de Metas</h4>
                  <div className="space-y-4">
                     <GoalRow label="Freq. Semanal" val={`${config.frequency}x`} />
                     <GoalRow label="Modelo" val={model === 'issurin' ? "ATR" : "Linear"} />
                     <GoalRow label="Pico Estimado" val="Semana 12" />
                     <GoalRow label="Foco Fisiológico" val={config.goalType === 'sport' ? 'Performance' : 'Hipertrofia'} />
                  </div>
               </div>
            </div>

            <div className="space-y-12">
               {plans[model]?.mesocycles.map((meso) => (
                 <div key={meso.id} className="space-y-6">
                    <div className="flex items-center gap-4">
                       <h4 className="text-xl font-black text-white italic uppercase tracking-tighter">
                         Mesociclo: <span className="text-blue-500">{meso.name}</span>
                       </h4>
                       <div className="h-px flex-1 bg-slate-800" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                       {meso.microcycles.map((micro) => (
                         <div key={micro.id} className="bento-card bg-slate-900 border-slate-800 p-6 space-y-4 hover:border-slate-700 transition-colors">
                            <div className="flex justify-between items-start">
                               <div>
                                  <h5 className="text-sm font-black text-white italic uppercase">{micro.name}</h5>
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{micro.type}</span>
                               </div>
                               <Zap className="w-4 h-4 text-amber-500" />
                            </div>

                            <div className="space-y-3">
                               {micro.exercises.map((ex) => (
                                 <div key={ex.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 group">
                                    <div className="flex justify-between items-center">
                                       <input 
                                         value={ex.name}
                                         onChange={(e) => updateExercise(model, meso.id, micro.id, ex.id, 'name', e.target.value)}
                                         className="bg-transparent border-none text-[10px] font-black text-slate-300 uppercase italic w-full focus:outline-none focus:text-white"
                                       />
                                    </div>
                                    <div className="flex items-center justify-between">
                                       <div className="flex gap-2 text-[9px] font-bold text-slate-500">
                                          <span>{ex.sets}x</span>
                                          <input 
                                            value={ex.reps}
                                            onChange={(e) => updateExercise(model, meso.id, micro.id, ex.id, 'reps', e.target.value)}
                                            className="bg-transparent border-none w-8 p-0 text-slate-400 focus:outline-none"
                                          />
                                       </div>
                                       <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                          <Dumbbell className="w-3 h-3 text-blue-500" />
                                          <input 
                                            value={ex.load}
                                            onChange={(e) => updateExercise(model, meso.id, micro.id, ex.id, 'load', e.target.value)}
                                            className="bg-transparent border-none text-[9px] font-black text-white w-12 text-right focus:outline-none"
                                          />
                                       </div>
                                    </div>
                                 </div>
                               ))}
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
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







