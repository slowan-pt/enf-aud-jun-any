import type { APIRoute } from 'astro';
import { getDB, writeAuditLog } from '../../../lib/db';
import {
  getBucket,
  insertMedia,
  safeFileKey,
  ALLOWED_MIME_TYPES,
  maxBytesFor,
  isVideo,
} from '../../../lib/media';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Não autenticado.' }), { status: 401 });
  }

  const form = await request.formData();
  const file = form.get('file');
  const altText = String(form.get('alt') ?? '');
  const title = String(form.get('title') ?? '');

  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'Nenhum arquivo enviado.' }), { status: 422 });
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return new Response(
      JSON.stringify({ error: 'Formato não permitido. Use JPG, PNG, WebP, SVG, MP4 ou WebM.' }),
      { status: 422 }
    );
  }
  const limit = maxBytesFor(file.type);
  if (file.size > limit) {
    const limitLabel = isVideo(file.type) ? '90 MB' : '5 MB';
    return new Response(JSON.stringify({ error: `Arquivo maior que ${limitLabel}.` }), {
      status: 422,
    });
  }

  const r2Key = safeFileKey(file.name);
  const publicPath = `/media/${r2Key.replace(/^uploads\//, '')}`;
  const bucket = getBucket();
  await bucket.put(r2Key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  const db = getDB();
  const id = await insertMedia(db, {
    r2Key,
    url: publicPath,
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    altText,
    title: title || file.name,
    uploadedBy: locals.user.id,
  });

  await writeAuditLog(db, {
    userId: locals.user.id,
    userName: locals.user.name,
    action: 'media.upload',
    target: `Mídia: ${file.name}`,
    ip: request.headers.get('cf-connecting-ip') ?? '',
  });

  return new Response(JSON.stringify({ id, url: publicPath }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
