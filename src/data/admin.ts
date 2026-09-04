/**
 * DADOS DE DEMONSTRAÇÃO DO CMS (ETAPA 1).
 *
 * TODOS os números, contatos, usuários, logs e arquivos abaixo são FICTÍCIOS e
 * existem apenas para demonstrar o layout do painel. Nenhum deles representa
 * dados reais da Essencial Saúde e nenhum é persistido.
 *
 * ETAPA 2: substituídos por consultas ao Cloudflare D1 (tabelas contacts,
 * users, media, audit_logs, redirects, settings...).
 */

export const DEMO_NOTICE =
  'Dados de demonstração — nenhuma informação real e nenhuma gravação nesta etapa.';

export interface AdminNavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
  children?: { label: string; href: string }[];
}

export const adminNav: AdminNavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: 'grid' },
  {
    label: 'Conteúdo',
    href: '#',
    icon: 'file-text',
    children: [
      { label: 'Páginas', href: '/admin/paginas' },
      { label: 'Serviços', href: '/admin/servicos' },
      { label: 'Matérias', href: '/admin/conteudos' },
      { label: 'Categorias', href: '/admin/categorias' },
      { label: 'Autores', href: '/admin/autores' },
    ],
  },
  { label: 'Mídia', href: '/admin/midia', icon: 'image' },
  { label: 'Contatos', href: '/admin/contatos', icon: 'inbox', badge: 3 },
  {
    label: 'SEO',
    href: '/admin/seo',
    icon: 'globe',
    children: [
      { label: 'Metadados', href: '/admin/seo' },
      { label: 'Redirecionamentos', href: '/admin/seo#redirects' },
    ],
  },
  { label: 'Aparência', href: '/admin/aparencia', icon: 'palette' },
  { label: 'Ícones', href: '/admin/icones', icon: 'star' },
  { label: 'Configurações', href: '/admin/configuracoes', icon: 'settings' },
  { label: 'Usuários', href: '/admin/usuarios', icon: 'users' },
  { label: 'Logs', href: '/admin/logs', icon: 'history' },
];

export const currentUser = {
  name: 'Administrador (demo)',
  email: 'admin@exemplo.com',
  role: 'Administrador',
  initials: 'AD',
};

export const dashboardStats = [
  {
    label: 'Contatos novos',
    value: '3',
    hint: 'nos últimos 7 dias',
    icon: 'inbox',
    tone: 'brand',
    href: '/admin/contatos',
  },
  {
    label: 'Matérias publicadas',
    value: '6',
    hint: '1 rascunho pendente',
    icon: 'newspaper',
    tone: 'accent',
    href: '/admin/conteudos',
  },
  {
    label: 'Serviços ativos',
    value: '6',
    hint: 'todos publicados',
    icon: 'layers',
    tone: 'neutral',
    href: '/admin/servicos',
  },
  {
    label: 'Páginas publicadas',
    value: '4',
    hint: 'Home, Quem Somos, Contato, Privacidade',
    icon: 'file-text',
    tone: 'neutral',
    href: '/admin/paginas',
  },
];

export type ContactStatus = 'novo' | 'em_atendimento' | 'respondido' | 'arquivado';

export const contactStatusLabels: Record<ContactStatus, string> = {
  novo: 'Novo',
  em_atendimento: 'Em atendimento',
  respondido: 'Respondido',
  arquivado: 'Arquivado',
};

export const contactStatusTone: Record<ContactStatus, string> = {
  novo: 'badge--brand',
  em_atendimento: 'badge--warning',
  respondido: 'badge--success',
  arquivado: 'badge--neutral',
};

export interface AdminContact {
  id: number;
  createdAt: string;
  name: string;
  company: string;
  role: string;
  email: string;
  phone: string;
  orgType: string;
  service: string;
  subject: string;
  message: string;
  origin: string;
  status: ContactStatus;
}

