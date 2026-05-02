'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Activity, BarChart3, Lock, Mail, ChevronRight, 
  LogIn, UserPlus, ArrowLeft, Calendar, Ruler, Weight, 
  Trophy, Target, Zap, ChevronLeft
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { registerProfile, submitRegistrationRequest, getUserRole } from './actions';

type ViewState = 'login' | 'register' | 'selection';

export default function Home() {
  const [view, setView] = useState<ViewState>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Registration State
  const [regStep, setRegStep] = useState(1);
  const [regData, setRegData] = useState({
    fullName: '',
    email: '',
    birthDate: '',
    cpf: '',
    phone: '',
    guardianName: '',
    guardianCpf: '',
    guardianPhone: '',
    guardianRelationship: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      alert('Sistema de login indisponível. Verifique as chaves.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (loginError || !data.user) {
        setError('Credenciais inválidas ou usuário inexistente.');
        setLoading(false);
        return;
      }

      // Buscar o papel do usuário via Server Action (bypassing RLS client-side)
      const role = await getUserRole(data.user.id);


      if (role === 'admin') {
        window.location.href = '/admin';
      } else if (role === 'coach') {
        window.location.href = '/coach';
      } else {
        setError(`Acesso negado: Seu cargo atual é "${role}". Contate o administrador.`);
        setLoading(false);
        // Opcional: redirecionar após alguns segundos ou deixar o usuário ver o erro
        setTimeout(() => { window.location.href = '/athlete'; }, 3000);
      }
    } catch (err: any) {
      console.error('Erro inesperado:', err);
      setError('Erro inesperado ao tentar entrar.');
    } finally {
      setLoading(false);
    }
  };

  const isMinor = (dateString: string) => {
    if (!dateString) return false;
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age < 18;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regStep === 1) {
      setRegStep(2);
      return;
    }

    setLoading(true);
    try {
      const result = await submitRegistrationRequest({
        ...regData,
        isMinor: isMinor(regData.birthDate)
      });

      if (result.success) {
        setView('login');
        alert('Solicitação enviada com sucesso! Aguarde o contato por e-mail.');
        setRegData({ fullName: '', email: '', birthDate: '', cpf: '', phone: '', guardianName: '', guardianCpf: '', guardianPhone: '', guardianRelationship: '' });
        setRegStep(1);
      } else {
        alert('ERRO NO SUPABASE: ' + result.error);
        setError('Erro ao enviar solicitação: ' + result.error);
      }
    } catch (err: any) {
      console.error(err);
      alert('ERRO INESPERADO: ' + (err.message || 'Erro desconhecido'));
      setError('Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const updateReg = (field: string, value: string) => {
    setRegData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 sm:p-12 font-sans relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />

      <AnimatePresence mode="wait">
        {view === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-md w-full z-10"
          >
            <div className="flex flex-col items-center gap-1 mb-10">
              <div className="bg-black text-emerald-500 border-2 border-emerald-500 font-black px-8 py-2 rounded-xl text-4xl italic skew-x-[-15deg] shadow-[0_0_30px_rgba(16,185,129,0.3)] mb-4 border-l-[12px]">
                WMPS
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-black leading-tight text-white uppercase italic tracking-[0.05em] drop-shadow-sm">William Moreira</h1>
                <p className="text-xs text-emerald-500 uppercase tracking-[0.4em] font-black -mt-1 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">Performance System</p>
              </div>
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
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-white text-sm outline-none focus:border-emerald-500/50 transition-all font-medium"
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
                      placeholder="Sua senha"
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-white text-sm outline-none focus:border-emerald-500/50 transition-all font-medium"
                      required
                    />
                  </div>
                </div>

                {error && <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider text-center">{error}</p>}

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black uppercase italic py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all flex items-center justify-center gap-2 tracking-widest"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>Entrar</span><LogIn className="w-4 h-4" /></>}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-800">
                <button 
                  type="button"
                  onClick={() => setView('register')}
                  className="w-full bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer z-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Criar nova conta</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'register' && (
          <motion.div
            key="register"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="max-w-md w-full z-10"
          >
            <div className="flex items-center gap-4 mb-8">
              <button type="button" onClick={() => setView('login')} className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-black text-white uppercase italic tracking-widest leading-none">Solicitar Acesso</h1>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Passo {regStep} de 2</p>
              </div>
            </div>

            <div className="bento-card bg-slate-900/40 border-slate-800 backdrop-blur-xl p-8 shadow-2xl">
              <form onSubmit={handleRegister} className="space-y-5">
                <AnimatePresence mode="wait">
                  {regStep === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nome Completo</label>
                        <input type="text" value={regData.fullName} onChange={(e) => updateReg('fullName', e.target.value)} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-emerald-500/50 transition-all" required />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">E-mail</label>
                        <input type="email" value={regData.email} onChange={(e) => updateReg('email', e.target.value)} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-emerald-500/50 transition-all" required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CPF</label>
                          <input type="text" value={regData.cpf} onChange={(e) => updateReg('cpf', e.target.value)} placeholder="000.000.000-00" className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-emerald-500/50 transition-all" required />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Telefone</label>
                          <input type="text" value={regData.phone} onChange={(e) => updateReg('phone', e.target.value)} placeholder="(00) 00000-0000" className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-emerald-500/50 transition-all" required />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {regStep === 2 && (
                    <motion.div key="step2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Data de Nascimento</label>
                        <input type="date" value={regData.birthDate} onChange={(e) => updateReg('birthDate', e.target.value)} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-emerald-500/50 transition-all" required />
                      </div>

                      {isMinor(regData.birthDate) && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-4 border-t border-slate-800">
                          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Dados do Responsável Legal</p>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nome do Responsável</label>
                            <input type="text" value={regData.guardianName} onChange={(e) => updateReg('guardianName', e.target.value)} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-emerald-500/50 transition-all" required />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Grau de Parentesco</label>
                              <input type="text" value={regData.guardianRelationship} onChange={(e) => updateReg('guardianRelationship', e.target.value)} placeholder="Ex: Pai, Mãe..." className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-emerald-500/50 transition-all" required />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tel. Responsável</label>
                              <input type="text" value={regData.guardianPhone} onChange={(e) => updateReg('guardianPhone', e.target.value)} placeholder="(00) 00000-0000" className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-emerald-500/50 transition-all" required />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CPF do Responsável</label>
                            <input type="text" value={regData.guardianCpf} onChange={(e) => updateReg('guardianCpf', e.target.value)} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm outline-none focus:border-emerald-500/50 transition-all" required />
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-3 pt-4">
                  {regStep > 1 && (
                    <button type="button" onClick={() => setRegStep(regStep - 1)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase italic py-4 rounded-xl transition-all tracking-widest">Voltar</button>
                  )}
                  <button type="submit" disabled={loading} className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase italic py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all flex items-center justify-center gap-2 tracking-widest">
                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>{regStep === 1 ? 'Próximo' : 'Finalizar Solicitação'}</span><ChevronRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {view === 'selection' && (
          <motion.div
            key="selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl w-full space-y-8 z-10"
          >
            {/* Header Block */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div className="flex flex-col items-center gap-1">
              <div className="flex flex-col items-center gap-1">
                <div className="bg-black text-emerald-500 border-2 border-emerald-500 font-black px-5 py-1 rounded-lg text-2xl italic skew-x-[-15deg] shadow-[0_0_20px_rgba(16,185,129,0.3)] border-l-8">
                  WMPS
                </div>
                <div className="text-center">
                  <h1 className="text-[10px] font-black leading-tight text-white uppercase italic tracking-[0.1em]">William Moreira</h1>
                  <p className="text-[8px] text-emerald-500 uppercase tracking-[0.3em] font-black -mt-0.5">Performance System</p>
                </div>
              </div>
              </div>
              <button 
                onClick={async () => { 
                  if (supabase) await supabase.auth.signOut();
                  setView('login'); 
                }}
                className="bg-slate-800/50 hover:bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 backdrop-blur-sm transition-all group"
              >
                <p className="text-[10px] text-slate-500 group-hover:text-rose-500 font-black uppercase tracking-wider">Sair do Sistema</p>
              </button>
            </header>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link href="/athlete" className="group">
                <motion.div whileHover={{ scale: 1.02, borderColor: '#3b82f6' }} whileTap={{ scale: 0.98 }} className="bento-card h-[280px] flex flex-col justify-between group-hover:bg-slate-800/80 bg-slate-900/60 transition-all border-slate-800 p-8">
                  <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/20 group-hover:scale-110 transition-transform"><User className="w-7 h-7" /></div>
                  <div className="space-y-3">
                    <h2 className="text-4xl font-black text-white uppercase italic">Área Aluno</h2>
                    <p className="text-sm text-slate-400 font-medium leading-relaxed">Registrar treinamentos, intensidade e percepções de esforço diárias.</p>
                  </div>
                  <div className="flex items-center gap-3 text-blue-400 text-[10px] font-black uppercase tracking-widest"><span>Entrar agora</span><ChevronRight className="w-4 h-4" /></div>
                </motion.div>
              </Link>

              <Link href="/coach" className="group">
                <motion.div whileHover={{ scale: 1.02, borderColor: '#10b981' }} whileTap={{ scale: 0.98 }} className="bento-card h-[280px] flex flex-col justify-between group-hover:bg-slate-800/80 bg-slate-900/60 transition-all border-slate-800 p-8">
                  <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-500/20 group-hover:scale-110 transition-transform"><BarChart3 className="w-7 h-7" /></div>
                  <div className="space-y-3">
                    <h2 className="text-4xl font-black text-white uppercase italic">Professor</h2>
                    <p className="text-sm text-slate-400 font-medium leading-relaxed">Dashboard analítico de performance, cargas agudas e crônicas dos atletas.</p>
                  </div>
                  <div className="flex items-center gap-3 text-emerald-400 text-[10px] font-black uppercase tracking-widest"><span>Analisar dados</span><ChevronRight className="w-4 h-4" /></div>
                </motion.div>
              </Link>
            </div>

            {/* Info Block */}
            <div className="bento-card bg-slate-900/40 border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-6 opacity-80 py-6 px-10 backdrop-blur-sm">
               <div className="flex items-center gap-4 text-center sm:text-left">
                 <div className="p-2 bg-slate-800 rounded-lg"><Activity className="w-5 h-5 text-emerald-500" /></div>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">William Moreira Performance System <span className="text-emerald-500">V1.0</span></span>
               </div>
               <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em] text-center sm:text-right italic">Build: 2026.04.29-B</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}


