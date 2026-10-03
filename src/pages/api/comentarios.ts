import type { APIRoute } from 'astro';
import { getDB } from '../../lib/db';
import {
  COMMENT_LIMITS,
  EMAIL_RE,
  hitRateLimit,
  insertComment,
  isPublishedPost,
} from '../../lib/engagement';

export const prerender = false;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const clean = (value: FormDataEntryValue | null, max: number) =>
  String(value ?? '')
    .trim()
    .slice(0, max);

export const POST: APIRoute = async ({ request }) => {
  const ip = request.headers.get('cf-connecting-ip') ?? 'desconhecido';
  const db = getDB();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ success: false, error: 'invalid_body' }, 400);
  }

  // honeypot: bot preencheu o campo oculto "website" — finge sucesso.
  if (clean(form.get('website'), 200)) return json({ success: true }, 200);

  const postId = Number(form.get('post_id'));
  const name = clean(form.get('nome'), COMMENT_LIMITS.nameMax);
  const email = clean(form.get('email'), 200);
  const body = clean(form.get('comentario'), COMMENT_LIMITS.bodyMax);
  const consent = form.get('consentimento') === 'on';

  const errors: Record<string, string> = {};
  if (name.length < COMMENT_LIMITS.nameMin) errors.nome = 'Informe seu nome.';
  if (!EMAIL_RE.test(email)) errors.email = 'Informe um e-mail válido.';
  if (body.length < COMMENT_LIMITS.bodyMin) {
    errors.comentario = `Escreva ao menos ${COMMENT_LIMITS.bodyMin} caracteres.`;
  }
  if (/https?:\/\/|www\./i.test(body)) {
    errors.comentario = 'Por segurança, comentários não podem conter links.';
  }
  if (!consent) errors.consentimento = 'É necessário concordar com o tratamento dos dados.';
  if (Object.keys(errors).length > 0) {
    return json({ success: false, error: 'validation', fields: errors }, 422);
  }

  if (!Number.isInteger(postId) || !(await isPublishedPost(db, postId))) {
    return json({ success: false, error: 'not_found' }, 404);
  }

  if (await hitRateLimit(db, `comment:${ip}`, 3)) {
    return json(
      {
        success: false,
        error: 'rate_limited',
        message: 'Muitos comentários enviados. Tente novamente mais tarde.',
      },
      429
    );
  }

  await insertComment(db, { postId, name, email, body, ip });
  return json({ success: true }, 201);
};
