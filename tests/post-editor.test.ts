/**
 * Aparência/layout de uma matéria individual (`posts.editor_json`, ver
 * migrations/0005_posts_editor_json.sql e src/lib/post-editor.ts).
 * Mesma família de garantias de tests/service-editor.test.ts: fallback de
 * `editor_json = NULL`, normalização estrita (nunca confia na estrutura
 * recebida, inclusive `__proto__`/`constructor`), isolamento entre duas
 * matérias e o ajuste visual (cover/contain/posição) da imagem de capa.
 */
import { describe, it, expect } from 'vitest';
import {
  getPostEditorContent,
  updatePostEditorContent,
  normalizePostEditorContent,
  normalizePostImageStyle,
  resolvePostPageStyle,
  EMPTY_POST_EDITOR_CONTENT,
  EMPTY_POST_IMAGE_STYLE,
  POST_SECTION_KEYS,
  POST_EDITOR_VERSION,
} from '../src/lib/post-editor';
import type { D1Database } from '../src/lib/cf-types';

/** D1 de mentira com uma linha `editor_json` por id de matéria. */
function fakeDb(rows: Record<number, string | null> = {}) {
  const saved: { id: number; json: string }[] = [];
  const db = {
    prepare(_sql: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async first() {
              const id = params[0] as number;
              const json = rows[id];
              return json === undefined ? null : { editor_json: json };
            },
            async run() {
              const json = String(params[0]);
              const id = Number(params[1]);
              rows[id] = json;
              saved.push({ id, json });
            },
          };
        },
      };
    },
  } as unknown as D1Database;
  return { db, saved, rows };
}

describe('getPostEditorContent — fallback', () => {
  it('sem linha (matéria inexistente) cai no padrão 100% herdado', async () => {
    const { db } = fakeDb();
    const content = await getPostEditorContent(db, 999);
    expect(content).toEqual(EMPTY_POST_EDITOR_CONTENT);
  });

  it('editor_json = NULL (nunca personalizada) cai no padrão — não herda sobra de outra matéria', async () => {
    const { db } = fakeDb({ 1: null });
    const content = await getPostEditorContent(db, 1);
    expect(content).toEqual(EMPTY_POST_EDITOR_CONTENT);
  });

  it('JSON corrompido não derruba a página — cai no padrão', async () => {
    const { db } = fakeDb({ 1: '{ isto não é json' });
    const content = await getPostEditorContent(db, 1);
    expect(content).toEqual(EMPTY_POST_EDITOR_CONTENT);
  });
});

describe('normalizePostEditorContent — nunca confia na estrutura recebida', () => {
  it('versão desconhecida (ou ausente) cai no padrão inteiro', () => {
    expect(normalizePostEditorContent({ v: 99, pageStyle: { brandColor: '#ffffff' } })).toEqual(
      EMPTY_POST_EDITOR_CONTENT
    );
    expect(normalizePostEditorContent(null)).toEqual(EMPTY_POST_EDITOR_CONTENT);
    expect(normalizePostEditorContent('string qualquer')).toEqual(EMPTY_POST_EDITOR_CONTENT);
  });

  it('versão correta com pageStyle/sectionStyles válidos é aceita', () => {
    const raw = {
      v: POST_EDITOR_VERSION,
      pageStyle: {
        brandColor: '#112233',
        accentColor: '',
        backgroundColor: '',
        headingColor: '',
      },
      sectionStyles: {
        body: { bg: '#ffffff', text: '', image: '', overlay: '', minHeight: '', paddingY: '' },
      },
      sectionOrder: ['related', 'body'],
      hiddenSections: ['related'],
      layouts: {},
      overlays: [],
      imageStyle: { fit: 'contain', posX: 20, posY: 80 },
    };
    const content = normalizePostEditorContent(raw);
    expect(content.pageStyle.brandColor).toBe('#112233');
    expect(content.sectionStyles.body.bg).toBe('#ffffff');
    expect(content.sectionOrder).toEqual(['related', 'body']);
    expect(content.hiddenSections).toEqual(['related']);
    expect(content.imageStyle).toEqual({ fit: 'contain', posX: 20, posY: 80 });
  });

  it('recusa __proto__/constructor mesmo dentro de sectionStyles — nunca poluem o objeto final', () => {
    const raw = JSON.parse(
      '{"v":1,"sectionStyles":{"__proto__":{"bg":"#000000"},"constructor":{"bg":"#000000"}}}'
    );
    const content = normalizePostEditorContent(raw);
    expect(Object.keys(content.sectionStyles).sort()).toEqual([...POST_SECTION_KEYS].sort());
    expect(({} as Record<string, unknown>).bg).toBeUndefined();
  });

  it('recusa chave de seção que não existe nesta matéria (ex.: "form"/"highlights" de Serviços)', () => {
    const raw = {
      v: POST_EDITOR_VERSION,
      sectionOrder: ['form', 'body', 'highlights', 'related'],
      hiddenSections: ['form'],
    };
    const content = normalizePostEditorContent(raw);
    expect(content.sectionOrder).toEqual(expect.arrayContaining([...POST_SECTION_KEYS]));
    expect(content.sectionOrder).not.toContain('form');
    expect(content.sectionOrder).not.toContain('highlights');
    expect(content.hiddenSections).toEqual([]);
  });

  it('minHeight/paddingY/overlay vazios continuam vazios (nunca viram "0")', () => {
    const raw = {
      v: POST_EDITOR_VERSION,
      sectionStyles: { body: { minHeight: '', paddingY: '', overlay: '' } },
    };
    for (let i = 0; i < 5; i++) {
      const content = normalizePostEditorContent(raw);
      expect(content.sectionStyles.body.minHeight).toBe('');
      expect(content.sectionStyles.body.paddingY).toBe('');
      expect(content.sectionStyles.body.overlay).toBe('');
    }
  });
});

