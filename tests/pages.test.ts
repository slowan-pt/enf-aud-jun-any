/**
 * Duas garantias importantes do editor visual:
 *
 * 1. Conteúdo salvo ANTES do editor existir precisa continuar abrindo com a
 *    página exatamente como está hoje (item de compatibilidade retroativa).
 * 2. O CSS de fundo é montado a partir de valores vindos do banco, então
 *    precisa recusar qualquer coisa que escape do atributo `style`.
 */
import { describe, it, expect } from 'vitest';
import {
  getHomeContent,
  sectionStyleAttr,
  HOME_SECTION_KEYS,
  HOME_EDITABLE_SLOTS,
} from '../src/lib/pages';
import type { D1Database } from '../src/lib/cf-types';

/** D1 de mentira: devolve a linha de `pages` que o teste quiser. */
function fakeDb(sectionsJson: string | null): D1Database {
  return {
    prepare: () => ({
      bind: () => ({
        first: async () => null,
        all: async () => ({ results: [] }),
        run: async () => {},
      }),
      first: async () =>
        sectionsJson === null
          ? null
          : { sections_json: sectionsJson, updated_at: '2026-01-01' },
      all: async () => ({ results: [] }),
      run: async () => {},
    }),
  } as unknown as D1Database;
}

describe('estrutura das seções', () => {
  it('tem uma posição para cada seção editável', () => {
    expect(HOME_EDITABLE_SLOTS).toHaveLength(HOME_SECTION_KEYS.length);
  });

  it('as posições são crescentes e sem repetição', () => {
    const slots = [...HOME_EDITABLE_SLOTS];
    expect(new Set(slots).size).toBe(slots.length);
    expect(slots).toEqual([...slots].sort((a, b) => a - b));
  });
});

describe('getHomeContent — compatibilidade com conteúdo antigo', () => {
  it('conteúdo sem sectionOrder abre na ordem original da página', async () => {
    const antigo = JSON.stringify({ hero: { title: 'Antigo' } });
    const content = await getHomeContent(fakeDb(antigo));

    expect(content.hero.title).toBe('Antigo');
    expect(content.sectionOrder).toEqual([...HOME_SECTION_KEYS]);
    expect(content.hiddenSections).toEqual([]);
  });

  it('preenche com o padrão os campos ausentes, sem apagar os salvos', async () => {
    const parcial = JSON.stringify({ hero: { title: 'Só o título' } });
    const content = await getHomeContent(fakeDb(parcial));

    expect(content.hero.title).toBe('Só o título');
    expect(content.hero.pillars.length).toBeGreaterThan(0);
    expect(content.benefits.items.length).toBeGreaterThan(0);
  });

  it('descarta chaves de seção desconhecidas e completa as que faltam', async () => {
    const suspeito = JSON.stringify({
      sectionOrder: ['segmentos', 'inventada', 'hero'],
      hiddenSections: ['naoExiste', 'cta'],
    });
    const content = await getHomeContent(fakeDb(suspeito));

    expect(content.sectionOrder).toHaveLength(HOME_SECTION_KEYS.length);
    expect(content.sectionOrder.slice(0, 2)).toEqual(['segmentos', 'hero']);
    expect(content.sectionOrder).not.toContain('inventada');
    expect(content.hiddenSections).toEqual(['cta']);
  });

  it('página ainda não gravada cai no conteúdo padrão', async () => {
    const content = await getHomeContent(fakeDb(null));
    expect(content.sectionOrder).toEqual([...HOME_SECTION_KEYS]);
    expect(content.updatedAt).toBe('');
  });

  it('JSON corrompido não derruba a página', async () => {
    const content = await getHomeContent(fakeDb('{ isto não é json'));
    expect(content.hero.title.length).toBeGreaterThan(0);
    expect(content.sectionOrder).toEqual([...HOME_SECTION_KEYS]);
  });
});

