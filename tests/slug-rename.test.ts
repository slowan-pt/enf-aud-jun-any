/**
 * Renomear o slug de um serviço ou matéria (item 5 do escopo: "slug com
 * redirecionamento seguro quando o slug muda") — cobre só a parte
 * testável em isolamento: a gravação da nova coluna `slug` e a detecção de
 * colisão. A criação do redirecionamento 301 em si acontece no handler POST
 * de src/pages/admin/servicos/[slug].astro e src/pages/admin/conteudos/
 * [slug].astro, junto com src/lib/redirects.ts (já coberto por uso real).
 */
import { describe, it, expect } from 'vitest';
import { updateService, slugExists as serviceSlugExists } from '../src/lib/services';
import type { Service, ServiceUpdate } from '../src/lib/services';
import { updatePost, slugExists as postSlugExists } from '../src/lib/posts';
import type { PostInput } from '../src/lib/posts';
import type { D1Database } from '../src/lib/cf-types';

function fakeSlugDb(existingSlugs: string[]) {
  const writes: { params: unknown[] }[] = [];
  const db = {
    prepare(_sql: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async run() {
              writes.push({ params });
            },
            async first() {
              const slug = params[0] as string;
              return existingSlugs.includes(slug) ? { id: 1 } : null;
            },
          };
        },
      };
    },
  } as unknown as D1Database;
  return { db, writes };
}

const service: Service = {
  id: 1,
  slug: 'auditoria-concorrente',
  name: 'Auditoria Concorrente',
  shortName: 'Auditoria',
  order: 1,
  featured: true,
  status: 'published',
  icon: 'stethoscope',
  summary: 'Resumo',
  heroTitle: 'Título',
  heroLead: 'Lead',
  image: '/images/a.svg',
  imageAlt: 'alt',
  intro: ['p1'],
  highlights: [],
  blocks: [],
  deliverables: [],
  audience: [],
  whatsappMessage: 'mensagem',
  seo: { title: 'SEO', description: 'SEO desc' },
  updatedAt: '2026-01-01',
};

describe('updateService — renomear slug', () => {
  it('grava o novo slug na coluna (primeiro parâmetro do UPDATE)', async () => {
    const { db, writes } = fakeSlugDb([]);
    const patch: ServiceUpdate = {
      slug: 'auditoria-concorrente-hospitalar',
      name: service.name,
      icon: service.icon,
      shortName: service.shortName,
      summary: service.summary,
      heroTitle: service.heroTitle,
      heroLead: service.heroLead,
      image: service.image,
      imageAlt: service.imageAlt,
      whatsappMessage: service.whatsappMessage,
      seoTitle: service.seo.title,
      seoDescription: service.seo.description,
      status: service.status,
      featured: service.featured,
      intro: service.intro,
      deliverables: service.deliverables,
      audience: service.audience,
    };
    await updateService(db, service.slug, patch, service);
    expect(writes[0]!.params[0]).toBe('auditoria-concorrente-hospitalar');
  });

  it('slugExists detecta colisão com outro serviço; não acusa o próprio slug atual como novidade', async () => {
    const { db } = fakeSlugDb(['auditoria-concorrente', 'gestao-hospitalar']);
    expect(await serviceSlugExists(db, 'gestao-hospitalar')).toBe(true);
    expect(await serviceSlugExists(db, 'slug-livre-novo')).toBe(false);
  });
});

const postInputBase: PostInput = {
  slug: 'materia-original',
  title: 'Título',
  excerpt: 'Resumo',
  categoryId: null,
  authorId: null,
  status: 'published',
  featured: false,
  coverUrl: '/images/a.svg',
  coverAlt: 'alt',
  readingMinutes: 5,
  body: [],
  seoTitle: 'SEO',
  seoDescription: 'SEO desc',
  publishedAt: '2026-01-01',
};

describe('updatePost — renomear slug', () => {
  it('grava o novo slug na coluna (primeiro parâmetro do UPDATE)', async () => {
    const { db, writes } = fakeSlugDb([]);
    await updatePost(db, 'materia-original', { ...postInputBase, slug: 'materia-renomeada' });
    expect(writes[0]!.params[0]).toBe('materia-renomeada');
  });

  it('slugExists detecta colisão com outra matéria', async () => {
    const { db } = fakeSlugDb(['materia-existente']);
    expect(await postSlugExists(db, 'materia-existente')).toBe(true);
    expect(await postSlugExists(db, 'slug-livre-novo')).toBe(false);
  });
});
