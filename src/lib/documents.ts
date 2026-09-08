/**
 * Modelo genérico de "documento de página" — a base comum que qualquer
 * página migrada do Astro estático para o banco usa: metadados (SEO/status),
 * seções com seu próprio `SectionStyle`, sobrescrita de página (`PageStyle`),
 * elementos livres (`Overlay`) e posições existentes (`layouts`). Todos esses
 * tipos vêm de `pages.ts` — o mesmo usado pela Home — para não duplicar.
 *
 * Cada página migrada declara seu PRÓPRIO conteúdo tipado (como `HomeContent`
 * já fazia) em vez de um array de blocos genérico interpretado em runtime:
 * mais simples, mesmo padrão já testado, e cada página pode continuar usando
 * componentes visuais específicos (ex.: EloDiagram) em vez de virar um
 * canvas genérico.
 *
 * Primeira página migrada: Quem Somos.
 */
import {
  about as defaultAbout,
  elo as defaultElo,
  howWeWork as defaultHowWeWork,
  missionVisionValues as defaultMissionVisionValues,
  clientSegments as defaultClientSegments,
} from '../data/institutional';
import type { D1Database } from './cf-types';
import {
  normalizeOverlays,
  normalizePageStyle,
  normalizeLayouts,
  EMPTY_PAGE_STYLE,
} from './pages';
import type { SectionStyle, PageStyle, LayoutPair, Overlay } from './pages';

const EMPTY_STYLE: SectionStyle = {
  bg: '',
  text: '',
  image: '',
  overlay: '',
  minHeight: '',
  paddingY: '',
};

export const QUEM_SOMOS_SECTION_KEYS = [
  'about',
  'elo',
  'howWeWork',
  'mvv',
  'segments',
] as const;
export type QuemSomosSectionKey = (typeof QUEM_SOMOS_SECTION_KEYS)[number];

export interface QuemSomosContent {
  about: typeof defaultAbout;
  elo: typeof defaultElo;
  howWeWork: typeof defaultHowWeWork;
  missionVisionValues: typeof defaultMissionVisionValues;
  clientSegments: typeof defaultClientSegments;
  pageStyle: PageStyle;
  sectionStyles: Record<QuemSomosSectionKey, SectionStyle>;
  sectionOrder: QuemSomosSectionKey[];
  hiddenSections: QuemSomosSectionKey[];
  layouts: Record<string, LayoutPair>;
  overlays: Overlay[];
}

const DEFAULT_QUEM_SOMOS: QuemSomosContent = {
  about: defaultAbout,
  elo: defaultElo,
  howWeWork: defaultHowWeWork,
  missionVisionValues: defaultMissionVisionValues,
  clientSegments: defaultClientSegments,
  pageStyle: { ...EMPTY_PAGE_STYLE },
  sectionStyles: {
    about: { ...EMPTY_STYLE },
    elo: { ...EMPTY_STYLE },
    howWeWork: { ...EMPTY_STYLE },
    mvv: { ...EMPTY_STYLE },
    segments: { ...EMPTY_STYLE },
  },
  sectionOrder: [...QUEM_SOMOS_SECTION_KEYS],
  hiddenSections: [],
  layouts: {},
  overlays: [],
};

function normalizeSectionKeys(
  value: unknown,
  fallback: QuemSomosSectionKey[]
): QuemSomosSectionKey[] {
  if (!Array.isArray(value)) return fallback;
  const seen = new Set<QuemSomosSectionKey>();
  for (const item of value) {
    if (
      typeof item === 'string' &&
      (QUEM_SOMOS_SECTION_KEYS as readonly string[]).includes(item)
    ) {
      seen.add(item as QuemSomosSectionKey);
    }
  }
  for (const key of QUEM_SOMOS_SECTION_KEYS) {
    if (!seen.has(key) && fallback.includes(key)) seen.add(key);
  }
  return [...seen];
}

interface PageRow {
  id: number;
  sections_json: string;
  updated_at: string;
}

export const QUEM_SOMOS_SLUG = '/quem-somos';

