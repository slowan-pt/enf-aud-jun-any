/**
 * Cor dos cards do site.
 *
 * Decisão de design: em vez de cor livre (que quebra contraste e a identidade),
 * há uma paleta curada de tons suaves da marca. Todos os cards nascem com UM tom
 * (`all`, padrão "soft": azul-claro) — coerência visual — e qualquer card pode
 * trocar para outro tom da paleta (`overrides`, por chave estável do card). O
 * texto continua escuro em todos os tons, então a leitura nunca piora.
 *
 * Aplicação 100% por CSS: variáveis `--card-*` no :root (tom geral) e uma regra
 * `[data-card-key="..."]` por exceção. Ver `cardStyleCss`.
 */

export interface CardTone {
  id: string;
  label: string;
  bg: string;
  border: string;
  accent: string;
}

export const CARD_TONES: readonly CardTone[] = [
  { id: 'soft', label: 'Azul claro', bg: '#eef4fb', border: '#d3e2f2', accent: '#1a6faf' },
  { id: 'teal', label: 'Verde-água', bg: '#eaf7f5', border: '#c5e8e3', accent: '#12a794' },
  { id: 'indigo', label: 'Índigo', bg: '#eff0fb', border: '#d7daf3', accent: '#4a55c7' },
  { id: 'sand', label: 'Areia', bg: '#fbf4e8', border: '#efdfc1', accent: '#c9902b' },
  { id: 'rose', label: 'Rosé', bg: '#fdeff0', border: '#f4d1d4', accent: '#c94a55' },
  { id: 'white', label: 'Branco', bg: '#ffffff', border: '#dfe6ee', accent: '#a8c4dc' },
] as const;

export const DEFAULT_TONE = 'soft';

export interface CardStyle {
  /** Tom aplicado a todos os cards que não têm exceção. */
  all: string;
  /** chave do card -> tom */
  overrides: Record<string, string>;
}

export const DEFAULT_CARD_STYLE: CardStyle = { all: DEFAULT_TONE, overrides: {} };

const KEY = /^[a-z0-9-]{1,60}$/;
const toneOf = (id: unknown) => CARD_TONES.find((tone) => tone.id === id);

export const isTone = (id: unknown): id is string => Boolean(toneOf(id));
export const isCardKey = (key: unknown): key is string =>
  typeof key === 'string' && KEY.test(key);

export function normalizeCardStyle(value: unknown): CardStyle {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const overrides: Record<string, string> = {};
  const rawOverrides =
    raw.overrides && typeof raw.overrides === 'object'
      ? (raw.overrides as Record<string, unknown>)
      : {};
  for (const [key, id] of Object.entries(rawOverrides).slice(0, 400)) {
    if (isCardKey(key) && isTone(id)) overrides[key] = id as string;
  }
  return { all: isTone(raw.all) ? (raw.all as string) : DEFAULT_TONE, overrides };
}

const vars = (tone: CardTone) =>
  `--card-bg:${tone.bg};--card-border:${tone.border};--card-accent:${tone.accent}`;

/** CSS que vai no <head>: tom geral + uma regra por exceção. Só usa valores da paleta. */
export function cardStyleCss(style: CardStyle): string {
  const base = toneOf(style.all) ?? CARD_TONES[0]!;
  const rules = [`:root{${vars(base)}}`];
  for (const [key, id] of Object.entries(style.overrides)) {
    const tone = toneOf(id);
    if (tone && isCardKey(key)) rules.push(`[data-card-key="${key}"]{${vars(tone)}}`);
  }
  return rules.join('\n');
}