export const contacts: AdminContact[] = [
  {
    id: 1042,
    createdAt: '2026-08-19 14:32',
    name: 'Nome Sobrenome (demo)',
    company: 'Operadora Exemplo Ltda.',
    role: 'Gerente de auditoria',
    email: 'contato@exemplo.com',
    phone: '(61) 90000-0000',
    orgType: 'Operadora de Saúde',
    service: 'Auditoria Concorrente',
    subject: 'Auditoria concorrente para rede credenciada',
    message:
      'Mensagem fictícia de demonstração. Gostaríamos de entender o modelo de acompanhamento durante a internação e como funciona a comunicação com o prestador.',
    origin: 'Serviço: Auditoria Concorrente',
    status: 'novo',
  },
  {
    id: 1041,
    createdAt: '2026-08-19 09:05',
    name: 'Nome Sobrenome (demo)',
    company: 'Hospital Exemplo',
    role: 'Diretor técnico',
    email: 'contato2@exemplo.com',
    phone: '(61) 90000-0001',
    orgType: 'Hospital',
    service: 'Gestão Hospitalar',
    subject: 'Revisão de processos assistenciais',
    message:
      'Mensagem fictícia de demonstração. Buscamos apoio na revisão de processos assistenciais e na qualificação do registro em prontuário.',
    origin: 'Home',
    status: 'novo',
  },
  {
    id: 1040,
    createdAt: '2026-08-18 17:48',
    name: 'Nome Sobrenome (demo)',
    company: 'Autogestão Exemplo',
    role: 'Coordenação de saúde',
    email: 'contato3@exemplo.com',
    phone: '(61) 90000-0002',
    orgType: 'Autogestão',
    service: 'Auditoria de Contas Hospitalares',
    subject: 'Análise de contas de alta complexidade',
    message: 'Mensagem fictícia de demonstração para visualização do layout.',
    origin: 'Página de contato',
    status: 'novo',
  },
  {
    id: 1039,
    createdAt: '2026-08-17 11:20',
    name: 'Nome Sobrenome (demo)',
    company: 'Seguradora Exemplo',
    role: 'Gerência de sinistros',
    email: 'contato4@exemplo.com',
    phone: '(61) 90000-0003',
    orgType: 'Seguradora',
    service: 'Gestão da Jornada do Paciente',
    subject: 'Acompanhamento de beneficiários internados',
    message: 'Mensagem fictícia de demonstração para visualização do layout.',
    origin: 'Serviço: Gestão da Jornada do Paciente',
    status: 'em_atendimento',
  },
  {
    id: 1038,
    createdAt: '2026-08-15 08:12',
    name: 'Nome Sobrenome (demo)',
    company: 'Embaixada Exemplo',
    role: 'Setor consular',
    email: 'contato5@exemplo.com',
    phone: '(61) 90000-0004',
    orgType: 'Embaixada / Consulado',
    service: 'Auditoria Concorrente',
    subject: 'Acompanhamento de cidadão internado',
    message: 'Mensagem fictícia de demonstração para visualização do layout.',
    origin: 'Home',
    status: 'respondido',
  },
  {
    id: 1037,
    createdAt: '2026-08-12 16:40',
    name: 'Nome Sobrenome (demo)',
    company: 'Clínica Exemplo',
    role: 'Administração',
    email: 'contato6@exemplo.com',
    phone: '(61) 90000-0005',
    orgType: 'Clínica',
    service: 'Segurança e Qualidade Assistencial',
    subject: 'Estruturação da área de qualidade',
    message: 'Mensagem fictícia de demonstração para visualização do layout.',
    origin: 'Página de contato',
    status: 'arquivado',
  },
];

export interface AdminPage {
  id: number;
  title: string;
  slug: string;
  status: 'published' | 'draft';
  sections: number;
  updatedAt: string;
  updatedBy: string;
}

