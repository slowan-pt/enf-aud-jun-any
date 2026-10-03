import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ASIDE,
  MAX_HIGHLIGHTS,
  normalizeAside,
  withServiceTemplate,
} from '../src/lib/service-template';

describe('modelo padrão de serviço', () => {
  it('completa listas vazias com 4 cards e a lateral', () => {
    const out = withServiceTemplate({ highlights: [], deliverables: [], audience: [] });
    expect(out.highlights).toHaveLength(MAX_HIGHLIGHTS);
    expect(out.deliverables.length).toBeGreaterThan(0);
    expect(out.audience.length).toBeGreaterThan(0);
  });

  it('não altera o que já foi preenchido e não compartilha referências com o padrão', () => {
    const mine = [{ icon: 'heart', title: 'A', text: 'B' }];
    const out = withServiceTemplate({ highlights: mine, deliverables: ['x'], audience: ['y'] });
    expect(out.highlights).toEqual(mine);
    expect(out.deliverables).toEqual(['x']);
    const blank = { highlights: [] as import('../src/lib/services').ServiceHighlight[], deliverables: [] as string[], audience: [] as string[] };
    const empty = withServiceTemplate(blank);
    empty.highlights[0]!.title = 'mudou';
    expect(withServiceTemplate({ ...blank, highlights: [] as typeof blank.highlights }).highlights[0]!.title).not.toBe('mudou');
  });

  it('normalizeAside mescla com o padrão e ignora valores que não são texto', () => {
    expect(normalizeAside(undefined)).toEqual(DEFAULT_ASIDE);
    const out = normalizeAside({ ctaTitle: 'Olá', audienceTitle: 5 });
    expect(out.ctaTitle).toBe('Olá');
    expect(out.audienceTitle).toBe(DEFAULT_ASIDE.audienceTitle);
  });
});