/**
 * Igual em espírito a `getHomeContent`: linha ausente cai no padrão (o
 * conteúdo estático que já existe hoje em `data/institutional.ts`) — a
 * página continua idêntica até alguém editar pelo painel.
 */
export async function getQuemSomosContent(
  db: D1Database
): Promise<QuemSomosContent & { updatedAt: string }> {
  try {
    const row = await db
      .prepare('SELECT id, sections_json, updated_at FROM pages WHERE slug = ?1')
      .bind(QUEM_SOMOS_SLUG)
      .first<PageRow>();
    if (!row) return { ...DEFAULT_QUEM_SOMOS, updatedAt: '' };

    const stored = JSON.parse(row.sections_json) as Partial<QuemSomosContent>;
    return {
      about: { ...DEFAULT_QUEM_SOMOS.about, ...stored.about },
      elo: { ...DEFAULT_QUEM_SOMOS.elo, ...stored.elo },
      howWeWork: { ...DEFAULT_QUEM_SOMOS.howWeWork, ...stored.howWeWork },
      missionVisionValues: {
        ...DEFAULT_QUEM_SOMOS.missionVisionValues,
        ...stored.missionVisionValues,
      },
      clientSegments: { ...DEFAULT_QUEM_SOMOS.clientSegments, ...stored.clientSegments },
      pageStyle: normalizePageStyle(stored.pageStyle),
      sectionStyles: {
        ...DEFAULT_QUEM_SOMOS.sectionStyles,
        ...Object.fromEntries(
          Object.entries(stored.sectionStyles ?? {}).map(([key, value]) => [
            key,
            { ...EMPTY_STYLE, ...value },
          ])
        ),
      } as Record<QuemSomosSectionKey, SectionStyle>,
      sectionOrder: normalizeSectionKeys(stored.sectionOrder, [...QUEM_SOMOS_SECTION_KEYS]),
      hiddenSections: normalizeSectionKeys(stored.hiddenSections, []),
      layouts: normalizeLayouts(stored.layouts),
      overlays: normalizeOverlays(stored.overlays, QUEM_SOMOS_SECTION_KEYS),
      updatedAt: row.updated_at,
    };
  } catch {
    return { ...DEFAULT_QUEM_SOMOS, updatedAt: '' };
  }
}

/**
 * `INSERT ... ON CONFLICT` em vez de um `UPDATE` simples: diferente da Home
 * (cuja linha já existe desde o seed inicial), a linha da Quem Somos só é
 * criada na primeira gravação — antes disso a página só lê o padrão estático,
 * sem precisar de uma migração/seed separada para "existir" no banco.
 */
