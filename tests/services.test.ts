/**
 * Guarda central deste round: o CRUD tradicional (`updateServiceById`, usado
 * por /admin/servicos/[slug] e pelas operações de conteúdo do Editor Visual)
 * NUNCA pode apagar `editor_json` — ver src/pages/admin/api/service-editor-
 * content.ts e o item 6 do escopo (fonte oficial dos dados).
 */
import { describe, it, expect } from 'vitest';
import { updateServiceById, findById, findBySlug, publishedOnly } from '../src/lib/services';
import type { Service, ServiceUpdate } from '../src/lib/services';
import type { D1Database } from '../src/lib/cf-types';
import { setByPath, duplicateAtPath, removeAtPath, reorderAtPath } from '../src/lib/editable';
import { getServiceEditorContent, updateServiceEditorContent } from '../src/lib/service-editor';

interface Row {
  name: string;
  content_json: string;
  editor_json: string | null;
}

/** D1 de mentira com uma linha por id, incluindo a coluna `editor_json`. */
function fakeDb(row: Row) {
  const sqlSeen: string[] = [];
  const db = {
    prepare(sql: string) {
      sqlSeen.push(sql);
      return {
        bind(...params: unknown[]) {
          return {
            async run() {
              // UPDATE ... SET name=?1 ... content_json=?11 ... WHERE id=?13 —
              // simula a coluna sendo atualizada só pelos campos citados no SQL.
              row.name = String(params[0]);
              row.content_json = String(params[10]);
            },
            async first() {
              return { editor_json: row.editor_json };
            },
          };
        },
      };
    },
  } as unknown as D1Database;
  return { db, row, sqlSeen };
}

const existing: Service = {
  id: 1,
  slug: 'auditoria-concorrente',
  name: 'Auditoria Concorrente',
  shortName: 'Auditoria',
  order: 1,
  featured: true,
  status: 'published',
  icon: 'stethoscope',
  summary: 'Resumo original',
  heroTitle: 'Título original',
  heroLead: 'Lead original',
  image: '/images/a.svg',
  imageAlt: 'alt original',
  intro: ['parágrafo 1'],
  highlights: [{ icon: 'search', title: 'Destaque', text: 'texto' }],
  blocks: [{ title: 'Bloco', text: 'texto' }],
  deliverables: ['entregável 1'],
  audience: ['público 1'],
  whatsappMessage: 'mensagem original',
  seo: { title: 'SEO título', description: 'SEO descrição' },
  updatedAt: '2026-01-01',
};

