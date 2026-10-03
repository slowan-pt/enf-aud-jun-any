/**
 * Modelo padrão de página de serviço (o mesmo desenho de /servicos/
 * auditoria-concorrente): topo, até 4 cards de destaque e barra lateral.
 *
 * Todo serviço — criado à mão no admin, criado pela home ou já existente —
 * passa por `withServiceTemplate`, então NUNCA aparece sem cards ou sem
 * lateral. Tudo aqui é apenas ponto de partida: cada texto vira conteúdo
 * salvo no serviço assim que é editado no Editor Visual.
 */
import type { ServiceHighlight } from './services';

export const MAX_HIGHLIGHTS = 4;

/** Textos da barra lateral e do topo — 100% editáveis por serviço. */
export interface ServiceAside {
  deliverablesTitle: string;
  audienceTitle: string;
  ctaTitle: string;
  ctaText: string;
  /** Vazio = usa o telefone das configurações do site. */
  whatsappLabel: string;
  ctaButtonLabel: string;
}

export const DEFAULT_ASIDE: ServiceAside = {
  deliverablesTitle: 'O que entregamos',
  audienceTitle: 'Para quem',
  ctaTitle: 'Fale com a equipe técnica',
  ctaText: 'Tire dúvidas sobre escopo, método e indicadores de acompanhamento deste serviço.',
  whatsappLabel: '',
  ctaButtonLabel: 'Solicitar apresentação',
};

export const DEFAULT_HIGHLIGHTS: ServiceHighlight[] = [
  {
    icon: 'clipboard-check',
    title: 'Análise técnica',
    text: 'Avaliação criteriosa dos processos e registros assistenciais, com foco em qualidade e segurança.',
  },
  {
    icon: 'users',
    title: 'Equipe especializada',
    text: 'Enfermeiros auditores com experiência em contas hospitalares e relacionamento com operadoras.',
  },
  {
    icon: 'file-check',
    title: 'Relatórios objetivos',
    text: 'Documentação clara e baseada em evidências para apoiar decisões e negociações.',
  },
  {
    icon: 'shield-check',
    title: 'Segurança e conformidade',
    text: 'Atuação alinhada às normas e protocolos vigentes, com sigilo e rastreabilidade.',
  },
];

export const DEFAULT_DELIVERABLES = [
  'Relatório técnico de acompanhamento',
  'Registro estruturado de desvios e recomendações',
  'Indicadores de acompanhamento por período',
  'Consolidação documentada das ocorrências',
];

export const DEFAULT_AUDIENCE = [
  'Operadoras de saúde',
  'Seguradoras',
  'Hospitais e clínicas',
  'Gestores de contas médicas',
];

/** Mescla o que foi salvo com o padrão — campo ausente ou não-texto volta ao padrão. */
export function normalizeAside(value: unknown): ServiceAside {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const out = { ...DEFAULT_ASIDE };
  for (const key of Object.keys(DEFAULT_ASIDE) as (keyof ServiceAside)[]) {
    if (typeof raw[key] === 'string') out[key] = (raw[key] as string).slice(0, 600);
  }
  return out;
}

/**
 * Completa o que estiver vazio com o modelo. Listas que a pessoa já preencheu
 * nunca são tocadas; cópias novas evitam que uma edição altere o padrão.
 */
export function withServiceTemplate<
  T extends { highlights: ServiceHighlight[]; deliverables: string[]; audience: string[] },
>(content: T): T {
  return {
    ...content,
    highlights: content.highlights?.length
      ? content.highlights
      : DEFAULT_HIGHLIGHTS.map((item) => ({ ...item })),
    deliverables: content.deliverables?.length ? content.deliverables : [...DEFAULT_DELIVERABLES],
    audience: content.audience?.length ? content.audience : [...DEFAULT_AUDIENCE],
  };
}
