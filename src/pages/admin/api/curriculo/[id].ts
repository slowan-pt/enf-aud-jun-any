/** Baixa o PDF de um currículo recebido. Só para quem está logado (middleware de /admin). */
import type { APIRoute } from 'astro';
import { getDB } from '../../../../lib/db';
import { getBucket } from '../../../../lib/media';
import { getApplication } from '../../../../lib/applications';

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  if (!locals.user) return new Response('Não autenticado.', { status: 401 });

  const id = Number(params.id);
  const application = Number.isInteger(id) ? await getApplication(getDB(), id) : null;
  if (!application) return new Response('Currículo não encontrado.', { status: 404 });

  const object = await getBucket().get(application.r2_key);
  if (!object) return new Response('Arquivo não encontrado.', { status: 404 });

  return new Response(object.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${application.filename.replace(/"/g, '')}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
