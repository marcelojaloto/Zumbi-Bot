import { EN } from './en';

/**
 * Tradução no estilo gettext: o texto em português é a chave. Em português devolve o próprio texto;
 * em inglês procura no dicionário `EN` e, se faltar, cai no português. Módulo puro (sem DOM): quem
 * escolhe o idioma (navegador ou configuração) é o App.
 */
export type Lang = 'pt' | 'en';

let current: Lang = 'pt';

export function getLang(): Lang {
  return current;
}

export function setLang(l: Lang): void {
  current = l;
}

/** `pt`, `pt-BR`, `pt-PT` → português; qualquer outro idioma → inglês. */
export function detectLang(navLang: string | undefined | null): Lang {
  return (navLang ?? '').toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

/** Locale para números e datas. */
export function locale(): string {
  return current === 'pt' ? 'pt-BR' : 'en-US';
}

/** Traduz `pt` para o idioma atual e substitui `{nome}` pelos parâmetros. */
export function t(pt: string, params?: Record<string, string | number>): string {
  let s = current === 'en' ? (EN[pt] ?? pt) : pt;
  if (params) s = s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
  return s;
}

/** Ordinal curto: 1º / 1st, 2º / 2nd... */
export function ordinal(n: number): string {
  if (current === 'pt') return `${n}º`;
  const v = n % 100;
  const suf = v >= 11 && v <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suf}`;
}

/** Número decimal curto no formato do idioma (1,5 / 1.5). */
export function dec(n: number, digits = 1): string {
  return n.toLocaleString(locale(), { minimumFractionDigits: 0, maximumFractionDigits: digits });
}
