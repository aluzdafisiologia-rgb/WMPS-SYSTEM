'use client'

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, Users, Clock, CheckCircle, XCircle, 
  ArrowLeft, Star, ShieldAlert, Lock, Unlock, Mail, 
  Calendar, Check, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getPendingRequests, getAllUsers, approveRegistration, denyRegistration, changeUserRole } from './actions';
import { getUserRole } from '../actions';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [requests, setRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<'requests' | 'users'>('requests');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    if (!supabase) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/';
        return;
      }
      
      const role = await getUserRole(user.id);
        
      if (role !== 'admin') {
        window.location.href = '/';
        return;
      }
      
      setIsAdmin(true);
      await loadData();
    } catch (err) {
      window.location.href = '/';
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    const reqs = await getPendingRequests();
    const usrs = await getAllUsers();
    setRequests(reqs);
    setUsers(usrs);
  };

  const handleApprove = async (req: any) => {
    setActionLoading(`approve_${req.id}`);
    const res = await approveRegistration(req);
    if (res.success) {
      alert(`Cadastro aprovado!\nSenha temporária do usuário: ${res.tempPassword}`);
      await loadData();
    } else {
      alert('Erro ao aprovar: ' + res.error);
    }
    setActionLoading(null);
  };

  const handleDeny = async (id: string) => {
    if (!confirm('Tem certeza que deseja negar este cadastro?')) return;
    setActionLoading(`deny_${id}`);
    const res = await denyRegistration(id);
    if (res.success) {
      await loadData();
    } else {
      alert('Erro ao negar cadastro.');
    }
    setActionLoading(null);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionLoading(`role_${userId}`);
    const res = await changeUserRole(userId, newRole);
    if (res.success) {
      await loadData();
    } else {
      alert('Erro ao alterar permissão: ' + res.error);
    }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#020617] font-sans relative overflow-hidden pb-20">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-purple-500" />
                <h1 className="text-xl font-black text-white uppercase italic tracking-widest leading-none mt-1">Master Admin</h1>
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Controle Total do Sistema</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Link 
              href="/coach"
              className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 transition-all flex items-center gap-2"
            >
              <Star className="w-3.5 h-3.5" /> Área Prof
            </Link>
            <Link 
              href="/athlete"
              className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-500/20 transition-all flex items-center gap-2"
            >
              <Zap className="w-3.5 h-3.5" /> Área Aluno
            </Link>
            
            <div className="flex bg-slate-800/50 p-1 rounded-xl ml-4">
              <button 
                onClick={() => setActiveTab('requests')}
                className={`px-6 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'requests' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                Solicitações
                {requests.length > 0 && <span className="ml-2 bg-rose-500 text-white px-2 py-0.5 rounded-full text-[9px]">{requests.length}</span>}
              </button>
              <button 
                onClick={() => setActiveTab('users')}
                className={`px-6 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                Usuários
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-12 relative z-10">
        <AnimatePresence mode="wait">
          
          {/* TELA DE SOLICITAÇÕES */}
          {activeTab === 'requests' && (
            <motion.div key="requests" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-white uppercase italic flex items-center gap-3">
                  <Clock className="text-purple-500 w-6 h-6" /> Cadastros Pendentes
                </h2>
              </div>

              {requests.length === 0 ? (
                <div className="bento-card border-slate-800 bg-slate-900/50 flex flex-col items-center justify-center p-12 text-center">
                  <CheckCircle className="w-16 h-16 text-slate-700 mb-4" />
                  <h3 className="text-white font-black uppercase tracking-widest text-lg">Tudo limpo!</h3>
                  <p className="text-slate-500 font-medium text-sm mt-2">Nenhuma solicitação de cadastro pendente no momento.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {requests.map(req => (
                    <div key={req.id} className="bento-card border-slate-800 bg-slate-900/80 p-6 flex flex-col sm:flex-row items-center justify-between gap-6 hover:border-purple-500/50 transition-colors">
                      <div className="flex-1 space-y-4 w-full">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-xl font-black text-white">{req.full_name}</h3>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium"><Mail className="w-3.5 h-3.5" /> {req.email}</span>
                              <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium"><Calendar className="w-3.5 h-3.5" /> Nasc: {req.birth_date}</span>
                            </div>
                          </div>
                          {req.is_minor && (
                            <span className="bg-rose-500/20 text-rose-500 border border-rose-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                              <AlertTriangle className="w-3 h-3" /> Menor de Idade
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/50">
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CPF</p>
                            <p className="text-sm text-slate-300 mt-1">{req.cpf}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Telefone</p>
                            <p className="text-sm text-slate-300 mt-1">{req.phone}</p>
                          </div>
                          {req.is_minor && (
                            <>
                              <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Responsável</p>
                                <p className="text-sm text-slate-300 mt-1">{req.guardian_name}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CPF Responsável</p>
                                <p className="text-sm text-slate-300 mt-1">{req.guardian_cpf}</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex sm:flex-col gap-3 w-full sm:w-auto shrink-0">
                        <button 
                          onClick={() => handleApprove(req)}
                          disabled={actionLoading !== null}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-black uppercase text-[11px] tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          {actionLoading === `approve_${req.id}` ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><Check className="w-4 h-4" /> Aprovar</>}
                        </button>
                        <button 
                          onClick={() => handleDeny(req.id)}
                          disabled={actionLoading !== null}
                          className="flex-1 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white px-6 py-3 rounded-xl font-black uppercase text-[11px] tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          {actionLoading === `deny_${req.id}` ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><XCircle className="w-4 h-4" /> Negar</>}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TELA DE USUÁRIOS */}
          {activeTab === 'users' && (
            <motion.div key="users" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-white uppercase italic flex items-center gap-3">
                  <Users className="text-purple-500 w-6 h-6" /> Gestão de Usuários
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {users.map(user => (
                  <div key={user.id} className={`bento-card border-slate-800 p-6 flex flex-col justify-between h-[260px] relative overflow-hidden transition-all ${user.role === 'admin' ? 'bg-purple-900/20 border-purple-500/30' : user.role === 'coach' ? 'bg-emerald-900/10' : user.role === 'blocked' ? 'bg-rose-950/20 border-rose-900/50 opacity-70' : 'bg-slate-900/60'}`}>
                    
                    {/* Role Badge */}
                    <div className="absolute top-4 right-4">
                      {user.role === 'admin' && <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Master</span>}
                      {user.role === 'coach' && <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><Star className="w-3 h-3"/> Professor</span>}
                      {user.role === 'athlete' && <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Aluno</span>}
                      {user.role === 'blocked' && <span className="bg-rose-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> Bloqueado</span>}
                    </div>

                    <div>
                      <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 mb-4 border border-slate-700">
                        <User className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-black text-white truncate pr-20">{user.full_name}</h3>
                      <p className="text-xs text-slate-400 mt-1 truncate">{user.email}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-6">
                      {user.role !== 'admin' && (
                        <>
                          {user.role === 'coach' ? (
                            <button 
                              onClick={() => handleRoleChange(user.id, 'athlete')}
                              disabled={actionLoading !== null}
                              className="col-span-2 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
                            >
                              Revogar Professor
                            </button>
                          ) : user.role === 'blocked' ? (
                            <button 
                              onClick={() => handleRoleChange(user.id, 'athlete')}
                              disabled={actionLoading !== null}
                              className="col-span-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-500 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors border border-emerald-500/20"
                            >
                              <Unlock className="w-3 h-3"/> Desbloquear
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleRoleChange(user.id, 'coach')}
                              disabled={actionLoading !== null}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
                            >
                              <Star className="w-3 h-3"/> Promover Prof
                            </button>
                          )}
                          
                          {user.role !== 'blocked' && user.role !== 'coach' && (
                            <button 
                              onClick={() => {
                                if(confirm('Bloquear acesso deste usuário?')) handleRoleChange(user.id, 'blocked');
                              }}
                              disabled={actionLoading !== null}
                              className="bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors border border-rose-500/20 hover:border-transparent"
                            >
                              <Lock className="w-3 h-3"/> Bloquear
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}

// User Icon fallback
function User(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}
