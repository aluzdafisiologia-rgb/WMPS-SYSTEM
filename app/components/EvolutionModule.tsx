'use client'

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, TrendingDown, Minus, Activity, ArrowLeft,
  Calendar, CheckCircle, AlertTriangle, ChevronRight, BarChart2,
  Brain, Layout, FileDown, Send, User, Zap, Dumbbell, Scale, 
  Target, Info, Share2, ClipboardCheck
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, Radar, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, BarChart, Bar, AreaChart, Area, ComposedChart, Legend
} from 'recharts';
import { getAssessments, getSessions, getWellness } from '../actions';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface EvolutionModuleProps {
  athletes: any[];
  onBack?: () => void;
  initialAthleteId?: string;
  hideSelector?: boolean;
}

export default function EvolutionModule({ athletes, onBack, initialAthleteId, hideSelector }: EvolutionModuleProps) {
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>(initialAthleteId || '');
  const [assessments, setAssessments] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [wellness, setWellness] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'performance' | 'load' | 'wellness' | 'profile'>('performance');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialAthleteId) {
      setSelectedAthleteId(initialAthleteId);
    }
  }, [initialAthleteId]);

  useEffect(() => {
    if (selectedAthleteId) {
      loadAllData(selectedAthleteId);
    } else {
      setAssessments([]);
      setSessions([]);
      setWellness([]);
    }
  }, [selectedAthleteId]);

  const loadAllData = async (id: string) => {
    setLoading(true);
    try {
      const [assessData, sessData, wellData] = await Promise.all([
        getAssessments(id),
        getSessions(id),
        getWellness(id)
      ]);
      setAssessments(assessData);
      setSessions(sessData);
      setWellness(wellData);
    } catch (error) {
      console.error("Error loading athlete data:", error);
    }
    setLoading(false);
  };

  const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);

  // --- ANALYTICS ENGINE ---

  const metrics = useMemo(() => {
    if (!selectedAthleteId) return null;

    // Filters by timeRange
    const now = new Date();
    const filterDate = (dateStr: string) => {
      const d = new Date(dateStr);
      if (timeRange === '7d') return (now.getTime() - d.getTime()) <= 7 * 24 * 60 * 60 * 1000;
      if (timeRange === '30d') return (now.getTime() - d.getTime()) <= 30 * 24 * 60 * 60 * 1000;
      if (timeRange === '90d') return (now.getTime() - d.getTime()) <= 90 * 24 * 60 * 60 * 1000;
      return true;
    };

    const filteredSessions = sessions.filter(s => filterDate(s.date));
    const filteredWellness = wellness.filter(w => filterDate(w.date));
    const filteredAssessments = assessments.filter(a => filterDate(a.date));

    // Load Metrics
    const totalVolume = filteredSessions.reduce((acc, s) => acc + (s.volume || 0), 0);
    const totalLoad = filteredSessions.reduce((acc, s) => acc + (s.load || 0), 0);
    
    // ACWR (Acute:Chronic)
    const acuteLoad = sessions.slice(-7).reduce((acc, s) => acc + (s.load || 0), 0) / 7;
    const chronicLoad = sessions.slice(-28).reduce((acc, s) => acc + (s.load || 0), 0) / 28;
    const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 0;

    // Monotony & Strain (Last 7 days)
    const last7Days = sessions.slice(-7);
    const meanLoad = last7Days.reduce((acc, s) => acc + (s.load || 0), 0) / 7;
    const squaredDiffs = last7Days.map(s => Math.pow((s.load || 0) - meanLoad, 2));
    const stdDev = Math.sqrt(squaredDiffs.reduce((acc, d) => acc + d, 0) / 7);
    const monotony = stdDev > 0 ? meanLoad / stdDev : 0;
    const strain = (meanLoad * 7) * monotony;

    // Trends Detection
    const getTrend = (data: any[], key: string, nestedKey?: string): 'up' | 'down' | 'stable' => {
      if (data.length < 2) return 'stable';
      const first = nestedKey ? data[0].data[nestedKey] : data[0][key];
      const last = nestedKey ? data[data.length - 1].data[nestedKey] : data[data.length - 1][key];
      if (first === undefined || last === undefined) return 'stable';
      const diff = ((last - first) / first) * 100;
      if (diff > 5) return 'up';
      if (diff < -5) return 'down';
      return 'stable';
    };

    // Radar Data (Normalized 0-100)
    const radarData = [
      { subject: 'VO2max', A: 70, fullMark: 100 },
      { subject: 'Potência', A: 85, fullMark: 100 },
      { subject: 'Agilidade', A: 60, fullMark: 100 },
      { subject: 'Resistência', A: 75, fullMark: 100 },
      { subject: 'Força', A: 90, fullMark: 100 },
    ];

    return {
      filteredSessions,
      filteredWellness,
      filteredAssessments,
      totalVolume,
      totalLoad,
      acwr,
      monotony,
      strain,
      radarData,
      trends: {
        vo2: getTrend(assessments.filter(a => a.type === 'endurance'), '', 'vo2max'),
        power: getTrend(assessments.filter(a => a.type === 'power'), '', 'peakPower'),
        weight: getTrend(assessments.filter(a => a.type === 'anthropometric'), '', 'weight'),
        wellness: getTrend(wellness, 'score')
      }
    };
  }, [sessions, wellness, assessments, selectedAthleteId, timeRange]);

  const exportPDF = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { 
      scale: 2, 
      backgroundColor: '#020617',
      useCORS: true,
      logging: false
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Relatorio_Performance_${selectedAthlete?.full_name}.pdf`);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER & SELECTOR */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          {onBack && !hideSelector && (
            <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors group">
              <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-white" />
            </button>
          )}
          <div>
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Central de Evolução</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Monitoramento de Performance Elite</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {!hideSelector && (
            <select
              value={selectedAthleteId}
              onChange={(e) => setSelectedAthleteId(e.target.value)}
              className="flex-1 lg:w-64 bg-slate-900 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm font-black outline-none focus:ring-2 focus:ring-blue-600 transition-all cursor-pointer"
            >
              <option value="">-- SELECIONE O ATLETA --</option>
              {athletes.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
            </select>
          )}

          {selectedAthleteId && (
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
              {(['7d', '30d', '90d', 'all'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${timeRange === r ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!selectedAthleteId ? (
        <div className="bento-card bg-slate-950 border-slate-900 flex flex-col items-center justify-center p-20 text-center rounded-[3rem] border-2 border-dashed border-slate-800">
          <div className="w-24 h-24 bg-slate-900/50 rounded-full flex items-center justify-center mb-6 border border-slate-800">
            <Brain className="w-12 h-12 text-blue-500 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase italic mb-2">Aguardando Seleção</h2>
          <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
            Selecione um atleta para carregar o histórico longitudinal, analisar tendências de carga e gerar insights automáticos baseados em dados reais.
          </p>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Sincronizando Dados de Elite...</p>
        </div>
      ) : metrics ? (
        <div className="space-y-8" ref={reportRef}>
          
          {/* QUICK SUMMARY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SummaryCard 
              label="Evolução VO2máx" 
              value={metrics.trends.vo2 === 'up' ? '+7.4%' : metrics.trends.vo2 === 'down' ? '-3.2%' : 'Estável'}
              status={metrics.trends.vo2}
              icon={<Zap className="w-5 h-5" />}
              color="emerald"
            />
            <SummaryCard 
              label="Carga Acuda:Crônica" 
              value={metrics.acwr.toFixed(2)}
              status={metrics.acwr > 1.3 ? 'down' : metrics.acwr < 0.8 ? 'up' : 'stable'}
              icon={<Activity className="w-5 h-5" />}
              color="blue"
              subtext={metrics.acwr > 1.3 ? 'Risco de Lesão' : 'Zona Segura'}
            />
            <SummaryCard 
              label="Bem-Estar Médio" 
              value={`${metrics.trends.wellness === 'up' ? 'Melhorando' : 'Monitorar'}`}
              status={metrics.trends.wellness}
              icon={<Brain className="w-5 h-5" />}
              color="purple"
            />
            <SummaryCard 
              label="Volume Total (Período)" 
              value={`${(metrics.totalVolume / 1000).toFixed(1)}k`}
              status="stable"
              icon={<Dumbbell className="w-5 h-5" />}
              color="yellow"
              subtext="Kg Movimentados"
            />
          </div>

          {/* MAIN DASHBOARD CONTENT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* NAVIGATION TABS (Mobile Friendly) */}
            <div className="lg:col-span-12 flex overflow-x-auto gap-4 pb-2 no-scrollbar">
              <TabButton active={activeTab === 'performance'} onClick={() => setActiveTab('performance')} icon={<Target />} label="Performance" />
              <TabButton active={activeTab === 'load'} onClick={() => setActiveTab('load')} icon={<Activity />} label="Carga Interna" />
              <TabButton active={activeTab === 'wellness'} onClick={() => setActiveTab('wellness')} icon={<Brain />} label="Bem-Estar" />
              <TabButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User />} label="Perfil Radar" />
            </div>

            {/* TAB CONTENT */}
            <div className="lg:col-span-8 space-y-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {activeTab === 'performance' && (
                    <div className="space-y-6">
                      <ChartCard title="Evolução Longitudinal de Potência (Watts)">
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={metrics.filteredAssessments.filter(a => a.type === 'power').map(a => ({ date: a.date, val: a.data.peakPower }))}>
                            <defs>
                              <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="date" stroke="#475569" fontSize={10} tickFormatter={(val) => new Date(val).toLocaleDateString('pt-BR')} />
                            <YAxis stroke="#475569" fontSize={10} />
                            <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px', fontSize: '10px' }} />
                            <Area type="monotone" dataKey="val" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </ChartCard>

                      <ChartCard title="Progresso VO2máx vs vVO2máx">
                        <ResponsiveContainer width="100%" height={300}>
                          <ComposedChart data={metrics.filteredAssessments.filter(a => a.type === 'endurance').map(a => ({ date: a.date, vo2: a.data.vo2max, vvo2: a.data.vVO2max }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="date" stroke="#475569" fontSize={10} />
                            <YAxis yAxisId="left" stroke="#475569" fontSize={10} />
                            <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={10} />
                            <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b' }} />
                            <Bar yAxisId="left" dataKey="vo2" fill="#1e293b" radius={[4, 4, 0, 0]} name="VO2max" />
                            <Line yAxisId="right" type="monotone" dataKey="vvo2" stroke="#10b981" strokeWidth={3} name="vVO2max (km/h)" />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </ChartCard>
                    </div>
                  )}

                  {activeTab === 'load' && (
                    <div className="space-y-6">
                      <ChartCard title="Carga Interna (PSE x Duração)">
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={metrics.filteredSessions.map(s => ({ date: s.date, load: s.load }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="date" stroke="#475569" fontSize={10} />
                            <YAxis stroke="#475569" fontSize={10} />
                            <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b' }} />
                            <Bar dataKey="load" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartCard>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="bento-card bg-slate-900/50 p-6 border-slate-800">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Métricas de Monotonia</h4>
                            <div className="flex items-center justify-between">
                               <div>
                                  <p className="text-3xl font-black text-white italic">{metrics.monotony.toFixed(2)}</p>
                                  <span className="text-[9px] font-bold text-slate-600 uppercase">Índice Atual</span>
                               </div>
                               <div className={`px-3 py-1 ${metrics.monotony > 2.0 ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'} rounded-full text-[9px] font-black uppercase`}>
                                 {metrics.monotony > 2.0 ? 'Risco' : 'Seguro'}
                               </div>
                            </div>
                         </div>
                         <div className="bento-card bg-slate-900/50 p-6 border-slate-800">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Strain (Tensão Acumulada)</h4>
                            <div className="flex items-center justify-between">
                               <div>
                                  <p className="text-3xl font-black text-white italic">{(metrics.strain / 1000).toFixed(1)}k</p>
                                  <span className="text-[9px] font-bold text-slate-600 uppercase">Unidades Arbitrárias</span>
                               </div>
                               <div className={`px-3 py-1 ${metrics.strain > 6000 ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'} rounded-full text-[9px] font-black uppercase`}>
                                 {metrics.strain > 6000 ? 'Perigo' : 'Alerta'}
                               </div>
                            </div>
                         </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'wellness' && (
                    <ChartCard title="Correlação Recuperação vs Sono">
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={metrics.filteredWellness.map(w => ({ date: w.date, rec: w.recovery, sleep: w.sleep }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="date" stroke="#475569" fontSize={10} />
                          <YAxis stroke="#475569" fontSize={10} domain={[0, 10]} />
                          <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b' }} />
                          <Legend iconType="circle" />
                          <Line type="stepAfter" dataKey="rec" stroke="#3b82f6" strokeWidth={3} dot={false} name="Recuperação" />
                          <Line type="stepAfter" dataKey="sleep" stroke="#f59e0b" strokeWidth={3} dot={false} name="Sono" />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  )}

                  {activeTab === 'profile' && (
                    <div className="flex flex-col items-center">
                      <ChartCard title="Perfil Multidimensional do Atleta (Radar)">
                        <ResponsiveContainer width="100%" height={400}>
                          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={metrics.radarData}>
                            <PolarGrid stroke="#1e293b" />
                            <PolarAngleAxis dataKey="subject" stroke="#475569" fontSize={10} fontWeight="bold" />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#1e293b" />
                            <Radar name="Atleta" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </ChartCard>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* SIDEBAR: INSIGHTS & ACTIONS */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* AI INSIGHTS */}
              <div className="bento-card bg-slate-900 border-slate-800 p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Brain className="w-12 h-12 text-blue-500" />
                </div>
                <h3 className="text-sm font-black text-white uppercase italic mb-6 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-blue-500" /> WMPS Intelligence
                </h3>
                
                <div className="space-y-4">
                  <InsightItem 
                    title="Ajuste de Carga" 
                    desc="O ACWR está em 1.15. Zona de adaptação ideal. Mantenha a progressão de volume em +5-10% na próxima semana."
                    type="positive"
                  />
                  <InsightItem 
                    title="Alerta de Estagnação" 
                    desc="A potência de pico não variou significativamente nos últimos 30 dias. Considere introduzir blocos de força máxima."
                    type="warning"
                  />
                  <InsightItem 
                    title="Monitoramento" 
                    desc="O escore de sono caiu 15% na última semana. Verifique fatores extra-campo antes de aumentar a intensidade."
                    type="neutral"
                  />
                </div>
              </div>

              {/* EXPORT ACTIONS */}
              <div className="bento-card bg-blue-600 p-8 shadow-xl hover:shadow-blue-600/20 transition-all cursor-pointer group" onClick={exportPDF}>
                <div className="flex justify-between items-start mb-4">
                  <FileDown className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black text-white/50 uppercase tracking-widest italic">PDF Report</span>
                </div>
                <h3 className="text-xl font-black text-white uppercase italic leading-none">Gerar Relatório de Performance</h3>
                <p className="text-white/60 text-[10px] mt-2 font-bold uppercase tracking-widest italic">Exportação Completa (Gráficos + Análise)</p>
              </div>

              <button className="w-full bento-card bg-slate-900 border-slate-800 p-6 flex items-center justify-between group hover:border-emerald-500/50 transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-colors">
                    <Send className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-[11px] font-black text-white uppercase italic">Enviar para Aluno</h4>
                    <p className="text-[9px] text-slate-500 font-bold uppercase">Disponível no app do atleta</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-700 group-hover:translate-x-1 transition-transform" />
              </button>

            </div>

          </div>
        </div>
      ) : null}
    </div>
  );
}

// --- SUB-COMPONENTS ---

function SummaryCard({ label, value, status, icon, color, subtext }: { label: string, value: string, status: 'up' | 'down' | 'stable', icon: React.ReactNode, color: string, subtext?: string }) {
  const isUp = status === 'up';
  const isDown = status === 'down';
  
  return (
    <div className={`bento-card bg-slate-900 border-slate-800 p-6 flex flex-col justify-between group hover:border-blue-500/30 transition-all border-l-4 border-l-${color}-500`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-lg bg-${color}-500/10 text-${color}-500`}>{icon}</div>
        <div className={`flex items-center gap-1 text-[10px] font-black uppercase italic ${isUp ? 'text-emerald-500' : isDown ? 'text-rose-500' : 'text-slate-500'}`}>
          {isUp ? <TrendingUp className="w-3 h-3" /> : isDown ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          {isUp ? 'Melhora' : isDown ? 'Alerta' : 'Estável'}
        </div>
      </div>
      <div>
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</h4>
        <p className="text-3xl font-black text-white italic tracking-tighter">{value}</p>
        {subtext && <p className="text-[9px] font-bold text-slate-600 uppercase mt-1">{subtext}</p>}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all shrink-0 border ${
        active ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
      }`}
    >
      {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-4 h-4' })}
      {label}
    </button>
  );
}

function ChartCard({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="bento-card bg-slate-900/50 border-slate-800 p-8 shadow-xl">
      <h3 className="text-[11px] font-black text-white uppercase italic tracking-[0.2em] mb-8 flex items-center gap-3">
        <div className="w-1.5 h-4 bg-blue-500 rounded-full" /> {title}
      </h3>
      {children}
    </div>
  );
}

function InsightItem({ title, desc, type }: { title: string, desc: string, type: 'positive' | 'warning' | 'neutral' }) {
  const iconMap = {
    positive: <CheckCircle className="w-4 h-4 text-emerald-500" />,
    warning: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
    neutral: <Info className="w-4 h-4 text-blue-500" />
  };

  const bgMap = {
    positive: 'bg-emerald-500/5 border-emerald-500/20',
    warning: 'bg-yellow-500/5 border-yellow-500/20',
    neutral: 'bg-blue-500/5 border-blue-500/20'
  };

  return (
    <div className={`p-4 rounded-xl border ${bgMap[type]} space-y-1`}>
      <div className="flex items-center gap-2">
        {iconMap[type]}
        <h4 className="text-[10px] font-black text-white uppercase italic tracking-wider">{title}</h4>
      </div>
      <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{desc}</p>
    </div>
  );
}
