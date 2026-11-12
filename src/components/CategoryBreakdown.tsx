import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { PieChart as PieChartIcon, Filter, CheckCircle2 } from 'lucide-react';
import { CategorySummary } from '../types/financeiro';
import { formatBRL, formatPercent, CHART_COLORS } from '../utils/formatters';

interface CategoryBreakdownProps {
  categories: CategorySummary[];
  totalDespesas: number;
  selectedMonth: string;
  activeCategoryFilter?: string | null;
  onSelectCategoryFilter: (category: string | null) => void;
}

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({
  categories,
  totalDespesas,
  selectedMonth,
  activeCategoryFilter,
  onSelectCategoryFilter,
}) => {
  const periodLabel = selectedMonth === 'TODOS' ? 'Ano Todo' : selectedMonth;

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0];
    const data = item.payload;

    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-xl backdrop-blur-xl ring-1 ring-white/10 text-xs">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.payload.fill || item.color }} />
          <span className="font-bold text-white">{data.name}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-4">
          <span className="text-slate-400">Total Gasto:</span>
          <span className="font-mono font-bold text-white">{formatBRL(data.value)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-4">
          <span className="text-slate-400">Participação:</span>
          <span className="font-bold text-emerald-400">{formatPercent(data.percentage)}</span>
        </div>
        <div className="mt-1 text-[10px] text-slate-500">Clique para filtrar na tabela</div>
      </div>
    );
  };

  return (
    <div className="relative flex flex-col rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-xl shadow-black/25 backdrop-blur-md transition-all hover:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400">
              <PieChartIcon className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold tracking-tight text-white sm:text-base">
              Despesas por Categoria
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Distribuição em <span className="text-slate-300 font-semibold">{periodLabel}</span>
          </p>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase tracking-wider text-slate-400">Total Despesas</span>
          <div className="font-mono text-sm font-extrabold text-rose-400">
            {formatBRL(totalDespesas)}
          </div>
        </div>
      </div>

      {categories.length > 0 ? (
        <div className="flex flex-col gap-4 pt-3">
          {/* Donut Chart with Center Metric */}
          <div className="relative h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  onClick={(e) => {
                    if (e && e.name) {
                      onSelectCategoryFilter(
                        activeCategoryFilter === e.name ? null : e.name
                      );
                    }
                  }}
                  className="cursor-pointer"
                >
                  {categories.map((entry, index) => {
                    const isFiltered = activeCategoryFilter === entry.name;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        stroke={isFiltered ? '#ffffff' : '#0f172a'}
                        strokeWidth={isFiltered ? 2 : 1}
                      />
                    );
                  })}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Inner Center Label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-medium text-slate-400">Categorias</span>
              <span className="font-mono text-base font-extrabold text-white">
                {categories.length}
              </span>
            </div>
          </div>

          {/* Active Filter Pill */}
          {activeCategoryFilter && (
            <div className="flex items-center justify-between rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-teal-300 font-medium">
                <Filter className="h-3.5 w-3.5" />
                <span>Filtrando por: <strong>{activeCategoryFilter}</strong></span>
              </div>
              <button
                onClick={() => onSelectCategoryFilter(null)}
                className="text-[11px] font-semibold text-teal-400 underline hover:text-white"
              >
                Limpar
              </button>
            </div>
          )}

          {/* Ranked Breakdown List */}
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
            {categories.map((cat, idx) => {
              const color = CHART_COLORS[idx % CHART_COLORS.length];
              const isSelected = activeCategoryFilter === cat.name;

              return (
                <div
                  key={cat.name}
                  onClick={() =>
                    onSelectCategoryFilter(isSelected ? null : cat.name)
                  }
                  className={`group cursor-pointer rounded-xl border p-2.5 transition-all ${
                    isSelected
                      ? 'border-emerald-500/50 bg-emerald-500/15 shadow-sm'
                      : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                  title="Clique para filtrar transações por esta categoria"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="truncate font-semibold text-slate-200 group-hover:text-white">
                        {cat.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
                        {formatPercent(cat.percentage)}
                      </span>
                      <span className="font-mono font-bold text-white">
                        {formatBRL(cat.value)}
                      </span>
                    </div>
                  </div>

                  {/* Visual Proportion Bar */}
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(4, cat.percentage))}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/60 text-slate-500">
            <PieChartIcon className="h-6 w-6" />
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-400">
            Nenhuma despesa registrada
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Não há lançamentos de saída em {periodLabel}
          </p>
        </div>
      )}
    </div>
  );
};
