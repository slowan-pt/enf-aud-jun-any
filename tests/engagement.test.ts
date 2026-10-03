/**
 * Comentários moderados + inscritos. Roda num SQLite de verdade (ver
 * tests/helpers/sqlite-d1.ts), usando a MESMA migration que vai para produção.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createSqliteD1 } from './helpers/sqlite-d1';
import {
  addSubscriber,
  getSubscriberByToken,
  unsubscribeByToken,
  countCommentsByStatus,
  deleteComment,
  hitRateLimit,
  insertComment,
  isPublishedPost,
  listApprovedComments,
  listCommentsForAdmin,
  listSubscribers,
  moderateComment,
  setSubscriberStatus,
  subscribersToCsv,
} from '../src/lib/engagement';

const MIGRATION = ['0010_comments_subscribers.sql', '0011_subscribers_name_token.sql']
  .map((file) => readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'))
  .join(' ');

const POSTS = `
  CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL, title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', deleted_at TEXT
  );
  INSERT INTO posts (slug, title, status) VALUES ('publicada', 'Publicada', 'published');
  INSERT INTO posts (slug, title, status) VALUES ('rascunho', 'Rascunho', 'draft');
`;

const fresh = () => createSqliteD1(POSTS + MIGRATION);

describe('comentários', () => {
  it('só aparecem no site depois de aprovados, e o e-mail nunca vai junto', async () => {
    const db = fresh();
    const id = await insertComment(db, {
      postId: 1,
      name: 'Ana',
      email: 'ana@exemplo.com',
      body: 'Ótimo conteúdo, obrigada!',
      ip: '1.1.1.1',
    });
    expect(await listApprovedComments(db, 1)).toEqual([]);

    await moderateComment(db, id, 'aprovado', 'Obrigado, Ana!');
    const approved = await listApprovedComments(db, 1);
    expect(approved).toHaveLength(1);
    expect(approved[0]).toMatchObject({ name: 'Ana', reply: 'Obrigado, Ana!' });
    expect(approved[0]).not.toHaveProperty('email');
    expect(await listApprovedComments(db, 2)).toEqual([]);
  });

  it('rejeitar esconde de novo; excluir remove de vez; contagem por status', async () => {
    const db = fresh();
    const a = await insertComment(db, { postId: 1, name: 'A', email: 'a@a.com', body: 'comentário um', ip: '' });
    const b = await insertComment(db, { postId: 1, name: 'B', email: 'b@b.com', body: 'comentário dois', ip: '' });
    await moderateComment(db, a, 'aprovado');
    await moderateComment(db, a, 'rejeitado');
    expect(await listApprovedComments(db, 1)).toEqual([]);
    expect(await countCommentsByStatus(db)).toEqual({ pendente: 1, aprovado: 0, rejeitado: 1 });

    await deleteComment(db, b);
    const all = await listCommentsForAdmin(db);
    expect(all.map((c) => c.id)).toEqual([a]);
    expect(all[0]?.post_title).toBe('Publicada');
  });

  it('só matérias publicadas aceitam comentário', async () => {
    const db = fresh();
    expect(await isPublishedPost(db, 1)).toBe(true);
    expect(await isPublishedPost(db, 2)).toBe(false);
    expect(await isPublishedPost(db, 99)).toBe(false);
  });
});

describe('limite por IP', () => {
  it('bloqueia depois do máximo e é independente por chave', async () => {
    const db = fresh();
    expect(await hitRateLimit(db, 'comment:1.1.1.1', 3)).toBe(false);
    expect(await hitRateLimit(db, 'comment:1.1.1.1', 3)).toBe(false);
    expect(await hitRateLimit(db, 'comment:1.1.1.1', 3)).toBe(false);
    expect(await hitRateLimit(db, 'comment:1.1.1.1', 3)).toBe(true);
    expect(await hitRateLimit(db, 'comment:2.2.2.2', 3)).toBe(false);
    expect(await hitRateLimit(db, 'subscribe:1.1.1.1', 3)).toBe(false);
  });

  it('a janela vencida zera a contagem', async () => {
    const db = fresh();
    await hitRateLimit(db, 'k', 1);
    expect(await hitRateLimit(db, 'k', 1)).toBe(true);
    await db
      .prepare("UPDATE engagement_rate_limit SET window_start = datetime('now', '-2 hours')")
      .run();
    expect(await hitRateLimit(db, 'k', 1)).toBe(false);
  });
});

describe('inscritos', () => {
  it('o mesmo e-mail não duplica (maiúsculas incluídas) e quem cancelou volta ativo', async () => {
    const db = fresh();
    await addSubscriber(db, { email: 'Joao@Exemplo.com', source: 'mat-1', ip: '' });
    await addSubscriber(db, { email: 'joao@exemplo.com', source: 'mat-2', ip: '' });
    let list = await listSubscribers(db);
    expect(list).toHaveLength(1);
    expect(list[0]?.email).toBe('joao@exemplo.com');

    await setSubscriberStatus(db, list[0]!.id, 'cancelado');
    expect((await listSubscribers(db))[0]?.status).toBe('cancelado');
    await addSubscriber(db, { email: 'joao@exemplo.com', source: 'mat-3', ip: '' });
    list = await listSubscribers(db);
    expect(list[0]?.status).toBe('ativo');
  });

  it('o CSV traz só os ativos e escapa aspas', async () => {
    const db = fresh();
    await addSubscriber(db, { email: 'a@a.com', source: 'x"y', ip: '' });
    await addSubscriber(db, { email: 'b@b.com', source: 'z', ip: '' });
    const b = (await listSubscribers(db)).find((s) => s.email === 'b@b.com')!;
    await setSubscriberStatus(db, b.id, 'cancelado');

    const csv = subscribersToCsv(await listSubscribers(db));
    expect(csv.startsWith('﻿nome,email,origem,inscrito_em,link_cancelar')).toBe(true);
    expect(csv).toContain('"a@a.com","x""y"');
    expect(csv).not.toContain('b@b.com');
  });

  it('guarda o nome, mantém o token ao reinscrever e o cancelamento por link funciona sozinho', async () => {
    const db = fresh();
    await addSubscriber(db, { email: 'maria@x.com', name: 'Maria Silva', source: 'm', ip: '' });
    const first = (await listSubscribers(db))[0]!;
    expect(first.name).toBe('Maria Silva');
    expect(first.token).toMatch(/^[0-9a-f]{32}$/);

    await addSubscriber(db, { email: 'MARIA@x.com', name: '', source: 'm2', ip: '' });
    const again = (await listSubscribers(db))[0]!;
    expect(again.token).toBe(first.token);
    expect(again.name).toBe('Maria Silva');

    expect(await getSubscriberByToken(db, 'naoexiste')).toBeNull();
    expect(await unsubscribeByToken(db, '0'.repeat(32))).toBe(false);
    expect(await unsubscribeByToken(db, first.token)).toBe(true);
    expect((await listSubscribers(db))[0]?.status).toBe('cancelado');

    const csv = subscribersToCsv(await listSubscribers(db), 'https://s.com');
    expect(csv).not.toContain('maria@x.com');
  });

  it('o CSV inclui o link de cancelamento individual', async () => {
    const db = fresh();
    await addSubscriber(db, { email: 'a@a.com', name: 'Ana', source: '', ip: '' });
    const row = (await listSubscribers(db))[0]!;
    const csv = subscribersToCsv([row], 'https://site.com');
    expect(csv).toContain(`https://site.com/cancelar-inscricao?token=${row.token}`);
  });
});
