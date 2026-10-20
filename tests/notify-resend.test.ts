import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('cloudflare:workers', () => ({
  env: { RESEND_API_KEY: 're_test_123', MAIL_FROM: 'curriculos@site.com.br' },
}));

import { notifyNewApplication, notifyNewContact } from '../src/lib/notify';

afterEach(() => vi.unstubAllGlobals());

const contact = {
  name: 'Ana',
  company: 'Hospital X',
  email: 'ana@exemplo.com',
  phone: '61999990000',
  service: '',
  subject: 'Orçamento',
  message: 'Olá!',
};

describe('avisos de contato e currículo pelo Resend', () => {
  it('contato vai para a caixa informada (ex.: UOL), com Reply-To do visitante', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await notifyNewContact(contact, 'contato@site.com.br')).toBe(true);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_test_123');
    expect(body).toMatchObject({ to: ['contato@site.com.br'], reply_to: 'ana@exemplo.com' });
    expect(body.from).toContain('<curriculos@site.com.br>');
    expect(body.text).toContain('Hospital X');
  });

  it('currículo segue em anexo (PDF em base64)', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const pdf = new TextEncoder().encode('%PDF-1.7 teste').buffer as ArrayBuffer;
    const ok = await notifyNewApplication(
      { name: 'Bia', email: 'bia@exemplo.com', phone: '', message: '', filename: 'cv da Bia.pdf' },
      pdf,
      'contato@site.com.br'
    );

    expect(ok).toBe(true);
    const body = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.attachments[0].filename).toBe('cv da Bia.pdf');
    expect(atob(body.attachments[0].content)).toContain('%PDF-1.7');
  });

  it('se o Resend recusar e não houver binding, devolve false sem lançar (o contato segue salvo)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 422 })));
    expect(await notifyNewContact(contact, 'contato@site.com.br')).toBe(false);
  });
});
