import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient, User } from '@supabase/supabase-js';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  RefreshCw,
  ExternalLink,
  Settings,
  ShieldAlert,
  Search,
  Download,
  CheckCircle2,
  AlertCircle,
  Lock,
  LogOut,
  Mail,
  KeyRound,
  ArrowRight,
  Users,
  ChevronRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Supabase Client
const SUPABASE_URL = 'https://hsmsrblpfqrjnpouuowf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_9kncZz2ycR7D0nVH_y36bw_r3frcW80';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const MONTH_TABS = [
  { name: 'Janeiro', short: 'Jan' },
  { name: 'Fevereiro', short: 'Fev' },
  { name: 'Março', short: 'Mar' },
  { name: 'Abril', short: 'Abr' },
  { name: 'Maio', short: 'Mai' },
  { name: 'Junho', short: 'Jun' },
  { name: 'Julho', short: 'Jul' },
  { name: 'Agosto', short: 'Ago' },
  { name: 'Setembro', short: 'Set' },
  { name: 'Outubro', short: 'Out' },
  { name: 'Novembro', short: 'Nov', isCurrent: true },
  { name: 'Dezembro', short: 'Dez' },
];

interface Transacao {
  id: string;
  mes: string;
  dia?: number | string;
  descricao: string;
  detalhe?: string;
  categoria: string;
  tipo: 'Entrada' | 'Saida';
  valor: number;
  status: string;
}

