/**
 * Repositório da tabela `services` (Cloudflare D1).
 *
 * Campos "simples" ficam em colunas próprias; conteúdo estruturado (intro,
 * destaques, blocos, entregáveis, público e imagem) fica em `content_json`,
 * no mesmo formato usado por `src/data/services.ts` — isso mantém os
 * componentes do site público (ServiceCard, páginas de serviço etc.)
 * praticamente inalterados.
 */
import type { D1Database } from './cf-types';

export interface ServiceHighlight {
  /**
   * Identidade estável do item — NUNCA o índice na lista, nunca derivado do
   * texto (título/hash mudam com a edição, o id não pode). Gerado uma única
   * vez (ver `ensureItemIds` em src/lib/service-item-ids.ts) e persistido
   * dentro do próprio `content_json`; usado como chave de layout no
   * `editor_json` para sobreviver a reordenar/duplicar/excluir. Ausente em
   * registros salvos antes desta migração — sempre tratado como opcional.
   */
  id?: string;
  icon: string;
  title: string;
  text: string;
}

export interface ServiceBlock {
  id?: string;
  title: string;
  text?: string;
  items?: string[];
}

export interface Service {
  /**
   * Identidade estável para o Editor Visual (`editor_json`, ver
   * src/lib/service-editor.ts) — nunca o slug. O slug pode mudar; o `id`
   * não, então a Aparência/layout de um serviço nunca se perde por causa de
   * uma alteração de URL.
   */
  id: number;
  slug: string;
  name: string;
  shortName: string;
  order: number;
  featured: boolean;
  status: 'published' | 'draft' | 'archived';
  icon: string;
  summary: string;
  heroTitle: string;
  heroLead: string;
  image: string;
  imageAlt: string;
  intro: string[];
  highlights: ServiceHighlight[];
  blocks: ServiceBlock[];
  deliverables: string[];
  audience: string[];
  whatsappMessage: string;
  seo: { title: string; description: string };
  updatedAt: string;
}

export interface ServiceContentJson {
  image: string;
  imageAlt: string;
  intro: string[];
  highlights: ServiceHighlight[];
  blocks: ServiceBlock[];
  deliverables: string[];
  audience: string[];
}

interface ServiceRow {
  id: number;
  slug: string;
  name: string;
  short_name: string;
  display_order: number;
  featured: number;
  status: 'published' | 'draft' | 'archived';
  icon: string;
  summary: string;
  hero_title: string;
  hero_lead: string;
  content_json: string;
  whatsapp_message: string;
  seo_title: string;
  seo_description: string;
  updated_at: string;
}

function rowToService(row: ServiceRow): Service {
  const content = JSON.parse(row.content_json) as ServiceContentJson;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortName: row.short_name,
    order: row.display_order,
    featured: Boolean(row.featured),
    status: row.status,
    icon: row.icon,
    summary: row.summary,
    heroTitle: row.hero_title,
    heroLead: row.hero_lead,
    image: content.image,
    imageAlt: content.imageAlt,
    intro: content.intro,
    highlights: content.highlights,
    blocks: content.blocks,
    deliverables: content.deliverables,
    audience: content.audience,
    whatsappMessage: row.whatsapp_message,
    seo: { title: row.seo_title, description: row.seo_description },
    updatedAt: row.updated_at,
  };
}

export async function listServices(db: D1Database): Promise<Service[]> {
  const { results } = await db
    .prepare('SELECT * FROM services WHERE deleted_at IS NULL ORDER BY display_order ASC')
    .all<ServiceRow>();
  return results.map(rowToService);
}

/** Consulta direta por id — usada pelas rotas do Editor Visual, que não dependem de `Astro.locals.services`. */
export async function getServiceById(db: D1Database, id: number): Promise<Service | undefined> {
  const row = await db
    .prepare('SELECT * FROM services WHERE id = ?1 AND deleted_at IS NULL')
    .bind(id)
    .first<ServiceRow>();
  return row ? rowToService(row) : undefined;
}

/** Helpers puros — operam sobre a lista já carregada (Astro.locals.services). */
export function publishedOnly(services: Service[]): Service[] {
  return services.filter((s) => s.status === 'published');
}

