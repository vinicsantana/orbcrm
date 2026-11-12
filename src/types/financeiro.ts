export interface Transacao {
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

export interface MonthSummary {
  mes: string;
  entradas: number;
  saidas: number;
  saldo: number;
  divisaoSocio: number;
  transacoes: Transacao[];
}

export interface MonthTab {
  name: string;
  short: string;
  isCurrent?: boolean;
}

export type SortField = 'dia' | 'descricao' | 'categoria' | 'tipo' | 'valor' | 'status';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface CategorySummary {
  name: string;
  value: number;
  percentage: number;
  count: number;
}