export const pages: AdminPage[] = [
  {
    id: 1,
    title: 'Home',
    slug: '/',
    status: 'published',
    sections: 12,
    updatedAt: '19/08/2026',
    updatedBy: 'Administrador (demo)',
  },
  {
    id: 2,
    title: 'Quem Somos',
    slug: '/quem-somos',
    status: 'published',
    sections: 6,
    updatedAt: '18/08/2026',
    updatedBy: 'Administrador (demo)',
  },
  {
    id: 3,
    title: 'Contato',
    slug: '/contato',
    status: 'published',
    sections: 3,
    updatedAt: '18/08/2026',
    updatedBy: 'Administrador (demo)',
  },
  {
    id: 4,
    title: 'Política de Privacidade',
    slug: '/politica-de-privacidade',
    status: 'published',
    sections: 1,
    updatedAt: '12/08/2026',
    updatedBy: 'Administrador (demo)',
  },
];

export const homeSections = [
  {
    key: 'hero',
    label: 'Hero',
    fields: 'Título, subtítulo, imagem, CTA primário e secundário',
    active: true,
  },
  {
    key: 'proposta',
    label: 'Proposta de valor',
    fields: 'Título, texto, imagem, 4 pontos',
    active: true,
  },
  {
    key: 'elo',
    label: 'Elo estratégico (diagrama)',
    fields: 'Título, texto, 4 nós',
    active: true,
  },
  {
    key: 'servicos',
    label: 'Serviços',
    fields: 'Título, texto, seleção e ordem dos serviços',
    active: true,
  },
  {
    key: 'concorrente',
    label: 'Auditoria Concorrente',
    fields: 'Título, texto, imagem, CTA',
    active: true,
  },
  {
    key: 'gestao',
    label: 'Gestão Hospitalar',
    fields: 'Título, texto, imagem, CTA',
    active: true,
  },
  {
    key: 'beneficios',
    label: 'Benefícios',
    fields: 'Itens (adicionar, editar, excluir, ordenar)',
    active: true,
  },
  { key: 'como-atuamos', label: 'Como atuamos', fields: 'Etapas do processo', active: true },
  {
    key: 'rede',
    label: 'Qualificação da rede',
    fields: 'Título, texto, itens, CTA',
    active: true,
  },
  {
    key: 'mvv',
    label: 'Missão, visão e valores',
    fields: 'Missão, visão, lista de valores',
    active: true,
  },
  { key: 'conteudos', label: 'Conteúdos recentes', fields: 'Quantidade exibida', active: true },
  {
    key: 'cta',
    label: 'CTA final + formulário',
    fields: 'Título, texto, rótulos dos botões',
    active: true,
  },
];

export interface MediaItem {
  id: number;
  name: string;
  type: string;
  size: string;
  dimensions: string;
  uploadedAt: string;
  alt: string;
  url: string;
  usedIn: string;
}