interface MonthSummary {
  mes: string;
  entradas: number;
  saidas: number;
  saldo: number;
  divisaoSocio: number;
  transacoes: Transacao[];
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#64748b', '#f97316'];

function categorizeExpense(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes('vivo') || d.includes('vvn') || d.includes('zaptus') || d.includes('stevo') || d.includes('whatsapp') || d.includes('wpp')) {
    return 'Telefonia & WhatsApp';
  }
  if (d.includes('supabase') || d.includes('google') || d.includes('clickup') || d.includes('canva') || d.includes('chatgpt') || d.includes('openai') || d.includes('rebrand') || d.includes('api')) {
    return 'SaaS & Ferramentas';
  }
  if (d.includes('hospedagem') || d.includes('vps') || d.includes('servidor') || d.includes('n8n') || d.includes('dominio')) {
    return 'Infraestrutura';
  }
  if (d.includes('iof') || d.includes('taxa') || d.includes('imposto')) {
    return 'Taxas & Impostos';
  }
  if (d.includes('folha') || d.includes('estagi') || d.includes('salario') || d.includes('vendedor')) {
    return 'Equipe & Pessoas';
  }
  if (d.includes('curso') || d.includes('compliance')) {
    return 'Treinamento & Cursos';
  }
  if (d.includes('suprimentos')) {
    return 'Operacional';
  }
  return 'Despesas Diversas';
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Financial Data
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('Novembro');
  const [monthsData, setMonthsData] = useState<Map<string, MonthSummary>>(new Map());
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<'Todos' | 'Entrada' | 'Saida'>('Todos');
  const [serverDenied, setServerDenied] = useState(false);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);

  // Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setServerDenied(false);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAuthorized = Boolean(user && !serverDenied);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: emailInput.trim(),
        password: passwordInput,
      });
      if (authErr) throw authErr;
      setUser(data.user);
    } catch (err: any) {
      setLoginError(err.message || 'Falha na autenticação. Verifique suas credenciais.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // Sincronização via Supabase Edge Function autenticada (zero segredos no browser)
  const fetchAllMonthsData = useCallback(async () => {
    setError(null);
    try {
      const newMap = new Map<string, MonthSummary>();
      const { data, error: fnErr } = await supabase.functions.invoke('financeiro-sync');

      if (fnErr) {
        const status = (fnErr as { context?: { status?: number } })?.context?.status;
        if (status === 401 || status === 403) {
          setServerDenied(true);
          return;
        }
        throw new Error(fnErr.message || 'Erro ao sincronizar financeiro');
      }

      if (!data?.months) {
        throw new Error('Resposta inválida da Edge Function financeiro-sync');
      }

      if (data.spreadsheetUrl) {
        setSpreadsheetUrl(data.spreadsheetUrl);
      }

      (data.months as MonthSummary[]).forEach((m) => {
        const transacoes = (m.transacoes || []).map((t) => ({
          ...t,
          categoria: t.tipo === 'Saida' ? categorizeExpense(t.descricao) : t.categoria,
        }));
        newMap.set(m.mes, {
          ...m,
          divisaoSocio: m.saldo > 0 ? m.saldo / 2 : 0,
          transacoes,
        });
      });

      setMonthsData(newMap);
      setLastSync(new Date());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar dados financeiros.';
      console.error('Erro na sincronização:', err);
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      fetchAllMonthsData();
      const interval = setInterval(fetchAllMonthsData, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthorized, fetchAllMonthsData]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchAllMonthsData();
  };

  // Dados do Período Selecionado
  const currentSummary = useMemo(() => {
    if (selectedMonth === 'TODOS') {
      let totalEnt = 0;
      let totalSai = 0;
      const allTrans: Transacao[] = [];
      monthsData.forEach((m) => {
        totalEnt += m.entradas;
        totalSai += m.saidas;
        allTrans.push(...m.transacoes);
      });
      const saldo = totalEnt - totalSai;
      return {
        mes: 'Consolidado Anual',
        entradas: totalEnt,
        saidas: totalSai,
        saldo,
        divisaoSocio: saldo > 0 ? saldo / 2 : 0,
        transacoes: allTrans,
      };
    }
    return (
      monthsData.get(selectedMonth) || {
        mes: selectedMonth,
        entradas: 0,
        saidas: 0,
        saldo: 0,
        divisaoSocio: 0,
        transacoes: [],
      }
    );
  }, [selectedMonth, monthsData]);

  // Gráfico Anual (Todos os meses lado a lado)
  const annualChartData = useMemo(() => {
    return MONTH_TABS.map((tab) => {
      const summary = monthsData.get(tab.name);
      return {
        mes: tab.short,
        entradas: summary?.entradas || 0,
        saidas: summary?.saidas || 0,
      };
    });
  }, [monthsData]);

  // Categorias de Despesas do Período
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    currentSummary.transacoes
      .filter((t) => t.tipo === 'Saida')
      .forEach((t) => {
        map.set(t.categoria, (map.get(t.categoria) || 0) + t.valor);
      });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [currentSummary]);

  // Transações Filtradas
  const filteredTransacoes = useMemo(() => {
    return currentSummary.transacoes.filter((t) => {
      const matchesSearch =
        t.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.detalhe && t.detalhe.toLowerCase().includes(searchTerm.toLowerCase())) ||
        t.categoria.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTipo = tipoFilter === 'Todos' || t.tipo === tipoFilter;
      return matchesSearch && matchesTipo;
    });
  }, [currentSummary, searchTerm, tipoFilter]);

  const margemLiquida = useMemo(() => {
    if (currentSummary.entradas === 0) return 0;
    return (currentSummary.saldo / currentSummary.entradas) * 100;
  }, [currentSummary]);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const exportCSV = () => {
    const headers = ['Mês', 'Dia', 'Descrição / Cliente', 'Detalhe / Projeto', 'Categoria', 'Tipo', 'Valor (R$)', 'Status'];
    const rows = filteredTransacoes.map((t) => [
      t.mes,
      t.dia || '',
      `"${t.descricao.replace(/"/g, '""')}"`,
      `"${(t.detalhe || '').replace(/"/g, '""')}"`,
      `"${t.categoria.replace(/"/g, '""')}"`,
      t.tipo,
      t.valor.toFixed(2),
      t.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `financeiro_orbita_${selectedMonth.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // -------------------------------------------------------------
  // RENDER: Loading Session
  // -------------------------------------------------------------
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm font-medium text-slate-400">Verificando sessão executiva...</p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Login
  // -------------------------------------------------------------
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12">
        <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-lg shadow-emerald-500/20">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
            <h2 className="mt-5 text-2xl font-bold tracking-tight text-white">Órbita Financeiro</h2>
            <p className="mt-1 text-sm text-slate-400">Ambiente executivo restrito à diretoria</p>
          </div>

          {loginError && (
            <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">E-mail corporativo</label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="seu-email@gmail.com"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 transition focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Senha de acesso</label>
              <div className="relative mt-2">
                <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 transition focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
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
            <span>Acesso criptografado e restrito à diretoria</span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Access Denied
  // -------------------------------------------------------------
  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-lg rounded-2xl border border-red-500/20 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-white">Acesso Restrito à Diretoria</h2>
          <p className="mt-2 text-sm text-slate-400">
            Conectado como <strong className="text-white">{user.email}</strong>. Painel financeiro exclusivo para Vinicius Santana e Raianni Filgueiras.
          </p>
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Full Executive Dashboard
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-md shadow-emerald-500/20">
              <DollarSign className="h-6 w-6 text-slate-950 font-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white sm:text-lg">Órbita Financeiro</h1>
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Tempo Real
                </span>
              </div>
              <p className="text-xs text-slate-400">Painel Estratégico & DRE da Diretoria</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {lastSync && (
              <span className="hidden text-xs text-slate-400 md:inline-block">
                Sincronizado às {lastSync.toLocaleTimeString('pt-BR')}
              </span>
            )}

            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-800/60 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
              title="Atualizar dados da planilha agora"
            >
              <RefreshCw className={`h-4 w-4 text-emerald-400 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            {spreadsheetUrl && (
              <a
                href={spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-800/60 p-2 text-slate-300 transition hover:bg-slate-800 sm:px-3"
                title="Abrir Planilha no Google Sheets"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline text-xs font-semibold">Planilha</span>
              </a>
            )}

            <div className="h-6 w-px bg-slate-800 mx-1" />

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
              title="Encerrar Sessão"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Month Selector Tabs */}
        <section className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedMonth('TODOS')}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold transition ${
              selectedMonth === 'TODOS'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-600/20'
                : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Ano Todo (Consolidado)
          </button>

          {MONTH_TABS.map((tab) => {
            const isSelected = selectedMonth === tab.name;
            const hasData = monthsData.has(tab.name) && (monthsData.get(tab.name)?.transacoes.length || 0) > 0;
            return (
              <button
                key={tab.name}
                onClick={() => setSelectedMonth(tab.name)}
                className={`relative whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  isSelected
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                    : 'border border-slate-800/80 bg-slate-900/50 text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <span>{tab.name}</span>
                {tab.isCurrent && (
                  <span className="ml-1.5 rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] text-emerald-300">
                    Atual
                  </span>
                )}
                {hasData && !isSelected && (
                  <span className="ml-1 h-1.5 w-1.5 inline-block rounded-full bg-slate-500" />
                )}
              </button>
            );
          })}
        </section>

        {/* Top 4 KPI Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Faturamento */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Faturamento {selectedMonth === 'TODOS' ? 'Anual' : selectedMonth}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold tracking-tight text-white">{formatBRL(currentSummary.entradas)}</h3>
              <p className="mt-1 text-xs text-emerald-400/80">Entradas de clientes & projetos</p>
            </div>
          </div>

          {/* Card 2: Despesas */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Despesas {selectedMonth === 'TODOS' ? 'Anuais' : selectedMonth}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold tracking-tight text-white">{formatBRL(currentSummary.saidas)}</h3>
              <p className="mt-1 text-xs text-red-400/80">Custos, ferramentas & infra</p>
            </div>
          </div>

          {/* Card 3: Saldo Líquido */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Saldo Líquido</span>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${currentSummary.saldo >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className={`text-2xl font-bold tracking-tight ${currentSummary.saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatBRL(currentSummary.saldo)}
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Margem líquida: <span className="font-semibold text-white">{margemLiquida.toFixed(1)}%</span>
              </p>
            </div>
          </div>

          {/* Card 4: Divisão por Sócio (50% / 50%) */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-slate-900/60 to-slate-900/60 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                Divisão por Sócio (50%)
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold tracking-tight text-emerald-400">
                {formatBRL(currentSummary.divisaoSocio)}
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Vinicius: <span className="font-semibold text-emerald-300">{formatBRL(currentSummary.divisaoSocio)}</span> • Raianni: <span className="font-semibold text-emerald-300">{formatBRL(currentSummary.divisaoSocio)}</span>
              </p>
            </div>
          </div>
        </section>

        {/* Charts Grid */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* BarChart: Fluxo de Caixa Mensal */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-sm lg:col-span-2">
            <div className="flex items-center justify-between pb-2">
              <div>
                <h3 className="text-base font-bold text-white">Evolução Mensal (Ano Todo)</h3>
                <p className="text-xs text-slate-400">Comparativo real de faturamento vs despesas mês a mês</p>
              </div>
            </div>
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={annualChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="mes" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `R$${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff' }}
                    formatter={(val: number) => [formatBRL(val), '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="entradas" name="Faturamento (Entradas)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="saidas" name="Despesas (Saídas)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* PieChart: Despesas por Categoria */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-sm">
            <div className="pb-2">
              <h3 className="text-base font-bold text-white">Despesas por Categoria</h3>
              <p className="text-xs text-slate-400">Distribuição de custos em {selectedMonth}</p>
            </div>
            <div className="h-72 w-full pt-4">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="48%"
                      outerRadius={75}
                      innerRadius={40}
                      paddingAngle={3}
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff' }}
                      formatter={(val: number) => [formatBRL(val), '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-500">
                  Nenhuma despesa registrada para o período selecionado
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Transactions Table Section */}
        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Extrato de Lançamentos ({selectedMonth})</h3>
              <p className="text-xs text-slate-400">
                {filteredTransacoes.length} lançamentos encontrados
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative min-w-[220px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar cliente, projeto ou despesa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Type Filter */}
              <div className="flex rounded-xl border border-slate-800 bg-slate-950/80 p-1">
                {(['Todos', 'Entrada', 'Saida'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTipoFilter(t)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      tipoFilter === t
                        ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t === 'Todos' ? 'Todos' : t === 'Entrada' ? 'Entradas (+)' : 'Saídas (-)'}
                  </button>
                ))}
              </div>

              {/* Export */}
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                <Download className="h-4 w-4 text-emerald-400" />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="mt-5 overflow-x-auto rounded-xl border border-slate-800/80">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/60 uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Mês / Dia</th>
                  <th className="px-4 py-3 font-semibold">Descrição / Cliente</th>
                  <th className="px-4 py-3 font-semibold">Categoria</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold text-right">Valor</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTransacoes.length > 0 ? (
                  filteredTransacoes.map((t) => (
                    <tr key={t.id} className="transition hover:bg-slate-800/30">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-300 font-mono">
                        {t.mes}{t.dia ? ` • Dia ${t.dia}` : ''}
                      </td>
                      <td className="px-4 py-3 font-medium text-white">
                        <div>{t.descricao}</div>
                        {t.detalhe && (
                          <div className="text-[11px] font-normal text-slate-400">{t.detalhe}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md border border-slate-800 bg-slate-800/40 px-2 py-0.5 text-[11px] text-slate-300">
                          {t.categoria}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                            t.tipo === 'Entrada'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {t.tipo}
                        </span>
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right font-bold ${
                          t.tipo === 'Entrada' ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {t.tipo === 'Entrada' ? '+' : '-'} {formatBRL(t.valor)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          <span>{t.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Nenhum lançamento encontrado para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