export async function updateQuemSomosContent(
  db: D1Database,
  content: QuemSomosContent,
  userId?: number
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO pages (slug, title, status, sections_json, updated_by, updated_at)
       VALUES (?1, 'Quem Somos', 'published', ?2, ?3, datetime('now'))
       ON CONFLICT(slug) DO UPDATE SET
         sections_json = excluded.sections_json,
         updated_by = excluded.updated_by,
         updated_at = datetime('now')`
    )
    .bind(QUEM_SOMOS_SLUG, JSON.stringify(content), userId ?? null)
    .run();
}

// ============================================================ Contato ====

export const CONTATO_SECTION_KEYS = ['channels', 'form'] as const;
export type ContatoSectionKey = (typeof CONTATO_SECTION_KEYS)[number];

/**
 * Sobrescritas sobre as configurações globais da empresa (`settings.company`
 * / `settings.whatsapp`) — cada campo vazio herda o valor global, um valor
 * preenchido vale só nesta página. Igual em espírito a `PageStyle`, mas para
 * conteúdo em vez de cor.
 *
 * Decisão deliberada: `phone`/`whatsapp` guardam os DÍGITOS completos (com
 * DDI, ex. "5561982444083") — nunca um texto de exibição solto — porque o
 * mesmo valor também vira o link (tel:/wa.me). Um campo de exibição
 * independente do link poderia mostrar um número e abrir outro ao clicar;
 * aqui os dois sempre vêm da mesma fonte. `email`/`hours`/`address` não têm
 * esse risco (o texto mostrado já É o destino do link, quando há um).
 */
export interface ContatoOverrides {
  phone: string;
  whatsapp: string;
  email: string;
  hours: string;
  address: string;
  /**
   * Mensagem pré-preenchida dos links de WhatsApp DESTA página — nunca a
   * mensagem que o visitante digita no formulário de contato (isso não é
   * salvo, é só o link `wa.me?text=...`). Vazio = herda
   * `settings.whatsapp.defaultMessage`.
   */
  whatsappMessage: string;
}

export const EMPTY_CONTATO_OVERRIDES: ContatoOverrides = {
  phone: '',
  whatsapp: '',
  email: '',
  hours: '',
  address: '',
  whatsappMessage: '',
};

// Exige o DDI 55: sem ele, o link tel:/wa.me (que sempre prefixa "+") sairia
// com o código de país errado (ex.: "+61..." é a Austrália, não o DDD 61).
const PHONE_DIGITS = /^55\d{10,11}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const WHATSAPP_MESSAGE_MAX = 500;

export function normalizeContatoOverrides(value: unknown): ContatoOverrides {
  const raw = (value ?? {}) as Record<string, unknown>;
  const digits = (v: unknown) => {
    const d = typeof v === 'string' ? v.replace(/\D/g, '') : '';
    return PHONE_DIGITS.test(d) ? d : '';
  };
  return {
    phone: digits(raw.phone),
    whatsapp: digits(raw.whatsapp),
    email:
      typeof raw.email === 'string' && EMAIL_RE.test(raw.email) ? raw.email.slice(0, 200) : '',
    hours: typeof raw.hours === 'string' ? raw.hours.slice(0, 200) : '',
    address: typeof raw.address === 'string' ? raw.address.slice(0, 500) : '',
    // Só texto puro: tira espaço do início/fim (nunca do meio — quebras de
    // linha internas fazem parte da mensagem) e corta num tamanho razoável.
    // Nunca passa por HTML — vai direto para encodeURIComponent no link, e
    // como texto simples em qualquer pré-visualização.
    whatsappMessage:
      typeof raw.whatsappMessage === 'string'
        ? raw.whatsappMessage.trim().slice(0, WHATSAPP_MESSAGE_MAX)
        : '',
  };
}

/**
 * Formata dígitos brasileiros (com ou sem DDI 55) como "(DDD) NNNNN-NNNN" —
 * mesma regra de exibição que `data/site.ts` já usa para `company.phoneDisplay`,
 * aplicada aqui à sobrescrita para os dois nunca poderem divergir.
 */
export function formatBrPhoneDisplay(rawDigits: string): string {
  const digits = rawDigits.replace(/\D/g, '');
  const local = digits.length > 11 && digits.startsWith('55') ? digits.slice(2) : digits;
  if (local.length < 10) return rawDigits;
  const ddd = local.slice(0, 2);
  const rest = local.slice(2);
  return rest.length === 9
    ? `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`
    : `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
}

export interface ContatoContent {
  hero: { eyebrow: string; title: string; lead: string };
  formTitle: string;
  formDescription: string;
  asideCtaTitle: string;
  asideCtaText: string;
  privacyNote: string;
  contactOverrides: ContatoOverrides;
  pageStyle: PageStyle;
  sectionStyles: Record<ContatoSectionKey, SectionStyle>;
  sectionOrder: ContatoSectionKey[];
  hiddenSections: ContatoSectionKey[];
  layouts: Record<string, LayoutPair>;
  overlays: Overlay[];
}

