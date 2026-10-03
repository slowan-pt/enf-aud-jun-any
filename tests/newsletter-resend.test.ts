import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('cloudflare:workers', () => ({
  env: {
    RESEND_API_KEY: 're_test_123',
    MAIL_FROM: 'curriculos@site.com.br',
    NEWSLETTER_FROM: 'novidades@site.com.br',
    PUBLIC_SITE_URL: 'https://site.com.br',
  },
}));

import { isNewsletterConfigured, sendNewsletterTo } from '../src/lib/newsletter';

const post = {
  id: 1,
  slug: 'materia',
  title: 'Título da matéria',
  excerpt: 'Resumo.',
  cover: '/media/x.png',
  categoryName: 'Cat',
};

afterEach(() => vi.unstubAllGlobals());

describe('envio pelo Resend', () => {
  it('está configurado quando há chave', () => {
    expect(isNewsletterConfigured()).toBe(true);
  });

  it('manda um e-mail por inscrito, com remetente, autenticação e link de cancelamento dele', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 'abc' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendNewsletterTo(
      post,
      { email: 'maria@exemplo.com', name: 'Maria Silva', token: 'f'.repeat(32) },
      'Essencial Saúde Auditoria',
      'contato@site.com.br'
    );

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_test_123');
    const body = JSON.parse(String(init.body));
    expect(body.from).toBe('Essencial Saúde Auditoria <novidades@site.com.br>');
    expect(body.to).toEqual(['maria@exemplo.com']);
    expect(body.subject).toBe('Novo conteúdo: Título da matéria');
    expect(body.html).toContain('Olá, Maria!');
    expect(body.headers['List-Unsubscribe']).toBe(
      `<https://site.com.br/cancelar-inscricao?token=${'f'.repeat(32)}>`
    );
  });

  it('devolve o motivo quando o serviço recusa, sem lançar erro', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ message: 'domain not verified' }), { status: 403 }))
    );
    const result = await sendNewsletterTo(
      post,
      { email: 'a@b.com', name: '', token: 'e'.repeat(32) },
      'Essencial',
      ''
    );
    expect(result).toEqual({ ok: false, error: 'domain not verified' });
  });

  it('falha de rede também vira resultado, não exceção', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const result = await sendNewsletterTo(
      post,
      { email: 'a@b.com', name: '', token: 'e'.repeat(32) },
      'Essencial',
      ''
    );
    expect(result).toEqual({ ok: false, error: 'offline' });
  });
});
