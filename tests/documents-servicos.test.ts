/**
 * Moldura de Serviços (/servicos) — mesma família de garantias que
 * documents.test.ts já cobre para Contato: normalização, fallback,
 * isolamento entre páginas, herança de Aparência e preservação de dados ao
 * salvar pelo formulário de conteúdo. A grade de cartões em si (tabela
 * `services`) é testada separadamente, ao final deste arquivo.
 */
import { describe, it, expect } from 'vitest';
import {
  getServicosContent,
  updateServicosContent,
  getContatoContent,
  updateContatoContent,
  getQuemSomosContent,
  SERVICOS_SECTION_KEYS,
  SERVICOS_SLUG,
} from '../src/lib/documents';
import { normalizeOverlays, normalizeLayout } from '../src/lib/pages';
import type { ServicosContent } from '../src/lib/documents';
import { setByPath } from '../src/lib/editable';
import { publishedOnly } from '../src/lib/services';
import type { Service } from '../src/lib/services';
import type { D1Database } from '../src/lib/cf-types';

/**
 * D1 de mentira com uma linha por slug (todas na mesma tabela `pages`,
 * como no banco real) — permite testar isolamento entre páginas e
 * capturar exatamente o SQL/params que cada `updateXContent` grava.
 */
function fakeDb(rows: Record<string, string | null> = {}) {
  const saved: { slug: string; sql: string; json: string }[] = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async first() {
              const slug = params[0] as string;
              const json = rows[slug];
              return json == null
                ? null
                : { id: 1, sections_json: json, updated_at: '2026-01-01' };
            },
            async run() {
              const slug = String(params[0]);
              const json = String(params[1]);
              rows[slug] = json;
              saved.push({ slug, sql, json });
            },
          };
        },
      };
    },
  } as unknown as D1Database;
  return { db, saved, rows };
}

describe('getServicosContent — fallback sem registro salvo', () => {
  it('sem linha "/servicos" na tabela pages, cai no conteúdo padrão', async () => {
    const { db } = fakeDb();
    const content = await getServicosContent(db);

    expect(content.updatedAt).toBe('');
    expect(content.sectionOrder).toEqual([...SERVICOS_SECTION_KEYS]);
    expect(content.hiddenSections).toEqual([]);
    expect(content.hero.title.length).toBeGreaterThan(0);
    expect(content.howWeWork.eyebrow.length).toBeGreaterThan(0);
  });

  it('JSON corrompido não derruba a página — cai no padrão', async () => {
    const { db } = fakeDb({ [SERVICOS_SLUG]: '{ isto não é json' });
    const content = await getServicosContent(db);
    expect(content.sectionOrder).toEqual([...SERVICOS_SECTION_KEYS]);
  });
});

describe('getServicosContent — normalização do conteúdo salvo', () => {
  it('carrega texto salvo e completa o que faltar com o padrão', async () => {
    const parcial = JSON.stringify({ hero: { title: 'Título editado' } });
    const { db } = fakeDb({ [SERVICOS_SLUG]: parcial });
    const content = await getServicosContent(db);

    expect(content.hero.title).toBe('Título editado');
    expect(content.hero.eyebrow.length).toBeGreaterThan(0); // preenchido pelo padrão
    expect(content.howWeWork.steps.length).toBeGreaterThan(0);
  });

  it('descarta chave de seção desconhecida e completa as que faltam', async () => {
    const suspeito = JSON.stringify({
      sectionOrder: ['segments', 'inventada', 'list'],
      hiddenSections: ['naoExiste', 'howWeWork'],
    });
    const { db } = fakeDb({ [SERVICOS_SLUG]: suspeito });
    const content = await getServicosContent(db);

    expect(content.sectionOrder).toHaveLength(SERVICOS_SECTION_KEYS.length);
    expect(content.sectionOrder.slice(0, 2)).toEqual(['segments', 'list']);
    expect(content.sectionOrder).not.toContain('inventada');
    expect(content.hiddenSections).toEqual(['howWeWork']);
  });

  it('recusa chaves de seção de OUTRA página migrada (ex.: "channels"/"form" da Contato)', async () => {
    const cruzado = JSON.stringify({ sectionOrder: ['channels', 'form', 'list'] });
    const { db } = fakeDb({ [SERVICOS_SLUG]: cruzado });
    const content = await getServicosContent(db);

    expect(content.sectionOrder).not.toContain('channels');
    expect(content.sectionOrder).not.toContain('form');
    expect(content.sectionOrder).toEqual(expect.arrayContaining([...SERVICOS_SECTION_KEYS]));
  });

  it('overlay com seção inválida é descartado; overlay válido passa', () => {
    const overlays = normalizeOverlays(
      [
        { id: 'valido-1', section: 'list', kind: 'text', content: 'oi' },
        { id: 'invalido-1', section: 'channels', kind: 'text', content: 'não deveria entrar' },
      ],
      SERVICOS_SECTION_KEYS
    );
    expect(overlays).toHaveLength(1);
    expect(overlays[0]?.id).toBe('valido-1');
  });
});