export function findBySlug(services: Service[], slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

/** Identidade estável usada pelo Editor Visual — ver comentário em `Service.id`. */
export function findById(services: Service[], id: number): Service | undefined {
  return services.find((s) => s.id === id);
}

export interface ServiceUpdate {
  name: string;
  icon: string;
  shortName: string;
  summary: string;
  heroTitle: string;
  heroLead: string;
  image: string;
  imageAlt: string;
  whatsappMessage: string;
  seoTitle: string;
  seoDescription: string;
  status: 'published' | 'draft' | 'archived';
  featured: boolean;
  intro: string[];
  deliverables: string[];
  audience: string[];
  /**
   * Opcionais: quando ausentes, mantém `existing.highlights`/`existing.blocks`
   * sem mudança — é o que o CRUD tradicional (que ainda não edita esses dois
   * campos) sempre fez. O Editor Visual passa os dois explicitamente quando
   * o usuário edita um destaque/bloco pelo canvas.
   */
  highlights?: ServiceHighlight[];
  blocks?: ServiceBlock[];
}

export async function updateService(
  db: D1Database,
  slug: string,
  patch: ServiceUpdate,
  existing: Service
): Promise<void> {
  const content: ServiceContentJson = {
    image: patch.image,
    imageAlt: patch.imageAlt,
    intro: patch.intro,
    highlights: patch.highlights ?? existing.highlights,
    blocks: patch.blocks ?? existing.blocks,
    deliverables: patch.deliverables,
    audience: patch.audience,
  };

  await db
    .prepare(
      `UPDATE services SET
         name = ?1, short_name = ?2, summary = ?3, hero_title = ?4, hero_lead = ?5,
         whatsapp_message = ?6, seo_title = ?7, seo_description = ?8,
         status = ?9, featured = ?10, content_json = ?11, icon = ?12, updated_at = datetime('now')
       WHERE slug = ?13`
    )
    .bind(
      patch.name,
      patch.shortName,
      patch.summary,
      patch.heroTitle,
      patch.heroLead,
      patch.whatsappMessage,
      patch.seoTitle,
      patch.seoDescription,
      patch.status,
      patch.featured ? 1 : 0,
      JSON.stringify(content),
      patch.icon,
      slug
    )
    .run();
}

/**
 * Igual a `updateService`, mas identifica o serviço pelo `id` — a rota que o
 * Editor Visual usa (ver src/lib/service-editor.ts e o comentário em
 * `Service.id`). Nunca toca em `editor_json`: a lista de colunas do UPDATE
 * não o inclui, então a Aparência/layout gravados pelo Editor Visual
 * sobrevivem intactos a qualquer edição de conteúdo por aqui.
 */
export async function updateServiceById(
  db: D1Database,
  id: number,
  patch: ServiceUpdate,
  existing: Service
): Promise<void> {
  const content: ServiceContentJson = {
    image: patch.image,
    imageAlt: patch.imageAlt,
    intro: patch.intro,
    highlights: patch.highlights ?? existing.highlights,
    blocks: patch.blocks ?? existing.blocks,
    deliverables: patch.deliverables,
    audience: patch.audience,
  };

  await db
    .prepare(
      `UPDATE services SET
         name = ?1, short_name = ?2, summary = ?3, hero_title = ?4, hero_lead = ?5,
         whatsapp_message = ?6, seo_title = ?7, seo_description = ?8,
         status = ?9, featured = ?10, content_json = ?11, icon = ?12, updated_at = datetime('now')
       WHERE id = ?13`
    )
    .bind(
      patch.name,
      patch.shortName,
      patch.summary,
      patch.heroTitle,
      patch.heroLead,
      patch.whatsappMessage,
      patch.seoTitle,
      patch.seoDescription,
      patch.status,
      patch.featured ? 1 : 0,
      JSON.stringify(content),
      patch.icon,
      id
    )
    .run();
}

/**
 * Gravação atômica de `content_json` + `editor_json` na MESMA instrução SQL
 * — usada exclusivamente pela migração de identidade estável de destaques/
 * blocos (ver src/lib/service-item-ids.ts): materializar ids em
 * `content_json` e migrar as chaves de layout correspondentes em
 * `editor_json` precisam virar visíveis juntos, nunca um sem o outro.
 * Não altera nome, resumo, hero, SEO ou status.
 */
export async function updateServiceContentAndEditorJson(
  db: D1Database,
  id: number,
  content: ServiceContentJson,
  editorJson: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE services SET content_json = ?1, editor_json = ?2, updated_at = datetime('now')
       WHERE id = ?3 AND deleted_at IS NULL`
    )
    .bind(JSON.stringify(content), editorJson, id)
    .run();
}
