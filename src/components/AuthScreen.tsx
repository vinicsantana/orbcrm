import React from 'react';
import { DollarSign, Mail, KeyRound, ArrowRight, Lock, AlertCircle, ShieldAlert, LogOut } from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface LoginScreenProps {
  emailInput: string;
  setEmailInput: (email: string) => void;
  passwordInput: string;
  setPasswordInput: (pwd: string) => void;
  loginError: string | null;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  emailInput,
  setEmailInput,
  passwordInput,
  setPasswordInput,
  loginError,
  isSubmitting,
  onSubmit,
}) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12 selection:bg-emerald-500/20 selection:text-emerald-400">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 shadow-xl shadow-emerald-500/20 ring-1 ring-white/20">
            <DollarSign className="h-8 w-8 text-slate-950 font-black" />
          </div>
          <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-white">
            Órbita <span className="text-emerald-400">Financeiro</span>
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Ambiente executivo restrito e criptografado para a diretoria
          </p>
        </div>

        {loginError && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-medium text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{loginError}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
              E-mail de acesso
            </label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="seu-email@gmail.com"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 transition focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Senha executiva
            </label>
            <div className="relative mt-1.5">
              <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 transition focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>Entrar no Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-center gap-2 border-t border-slate-800/80 pt-6 text-xs text-slate-500">
          <Lock className="h-3.5 w-3.5" />
          <span>Acesso criptografado e auditado</span>
        </div>
      </div>
    </div>
  );
};

export const AccessDeniedScreen: React.FC<{ user: User; onLogout: () => void }> = ({
  user,
  onLogout,
}) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-red-500/20 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 ring-1 ring-red-500/20">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="mt-5 text-2xl font-bold text-white">Acesso Restrito à Diretoria</h2>
        <p className="mt-2 text-sm text-slate-400">
          Conectado como <strong className="text-white">{user.email}</strong>. Este painel financeiro estratégico é restrito aos diretores autorizados.
        </p>
        <div className="mt-8 flex justify-center">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700"
          >
            <LogOut className="h-4 w-4" />
            <span>Encerrar Sessão</span>
          </button>
        </div>
      </div>
    </div>
  );
};
