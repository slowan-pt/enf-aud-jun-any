/**
 * Organogramas/fluxogramas (item 8 do escopo) — CRUD da tabela `diagrams`.
 * Área livre de canvas, sem relação com o conteúdo das páginas semânticas:
 * estes testes cobrem só a camada de dados (criar/listar/duplicar/renomear/
 * excluir com soft delete), o desenho em si acontece com Fabric.js no
 * navegador e não é testável em isolamento aqui.
 */
import { describe, it, expect } from 'vitest';
import {
  listDiagrams,
  listArchivedDiagrams,
  getDiagram,
  createDiagram,
  updateDiagramCanvas,
  renameDiagram,
  deleteDiagram,
  restoreDiagram,
  permanentlyDeleteDiagram,
  duplicateDiagram,
  EMPTY_CANVAS_JSON,
} from '../src/lib/diagrams';
import type { D1Database } from '../src/lib/cf-types';

interface Row {
  id: number;
  title: string;
  canvas_json: string;
  created_by: number | null;
  updated_by: number | null;
  updated_at: string;
  deleted_at: string | null;
}

function fakeDb(initialRows: Row[] = []) {
  const rows = [...initialRows];
  let nextId = Math.max(0, ...rows.map((r) => r.id)) + 1;

  function exec(sql: string, params: unknown[]) {
    return {
      async first() {
        if (sql.startsWith('SELECT') && sql.includes('id = ?1')) {
          const id = params[0] as number;
          return rows.find((r) => r.id === id && !r.deleted_at) ?? null;
        }
        return null;
      },
      async all() {
        const visible = sql.includes('deleted_at IS NOT NULL')
          ? rows.filter((r) => r.deleted_at)
          : rows.filter((r) => !r.deleted_at);
        visible.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
        return { results: visible };
      },
      async run() {
        if (sql.startsWith('INSERT INTO diagrams')) {
          const [title, canvasJson, userId] = params as [string, string, number | null];
          const id = nextId;
          nextId += 1;
          rows.push({
            id,
            title,
            canvas_json: canvasJson,
            created_by: userId,
            updated_by: userId,
            updated_at: '2026-01-01',
            deleted_at: null,
          });
          return { meta: { last_row_id: id } };
        }
        if (sql.includes('SET canvas_json')) {
          const [canvasJson, userId, id] = params as [string, number | null, number];
          const row = rows.find((r) => r.id === id);
          if (row) {
            row.canvas_json = canvasJson;
            row.updated_by = userId;
          }
          return {};
        }
        if (sql.includes('SET title')) {
          const [title, userId, id] = params as [string, number | null, number];
          const row = rows.find((r) => r.id === id);
          if (row) {
            row.title = title;
            row.updated_by = userId;
          }
          return {};
        }
        if (sql.includes('SET deleted_at = NULL')) {
          const id = params[0] as number;
          const row = rows.find((r) => r.id === id && r.deleted_at);
          if (row) row.deleted_at = null;
          return {};
        }
        if (sql.includes('SET deleted_at')) {
          const id = params[0] as number;
          const row = rows.find((r) => r.id === id);
          if (row) row.deleted_at = '2026-01-02';
          return {};
        }
        if (sql.startsWith('DELETE FROM diagrams')) {
          const id = params[0] as number;
          const index = rows.findIndex((r) => r.id === id && r.deleted_at);
          if (index >= 0) rows.splice(index, 1);
          return {};
        }
        return {};
      },
    };
  }

  const db = {
    prepare(sql: string) {
      return {
        ...exec(sql, []),
        bind(...params: unknown[]) {
          return exec(sql, params);
        },
      };
    },
  } as unknown as D1Database;

  return { db, rows };
}

describe('createDiagram / getDiagram', () => {
  it('cria um diagrama vazio e permite recuperá-lo pelo id', async () => {
    const { db } = fakeDb();
    const id = await createDiagram(db, 'Meu organograma', 7);
    const diagram = await getDiagram(db, id);
    expect(diagram).not.toBeNull();
    expect(diagram!.title).toBe('Meu organograma');
    expect(diagram!.canvasJson).toBe(EMPTY_CANVAS_JSON);
  });

  it('retorna null para id inexistente', async () => {
    const { db } = fakeDb();
    expect(await getDiagram(db, 999)).toBeNull();
  });
});

