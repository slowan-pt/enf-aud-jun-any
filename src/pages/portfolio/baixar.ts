/**
 * Download do PDF do Portfólio — só com um link válido (pedido aprovado e dentro do
 * prazo). O arquivo fica no R2 em um caminho que NÃO é servido por /media, então
 * não existe endereço público para ele.
 */
import type { APIRoute } from 'astro';
import { getDB } from '../../lib/db';
import { getBucket } from '../../lib/media';
import {
  PORTFOLIO_PDF_FILENAME,
  PORTFOLIO_PDF_KEY,
  countDownload,
  getByValidDownloadToken,
} from '../../lib/portfolio';

export const prerender = false;

const page = (title: string, text: string, status: number) =>
  new Response(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title}</title></head><body style="font-family:Arial,sans-serif;max-width:520px;margin:15vh auto;padding:0 20px;color:#243447"><h1 style="color:#0b2545">${title}</h1><p>${text}</p><p><a href="/portfolio">Solicitar o Portfólio</a></p></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }
  );

export const GET: APIRoute = async ({ url }) => {
  const db = getDB();
  const request = await getByValidDownloadToken(db, url.searchParams.get('token') ?? '');
  if (!request) {
    return page(
      'Link inválido ou expirado',
      'Este link de download não é mais válido. Você pode solicitar o Portfólio novamente.',
      410
    );
  }

  const object = await getBucket().get(PORTFOLIO_PDF_KEY);
  if (!object) return page('Arquivo indisponível', 'Não foi possível localizar o arquivo agora. Tente mais tarde.', 404);

  await countDownload(db, request.id);
  return new Response(object.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${PORTFOLIO_PDF_FILENAME}"`,
      'Content-Length': String(object.size),
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