const DEFAULT_CONTATO: ContatoContent = {
  hero: {
    eyebrow: 'Contato',
    title: 'Fale com a Essencial Saúde',
    lead: 'Conte o cenário da sua organização. Nossa equipe técnica retorna com os próximos passos para uma conversa objetiva.',
  },
  formTitle: 'Envie sua mensagem',
  formDescription:
    'Todos os campos marcados são obrigatórios. Retornamos em horário comercial.',
  asideCtaTitle: 'Prefere falar agora?',
  asideCtaText: 'Fale com nossa equipe pelo WhatsApp e receba retorno direto.',
  privacyNote:
    'Os dados enviados serão utilizados apenas para responder ao contato, conforme a Política de Privacidade e a LGPD. Não solicitamos e não devem ser enviados dados clínicos de pacientes por este canal.',
  contactOverrides: { ...EMPTY_CONTATO_OVERRIDES },
  pageStyle: { ...EMPTY_PAGE_STYLE },
  sectionStyles: {
    channels: { ...EMPTY_STYLE },
    form: { ...EMPTY_STYLE },
  },
  sectionOrder: [...CONTATO_SECTION_KEYS],
  hiddenSections: [],
  layouts: {},
  overlays: [],
};

function normalizeContatoSectionKeys(
  value: unknown,
  fallback: ContatoSectionKey[]
): ContatoSectionKey[] {
  if (!Array.isArray(value)) return fallback;
  const seen = new Set<ContatoSectionKey>();
  for (const item of value) {
    if (
      typeof item === 'string' &&
      (CONTATO_SECTION_KEYS as readonly string[]).includes(item)
    ) {
      seen.add(item as ContatoSectionKey);
    }
  }
  for (const key of CONTATO_SECTION_KEYS) {
    if (!seen.has(key) && fallback.includes(key)) seen.add(key);
  }
  return [...seen];
}

export const CONTATO_SLUG = '/contato';

export async function getContatoContent(
  db: D1Database
): Promise<ContatoContent & { updatedAt: string }> {
  try {
    const row = await db
      .prepare('SELECT id, sections_json, updated_at FROM pages WHERE slug = ?1')
      .bind(CONTATO_SLUG)
      .first<PageRow>();
    if (!row) return { ...DEFAULT_CONTATO, updatedAt: '' };

    const stored = JSON.parse(row.sections_json) as Partial<ContatoContent>;
    return {
      hero: { ...DEFAULT_CONTATO.hero, ...stored.hero },
      formTitle:
        typeof stored.formTitle === 'string' ? stored.formTitle : DEFAULT_CONTATO.formTitle,
      formDescription:
        typeof stored.formDescription === 'string'
          ? stored.formDescription
          : DEFAULT_CONTATO.formDescription,
      asideCtaTitle:
        typeof stored.asideCtaTitle === 'string'
          ? stored.asideCtaTitle
          : DEFAULT_CONTATO.asideCtaTitle,
      asideCtaText:
        typeof stored.asideCtaText === 'string'
          ? stored.asideCtaText
          : DEFAULT_CONTATO.asideCtaText,
      privacyNote:
        typeof stored.privacyNote === 'string'
          ? stored.privacyNote
          : DEFAULT_CONTATO.privacyNote,
      contactOverrides: normalizeContatoOverrides(stored.contactOverrides),
      pageStyle: normalizePageStyle(stored.pageStyle),
      sectionStyles: {
        ...DEFAULT_CONTATO.sectionStyles,
        ...Object.fromEntries(
          Object.entries(stored.sectionStyles ?? {}).map(([key, value]) => [
            key,
            { ...EMPTY_STYLE, ...value },
          ])
        ),
      } as Record<ContatoSectionKey, SectionStyle>,
      sectionOrder: normalizeContatoSectionKeys(stored.sectionOrder, [...CONTATO_SECTION_KEYS]),
      hiddenSections: normalizeContatoSectionKeys(stored.hiddenSections, []),
      layouts: normalizeLayouts(stored.layouts),
      overlays: normalizeOverlays(stored.overlays, CONTATO_SECTION_KEYS),
      updatedAt: row.updated_at,
    };
  } catch {
    return { ...DEFAULT_CONTATO, updatedAt: '' };
  }
}

