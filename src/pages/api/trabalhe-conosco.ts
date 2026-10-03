import type { APIRoute } from 'astro';
import { getDB } from '../../lib/db';
import { isRateLimited } from '../../lib/contacts';
import { getBucket, safeFileKey } from '../../lib/media';
import { insertApplication, markApplicationEmailed } from '../../lib/applications';
import { notifyNewApplication, resolveNotifyDestination } from '../../lib/notify';

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const MAX_PDF_BYTES = 5 * 1024 * 1024;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function clean(value: FormDataEntryValue | null, max: number): string {
  return String(value ?? '')
    .trim()
    .slice(0, max);
}

export const POST: APIRoute = async ({ request, locals }) => {
  const ip = request.headers.get('cf-connecting-ip') ?? 'desconhecido';
  const db = getDB();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ success: false, error: 'invalid_body' }, 400);
  }

  // honeypot: finge sucesso para não revelar a defesa ao bot
  if (clean(form.get('website'), 200)) return json({ success: true }, 200);

  // Mesma tabela de limite do formulário de contato, com chave própria.
  if (await isRateLimited(db, `cv:${ip}`, 5, 60)) {
    return json(
      { success: false, error: 'rate_limited', message: 'Muitos envios. Tente novamente mais tarde.' },
      429
    );
  }

  const name = clean(form.get('nome'), 200);
  const email = clean(form.get('email'), 200);
  const phone = clean(form.get('telefone'), 40);
  const message = clean(form.get('mensagem'), 2000);
  const consent = form.get('consentimento') === 'on';
  const file = form.get('curriculo');

  const errors: Record<string, string> = {};
  if (name.length < 3) errors.nome = 'Informe seu nome completo.';
  if (!EMAIL_RE.test(email)) errors.email = 'Informe um e-mail válido.';
  if (!consent) errors.consentimento = 'É necessário autorizar o uso dos dados.';

  let pdf: ArrayBuffer | null = null;
  if (!(file instanceof File) || file.size === 0) {
    errors.curriculo = 'Anexe seu currículo em PDF.';
  } else if (file.size > MAX_PDF_BYTES) {
    errors.curriculo = 'O PDF deve ter no máximo 5 MB.';
  } else {
    pdf = await file.arrayBuffer();
    // O formato é decidido pelos bytes ("%PDF-"), não pelo nome/tipo informados.
    const head = new TextDecoder('latin1').decode(new Uint8Array(pdf.slice(0, 5)));
    if (head !== '%PDF-') {
      errors.curriculo = 'Envie apenas arquivos em PDF.';
      pdf = null;
    }
  }

  if (Object.keys(errors).length > 0 || !pdf || !(file instanceof File)) {
    return json({ success: false, error: 'validation', fields: errors }, 422);
  }

  const r2Key = safeFileKey('curriculo.pdf', 'pdf').replace(/^uploads\//, 'curriculos/');
  await getBucket().put(r2Key, pdf, { httpMetadata: { contentType: 'application/pdf' } });

  const filename = `Curriculo - ${name}.pdf`.replace(/[^\w .()-]/g, '');
  const id = await insertApplication(db, {
    name,
    email,
    phone,
    message,
    r2Key,
    filename,
    sizeBytes: file.size,
    ip,
  });

  const sent = await notifyNewApplication(
    { name, email, phone, message, filename },
    pdf,
    resolveNotifyDestination(locals.settings.company.email)
  );
  if (sent) await markApplicationEmailed(db, id);

  return json({ success: true, id }, 201);
};
