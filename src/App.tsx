import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient, User } from '@supabase/supabase-js';
import { Transacao, MonthSummary, CategorySummary } from './types/financeiro';
import { MONTH_TABS, categorizeExpense } from './utils/formatters';
import { Navbar } from './components/Navbar';
import { MonthTabs } from './components/MonthTabs';
import { KPICards } from './components/KPICards';
import { EvolutionChart } from './components/EvolutionChart';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { TransactionsTable } from './components/TransactionsTable';
import { LoginScreen, AccessDeniedScreen } from './components/AuthScreen';
import { AlertCircle, RefreshCw } from 'lucide-react';

// Supabase Client (Credenciais públicas da aplicação)
const SUPABASE_URL = 'https://hsmsrblpfqrjnpouuowf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_9kncZz2ycR7D0nVH_y36bw_r3frcW80';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Financial Data State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('Novembro');
  const [monthsData, setMonthsData] = useState<Map<string, MonthSummary>>(new Map());
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [serverDenied, setServerDenied] = useState(false);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);

  // Cross-component Filter State
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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

  // Sync via Edge Function
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

  // When changing month, reset category filter
  const handleSelectMonth = (month: string) => {
    setSelectedMonth(month);
    setCategoryFilter(null);
  };

  // Current Summary
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

  // Annual Chart Data with Margins and Full Names
  const annualChartData = useMemo(() => {
    return MONTH_TABS.map((tab) => {
      const summary = monthsData.get(tab.name);
      const entradas = summary?.entradas || 0;
      const saidas = summary?.saidas || 0;
      const saldo = entradas - saidas;
      const margem = entradas > 0 ? (saldo / entradas) * 100 : 0;
      return {
        mes: tab.short,
        fullName: tab.name,
        entradas,
        saidas,
        saldo,
        margem,
      };
    });
  }, [monthsData]);

  // Category Breakdown for Selected Period
  const categoryBreakdown = useMemo<CategorySummary[]>(() => {
    const map = new Map<string, { total: number; count: number }>();
    const expenseTransactions = currentSummary.transacoes.filter((t) => t.tipo === 'Saida');
    const totalExpenses = expenseTransactions.reduce((acc, t) => acc + t.valor, 0);

    expenseTransactions.forEach((t) => {
      const current = map.get(t.categoria) || { total: 0, count: 0 };
      map.set(t.categoria, {
        total: current.total + t.valor,
        count: current.count + 1,
      });
    });

    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        value: data.total,
        count: data.count,
        percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [currentSummary]);

  // Available Categories (Unique list for the dropdown filter)
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    currentSummary.transacoes.forEach((t) => {
      if (t.categoria) set.add(t.categoria);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [currentSummary]);

  const margemLiquida = useMemo(() => {
    if (currentSummary.entradas === 0) return 0;
    return (currentSummary.saldo / currentSummary.entradas) * 100;
  }, [currentSummary]);

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
  // RENDER: Login Screen
  // -------------------------------------------------------------
  if (!user) {
    return (
      <LoginScreen
        emailInput={emailInput}
        setEmailInput={setEmailInput}
        passwordInput={passwordInput}
        setPasswordInput={setPasswordInput}
        loginError={loginError}
        isSubmitting={isSubmitting}
        onSubmit={handleLogin}
      />
    );
  }

  // -------------------------------------------------------------
  // RENDER: Access Denied
  // -------------------------------------------------------------
  if (!isAuthorized) {
    return <AccessDeniedScreen user={user} onLogout={handleLogout} />;
  }

  // -------------------------------------------------------------
  // RENDER: Full Executive Dashboard
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-400">
      {/* Top Navbar */}
      <Navbar
        user={user}
        lastSync={lastSync}
        refreshing={refreshing}
        spreadsheetUrl={spreadsheetUrl}
        onRefresh={handleManualRefresh}
        onLogout={handleLogout}
      />

      {/* Main Dashboard Container */}
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Error Notification */}
        {error && (
          <div className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-medium text-red-300">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
            <button
              onClick={handleManualRefresh}
              className="flex items-center gap-1 font-bold underline hover:text-white"
            >
              <RefreshCw className="h-3 w-3" />
              Tentar novamente
            </button>
          </div>
        )}

        {/* 1. Month Selector Tabs */}
        <MonthTabs
          tabs={MONTH_TABS}
          selectedMonth={selectedMonth}
          monthsData={monthsData}
          onSelectMonth={handleSelectMonth}
        />

        {/* 2. Top 4 KPI Cards (Hero) */}
        <KPICards
          selectedMonth={selectedMonth}
          entradas={currentSummary.entradas}
          saidas={currentSummary.saidas}
          saldo={currentSummary.saldo}
          divisaoSocio={currentSummary.divisaoSocio}
          margemLiquida={margemLiquida}
          totalTransacoes={currentSummary.transacoes.length}
        />

        {/* 3. The Two Windows Below Hero (Evolução Financeira & Despesas por Categoria) */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Window 1: BarChart Evolução Mensal (2/3 width) */}
          <EvolutionChart
            data={annualChartData}
            selectedMonth={selectedMonth}
            onSelectMonth={handleSelectMonth}
          />

          {/* Window 2: Category Breakdown with Donut & Ranked Progress List (1/3 width) */}
          <CategoryBreakdown
            categories={categoryBreakdown}
            totalDespesas={currentSummary.saidas}
            selectedMonth={selectedMonth}
            activeCategoryFilter={categoryFilter}
            onSelectCategoryFilter={setCategoryFilter}
          />
        </section>

        {/* 4. Transactions Extrato Table with Multi-Column Sorting, Search, Category Filter & Pagination */}
        <TransactionsTable
          transacoes={currentSummary.transacoes}
          selectedMonth={selectedMonth}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          availableCategories={availableCategories}
        />
      </main>
    </div>
  );
}