export async function updateContatoContent(
  db: D1Database,
  content: ContatoContent,
  userId?: number
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO pages (slug, title, status, sections_json, updated_by, updated_at)
       VALUES (?1, 'Contato', 'published', ?2, ?3, datetime('now'))
       ON CONFLICT(slug) DO UPDATE SET
         sections_json = excluded.sections_json,
         updated_by = excluded.updated_by,
         updated_at = datetime('now')`
    )
    .bind(CONTATO_SLUG, JSON.stringify(content), userId ?? null)
    .run();
}

// ============================================================ Serviços ====

/**
 * "hero" e "cta" alimentam o PageHero/CtaBand fixos (antes/depois, como em
 * Quem Somos — ver comentário em src/pages/quem-somos.astro) e não entram
 * na ordem de seções. As 3 seções abaixo são as que o Editor Visual pode
 * reordenar/ocultar/estilizar. "list" é a grade de cartões vinda da tabela
 * `services` (Astro.locals.services) — não é conteúdo deste documento, mas
 * ocupa um lugar na ordem e pode ganhar fundo/cor próprios, igual às seções
 * fixas da Home (ver HOME_EDITABLE_SLOTS): a lista em si continua gerenciada
 * pelo CRUD em /admin/servicos, não pelo Editor Visual.
 */
export const SERVICOS_SECTION_KEYS = ['list', 'howWeWork', 'segments'] as const;
export type ServicosSectionKey = (typeof SERVICOS_SECTION_KEYS)[number];

export interface ServicosContent {
  hero: { eyebrow: string; title: string; lead: string };
  howWeWork: typeof defaultHowWeWork;
  clientSegments: typeof defaultClientSegments;
  cta: { eyebrow: string; title: string; text: string };
  pageStyle: PageStyle;
  sectionStyles: Record<ServicosSectionKey, SectionStyle>;
  sectionOrder: ServicosSectionKey[];
  hiddenSections: ServicosSectionKey[];
  layouts: Record<string, LayoutPair>;
  overlays: Overlay[];
}

const DEFAULT_SERVICOS: ServicosContent = {
  hero: {
    eyebrow: 'Serviços',
    title: 'Soluções técnicas em gestão e auditoria em saúde',
    lead: 'Seis frentes de atuação que compartilham a mesma base: avaliação com critério, evidência documental e acompanhamento até o desfecho.',
  },
  howWeWork: defaultHowWeWork,
  clientSegments: defaultClientSegments,
  cta: {
    eyebrow: 'Fale com a Essencial',
    title: 'Qual desses cenários é o seu?',
    text: 'Apresentamos o escopo, o método e os indicadores de acompanhamento de acordo com o serviço de interesse.',
  },
  pageStyle: { ...EMPTY_PAGE_STYLE },
  sectionStyles: {
    list: { ...EMPTY_STYLE },
    howWeWork: { ...EMPTY_STYLE },
    segments: { ...EMPTY_STYLE },
  },
  sectionOrder: [...SERVICOS_SECTION_KEYS],
  hiddenSections: [],
  layouts: {},
  overlays: [],
};

function normalizeServicosSectionKeys(
  value: unknown,
  fallback: ServicosSectionKey[]
): ServicosSectionKey[] {
  if (!Array.isArray(value)) return fallback;
  const seen = new Set<ServicosSectionKey>();
  for (const item of value) {
    if (
      typeof item === 'string' &&
      (SERVICOS_SECTION_KEYS as readonly string[]).includes(item)
    ) {
      seen.add(item as ServicosSectionKey);
    }
  }
  for (const key of SERVICOS_SECTION_KEYS) {
    if (!seen.has(key) && fallback.includes(key)) seen.add(key);
  }
  return [...seen];
}

export const SERVICOS_SLUG = '/servicos';

export async function getServicosContent(
  db: D1Database
): Promise<ServicosContent & { updatedAt: string }> {
  try {
    const row = await db
      .prepare('SELECT id, sections_json, updated_at FROM pages WHERE slug = ?1')
      .bind(SERVICOS_SLUG)
      .first<PageRow>();
    if (!row) return { ...DEFAULT_SERVICOS, updatedAt: '' };

    const stored = JSON.parse(row.sections_json) as Partial<ServicosContent>;
    return {
      hero: { ...DEFAULT_SERVICOS.hero, ...stored.hero },
      howWeWork: { ...DEFAULT_SERVICOS.howWeWork, ...stored.howWeWork },
      clientSegments: { ...DEFAULT_SERVICOS.clientSegments, ...stored.clientSegments },
      cta: { ...DEFAULT_SERVICOS.cta, ...stored.cta },
      pageStyle: normalizePageStyle(stored.pageStyle),
      sectionStyles: {
        ...DEFAULT_SERVICOS.sectionStyles,
        ...Object.fromEntries(
          Object.entries(stored.sectionStyles ?? {}).map(([key, value]) => [
            key,
            { ...EMPTY_STYLE, ...value },
          ])
        ),
      } as Record<ServicosSectionKey, SectionStyle>,
      sectionOrder: normalizeServicosSectionKeys(stored.sectionOrder, [
        ...SERVICOS_SECTION_KEYS,
      ]),
      hiddenSections: normalizeServicosSectionKeys(stored.hiddenSections, []),
      layouts: normalizeLayouts(stored.layouts),
      overlays: normalizeOverlays(stored.overlays, SERVICOS_SECTION_KEYS),
      updatedAt: row.updated_at,
    };
  } catch {
    return { ...DEFAULT_SERVICOS, updatedAt: '' };
  }
}

export async function updateServicosContent(
  db: D1Database,
  content: ServicosContent,
  userId?: number
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO pages (slug, title, status, sections_json, updated_by, updated_at)
       VALUES (?1, 'Serviços', 'published', ?2, ?3, datetime('now'))
       ON CONFLICT(slug) DO UPDATE SET
         sections_json = excluded.sections_json,
         updated_by = excluded.updated_by,
         updated_at = datetime('now')`
    )
    .bind(SERVICOS_SLUG, JSON.stringify(content), userId ?? null)
    .run();
}

