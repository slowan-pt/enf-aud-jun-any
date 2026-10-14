/**
 * POST /admin/api/portfolio-arquivo — recebe UM arquivo do novo Portfólio
 * (página em WebP ou o PDF) e guarda no R2, na pasta da versão em preparo.
 * Não muda nada no site: só /admin/api/portfolio-publicar aponta para a versão.
 */
import type { APIRoute } from 'astro';
import { getBucket } from '../../../lib/media';
import {
  IMAGE_NAME_RE,
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  PDF_NAME,
  VERSION_RE,
  sniffKind,
  versionKey,
} from '../../../lib/portfolio-files';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) return json({ error: 'Não autenticado.' }, 401);

  const form = await request.formData();
  const version = String(form.get('version') ?? '');
  const name = String(form.get('name') ?? '');
  const file = form.get('file');

  if (!VERSION_RE.test(version)) return json({ error: 'Versão inválida.' }, 422);
  const isPdf = name === PDF_NAME;
  if (!isPdf && !IMAGE_NAME_RE.test(name)) return json({ error: 'Nome de arquivo inválido.' }, 422);
  if (!(file instanceof File)) return json({ error: 'Nenhum arquivo enviado.' }, 422);

  const limit = isPdf ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
  if (file.size === 0 || file.size > limit) {
    return json({ error: `Arquivo fora do tamanho permitido (até ${Math.round(limit / 1048576)} MB).` }, 422);
  }

  const buffer = await file.arrayBuffer();
  const kind = sniffKind(new Uint8Array(buffer.slice(0, 16)));
  if (kind !== (isPdf ? 'pdf' : 'webp')) {
    return json({ error: isPdf ? 'O arquivo não é um PDF.' : 'A imagem não é um WebP válido.' }, 422);
  }

  await getBucket().put(versionKey(version, name), buffer, {
    httpMetadata: { contentType: isPdf ? 'application/pdf' : 'image/webp' },
  });
  return json({ ok: true });
};
