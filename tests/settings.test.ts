/**
 * Regressão do bug: a consulta de getSettings tinha 9 placeholders
 * (`?1`..`?9`) mas 10 valores em `.bind()` (depois que `cardStyle` foi
 * adicionado). Num SQLite de verdade isso lança "column index out of
 * range" — capturado pelo `catch` da função, que then devolve os
 * DEFAULTS para TODAS as chaves, mesmo as que estão salvas no banco. Só um
 * SQLite de verdade (ver tests/helpers/sqlite-d1.ts) pega isso; um mock
 * feito à mão não reproduz o erro do driver.
 */
import { describe, expect, it } from 'vitest';
import { createSqliteD1 } from './helpers/sqlite-d1';
import { getSettings, updateSetting } from '../src/lib/settings';

const SCHEMA = `
  CREATE TABLE settings (
    key        TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_by INTEGER,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

describe('getSettings', () => {
  it('lê todas as 10 chaves salvas, sem cair no padrão por causa de um erro de SQL', async () => {
    const db = createSqliteD1(SCHEMA);
    await updateSetting(db, 'company', { email: 'contato@exemplo.com.br' });
    await updateSetting(db, 'howWeWork', { title: 'Título editado' });
    await updateSetting(db, 'clientSegments', { title: 'Segmentos editados' });

    const settings = await getSettings(db);

    expect(settings.company.email).toBe('contato@exemplo.com.br');
    expect(settings.howWeWork.title).toBe('Título editado');
    expect(settings.clientSegments.title).toBe('Segmentos editados');
  });

  it('sem nenhuma linha salva, devolve os padrões (nunca derruba a página)', async () => {
    const db = createSqliteD1(SCHEMA);
    const settings = await getSettings(db);
    expect(settings.company.email).toBeTruthy();
    expect(settings.cardStyle.all).toBeTruthy();
  });

  it('grava e lê a cor dos cards (a 10ª chave que expôs o bug)', async () => {
    const db = createSqliteD1(SCHEMA);
    await updateSetting(db, 'cardStyle', { all: 'teal', overrides: { 'hl-0': 'sand' } });
    const settings = await getSettings(db);
    expect(settings.cardStyle.all).toBe('teal');
    expect(settings.cardStyle.overrides['hl-0']).toBe('sand');
  });
});