// ================================================ Política de Privacidade ====

/**
 * "nota" é o aviso de "versão preliminar" no topo; "conteudo" é o corpo
 * jurídico em si (a lista de seções numeradas). Só 2 seções — reordenar
 * entre elas não é o caso de uso principal, mas a Aparência (fundo/altura/
 * espaçamento) segue o mesmo padrão de toda página migrada.
 */
export const POLITICA_SECTION_KEYS = ['nota', 'conteudo'] as const;
export type PoliticaSectionKey = (typeof POLITICA_SECTION_KEYS)[number];

/**
 * Uma seção numerada do documento jurídico (ex.: "2. Quais dados
 * coletamos"). `body` é texto simples, nunca HTML: parágrafos separados por
 * uma linha em branco; uma sequência de linhas começando com "- " vira uma
 * lista (ver renderização em src/pages/politica-de-privacidade.astro) — o
 * mesmo texto puro que já ia direto pelo escape automático do Astro, só
 * organizado por convenção, nunca por `innerHTML`/HTML confiável do banco.
 */
export interface PoliticaSection {
  title: string;
  body: string;
}

export interface PoliticaContent {
  hero: { eyebrow: string; title: string; lead: string };
  updatedAt: string;
  noteText: string;
  sections: PoliticaSection[];
  pageStyle: PageStyle;
  sectionStyles: Record<PoliticaSectionKey, SectionStyle>;
  sectionOrder: PoliticaSectionKey[];
  hiddenSections: PoliticaSectionKey[];
  layouts: Record<string, LayoutPair>;
  overlays: Overlay[];
}

