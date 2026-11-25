import { t } from '../i18n';
import { el } from './dom';

/**
 * Classificação do questionário IARC (24/11/2026), mostrada conforme o país. O padrão é a recomendação da Jaloto
 * Software, 6+; o Brasil mostra a do ClassInd (Livre), e os países com classificação acima de 6 mostram a deles, só em
 * texto, sem os logotipos dos órgãos. O país sai do fuso e do idioma do aparelho, sem internet e sem guardar nada.
 */
export type RatingRegion = 'BR' | 'US' | 'CA' | 'TW' | 'SA' | 'ID';

const BR = [
  'Sao_Paulo',
  'Bahia',
  'Fortaleza',
  'Recife',
  'Maceio',
  'Belem',
  'Araguaina',
  'Santarem',
  'Manaus',
  'Boa_Vista',
  'Porto_Velho',
  'Rio_Branco',
  'Eirunepe',
  'Cuiaba',
  'Campo_Grande',
  'Noronha',
];
// tz database (zone1970.tab e zone.tab), com os nomes antigos que alguns aparelhos ainda devolvem
const US = [
  'America/New_York',
  'America/Detroit',
  'America/Kentucky/Louisville',
  'America/Kentucky/Monticello',
  'America/Louisville',
  'America/Indiana/Indianapolis',
  'America/Indianapolis',
  'America/Fort_Wayne',
  'America/Indiana/Vincennes',
  'America/Indiana/Winamac',
  'America/Indiana/Marengo',
  'America/Indiana/Petersburg',
  'America/Indiana/Vevay',
  'America/Chicago',
  'America/Indiana/Tell_City',
  'America/Indiana/Knox',
  'America/Menominee',
  'America/North_Dakota/Center',
  'America/North_Dakota/New_Salem',
  'America/North_Dakota/Beulah',
  'America/Denver',
  'America/Boise',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'America/Juneau',
  'America/Sitka',
  'America/Metlakatla',
  'America/Yakutat',
  'America/Nome',
  'America/Adak',
  'Pacific/Honolulu',
];
const CA = [
  'America/St_Johns',
  'America/Halifax',
  'America/Glace_Bay',
  'America/Moncton',
  'America/Goose_Bay',
  'America/Blanc-Sablon',
  'America/Toronto',
  'America/Nipigon',
  'America/Thunder_Bay',
  'America/Iqaluit',
  'America/Pangnirtung',
  'America/Atikokan',
  'America/Winnipeg',
  'America/Rainy_River',
  'America/Resolute',
  'America/Rankin_Inlet',
  'America/Regina',
  'America/Swift_Current',
  'America/Edmonton',
  'America/Cambridge_Bay',
  'America/Yellowknife',
  'America/Inuvik',
  'America/Creston',
  'America/Dawson_Creek',
  'America/Fort_Nelson',
  'America/Whitehorse',
  'America/Dawson',
  'America/Vancouver',
];

const ZONES = new Map<string, RatingRegion>([
  ...BR.map((z) => [`America/${z}`, 'BR'] as const),
  ...US.map((z) => [z, 'US'] as const),
  ...CA.map((z) => [z, 'CA'] as const),
  ['Asia/Taipei', 'TW'],
  ['Asia/Riyadh', 'SA'],
  ['Asia/Jakarta', 'ID'],
  ['Asia/Pontianak', 'ID'],
  ['Asia/Makassar', 'ID'],
  ['Asia/Jayapura', 'ID'],
]);

const REGIONS: readonly string[] = ['BR', 'US', 'CA', 'TW', 'SA', 'ID'];

/** País pelo fuso; se o fuso não decidir, pela região do idioma (pt-BR, en-US, zh-TW...); senão, nenhum. */
export function ratingRegion(tz: string | undefined, langs: readonly string[] = []): RatingRegion | null {
  const z = tz ? ZONES.get(tz) : undefined;
  if (z) return z;
  for (const l of langs) {
    const r = l.split(/[-_]/)[1]?.toUpperCase();
    if (r && REGIONS.includes(r)) return r as RatingRegion;
  }
  return null;
}

export interface RatingView {
  badge: string;
  /** Classe do selo: o verde do ClassInd só no Brasil; o resto é neutro. */
  kind: 'classind-L' | 'plain';
  lines: string[];
  note: string | null;
}

export function ratingView(r: RatingRegion | null): RatingView {
  switch (r) {
    case 'BR':
      return {
        badge: 'L',
        kind: 'classind-L',
        lines: [t('Recomendado a partir de 6 anos')],
        note: t('Violência fantasiosa'),
      };
    case 'US':
    case 'CA':
      return { badge: 'E10+', kind: 'plain', lines: ['ESRB: E10+ (Everyone 10+)'], note: 'Fantasy Violence' };
    case 'TW':
      return { badge: '12+', kind: 'plain', lines: ['輔12級 (DGSC)'], note: t('Violência') };
    case 'SA':
      return { badge: '7+', kind: 'plain', lines: ['Gmedia 7+'], note: null };
    case 'ID':
      return { badge: '13+', kind: 'plain', lines: ['IGRS 13+'], note: null };
    default:
      return {
        badge: '6+',
        kind: 'plain',
        lines: [t('Recomendado a partir de 6 anos')],
        note: t('Violência fantasiosa'),
      };
  }
}

export function deviceRegion(): RatingRegion | null {
  let tz: string | undefined;
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    tz = undefined;
  }
  const langs = typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language]);
  return ratingRegion(tz, langs);
}

export function ageRating(): HTMLElement {
  const v = ratingView(deviceRegion());
  return el(
    'div',
    { class: 'age-rating', title: t('Classificação indicativa') },
    el('b', { class: `age-badge age-${v.kind}` }, v.badge),
    el('div', {}, ...v.lines.map((l) => el('span', {}, l)), v.note ? el('small', {}, v.note) : null),
  );
}

/**
 * Caixa do ClassInd no modelo oficial (Guia Prático de Classificação Indicativa, 5ª ed., 2025, itens O.3 e H.1), com o
 * que o certificado IARC deu no Brasil. Fica em português, como o guia pede.
 */
export const CLASSIND_BOX = {
  title: 'CLASSIFICAÇÃO INDICATIVA: LIVRE',
  symbol: 'L',
  descriptor: 'Violência fantasiosa',
  interactive: 'Interação de usuários',
  recommendation: 'Recomendado a partir de 6 anos',
} as const;

/** Só no Brasil: a caixa da tela de entrada, a cada acesso. */
export function classIndNotice(): HTMLElement | null {
  if (deviceRegion() !== 'BR') return null;
  const b = CLASSIND_BOX;
  const box: HTMLElement = el(
    'div',
    { class: 'classind-notice' },
    el(
      'div',
      { class: 'ci-box' },
      el('div', { class: 'ci-title' }, b.title),
      el(
        'div',
        { class: 'ci-body' },
        el('b', { class: 'ci-symbol' }, b.symbol),
        el('span', {}, b.descriptor),
      ),
      el('div', { class: 'ci-interactive' }, b.interactive),
    ),
    el('div', { class: 'ci-reco' }, b.recommendation),
  );
  box.setAttribute('role', 'region');
  box.setAttribute('aria-label', b.title);
  return box;
}
