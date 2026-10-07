/** Textos dos e-mails do Portfólio (funções puras — sem envio, fáceis de testar). */
import { escapeHtml } from './newsletter';
import { DOWNLOAD_VALID_DAYS } from './portfolio';

interface Requester {
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
}

const shell = (companyName: string, inner: string) => `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:0;background:#f3f6f9;font-family:Arial,Helvetica,sans-serif;color:#243447;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6f9;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #dfe6ee;">
<tr><td style="background:#0b2545;padding:18px 28px;color:#ffffff;font-size:15px;font-weight:bold;letter-spacing:.5px;">${escapeHtml(companyName)}</td></tr>
<tr><td style="padding:28px;">${inner}</td></tr>
</table></td></tr></table></body></html>`;

const button = (href: string, label: string, color = '#0a7ea4') =>
  `<a href="${escapeHtml(href)}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 24px;border-radius:999px;margin:0 8px 8px 0;">${escapeHtml(label)}</a>`;

/** Aviso interno: alguém pediu o Portfólio — com o link para aprovar ou recusar. */
export function buildApprovalRequestEmail(input: {
  requester: Requester;
  decisionUrl: string;
  companyName: string;
}) {
  const { requester: r, decisionUrl, companyName } = input;
  const rows: [string, string][] = [
    ['Nome', r.name],
    ['E-mail', r.email],
    ['Telefone', r.phone || '—'],
    ['Empresa', r.company || '—'],
    ['Cargo', r.role || '—'],
  ];
  const subject = `Pedido de download do Portfólio — ${r.name}${r.company ? ` (${r.company})` : ''}`;
  const text = [
    'Alguém pediu para baixar o Portfólio Institucional.',
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    `Aprovar ou recusar: ${decisionUrl}`,
    '',
    'Se aprovar, o link de download é enviado automaticamente para o e-mail informado.',
  ].join('\n');
  const html = shell(
    companyName,
    `<p style="margin:0 0 16px;font-size:18px;font-weight:bold;color:#0b2545;">Pedido de download do Portfólio</p>
<table role="presentation" cellspacing="0" cellpadding="6" style="font-size:15px;margin-bottom:20px;">
${rows.map(([k, v]) => `<tr><td style="color:#7a8794;padding-right:16px;">${escapeHtml(k)}</td><td style="color:#243447;"><strong>${escapeHtml(v)}</strong></td></tr>`).join('')}
</table>
<p style="margin:0 0 20px;font-size:14px;color:#52627c;">Se você aprovar, o link de download é enviado automaticamente para o e-mail informado acima.</p>
${button(decisionUrl, 'Abrir pedido (aprovar ou recusar)')}`
  );
  return { subject, html, text };
}

/** E-mail ao solicitante depois da aprovação, com o link de download. */
export function buildApprovedEmail(input: {
  name: string;
  downloadUrl: string;
  companyName: string;
}) {
  const first = input.name.trim().split(/\s+/)[0] ?? '';
  const greeting = first ? `Olá, ${first}!` : 'Olá!';
  const subject = 'Seu Portfólio — Essencial Saúde Auditoria';
  const text = [
    greeting,
    '',
    'Seu pedido foi aprovado. Aqui está o Portfólio Institucional da Essencial Saúde Auditoria:',
    '',
    `Baixar o PDF: ${input.downloadUrl}`,
    '',
    `O link vale por ${DOWNLOAD_VALID_DAYS} dias.`,
    '',
    `Equipe ${input.companyName}`,
  ].join('\n');
  const html = shell(
    input.companyName,
    `<p style="margin:0 0 6px;font-size:18px;font-weight:bold;color:#0b2545;">${escapeHtml(greeting)}</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#52627c;">Seu pedido foi aprovado. Aqui está o Portfólio Institucional da ${escapeHtml(input.companyName)}.</p>
${button(input.downloadUrl, 'Baixar o Portfólio (PDF)')}
<p style="margin:20px 0 0;font-size:13px;color:#7a8794;">O link vale por ${DOWNLOAD_VALID_DAYS} dias.</p>
<p style="margin:24px 0 0;font-size:14px;color:#52627c;">Equipe ${escapeHtml(input.companyName)}</p>`
  );
  return { subject, html, text };
}
