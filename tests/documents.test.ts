/**
 * Modelo de conteúdo das páginas migradas (Quem Somos, Contato). Foco desta
 * suíte: a sobrescrita de dados globais da Contato (telefone/WhatsApp/
 * e-mail/horários/endereço) — o ponto que mistura "campo de conteúdo" com
 * "campo que também é um link", onde texto e destino nunca podem divergir.
 */
import { describe, it, expect } from 'vitest';
import { normalizeContatoOverrides, formatBrPhoneDisplay } from '../src/lib/documents';

describe('normalizeContatoOverrides', () => {
  it('tudo vazio herda o padrão global em todos os campos', () => {
    expect(normalizeContatoOverrides({})).toEqual({
      phone: '',
      whatsapp: '',
      email: '',
      hours: '',
      address: '',
    });
  });

  it('telefone e whatsapp exigem o DDI 55 — sem ele, o link tel:/wa.me sairia com o país errado', () => {
    // Só os dígitos formatados, mas sem DDI: sai vazio (herda), não aceita "quase certo".
    expect(normalizeContatoOverrides({ phone: '(61) 98244-4083' }).phone).toBe('');
    expect(normalizeContatoOverrides({ phone: '61982444083' }).phone).toBe('');
    expect(normalizeContatoOverrides({ phone: '5561982444083' }).phone).toBe('5561982444083');
    expect(normalizeContatoOverrides({ phone: '123' }).phone).toBe('');
    expect(normalizeContatoOverrides({ whatsapp: '5561911112222' }).whatsapp).toBe(
      '5561911112222'
    );
  });

  it('telefone e whatsapp são independentes — sobrescrever um não move o outro', () => {
    const result = normalizeContatoOverrides({ phone: '5561911112222' });
    expect(result.phone).toBe('5561911112222');
    expect(result.whatsapp).toBe('');
  });

  it('e-mail só aceita formato válido', () => {
    expect(normalizeContatoOverrides({ email: 'contato@empresa.com.br' }).email).toBe(
      'contato@empresa.com.br'
    );
    expect(normalizeContatoOverrides({ email: 'não é um e-mail' }).email).toBe('');
  });

  it('horário e endereço aceitam texto livre, com limite de tamanho', () => {
    expect(normalizeContatoOverrides({ hours: 'Sáb, 9h-12h' }).hours).toBe('Sáb, 9h-12h');
    const longo = 'x'.repeat(1000);
    expect(normalizeContatoOverrides({ address: longo }).address.length).toBe(500);
  });
});

describe('formatBrPhoneDisplay', () => {
  it('formata celular (9 dígitos) com DDI, no mesmo padrão de data/site.ts', () => {
    expect(formatBrPhoneDisplay('5561982444083')).toBe('(61) 98244-4083');
  });

  it('formata fixo (8 dígitos) com DDI', () => {
    expect(formatBrPhoneDisplay('556133224455')).toBe('(61) 3322-4455');
  });

  it('funciona também sem o DDI', () => {
    expect(formatBrPhoneDisplay('61982444083')).toBe('(61) 98244-4083');
  });

  it('valor não reconhecido volta como veio, em vez de quebrar', () => {
    expect(formatBrPhoneDisplay('123')).toBe('123');
  });
});
