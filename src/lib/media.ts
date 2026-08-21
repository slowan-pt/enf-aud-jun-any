/**
 * Biblioteca de mídia — upload real para R2 (tabela `media` no D1 guarda os
 * metadados; o binário fica no bucket). Local (dev) roda emulado via
 * wrangler/astro dev, sem precisar de conta Cloudflare — ver ADMIN.md.
 */
import { env } from 'cloudflare:workers';
import type { D1Database, R2Bucket } from './cf-types';

export function getBucket(): R2Bucket {
  return env.MEDIA;
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
export const ALLOWED_MIME_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
// Workers aceita até 100 MB por requisição (mesmo limite no plano grátis) —
// fica um pouco abaixo para sobrar margem do overhead do multipart/form-data.
export const MAX_VIDEO_UPLOAD_BYTES = 90 * 1024 * 1024;

export function isVideo(mimeType: string): boolean {
  return ALLOWED_VIDEO_TYPES.includes(mimeType);
}

export function maxBytesFor(mimeType: string): number {
  return isVideo(mimeType) ? MAX_VIDEO_UPLOAD_BYTES : MAX_IMAGE_UPLOAD_BYTES;
}

export interface MediaItem {
  id: number;
  r2Key: string;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  altText: string;
  title: string;
  createdAt: string;
}

interface MediaRow {
  id: number;
  r2_key: string;
  url: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  alt_text: string;
  title: string;
  created_at: string;
}

function rowToMedia(row: MediaRow): MediaItem {
  return {
    id: row.id,
    r2Key: row.r2_key,
    url: row.url,
    filename: row.filename,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    altText: row.alt_text,
    title: row.title,
    createdAt: row.created_at,
  };
}

const SELECT = `
  SELECT id, r2_key, url, filename, mime_type, size_bytes, alt_text, title, created_at
  FROM media WHERE deleted_at IS NULL
`;

export async function listMedia(db: D1Database): Promise<MediaItem[]> {
  const { results } = await db.prepare(`${SELECT} ORDER BY created_at DESC`).all<MediaRow>();
  return (results ?? []).map(rowToMedia);
}

export async function getMedia(db: D1Database, id: number): Promise<MediaItem | null> {
  const row = await db.prepare(`${SELECT} AND id = ?1`).bind(id).first<MediaRow>();
  return row ? rowToMedia(row) : null;
}

export interface MediaInput {
  r2Key: string;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  altText: string;
  title: string;
  uploadedBy?: number;
}

export async function insertMedia(db: D1Database, input: MediaInput): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO media (r2_key, url, filename, mime_type, size_bytes, alt_text, title, uploaded_by)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
    )
    .bind(
      input.r2Key,
      input.url,
      input.filename,
      input.mimeType,
      input.sizeBytes,
      input.altText,
      input.title,
      input.uploadedBy ?? null
    )
    .run();
  return Number(result.meta.last_row_id ?? 0);
}

export async function updateMediaMeta(
  db: D1Database,
  id: number,
  input: { altText: string; title: string }
): Promise<void> {
  await db
    .prepare(`UPDATE media SET alt_text = ?1, title = ?2 WHERE id = ?3`)
    .bind(input.altText, input.title, id)
    .run();
}

export async function deleteMedia(db: D1Database, id: number): Promise<MediaItem | null> {
  const media = await getMedia(db, id);
  if (!media) return null;
  await db
    .prepare(`UPDATE media SET deleted_at = datetime('now') WHERE id = ?1`)
    .bind(id)
    .run();
  return media;
}

export function safeFileKey(filename: string): string {
  const ext = (filename.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const random = crypto.randomUUID();
  return `uploads/${random}.${ext}`;
}
