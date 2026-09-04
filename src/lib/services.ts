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
  icon: string;
  title: string;
  text: string;
}

export interface ServiceBlock {
  title: string;
  text?: string;
  items?: string[];
}

export interface Service {
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

interface ServiceContentJson {
  image: string;
  imageAlt: string;
  intro: string[];
  highlights: ServiceHighlight[];
  blocks: ServiceBlock[];
  deliverables: string[];
  audience: string[];
}

interface ServiceRow {
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

/** Helpers puros — operam sobre a lista já carregada (Astro.locals.services). */
export function publishedOnly(services: Service[]): Service[] {
  return services.filter((s) => s.status === 'published');
}

export function findBySlug(services: Service[], slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
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
    highlights: existing.highlights,
    blocks: existing.blocks,
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