describe('sectionStyleAttr', () => {
  const style = (over: Partial<Record<string, string>> = {}) => ({
    bg: '',
    text: '',
    image: '',
    overlay: '',
    minHeight: '',
    paddingY: '',
    ...over,
  });

  it('sem nada preenchido, não gera style (herda a paleta global)', () => {
    expect(sectionStyleAttr(style())).toBeUndefined();
  });

  it('aplica cor de fundo e de texto em hexadecimal', () => {
    expect(sectionStyleAttr(style({ bg: '#ff0000', text: '#ffffff' }))).toBe(
      'background:#ff0000;color:#ffffff'
    );
  });

  it('recusa cor que não seja hexadecimal de 6 dígitos', () => {
    expect(sectionStyleAttr(style({ bg: 'red' }))).toBeUndefined();
    expect(sectionStyleAttr(style({ bg: '#fff' }))).toBeUndefined();
    expect(sectionStyleAttr(style({ text: 'expression(alert(1))' }))).toBeUndefined();
  });

  it('não deixa a cor escapar do atributo style', () => {
    const perigoso = sectionStyleAttr(style({ bg: '#000000;background:url(http://x)' }));
    expect(perigoso).toBeUndefined();
  });

  it('monta imagem de fundo a partir de caminho da Mídia', () => {
    const css = sectionStyleAttr(style({ image: '/media/foto.jpg' }));
    expect(css).toContain('background-image:url("/media/foto.jpg")');
    expect(css).toContain('background-size:cover');
  });

  it('recusa URL de imagem com aspas ou parênteses', () => {
    expect(sectionStyleAttr(style({ image: '/media/a".jpg' }))).toBeUndefined();
    expect(sectionStyleAttr(style({ image: 'javascript:alert(1)' }))).toBeUndefined();
    expect(sectionStyleAttr(style({ image: 'http://inseguro.test/a.jpg' }))).toBeUndefined();
  });

  it('aplica escurecimento por cima da imagem', () => {
    const css = sectionStyleAttr(style({ image: '/media/foto.jpg', overlay: '40' }));
    expect(css).toContain('linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.4))');
  });

  it('ignora escurecimento fora da faixa de 0 a 100', () => {
    const alto = sectionStyleAttr(style({ image: '/media/f.jpg', overlay: '500' }));
    const negativo = sectionStyleAttr(style({ image: '/media/f.jpg', overlay: '-20' }));
    const texto = sectionStyleAttr(style({ image: '/media/f.jpg', overlay: 'abc' }));
    for (const css of [alto, negativo, texto]) expect(css).not.toContain('linear-gradient');
  });

  it('com imagem, a cor vira apenas o fundo por trás dela', () => {
    const css = sectionStyleAttr(style({ image: '/media/f.jpg', bg: '#123456' }));
    expect(css).toContain('background-color:#123456');
    expect(css).not.toContain('background:#123456');
  });

  it('altura mínima sai como min-height, nunca height fixa', () => {
    const css = sectionStyleAttr(style({ minHeight: '500' }));
    expect(css).toContain('min-height:500px');
    // Garantia central do item: o conteúdo NUNCA é cortado. `height` fixa +
    // overflow seriam a forma errada de fazer isso — não usamos nenhum dos dois.
    expect(css).not.toMatch(/(?<!min-)height:/);
    expect(css).not.toContain('overflow');
  });

  it('sem altura definida, não força min-height nenhum (permanece automática)', () => {
    expect(sectionStyleAttr(style())).toBeUndefined();
    expect(sectionStyleAttr(style({ minHeight: '' }))).toBeUndefined();
  });

  it('limita a altura mínima a uma faixa coerente', () => {
    expect(sectionStyleAttr(style({ minHeight: '999999' }))).toContain('min-height:2000px');
    expect(sectionStyleAttr(style({ minHeight: '-50' })) ?? '').not.toContain('min-height');
    expect(sectionStyleAttr(style({ minHeight: 'abc' })) ?? '').not.toContain('min-height');
  });

  it('espaçamento interno vertical sai como padding-block, com limite', () => {
    expect(sectionStyleAttr(style({ paddingY: '64' }))).toContain('padding-block:64px');
    expect(sectionStyleAttr(style({ paddingY: '9999' }))).toContain('padding-block:300px');
  });

  it('espaçamento "0" explícito zera o padrão; vazio herda', () => {
    expect(sectionStyleAttr(style({ paddingY: '0' }))).toContain('padding-block:0px');
    expect(sectionStyleAttr(style({ paddingY: '' }))).toBeUndefined();
  });
});
