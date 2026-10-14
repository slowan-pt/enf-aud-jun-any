/**
 * Imagens da revista do Portfólio enviadas pelo admin (ficam no R2, numa pasta
 * por versão). Só imagens: o PDF nunca sai por aqui — só pelo link aprovado.
 * Como o endereço muda a cada versão, o cache pode ser eterno.
 */
import type { APIRoute } from 'astro';
import { getBucket } from '../../../../lib/media';
import { IMAGE_NAME_RE, VERSION_RE, versionKey } from '../../../../lib/portfolio-files';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { version = '', file = '' } = params;
  if (!VERSION_RE.test(version) || !IMAGE_NAME_RE.test(file)) {
    return new Response('Not found', { status: 404 });
  }
  const object = await getBucket().get(versionKey(version, file));
  if (!object) return new Response('Not found', { status: 404 });
  return new Response(object.body, {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