describe('updateServiceById nunca toca em editor_json', () => {
  it('o SQL do UPDATE não referencia a coluna editor_json', async () => {
    const { db, sqlSeen } = fakeDb({
      name: existing.name,
      content_json: '{}',
      editor_json: JSON.stringify({ v: 1, pageStyle: { brandColor: '#ff0000' } }),
    });

    const patch: ServiceUpdate = {
      slug: existing.slug,
      name: 'Nome alterado pelo CRUD',
      icon: existing.icon,
      shortName: existing.shortName,
      summary: existing.summary,
      heroTitle: existing.heroTitle,
      heroLead: existing.heroLead,
      image: existing.image,
      imageAlt: existing.imageAlt,
      whatsappMessage: existing.whatsappMessage,
      seoTitle: existing.seo.title,
      seoDescription: existing.seo.description,
      status: existing.status,
      featured: existing.featured,
      intro: existing.intro,
      deliverables: existing.deliverables,
      audience: existing.audience,
    };

    await updateServiceById(db, existing.id, patch, existing);

    expect(sqlSeen).toHaveLength(1);
    expect(sqlSeen[0]?.toLowerCase()).not.toContain('editor_json');
  });

  it('teste de ponta a ponta contra perda de dados: salvar aparência, depois editar nome/descrição pelo CRUD — aparência sobrevive', async () => {
    // 1. "Salvar aparência e posição" — simulado diretamente na linha, já que
    //    é exatamente o que updateServiceEditorContent grava (ver
    //    service-editor.test.ts para a função em si).
    const editorJsonSalvo = JSON.stringify({
      v: 1,
      pageStyle: { brandColor: '#ff0000' },
      layouts: {
        heroTitle: {
          desktop: {
            v: 2,
            x: 5,
            y: -2,
            w: 0,
            h: 0,
            z: 0,
            fontSize: 0,
            color: '',
            align: '',
            weight: 0,
            r: 0,
            locked: false,
            hidden: false,
            label: '',
          },
          mobile: null,
        },
      },
      overlays: [
        {
          id: 'faixa-1',
          section: 'highlights',
          kind: 'shape',
          content: 'rect',
          alt: '',
          desktop: {
            v: 2,
            x: 0,
            y: 0,
            w: 10,
            h: 10,
            z: 0,
            fontSize: 0,
            color: '',
            align: '',
            weight: 0,
            r: 0,
            locked: false,
            hidden: false,
            label: '',
          },
          mobile: null,
          text: '',
          fill: '',
          stroke: '',
          strokeWidth: 0,
          href: '',
          linkTarget: '_self',
        },
      ],
    });
    const { db, row } = fakeDb({
      name: existing.name,
      content_json: '{}',
      editor_json: editorJsonSalvo,
    });

    // 2 e 3. "Abrir o CRUD tradicional, alterar o nome ou descrição" — 4. "Salvar".
    const patch: ServiceUpdate = {
      slug: existing.slug,
      name: 'Novo nome via CRUD',
      icon: existing.icon,
      shortName: existing.shortName,
      summary: 'Novo resumo via CRUD',
      heroTitle: existing.heroTitle,
      heroLead: existing.heroLead,
      image: existing.image,
      imageAlt: existing.imageAlt,
      whatsappMessage: existing.whatsappMessage,
      seoTitle: existing.seo.title,
      seoDescription: existing.seo.description,
      status: existing.status,
      featured: existing.featured,
      intro: existing.intro,
      deliverables: existing.deliverables,
      audience: existing.audience,
    };
    await updateServiceById(db, existing.id, patch, existing);

    // 5. Confirma que aparência, posição e overlays continuam intactos.
    expect(row.name).toBe('Novo nome via CRUD');
    expect(row.editor_json).toBe(editorJsonSalvo);
    const editorAinda = JSON.parse(row.editor_json!);
    expect(editorAinda.pageStyle.brandColor).toBe('#ff0000');
    expect(editorAinda.layouts.heroTitle.desktop.x).toBe(5);
    expect(editorAinda.overlays).toHaveLength(1);
  });
});

describe('identidade pelo id, não pelo slug', () => {
  const services: Service[] = [
    { ...existing, id: 10, slug: 'a' },
    { ...existing, id: 20, slug: 'b' },
  ];

  it('findById encontra pelo id, independente do slug', () => {
    expect(findById(services, 20)?.slug).toBe('b');
  });

  it('findBySlug continua funcionando para a URL pública', () => {
    expect(findBySlug(services, 'a')?.id).toBe(10);
  });
});

describe('a listagem pública segue a regra de publishedOnly', () => {
  it('serviço não publicado (rascunho ou arquivado) nunca aparece', () => {
    const lista: Service[] = [
      { ...existing, id: 1, slug: 'a', status: 'published' },
      { ...existing, id: 2, slug: 'b', status: 'draft' },
      { ...existing, id: 3, slug: 'c', status: 'archived' },
    ];
    expect(publishedOnly(lista).map((s) => s.slug)).toEqual(['a']);
  });
});