describe('isolamento entre Serviços, Home, Quem Somos e Contato', () => {
  it('cada getXContent lê só a própria linha, mesmo com as 3 páginas no banco', async () => {
    const { db } = fakeDb({
      [SERVICOS_SLUG]: JSON.stringify({ hero: { title: 'Serviços salvo' } }),
      '/contato': JSON.stringify({ formTitle: 'Contato salvo' }),
      '/quem-somos': JSON.stringify({ about: { title: 'Quem Somos salvo' } }),
    });

    const servicos = await getServicosContent(db);
    const contato = await getContatoContent(db);
    const quemSomos = await getQuemSomosContent(db);

    expect(servicos.hero.title).toBe('Serviços salvo');
    expect(contato.formTitle).toBe('Contato salvo');
    expect(quemSomos.about.title).toBe('Quem Somos salvo');

    // Nenhum vazou conteúdo de outro documento.
    expect(JSON.stringify(servicos)).not.toContain('Contato salvo');
    expect(JSON.stringify(servicos)).not.toContain('Quem Somos salvo');
  });

  it('salvar Serviços grava só na linha "/servicos" — Contato e Quem Somos ficam intactos', async () => {
    const { db, rows } = fakeDb({
      [SERVICOS_SLUG]: JSON.stringify({ hero: { title: 'Antes' } }),
      '/contato': JSON.stringify({ formTitle: 'Contato original' }),
    });

    const current = await getServicosContent(db);
    const { updatedAt: _ignored, ...content } = current;
    await updateServicosContent(db, { ...content, hero: { ...content.hero, title: 'Depois' } });

    expect(JSON.parse(rows[SERVICOS_SLUG]!).hero.title).toBe('Depois');
    expect(JSON.parse(rows['/contato']!).formTitle).toBe('Contato original');

    const contatoAinda = await getContatoContent(db);
    expect(contatoAinda.formTitle).toBe('Contato original');
  });

  it('updateContatoContent não grava na linha de Serviços', async () => {
    const { db, rows } = fakeDb({
      [SERVICOS_SLUG]: JSON.stringify({ hero: { title: 'Intacto' } }),
    });
    const contato = await getContatoContent(db);
    const { updatedAt: _ignored, ...content } = contato;
    await updateContatoContent(db, { ...content, formTitle: 'Novo título do Contato' });

    expect(JSON.parse(rows[SERVICOS_SLUG]!).hero.title).toBe('Intacto');
  });
});

