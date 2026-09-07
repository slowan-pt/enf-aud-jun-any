import type { APIRoute } from 'astro';
import { getDB, writeAuditLog } from '../../../lib/db';
import { getBucket, insertMedia, safeFileKey } from '../../../lib/media';
import { checkUpload, SNIFF_BYTES, MAX_VIDEO_BYTES } from '../../../lib/uploads';

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

  // Barreira de tamanho antes de ler o corpo, para um arquivo enorme não ser
  // carregado na memória só para ser recusado depois.
  if (file.size > MAX_VIDEO_BYTES) {
    return new Response(JSON.stringify({ error: 'Arquivo maior que 90 MB.' }), { status: 422 });
  }

  // O formato é decidido pelos primeiros bytes. `file.type` e a extensão vêm do
  // navegador e não autorizam nada — entram só na mensagem de erro.
  const buffer = await file.arrayBuffer();
  const head = new Uint8Array(buffer.slice(0, SNIFF_BYTES));
  const check = checkUpload(head, file.size, file.type);

  if (!check.ok || !check.format) {
    return new Response(JSON.stringify({ error: check.error }), { status: 422 });
  }

  const format = check.format;
  const r2Key = safeFileKey(file.name, format.extension);
  const publicPath = `/media/${r2Key.replace(/^uploads\//, '')}`;
  const bucket = getBucket();
  await bucket.put(r2Key, buffer, {
    // Grava o tipo que os bytes comprovam, não o que o cliente declarou.
    httpMetadata: { contentType: format.mimeType },
  });

  const db = getDB();
  const id = await insertMedia(db, {
    r2Key,
    url: publicPath,
    filename: file.name,
    mimeType: format.mimeType,
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
