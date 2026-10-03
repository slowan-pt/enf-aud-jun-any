/**
 * Newsletter: e-mail personalizado com a matéria nova, enviado a cada inscrito
 * ATIVO (um e-mail por pessoa, com o link de cancelamento dela).
 *
 * Dois caminhos de envio:
 *  1. Resend (plano gratuito: 3.000 e-mails/mês) — usado quando existe o segredo
 *     RESEND_API_KEY. É o caminho para enviar a inscritos quaisquer.
 *  2. Binding `EMAIL` da Cloudflare — só entrega a endereços VERIFICADOS (enviar a
 *     qualquer pessoa exige o plano Workers Paid), então serve só para testes.
 * Qualquer falha volta no resultado — nunca derruba a publicação da matéria.
 */
import { env } from 'cloudflare:workers';
import type { D1Database } from './cf-types';

export const EMAIL_RE_SIMPLE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export interface NewsletterPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  cover: string;
  categoryName?: string | null;
}

export interface NewsletterRecipient {
  email: string;
  name: string;
  token: string;
}

export interface SendResult {
  ok: boolean;
  error?: string;
}

/** Limite por disparo (cada envio conta como uma requisição externa do Worker). */
export const MAX_RECIPIENTS_PER_RUN = 400;

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
export const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

export function unsubscribeUrl(siteUrl: string, token: string): string {
  return `${siteUrl}/cancelar-inscricao?token=${token}`;
}