describe('Aparência — herança global → página → seção', () => {
  it('sem nada salvo, pageStyle e sectionStyles vêm 100% herdados (vazios)', async () => {
    const { db } = fakeDb();
    const content = await getServicosContent(db);

    expect(content.pageStyle).toEqual({
      brandColor: '',
      accentColor: '',
      backgroundColor: '',
      headingColor: '',
    });
    for (const key of SERVICOS_SECTION_KEYS) {
      expect(content.sectionStyles[key]).toEqual({
        bg: '',
        text: '',
        image: '',
        overlay: '',
        minHeight: '',
        paddingY: '',
      });
    }
  });

  it('pageStyle personalizado é esparso: um campo customizado não obriga os outros', async () => {
    const salvo = JSON.stringify({ pageStyle: { brandColor: '#112233' } });
    const { db } = fakeDb({ [SERVICOS_SLUG]: salvo });
    const content = await getServicosContent(db);

    expect(content.pageStyle.brandColor).toBe('#112233');
    expect(content.pageStyle.accentColor).toBe('');
    expect(content.pageStyle.backgroundColor).toBe('');
  });

  it('sectionStyles: personalizar uma seção não afeta as outras', async () => {
    const salvo = JSON.stringify({ sectionStyles: { list: { bg: '#e7cfcf' } } });
    const { db } = fakeDb({ [SERVICOS_SLUG]: salvo });
    const content = await getServicosContent(db);

    expect(content.sectionStyles.list.bg).toBe('#e7cfcf');
    expect(content.sectionStyles.howWeWork.bg).toBe('');
    expect(content.sectionStyles.segments.bg).toBe('');
  });

  it('restaurar a herança: gravar pageStyle vazio de volta remove a personalização', async () => {
    const { db, rows } = fakeDb({
      [SERVICOS_SLUG]: JSON.stringify({ pageStyle: { brandColor: '#112233' } }),
    });
    const current = await getServicosContent(db);
    expect(current.pageStyle.brandColor).toBe('#112233');

    const { updatedAt: _ignored, ...content } = current;
    await updateServicosContent(db, {
      ...content,
      pageStyle: { brandColor: '', accentColor: '', backgroundColor: '', headingColor: '' },
    });

    const depois = await getServicosContent(db);
    expect(depois.pageStyle).toEqual({
      brandColor: '',
      accentColor: '',
      backgroundColor: '',
      headingColor: '',
    });
    expect(JSON.parse(rows[SERVICOS_SLUG]!).pageStyle.brandColor).toBe('');
  });
});

describe('formulário de conteúdo — preserva Aparência, layouts e overlays ao salvar', () => {
  it('salvar hero/howWeWork/segments/cta não apaga fundo, layouts nem overlays já gravados', async () => {
    const layoutPersonalizado = {
      desktop: normalizeLayout({ x: 5, y: -2, w: 40 }),
      mobile: null,
    };
    const overlayPersonalizado = normalizeOverlays(
      [{ id: 'faixa-1', section: 'list', kind: 'shape', content: 'rect' }],
      SERVICOS_SECTION_KEYS
    );

    const salvo = JSON.stringify({
      sectionStyles: { list: { bg: '#e7cfcf', minHeight: '400', paddingY: '48' } },
      pageStyle: { backgroundColor: '#fcfcfc' },
      layouts: { 'howWeWork.title': layoutPersonalizado },
      overlays: overlayPersonalizado,
    });
    const { db, rows } = fakeDb({ [SERVICOS_SLUG]: salvo });

    // Reproduz exatamente o que o handler POST de admin/paginas/servicos.astro
    // faz: parte do conteúdo atual e sobrescreve só os 4 blocos de texto.
    const current = await getServicosContent(db);
    const { updatedAt: _ignored, ...base } = current;
    const atualizado: ServicosContent = {
      ...base,
      hero: { ...base.hero, title: 'Novo título de abertura' },
      howWeWork: { ...base.howWeWork, title: 'Novo título de Como atuamos' },
      clientSegments: { ...base.clientSegments, title: 'Novo título de Para quem atuamos' },
      cta: { ...base.cta, title: 'Nova chamada final' },
    };
    await updateServicosContent(db, atualizado);

    const depois = await getServicosContent(db);
    expect(depois.hero.title).toBe('Novo título de abertura');
    // Aparência, layouts e overlays sobrevivem intactos.
    expect(depois.sectionStyles.list.bg).toBe('#e7cfcf');
    expect(depois.sectionStyles.list.minHeight).toBe('400');
    expect(depois.sectionStyles.list.paddingY).toBe('48');
    expect(depois.pageStyle.backgroundColor).toBe('#fcfcfc');
    expect(depois.layouts['howWeWork.title']?.desktop.x).toBe(5);
    expect(depois.overlays).toHaveLength(1);
    expect(depois.overlays[0]?.id).toBe('faixa-1');

    expect(JSON.parse(rows[SERVICOS_SLUG]!).sectionStyles.list.bg).toBe('#e7cfcf');
  });
});

