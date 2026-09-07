/**
 * Sistema de coordenadas do posicionamento livre.
 *
 * ANTES (v1): `transform: translate(x%, y%)` — porcentagem que o navegador
 * resolve contra o PRÓPRIO ELEMENTO. Mudar texto, fonte ou largura mudava o
 * denominador e deslocava o elemento. Era o defeito que o `y: 149.76%`
 * denunciava.
 *
 * AGORA (v2): `translate(Xcqw, Ycqw)` — centésimos da LARGURA DA SEÇÃO. O
 * denominador passou a ser a seção, então o tamanho do elemento saiu da conta.
 *
 * Os testes abaixo cobrem, na ordem, os sete pontos exigidos.
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeLayout,
  migrateLayout,
  hasLegacyLayouts,
  layoutStylesheet,
  EMPTY_LAYOUT,
  MOBILE_BREAKPOINT,
} from '../src/lib/pages';
import type { ElementLayout, LayoutMeasures, Overlay } from '../src/lib/pages';

const layout = (over: Partial<ElementLayout> = {}): ElementLayout => ({
  ...EMPTY_LAYOUT,
  ...over,
});

/**
 * Resolve o CSS gerado em pixels, como o navegador faria.
 * `cqw` = 1% da largura da seção; `%` no transform = 1% do próprio elemento.
 */
function resolvePx(
  css: string,
  box: { sectionWidth: number; elWidth: number; elHeight: number }
) {
  const match = css.match(/transform:translate\(([^,]+),([^)]+)\)/);
  if (!match) return { x: 0, y: 0 };

  const toPx = (token: string, ownAxis: number) => {
    const value = parseFloat(token);
    if (token.endsWith('cqw')) return (value / 100) * box.sectionWidth;
    if (token.endsWith('%')) return (value / 100) * ownAxis;
    return value;
  };

  return {
    x: toPx(match[1]!.trim(), box.elWidth),
    y: toPx(match[2]!.trim(), box.elHeight),
  };
}

const sheetFor = (l: ElementLayout) =>
  layoutStylesheet({ 'hero.title': { desktop: l, mobile: null } }, []);

describe('1. a posição é calculada em relação à seção', () => {
  it('o CSS sai em cqw, que é 1% da largura da seção', () => {
    const css = sheetFor(layout({ x: 25, y: 10 }));
    expect(css).toContain('transform:translate(25cqw,10cqw)');
    expect(css).not.toContain('%,');
  });

  it('25cqw numa seção de 1000px vale 250px', () => {
    const css = sheetFor(layout({ x: 25, y: 10 }));
    const px = resolvePx(css, { sectionWidth: 1000, elWidth: 80, elHeight: 30 });
    expect(px.x).toBe(250);
    expect(px.y).toBe(100);
  });

  it('o mesmo valor no sistema antigo dependia do elemento — era o defeito', () => {
    const antigo = sheetFor(layout({ v: 1, x: 25, y: 10 }));
    const estreito = resolvePx(antigo, { sectionWidth: 1000, elWidth: 80, elHeight: 30 });
    const largo = resolvePx(antigo, { sectionWidth: 1000, elWidth: 400, elHeight: 30 });
    expect(estreito.x).not.toBe(largo.x);
  });
});

describe('2. redimensionar o próprio elemento não altera a posição', () => {
  it('mesma posição em px com o elemento pequeno e com o elemento grande', () => {
    const css = sheetFor(layout({ x: 30, y: 12 }));
    const pequeno = resolvePx(css, { sectionWidth: 1200, elWidth: 60, elHeight: 20 });
    const grande = resolvePx(css, { sectionWidth: 1200, elWidth: 900, elHeight: 400 });
    expect(pequeno).toEqual(grande);
  });

  it('a largura configurada não entra na conta da posição', () => {
    const semLargura = sheetFor(layout({ x: 30, y: 12 }));
    const comLargura = sheetFor(layout({ x: 30, y: 12, w: 70 }));
    const box = { sectionWidth: 1200, elWidth: 60, elHeight: 20 };
    expect(resolvePx(semLargura, box)).toEqual(resolvePx(comLargura, box));
  });
});

