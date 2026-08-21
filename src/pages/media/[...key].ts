/**
 * Serve os arquivos enviados via /admin/midia diretamente do R2 (bucket
 * `MEDIA`). Evita depender de um domínio público do bucket — funciona igual
 * em dev local e em produção. Suporta `Range` (necessário para o player de
 * vídeo poder avançar/retroceder sem baixar o arquivo inteiro).
 */
import type { APIRoute } from 'astro';
import { getBucket } from '../../lib/media';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  const key = params.key;
  if (!key) {
    return new Response('Not found', { status: 404 });
  }

  const rangeHeader = request.headers.get('Range');
  const object = await getBucket().get(
    `uploads/${key}`,
    rangeHeader ? { range: request.headers } : undefined
  );
  if (!object) {
    return new Response('Not found', { status: 404 });
  }

  const contentType = object.httpMetadata?.contentType ?? 'application/octet-stream';
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Accept-Ranges': 'bytes',
  };

  if (object.range) {
    const totalSize = object.size;
    const offset = object.range.offset ?? 0;
    const length =
      object.range.length ?? (object.range.suffix ? object.range.suffix : totalSize - offset);
    const end = offset + length - 1;
    headers['Content-Range'] = `bytes ${offset}-${end}/${totalSize}`;
    headers['Content-Length'] = String(length);
    return new Response(object.body, { status: 206, headers });
  }

  headers['Content-Length'] = String(object.size);
  return new Response(object.body, { headers });
};
