/**
 * ESSENCIAL SAÚDE AUDITORIA — dados institucionais centralizados.
 *
 * ETAPA 1: fonte única de verdade em arquivo local (mock/fixture).
 * ETAPA 2: este objeto será alimentado pela tabela `settings` do Cloudflare D1
 *          através do CMS (/admin/configuracoes). A forma (shape) definida aqui
 *          é o contrato que o backend deverá respeitar — nenhum componente lê
 *          telefone/e-mail/endereço fora daqui.
 */

export interface SocialLink {
  label: string;
  href: string;
  icon: string;
  /** Enquanto não houver perfil oficial confirmado, permanece desativado. */
  enabled: boolean;
}

export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

export const company = {
  name: 'Essencial Saúde Auditoria',
  shortName: 'Essencial Saúde',
  legalName: '', // pendente: razão social não informada
  tagline: 'Gestão e Auditoria em Saúde',
  segment: 'Gestão e Auditoria em Saúde / Gestão Hospitalar',
  description:
    'Empresa de gestão e auditoria em saúde que atua de forma colaborativa e preventiva, com visitas técnicas presenciais aos prestadores, estabelecendo um canal de comunicação fluido e seguro entre o beneficiário, a operadora de saúde e o prestador de serviço.',
  email: 'essencialsaude2026@gmail.com',
  phone: '+55 61 98244-4083',
  phoneRaw: '5561982444083',
  phoneDisplay: '(61) 98244-4083',
  address: {
    line1: 'Setor Bancário Norte, Q. 02, Bloco F',
    line2: 'Edifício Via Capital, Sala 509',
    district: 'Asa Norte',
    city: 'Brasília',
    state: 'DF',
    stateName: 'Distrito Federal',
    zip: '70041-906',
    country: 'BR',
  },
  hours: 'Segunda a sexta, das 8h às 18h',
} as const;

export const whatsapp = {
  enabled: true,
  number: company.phoneRaw,
  defaultMessage:
    'Olá! Vim pelo site da Essencial Saúde e gostaria de saber mais sobre os serviços de gestão e auditoria em saúde.',
  tooltip: 'Fale com a Essencial Saúde',
  label: 'Abrir conversa no WhatsApp',
};

/**
 * Monta o link wa.me — funciona em Android, iPhone, desktop e WhatsApp Web.
 *
 * Recebe o número explicitamente (em vez de ler um valor fixo do módulo)
 * porque, em runtime, o número vem de `Astro.locals.settings.whatsapp` —
 * editável pelo painel — e não deste arquivo estático.
 */
export function waLink(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export const social: SocialLink[] = [
  { label: 'LinkedIn', href: '#', icon: 'linkedin', enabled: false },
  { label: 'Instagram', href: '#', icon: 'instagram', enabled: false },
];

export const mainNav: NavItem[] = [
  { label: 'Início', href: '/' },
  { label: 'Quem Somos', href: '/quem-somos' },
  {
    label: 'Serviços',
    href: '/servicos',
    children: [
      { label: 'Auditoria Concorrente', href: '/servicos/auditoria-concorrente' },
      {
        label: 'Auditoria de Contas Hospitalares',
        href: '/servicos/auditoria-de-contas-hospitalares',
      },
      {
        label: 'Gestão da Jornada do Paciente',
        href: '/servicos/gestao-da-jornada-do-paciente',
      },
      { label: 'Gestão Hospitalar', href: '/servicos/gestao-hospitalar' },
      {
        label: 'Qualificação da Rede Prestadora',
        href: '/servicos/qualificacao-da-rede-prestadora',
      },
      {
        label: 'Segurança e Qualidade Assistencial',
        href: '/servicos/seguranca-e-qualidade-assistencial',
      },
    ],
  },
  { label: 'Conteúdos', href: '/conteudos' },
  { label: 'Contato', href: '/contato' },
];

export const headerCta = {
  label: 'Fale com a Essencial',
  href: '/contato',
};

export const footerLinks = {
  institucional: [
    { label: 'Quem Somos', href: '/quem-somos' },
    { label: 'Serviços', href: '/servicos' },
    { label: 'Conteúdos', href: '/conteudos' },
    { label: 'Contato', href: '/contato' },
    { label: 'Política de Privacidade', href: '/politica-de-privacidade' },
  ],
};

export const seo = {
  siteName: 'Essencial Saúde Auditoria',
  /** Ajustar quando o domínio próprio for conectado (ETAPA 2 / go-live). */
  siteUrl: 'https://essencialsaudeauditoria.com.br',
  defaultTitle: 'Essencial Saúde Auditoria | Gestão e Auditoria em Saúde em Brasília - DF',
  titleTemplate: '%s | Essencial Saúde Auditoria',
  defaultDescription:
    'Auditoria concorrente, auditoria de contas hospitalares e gestão hospitalar com foco na segurança do paciente e na sustentabilidade do sistema de saúde. Brasília - DF.',
  defaultOgImage: '/images/og-default.svg',
  locale: 'pt_BR',
  themeColor: '#092c4e',
};

/**
 * Sinalizadores da ETAPA 1.
 * `demoContent` liga o aviso de que o conteúdo exibido é de demonstração e
 * será substituído por conteúdo real cadastrado no CMS (ETAPA 2).
 */
export const flags = {
  stage: 1 as const,
  demoContent: true,
  showTestimonials: false, // sem depoimentos reais disponíveis
  showClients: false, // sem carteira de clientes divulgável
  showNumbers: false, // sem indicadores reais divulgáveis
};

export const organizationTypes = [
  'Operadora de Saúde',
  'Hospital',
  'Clínica',
  'Autogestão',
  'Cooperativa Médica',
  'Medicina de Grupo',
  'Seguradora',
  'Seguradora Internacional',
  'Cartão de Desconto',
  'Empresa',
  'Órgão Público',
  'Embaixada / Consulado',
  'Paciente Particular',
  'Outro',
];
