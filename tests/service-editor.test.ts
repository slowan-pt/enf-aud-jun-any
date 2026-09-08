/**
 * Aparência/layout de um serviço individual (`services.editor_json`, ver
 * migrations/0004_services_editor_json.sql e src/lib/service-editor.ts).
 * Foco: normalização estrita (nunca confia na estrutura recebida), fallback
 * de `editor_json = NULL`, isolamento entre dois serviços, herança
 * moldura → serviço → seção, restauração, tamanho máximo e recusa de
 * chaves/versão desconhecidas — inclusive `__proto__`/`constructor`.
 */
import { describe, it, expect } from 'vitest';
import {
  getServiceEditorContent,
  updateServiceEditorContent,
  normalizeServiceEditorContent,
  normalizeImageStyle,
  resolveServicePageStyle,
  EMPTY_SERVICE_EDITOR_CONTENT,
  EMPTY_SERVICE_IMAGE_STYLE,
  SERVICE_SECTION_KEYS,
  SERVICE_EDITOR_VERSION,
} from '../src/lib/service-editor';
import { normalizeOverlays } from '../src/lib/pages';
import type { D1Database } from '../src/lib/cf-types';

/** D1 de mentira com uma linha `editor_json` por id de serviço. */
function fakeDb(rows: Record<number, string | null> = {}) {
  const saved: { id: number; sql: string; json: string }[] = [];
  const db = {
    prepare(sql: string) {
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
              saved.push({ id, sql, json });
            },
          };
        },
      };
    },
  } as unknown as D1Database;
  return { db, saved, rows };
}

describe('getServiceEditorContent — fallback', () => {
  it('sem linha (serviço inexistente) cai no padrão 100% herdado', async () => {
    const { db } = fakeDb();
    const content = await getServiceEditorContent(db, 999);
    expect(content).toEqual(EMPTY_SERVICE_EDITOR_CONTENT);
  });

  it('editor_json = NULL (nunca personalizado) cai no padrão — não herda sobra de outro serviço', async () => {
    const { db } = fakeDb({ 1: null });
    const content = await getServiceEditorContent(db, 1);
    expect(content).toEqual(EMPTY_SERVICE_EDITOR_CONTENT);
  });

  it('JSON corrompido não derruba a página — cai no padrão', async () => {
    const { db } = fakeDb({ 1: '{ isto não é json' });
    const content = await getServiceEditorContent(db, 1);
    expect(content).toEqual(EMPTY_SERVICE_EDITOR_CONTENT);
  });
});

