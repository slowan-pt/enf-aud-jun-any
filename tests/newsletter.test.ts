import { describe, expect, it, vi } from 'vitest';

vi.mock('cloudflare:workers', () => ({ env: {} }));

import {
  buildNewsletterContent,
  buildNewsletterMime,
  escapeHtml,
  firstName,
  unsubscribeUrl,
} from '../src/lib/newsletter';

const post = {
  id: 1,
  slug: 'auditoria-concorrente',
  title: 'Auditoria concorrente contribui para melhores desfechos',
  excerpt: 'A diferença entre avaliar o cuidado durante a internação e conferi-lo depois.',
  cover: '/media/abc.png',
  categoryName: 'Auditoria Concorrente',
};
const recipient = { name: 'Maria Silva', token: 'a'.repeat(32) };
const base = { post, recipient, siteUrl: 'https://site.com.br', companyName: 'Essencial Saúde Auditoria' };

describe('conteúdo da newsletter', () => {
  it('personaliza com o primeiro nome e traz título, resumo, botão e cancelamento', () => {
    const c = buildNewsletterContent(base);
    expect(c.subject).toBe(`Novo conteúdo: ${post.title}`);
    for (const part of [c.html, c.text]) {
      expect(part).toContain('Olá, Maria!');
      expect(part).toContain(post.title);
      expect(part).toContain(post.excerpt);
      expect(part).toContain('https://site.com.br/conteudos/auditoria-concorrente');
      expect(part).toContain(`https://site.com.br/cancelar-inscricao?token=${'a'.repeat(32)}`);
      expect(part).toContain('Cancelar inscrição');
    }
    expect(c.html).toContain('Ler conteúdo');
    expect(c.html).toContain('https://site.com.br/media/abc.png');
  });

  it('sem nome usa saudação genérica; capa SVG não vai no e-mail (clientes bloqueiam)', () => {
    const c = buildNewsletterContent({
      ...base,
      recipient: { name: '', token: 'b'.repeat(32) },
      post: { ...post, cover: '/images/post-x.svg' },
    });
    expect(c.text.startsWith('Olá!')).toBe(true);
    expect(c.html).not.toContain('<img');
  });

  it('escapa HTML vindo do título/nome (nada de injeção no e-mail)', () => {
    const c = buildNewsletterContent({
      ...base,
      recipient: { name: '<script>alert(1)</script>', token: 'c'.repeat(32) },
      post: { ...post, title: 'A <b>"quebra"</b> & mais' },
    });
    expect(c.html).not.toContain('<script>');
    expect(c.html).not.toContain('<b>');
    expect(c.html).toContain('&#60;b&#62;');
    expect(escapeHtml(`<a href="x">'&'</a>`)).not.toMatch(/[<>"']/);
  });

  it('helpers', () => {
    expect(firstName('  Ana  Paula Souza ')).toBe('Ana');
    expect(firstName('')).toBe('');
    expect(unsubscribeUrl('https://s.com', 'tok')).toBe('https://s.com/cancelar-inscricao?token=tok');
  });
});

describe('MIME da newsletter', () => {
  const c = buildNewsletterContent(base);
  const raw = buildNewsletterMime({
    from: 'contato@site.com.br',
    fromName: 'Essencial Saúde Auditoria',
    to: 'maria@exemplo.com',
    replyTo: 'contato@site.com.br',
    subject: c.subject,
    text: c.text,
    html: c.html,
    unsubscribe: c.unsubscribe,
    domain: 'site.com.br',
  });

  it('é multipart/alternative com texto e HTML em base64 e cabeçalho List-Unsubscribe', () => {
    expect(raw).toContain('Content-Type: multipart/alternative');
    expect(raw).toContain('Content-Type: text/plain; charset=UTF-8');
    expect(raw).toContain('Content-Type: text/html; charset=UTF-8');
    expect(raw).toContain('To: <maria@exemplo.com>');
    expect(raw).toContain(`List-Unsubscribe: <${c.unsubscribe}>`);
    expect(raw).toContain('Subject: =?UTF-8?B?');
  });

  it('um destinatário nunca consegue injetar cabeçalhos (CRLF) no e-mail', () => {
    const evil = buildNewsletterMime({
      from: 'contato@site.com.br',
      fromName: 'X',
      to: 'a@b.com\r\nBcc: espiao@x.com',
      replyTo: 'contato@site.com.br',
      subject: 's',
      text: 't',
      html: 'h',
      unsubscribe: 'https://s.com/u',
      domain: 'site.com.br',
    });
    expect(evil).not.toMatch(/\r\nBcc:/);
  });
});