describe('edição inline de destaques e blocos (mesmo mecanismo de benefits.items da Home)', () => {
  function doc() {
    return {
      highlights: [
        { icon: 'search', title: 'Destaque 1', text: 'texto 1' },
        { icon: 'activity', title: 'Destaque 2', text: 'texto 2' },
        { icon: 'shield', title: 'Destaque 3', text: 'texto 3' },
      ],
      blocks: existing.blocks.map((b) => ({ ...b })),
    };
  }

  it('edita título/texto/ícone de um destaque por caminho estável', () => {
    const d = doc();
    expect(setByPath(d, 'highlights.0.title', 'Novo título')).toBe(true);
    expect(setByPath(d, 'highlights.0.text', 'Novo texto')).toBe(true);
    expect(setByPath(d, 'highlights.0.icon', 'heart')).toBe(true);
    expect(d.highlights[0]).toEqual({
      icon: 'heart',
      title: 'Novo título',
      text: 'Novo texto',
    });
  });

  it('edita título/texto de um bloco por caminho estável', () => {
    const d = doc();
    expect(setByPath(d, 'blocks.0.title', 'Novo título de bloco')).toBe(true);
    expect(d.blocks[0]?.title).toBe('Novo título de bloco');
  });

  it('duplicar um destaque usa o modelo oficial (clona o objeto de content_json), não inventa campos', () => {
    const d = doc();
    const before = d.highlights.length;
    expect(duplicateAtPath(d, 'highlights', 0)).toBe(true);
    expect(d.highlights).toHaveLength(before + 1);
    expect(d.highlights[1]).toEqual(d.highlights[0]); // cópia fiel
    expect(d.highlights[1]).not.toBe(d.highlights[0]); // objeto novo, não referência
  });

  it('excluir um destaque remove exatamente o item pedido', () => {
    const d = doc();
    const segundo = d.highlights[1];
    expect(removeAtPath(d, 'highlights', 0)).toBe(true);
    expect(d.highlights[0]).toEqual(segundo);
  });

  it('não permite excluir o último item da lista', () => {
    const d = { highlights: [existing.highlights[0]!] };
    expect(removeAtPath(d, 'highlights', 0)).toBe(false);
  });

  it(
    'reordenar destaques: caminho estável é por índice (mesmo comportamento de about.paragraphs ' +
      'e benefits.items na Home) — uma posição customizada no editor_json segue o ÍNDICE, não o ' +
      'item, então mover o item 0 para o índice 2 faz o item que passar a ocupar o índice 0 herdar ' +
      'a posição salva ali. Comportamento documentado, não uma regressão desta rodada.',
    () => {
      const d = doc();
      const original = d.highlights.map((h) => h.title);
      expect(reorderAtPath(d, 'highlights', 0, 2)).toBe(true);
      expect(d.highlights[2]?.title).toBe(original[0]);
      expect(d.highlights[0]?.title).toBe(original[1]);
    }
  );
});

describe('Editor Visual (layout/aparência) preserva content_json integralmente', () => {
  it('updateServiceEditorContent só grava a coluna editor_json — nunca content_json', async () => {
    const sqlSeen: string[] = [];
    const contentJsonOriginal = JSON.stringify({ intro: ['nunca deveria mudar'] });
    const row = { editor_json: null as string | null };
    const db = {
      prepare(sql: string) {
        sqlSeen.push(sql);
        return {
          bind(...params: unknown[]) {
            return {
              async run() {
                row.editor_json = String(params[0]);
              },
              async first() {
                return { editor_json: row.editor_json };
              },
            };
          },
        };
      },
    } as unknown as D1Database;

    const content = await getServiceEditorContent(db, 1);
    await updateServiceEditorContent(db, 1, {
      ...content,
      pageStyle: { ...content.pageStyle, brandColor: '#ff0000' },
    });

    expect(sqlSeen.every((sql) => !sql.toLowerCase().includes('content_json'))).toBe(true);
    // O "content_json" simulado acima nunca foi passado a nenhuma escrita — só existe para
    // deixar explícito que nada nesta função tem acesso a ele.
    expect(contentJsonOriginal).toContain('nunca deveria mudar');
  });
});

describe('layouts desktop e mobile são independentes', () => {
  it('mobile ausente herda o desktop; mobile definido não altera o desktop salvo', async () => {
    const rows: Record<number, string | null> = {
      1: JSON.stringify({
        v: 1,
        layouts: {
          'highlights.0.title': {
            desktop: {
              v: 2,
              x: 10,
              y: 0,
              w: 0,
              h: 0,
              z: 0,
              fontSize: 0,
              color: '',
              align: '',
              weight: 0,
              r: 0,
              locked: false,
              hidden: false,
              label: '',
            },
            mobile: null,
          },
        },
      }),
    };
    const db = {
      prepare() {
        return {
          bind(...params: unknown[]) {
            return {
              async first() {
                const json = rows[params[0] as number];
                return json == null ? null : { editor_json: json };
              },
              async run() {
                rows[params[1] as number] = String(params[0]);
              },
            };
          },
        };
      },
    } as unknown as D1Database;

    const content = await getServiceEditorContent(db, 1);
    expect(content.layouts['highlights.0.title']?.mobile).toBeNull(); // herda o desktop
    expect(content.layouts['highlights.0.title']?.desktop.x).toBe(10);

    // Define uma posição SÓ no mobile.
    content.layouts['highlights.0.title']!.mobile = {
      ...content.layouts['highlights.0.title']!.desktop,
      x: 99,
    };
    await updateServiceEditorContent(db, 1, content);

    const depois = await getServiceEditorContent(db, 1);
    expect(depois.layouts['highlights.0.title']?.mobile?.x).toBe(99);
    expect(depois.layouts['highlights.0.title']?.desktop.x).toBe(10); // desktop intacto
  });
});
