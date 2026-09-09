/**
 * Organogramas/fluxogramas (item 8 do escopo) — CRUD real no D1 (tabela
 * `diagrams`). Área livre de canvas, deliberadamente separada do modelo de
 * conteúdo das páginas semânticas (Home, Quem Somos, Serviços, Conteúdos):
 * nunca usada para renderizar essas páginas, só a própria tela de edição em
 * /admin/organogramas.
 */
import type { D1Database } from './cf-types';

export interface Diagram {
  id: number;
  title: string;
  canvasJson: string;
  updatedAt: string;
}

interface DiagramRow {
  id: number;
  title: string;
  canvas_json: string;
  updated_at: string;
}

function rowToDiagram(row: DiagramRow): Diagram {
  return {
    id: row.id,
    title: row.title,
    canvasJson: row.canvas_json,
    updatedAt: row.updated_at,
  };
}

const SELECT = `SELECT id, title, canvas_json, updated_at FROM diagrams WHERE deleted_at IS NULL`;
const SELECT_ARCHIVED = `SELECT id, title, canvas_json, updated_at FROM diagrams WHERE deleted_at IS NOT NULL`;

export async function listDiagrams(db: D1Database): Promise<Diagram[]> {
  const { results } = await db.prepare(`${SELECT} ORDER BY updated_at DESC`).all<DiagramRow>();
  return (results ?? []).map(rowToDiagram);
}

export async function listArchivedDiagrams(db: D1Database): Promise<Diagram[]> {
  const { results } = await db
    .prepare(`${SELECT_ARCHIVED} ORDER BY updated_at DESC`)
    .all<DiagramRow>();
  return (results ?? []).map(rowToDiagram);
}

export async function getDiagram(db: D1Database, id: number): Promise<Diagram | null> {
  const row = await db.prepare(`${SELECT} AND id = ?1`).bind(id).first<DiagramRow>();
  return row ? rowToDiagram(row) : null;
}

/** Canvas em branco (fabric.Canvas#toJSON() de um canvas vazio). */
export const EMPTY_CANVAS_JSON = JSON.stringify({ version: '6.0.0', objects: [] });

export async function createDiagram(
  db: D1Database,
  title: string,
  userId?: number
): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO diagrams (title, canvas_json, created_by, updated_by)
       VALUES (?1, ?2, ?3, ?3)`
    )
    .bind(title, EMPTY_CANVAS_JSON, userId ?? null)
    .run();
  return Number(result.meta.last_row_id);
}

/** Tamanho máximo do JSON gravado — um organograma grande ainda cabe bem dentro disso. */
const MAX_JSON_LENGTH = 2_000_000;

export async function updateDiagramCanvas(
  db: D1Database,
  id: number,
  canvasJson: string,
  userId?: number
): Promise<boolean> {
  if (canvasJson.length > MAX_JSON_LENGTH) return false;
  await db
    .prepare(
      `UPDATE diagrams SET canvas_json = ?1, updated_by = ?2, updated_at = datetime('now')
       WHERE id = ?3 AND deleted_at IS NULL`
    )
    .bind(canvasJson, userId ?? null, id)
    .run();
  return true;
}

export async function renameDiagram(
  db: D1Database,
  id: number,
  title: string,
  userId?: number
): Promise<void> {
  await db
    .prepare(
      `UPDATE diagrams SET title = ?1, updated_by = ?2, updated_at = datetime('now')
       WHERE id = ?3 AND deleted_at IS NULL`
    )
    .bind(title, userId ?? null, id)
    .run();
}

/** Arquivamento reversivel: nunca remove a linha de verdade. */
export async function deleteDiagram(db: D1Database, id: number): Promise<void> {
  await db
    .prepare(`UPDATE diagrams SET deleted_at = datetime('now') WHERE id = ?1`)
    .bind(id)
    .run();
}

export async function restoreDiagram(db: D1Database, id: number): Promise<void> {
  await db
    .prepare(
      `UPDATE diagrams SET deleted_at = NULL, updated_at = datetime('now')
       WHERE id = ?1 AND deleted_at IS NOT NULL`
    )
    .bind(id)
    .run();
}

export async function permanentlyDeleteDiagram(db: D1Database, id: number): Promise<void> {
  await db
    .prepare('DELETE FROM diagrams WHERE id = ?1 AND deleted_at IS NOT NULL')
    .bind(id)
    .run();
}

export async function duplicateDiagram(
  db: D1Database,
  id: number,
  userId?: number
): Promise<number | null> {
  const original = await getDiagram(db, id);
  if (!original) return null;
  return createDiagramWithCanvas(db, `${original.title} (cópia)`, original.canvasJson, userId);
}

async function createDiagramWithCanvas(
  db: D1Database,
  title: string,
  canvasJson: string,
  userId?: number
): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO diagrams (title, canvas_json, created_by, updated_by)
       VALUES (?1, ?2, ?3, ?3)`
    )
    .bind(title, canvasJson, userId ?? null)
    .run();
  return Number(result.meta.last_row_id);
}
