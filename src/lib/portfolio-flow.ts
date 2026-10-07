/**
 * Orquestra o fluxo do Portfólio: aviso interno, aprovação (com envio do link ao
 * solicitante) e recusa. Usado pela página de decisão do e-mail e pelo admin.
 */
import type { D1Database } from './cf-types';
import { portfolioFrom, sendEmail, siteUrl, type SendResult } from './mailer';
import {
  approveRequest,
  markMailSent,
  refuseRequest,
  type PortfolioRequest,
} from './portfolio';
import { buildApprovalRequestEmail, buildApprovedEmail } from './portfolio-mail';

export const decisionUrl = (approveToken: string) =>
  `${siteUrl()}/portfolio/decisao?token=${approveToken}`;

export const downloadUrl = (downloadToken: string) =>
  `${siteUrl()}/portfolio/baixar?token=${downloadToken}`;

/** Avisa a Essencial (e-mail da empresa) que chegou um pedido novo. */
export async function notifyNewRequest(
  request: Pick<PortfolioRequest, 'name' | 'email' | 'phone' | 'company' | 'role'>,
  approveToken: string,
  companyName: string,
  to: string
): Promise<SendResult> {
  const from = portfolioFrom();
  if (!from || !to) return { ok: false, error: 'remetente ou destino não configurado' };
  const mail = buildApprovalRequestEmail({
    requester: request,
    decisionUrl: decisionUrl(approveToken),
    companyName,
  });
  return sendEmail({
    from,
    fromName: companyName,
    to,
    replyTo: request.email,
    ...mail,
  });
}

/** Aprova e envia o link de download para o e-mail do pedido. */
export async function approveAndSend(
  db: D1Database,
  id: number,
  companyName: string,
  replyTo: string
): Promise<{ request: PortfolioRequest | null; mail: SendResult }> {
  const request = await approveRequest(db, id);
  if (!request) return { request: null, mail: { ok: false, error: 'pedido não encontrado' } };
  const from = portfolioFrom();
  if (!from) return { request, mail: { ok: false, error: 'remetente não configurado' } };

  const mail = await sendEmail({
    from,
    fromName: companyName,
    to: request.email,
    replyTo,
    ...buildApprovedEmail({
      name: request.name,
      downloadUrl: downloadUrl(request.download_token),
      companyName,
    }),
  });
  if (mail.ok) await markMailSent(db, request.id);
  return { request, mail };
}

export async function refuse(db: D1Database, id: number): Promise<void> {
  await refuseRequest(db, id);
}
