import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  CheckCircle2,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
} from 'lucide-react';
import { Transacao, SortField, SortDirection, SortConfig } from '../types/financeiro';
import { formatBRL, parseDay, MONTH_TABS } from '../utils/formatters';

interface TransactionsTableProps {
  transacoes: Transacao[];
  selectedMonth: string;
  categoryFilter: string | null;
  onCategoryFilterChange: (cat: string | null) => void;
  availableCategories: string[];
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transacoes,
  selectedMonth,
  categoryFilter,
  onCategoryFilterChange,
  availableCategories,
}) => {
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<'Todos' | 'Entrada' | 'Saida'>('Todos');

  // Sorting State
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'dia',
    direction: 'desc',
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Handle Sort Toggle
  const handleSort = (field: SortField) => {
    setSortConfig((prev) => {
      if (prev.field === field) {
        return {
          field,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      // Defaults when picking a new column
      const defaultDirection: SortDirection =
        field === 'valor' || field === 'dia' ? 'desc' : 'asc';
      return {
        field,
        direction: defaultDirection,
      };
    });
    setCurrentPage(1);
  };

  // Filtered Transacoes
  const filteredData = useMemo(() => {
    return transacoes.filter((t) => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        t.descricao.toLowerCase().includes(term) ||
        (t.detalhe && t.detalhe.toLowerCase().includes(term)) ||
        t.categoria.toLowerCase().includes(term) ||
        String(t.valor).includes(term) ||
        (t.dia && String(t.dia).includes(term));

      const matchesTipo = tipoFilter === 'Todos' || t.tipo === tipoFilter;
      const matchesCategory = !categoryFilter || t.categoria === categoryFilter;

      return matchesSearch && matchesTipo && matchesCategory;
    });
  }, [transacoes, searchTerm, tipoFilter, categoryFilter]);

  // Sorted Transacoes
  const sortedData = useMemo(() => {
    const list = [...filteredData];
    const { field, direction } = sortConfig;
    const factor = direction === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      if (field === 'dia') {
        const monthWeightA =
          MONTH_TABS.findIndex((m) => m.name === a.mes) * 100;
        const monthWeightB =
          MONTH_TABS.findIndex((m) => m.name === b.mes) * 100;
        const dayA = parseDay(a.dia);
        const dayB = parseDay(b.dia);
        const valA = selectedMonth === 'TODOS' ? monthWeightA + dayA : dayA;
        const valB = selectedMonth === 'TODOS' ? monthWeightB + dayB : dayB;
        return (valA - valB) * factor;
      }

      if (field === 'valor') {
        return (a.valor - b.valor) * factor;
      }

      if (field === 'descricao') {
        return (
          a.descricao.localeCompare(b.descricao, 'pt-BR', {
            sensitivity: 'base',
          }) * factor
        );
      }

      if (field === 'categoria') {
        return (
          a.categoria.localeCompare(b.categoria, 'pt-BR', {
            sensitivity: 'base',
          }) * factor
        );
      }

      if (field === 'tipo') {
        return a.tipo.localeCompare(b.tipo) * factor;
      }

      if (field === 'status') {
        return (
          (a.status || '').localeCompare(b.status || '', 'pt-BR') * factor
        );
      }

      return 0;
    });

    return list;
  }, [filteredData, sortConfig, selectedMonth]);

  // Filtered Totals
  const { totalEntradas, totalSaidas, saldoFiltrado } = useMemo(() => {
    let ent = 0;
    let sai = 0;
    filteredData.forEach((t) => {
      if (t.tipo === 'Entrada') ent += t.valor;
      else sai += t.valor;
    });
    return {
      totalEntradas: ent,
      totalSaidas: sai,
      saldoFiltrado: ent - sai,
    };
  }, [filteredData]);

  // Paginated Data
  const totalPages =
    pageSize === -1 ? 1 : Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    if (pageSize === -1) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Export CSV (with UTF-8 BOM for Excel compatibility)
  const exportCSV = () => {
    const headers = [
      'Mês',
      'Dia',
      'Descrição / Cliente',
      'Detalhe / Projeto',
      'Categoria',
      'Tipo',
      'Valor (R$)',
      'Status',
    ];
    const rows = sortedData.map((t) => [
      t.mes,
      t.dia || '',
      `"${(t.descricao || '').replace(/"/g, '""')}"`,
      `"${(t.detalhe || '').replace(/"/g, '""')}"`,
      `"${(t.categoria || '').replace(/"/g, '""')}"`,
      t.tipo,
      t.valor.toFixed(2),
      t.status,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `extrato_orbita_${selectedMonth.toLowerCase()}_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setTipoFilter('Todos');
    onCategoryFilterChange(null);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    tipoFilter !== 'Todos' ||
    Boolean(categoryFilter);

  // Sort indicator helper
  const renderSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return (
        <ArrowUpDown className="h-3 w-3 text-slate-500 opacity-40 transition-opacity group-hover:opacity-100" />
      );
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-emerald-400 font-bold" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-emerald-400 font-bold" />
    );
  };

  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 shadow-xl shadow-black/25 backdrop-blur-md transition-all hover:border-slate-700">
      {/* Top Bar: Title & Primary Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-4 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white sm:text-lg">
              Extrato de Lançamentos
            </h3>
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
              {filteredData.length} {filteredData.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Período: <strong className="text-slate-200">{selectedMonth === 'TODOS' ? 'Ano Todo (Consolidado)' : selectedMonth}</strong> • Clique nos cabeçalhos para ordenar
          </p>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar lançamento, valor, cliente..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2 pl-9 pr-8 text-xs text-white placeholder-slate-500 transition-all focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                title="Limpar busca"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter Buttons */}
          <div className="flex rounded-xl border border-slate-800 bg-slate-950/80 p-1">
            {(['Todos', 'Entrada', 'Saida'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTipoFilter(t);
                  setCurrentPage(1);
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  tipoFilter === t
                    ? t === 'Entrada'
                      ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30'
                      : t === 'Saida'
                      ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30'
                      : 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t === 'Todos' ? 'Todos' : t === 'Entrada' ? '+ Entradas' : '- Saídas'}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <div className="relative">
            <select
              value={categoryFilter || ''}
              onChange={(e) => {
                onCategoryFilterChange(e.target.value ? e.target.value : null);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-800 bg-slate-950/80 py-2 px-3 text-xs font-medium text-slate-200 transition-all focus:border-emerald-500 focus:outline-none"
            >
              <option value="">Todas as Categorias</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Button if active */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-800/60 px-2.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
              title="Limpar todos os filtros"
            >
              <X className="h-3.5 w-3.5" />
              <span>Limpar</span>
            </button>
          )}

          {/* Export CSV */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 transition-all hover:border-slate-700 hover:bg-slate-800 hover:text-white"
            title="Exportar dados filtrados em planilha CSV (Excel)"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Filtered Summary Ribbon */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800/60 bg-slate-950/40 px-3.5 py-2 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <Layers className="h-3.5 w-3.5 text-slate-500" />
          <span>
            Exibindo <strong className="text-white">{filteredData.length}</strong> de{' '}
            <strong className="text-white">{transacoes.length}</strong> lançamentos
          </span>
        </div>

        <div className="flex items-center gap-4 font-mono text-[11px] sm:text-xs">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Entradas:</span>
            <strong>{formatBRL(totalEntradas)}</strong>
          </span>
          <span className="flex items-center gap-1.5 text-rose-400">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span>Saídas:</span>
            <strong>{formatBRL(totalSaidas)}</strong>
          </span>
          <span className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
            <span className="text-slate-400">Saldo:</span>
            <strong className={saldoFiltrado >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {formatBRL(saldoFiltrado)}
            </strong>
          </span>
        </div>
      </div>

      {/* Table Container */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800/80">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-950/80 uppercase tracking-wider text-slate-400 select-none">
            <tr>
              {/* Column: Mês / Dia */}
              <th
                onClick={() => handleSort('dia')}
                className="group cursor-pointer px-4 py-3.5 font-bold transition-colors hover:bg-slate-800/50 hover:text-white"
                title="Ordenar por Data/Dia"
              >
                <div className="flex items-center gap-2">
                  <span className={sortConfig.field === 'dia' ? 'text-emerald-400' : ''}>
                    Mês / Dia
                  </span>
                  {renderSortIcon('dia')}
                </div>
              </th>

              {/* Column: Descrição / Cliente */}
              <th
                onClick={() => handleSort('descricao')}
                className="group cursor-pointer px-4 py-3.5 font-bold transition-colors hover:bg-slate-800/50 hover:text-white"
                title="Ordenar por Descrição / Cliente"
              >
                <div className="flex items-center gap-2">
                  <span className={sortConfig.field === 'descricao' ? 'text-emerald-400' : ''}>
                    Descrição / Cliente
                  </span>
                  {renderSortIcon('descricao')}
                </div>
              </th>

              {/* Column: Categoria */}
              <th
                onClick={() => handleSort('categoria')}
                className="group cursor-pointer px-4 py-3.5 font-bold transition-colors hover:bg-slate-800/50 hover:text-white"
                title="Ordenar por Categoria"
              >
                <div className="flex items-center gap-2">
                  <span className={sortConfig.field === 'categoria' ? 'text-emerald-400' : ''}>
                    Categoria
                  </span>
                  {renderSortIcon('categoria')}
                </div>
              </th>

              {/* Column: Tipo */}
              <th
                onClick={() => handleSort('tipo')}
                className="group cursor-pointer px-4 py-3.5 font-bold transition-colors hover:bg-slate-800/50 hover:text-white"
                title="Ordenar por Tipo (Entrada / Saída)"
              >
                <div className="flex items-center gap-2">
                  <span className={sortConfig.field === 'tipo' ? 'text-emerald-400' : ''}>
                    Tipo
                  </span>
                  {renderSortIcon('tipo')}
                </div>
              </th>

              {/* Column: Valor */}
              <th
                onClick={() => handleSort('valor')}
                className="group cursor-pointer px-4 py-3.5 font-bold text-right transition-colors hover:bg-slate-800/50 hover:text-white"
                title="Ordenar por Valor (R$)"
              >
                <div className="flex items-center justify-end gap-2">
                  <span className={sortConfig.field === 'valor' ? 'text-emerald-400' : ''}>
                    Valor
                  </span>
                  {renderSortIcon('valor')}
                </div>
              </th>

              {/* Column: Status */}
              <th
                onClick={() => handleSort('status')}
                className="group cursor-pointer px-4 py-3.5 font-bold transition-colors hover:bg-slate-800/50 hover:text-white"
                title="Ordenar por Status"
              >
                <div className="flex items-center gap-2">
                  <span className={sortConfig.field === 'status' ? 'text-emerald-400' : ''}>
                    Status
                  </span>
                  {renderSortIcon('status')}
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60 bg-slate-950/20">
            {paginatedData.length > 0 ? (
              paginatedData.map((t) => (
                <tr
                  key={t.id}
                  className="transition-colors hover:bg-slate-800/40"
                >
                  {/* Mês / Dia */}
                  <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                    <div className="flex items-center gap-1.5 font-mono">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      <span className="font-semibold">{t.mes}</span>
                      {t.dia !== undefined && t.dia !== null && String(t.dia).trim() !== '' && (
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                          Dia {t.dia}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Descrição / Cliente */}
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">{t.descricao}</div>
                    {t.detalhe && (
                      <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                        {t.detalhe}
                      </div>
                    )}
                  </td>

                  {/* Categoria */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() =>
                        onCategoryFilterChange(
                          categoryFilter === t.categoria ? null : t.categoria
                        )
                      }
                      className="rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:border-slate-700 hover:text-white"
                      title="Filtrar por esta categoria"
                    >
                      {t.categoria}
                    </button>
                  </td>

                  {/* Tipo */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                        t.tipo === 'Entrada'
                          ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30'
                      }`}
                    >
                      {t.tipo === 'Entrada' ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span>{t.tipo}</span>
                    </span>
                  </td>

                  {/* Valor */}
                  <td
                    className={`whitespace-nowrap px-4 py-3 text-right font-mono font-extrabold text-sm ${
                      t.tipo === 'Entrada' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {t.tipo === 'Entrada' ? '+' : '-'} {formatBRL(t.valor)}
                  </td>

                  {/* Status */}
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      <span>{t.status || 'Confirmado'}</span>
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="h-8 w-8 text-slate-500" />
                    <p className="text-sm font-semibold text-slate-300">
                      Nenhum lançamento encontrado
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Nenhum registro corresponde aos filtros selecionados para este período.
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={clearAllFilters}
                        className="mt-2 rounded-xl bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                      >
                        Limpar todos os filtros
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Controls Footer */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span>Itens por página:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-300 focus:outline-none"
          >
            <option value={15}>15</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={-1}>Todos</option>
          </select>

          <span>
            Mostrando{' '}
            <strong className="text-white">
              {sortedData.length === 0
                ? 0
                : (currentPage - 1) * (pageSize === -1 ? sortedData.length : pageSize) + 1}
            </strong>
            -
            <strong className="text-white">
              {pageSize === -1
                ? sortedData.length
                : Math.min(currentPage * pageSize, sortedData.length)}
            </strong>{' '}
            de <strong className="text-white">{sortedData.length}</strong>
          </span>
        </div>

        {pageSize !== -1 && totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-800 bg-slate-950 p-1.5 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
              title="Primeira página"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-800 bg-slate-950 p-1.5 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
              title="Página anterior"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <span className="px-2 font-medium text-slate-300">
              Página <strong className="text-white">{currentPage}</strong> de{' '}
              <strong className="text-white">{totalPages}</strong>
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-800 bg-slate-950 p-1.5 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
              title="Próxima página"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-800 bg-slate-950 p-1.5 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
              title="Última página"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