describe('normalizeServiceEditorContent — nunca confia na estrutura recebida', () => {
  it('versão desconhecida (ou ausente) cai no padrão inteiro', () => {
    expect(
      normalizeServiceEditorContent({ v: 99, pageStyle: { brandColor: '#112233' } })
    ).toEqual(EMPTY_SERVICE_EDITOR_CONTENT);
    expect(normalizeServiceEditorContent({})).toEqual(EMPTY_SERVICE_EDITOR_CONTENT);
    expect(normalizeServiceEditorContent(null)).toEqual(EMPTY_SERVICE_EDITOR_CONTENT);
    expect(normalizeServiceEditorContent('não é objeto')).toEqual(EMPTY_SERVICE_EDITOR_CONTENT);
  });

  it('versão correta com pageStyle/sectionStyles válidos é aceita', () => {
    const content = normalizeServiceEditorContent({
      v: SERVICE_EDITOR_VERSION,
      pageStyle: { brandColor: '#aabbcc' },
      sectionStyles: { highlights: { bg: '#ffffff' } },
    });
    expect(content.pageStyle.brandColor).toBe('#aabbcc');
    expect(content.sectionStyles.highlights.bg).toBe('#ffffff');
    expect(content.sectionStyles.content.bg).toBe(''); // seções não citadas ficam herdadas
  });

  it('minHeight/paddingY/overlay vazios continuam vazios (nunca viram "0") mesmo após vários round-trips', () => {
    // Bug real encontrado em teste manual: renormalizar um sectionStyles já
    // salvo (todo vazio = "herda") não pode zerar padding/altura a cada
    // chamada — "" e "0" têm significados diferentes (herdado vs. explícito).
    let content = normalizeServiceEditorContent({
      v: SERVICE_EDITOR_VERSION,
      sectionStyles: { highlights: { minHeight: '', paddingY: '', overlay: '' } },
    });
    for (let i = 0; i < 5; i++) {
      content = normalizeServiceEditorContent(content);
    }
    expect(content.sectionStyles.highlights.minHeight).toBe('');
    expect(content.sectionStyles.highlights.paddingY).toBe('');
    expect(content.sectionStyles.highlights.overlay).toBe('');
  });

  it('minHeight/paddingY/overlay numéricos válidos são preservados', () => {
    const content = normalizeServiceEditorContent({
      v: SERVICE_EDITOR_VERSION,
      sectionStyles: { highlights: { minHeight: '400', paddingY: '48', overlay: '30' } },
    });
    expect(content.sectionStyles.highlights.minHeight).toBe('400');
    expect(content.sectionStyles.highlights.paddingY).toBe('48');
    expect(content.sectionStyles.highlights.overlay).toBe('30');
  });

  it('recusa __proto__/constructor mesmo dentro de sectionStyles — nunca poluem o objeto final', () => {
    const raw = JSON.parse(
      '{"v":1,"sectionStyles":{"__proto__":{"bg":"#000000"},"constructor":{"bg":"#111111"}}}'
    );
    const content = normalizeServiceEditorContent(raw);
    expect(Object.keys(content.sectionStyles)).toEqual([...SERVICE_SECTION_KEYS]);
    expect((Object.prototype as unknown as Record<string, unknown>).bg).toBeUndefined();
  });

  it('recusa chave de seção que não existe neste serviço (ex.: "list"/"howWeWork" da moldura de Serviços)', () => {
    const content = normalizeServiceEditorContent({
      v: SERVICE_EDITOR_VERSION,
      sectionOrder: ['list', 'howWeWork', 'content'],
      sectionStyles: { list: { bg: '#ff0000' } },
    });
    expect(content.sectionOrder).not.toContain('list');
    expect(content.sectionOrder).not.toContain('howWeWork');
    expect(content.sectionStyles).not.toHaveProperty('list');
  });

  it('overlay com kind desconhecido é descartado; overlay válido passa', () => {
    const content = normalizeServiceEditorContent({
      v: SERVICE_EDITOR_VERSION,
      overlays: [
        { id: 'ok-1', section: 'highlights', kind: 'text', content: 'oi' },
        { id: 'ruim-1', section: 'highlights', kind: 'script', content: 'alert(1)' },
      ],
    });
    expect(content.overlays).toHaveLength(1);
    expect(content.overlays[0]?.id).toBe('ok-1');
  });

  it('layout tem limites numéricos aplicados (não confia em valor fora da faixa)', () => {
    const content = normalizeServiceEditorContent({
      v: SERVICE_EDITOR_VERSION,
      layouts: { 'algum.campo': { desktop: { v: 2, x: 99999, w: -50 }, mobile: null } },
    });
    expect(content.layouts['algum.campo']?.desktop.x).toBeLessThanOrEqual(500);
    expect(content.layouts['algum.campo']?.desktop.w).toBe(0);
  });
});

describe('isolamento entre dois serviços', () => {
  it('personalizar um serviço não afeta o outro', async () => {
    const { db, rows } = fakeDb({
      1: JSON.stringify({ v: 1, pageStyle: { brandColor: '#111111' } }),
      2: JSON.stringify({ v: 1, pageStyle: { brandColor: '#222222' } }),
    });

    const a = await getServiceEditorContent(db, 1);
    const b = await getServiceEditorContent(db, 2);
    expect(a.pageStyle.brandColor).toBe('#111111');
    expect(b.pageStyle.brandColor).toBe('#222222');

    await updateServiceEditorContent(db, 1, {
      ...a,
      pageStyle: { ...a.pageStyle, brandColor: '#999999' },
    });

    expect(JSON.parse(rows[1]!).pageStyle.brandColor).toBe('#999999');
    expect(JSON.parse(rows[2]!).pageStyle.brandColor).toBe('#222222'); // intacto
  });

  it('grava só na linha do próprio id — o UPDATE sempre tem WHERE id = ?', async () => {
    const { db, saved } = fakeDb({ 1: null });
    const content = await getServiceEditorContent(db, 1);
    await updateServiceEditorContent(db, 1, content);
    expect(saved).toHaveLength(1);
    expect(saved[0]?.sql).toContain('WHERE id = ?2');
  });
});

describe('herança de Aparência: moldura de Serviços → serviço', () => {
  it('serviço sem personalização (tudo vazio) herda 100% da moldura', () => {
    const moldura = {
      brandColor: '#06203a',
      accentColor: '',
      backgroundColor: '#ffffff',
      headingColor: '',
    };
    const servico = { brandColor: '', accentColor: '', backgroundColor: '', headingColor: '' };
    expect(resolveServicePageStyle(moldura, servico)).toEqual(moldura);
  });

  it('campo personalizado no serviço vence o da moldura; os demais continuam herdando', () => {
    const moldura = {
      brandColor: '#06203a',
      accentColor: '#29dbc6',
      backgroundColor: '',
      headingColor: '',
    };
    const servico = {
      brandColor: '#ff0000',
      accentColor: '',
      backgroundColor: '',
      headingColor: '',
    };
    const efetivo = resolveServicePageStyle(moldura, servico);
    expect(efetivo.brandColor).toBe('#ff0000'); // do serviço
    expect(efetivo.accentColor).toBe('#29dbc6'); // herdado da moldura
  });

  it('a mescla nunca materializa o valor herdado no registro do serviço — só combina em memória', () => {
    const moldura = {
      brandColor: '#06203a',
      accentColor: '',
      backgroundColor: '',
      headingColor: '',
    };
    const servico = { brandColor: '', accentColor: '', backgroundColor: '', headingColor: '' };
    resolveServicePageStyle(moldura, servico);
    // O objeto do serviço passado por referência não foi mutado.
    expect(servico.brandColor).toBe('');
  });
});

