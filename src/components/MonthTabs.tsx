import React from 'react';
import { Calendar, BarChart2 } from 'lucide-react';
import { MonthTab, MonthSummary } from '../types/financeiro';

interface MonthTabsProps {
  tabs: MonthTab[];
  selectedMonth: string;
  monthsData: Map<string, MonthSummary>;
  onSelectMonth: (month: string) => void;
}

export const MonthTabs: React.FC<MonthTabsProps> = ({
  tabs,
  selectedMonth,
  monthsData,
  onSelectMonth,
}) => {
  return (
    <section className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
      {/* Consolidado Anual */}
      <button
        onClick={() => onSelectMonth('TODOS')}
        className={`group flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
          selectedMonth === 'TODOS'
            ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/50'
            : 'border border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-700 hover:bg-slate-800/60 hover:text-white'
        }`}
      >
        <BarChart2 className={`h-3.5 w-3.5 transition-transform ${selectedMonth === 'TODOS' ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'}`} />
        <span>Ano Todo (Consolidado)</span>
      </button>

      <div className="h-6 w-px bg-slate-800 shrink-0 mx-1" />

      {/* Month Tabs */}
      {tabs.map((tab) => {
        const isSelected = selectedMonth === tab.name;
        const summary = monthsData.get(tab.name);
        const hasData = (summary?.transacoes?.length || 0) > 0;
        const count = summary?.transacoes?.length || 0;

        return (
          <button
            key={tab.name}
            onClick={() => onSelectMonth(tab.name)}
            className={`group relative flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              isSelected
                ? 'border border-emerald-500/50 bg-emerald-500/15 text-emerald-300 shadow-sm shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                : 'border border-slate-800/80 bg-slate-900/50 text-slate-400 hover:border-slate-700 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <span>{tab.name}</span>

            {tab.isCurrent && (
              <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-500/40">
                Atual
              </span>
            )}

            {hasData && !isSelected && (
              <span
                className="h-1.5 w-1.5 rounded-full bg-emerald-400/70 group-hover:bg-emerald-400"
                title={`${count} lançamentos`}
              />
            )}
          </button>
        );
      })}
    </section>
  );
};
