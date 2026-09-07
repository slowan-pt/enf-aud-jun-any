/**
 * Posicionamento livre: os valores vêm do navegador, passam pelo banco e viram
 * CSS. Estes testes fixam as duas garantias que sustentam isso:
 *
 * 1. Nada fora do esperado vira declaração CSS (é conteúdo de terceiro dentro
 *    de uma folha de estilo).
 * 2. Posição e tamanho saem em proporção, nunca em pixel fixo — é o que faz a
 *    configuração continuar valendo em qualquer largura de tela.
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeLayout,
  layoutStylesheet,
  EMPTY_LAYOUT,
  MOBILE_BREAKPOINT,
} from '../src/lib/pages';
import type { ElementLayout, Overlay } from '../src/lib/pages';

const layout = (over: Partial<ElementLayout> = {}): ElementLayout => ({
  ...EMPTY_LAYOUT,
  ...over,
});

const overlay = (over: Partial<Overlay> = {}): Overlay => ({
  id: 'ov-teste',
  section: 'hero',
  kind: 'text',
  content: 'Livre',
  alt: '',
  desktop: layout(),
  mobile: null,
  text: '',
  fill: '',
  stroke: '',
  strokeWidth: 0,
  href: '',
  linkTarget: '_self',
  ...over,
});

describe('normalizeLayout', () => {
  it('aceita valores válidos', () => {
    const result = normalizeLayout({
      x: 10.5,
      y: -20,
      w: 40,
      z: 3,
      fontSize: 1.5,
      color: '#123456',
      align: 'center',
      weight: 700,
      locked: true,
    });
    expect(result).toMatchObject({
      x: 10.5,
      y: -20,
      w: 40,
      z: 3,
      fontSize: 1.5,
      color: '#123456',
      align: 'center',
      weight: 700,
      locked: true,
    });
  });

  it('devolve o layout vazio para entrada ausente ou inválida', () => {
    expect(normalizeLayout(undefined)).toEqual(EMPTY_LAYOUT);
    expect(normalizeLayout('texto solto')).toEqual(EMPTY_LAYOUT);
  });

  it('limita valores fora da faixa em vez de aceitar', () => {
    const result = normalizeLayout({ w: 5000, z: -8, fontSize: 999, x: 1e9 });
    expect(result.w).toBe(100);
    expect(result.z).toBe(0);
    expect(result.fontSize).toBe(12);
    expect(result.x).toBe(500);
  });

  it('descarta cor e alinhamento que não estejam no formato esperado', () => {
    const result = normalizeLayout({
      color: 'red;background:url(http://x)',
      align: 'center;top:0',
    });
    expect(result.color).toBe('');
    expect(result.align).toBe('');
  });

  it('trava só é verdadeira com booleano de verdade', () => {
    expect(normalizeLayout({ locked: 'sim' }).locked).toBe(false);
    expect(normalizeLayout({ locked: 1 }).locked).toBe(false);
    expect(normalizeLayout({ locked: true }).locked).toBe(true);
  });

  it('valor não numérico vira zero, não NaN', () => {
    const result = normalizeLayout({ x: 'abc', w: null, z: {} });
    expect(result.x).toBe(0);
    expect(result.w).toBe(0);
    expect(result.z).toBe(0);
    expect(Number.isNaN(result.x)).toBe(false);
  });
});

describe('layoutStylesheet — elementos existentes', () => {
  it('sem configuração, não gera CSS', () => {
    expect(layoutStylesheet({ 'hero.title': { desktop: layout(), mobile: null } }, [])).toBe(
      ''
    );
  });

  it('deslocamento sai em porcentagem, não em pixel', () => {
    const css = layoutStylesheet(
      { 'hero.title': { desktop: layout({ x: 12.5, y: -4 }), mobile: null } },
      []
    );
    expect(css).toContain('[data-edit="hero.title"]');
    expect(css).toContain('transform:translate(12.5cqw,-4cqw)');
    expect(css).not.toContain('px');
  });

  it('elemento deslocado vira inline-block para o transform valer', () => {
    const css = layoutStylesheet({ 'a.b': { desktop: layout({ x: 5 }), mobile: null } }, []);
    expect(css).toContain('display:inline-block');
  });

  it('largura sai em cqw — a referência é a seção, não o elemento-pai', () => {
    const css = layoutStylesheet({ 'a.b': { desktop: layout({ w: 42 }), mobile: null } }, []);
    expect(css).toContain('width:42cqw');
    // Com '%' a medida seria relativa ao container aninhado que envolve o
    // elemento, e mudaria conforme a estrutura interna da seção.
    expect(css).not.toContain('width:42%');
  });

  it('camada acompanha position:relative para o z-index funcionar', () => {
    const css = layoutStylesheet({ 'a.b': { desktop: layout({ z: 4 }), mobile: null } }, []);
    expect(css).toContain('z-index:4');
    expect(css).toContain('position:relative');
  });

  it('recusa caminho que não seja um caminho de conteúdo', () => {
    const css = layoutStylesheet(
      { 'a"]{color:red}[x': { desktop: layout({ x: 5 }), mobile: null } },
      []
    );
    expect(css).toBe('');
  });
});

describe('layoutStylesheet — elementos livres', () => {
  it('usa posição absoluta em % da seção', () => {
    const css = layoutStylesheet({}, [overlay({ desktop: layout({ x: 20, y: 30, w: 25 }) })]);
    expect(css).toContain('[data-overlay="ov-teste"]');
    expect(css).toContain('position:absolute');
    expect(css).toContain('left:20cqw');
    expect(css).toContain('top:30cqw');
    expect(css).toContain('width:25cqw');
  });

  it('elemento livre sem deslocamento ainda é posicionado', () => {
    const css = layoutStylesheet({}, [overlay()]);
    expect(css).toContain('left:0cqw');
    expect(css).toContain('top:0cqw');
  });
});

describe('layoutStylesheet — desktop e celular', () => {
  it('a configuração de celular vai para dentro de um media query', () => {
    const css = layoutStylesheet(
      { 'hero.title': { desktop: layout({ x: 10 }), mobile: layout({ x: 40 }) } },
      []
    );
    const [antes, depois] = css.split(`@media (max-width:${MOBILE_BREAKPOINT - 1}px)`);

    expect(antes).toContain('translate(10cqw,0cqw)');
    expect(antes).not.toContain('translate(40cqw,0cqw)');
    expect(depois).toContain('translate(40cqw,0cqw)');
  });

  it('sem configuração de celular, não sai media query — o desktop vale para todos', () => {
    const css = layoutStylesheet(
      { 'hero.title': { desktop: layout({ x: 10 }), mobile: null } },
      []
    );
    expect(css).not.toContain('@media');
  });

  it('desktop e celular convivem sem um sobrescrever o outro na fonte', () => {
    const css = layoutStylesheet({}, [
      overlay({
        desktop: layout({ x: 49.86, y: 33.77 }),
        mobile: layout({ x: 37.28, y: 52.52 }),
      }),
    ]);
    expect(css).toContain('left:49.86cqw');
    expect(css).toContain('left:37.28cqw');
    expect(css.indexOf('left:49.86cqw')).toBeLessThan(css.indexOf('@media'));
    expect(css.indexOf('left:37.28cqw')).toBeGreaterThan(css.indexOf('@media'));
  });
});
