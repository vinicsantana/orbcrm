import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Users, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import { formatBRL, formatPercent } from '../utils/formatters';

interface KPICardsProps {
  selectedMonth: string;
  entradas: number;
  saidas: number;
  saldo: number;
  divisaoSocio: number;
  margemLiquida: number;
  totalTransacoes: number;
}

export const KPICards: React.FC<KPICardsProps> = ({
  selectedMonth,
  entradas,
  saidas,
  saldo,
  divisaoSocio,
  margemLiquida,
  totalTransacoes,
}) => {
  const isPositive = saldo >= 0;
  const periodLabel = selectedMonth === 'TODOS' ? 'Anual' : selectedMonth;

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Card 1: Faturamento */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-lg shadow-black/20 backdrop-blur-md transition-all hover:border-slate-700 hover:shadow-emerald-500/5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Faturamento {periodLabel}
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="font-mono text-2xl font-extrabold tracking-tight text-white lg:text-[26px]">
            {formatBRL(entradas)}
          </h3>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span className="font-semibold">Receitas de clientes & projetos</span>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
      </div>

      {/* Card 2: Despesas */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-lg shadow-black/20 backdrop-blur-md transition-all hover:border-slate-700 hover:shadow-red-500/5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Despesas {periodLabel}
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-400 ring-1 ring-red-500/20">
            <TrendingDown className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="font-mono text-2xl font-extrabold tracking-tight text-white lg:text-[26px]">
            {formatBRL(saidas)}
          </h3>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
            <ArrowDownRight className="h-3.5 w-3.5" />
            <span className="font-semibold">Ferramentas, equipe & infra</span>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
      </div>

      {/* Card 3: Saldo Líquido */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-lg shadow-black/20 backdrop-blur-md transition-all hover:border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Saldo Líquido ({periodLabel})
          </span>
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 ${
              isPositive
                ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                : 'bg-red-500/10 text-red-400 ring-red-500/20'
            }`}
          >
            <Wallet className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <h3
            className={`font-mono text-2xl font-extrabold tracking-tight lg:text-[26px] ${
              isPositive ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {formatBRL(saldo)}
          </h3>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="text-slate-400">Margem líquida:</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                isPositive
                  ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                  : 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30'
              }`}
            >
              {formatPercent(margemLiquida)}
            </span>
          </div>
        </div>
        <div
          className={`absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent ${
            isPositive ? 'via-emerald-500/40' : 'via-red-500/40'
          } to-transparent`}
        />
      </div>

      {/* Card 4: Divisão de Sócios (50% / 50%) */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/35 bg-gradient-to-br from-emerald-950/40 via-slate-900/80 to-slate-900/90 p-5 shadow-xl shadow-emerald-950/20 backdrop-blur-md transition-all hover:border-emerald-500/60">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
            Pró-Labore / Sócio (50%)
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/30">
            <Users className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="font-mono text-2xl font-extrabold tracking-tight text-emerald-400 lg:text-[26px]">
            {formatBRL(divisaoSocio)}
          </h3>
          <div className="mt-2 text-[11px] text-slate-300">
            <span className="font-semibold text-white">Vinicius:</span>{' '}
            <span className="font-mono font-bold text-emerald-300">{formatBRL(divisaoSocio)}</span>
            {' • '}
            <span className="font-semibold text-white">Raianni:</span>{' '}
            <span className="font-mono font-bold text-emerald-300">{formatBRL(divisaoSocio)}</span>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
      </div>
    </section>
  );
};
