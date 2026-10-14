/**
 * Pop-up de aviso do site (imagem na frente da página, fecha no X).
 * Guardado em `settings` (chave `popup`) e editado em /admin/popup.
 */

export type PopupFrequency = 'always' | 'session' | 'daily' | 'weekly';
export type PopupScope = 'home' | 'all';

export interface PopupSettings {
  enabled: boolean;
  /** Caminho/URL da imagem (de preferência PNG/WebP com fundo transparente). */
  image: string;
  alt: string;
  /** Opcional: para onde vai quem clica na imagem. */
  link: string;
  newTab: boolean;
  scope: PopupScope;
  /** Com que frequência o mesmo visitante volta a ver o aviso. */
  frequency: PopupFrequency;
  /** AAAA-MM-DD (inclusive). Vazio = sem limite. */
  startDate: string;
  endDate: string;
  /** Muda a cada salvamento: quem já fechou o aviso anterior volta a ver o novo. */
  version: string;
}

export const DEFAULT_POPUP: PopupSettings = {
  enabled: true,
  image: '/popup/outubro-rosa.webp',
  alt: 'Outubro Rosa: prevenir é cuidar! Consulte seu médico regularmente.',
  link: '',
  newTab: false,
  scope: 'home',
  frequency: 'session',
  startDate: '',
  endDate: '',
  version: 'outubro-rosa-1',
};

export const FREQUENCY_LABELS: Record<PopupFrequency, string> = {
  always: 'A cada visita à página',
  session: 'Uma vez por sessão (até fechar o navegador)',
  daily: 'Uma vez por dia',
  weekly: 'Uma vez por semana',
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Aceita só imagens do próprio site (/...) ou https — nunca javascript:, data: etc. */
export function safeUrl(value: unknown, { allowEmpty }: { allowEmpty: boolean }): string {
  const text = String(value ?? '').trim();
  if (!text) return allowEmpty ? '' : DEFAULT_POPUP.image;
  if (text.startsWith('/') && !text.startsWith('//')) return text;
  if (/^https:\/\//i.test(text)) return text;
  return allowEmpty ? '' : DEFAULT_POPUP.image;
}

export function normalizePopup(raw: unknown): PopupSettings {
  const v = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_POPUP;
  const frequency = (['always', 'session', 'daily', 'weekly'] as const).includes(v.frequency as PopupFrequency)
    ? (v.frequency as PopupFrequency)
    : d.frequency;
  const date = (x: unknown) => (typeof x === 'string' && DATE_RE.test(x) ? x : '');
  return {
    enabled: typeof v.enabled === 'boolean' ? v.enabled : d.enabled,
    image: 'image' in v ? safeUrl(v.image, { allowEmpty: false }) : d.image,
    alt: typeof v.alt === 'string' ? v.alt.slice(0, 300) : d.alt,
    link: safeUrl(v.link, { allowEmpty: true }),
    newTab: v.newTab === true,
    scope: v.scope === 'all' ? 'all' : 'home',
    frequency,
    startDate: date(v.startDate),
    endDate: date(v.endDate),
    version: typeof v.version === 'string' && v.version ? v.version.slice(0, 40) : d.version,
  };
}

/** Hoje (data de Brasília) no formato AAAA-MM-DD. */
export function todayBRT(now: Date): string {
  return new Date(now.getTime() - 3 * 3_600_000).toISOString().slice(0, 10);
}

export function shouldShowPopup(popup: PopupSettings, pathname: string, now: Date): boolean {
  if (!popup.enabled || !popup.image) return false;
  if (popup.scope === 'home' && pathname !== '/') return false;
  const today = todayBRT(now);
  if (popup.startDate && today < popup.startDate) return false;
  if (popup.endDate && today > popup.endDate) return false;
  return true;
}
