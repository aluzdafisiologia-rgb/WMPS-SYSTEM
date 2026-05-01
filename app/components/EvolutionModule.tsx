'use client'

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, TrendingDown, Minus, Activity, ArrowLeft,
  Calendar, CheckCircle, AlertTriangle, ChevronRight, BarChart2
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getAssessments } from '../actions';

interface EvolutionModuleProps {
  athletes: any[];
  onBack: () => void;
}

export default function EvolutionModule({ athletes, onBack }: EvolutionModuleProps) {
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedAthleteId) {
      loadAssessments(selectedAthleteId);
    } else {
      setAssessments([]);
    }
  }, [selectedAthleteId]);

  const loadAssessments = async (id: string) => {
    setLoading(true);
    const data = await getAssessments(id);
    setAssessments(data);
    setLoading(false);
  };

  const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);

  // Funcs auxiliares de evolução
  const calculateChange = (oldVal: number, newVal: number, lowerIsBetter: boolean) => {
    if (!oldVal) return 0;
    const diff = newVal - oldVal;
    const pct = (diff / oldVal) * 100;
    return lowerIsBetter ? -pct : pct; // Se menor é melhor, queda é positivo (%)
  };

  const renderStatusIcon = (change: number) => {
    if (change > 2) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (change < -2) return <TrendingDown className="w-4 h-4 text-rose-500" />;
    return <Minus className="w-4 h-4 text-slate-500" />;
  };

  // Group assessments by type
  const anthro = assessments.filter(a => a.type === 'anthropometric').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const agility = assessments.filter(a => a.type === 'agility').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const power = assessments.filter(a => a.type === 'power').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const endurance = assessments.filter(a => a.type === 'endurance').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getInsights = () => {
    const insights = [];
    if (anthro.length >= 2) {
      const first = anthro[0].data;
      const last = anthro[anthro.length - 1].data;
      if (last.bodyFat && first.bodyFat) {
        const change = calculateChange(first.bodyFat, last.bodyFat, true); // Menor %GC é melhor
        if (change > 2) insights.push({ type: 'positive', msg: `Redução de gordura corporal (${change.toFixed(1)}%) desde a primeira avaliação.` });
        else if (change < -2) insights.push({ type: 'negative', msg: `Aumento no % de gordura corporal detectado.` });
      }
    }

    if (agility.length >= 2) {
      const first = agility[0].data;
      const last = agility[agility.length - 1].data;
      if (last.time && first.time) {
        const change = calculateChange(first.time, last.time, true); // Menor tempo é melhor
        if (change > 0) insights.push({ type: 'positive', msg: `Melhora de ${change.toFixed(1)}% no tempo de Agilidade.` });
        else if (change < 0) insights.push({ type: 'negative', msg: `Queda no rendimento de Agilidade (${Math.abs(change).toFixed(1)}% pior).` });
      }
    }
    
    if (insights.length === 0 && assessments.length > 0) {
      insights.push({ type: 'neutral', msg: 'Mais avaliações necessárias para gerar tendências consistentes.' });
    }

    return insights;
  };

  const insights = getInsights();

  // Preparar dados para Gráfico de Peso e %GC
  const chartDataAnthro = anthro.map(a => ({
    date: new Date(a.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    peso: a.data.weight,
    bodyFat: a.data.bodyFat
  }));

  const chartDataAgility = agility.map(a => ({
    date: new Date(a.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    tempo: a.data.time
  }));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar ao Menu
        </button>
        
        <div className="flex items-center gap-3">
          <select
            value={selectedAthleteId}
            onChange={(e) => setSelectedAthleteId(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-blue-500 transition-colors"
          >
            <option value="">-- Selecione o Atleta --</option>
            {athletes.map(a => (
              <option key={a.id} value={a.id}>{a.full_name}</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedAthleteId ? (
        <div className="bento-card bg-slate-900/50 border-slate-800 flex flex-col items-center justify-center p-12 text-center h-[400px]">
          <Activity className="w-16 h-16 text-slate-700 mb-4" />
          <h2 className="text-xl font-black text-white uppercase italic">Prontuário Evolutivo</h2>
          <p className="text-slate-500 font-medium mt-2 max-w-md">Selecione um atleta acima para visualizar a linha do tempo completa de avaliações e gráficos de progresso.</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : assessments.length === 0 ? (
        <div className="bento-card bg-slate-900/50 border-slate-800 p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-black text-white uppercase">Nenhuma avaliação encontrada</h3>
          <p className="text-slate-500 mt-2">Este atleta ainda não possui histórico de avaliações no sistema.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Coluna Esquerda: Insights & Timeline */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Insights Automáticos */}
            <div className="bento-card bg-slate-900/50 border-slate-800 p-6">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-500" /> Inteligência Evolutiva
              </h3>
              <div className="space-y-3">
                {insights.map((ins, i) => (
                  <div key={i} className={`p-3 rounded-lg border text-xs font-bold flex gap-3 ${
                    ins.type === 'positive' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                    ins.type === 'negative' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                    'bg-slate-800 border-slate-700 text-slate-300'
                  }`}>
                    {ins.type === 'positive' && <CheckCircle className="w-4 h-4 shrink-0" />}
                    {ins.type === 'negative' && <AlertTriangle className="w-4 h-4 shrink-0" />}
                    {ins.type === 'neutral' && <Activity className="w-4 h-4 shrink-0" />}
                    <span>{ins.msg}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Linha do Tempo */}
            <div className="bento-card bg-slate-900/50 border-slate-800 p-6">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" /> Histórico (Timeline)
              </h3>
              <div className="relative border-l-2 border-slate-800 ml-3 space-y-8 pb-4">
                {assessments.slice().reverse().map((a, i) => (
                  <div key={a.id} className="relative pl-6">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 bg-slate-900 border-2 border-blue-500 rounded-full" />
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{new Date(a.date).toLocaleDateString('pt-BR')}</p>
                      <h4 className="text-sm font-black text-white capitalize">{a.type.replace('assessment_', '')}</h4>
                      <div className="mt-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 text-xs text-slate-300 space-y-1">
                        {Object.entries(a.data).map(([k, v]) => (
                          <div key={k} className="flex justify-between">
                            <span className="capitalize text-slate-500">{k}:</span>
                            <span className="font-bold text-white">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna Direita: Gráficos de Evolução */}
          <div className="lg:col-span-2 space-y-6">
            
            {chartDataAnthro.length > 0 && (
              <div className="bento-card bg-slate-900/50 border-slate-800 p-6">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Evolução: Peso e %GC</h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartDataAnthro}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickMargin={10} />
                      <YAxis yAxisId="left" stroke="#94a3b8" fontSize={10} />
                      <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Line yAxisId="left" type="monotone" dataKey="peso" name="Peso (kg)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} />
                      <Line yAxisId="right" type="monotone" dataKey="bodyFat" name="Gordura (%)" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {chartDataAgility.length > 0 && (
              <div className="bento-card bg-slate-900/50 border-slate-800 p-6">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Evolução: Agilidade (segundos)</h3>
                <p className="text-xs text-slate-500 mb-4 italic">* Gráfico invertido: Menor tempo = Maior performance</p>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartDataAgility}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickMargin={10} />
                      <YAxis reversed stroke="#94a3b8" fontSize={10} domain={['dataMin - 1', 'dataMax + 1']} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Line type="monotone" dataKey="tempo" name="Tempo (s)" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {chartDataAnthro.length === 0 && chartDataAgility.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 py-20">
                <BarChart2 className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm font-bold">Sem dados suficientes para gerar gráficos de evolução.</p>
              </div>
            )}

          </div>

        </div>
      )}
    </div>
  );
}
