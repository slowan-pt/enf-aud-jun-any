/**
 * Aviso por e-mail de novo contato/currículo — via Cloudflare Email Routing
 * (`send_email` no wrangler, binding `EMAIL`), que só entrega a um endereço de
 * destino VERIFICADO na Cloudflare (aqui, o e-mail do site) e a partir de um
 * remetente do próprio domínio (`MAIL_FROM`). Sem o binding, a variável, ou
 * enquanto o destino não estiver verificado, cada função abaixo devolve
 * `false`/não lança — o contato ou o currículo continuam gravados no D1
 * normalmente, só o aviso automático que não sai (fica só em /admin/contatos
 * ou /admin/curriculos).
 */
import { env } from 'cloudflare:workers';
import type { NewContact } from './contacts';

interface MailBinding {
  send(message: unknown): Promise<unknown>;
}

const b64 = (bytes: Uint8Array): string => {
  let out = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(out);
};

const wrap76 = (text: string) => text.replace(/.{1,76}/g, '$&\r\n').trimEnd();
const utf8 = (text: string) => wrap76(b64(new TextEncoder().encode(text)));
const encodedWord = (text: string) => `=?UTF-8?B?${b64(new TextEncoder().encode(text))}?=`;
const headerSafe = (text: string) => text.replace(/[\r\n<>"]/g, ' ').trim();

/** Monta o e-mail MIME (texto + PDF em anexo) — sem dependências externas. */
export function buildResumeMime(input: {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  filename: string;
  pdf: Uint8Array;
  domain: string;
}): string {
  const boundary = `----essencial-${crypto.randomUUID()}`;
  const safeName = input.filename.replace(/[^\w .()-]/g, '') || 'curriculo.pdf';
  return [
    `From: ${encodedWord('Essencial Saúde Auditoria')} <${input.from}>`,
    `To: <${input.to}>`,
    `Reply-To: <${headerSafe(input.replyTo)}>`,
    `Subject: ${encodedWord(input.subject)}`,
    `Message-ID: <${crypto.randomUUID()}@${input.domain}>`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    utf8(input.text),
    `--${boundary}`,
    `Content-Type: application/pdf; name="${safeName}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${safeName}"`,
    '',
    wrap76(b64(input.pdf)),
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

/** Monta um e-mail MIME só de texto (sem anexo) — mesmas regras de header do currículo. */
function buildPlainMime(input: {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  domain: string;
}): string {
  return [
    `From: ${encodedWord('Essencial Saúde Auditoria')} <${input.from}>`,
    `To: <${input.to}>`,
    `Reply-To: <${headerSafe(input.replyTo)}>`,
    `Subject: ${encodedWord(input.subject)}`,
    `Message-ID: <${crypto.randomUUID()}@${input.domain}>`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    utf8(input.text),
    '',
  ].join('\r\n');
}

/**
 * Destino do aviso por e-mail: `NOTIFY_TEST_EMAIL` (quando definida, ver
 * env.d.ts) sobrepõe o e-mail cadastrado em Configurações — só para testar o
 * envio sem alterar o que aparece publicamente no site. Sem a variável,
 * devolve o próprio `fallback` sem mudar nada.
 */
export function resolveNotifyDestination(fallback: string): string {
  const bindings = env as unknown as { NOTIFY_TEST_EMAIL?: string };
  return bindings.NOTIFY_TEST_EMAIL || fallback;
}

/**
 * Envio pelo Resend (segredo RESEND_API_KEY) — entrega a qualquer endereço,
 * inclusive uma caixa de e-mail externa (ex.: UOL) que não é "destino
 * verificado" do Email Routing da Cloudflare. Devolve null quando não há
 * chave (aí vale o caminho do binding), true/false conforme o envio.
 */
async function sendViaResend(mail: {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  attachment?: { filename: string; content: Uint8Array };
}): Promise<boolean | null> {
  const key = (env as unknown as { RESEND_API_KEY?: string }).RESEND_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Essencial Saúde Auditoria <${mail.from}>`,
        to: [mail.to],
        reply_to: headerSafe(mail.replyTo),
        subject: mail.subject,
        text: mail.text,
        ...(mail.attachment
          ? {
              attachments: [
                {
                  filename:
                    mail.attachment.filename.replace(/[^\w .()-]/g, '') || 'curriculo.pdf',
                  content: b64(mail.attachment.content),
                },
              ],
            }
          : {}),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Envia o e-mail via o binding, sem lançar — devolve se conseguiu. */
async function sendMail(raw: string, from: string, to: string): Promise<boolean> {
  try {
    const { EmailMessage } = await import('cloudflare:email');
    const bindings = env as unknown as { EMAIL?: MailBinding };
    if (!bindings.EMAIL) return false;
    await bindings.EMAIL.send(new EmailMessage(from, to, raw));
    return true;
  } catch {
    return false;
  }
}

/**
 * Aviso de novo contato pelo formulário do site — para o e-mail cadastrado em
 * Configurações (o mesmo destino usado para os currículos).
 */
export async function notifyNewContact(
  contact: Pick<
    NewContact,
    'name' | 'company' | 'email' | 'phone' | 'service' | 'subject' | 'message'
  >,
  to: string
): Promise<boolean> {
  const bindings = env as unknown as { MAIL_FROM?: string };
  if (!bindings.MAIL_FROM || !to) return false;

  const lines = [
    'Novo contato recebido pelo site.',
    '',
    `Nome: ${contact.name}`,
    `Empresa: ${contact.company}`,
    `E-mail: ${contact.email}`,
    `Telefone: ${contact.phone || '—'}`,
    contact.service ? `Serviço de interesse: ${contact.service}` : '',
    '',
    `Assunto: ${contact.subject}`,
    '',
    contact.message,
  ].filter((line) => line !== '');

  const subject = `Contato — ${headerSafe(contact.subject)}`;
  const viaResend = await sendViaResend({
    from: bindings.MAIL_FROM,
    to,
    replyTo: contact.email,
    subject,
    text: lines.join('\n'),
  });
  if (viaResend) return true;

  const raw = buildPlainMime({
    from: bindings.MAIL_FROM,
    to,
    replyTo: contact.email,
    subject,
    text: lines.join('\n'),
    domain: bindings.MAIL_FROM.split('@')[1] ?? 'localhost',
  });
  return sendMail(raw, bindings.MAIL_FROM, to);
}

/** Texto da confirmação enviada ao candidato que mandou o currículo. */
export function buildApplicantReceiptText(name: string): string {
  const firstName = name.trim().split(/\s+/)[0] || name;
  return [
    `Olá, ${firstName}!`,
    '',
    'Agradecemos seu interesse em fazer parte da Essencial Saúde Auditoria.',
    '',
    'Recebemos seu currículo, que passará a integrar nosso banco de talentos para futuras oportunidades compatíveis com seu perfil profissional.',
    '',
    'Acompanhe nosso LinkedIn e nossas redes sociais para ficar por dentro das novidades e oportunidades.',
    '',
    'Essencial Saúde Auditoria',
    'Presença técnica onde o cuidado acontece!',
  ].join('\n');
}

/**
 * Confirmação automática ao candidato. Só sai pelo Resend: o Email Routing da
 * Cloudflare entrega apenas a destinos verificados, e o candidato é um
 * endereço qualquer. Sem RESEND_API_KEY/MAIL_FROM devolve false e não lança —
 * o currículo já está gravado e o aviso à equipe é independente.
 */
export async function sendApplicantReceipt(
  applicant: { name: string; email: string },
  replyTo: string
): Promise<boolean> {
  const bindings = env as unknown as { MAIL_FROM?: string };
  if (!bindings.MAIL_FROM || !applicant.email) return false;
  const sent = await sendViaResend({
    from: bindings.MAIL_FROM,
    to: applicant.email,
    replyTo,
    subject: 'Recebemos seu currículo — Essencial Saúde Auditoria',
    text: buildApplicantReceiptText(applicant.name),
  });
  return sent === true;
}

export async function notifyNewApplication(
  application: {
    name: string;
    email: string;
    phone: string;
    message: string;
    filename: string;
  },
  pdf: ArrayBuffer,
  to: string
): Promise<boolean> {
  const bindings = env as unknown as { MAIL_FROM?: string };
  if (!bindings.MAIL_FROM || !to) return false;

  const lines = [
    'Novo currículo recebido pelo site.',
    '',
    `Nome: ${application.name}`,
    `E-mail: ${application.email}`,
    `Telefone: ${application.phone || '—'}`,
    application.message ? `\nMensagem:\n${application.message}` : '',
  ];

  const subject = `Currículo — ${headerSafe(application.name)}`;
  const viaResend = await sendViaResend({
    from: bindings.MAIL_FROM,
    to,
    replyTo: application.email,
    subject,
    text: lines.join('\n'),
    attachment: { filename: application.filename, content: new Uint8Array(pdf) },
  });
  if (viaResend) return true;

  const raw = buildResumeMime({
    from: bindings.MAIL_FROM,
    to,
    replyTo: application.email,
    subject,
    text: lines.join('\n'),
    filename: application.filename,
    pdf: new Uint8Array(pdf),
    domain: bindings.MAIL_FROM.split('@')[1] ?? 'localhost',
  });
  return sendMail(raw, bindings.MAIL_FROM, to);
}