describe('listDiagrams', () => {
  it('nunca lista um diagrama excluído (soft delete)', async () => {
    const { db } = fakeDb();
    const id = await createDiagram(db, 'Ficará excluído', 1);
    expect(await listDiagrams(db)).toHaveLength(1);
    await deleteDiagram(db, id);
    expect(await listDiagrams(db)).toHaveLength(0);
    // a linha continua existindo (soft delete) — só não aparece na listagem.
    expect(await getDiagram(db, id)).toBeNull();
  });

  it('lista arquivados, restaura e so permite exclusao permanente depois de arquivar', async () => {
    const { db, rows } = fakeDb();
    const id = await createDiagram(db, 'Fluxo arquivavel', 1);

    await permanentlyDeleteDiagram(db, id);
    expect(rows).toHaveLength(1);

    await deleteDiagram(db, id);
    expect(await listArchivedDiagrams(db)).toHaveLength(1);

    await restoreDiagram(db, id);
    expect(await listDiagrams(db)).toHaveLength(1);

    await deleteDiagram(db, id);
    await permanentlyDeleteDiagram(db, id);
    expect(rows).toHaveLength(0);
  });
});

describe('updateDiagramCanvas', () => {
  it('grava o novo canvas_json e é recuperável em seguida', async () => {
    const { db } = fakeDb();
    const id = await createDiagram(db, 'Fluxo', 1);
    const json = JSON.stringify({ version: '6.0.0', objects: [{ type: 'rect' }] });
    const ok = await updateDiagramCanvas(db, id, json, 2);
    expect(ok).toBe(true);
    const reloaded = await getDiagram(db, id);
    expect(reloaded!.canvasJson).toBe(json);
  });

  it('recusa gravar um canvas absurdamente grande', async () => {
    const { db } = fakeDb();
    const id = await createDiagram(db, 'Fluxo', 1);
    const huge = 'x'.repeat(2_000_001);
    const ok = await updateDiagramCanvas(db, id, huge, 1);
    expect(ok).toBe(false);
  });
});

describe('renameDiagram', () => {
  it('renomeia sem alterar o canvas_json', async () => {
    const { db } = fakeDb();
    const id = await createDiagram(db, 'Título original', 1);
    const json = JSON.stringify({ version: '6.0.0', objects: [{ type: 'rect' }] });
    await updateDiagramCanvas(db, id, json, 1);
    await renameDiagram(db, id, 'Título novo', 1);
    const reloaded = await getDiagram(db, id);
    expect(reloaded!.title).toBe('Título novo');
    expect(reloaded!.canvasJson).toBe(json);
  });
});

describe('duplicateDiagram', () => {
  it('retorna null quando o original não existe', async () => {
    const { db } = fakeDb();
    expect(await duplicateDiagram(db, 999)).toBeNull();
  });

  it('cria uma cópia independente com o mesmo canvas_json e título "(cópia)"', async () => {
    const { db } = fakeDb();
    const id = await createDiagram(db, 'Hierarquia da equipe', 1);
    const json = JSON.stringify({
      version: '6.0.0',
      objects: [{ type: 'rect' }, { type: 'line' }],
    });
    await updateDiagramCanvas(db, id, json, 1);

    const copyId = await duplicateDiagram(db, id, 2);
    expect(copyId).not.toBeNull();
    expect(copyId).not.toBe(id);

    const copy = await getDiagram(db, copyId!);
    expect(copy!.title).toBe('Hierarquia da equipe (cópia)');
    expect(copy!.canvasJson).toBe(json);

    // alterar a cópia não pode afetar o original.
    await updateDiagramCanvas(db, copyId!, EMPTY_CANVAS_JSON, 2);
    const original = await getDiagram(db, id);
    expect(original!.canvasJson).toBe(json);
  });
});