describe('3. alterar o texto não muda a posição', () => {
  it('texto curto e texto longo (elemento mais alto) caem no mesmo ponto', () => {
    const css = sheetFor(layout({ x: 18, y: 40 }));
    const umaLinha = resolvePx(css, { sectionWidth: 900, elWidth: 300, elHeight: 24 });
    const quatroLinhas = resolvePx(css, { sectionWidth: 900, elWidth: 300, elHeight: 96 });
    expect(umaLinha).toEqual(quatroLinhas);
  });
});

describe('4. alterar a fonte ou o corpo não muda a posição', () => {
  it('corpo de fonte maior não desloca o elemento', () => {
    const box = { sectionWidth: 1000, elWidth: 200, elHeight: 20 };
    const corpoPadrao = resolvePx(sheetFor(layout({ x: 15, y: 25 })), box);
    // Corpo maior deixa o elemento mais alto e mais largo…
    const corpoGrande = resolvePx(sheetFor(layout({ x: 15, y: 25, fontSize: 3 })), {
      sectionWidth: 1000,
      elWidth: 520,
      elHeight: 64,
    });
    expect(corpoGrande).toEqual(corpoPadrao);
  });

  it('peso da fonte também não entra na posição', () => {
    const box = { sectionWidth: 1000, elWidth: 200, elHeight: 20 };
    const normal = resolvePx(sheetFor(layout({ x: 15, y: 25 })), box);
    const negrito = resolvePx(sheetFor(layout({ x: 15, y: 25, weight: 800 })), box);
    expect(negrito).toEqual(normal);
  });
});

describe('5. redimensionar a seção mantém a posição proporcional', () => {
  it('a posição acompanha a largura da seção', () => {
    const css = sheetFor(layout({ x: 20, y: 10 }));
    const largo = resolvePx(css, { sectionWidth: 1440, elWidth: 200, elHeight: 40 });
    const estreito = resolvePx(css, { sectionWidth: 720, elWidth: 200, elHeight: 40 });

    expect(largo.x).toBe(288);
    expect(estreito.x).toBe(144);
    expect(largo.x / estreito.x).toBe(2);
    expect(largo.y / estreito.y).toBe(2);
  });

  it('a proporção em relação à seção é a mesma em qualquer largura', () => {
    const css = sheetFor(layout({ x: 20 }));
    for (const sectionWidth of [375, 768, 1440, 2560]) {
      const px = resolvePx(css, { sectionWidth, elWidth: 100, elHeight: 30 });
      expect(px.x / sectionWidth).toBeCloseTo(0.2, 10);
    }
  });
});

describe('6. desktop e celular são independentes', () => {
  it('cada conjunto sai na sua faixa de largura, sem contaminar o outro', () => {
    const css = layoutStylesheet(
      { 'hero.title': { desktop: layout({ x: 20 }), mobile: layout({ x: 55 }) } },
      []
    );
    const [desktop, mobile] = css.split(`@media (max-width:${MOBILE_BREAKPOINT - 1}px)`);

    expect(desktop).toContain('20cqw');
    expect(desktop).not.toContain('55cqw');
    expect(mobile).toContain('55cqw');
  });

  it('converter o desktop não converte o celular junto', () => {
    const medidas: LayoutMeasures = {
      elementWidth: 200,
      elementHeight: 50,
      sectionWidth: 1000,
      sectionHeight: 600,
    };
    const antigo = layout({ v: 1, x: 50, y: 100 });
    const convertido = migrateLayout(antigo, medidas, false);

    expect(convertido.v).toBe(2);
    expect(antigo.v).toBe(1); // o original não foi mutado
  });
});