export function buildNewsletterContent(input: {
  post: NewsletterPost;
  recipient: Pick<NewsletterRecipient, 'name' | 'token'>;
  siteUrl: string;
  companyName: string;
}): { subject: string; html: string; text: string; unsubscribe: string } {
  const { post, recipient, siteUrl, companyName } = input;
  const greeting = firstName(recipient.name) ? `Olá, ${firstName(recipient.name)}!` : 'Olá!';
  const link = `${siteUrl}/conteudos/${post.slug}`;
  const unsubscribe = unsubscribeUrl(siteUrl, recipient.token);
  // SVG não abre em e-mail (Gmail/Outlook bloqueiam) — só usa a capa se for imagem de verdade.
  const coverUrl =
    post.cover && !/\.svg(\?|$)/i.test(post.cover)
      ? post.cover.startsWith('http')
        ? post.cover
        : `${siteUrl}${post.cover}`
      : '';

  const subject = `Novo conteúdo: ${post.title}`;

  const text = [
    greeting,
    '',
    'Temos um novo conteúdo para você.',
    '',
    post.title,
    post.excerpt,
    '',
    `Ler conteúdo: ${link}`,
    '',
    `Equipe ${companyName}`,
    '',
    '—',
    'Você recebe este e-mail porque se cadastrou para receber nossos conteúdos.',
    `Cancelar inscrição: ${unsubscribe}`,
  ].join('\n');

  const html = `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:0;background:#f3f6f9;font-family:Arial,Helvetica,sans-serif;color:#243447;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6f9;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #dfe6ee;">
<tr><td style="background:#0b2545;padding:18px 28px;color:#ffffff;font-size:15px;font-weight:bold;letter-spacing:.5px;">${escapeHtml(companyName)}</td></tr>
${coverUrl ? `<tr><td><img src="${escapeHtml(coverUrl)}" width="600" alt="" style="display:block;width:100%;height:auto;border:0;"></td></tr>` : ''}
<tr><td style="padding:28px;">
<p style="margin:0 0 6px;font-size:18px;font-weight:bold;color:#0b2545;">${escapeHtml(greeting)}</p>
<p style="margin:0 0 20px;font-size:15px;color:#52627c;">Temos um novo conteúdo para você.</p>
${post.categoryName ? `<p style="margin:0 0 6px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#12a794;font-weight:bold;">${escapeHtml(post.categoryName)}</p>` : ''}
<h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#0b2545;">${escapeHtml(post.title)}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#52627c;">${escapeHtml(post.excerpt)}</p>
<a href="${escapeHtml(link)}" style="display:inline-block;background:#0a7ea4;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 24px;border-radius:999px;">Ler conteúdo</a>
<p style="margin:28px 0 0;font-size:14px;color:#52627c;">Equipe ${escapeHtml(companyName)}</p>
</td></tr>
<tr><td style="padding:18px 28px;background:#f3f6f9;font-size:12px;line-height:1.5;color:#7a8794;">
Você recebe este e-mail porque se cadastrou para receber nossos conteúdos.<br>
<a href="${escapeHtml(unsubscribe)}" style="color:#7a8794;">Cancelar inscrição</a>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  return { subject, html, text, unsubscribe };
}

/** MIME multipart/alternative (texto + HTML) com cabeçalho de cancelamento. */
export function buildNewsletterMime(input: {
  from: string;
  fromName: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
  unsubscribe: string;
  domain: string;
}): string {
  const boundary = `----essencial-${crypto.randomUUID()}`;
  return [
    `From: ${encodedWord(input.fromName)} <${input.from}>`,
    `To: <${headerSafe(input.to)}>`,
    `Reply-To: <${headerSafe(input.replyTo)}>`,
    `Subject: ${encodedWord(input.subject)}`,
    `Message-ID: <${crypto.randomUUID()}@${input.domain}>`,
    `Date: ${new Date().toUTCString()}`,
    `List-Unsubscribe: <${input.unsubscribe}>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    utf8(input.text),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    utf8(input.html),
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

interface MailBinding {
  send(message: unknown): Promise<unknown>;
}

/** True quando o envio para inscritos quaisquer está configurado (chave do Resend). */
export function isNewsletterConfigured(): boolean {
  return Boolean((env as unknown as { RESEND_API_KEY?: string }).RESEND_API_KEY);
}

async function deliverViaResend(input: {
  apiKey: string;
  from: string;
  fromName: string;
  to: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
  unsubscribe: string;
}): Promise<SendResult> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${headerSafe(input.fromName)} <${input.from}>`,
        to: [input.to],
        reply_to: input.replyTo,
        subject: input.subject,
        html: input.html,
        text: input.text,
        headers: { 'List-Unsubscribe': `<${input.unsubscribe}>` },
      }),
    });
    if (res.ok) return { ok: true };
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    return { ok: false, error: body?.message ?? `Resend respondeu ${res.status}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function deliver(raw: string, from: string, to: string): Promise<SendResult> {
  try {
    const { EmailMessage } = await import('cloudflare:email');
    const bindings = env as unknown as { EMAIL?: MailBinding };
    if (!bindings.EMAIL) return { ok: false, error: 'binding EMAIL ausente' };
    await bindings.EMAIL.send(new EmailMessage(from, to, raw));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function sendNewsletterTo(
  post: NewsletterPost,
  recipient: NewsletterRecipient,
  companyName: string,
  replyTo: string
): Promise<SendResult> {
  const bindings = env as unknown as {
    MAIL_FROM?: string;
    NEWSLETTER_FROM?: string;
    RESEND_API_KEY?: string;
    PUBLIC_SITE_URL?: string;
  };
  const from = bindings.NEWSLETTER_FROM || bindings.MAIL_FROM;
  const siteUrl = (bindings.PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
  if (!from || !siteUrl) return { ok: false, error: 'MAIL_FROM/PUBLIC_SITE_URL não configurados' };

  const content = buildNewsletterContent({ post, recipient, siteUrl, companyName });
  if (bindings.RESEND_API_KEY) {
    return deliverViaResend({
      apiKey: bindings.RESEND_API_KEY,
      from,
      fromName: companyName,
      to: recipient.email,
      replyTo: replyTo || from,
      subject: content.subject,
      html: content.html,
      text: content.text,
      unsubscribe: content.unsubscribe,
    });
  }
  const raw = buildNewsletterMime({
    from,
    fromName: companyName,
    to: recipient.email,
    replyTo: replyTo || from,
    subject: content.subject,
    text: content.text,
    html: content.html,
    unsubscribe: content.unsubscribe,
    domain: from.split('@')[1] ?? 'localhost',
  });
  return deliver(raw, from, recipient.email);
}

/** Inscritos ativos (o cancelamento já tirou quem saiu). */
export async function listActiveRecipients(db: D1Database): Promise<NewsletterRecipient[]> {
  const { results } = await db
    .prepare(
      `SELECT email, name, token FROM newsletter_subscribers
        WHERE status = 'ativo' ORDER BY id ASC LIMIT ?1`
    )
    .bind(MAX_RECIPIENTS_PER_RUN)
    .all<NewsletterRecipient>();
  return results;
}

/**
 * Envia a matéria a todos os inscritos ativos e registra o disparo. Só marca como
 * "enviada" se pelo menos um e-mail saiu — assim uma falha de configuração não
 * impede de tentar de novo depois.
 */
export async function sendNewsletterForPost(
  db: D1Database,
  post: NewsletterPost,
  companyName: string,
  replyTo: string
): Promise<{ sent: number; failed: number; firstError?: string }> {
  const recipients = await listActiveRecipients(db);
  let sent = 0;
  let failed = 0;
  let firstError: string | undefined;
  for (const recipient of recipients) {
    const result = await sendNewsletterTo(post, recipient, companyName, replyTo);
    if (result.ok) sent += 1;
    else {
      failed += 1;
      firstError ??= result.error;
    }
  }
  if (sent > 0) {
    await db
      .prepare(
        `UPDATE posts SET newsletter_sent_at = datetime('now'), newsletter_sent_count = ?1
          WHERE id = ?2`
      )
      .bind(sent, post.id)
      .run();
  }
  return { sent, failed, firstError };
}

export async function getNewsletterStatus(
  db: D1Database,
  postId: number
): Promise<{ sentAt: string | null; count: number }> {
  try {
    const row = await db
      .prepare('SELECT newsletter_sent_at AS sentAt, newsletter_sent_count AS count FROM posts WHERE id = ?1')
      .bind(postId)
      .first<{ sentAt: string | null; count: number }>();
    return row ?? { sentAt: null, count: 0 };
  } catch {
    return { sentAt: null, count: 0 };
  }
}
