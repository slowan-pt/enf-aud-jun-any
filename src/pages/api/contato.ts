import type { APIRoute } from 'astro';
import { getDB } from '../../lib/db';
import { insertContact, isRateLimited } from '../../lib/contacts';
import { notifyNewContact } from '../../lib/notify';

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

function clean(value: FormDataEntryValue | null, max = 2000): string {
  return String(value ?? '')
    .trim()
    .slice(0, max);
}

export const POST: APIRoute = async ({ request }) => {
  const ip = request.headers.get('cf-connecting-ip') ?? 'desconhecido';
  const db = getDB();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'invalid_body' }), {
      status: 400,
    });
  }

  // honeypot: bot preencheu o campo oculto "website"
  if (clean(form.get('website'))) {
    // finge sucesso para não revelar a defesa ao bot
    return new Response(JSON.stringify({ success: true, id: 0 }), { status: 200 });
  }

  if (await isRateLimited(db, ip)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'rate_limited',
        message: 'Muitas mensagens enviadas. Tente novamente mais tarde.',
      }),
      { status: 429 }
    );
  }

  const name = clean(form.get('nome'), 200);
  const company = clean(form.get('empresa'), 200);
  const role = clean(form.get('cargo'), 200);
  const email = clean(form.get('email'), 200);
  const phone = clean(form.get('telefone'), 40);
  const orgType = clean(form.get('tipo_organizacao'), 100);
  const service = clean(form.get('servico'), 150);
  const subject = clean(form.get('assunto'), 200) || service || 'Contato pelo site';
  const message = clean(form.get('mensagem'), 4000);
  const origin = clean(form.get('origem'), 200) || 'Site';
  const consent = form.get('consentimento') === 'on';

  const errors: Record<string, string> = {};
  if (name.length < 3) errors.nome = 'Informe seu nome completo.';
  if (!company) errors.empresa = 'Informe a empresa ou organização.';
  if (!EMAIL_RE.test(email)) errors.email = 'Informe um e-mail válido.';
  if (phone.replace(/\D/g, '').length < 10) errors.telefone = 'Informe um telefone com DDD.';
  if (!orgType) errors.tipo_organizacao = 'Selecione o tipo de organização.';
  if (message.length < 20) errors.mensagem = 'Escreva ao menos 20 caracteres.';
  if (!consent) errors.consentimento = 'É necessário autorizar o tratamento dos dados.';

  if (Object.keys(errors).length > 0) {
    return new Response(
      JSON.stringify({ success: false, error: 'validation', fields: errors }),
      {
        status: 422,
      }
    );
  }

  const id = await insertContact(db, {
    name,
    company,
    role,
    email,
    phone,
    orgType,
    service,
    subject,
    message,
    origin,
    consent,
    ip,
  });

  await notifyNewContact({ name, company, email, phone, service, subject, message });

  return new Response(JSON.stringify({ success: true, id }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
