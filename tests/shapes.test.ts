/**
 * Formas são elementos livres (kind 'shape') com campos próprios: silhueta
 * (em `content`), texto interno, preenchimento, borda e link. A validação
 * roda na leitura (normalizeOverlays) — o conteúdo vem do banco.
 */
import { describe, it, expect } from 'vitest';
import { normalizeOverlays, SHAPE_KINDS } from '../src/lib/pages';

function raw(over: Record<string, unknown> = {}) {
  return {
    id: 'ov-abc12345',
    section: 'hero',
    kind: 'shape',
    content: 'rect',
    alt: '',
    desktop: {},
    mobile: null,
    ...over,
  };
}

describe('normalizeOverlays — forma', () => {
  it('aceita as seis silhuetas', () => {
    for (const shape of SHAPE_KINDS) {
      const [item] = normalizeOverlays([raw({ content: shape })]);
      expect(item?.content).toBe(shape);
    }
  });

  it('silhueta desconhecida cai em retângulo, não descarta a forma', () => {
    const [item] = normalizeOverlays([raw({ content: 'estrela-de-sete-pontas' })]);
    expect(item?.content).toBe('rect');
  });

  it('preenchimento e borda só valem em hexadecimal de 6 dígitos', () => {
    const [item] = normalizeOverlays([raw({ fill: '#123456', stroke: 'red', strokeWidth: 4 })]);
    expect(item?.fill).toBe('#123456');
    expect(item?.stroke).toBe(''); // "red" não é hex, recusado
    expect(item?.strokeWidth).toBe(4);
  });

  it('espessura da borda fica dentro de 0 a 20', () => {
    expect(normalizeOverlays([raw({ strokeWidth: 500 })])[0]?.strokeWidth).toBe(20);
    expect(normalizeOverlays([raw({ strokeWidth: -5 })])[0]?.strokeWidth).toBe(0);
  });

  it('link aceita caminho interno e https, recusa javascript:', () => {
    expect(normalizeOverlays([raw({ href: '/servicos' })])[0]?.href).toBe('/servicos');
    expect(normalizeOverlays([raw({ href: 'https://x.test' })])[0]?.href).toBe(
      'https://x.test'
    );
    expect(normalizeOverlays([raw({ href: 'javascript:alert(1)' })])[0]?.href).toBe('');
  });

  it('alvo do link só aceita _blank ou _self (padrão)', () => {
    expect(normalizeOverlays([raw({ linkTarget: '_blank' })])[0]?.linkTarget).toBe('_blank');
    expect(normalizeOverlays([raw({ linkTarget: 'javascript:x' })])[0]?.linkTarget).toBe(
      '_self'
    );
    expect(normalizeOverlays([raw({})])[0]?.linkTarget).toBe('_self');
  });

  it('texto interno tem limite de tamanho', () => {
    const longo = 'x'.repeat(500);
    expect(normalizeOverlays([raw({ text: longo })])[0]?.text.length).toBe(300);
  });
});
