import { describe, expect, it } from 'vitest';
import { createSqliteD1 } from './helpers/sqlite-d1';
import { getSettings, updateSetting } from '../src/lib/settings';
import { DEFAULT_POPUP, normalizePopup, safeUrl, shouldShowPopup } from '../src/lib/popup';

const SCHEMA = `
  CREATE TABLE settings (
    key        TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_by INTEGER,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

const NOW = new Date('2026-10-14T15:00:00Z');

describe('pop-up do site', () => {
  it('sem nada salvo, usa o aviso padrão (Outubro Rosa) ativo só na home', async () => {
    const settings = await getSettings(createSqliteD1(SCHEMA));
    expect(settings.popup).toEqual(DEFAULT_POPUP);
    expect(settings.popup.image).toBe('/popup/outubro-rosa.webp');
    expect(shouldShowPopup(settings.popup, '/', NOW)).toBe(true);
    expect(shouldShowPopup(settings.popup, '/servicos', NOW)).toBe(false);
  });

  it('grava e lê o que o admin salvou', async () => {
    const db = createSqliteD1(SCHEMA);
    await updateSetting(db, 'popup', normalizePopup({ enabled: false, image: '/media/novo.png', frequency: 'daily', scope: 'all' }));
    const { popup } = await getSettings(db);
    expect(popup).toMatchObject({ enabled: false, image: '/media/novo.png', frequency: 'daily', scope: 'all' });
    expect(shouldShowPopup(popup, '/', NOW)).toBe(false);
  });

  it('respeita as datas (horário de Brasília, último dia incluso)', () => {
    const popup = normalizePopup({ startDate: '2026-10-15', endDate: '2026-10-20' });
    expect(shouldShowPopup(popup, '/', NOW)).toBe(false); // 14/10: ainda não começou
    expect(shouldShowPopup(popup, '/', new Date('2026-10-15T12:00:00Z'))).toBe(true);
    expect(shouldShowPopup(popup, '/', new Date('2026-10-21T01:00:00Z'))).toBe(true); // 20/10 22h em Brasília
    expect(shouldShowPopup(popup, '/', new Date('2026-10-21T04:00:00Z'))).toBe(false);
  });

  it('só aceita imagem/link do próprio site ou https (nada de javascript: ou data:)', () => {
    expect(safeUrl('javascript:alert(1)', { allowEmpty: true })).toBe('');
    expect(safeUrl('//evil.com/x.png', { allowEmpty: true })).toBe('');
    expect(safeUrl('data:text/html,x', { allowEmpty: false })).toBe(DEFAULT_POPUP.image);
    expect(safeUrl('/contato', { allowEmpty: true })).toBe('/contato');
    expect(safeUrl('https://exemplo.com', { allowEmpty: true })).toBe('https://exemplo.com');
  });

  it('valores inválidos voltam ao padrão', () => {
    const popup = normalizePopup({ frequency: 'x', scope: 'y', startDate: 'ontem', endDate: 5 });
    expect(popup).toMatchObject({ frequency: 'session', scope: 'home', startDate: '', endDate: '' });
  });
});