describe('isolamento entre duas matérias', () => {
  it('personalizar uma matéria não afeta a outra', async () => {
    const { db, rows } = fakeDb({ 1: null, 2: null });
    const contentA = {
      ...EMPTY_POST_EDITOR_CONTENT,
      pageStyle: { ...EMPTY_POST_EDITOR_CONTENT.pageStyle, brandColor: '#111111' },
    };
    await updatePostEditorContent(db, 1, contentA);

    const reloadedA = await getPostEditorContent(db, 1);
    const reloadedB = await getPostEditorContent(db, 2);
    expect(reloadedA.pageStyle.brandColor).toBe('#111111');
    expect(reloadedB.pageStyle.brandColor).toBe('');
    expect(rows[2]).toBeNull();
  });

  it('grava só na linha do próprio id', async () => {
    const { db, saved } = fakeDb();
    await updatePostEditorContent(db, 42, EMPTY_POST_EDITOR_CONTENT);
    expect(saved).toHaveLength(1);
    expect(saved[0]!.id).toBe(42);
  });
});

describe('herança de Aparência: página de Conteúdos → matéria', () => {
  it('matéria sem personalização (tudo vazio) herda 100% da listagem', () => {
    const listagem = {
      brandColor: '#123456',
      accentColor: '#abcdef',
      backgroundColor: '#ffffff',
      headingColor: '#000000',
    };
    const post = { brandColor: '', accentColor: '', backgroundColor: '', headingColor: '' };
    expect(resolvePostPageStyle(listagem, post)).toEqual(listagem);
  });

  it('campo personalizado na matéria vence o da listagem; os demais continuam herdando', () => {
    const listagem = {
      brandColor: '#123456',
      accentColor: '#abcdef',
      backgroundColor: '#ffffff',
      headingColor: '#000000',
    };
    const post = {
      brandColor: '#999999',
      accentColor: '',
      backgroundColor: '',
      headingColor: '',
    };
    const resolved = resolvePostPageStyle(listagem, post);
    expect(resolved.brandColor).toBe('#999999');
    expect(resolved.accentColor).toBe('#abcdef');
  });
});

describe('imageStyle — cover/contain e posição da imagem de capa', () => {
  it('padrão (nunca personalizada) é cover, centrado', () => {
    expect(EMPTY_POST_IMAGE_STYLE).toEqual({ fit: 'cover', posX: 50, posY: 50 });
  });

  it('aceita "contain"; qualquer outro valor cai em "cover"', () => {
    expect(normalizePostImageStyle({ fit: 'contain' }).fit).toBe('contain');
    expect(normalizePostImageStyle({ fit: 'esticar' }).fit).toBe('cover');
    expect(normalizePostImageStyle(undefined).fit).toBe('cover');
  });

  it('posX/posY são limitados a 0–100; valor inválido cai em 50 (centro)', () => {
    expect(normalizePostImageStyle({ posX: -10, posY: 200 })).toEqual({
      fit: 'cover',
      posX: 0,
      posY: 100,
    });
    expect(normalizePostImageStyle({ posX: 'abc', posY: undefined })).toEqual({
      fit: 'cover',
      posX: 50,
      posY: 50,
    });
  });
});

describe('tamanho máximo do editor_json', () => {
  it('recusa gravar um JSON absurdamente grande', async () => {
    const { db } = fakeDb();
    const huge = {
      ...EMPTY_POST_EDITOR_CONTENT,
      overlays: Array.from({ length: 5000 }, (_, i) => ({
        id: `ov-${i}`,
        content: 'x'.repeat(200),
      })),
    };
    const ok = await updatePostEditorContent(db, 1, huge as never);
    expect(ok).toBe(false);
  });
});
