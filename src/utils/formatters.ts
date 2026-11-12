import { MonthTab } from '../types/financeiro';

export const MONTH_TABS: MonthTab[] = [
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

export const CHART_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#eab308', // yellow
  '#64748b', // slate
];

export function formatBRL(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0);
}

export function formatCompactBRL(val: number): string {
  if (Math.abs(val) >= 1_000_000) {
    return `R$ ${(val / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(val) >= 1_000) {
    return `R$ ${(val / 1_000).toFixed(1)}k`;
  }
  return `R$ ${val.toFixed(0)}`;
}

export function formatPercent(val: number): string {
  return `${(val || 0).toFixed(1)}%`;
}

export function parseDay(d: number | string | undefined): number {
  if (d === undefined || d === null || d === '') return 0;
  if (typeof d === 'number') return d;
  const num = parseInt(String(d).replace(/\D/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

export function categorizeExpense(desc: string): string {
  const d = (desc || '').toLowerCase();
  if (
    d.includes('vivo') ||
    d.includes('vvn') ||
    d.includes('zaptus') ||
    d.includes('stevo') ||
    d.includes('whatsapp') ||
    d.includes('wpp')
  ) {
    return 'Telefonia & WhatsApp';
  }
  if (
    d.includes('supabase') ||
    d.includes('google') ||
    d.includes('clickup') ||
    d.includes('canva') ||
    d.includes('chatgpt') ||
    d.includes('openai') ||
    d.includes('rebrand') ||
    d.includes('api')
  ) {
    return 'SaaS & Ferramentas';
  }
  if (
    d.includes('hospedagem') ||
    d.includes('vps') ||
    d.includes('servidor') ||
    d.includes('n8n') ||
    d.includes('dominio')
  ) {
    return 'Infraestrutura';
  }
  if (d.includes('iof') || d.includes('taxa') || d.includes('imposto')) {
    return 'Taxas & Impostos';
  }
  if (
    d.includes('folha') ||
    d.includes('estagi') ||
    d.includes('salario') ||
    d.includes('vendedor')
  ) {
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
