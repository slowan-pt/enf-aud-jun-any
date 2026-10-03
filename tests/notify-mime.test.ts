import { describe, expect, it, vi } from 'vitest';

vi.mock('cloudflare:workers', () => ({ env: {} }));

import { buildResumeMime } from '../src/lib/notify';

describe('buildResumeMime', () => {
  const pdf = new TextEncoder().encode('%PDF-1.4 teste');
  const raw = buildResumeMime({
    from: 'curriculos@essencialsaudeauditoria.com.br',
    to: 'essencialsaude2026@gmail.com',
    replyTo: 'maria@exemplo.com',
    subject: 'Currículo — Maria',
    text: 'Novo currículo',
    filename: 'Curriculo - Maria.pdf',
    pdf,
    domain: 'essencialsaudeauditoria.com.br',
  });

  it('tem os cabeçalhos e o anexo PDF em base64', () => {
    expect(raw).toContain('From: =?UTF-8?B?');
    expect(raw).toContain('<curriculos@essencialsaudeauditoria.com.br>');
    expect(raw).toContain('To: <essencialsaude2026@gmail.com>');
    expect(raw).toContain('Reply-To: <maria@exemplo.com>');
    expect(raw).toContain('Content-Type: application/pdf; name="Curriculo - Maria.pdf"');
    expect(raw).toContain(btoa('%PDF-1.4 teste'));
  });

  it('usa CRLF e fecha o multipart', () => {
    expect(raw).toContain('\r\nMIME-Version: 1.0\r\n');
    expect(raw.trimEnd().endsWith('--')).toBe(true);
  });

  it('não deixa quebra de linha do nome injetar cabeçalhos', () => {
    const evil = buildResumeMime({
      from: 'a@b.com',
      to: 'c@d.com',
      replyTo: 'x@y.com\r\nBcc: alguem@mal.com',
      subject: 's',
      text: 't',
      filename: 'a.pdf',
      pdf,
      domain: 'b.com',
    });
    expect(evil).not.toMatch(/\r\nBcc:/);
  });
});

describe('notifyNewContact', () => {
  it('sem MAIL_FROM configurado, devolve false sem lançar', async () => {
    const { notifyNewContact } = await import('../src/lib/notify');
    const ok = await notifyNewContact(
      {
        name: 'Maria',
        company: 'ACME',
        email: 'maria@exemplo.com',
        phone: '(61) 99999-0000',
        service: '',
        subject: 'Assunto',
        message: 'Mensagem de teste com pelo menos vinte caracteres.',
      },
      'destino@exemplo.com'
    );
    expect(ok).toBe(false);
  });

  it('sem destino, devolve false sem lançar', async () => {
    const { notifyNewContact } = await import('../src/lib/notify');
    const ok = await notifyNewContact(
      {
        name: 'Maria',
        company: 'ACME',
        email: 'maria@exemplo.com',
        phone: '',
        service: '',
        subject: 'Assunto',
        message: 'Mensagem de teste.',
      },
      ''
    );
    expect(ok).toBe(false);
  });
});