const DEFAULT_POLITICA_SECTIONS: PoliticaSection[] = [
  {
    title: '1. Quem é o controlador dos dados',
    body: 'O controlador dos dados pessoais tratados neste site é a Essencial Saúde Auditoria. Contato para assuntos de privacidade disponível na página de Contato.',
  },
  {
    title: '2. Quais dados coletamos',
    body:
      'Coletamos apenas os dados necessários para responder ao seu contato:\n\n' +
      '- Dados fornecidos por você nos formulários do site: nome, empresa ou organização, cargo, e-mail, telefone/WhatsApp, tipo de organização, serviço de interesse, assunto e mensagem.\n' +
      '- Dados técnicos de navegação gerados automaticamente, como endereço IP, data e hora do acesso, páginas visitadas e informações do dispositivo/navegador.\n' +
      '- Registro da origem do contato, isto é, a página do site a partir da qual a mensagem foi enviada.',
  },
  {
    title: '3. Dados que não devem ser enviados',
    body: 'Este site é institucional. Não solicitamos dados clínicos, prontuários, diagnósticos ou qualquer informação de saúde de pacientes por meio dos formulários ou dos canais de contato aqui divulgados.',
  },
  {
    title: '4. Para que utilizamos seus dados',
    body:
      '- Responder à solicitação enviada e dar seguimento ao contato comercial\n' +
      '- Elaborar e apresentar propostas de serviços\n' +
      '- Manter o histórico do relacionamento com sua organização\n' +
      '- Garantir a segurança do site e prevenir uso abusivo dos formulários\n' +
      '- Cumprir obrigações legais e regulatórias aplicáveis',
  },
  {
    title: '5. Base legal do tratamento',
    body:
      'O tratamento é realizado com fundamento nas seguintes hipóteses da LGPD:\n\n' +
      '- Consentimento (art. 7º, I), manifestado no envio do formulário\n' +
      '- Procedimentos preliminares relacionados a contrato (art. 7º, V)\n' +
      '- Legítimo interesse (art. 7º, IX), para segurança da informação\n' +
      '- Cumprimento de obrigação legal (art. 7º, II), quando aplicável',
  },
  {
    title: '6. Compartilhamento',
    body: 'Não vendemos e não cedemos dados pessoais. O compartilhamento ocorre apenas quando necessário, com prestadores de infraestrutura tecnológica e autoridades públicas, mediante requisição legal.',
  },
  {
    title: '7. Cookies e tecnologias semelhantes',
    body: 'Utilizamos apenas o estritamente necessário ao funcionamento e à segurança do site.',
  },
  {
    title: '8. Por quanto tempo mantemos os dados',
    body: 'Os dados de contato são mantidos pelo tempo necessário ao atendimento da solicitação e à manutenção do relacionamento comercial, ou pelo prazo exigido por obrigação legal.',
  },
  {
    title: '9. Segurança da informação',
    body: 'Adotamos medidas técnicas e administrativas para proteger os dados contra acesso não autorizado, perda, alteração e divulgação indevida.',
  },
  {
    title: '10. Seus direitos como titular',
    body:
      'Nos termos do art. 18 da LGPD, você pode solicitar:\n\n' +
      '- Confirmação da existência de tratamento e acesso aos dados\n' +
      '- Correção de dados incompletos, inexatos ou desatualizados\n' +
      '- Anonimização, bloqueio ou eliminação de dados desnecessários\n' +
      '- Portabilidade, nos termos da regulamentação aplicável\n' +
      '- Eliminação dos dados tratados com base no consentimento\n' +
      '- Revogação do consentimento a qualquer momento',
  },
  {
    title: '11. Links para sites de terceiros',
    body: 'Este site pode conter links para serviços de terceiros. O tratamento de dados realizado nesses serviços segue as políticas de privacidade de seus respectivos responsáveis.',
  },
  {
    title: '12. Alterações desta política',
    body: 'Esta política pode ser atualizada para refletir mudanças legais, técnicas ou de processo. A data da última atualização é sempre indicada no início do documento.',
  },
  {
    title: '13. Contato',
    body: 'Dúvidas sobre esta política ou sobre o tratamento dos seus dados podem ser enviadas pelos canais informados na página de Contato.',
  },
];

const DEFAULT_POLITICA: PoliticaContent = {
  hero: {
    eyebrow: 'Documento legal',
    title: 'Política de Privacidade',
    lead: 'Como a Essencial Saúde Auditoria trata os dados pessoais coletados neste site, em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018).',
  },
  updatedAt: '20 de agosto de 2026',
  noteText:
    'Documento em versão preliminar (Etapa 1), redigido como base técnica. Antes da publicação em produção deve ser revisado pelo responsável jurídico.',
  sections: DEFAULT_POLITICA_SECTIONS,
  pageStyle: { ...EMPTY_PAGE_STYLE },
  sectionStyles: {
    nota: { ...EMPTY_STYLE },
    conteudo: { ...EMPTY_STYLE },
  },
  sectionOrder: [...POLITICA_SECTION_KEYS],
  hiddenSections: [],
  layouts: {},
  overlays: [],
};

