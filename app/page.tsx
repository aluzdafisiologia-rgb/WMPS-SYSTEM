'use client'

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { User, ShieldCheck, Activity, BarChart3 } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-6 sm:p-12 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full space-y-8"
      >
        {/* Header Block */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <Link href="/" className="bg-black text-emerald-500 border-2 border-emerald-500 font-black px-4 py-1.5 rounded-xl text-3xl italic skew-x-[-10deg] shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              WMPS
            </Link>
            <div className="text-center">
              <h1 className="text-sm font-black leading-tight text-white uppercase italic tracking-[0.1em]">William Moreira</h1>
              <p className="text-[9px] text-slate-400 uppercase tracking-[0.3em] font-black -mt-0.5">Performance System</p>
            </div>
          </div>
          <div className="bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700 backdrop-blur-sm hidden sm:block">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Acesso ao Sistema</p>
          </div>
        </header>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/athlete" className="group">
            <motion.div
              whileHover={{ scale: 1.01, borderColor: '#3b82f6' }}
              whileTap={{ scale: 0.99 }}
              className="bento-card h-[280px] flex flex-col justify-between group-hover:bg-slate-800/80"
            >
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                <User className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-white uppercase italic">Área Aluno</h2>
                <p className="text-sm text-slate-400 font-medium">Registrar treinamentos, intensidade e percepções de esforço diárias.</p>
              </div>
              <div className="flex items-center gap-2 text-blue-400 text-[10px] font-bold uppercase tracking-widest">
                <span>Entrar agora</span>
                <div className="h-0.5 w-6 bg-blue-400"></div>
              </div>
            </motion.div>
          </Link>

          <Link href="/coach" className="group">
            <motion.div
              whileHover={{ scale: 1.01, borderColor: '#10b981' }}
              whileTap={{ scale: 0.99 }}
              className="bento-card h-[280px] flex flex-col justify-between border-slate-700"
            >
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-white uppercase italic">Professor</h2>
                <p className="text-sm text-slate-400 font-medium">Dashboard analítico de performance, cargas agudas e crônicas dos atletas.</p>
              </div>
              <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                <span>Analisar dados</span>
                <div className="h-0.5 w-6 bg-emerald-400"></div>
              </div>
            </motion.div>
          </Link>
        </div>

        {/* Info Block */}
        <div className="bento-card bg-slate-900 border-none flex flex-col sm:flex-row items-center justify-between gap-6 opacity-80 py-4 px-8">
           <div className="flex items-center gap-3 text-center sm:text-left">
             <Activity className="w-5 h-5 text-slate-500" />
             <span className="label-caps">William Moreira Performance System V1.0</span>
           </div>
           <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider text-center sm:text-right">@2026 WMPS. Todos os direitos reservados.</p>
        </div>
      </motion.div>
    </main>
  );
}
