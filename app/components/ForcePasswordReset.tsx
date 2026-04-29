'use client'

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Save, AlertTriangle } from 'lucide-react';
import { checkMustChangePassword, updateUserPassword } from '../actions';
import { supabase } from '@/lib/supabase';

export default function ForcePasswordReset({ userId }: { userId: string }) {
  const [mustChange, setMustChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function check() {
      const needsReset = await checkMustChangePassword(userId);
      setMustChange(needsReset);
    }
    if (userId) check();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const result = await updateUserPassword(userId, newPassword);
    if (result.success) {
      setMustChange(false);
      alert('Senha atualizada com sucesso!');
    } else {
      setError(result.error || 'Erro ao atualizar senha.');
    }
    setLoading(false);
  };

  if (!mustChange) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/80">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md bg-slate-900 border border-emerald-500/30 rounded-[2.5rem] p-10 shadow-[0_0_50px_rgba(16,185,129,0.2)]"
        >
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
              <Lock className="w-10 h-10 text-emerald-500" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Segurança Obrigatória</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed">
                Detectamos que este é seu primeiro acesso. <br/> Por favor, crie uma senha pessoal.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="w-full space-y-4 pt-4">
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-slate-500 uppercase italic ml-4">Nova Senha</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-slate-500 uppercase italic ml-4">Confirmar Senha</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-500 text-[10px] font-black uppercase italic">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] italic text-black flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {loading ? 'Processando...' : 'Salvar Nova Senha'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
