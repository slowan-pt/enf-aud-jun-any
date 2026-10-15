/**
 * Textos que antes eram fixos no código (botão do topo, rodapé, Trabalhe
 * conosco, formulário do Portfólio, caixas de inscrição/comentário das
 * matérias). Agora ficam em `settings` (chave `siteTexts`) e são editados em
 * /admin/textos. Cada campo vazio volta ao texto original abaixo — nada some.
 */
import { safeUrl } from './popup';

export interface SiteTexts {
  header: { ctaLabel: string; ctaHref: string };
  footer: { about: string; servicesTitle: string; linksTitle: string; contactTitle: string };
  careers: { eyebrow: string; title: string; lead: string };
  portfolioForm: { title: string; lead: string; button: string; success: string };
  engagement: {
    subscribeTitle: string;
    subscribeHint: string;
    firstComment: string;
    commentTitle: string;
    moderationNote: string;
  };
}

export const DEFAULT_SITE_TEXTS: SiteTexts = {
  header: { ctaLabel: 'Fale com a Essencial', ctaHref: '/contato' },
  footer: {
    about:
      'Empresa especializada em gestão e auditoria em saúde, atuando como elo técnico entre fontes pagadoras, prestadores e beneficiários, com foco na segurança do paciente e na sustentabilidade do sistema.',
    servicesTitle: 'Serviços',
    linksTitle: 'Links rápidos',
    contactTitle: 'Contato',
  },
  careers: {
    eyebrow: 'Carreiras',
    title: 'Trabalhe conosco',
    lead: 'Quer fazer parte da equipe? Envie seu currículo em PDF e entraremos em contato quando houver uma oportunidade compatível com o seu perfil.',
  },
  portfolioForm: {
    title: 'Quer receber o Portfólio em PDF?',
    lead: 'Preencha os dados e teremos a satisfação de enviar o Portfólio para você.',
    button: 'Quero receber o Portfólio',
    success: 'Recebemos o seu pedido! Em breve enviaremos o Portfólio para o e-mail informado.',
  },
  engagement: {
    subscribeTitle: 'Receba as novas publicações',
    subscribeHint: 'Deixe seu e-mail para ser avisado quando publicarmos novos conteúdos.',
    firstComment: 'Seja o primeiro a comentar.',
    commentTitle: 'Deixe seu comentário',
    moderationNote: 'Os comentários são analisados antes de aparecer no site.',
  },
};

type Kind = 'text' | 'textarea' | 'link';
export interface TextField {
  group: keyof SiteTexts;
  key: string;
  label: string;
  kind: Kind;
  max: number;
}

export const GROUP_TITLES: Record<keyof SiteTexts, string> = {
  header: 'Botão do topo do site',
  footer: 'Rodapé',
  careers: 'Página Trabalhe conosco (topo)',
  portfolioForm: 'Formulário do Portfólio',
  engagement: 'Matérias: inscrição e comentários',
};

/** Fonte única da tela de edição: ordem, rótulo e limite de cada campo. */
export const TEXT_FIELDS: TextField[] = [
  { group: 'header', key: 'ctaLabel', label: 'Texto do botão', kind: 'text', max: 40 },
  { group: 'header', key: 'ctaHref', label: 'Link do botão (ex.: /contato)', kind: 'link', max: 200 },
  { group: 'footer', key: 'about', label: 'Texto sobre a empresa', kind: 'textarea', max: 500 },
  { group: 'footer', key: 'servicesTitle', label: 'Título da coluna de serviços', kind: 'text', max: 40 },
  { group: 'footer', key: 'linksTitle', label: 'Título da coluna de links', kind: 'text', max: 40 },
  { group: 'footer', key: 'contactTitle', label: 'Título da coluna de contato', kind: 'text', max: 40 },
  { group: 'careers', key: 'eyebrow', label: 'Etiqueta (letras pequenas)', kind: 'text', max: 80 },
  { group: 'careers', key: 'title', label: 'Título', kind: 'text', max: 120 },
  { group: 'careers', key: 'lead', label: 'Mensagem', kind: 'textarea', max: 400 },
  { group: 'portfolioForm', key: 'title', label: 'Título', kind: 'text', max: 120 },
  { group: 'portfolioForm', key: 'lead', label: 'Mensagem', kind: 'textarea', max: 300 },
  { group: 'portfolioForm', key: 'button', label: 'Texto do botão', kind: 'text', max: 60 },
  { group: 'portfolioForm', key: 'success', label: 'Mensagem depois de enviar', kind: 'textarea', max: 300 },
  { group: 'engagement', key: 'subscribeTitle', label: 'Título da inscrição', kind: 'text', max: 100 },
  { group: 'engagement', key: 'subscribeHint', label: 'Texto da inscrição', kind: 'textarea', max: 250 },
  { group: 'engagement', key: 'firstComment', label: 'Aviso quando não há comentários', kind: 'text', max: 100 },
  { group: 'engagement', key: 'commentTitle', label: 'Título do formulário de comentário', kind: 'text', max: 100 },
  { group: 'engagement', key: 'moderationNote', label: 'Aviso sobre a análise dos comentários', kind: 'text', max: 200 },
];

export function normalizeSiteTexts(raw: unknown): SiteTexts {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, Record<string, unknown> | undefined>;
  const out = structuredClone(DEFAULT_SITE_TEXTS) as unknown as Record<string, Record<string, string>>;
  for (const field of TEXT_FIELDS) {
    const value = input[field.group]?.[field.key];
    if (typeof value !== 'string') continue;
    const text = value.replace(/\r\n/g, '\n').trim().slice(0, field.max);
    if (!text) continue; // vazio = volta ao padrão
    // Link só do próprio site ou https (nunca javascript:).
    out[field.group]![field.key] = field.kind === 'link' ? safeUrl(text, { allowEmpty: true }) || out[field.group]![field.key]! : text;
  }
  return out as unknown as SiteTexts;
}
