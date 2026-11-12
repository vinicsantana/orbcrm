import React from 'react';
import { DollarSign, RefreshCw, ExternalLink, LogOut, ShieldCheck } from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface NavbarProps {
  user: User | null;
  lastSync: Date | null;
  refreshing: boolean;
  spreadsheetUrl: string | null;
  onRefresh: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  lastSync,
  refreshing,
  spreadsheetUrl,
  onRefresh,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-400 shadow-md shadow-emerald-500/20">
            <DollarSign className="h-6 w-6 text-slate-950 font-black" />
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-white sm:text-lg">
                Órbita <span className="text-emerald-400">Financeiro</span>
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Tempo Real
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400">
              Painel Estratégico Executivo & DRE da Diretoria
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {lastSync && (
            <div className="hidden items-center gap-1.5 rounded-lg border border-slate-800/80 bg-slate-900/60 px-2.5 py-1 text-[11px] text-slate-400 md:flex">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Sincronizado {lastSync.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
          )}

          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs font-semibold text-slate-200 transition-all hover:border-slate-700 hover:bg-slate-800 hover:text-white active:scale-95 disabled:opacity-50"
            title="Atualizar dados da planilha do Google Sheets"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-emerald-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? 'Atualizando...' : 'Atualizar'}</span>
          </button>

          {spreadsheetUrl && (
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs font-semibold text-slate-300 transition-all hover:border-slate-700 hover:bg-slate-800 hover:text-white sm:flex"
              title="Abrir Planilha de Gestão Financeira no Google Sheets"
            >
              <ExternalLink className="h-3.5 w-3.5 text-teal-400" />
              <span className="hidden sm:inline">Google Planilha</span>
            </a>
          )}

          <div className="h-6 w-px bg-slate-800/80 mx-0.5 sm:mx-1" />

          {/* User & Logout */}
          <div className="flex items-center gap-2">
            {user?.email && (
              <span className="hidden text-xs font-medium text-slate-400 lg:inline-block max-w-[140px] truncate" title={user.email}>
                {user.email.split('@')[0]}
              </span>
            )}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition-all hover:border-red-500/40 hover:bg-red-500/20 hover:text-red-300"
              title="Encerrar Sessão Segura"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
