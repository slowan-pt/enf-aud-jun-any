import type { APIRoute } from 'astro';
import { getDB } from '../../lib/db';
import { EMAIL_RE, addSubscriber, hitRateLimit } from '../../lib/engagement';

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

  const name = clean(form.get('nome'), 80);
  const email = clean(form.get('email'), 200);
  const source = clean(form.get('origem'), 200);
  const consent = form.get('consentimento') === 'on';

  const errors: Record<string, string> = {};
  if (name.length < 2) errors.nome = 'Informe seu nome.';
  if (!EMAIL_RE.test(email)) errors.email = 'Informe um e-mail válido.';
  if (!consent) errors.consentimento = 'É necessário concordar para se inscrever.';
  if (Object.keys(errors).length > 0) {
    return json({ success: false, error: 'validation', fields: errors }, 422);
  }

  if (await hitRateLimit(db, `subscribe:${ip}`, 5)) {
    return json(
      {
        success: false,
        error: 'rate_limited',
        message: 'Muitas tentativas. Tente novamente mais tarde.',
      },
      429
    );
  }

  await addSubscriber(db, { email, name, source, ip });
  return json({ success: true }, 201);
};
