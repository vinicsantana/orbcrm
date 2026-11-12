import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ReferenceLine,
} from 'recharts';
import { BarChart3, TrendingUp, Layers, CheckCircle2 } from 'lucide-react';
import { formatBRL, formatCompactBRL, formatPercent } from '../utils/formatters';

interface EvolutionChartProps {
  data: Array<{
    mes: string;
    fullName: string;
    entradas: number;
    saidas: number;
    saldo: number;
    margem: number;
  }>;
  selectedMonth: string;
  onSelectMonth: (monthFullName: string) => void;
}

export const EvolutionChart: React.FC<EvolutionChartProps> = ({
  data,
  selectedMonth,
  onSelectMonth,
}) => {
  const [viewMode, setViewMode] = useState<'comparativo' | 'saldo'>('comparativo');

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const currentItem = data.find((d) => d.mes === label) || payload[0]?.payload;
    if (!currentItem) return null;

    const { fullName, entradas, saidas, saldo, margem } = currentItem;
    const isSelected = selectedMonth === fullName;

    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white">{fullName}</span>
            {isSelected && (
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                Selecionado
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400">Clique na barra p/ abrir mês</span>
        </div>

        <div className="mt-3 space-y-2 text-xs font-medium">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Faturamento:
            </span>
            <span className="font-mono font-bold text-emerald-400">{formatBRL(entradas)}</span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              Despesas:
            </span>
            <span className="font-mono font-bold text-rose-400">{formatBRL(saidas)}</span>
          </div>

          <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between gap-4">
            <span className="font-semibold text-slate-300">Resultado Líquido:</span>
            <span
              className={`font-mono font-extrabold ${
                saldo >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatBRL(saldo)}
            </span>
          </div>

          {entradas > 0 && (
            <div className="flex items-center justify-between gap-4 text-[11px] text-slate-400">
              <span>Margem Líquida:</span>
              <span className="font-bold text-slate-200">{formatPercent(margem)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex flex-col rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-xl shadow-black/25 backdrop-blur-md transition-all hover:border-slate-700 lg:col-span-2">
      {/* Header with Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <BarChart3 className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold tracking-tight text-white sm:text-base">
              Evolução Financeira Anual
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Comparativo de receitas e despesas mês a mês • <span className="text-slate-300">Clique nas barras para navegar</span>
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950/70 p-1 text-xs font-semibold">
          <button
            onClick={() => setViewMode('comparativo')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
              viewMode === 'comparativo'
                ? 'bg-emerald-500/20 text-emerald-300 shadow-sm ring-1 ring-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Entradas x Saídas</span>
          </button>
          <button
            onClick={() => setViewMode('saldo')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
              viewMode === 'saldo'
                ? 'bg-emerald-500/20 text-emerald-300 shadow-sm ring-1 ring-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Resultado Líquido</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-80 w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'comparativo' ? (
            <BarChart
              data={data}
              margin={{ top: 15, right: 10, left: -10, bottom: 0 }}
              onClick={(e) => {
                if (e && e.activePayload && e.activePayload[0]) {
                  const clickedMonth = e.activePayload[0].payload.fullName;
                  if (clickedMonth) onSelectMonth(clickedMonth);
                }
              }}
              className="cursor-pointer"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="mes"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCompactBRL}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ fontSize: '11px', paddingBottom: '12px' }}
                iconType="circle"
              />
              <Bar
                dataKey="entradas"
                name="Faturamento (Entradas)"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              >
                {data.map((entry, index) => {
                  const isSelected = selectedMonth === entry.fullName;
                  return (
                    <Cell
                      key={`ent-cell-${index}`}
                      fill={isSelected ? '#34d399' : '#10b981'}
                      stroke={isSelected ? '#ffffff' : undefined}
                      strokeWidth={isSelected ? 1.5 : 0}
                    />
                  );
                })}
              </Bar>
              <Bar
                dataKey="saidas"
                name="Despesas (Saídas)"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
              >
                {data.map((entry, index) => {
                  const isSelected = selectedMonth === entry.fullName;
                  return (
                    <Cell
                      key={`sai-cell-${index}`}
                      fill={isSelected ? '#f87171' : '#ef4444'}
                      stroke={isSelected ? '#ffffff' : undefined}
                      strokeWidth={isSelected ? 1.5 : 0}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          ) : (
            <BarChart
              data={data}
              margin={{ top: 15, right: 10, left: -10, bottom: 0 }}
              onClick={(e) => {
                if (e && e.activePayload && e.activePayload[0]) {
                  const clickedMonth = e.activePayload[0].payload.fullName;
                  if (clickedMonth) onSelectMonth(clickedMonth);
                }
              }}
              className="cursor-pointer"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />
              <XAxis
                dataKey="mes"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCompactBRL}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }} />
              <Bar dataKey="saldo" name="Saldo Líquido" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => {
                  const isSelected = selectedMonth === entry.fullName;
                  const isPositive = entry.saldo >= 0;
                  const fill = isPositive
                    ? isSelected
                      ? '#34d399'
                      : '#10b981'
                    : isSelected
                    ? '#f87171'
                    : '#ef4444';
                  return (
                    <Cell
                      key={`saldo-cell-${index}`}
                      fill={fill}
                      stroke={isSelected ? '#ffffff' : undefined}
                      strokeWidth={isSelected ? 1.5 : 0}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Footer Info Pill */}
      <div className="mt-2 flex items-center justify-between border-t border-slate-800/60 pt-3 text-[11px] text-slate-400">
        <span>
          Mês ativo:{' '}
          <strong className="text-white">
            {selectedMonth === 'TODOS' ? 'Ano Todo (Consolidado)' : selectedMonth}
          </strong>
        </span>
        <span className="text-slate-500">Valores apurados em tempo real</span>
      </div>
    </div>
  );
};