function normalizePoliticaSectionKeys(
  value: unknown,
  fallback: PoliticaSectionKey[]
): PoliticaSectionKey[] {
  if (!Array.isArray(value)) return fallback;
  const seen = new Set<PoliticaSectionKey>();
  for (const item of value) {
    if (
      typeof item === 'string' &&
      (POLITICA_SECTION_KEYS as readonly string[]).includes(item)
    ) {
      seen.add(item as PoliticaSectionKey);
    }
  }
  for (const key of POLITICA_SECTION_KEYS) {
    if (!seen.has(key) && fallback.includes(key)) seen.add(key);
  }
  return [...seen];
}

/** Nunca confia no formato: uma seção sem título/corpo em texto cai fora, em vez de propagar algo quebrado. */
function normalizePoliticaSections(value: unknown): PoliticaSection[] {
  if (!Array.isArray(value)) return DEFAULT_POLITICA_SECTIONS;
  const out = value
    .slice(0, 60)
    .map((item) => {
      const raw = (item ?? {}) as Record<string, unknown>;
      if (typeof raw.title !== 'string' || typeof raw.body !== 'string') return null;
      return { title: raw.title.slice(0, 200), body: raw.body.slice(0, 8000) };
    })
    .filter((item): item is PoliticaSection => item !== null);
  return out.length > 0 ? out : DEFAULT_POLITICA_SECTIONS;
}

export const POLITICA_SLUG = '/politica-de-privacidade';

export async function getPoliticaContent(
  db: D1Database
): Promise<PoliticaContent & { updatedAt: string }> {
  try {
    const row = await db
      .prepare('SELECT id, sections_json, updated_at FROM pages WHERE slug = ?1')
      .bind(POLITICA_SLUG)
      .first<PageRow>();
    if (!row) return { ...DEFAULT_POLITICA, updatedAt: DEFAULT_POLITICA.updatedAt };

    const stored = JSON.parse(row.sections_json) as Partial<PoliticaContent>;
    return {
      hero: { ...DEFAULT_POLITICA.hero, ...stored.hero },
      updatedAt:
        typeof stored.updatedAt === 'string' ? stored.updatedAt : DEFAULT_POLITICA.updatedAt,
      noteText:
        typeof stored.noteText === 'string' ? stored.noteText : DEFAULT_POLITICA.noteText,
      sections: normalizePoliticaSections(stored.sections),
      pageStyle: normalizePageStyle(stored.pageStyle),
      sectionStyles: {
        ...DEFAULT_POLITICA.sectionStyles,
        ...Object.fromEntries(
          Object.entries(stored.sectionStyles ?? {}).map(([key, value]) => [
            key,
            { ...EMPTY_STYLE, ...value },
          ])
        ),
      } as Record<PoliticaSectionKey, SectionStyle>,
      sectionOrder: normalizePoliticaSectionKeys(stored.sectionOrder, [
        ...POLITICA_SECTION_KEYS,
      ]),
      hiddenSections: normalizePoliticaSectionKeys(stored.hiddenSections, []),
      layouts: normalizeLayouts(stored.layouts),
      overlays: normalizeOverlays(stored.overlays, POLITICA_SECTION_KEYS),
    };
  } catch {
    return { ...DEFAULT_POLITICA, updatedAt: DEFAULT_POLITICA.updatedAt };
  }
}

export async function updatePoliticaContent(
  db: D1Database,
  content: PoliticaContent,
  userId?: number
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO pages (slug, title, status, sections_json, updated_by, updated_at)
       VALUES (?1, 'Política de Privacidade', 'published', ?2, ?3, datetime('now'))
       ON CONFLICT(slug) DO UPDATE SET
         sections_json = excluded.sections_json,
         updated_by = excluded.updated_by,
         updated_at = datetime('now')`
    )
    .bind(POLITICA_SLUG, JSON.stringify(content), userId ?? null)
    .run();
}
