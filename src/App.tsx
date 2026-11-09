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
  Filter,
  Download,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Lock,
  LogOut,
  Mail,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  Building2,
  Calendar,
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

const AUTHORIZED_EMAILS = [
  'vinicsantana2008@gmail.com',
  'raiannifilgueiras@gmail.com',
];

const DEFAULT_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1Xl2d057aR2h6hV2kM6E9W7z3_hSj7V5z4/edit';

interface Transacao {
  id: string;
  data: string;
  descricao: string;
  categoria: string;
  tipo: 'Entrada' | 'Saida';
  valor: number;
  status: string;
  contraparte?: string;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#64748b'];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dashboard Data states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string>(() => {
    return localStorage.getItem('orbita_financeiro_sheet_url') || DEFAULT_SHEET_URL;
  });
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<'Todos' | 'Entrada' | 'Saida'>('Todos');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newSheetUrl, setNewSheetUrl] = useState('');

  // 1. Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAuthorized = useMemo(() => {
    if (!user || !user.email) return false;
    return AUTHORIZED_EMAILS.includes(user.email.toLowerCase().trim());
  }, [user]);

  // Handle Login
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

  // 2. Load Config from Supabase
  const loadSheetConfig = useCallback(async () => {
    try {
      const { data, error: cfgErr } = await supabase
        .from('configuracoes_sistema')
        .select('valor')
        .eq('chave', 'financeiro_planilha_url')
        .maybeSingle();

      if (!cfgErr && data?.valor) {
        setSheetUrl(data.valor);
        localStorage.setItem('orbita_financeiro_sheet_url', data.valor);
      }
    } catch (e) {
      console.warn('Erro ao carregar configuracoes_sistema:', e);
    }
  }, []);

  // 3. Fetch & Parse Google Sheets
  const fetchSheetData = useCallback(async (targetUrl?: string) => {
    const urlToUse = targetUrl || sheetUrl;
    if (!urlToUse) return;

    setError(null);
    try {
      const match = urlToUse.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) {
        throw new Error('Link do Google Sheets inválido. Certifique-se de usar a URL completa da planilha.');
      }
      const spreadsheetId = match[1];

      let gidMatch = urlToUse.match(/[#&?]gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : '0';

      const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&gid=${gid}`;
      const res = await fetch(gvizUrl);
      if (!res.ok) throw new Error(`Falha ao conectar com o Google Sheets (${res.status})`);

      const text = await res.text();
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('Formato retornado pelo Google Sheets não reconhecido.');
      }

      const rawJson = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
      const cols = rawJson.table.cols.map((c: any) => (c.label || c.id || '').toLowerCase().trim());
      const rows = rawJson.table.rows;

      const findColIdx = (aliases: string[]) => {
        return cols.findIndex((col: string) => aliases.some((alias) => col.includes(alias)));
      };

      const dateIdx = findColIdx(['data', 'dt', 'date', 'vencimento', 'competência']);
      const descIdx = findColIdx(['descri', 'histórico', 'item', 'lançamento', 'detalhe']);
      const catIdx = findColIdx(['categoria', 'classifica', 'plano', 'grupo']);
      const tipoIdx = findColIdx(['tipo', 'natureza', 'operacao', 'e/s']);
      const valIdx = findColIdx(['valor', 'total', 'quantia', 'r$', 'saldo']);
      const statusIdx = findColIdx(['status', 'situacao', 'pago', 'efetivado']);
      const contIdx = findColIdx(['cliente', 'fornecedor', 'contraparte', 'favorecido', 'origem', 'destino']);

      const parsed: Transacao[] = rows
        .map((row: any, rIdx: number) => {
          const c = row.c || [];
          const getVal = (idx: number) => {
            if (idx === -1 || !c[idx]) return '';
            return c[idx].v !== null && c[idx].v !== undefined ? c[idx].v : (c[idx].f || '');
          };

          const rawDate = getVal(dateIdx !== -1 ? dateIdx : 0);
          const rawDesc = String(getVal(descIdx !== -1 ? descIdx : 1) || `Lançamento #${rIdx + 1}`);
          const rawCat = String(getVal(catIdx !== -1 ? catIdx : 2) || 'Geral');
          let rawTipo = String(getVal(tipoIdx !== -1 ? tipoIdx : 3)).toLowerCase();
          const rawVal = getVal(valIdx !== -1 ? valIdx : 4);
          const rawStatus = String(getVal(statusIdx !== -1 ? statusIdx : 5) || 'Confirmado');
          const rawCont = contIdx !== -1 ? String(getVal(contIdx)) : undefined;

          let numVal = 0;
          if (typeof rawVal === 'number') {
            numVal = rawVal;
          } else if (rawVal) {
            const cleanStr = String(rawVal).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
            numVal = parseFloat(cleanStr) || 0;
          }

          let tipo: 'Entrada' | 'Saida' = 'Entrada';
          if (rawTipo.includes('sai') || rawTipo.includes('desp') || rawTipo.includes('deb') || numVal < 0) {
            tipo = 'Saida';
          } else if (rawTipo.includes('ent') || rawTipo.includes('rec') || rawTipo.includes('cred')) {
            tipo = 'Entrada';
          } else {
            tipo = numVal < 0 ? 'Saida' : 'Entrada';
          }

          let dateStr = '';
          if (rawDate instanceof Date) {
            dateStr = rawDate.toLocaleDateString('pt-BR');
          } else if (typeof rawDate === 'string' && rawDate.startsWith('Date(')) {
            const parts = rawDate.match(/\d+/g);
            if (parts) {
              const d = new Date(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]));
              dateStr = d.toLocaleDateString('pt-BR');
            }
          } else {
            dateStr = String(rawDate || '');
          }

          return {
            id: `row-${rIdx}`,
            data: dateStr,
            descricao: rawDesc,
            categoria: rawCat,
            tipo,
            valor: Math.abs(numVal),
            status: rawStatus,
            contraparte: rawCont,
          };
        })
        .filter((t: Transacao) => t.descricao && t.valor > 0);

      setTransacoes(parsed);
      setLastSync(new Date());
    } catch (err: any) {
      console.error('Erro na sincronização:', err);
      setError(err.message || 'Erro ao carregar dados da planilha.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sheetUrl]);

  useEffect(() => {
    if (isAuthorized) {
      loadSheetConfig();
      fetchSheetData();
      const interval = setInterval(() => {
        fetchSheetData();
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthorized, loadSheetConfig, fetchSheetData]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchSheetData();
  };

  const handleSaveSettings = async () => {
    if (!newSheetUrl.trim()) return;
    setSheetUrl(newSheetUrl.trim());
    localStorage.setItem('orbita_financeiro_sheet_url', newSheetUrl.trim());

    try {
      await supabase.from('configuracoes_sistema').upsert({
        chave: 'financeiro_planilha_url',
        valor: newSheetUrl.trim(),
        descricao: 'URL do Google Sheets com lançamentos da diretoria',
        atualizado_em: new Date().toISOString(),
      }, { onConflict: 'chave' });
    } catch (e) {
      console.warn('Erro ao salvar configuracao no Supabase:', e);
    }

    setIsSettingsOpen(false);
    setLoading(true);
    fetchSheetData(newSheetUrl.trim());
  };

  // Metrics calculation
  const totalReceitas = useMemo(() => {
    return transacoes.filter((t) => t.tipo === 'Entrada').reduce((acc, cur) => acc + cur.valor, 0);
  }, [transacoes]);

  const totalDespesas = useMemo(() => {
    return transacoes.filter((t) => t.tipo === 'Saida').reduce((acc, cur) => acc + cur.valor, 0);
  }, [transacoes]);

  const saldoLiquido = useMemo(() => totalReceitas - totalDespesas, [totalReceitas, totalDespesas]);
  const margemLiquida = useMemo(() => {
    if (totalReceitas === 0) return 0;
    return (saldoLiquido / totalReceitas) * 100;
  }, [totalReceitas, saldoLiquido]);

  // Charts data
  const monthlyData = useMemo(() => {
    const map = new Map<string, { mes: string; entradas: number; saidas: number }>();
    transacoes.forEach((t) => {
      let mesKey = 'Geral';
      if (t.data) {
        const parts = t.data.split('/');
        if (parts.length >= 2) mesKey = `${parts[1]}/${parts[2] || parts[0]}`;
        else mesKey = t.data.substring(0, 7);
      }
      if (!map.has(mesKey)) {
        map.set(mesKey, { mes: mesKey, entradas: 0, saidas: 0 });
      }
      const entry = map.get(mesKey)!;
      if (t.tipo === 'Entrada') entry.entradas += t.valor;
      else entry.saidas += t.valor;
    });
    return Array.from(map.values()).slice(-12);
  }, [transacoes]);

  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    transacoes.filter((t) => t.tipo === 'Saida').forEach((t) => {
      const cat = t.categoria || 'Outros';
      map.set(cat, (map.get(cat) || 0) + t.valor);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [transacoes]);

  // Filtered transactions
  const filteredTransacoes = useMemo(() => {
    return transacoes.filter((t) => {
      const matchesSearch =
        t.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.contraparte && t.contraparte.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesTipo = tipoFilter === 'Todos' || t.tipo === tipoFilter;
      return matchesSearch && matchesTipo;
    });
  }, [transacoes, searchTerm, tipoFilter]);

  const exportCSV = () => {
    const headers = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor (R$)', 'Status', 'Contraparte'];
    const rows = filteredTransacoes.map((t) => [
      t.data,
      `"${t.descricao.replace(/"/g, '""')}"`,
      `"${t.categoria.replace(/"/g, '""')}"`,
      t.tipo,
      t.valor.toFixed(2),
      t.status,
      `"${(t.contraparte || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `financeiro_orbita_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
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
  // RENDER: Unauthenticated Login
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
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 transition focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 transition focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>Entrar no Dashboard</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
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
  }

  // -------------------------------------------------------------
  // RENDER: Access Denied (Unauthorized Email)
  // -------------------------------------------------------------
  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-lg rounded-2xl border border-red-500/20 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-white">Acesso Executivo Restrito</h2>
          <p className="mt-2 text-sm text-slate-400">
            Você está conectado como <strong className="text-white">{user.email}</strong>, porém este painel financeiro é restrito exclusivamente aos diretores executivos (<strong className="text-emerald-400">Vinicius Santana</strong> e <strong className="text-emerald-400">Raianni Filgueiras</strong>).
          </p>

          <div className="mt-8 flex justify-center gap-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 active:scale-95"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair da conta</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Full Authorized Financial Dashboard
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
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
              <p className="text-xs text-slate-400">Painel Estratégico da Diretoria</p>
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
              className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-800/60 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 active:scale-95 disabled:opacity-50"
              title="Atualizar dados agora"
            >
              <RefreshCw className={`h-4 w-4 text-emerald-400 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            <button
              onClick={() => {
                setNewSheetUrl(sheetUrl);
                setIsSettingsOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-800/60 p-2 text-slate-300 transition hover:bg-slate-800 active:scale-95 sm:px-3"
              title="Configurar Planilha"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline text-xs font-semibold">Configurar</span>
            </button>

            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-800/60 p-2 text-slate-300 transition hover:bg-slate-800 active:scale-95 sm:px-3"
              title="Abrir Google Sheet"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline text-xs font-semibold">Planilha</span>
            </a>

            <div className="h-6 w-px bg-slate-800 mx-1" />

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 active:scale-95"
              title="Encerrar Sessão"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Error Alert */}
        {error && (
          <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-300">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
              <p className="text-sm">{error}</p>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/30"
            >
              Ajustar Link
            </button>
          </div>
        )}

        {/* Top 4 KPI Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Faturamento */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Faturamento Bruto</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold tracking-tight text-white">{formatBRL(totalReceitas)}</h3>
              <p className="mt-1 text-xs text-emerald-400/80">Entradas acumuladas no período</p>
            </div>
          </div>

          {/* Card 2: Despesas */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Despesas Totais</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold tracking-tight text-white">{formatBRL(totalDespesas)}</h3>
              <p className="mt-1 text-xs text-red-400/80">Saídas e custos operacionais</p>
            </div>
          </div>

          {/* Card 3: Saldo Líquido */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Saldo Líquido</span>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${saldoLiquido >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className={`text-2xl font-bold tracking-tight ${saldoLiquido >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatBRL(saldoLiquido)}
              </h3>
              <p className="mt-1 text-xs text-slate-400">Resultado final do caixa</p>
            </div>
          </div>

          {/* Card 4: Margem Líquida */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Margem Líquida</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                <Percent className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold tracking-tight text-white">
                {margemLiquida.toFixed(1)}%
              </h3>
              <p className="mt-1 text-xs text-slate-400">Rentabilidade sobre o faturamento</p>
            </div>
          </div>
        </section>

        {/* Charts Grid */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* BarChart: Fluxo Mensal */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-sm lg:col-span-2">
            <div className="flex items-center justify-between pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Fluxo de Caixa Mensal</h3>
                <p className="text-xs text-slate-400">Comparativo de entradas e saídas por competência</p>
              </div>
            </div>
            <div className="h-72 w-full pt-4">
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                    <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-500">
                  Carregando dados mensais...
                </div>
              )}
            </div>
          </div>

          {/* PieChart: Despesas por Categoria */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-sm">
            <div className="pb-4">
              <h3 className="text-base font-bold text-white">Despesas por Categoria</h3>
              <p className="text-xs text-slate-400">Principais centros de custo</p>
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
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                      paddingAngle={4}
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff' }}
                      formatter={(val: number) => [formatBRL(val), '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-500">
                  Sem despesas registradas
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Transactions Table Section */}
        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Extrato de Lançamentos</h3>
              <p className="text-xs text-slate-400">
                {filteredTransacoes.length} de {transacoes.length} transações listadas
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search Input */}
              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar lançamento..."
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

              {/* Export CSV */}
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 active:scale-95"
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
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Descrição</th>
                  <th className="px-4 py-3 font-semibold">Categoria</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold text-right">Valor</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTransacoes.length > 0 ? (
                  filteredTransacoes.slice(0, 100).map((t) => (
                    <tr key={t.id} className="transition hover:bg-slate-800/30">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-300">{t.data}</td>
                      <td className="px-4 py-3 font-medium text-white">
                        {t.descricao}
                        {t.contraparte && (
                          <span className="block text-[11px] font-normal text-slate-400">{t.contraparte}</span>
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
                        <span className="flex items-center gap-1.5 text-slate-400">
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

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Configurar Planilha Google Sheets</h3>
            <p className="mt-1 text-xs text-slate-400">
              Cole a URL pública ou compartilhada da planilha para alimentar o dashboard em tempo real.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">URL da Planilha</label>
              <input
                type="url"
                value={newSheetUrl}
                onChange={(e) => setNewSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
              <p className="mt-2 text-[11px] text-slate-500">
                Dica: Certifique-se de que a planilha esteja compartilhada como "Qualquer pessoa com o link pode ler".
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveSettings}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500"
              >
                Salvar e Sincronizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