describe('validação de caminhos editáveis (setByPath) sobre ServicosContent', () => {
  it('escreve em campos de texto conhecidos da moldura', async () => {
    const { db } = fakeDb();
    const { updatedAt: _ignored, ...content } = await getServicosContent(db);

    expect(setByPath(content, 'howWeWork.eyebrow', 'Novo selo')).toBe(true);
    expect(setByPath(content, 'clientSegments.title', 'Novo título')).toBe(true);
    expect((content as unknown as ServicosContent).howWeWork.eyebrow).toBe('Novo selo');
  });

  it('recusa caminho para chave que não existe no documento', async () => {
    const { db } = fakeDb();
    const { updatedAt: _ignored, ...content } = await getServicosContent(db);

    expect(setByPath(content, 'howWeWork.campoInventado', 'x')).toBe(false);
    expect(setByPath(content, 'naoExiste.title', 'x')).toBe(false);
  });

  it('recusa __proto__/constructor mesmo dentro de um caminho aparentemente válido', async () => {
    const { db } = fakeDb();
    const { updatedAt: _ignored, ...content } = await getServicosContent(db);

    expect(setByPath(content, '__proto__.polluted', 'x')).toBe(false);
    expect(setByPath(content, 'howWeWork.constructor.prototype', 'x')).toBe(false);
  });

  it('não sobrescreve um campo que não é string (ex.: a lista de steps)', async () => {
    const { db } = fakeDb();
    const { updatedAt: _ignored, ...content } = await getServicosContent(db);

    expect(setByPath(content, 'howWeWork.steps', 'x')).toBe(false);
  });
});

describe('moldura de Serviços grava só na tabela pages, nunca em services', () => {
  it('o SQL de updateServicosContent referencia a tabela "pages"', async () => {
    const { db, saved } = fakeDb();
    const { updatedAt: _ignored, ...content } = await getServicosContent(db);
    await updateServicosContent(db, content);

    expect(saved).toHaveLength(1);
    expect(saved[0]?.sql).toContain('INTO pages');
    expect(saved[0]?.sql.toLowerCase()).not.toContain('services');
  });
});

describe('a grade de serviços continua vindo da tabela `services`', () => {
  const base: Service = {
    id: 1,
    slug: 'exemplo',
    name: 'Serviço de exemplo',
    shortName: 'Exemplo',
    order: 1,
    featured: false,
    status: 'published',
    icon: 'star',
    summary: '',
    heroTitle: '',
    heroLead: '',
    image: '',
    imageAlt: '',
    intro: [],
    highlights: [],
    blocks: [],
    deliverables: [],
    audience: [],
    whatsappMessage: '',
    seo: { title: '', description: '' },
    updatedAt: '',
  };

  it('ServicosContent não guarda nenhuma cópia dos serviços — a listagem não é conteúdo deste documento', async () => {
    const { db } = fakeDb();
    const content = await getServicosContent(db);
    expect(content).not.toHaveProperty('services');
    expect(content).not.toHaveProperty('cards');
    // A única referência à lista é a seção "list" (ordem/visibilidade/fundo).
    expect(content.sectionStyles).toHaveProperty('list');
  });

  it('serviço não publicado (rascunho/arquivado) não aparece na listagem pública', () => {
    const servicos: Service[] = [
      { ...base, slug: 'a', status: 'published' },
      { ...base, slug: 'b', status: 'draft' },
      { ...base, slug: 'c', status: 'archived' },
    ];
    const publicados = publishedOnly(servicos);
    expect(publicados.map((s) => s.slug)).toEqual(['a']);
  });

  it('alterar a moldura (updateServicosContent) não toca em nenhum registro de serviço', async () => {
    const servicosOriginais: Service[] = [
      { ...base, slug: 'a' },
      { ...base, slug: 'b' },
    ];
    const snapshot = structuredClone(servicosOriginais);

    const { db } = fakeDb();
    const { updatedAt: _ignored, ...content } = await getServicosContent(db);
    await updateServicosContent(db, {
      ...content,
      hero: { ...content.hero, title: 'Mudou a moldura' },
    });

    // Nada no processo de salvar a moldura tem acesso à lista de serviços —
    // ela nem é passada para updateServicosContent. Confirma que a lista
    // usada como referência continua bit-a-bit igual.
    expect(servicosOriginais).toEqual(snapshot);
  });
});