describe('7. salvar e recarregar preserva o resultado', () => {
  it('o valor sobrevive à normalização de leitura sem perder o sistema', () => {
    const gravado = layout({ x: 12.34, y: 56.78, w: 40, z: 2 });
    const relido = normalizeLayout(JSON.parse(JSON.stringify(gravado)));
    expect(relido).toEqual(gravado);
    expect(relido.v).toBe(2);
  });

  it('o CSS gerado na releitura é idêntico ao da gravação', () => {
    const gravado = layout({ x: 12.34, y: 56.78 });
    const relido = normalizeLayout(JSON.parse(JSON.stringify(gravado)));
    expect(sheetFor(relido)).toBe(sheetFor(gravado));
  });
});

describe('migração do formato antigo', () => {
  const medidas: LayoutMeasures = {
    elementWidth: 200,
    elementHeight: 50,
    sectionWidth: 1000,
    sectionHeight: 600,
  };

  it('reconhece como legado o layout gravado sem o campo de sistema', () => {
    const relido = normalizeLayout({ x: 52.1, y: 149.76, w: 0 });
    expect(relido.v).toBe(1);
  });

  it('trata como atual o layout que declara o sistema', () => {
    expect(normalizeLayout({ v: 2, x: 10 }).v).toBe(2);
  });

  it('converte preservando o ponto exato onde o elemento está', () => {
    // O caso real que apareceu em produção de teste.
    const convertido = migrateLayout(layout({ v: 1, x: 52.1, y: 149.76 }), medidas, false);

    // Antes: 52.1% de 200px = 104.2px | 149.76% de 50px = 74.88px
    // Depois, sobre a seção de 1000px: 10.42cqw e 7.49cqw — os mesmos pixels.
    expect(convertido.v).toBe(2);
    expect(convertido.x).toBeCloseTo(10.42, 2);
    expect(convertido.y).toBeCloseTo(7.49, 2);

    const px = resolvePx(sheetFor(convertido), {
      sectionWidth: 1000,
      elWidth: 200,
      elHeight: 50,
    });
    expect(px.x).toBeCloseTo(104.2, 1);
    expect(px.y).toBeCloseTo(74.88, 1);
  });

  it('elemento livre converte usando a altura da seção, que era a base antiga', () => {
    const convertido = migrateLayout(layout({ v: 1, x: 30, y: 50 }), medidas, true);
    // x era % da largura (300px), y era % da altura (300px) → ambos 30cqw.
    expect(convertido.x).toBeCloseTo(30, 2);
    expect(convertido.y).toBeCloseTo(30, 2);
  });

  it('não mexe no que já está no sistema atual', () => {
    const atual = layout({ x: 25, y: 25 });
    expect(migrateLayout(atual, medidas, false)).toEqual(atual);
  });

  it('sem largura de seção medida, prefere não converter a chutar', () => {
    const antigo = layout({ v: 1, x: 40, y: 40 });
    const semMedida = { ...medidas, sectionWidth: 0 };
    expect(migrateLayout(antigo, semMedida, false)).toEqual(antigo);
  });

  it('detecta que há posição antiga esperando conversão', () => {
    expect(hasLegacyLayouts({ a: { desktop: layout({ v: 1, x: 5 }), mobile: null } }, [])).toBe(
      true
    );
    expect(hasLegacyLayouts({ a: { desktop: layout({ x: 5 }), mobile: null } }, [])).toBe(
      false
    );
    // Sem deslocamento não há o que converter.
    expect(hasLegacyLayouts({ a: { desktop: layout({ v: 1 }), mobile: null } }, [])).toBe(
      false
    );
  });

  it('detecta legado também em elemento livre', () => {
    const overlay: Overlay = {
      id: 'ov-a',
      section: 'hero',
      kind: 'text',
      content: 'x',
      alt: '',
      desktop: layout({ v: 1, y: 90 }),
      mobile: null,
      text: '',
      fill: '',
      stroke: '',
      strokeWidth: 0,
      href: '',
      linkTarget: '_self',
    };
    expect(hasLegacyLayouts({}, [overlay])).toBe(true);
  });
});
