'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { User, ShieldCheck, Activity, BarChart3, Lock, Mail, ChevronRight, LogIn } from 'lucide-react';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Mock login logic - você pode alterar para Supabase Auth depois
    setTimeout(() => {
      if (email.toLowerCase() === 'admin' && password === 'admin') {
        setIsLoggedIn(true);
      } else if (email && password) {
        // Aceita qualquer email/senha preenchidos para demonstração, 
        // mas você pode restringir aqui
        setIsLoggedIn(true);
      } else {
        setError('Credenciais inválidas. Tente admin / admin');
      }
      setLoading(false);
    }, 800);
  };

  return (
    <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 sm:p-12 font-sans relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />

      <AnimatePresence mode="wait">
        {!isLoggedIn ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="max-w-md w-full z-10"
          >
            <div className="text-center mb-8 flex flex-col items-center">
              <div className="bg-black text-emerald-500 border-2 border-emerald-500 font-black px-4 py-1.5 rounded-xl text-3xl italic skew-x-[-10deg] shadow-[0_0_20px_rgba(16,185,129,0.3)] mb-4">
                WMPS
              </div>
              <h1 className="text-xl font-black text-white uppercase italic tracking-widest">Acesso ao Sistema</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">William Moreira Performance System</p>
            </div>

            <div className="bento-card bg-slate-900/40 border-slate-800 backdrop-blur-xl p-8 shadow-2xl">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Usuário / Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                    <input 
                      type="text" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-white text-sm outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Senha</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-white text-sm outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-medium"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="text-[10px] font-bold text-rose-500 uppercase tracking-wider text-center"
                  >
                    {error}
                  </motion.p>
                )}

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black uppercase italic py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2 tracking-widest"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Entrar no Sistema</span>
                      <LogIn className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            <p className="text-center mt-8 text-[9px] text-slate-600 font-bold uppercase tracking-[0.3em]">
              @2026 WMPS. Todos os direitos reservados.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl w-full space-y-8 z-10"
          >
            {/* Header Block */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div className="flex flex-col items-center gap-1">
                <div className="bg-black text-emerald-500 border-2 border-emerald-500 font-black px-4 py-1.5 rounded-xl text-3xl italic skew-x-[-10deg] shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  WMPS
                </div>
                <div className="text-center">
                  <h1 className="text-sm font-black leading-tight text-white uppercase italic tracking-[0.1em]">William Moreira</h1>
                  <p className="text-[9px] text-slate-400 uppercase tracking-[0.3em] font-black -mt-0.5">Performance System</p>
                </div>
              </div>
              <button 
                onClick={() => setIsLoggedIn(false)}
                className="bg-slate-800/50 hover:bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 backdrop-blur-sm transition-all group"
              >
                <p className="text-[10px] text-slate-500 group-hover:text-rose-500 font-black uppercase tracking-wider">Sair do Sistema</p>
              </button>
            </header>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link href="/athlete" className="group">
                <motion.div
                  whileHover={{ scale: 1.02, borderColor: '#3b82f6' }}
                  whileTap={{ scale: 0.98 }}
                  className="bento-card h-[280px] flex flex-col justify-between group-hover:bg-slate-800/80 bg-slate-900/60 transition-all border-slate-800 p-8"
                >
                  <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/20 group-hover:scale-110 transition-transform">
                    <User className="w-7 h-7" />
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-4xl font-black text-white uppercase italic">Área Aluno</h2>
                    <p className="text-sm text-slate-400 font-medium leading-relaxed">Registrar treinamentos, intensidade e percepções de esforço diárias.</p>
                  </div>
                  <div className="flex items-center gap-3 text-blue-400 text-[10px] font-black uppercase tracking-widest">
                    <span>Entrar agora</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </motion.div>
              </Link>

              <Link href="/coach" className="group">
                <motion.div
                  whileHover={{ scale: 1.02, borderColor: '#10b981' }}
                  whileTap={{ scale: 0.98 }}
                  className="bento-card h-[280px] flex flex-col justify-between group-hover:bg-slate-800/80 bg-slate-900/60 transition-all border-slate-800 p-8"
                >
                  <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-7 h-7" />
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-4xl font-black text-white uppercase italic">Professor</h2>
                    <p className="text-sm text-slate-400 font-medium leading-relaxed">Dashboard analítico de performance, cargas agudas e crônicas dos atletas.</p>
                  </div>
                  <div className="flex items-center gap-3 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                    <span>Analisar dados</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </motion.div>
              </Link>
            </div>

            {/* Info Block */}
            <div className="bento-card bg-slate-900/40 border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-6 opacity-80 py-6 px-10 backdrop-blur-sm">
               <div className="flex items-center gap-4 text-center sm:text-left">
                 <div className="p-2 bg-slate-800 rounded-lg">
                    <Activity className="w-5 h-5 text-emerald-500" />
                 </div>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                    William Moreira Performance System <span className="text-emerald-500">V1.0</span>
                 </span>
               </div>
               <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em] text-center sm:text-right italic">
                 Build: 2026.04.29-A
               </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

