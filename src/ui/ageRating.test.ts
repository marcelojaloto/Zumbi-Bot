import { describe, expect, it } from 'vitest';
import { CLASSIND_BOX, ratingRegion, ratingView } from './ageRating';

describe('classificação conforme o país', () => {
  it('fuso de cada país com regra própria', () => {
    expect(ratingRegion('America/Sao_Paulo')).toBe('BR');
    expect(ratingRegion('America/Manaus')).toBe('BR');
    expect(ratingRegion('America/Chicago')).toBe('US');
    expect(ratingRegion('Pacific/Honolulu')).toBe('US');
    expect(ratingRegion('America/Toronto')).toBe('CA');
    expect(ratingRegion('Asia/Taipei')).toBe('TW');
    expect(ratingRegion('Asia/Riyadh')).toBe('SA');
    expect(ratingRegion('Asia/Makassar')).toBe('ID');
  });

  it('fuso desconhecido cai no idioma, e sem nada fica o padrão', () => {
    expect(ratingRegion('Europe/Berlin', ['de-DE'])).toBeNull();
    expect(ratingRegion('UTC', ['pt-BR', 'pt'])).toBe('BR');
    expect(ratingRegion(undefined, ['fr-CA'])).toBe('CA');
    expect(ratingRegion('Etc/GMT', ['zh-TW'])).toBe('TW');
    expect(ratingRegion(undefined, [])).toBeNull();
    // o fuso vale mais que o idioma
    expect(ratingRegion('America/New_York', ['pt-BR'])).toBe('US');
  });

  it('selo: Livre no Brasil, a classificação do país acima de 6, e 6+ no resto', () => {
    expect(ratingView('BR')).toMatchObject({
      badge: 'L',
      kind: 'classind-L',
      lines: ['Recomendado a partir de 6 anos'],
    });
    expect(ratingView('US').badge).toBe('E10+');
    expect(ratingView('CA').lines[0]).toContain('E10+');
    expect(ratingView('TW').badge).toBe('12+');
    expect(ratingView('SA').badge).toBe('7+');
    expect(ratingView('ID').badge).toBe('13+');
    expect(ratingView(null)).toMatchObject({ badge: '6+', kind: 'plain' });
  });

  it('caixa do ClassInd no Brasil: L oficial, descritor e interação, com o 6 só como recomendação', () => {
    expect(CLASSIND_BOX).toEqual({
      title: 'CLASSIFICAÇÃO INDICATIVA: LIVRE',
      symbol: 'L',
      descriptor: 'Violência fantasiosa',
      interactive: 'Interação de usuários',
      recommendation: 'Recomendado a partir de 6 anos',
    });
  });
});
