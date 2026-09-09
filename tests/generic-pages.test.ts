import { describe, expect, it } from 'vitest';
import {
  GENERIC_PAGE_TEMPLATES,
  normalizeGenericContent,
  normalizeGenericEditor,
  normalizeGenericPageSlug,
} from '../src/lib/generic-pages';

describe('paginas genericas', () => {
  it('normaliza slugs aninhados e recusa rotas reservadas', () => {
    expect(normalizeGenericPageSlug(' Nossa Historia / Equipe ')).toBe('/nossa-historia/equipe');
    expect(normalizeGenericPageSlug('/admin/usuarios')).toBe('');
    expect(normalizeGenericPageSlug('/servicos/novo')).toBe('');
    expect(normalizeGenericPageSlug('/conteudos')).toBe('');
  });

  it('limita secoes, elimina ids repetidos e higieniza midia', () => {
    const content = normalizeGenericContent({
      intro: 'Introducao',
      sections: [
        { id: 'equipe', title: 'Equipe', image: '/media/equipe.jpg' },
        { id: 'equipe', title: 'Duplicada' },
        { id: '__proto__', title: 'Invalida' },
        { id: 'cta', image: 'javascript:alert(1)' },
      ],
    });
    expect(content.sections.map((section) => section.id)).toEqual(['equipe', 'cta']);
    expect(content.sections[0]?.image).toBe('/media/equipe.jpg');
    expect(content.sections[1]?.image).toBe('');
  });

  it('preserva apenas ordem, ocultacao e overlays de secoes conhecidas', () => {
    const editor = normalizeGenericEditor(
      {
        sectionOrder: ['b', 'inventada'],
        hiddenSections: ['inventada', 'a'],
        overlays: [
          { id: 'el-1', section: 'a', kind: 'text', content: 'Valido', desktop: {} },
          { id: 'el-2', section: 'inventada', kind: 'text', content: 'Invalido' },
        ],
      },
      ['a', 'b']
    );
    expect(editor.sectionOrder).toEqual(['b', 'a']);
    expect(editor.hiddenSections).toEqual(['a']);
    expect(editor.overlays.map((overlay) => overlay.id)).toEqual(['el-1']);
  });

  it('oferece todos os modelos de pagina pedidos com texto editavel e neutro', () => {
    expect(Object.keys(GENERIC_PAGE_TEMPLATES)).toEqual(
      expect.arrayContaining([
        'institutional',
        'indicators',
        'team',
        'careFlow',
        'auditStages',
        'values',
        'contact',
        'cta',
      ])
    );
    for (const template of Object.values(GENERIC_PAGE_TEMPLATES)) {
      expect(template.content.sections.length).toBeGreaterThan(0);
    }
  });
});