describe('restauração da herança', () => {
  it('gravar pageStyle vazio de volta remove a personalização do serviço', async () => {
    const { db, rows } = fakeDb({
      1: JSON.stringify({ v: 1, pageStyle: { brandColor: '#ff0000' } }),
    });
    const current = await getServiceEditorContent(db, 1);
    expect(current.pageStyle.brandColor).toBe('#ff0000');

    await updateServiceEditorContent(db, 1, {
      ...current,
      pageStyle: { brandColor: '', accentColor: '', backgroundColor: '', headingColor: '' },
    });

    const depois = await getServiceEditorContent(db, 1);
    expect(depois.pageStyle.brandColor).toBe('');
    expect(JSON.parse(rows[1]!).pageStyle.brandColor).toBe('');
  });
});

describe('tamanho máximo do editor_json', () => {
  it('recusa gravar um JSON absurdamente grande', async () => {
    const { db } = fakeDb({ 1: null });
    const current = await getServiceEditorContent(db, 1);
    const overlaysGigantes = Array.from({ length: 100 }, (_, i) => ({
      id: `o-${i}`,
      section: 'highlights',
      kind: 'text',
      content: 'x'.repeat(2000),
    }));
    const normalizados = normalizeOverlays(overlaysGigantes, SERVICE_SECTION_KEYS);
    const ok = await updateServiceEditorContent(db, 1, { ...current, overlays: normalizados });
    expect(ok).toBe(false);
  });
});

describe('elementos livres (overlays) por seção do serviço', () => {
  it('overlay preso a uma seção só é aceito se a seção existir neste serviço', () => {
    const validos = normalizeOverlays(
      [
        { id: 'a', section: 'form', kind: 'shape', content: 'rect' },
        { id: 'b', section: 'segments', kind: 'text', content: 'não existe aqui' },
      ],
      SERVICE_SECTION_KEYS
    );
    expect(validos).toHaveLength(1);
    expect(validos[0]?.id).toBe('a');
  });
});

describe('imageStyle — cover/contain e posição da imagem do hero', () => {
  it('padrão (nunca personalizado) é cover, centrado', () => {
    expect(EMPTY_SERVICE_IMAGE_STYLE).toEqual({ fit: 'cover', posX: 50, posY: 50 });
  });

  it('aceita "contain"; qualquer outro valor cai em "cover"', () => {
    expect(normalizeImageStyle({ fit: 'contain' }).fit).toBe('contain');
    expect(normalizeImageStyle({ fit: 'esconder' }).fit).toBe('cover');
    expect(normalizeImageStyle({}).fit).toBe('cover');
  });

  it('posX/posY são limitados a 0–100; valor inválido cai em 50 (centro)', () => {
    expect(normalizeImageStyle({ posX: 30, posY: 70 })).toEqual({
      fit: 'cover',
      posX: 30,
      posY: 70,
    });
    expect(normalizeImageStyle({ posX: 500 }).posX).toBe(100);
    expect(normalizeImageStyle({ posX: -20 }).posX).toBe(0);
    expect(normalizeImageStyle({ posX: 'abc' }).posX).toBe(50);
  });

  it('editor_json sem imageStyle (registro antigo) cai no padrão via normalizeServiceEditorContent', () => {
    const content = normalizeServiceEditorContent({ v: SERVICE_EDITOR_VERSION });
    expect(content.imageStyle).toEqual(EMPTY_SERVICE_IMAGE_STYLE);
  });

  it('imageStyle é isolado por serviço — igual a pageStyle/sectionStyles', async () => {
    const { db, rows } = fakeDb({
      1: JSON.stringify({ v: 1, imageStyle: { fit: 'contain', posX: 10, posY: 90 } }),
      2: JSON.stringify({ v: 1, imageStyle: { fit: 'cover', posX: 50, posY: 50 } }),
    });
    const a = await getServiceEditorContent(db, 1);
    const b = await getServiceEditorContent(db, 2);
    expect(a.imageStyle.fit).toBe('contain');
    expect(b.imageStyle.fit).toBe('cover');

    await updateServiceEditorContent(db, 1, {
      ...a,
      imageStyle: { fit: 'cover', posX: 0, posY: 0 },
    });
    expect(JSON.parse(rows[2]!).imageStyle.posX).toBe(50); // serviço 2 intacto
  });
});
