import { describe, expect, it } from 'vitest';
import { readRows } from '../src/lib/form-rows';

/** Monta um FormData como o RowsEditor gera: um valor por linha, na ordem. */
function formOf(prefix: string, columns: Record<string, string[]>): FormData {
  const form = new FormData();
  for (const [key, values] of Object.entries(columns)) {
    for (const value of values) form.append(`${prefix}_${key}`, value);
  }
  return form;
}

describe('readRows — redes sociais (icon/label/href/enabled)', () => {
  it('mantém uma linha preenchida e descarta a vazia', () => {
    const form = formOf('social', {
      icon: ['instagram', 'facebook'],
      label: ['Instagram', ''],
      href: ['https://instagram.com/x', ''],
      enabled: ['on', ''],
    });
    const rows = readRows(form, 'social', ['icon', 'label', 'href', 'enabled'] as const, 12);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      icon: 'instagram',
      label: 'Instagram',
      href: 'https://instagram.com/x',
      enabled: 'on',
    });
  });

  it('mantém uma linha só com "Exibir" marcado, mesmo sem label/href', () => {
    const form = formOf('social', {
      icon: ['linkedin'],
      label: [''],
      href: [''],
      enabled: ['on'],
    });
    const rows = readRows(form, 'social', ['icon', 'label', 'href', 'enabled'] as const, 12);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.enabled).toBe('on');
  });

  it('desmarcado (checkbox oculto manda "") não desalinha as linhas seguintes', () => {
    const form = formOf('social', {
      icon: ['instagram', 'facebook', 'linkedin'],
      label: ['Instagram', 'Facebook', 'LinkedIn'],
      href: ['https://a', 'https://b', 'https://c'],
      enabled: ['on', '', 'on'],
    });
    const rows = readRows(form, 'social', ['icon', 'label', 'href', 'enabled'] as const, 12);
    expect(rows.map((r) => r.label)).toEqual(['Instagram', 'Facebook', 'LinkedIn']);
    expect(rows.map((r) => r.enabled)).toEqual(['on', '', 'on']);
  });
});
