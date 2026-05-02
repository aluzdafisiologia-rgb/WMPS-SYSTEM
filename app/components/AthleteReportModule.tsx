'use client'

import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { FileText, Download, Activity, Heart, Calendar, Shield, Info, TrendingUp, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ReportData {
  profile: any;
  clinicalProfile: any;
  clinicalLogs: any[];
  readinessHistory: any[];
  menstrualData: any;
}

export default function AthleteReportModule({ data }: { data: ReportData }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    const element = document.getElementById('clinical-report-template');
    if (!element || !data.profile) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Relatorio_Clinico_${data.profile?.full_name?.replace(' ', '_') || 'Atleta'}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getReadinessClass = (score: number) => {
    if (score >= 85) return { label: 'ALTA', color: 'text-emerald-600' };
    if (score >= 70) return { label: 'BOA', color: 'text-blue-600' };
    if (score >= 50) return { label: 'MODERADA', color: 'text-amber-600' };
    return { label: 'BAIXA', color: 'text-rose-600' };
  };

  const generateInsights = () => {
    const avgScore = data.readinessHistory.reduce((acc, curr) => acc + curr.score, 0) / (data.readinessHistory.length || 1);
    const trend = avgScore >= 70 ? 'estável e positiva' : 'que requer atenção na recuperação';
    
    let text = `O atleta apresenta uma prontidão média de ${Math.round(avgScore)}%, indicando uma capacidade de carga ${trend}. `;
    
    if (data.clinicalProfile?.has_diabetes) {
      const avgGlucose = data.clinicalLogs.reduce((acc, curr) => acc + (curr.glucose_pre || 0), 0) / (data.clinicalLogs.length || 1);
      text += `O monitoramento glicêmico médio pré-treino está em ${Math.round(avgGlucose)} mg/dL, demonstrando controle metabólico adequado ao esforço. `;
    }

    return text;
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-2xl">
            <FileText className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white uppercase italic">Centro de Relatórios</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Geração de Laudos Clínico-Esportivos</p>
          </div>
        </div>
        <button 
          onClick={generatePDF}
          disabled={isGenerating}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {isGenerating ? 'Processando...' : 'Exportar PDF Profissional'}
        </button>
      </div>

      {/* HIDDEN TEMPLATE FOR PDF GENERATION */}
      <div className="fixed left-[-9999px] top-0">
        <div id="clinical-report-template" className="w-[210mm] min-h-[297mm] bg-white p-[20mm] text-slate-900 font-sans">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-black text-emerald-500 font-black px-3 py-1 rounded text-xl italic">WMPS</div>
                <h1 className="text-2xl font-black uppercase tracking-tighter">Relatório Clínico-Esportivo</h1>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">William Moreira Performance System</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase">Data de Emissão</p>
              <p className="text-sm font-bold">{new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 mb-10">
            <section className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-blue-600 border-b border-blue-100 pb-2 flex items-center gap-2">
                <Shield className="w-3 h-3" /> 1. Identificação do Atleta
              </h2>
              <div className="space-y-1">
                <p className="text-[11px]"><span className="font-black uppercase text-slate-400 mr-2">Nome:</span> <span className="font-bold">{data.profile?.full_name || 'N/A'}</span></p>
                <p className="text-[11px]"><span className="font-black uppercase text-slate-400 mr-2">E-mail:</span> <span className="font-bold">{data.profile?.email || 'N/A'}</span></p>
                <p className="text-[11px]"><span className="font-black uppercase text-slate-400 mr-2">Esporte:</span> <span className="font-bold">{data.profile?.sport || 'N/A'}</span></p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-rose-600 border-b border-rose-100 pb-2 flex items-center gap-2">
                <Heart className="w-3 h-3" /> 2. Perfil Clínico
              </h2>
              <div className="space-y-1">
                <p className="text-[11px]"><span className="font-black uppercase text-slate-400 mr-2">Comorbidades:</span> 
                  <span className="font-bold">
                    {[
                      data.clinicalProfile?.has_diabetes && 'Diabetes',
                      data.clinicalProfile?.has_hypertension && 'Hipertensão',
                      data.clinicalProfile?.has_cardiac && 'Cardiopatia',
                      data.clinicalProfile?.has_orthopedic && 'Ortopédico'
                    ].filter(Boolean).join(', ') || 'Nenhuma declarada'}
                  </span>
                </p>
                <p className="text-[11px]"><span className="font-black uppercase text-slate-400 mr-2">Medicações:</span> <span className="font-bold">{data.clinicalProfile?.medications || 'Nenhum uso contínuo'}</span></p>
              </div>
            </section>
          </div>

          <section className="mb-10 p-6 bg-slate-50 rounded-2xl border border-slate-100">
             <h2 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-3 h-3" /> 3. Análise de Prontidão (Média 7 Dias)
              </h2>
              <div className="flex items-center gap-8">
                <div className="text-center px-8 border-r border-slate-200">
                   <p className="text-4xl font-black text-slate-900">{Math.round((data.readinessHistory || []).reduce((acc, curr) => acc + curr.score, 0) / (data.readinessHistory?.length || 1))}%</p>
                   <p className={`text-[10px] font-black uppercase tracking-widest ${getReadinessClass(data.readinessHistory?.[0]?.score || 0).color}`}>
                    {getReadinessClass(data.readinessHistory?.[0]?.score || 0).label} PRONTIDÃO
                   </p>
                </div>
                <div className="flex-1">
                   <p className="text-[11px] leading-relaxed text-slate-600 italic font-medium">
                     "{generateInsights()}"
                   </p>
                </div>
              </div>
          </section>

          <div className="grid grid-cols-2 gap-12 mb-10">
             <section className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-widest text-blue-600 border-b border-blue-100 pb-2 flex items-center gap-2">
                  <Activity className="w-3 h-3" /> 4. Monitoramento Diário
                </h2>
                <div className="space-y-2">
                   {(data.clinicalLogs || []).slice(0, 3).map((log: any, idx: number) => (
                     <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase">{new Date(log.date).toLocaleDateString('pt-BR')}</span>
                        <div className="flex gap-4">
                           {log.glucose_pre && <span className="text-[10px] font-bold">GLI: {log.glucose_pre}</span>}
                           {log.bp_sys && <span className="text-[10px] font-bold">PA: {log.bp_sys}/{log.bp_dia}</span>}
                        </div>
                     </div>
                   ))}
                </div>
             </section>

             {data.profile?.gender === 'Feminino' && data.menstrualData?.cycle && (
               <section className="space-y-4">
                  <h2 className="text-xs font-black uppercase tracking-widest text-rose-600 border-b border-rose-100 pb-2 flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> 5. Ciclo Menstrual
                  </h2>
                  <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                    <p className="text-[11px] font-bold text-rose-900 uppercase italic">Fase atual detectada</p>
                    <p className="text-sm font-black text-rose-600 uppercase mt-1">Fisiologia de Performance</p>
                    <p className="text-[9px] text-rose-700 font-medium mt-2 leading-relaxed">
                      Atleta em fase anabólica estrogênica. Resposta otimizada para treinamentos de força e alta intensidade.
                    </p>
                  </div>
               </section>
             )}
          </div>

          <section className="mt-auto pt-10 border-t border-slate-100">
             <div className="flex items-start gap-4">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-slate-900 uppercase">Parecer Técnico Recomendado</h4>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1">
                    Este documento é um resumo de monitoramento e não substitui consulta médica presencial. Recomenda-se a manutenção da hidratação e sono regular para preservar os índices de prontidão detectados.
                  </p>
                </div>
             </div>
             <div className="mt-12 text-center">
                <div className="w-48 h-[1px] bg-slate-300 mx-auto mb-2"></div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assinado Digitalmente por WMPS Engine</p>
             </div>
          </section>
        </div>
      </div>
    </div>
  );
}