export const media: MediaItem[] = [
  {
    id: 1,
    name: 'hero-essencial.svg',
    type: 'SVG',
    size: '2,8 KB',
    dimensions: '1200×900',
    uploadedAt: '19/08/2026',
    alt: 'Composição institucional do hero',
    url: '/images/hero-essencial.svg',
    usedIn: 'Home / Hero',
  },
  {
    id: 2,
    name: 'servico-auditoria-concorrente.svg',
    type: 'SVG',
    size: '2,9 KB',
    dimensions: '1200×900',
    uploadedAt: '19/08/2026',
    alt: 'Imagem do serviço de auditoria concorrente',
    url: '/images/servico-auditoria-concorrente.svg',
    usedIn: 'Serviço / Auditoria Concorrente',
  },
  {
    id: 3,
    name: 'servico-contas-hospitalares.svg',
    type: 'SVG',
    size: '2,8 KB',
    dimensions: '1200×900',
    uploadedAt: '19/08/2026',
    alt: 'Imagem do serviço de contas hospitalares',
    url: '/images/servico-contas-hospitalares.svg',
    usedIn: 'Serviço / Contas Hospitalares',
  },
  {
    id: 4,
    name: 'servico-jornada-paciente.svg',
    type: 'SVG',
    size: '2,8 KB',
    dimensions: '1200×900',
    uploadedAt: '18/08/2026',
    alt: 'Imagem do serviço de jornada do paciente',
    url: '/images/servico-jornada-paciente.svg',
    usedIn: 'Serviço / Jornada do Paciente',
  },
  {
    id: 5,
    name: 'servico-gestao-hospitalar.svg',
    type: 'SVG',
    size: '2,8 KB',
    dimensions: '1200×900',
    uploadedAt: '18/08/2026',
    alt: 'Imagem do serviço de gestão hospitalar',
    url: '/images/servico-gestao-hospitalar.svg',
    usedIn: 'Serviço / Gestão Hospitalar',
  },
  {
    id: 6,
    name: 'servico-qualificacao-rede.svg',
    type: 'SVG',
    size: '2,8 KB',
    dimensions: '1200×900',
    uploadedAt: '18/08/2026',
    alt: 'Imagem do serviço de qualificação da rede',
    url: '/images/servico-qualificacao-rede.svg',
    usedIn: 'Serviço / Qualificação da Rede',
  },
  {
    id: 7,
    name: 'servico-seguranca-qualidade.svg',
    type: 'SVG',
    size: '2,8 KB',
    dimensions: '1200×900',
    uploadedAt: '17/08/2026',
    alt: 'Imagem do serviço de segurança e qualidade',
    url: '/images/servico-seguranca-qualidade.svg',
    usedIn: 'Serviço / Segurança e Qualidade',
  },
  {
    id: 8,
    name: 'quem-somos.svg',
    type: 'SVG',
    size: '2,9 KB',
    dimensions: '1200×900',
    uploadedAt: '17/08/2026',
    alt: 'Imagem institucional da página Quem Somos',
    url: '/images/quem-somos.svg',
    usedIn: 'Página / Quem Somos',
  },
  {
    id: 9,
    name: 'proposta-de-valor.svg',
    type: 'SVG',
    size: '2,8 KB',
    dimensions: '1200×900',
    uploadedAt: '16/08/2026',
    alt: 'Imagem da seção proposta de valor',
    url: '/images/proposta-de-valor.svg',
    usedIn: 'Home / Proposta de valor',
  },
  {
    id: 10,
    name: 'contato.svg',
    type: 'SVG',
    size: '2,8 KB',
    dimensions: '1200×900',
    uploadedAt: '16/08/2026',
    alt: 'Imagem da página de contato',
    url: '/images/contato.svg',
    usedIn: 'Página / Contato',
  },
  {
    id: 11,
    name: 'og-default.svg',
    type: 'SVG',
    size: '1,7 KB',
    dimensions: '1200×630',
    uploadedAt: '15/08/2026',
    alt: 'Imagem padrão de compartilhamento',
    url: '/images/og-default.svg',
    usedIn: 'SEO / Open Graph padrão',
  },
  {
    id: 12,
    name: 'post-seguranca-paciente.svg',
    type: 'SVG',
    size: '2,8 KB',
    dimensions: '1200×900',
    uploadedAt: '15/08/2026',
    alt: 'Capa da matéria sobre indicadores de segurança',
    url: '/images/post-seguranca-paciente.svg',
    usedIn: 'Matéria / Indicadores de segurança',
  },
];

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: 'Administrador' | 'Editor';
  status: 'ativo' | 'inativo';
  lastLogin: string;
}

export const users: AdminUser[] = [
  {
    id: 1,
    name: 'Administrador (demo)',
    email: 'admin@exemplo.com',
    role: 'Administrador',
    status: 'ativo',
    lastLogin: '20/08/2026 08:41',
  },
  {
    id: 2,
    name: 'Editor (demo)',
    email: 'editor@exemplo.com',
    role: 'Editor',
    status: 'ativo',
    lastLogin: '19/08/2026 17:02',
  },
  {
    id: 3,
    name: 'Editor inativo (demo)',
    email: 'editor2@exemplo.com',
    role: 'Editor',
    status: 'inativo',
    lastLogin: '02/07/2026 10:15',
  },
];

export interface AuditLog {
  id: number;
  at: string;
  user: string;
  action: string;
  target: string;
  ip: string;
  tone: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
}

