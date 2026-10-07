import type { APIRoute } from 'astro';
import { getDB } from '../../lib/db';
import { EMAIL_RE, hitRateLimit } from '../../lib/engagement';
import { createPortfolioRequest } from '../../lib/portfolio';
import { notifyNewRequest } from '../../lib/portfolio-flow';

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

export const POST: APIRoute = async ({ request, locals }) => {
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

  const name = clean(form.get('nome'), 150);
  const email = clean(form.get('email'), 200);
  const phone = clean(form.get('telefone'), 40);
  const company = clean(form.get('empresa'), 200);
  const role = clean(form.get('cargo'), 150);
  const consent = form.get('consentimento') === 'on';

  const errors: Record<string, string> = {};
  if (name.length < 3) errors.nome = 'Informe seu nome completo.';
  if (!EMAIL_RE.test(email)) errors.email = 'Informe um e-mail válido.';
  if (phone.replace(/\D/g, '').length < 10) errors.telefone = 'Informe um telefone com DDD.';
  if (!company) errors.empresa = 'Informe a empresa ou organização.';
  if (!role) errors.cargo = 'Informe seu cargo.';
  if (!consent) errors.consentimento = 'É necessário concordar com o tratamento dos dados.';
  if (Object.keys(errors).length > 0) {
    return json({ success: false, error: 'validation', fields: errors }, 422);
  }

  if (await hitRateLimit(db, `portfolio:${ip}`, 3)) {
    return json(
      {
        success: false,
        error: 'rate_limited',
        message: 'Muitos pedidos enviados. Tente novamente mais tarde.',
      },
      429
    );
  }

  const created = await createPortfolioRequest(db, { name, email, phone, company, role, ip });

  // O aviso à Essencial é "melhor esforço": o pedido já está gravado e aparece em
  // /admin/portfolio mesmo que o e-mail falhe.
  const { company: site } = locals.settings;
  await notifyNewRequest(
    { name, email, phone, company, role },
    created.approveToken,
    site.name,
    site.email
  );

  return json({ success: true }, 201);
};
