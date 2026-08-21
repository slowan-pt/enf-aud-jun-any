/**
 * Aviso de novo contato — hoje é um no-op seguro; vira envio real assim que
 * o domínio próprio + Cloudflare Email Routing estiverem configurados na
 * conta exclusiva do projeto (ver CLOUDFLARE.md, a ser criado na Fase 1).
 *
 * Decisão registrada com o proprietário (21/08/2026): aviso automático por
 * WhatsApp exigiria a API oficial do WhatsApp Business (Meta), que é paga e
 * depende de conta comercial verificada — fora do escopo de custo zero desta
 * fase. O aviso é por e-mail.
 *
 * Como ativar de verdade (Fase 1 → Fase 4):
 *   1. Conectar o domínio à conta Cloudflare exclusiva do projeto.
 *   2. Ativar Cloudflare Email Routing para esse domínio.
 *   3. Adicionar o binding `send_email` no wrangler.jsonc apontando para o
 *      endereço de destino verificado (essencialsaude2026@gmail.com).
 *   4. Substituir o corpo desta função pelo envio real via
 *      `import { EmailMessage } from 'cloudflare:email'` (ver docs da
 *      Cloudflare "Send emails from Workers").
 */
import type { NewContact } from './contacts';

export async function notifyNewContact(
  contact: Pick<
    NewContact,
    'name' | 'company' | 'email' | 'phone' | 'service' | 'subject' | 'message'
  >
): Promise<void> {
  // Sem binding de e-mail configurado ainda — não faz nada além de não
  // quebrar o fluxo de gravação do contato. O aviso, por ora, é abrir
  // /admin/contatos e ver a mensagem lá (já grava normalmente no D1).
  void contact;
}