export const logs: AuditLog[] = [
  {
    id: 9001,
    at: '20/08/2026 08:44',
    user: 'Administrador (demo)',
    action: 'Login realizado',
    target: 'Sessão administrativa',
    ip: '000.000.000.000',
    tone: 'neutral',
  },
  {
    id: 9000,
    at: '19/08/2026 18:20',
    user: 'Editor (demo)',
    action: 'Matéria publicada',
    target: 'Auditoria concorrente: o que é e por que ela muda o desfecho',
    ip: '000.000.000.000',
    tone: 'success',
  },
  {
    id: 8999,
    at: '19/08/2026 17:55',
    user: 'Editor (demo)',
    action: 'Matéria atualizada',
    target: 'Glosa técnica e glosa administrativa',
    ip: '000.000.000.000',
    tone: 'brand',
  },
  {
    id: 8998,
    at: '19/08/2026 15:31',
    user: 'Administrador (demo)',
    action: 'Configuração alterada',
    target: 'Configurações > WhatsApp (mensagem padrão)',
    ip: '000.000.000.000',
    tone: 'warning',
  },
  {
    id: 8997,
    at: '18/08/2026 11:10',
    user: 'Administrador (demo)',
    action: 'Serviço despublicado',
    target: 'Serviço de demonstração',
    ip: '000.000.000.000',
    tone: 'danger',
  },
  {
    id: 8996,
    at: '18/08/2026 09:02',
    user: 'Administrador (demo)',
    action: 'Mídia enviada',
    target: 'hero-essencial.svg',
    ip: '000.000.000.000',
    tone: 'neutral',
  },
];

export interface Redirect {
  id: number;
  from: string;
  to: string;
  code: 301 | 302;
  createdAt: string;
  hits: number;
}

export const redirects: Redirect[] = [
  {
    id: 1,
    from: '/servicos/auditoria',
    to: '/servicos/auditoria-concorrente',
    code: 301,
    createdAt: '12/08/2026',
    hits: 0,
  },
  {
    id: 2,
    from: '/blog',
    to: '/conteudos',
    code: 301,
    createdAt: '12/08/2026',
    hits: 0,
  },
  {
    id: 3,
    from: '/contato-comercial',
    to: '/contato',
    code: 301,
    createdAt: '10/08/2026',
    hits: 0,
  },
];

export const seoEntries = [
  {
    page: 'Home',
    path: '/',
    title: 'Essencial Saúde Auditoria | Gestão e Auditoria em Saúde em Brasília - DF',
    description:
      'Auditoria concorrente, auditoria de contas hospitalares e gestão hospitalar com foco na segurança do paciente.',
    indexable: true,
  },
  {
    page: 'Quem Somos',
    path: '/quem-somos',
    title: 'Quem Somos | Essencial Saúde Auditoria',
    description:
      'Empresa técnica de gestão e auditoria em saúde em Brasília - DF, elo entre fontes pagadoras, prestadores e beneficiários.',
    indexable: true,
  },
  {
    page: 'Serviços',
    path: '/servicos',
    title: 'Serviços | Essencial Saúde Auditoria',
    description: 'Seis frentes de atuação em gestão e auditoria em saúde.',
    indexable: true,
  },
  {
    page: 'Auditoria Concorrente',
    path: '/servicos/auditoria-concorrente',
    title: 'Auditoria Concorrente Hospitalar | Essencial Saúde Auditoria',
    description:
      'Acompanhamento técnico durante a internação, com avaliação de pertinência e permanência.',
    indexable: true,
  },
  {
    page: 'Conteúdos',
    path: '/conteudos',
    title: 'Conteúdos | Essencial Saúde Auditoria',
    description: 'Artigos técnicos sobre auditoria em saúde e gestão hospitalar.',
    indexable: true,
  },
  {
    page: 'Contato',
    path: '/contato',
    title: 'Contato | Essencial Saúde Auditoria',
    description: 'Fale com a equipe técnica da Essencial Saúde Auditoria.',
    indexable: true,
  },
  {
    page: 'Política de Privacidade',
    path: '/politica-de-privacidade',
    title: 'Política de Privacidade | Essencial Saúde Auditoria',
    description: 'Como tratamos dados pessoais coletados neste site.',
    indexable: true,
  },
];

export const recentUploads = media.slice(0, 4);
