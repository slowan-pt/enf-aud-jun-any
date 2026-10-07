/**
 * Envio de e-mail transacional (texto + HTML).
 *  1. Resend, quando existe o segredo RESEND_API_KEY — entrega a qualquer endereço.
 *  2. Senão, o binding `EMAIL` da Cloudflare — só entrega a endereços VERIFICADOS
 *     (o e-mail da própria empresa), o que já basta para avisos internos.
 * Nunca lança: devolve { ok, error }.
 */
import { env } from 'cloudflare:workers';

export interface SendResult {
  ok: boolean;
  error?: string;
}

export interface OutgoingEmail {
  from: string;
  fromName: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
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

export function buildMime(mail: OutgoingEmail): string {
  const boundary = `----essencial-${crypto.randomUUID()}`;
  const domain = mail.from.split('@')[1] ?? 'localhost';
  return [
    `From: ${encodedWord(mail.fromName)} <${headerSafe(mail.from)}>`,
    `To: <${headerSafe(mail.to)}>`,
    ...(mail.replyTo ? [`Reply-To: <${headerSafe(mail.replyTo)}>`] : []),
    `Subject: ${encodedWord(mail.subject)}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    utf8(mail.text),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    utf8(mail.html),
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

export async function sendEmail(mail: OutgoingEmail): Promise<SendResult> {
  const bindings = env as unknown as {
    RESEND_API_KEY?: string;
    EMAIL?: { send(message: unknown): Promise<unknown> };
  };
  try {
    if (bindings.RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${bindings.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${headerSafe(mail.fromName)} <${mail.from}>`,
          to: [mail.to],
          reply_to: mail.replyTo,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        }),
      });
      if (res.ok) return { ok: true };
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      return { ok: false, error: body?.message ?? `Resend respondeu ${res.status}` };
    }
    if (!bindings.EMAIL) return { ok: false, error: 'nenhum serviço de e-mail configurado' };
    const { EmailMessage } = await import('cloudflare:email');
    await bindings.EMAIL.send(new EmailMessage(mail.from, mail.to, buildMime(mail)));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Remetente dos e-mails do Portfólio (domínio já verificado no Resend). */
export function portfolioFrom(): string {
  const e = env as unknown as { PORTFOLIO_FROM?: string; NEWSLETTER_FROM?: string; MAIL_FROM?: string };
  return e.PORTFOLIO_FROM || e.NEWSLETTER_FROM || e.MAIL_FROM || '';
}

export function siteUrl(): string {
  return ((env as unknown as { PUBLIC_SITE_URL?: string }).PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
}
