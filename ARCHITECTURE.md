# Arquitetura

> Documento vivo. A Etapa 1 define a camada de apresentação e **o contrato de dados**
> que o backend da Etapa 2 deverá respeitar sem redesenhar o visual aprovado.

## 1. Stack escolhida

| Camada | Escolha | Por quê |
| --- | --- | --- |
| Framework | **Astro 7** (`output: 'static'` nesta etapa) | HTML pré-renderizado, JavaScript quase zero no site público, excelente SEO, roda nativamente em Cloudflare Pages/Workers |
| Linguagem | **TypeScript** (modo `strict`) | Exigência do briefing; contratos de dados explícitos |
| Estilo | **CSS próprio com design tokens** + CSS escopado por componente | Sem framework de UI, sem CSS morto, controle total da identidade, nada a migrar depois |
| Ícones | **SVG inline próprio** (`src/components/Icon.astro`) | Família única e consistente, sem requisição externa, sem emojis |
| Tipografia | **Inter Variable + Sora Variable** via `@fontsource-variable` | Fontes servidas do próprio domínio: sem Google Fonts, sem impacto de privacidade/LGPD, sem latência de terceiros |
| Imagens | **SVG gerado** (`scripts/gen-images.py`) | Não havia banco de imagens; arte leve, nítida em qualquer tela e substituível pelo CMS |
| Sitemap | `@astrojs/sitemap` com `/admin` excluído | Sitemap automático já na Etapa 1 |
| Qualidade | ESLint (flat config) + Prettier + `astro check` | Portão único: `npm run qa` |

### Alternativas avaliadas

- **Next.js**: mais JavaScript no cliente e maior complexidade de deploy em Cloudflare para um site majoritariamente estático.
- **WordPress / Strapi / Sanity**: descartados pelo briefing — o CMS é próprio.
- **Tailwind**: descartado para manter o CSS 100% aderente aos tokens da marca e evitar dependência de build plugin.

### Por que estático agora e servidor depois

A Etapa 1 é 100% pré-renderizada (`output: 'static'`), sem adapter e sem backend —
não há qualquer superfície de servidor a proteger. Na Etapa 2, o mesmo projeto passa a
`output: 'server'` com o adapter Cloudflare: as páginas públicas continuam
pré-renderizadas (`export const prerender = true`), enquanto `/admin/*` e as rotas de
API passam a ser renderizadas no servidor. **O layout aprovado não muda.**

---

## 2. Camadas

```
┌─────────────────────────────────────────────────────────────┐
│ SITE PÚBLICO (Astro, HTML estático)                         │
│  Header · páginas · formulários · WhatsApp · Footer         │
├─────────────────────────────────────────────────────────────┤
│ CMS /admin (Astro, mesmo design system, noindex)            │
├─────────────────────────────────────────────────────────────┤
│ CAMADA DE DADOS                                             │
│  ETAPA 1 → src/data/*.ts   (fixtures locais tipadas)        │
│  ETAPA 2 → Cloudflare D1   (mesmo shape, via repositórios)  │
├─────────────────────────────────────────────────────────────┤
│ MÍDIA                                                       │
│  ETAPA 1 → /public/images  ETAPA 2 → Cloudflare R2          │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Contrato de dados (Etapa 1 → Etapa 2)

Cada arquivo em `src/data/` já tem a forma da tabela correspondente no D1. A troca da
fonte de dados deve ser **substituição de import**, não reescrita de componente.

| Fixture | Tabela prevista no D1 | Campos-chave |
| --- | --- | --- |
| `site.ts` → `company`, `whatsapp`, `seo`, `social` | `settings` (chave/valor tipado) | nome, e-mail, telefone, endereço, WhatsApp (número/mensagem/tooltip/ativo), SEO padrão |
| `services.ts` → `Service` | `services` | slug, nome, resumo, conteúdo, destaques, blocos, entregáveis, público, imagem, ícone, ordem, status, mensagem de WhatsApp, SEO |
| `posts.ts` → `Post` | `posts` | slug, título, resumo, corpo em **blocos tipados**, categoria, autor, status, datas, capa, SEO |
| `posts.ts` → `Category` / `Author` | `categories` / `authors` | nome, slug, descrição / nome, função, bio, foto, status |
| `institutional.ts` | `pages` + `page_sections` | Home por seções estruturadas (hero, proposta, elo, serviços, benefícios, MVV…) |
| `admin.ts` → `contacts` | `contacts` | data, nome, empresa, cargo, e-mail, telefone, tipo de organização, serviço, assunto, mensagem, **origem**, status |
| `admin.ts` → `users` / `logs` / `redirects` / `media` | `users`+`roles` / `audit_logs` / `redirects` / `media` | conforme telas do painel |

### Corpo das matérias: blocos, não HTML livre

`posts.ts` define `BlockNode` (`paragraph`, `h2`, `h3`, `list`, `quote`, `divider`).
O editor do CMS produzirá exatamente esse formato, e a renderização em
`src/pages/conteudos/[slug].astro` já consome blocos — o que evita HTML arbitrário e
simplifica a sanitização no servidor.

---

## 4. Formulários — do simulado ao real

Hoje (`src/components/ContactForm.astro`):

```
usuário → validação no cliente → estados visuais → simulação local (sem rede)
```

Na Etapa 2, apenas a função de envio muda:

```
usuário → validação no cliente → POST /api/contato
        → Turnstile → rate limiting → validação no servidor → sanitização
        → D1 (contacts) → confirmação → /admin/contatos
```

Os atributos `name=` de todos os campos (`nome`, `empresa`, `cargo`, `email`,
`telefone`, `tipo_organizacao`, `servico`, `assunto`, `mensagem`, `consentimento`,
`origem`) já são o payload esperado pelo backend. O honeypot (`website`) e o registro
da página de origem também já estão implementados.

---

## 5. Decisões de acessibilidade e performance

- HTML semântico, um `<h1>` por página, hierarquia de títulos sem saltos.
- Foco visível padronizado, `skip link`, navegação por teclado no menu, no drawer, nas abas e nos modais.
- Contraste verificado programaticamente (WCAG 2.2 AA) em páginas públicas e no painel.
- `prefers-reduced-motion` respeitado; animações são progressivas (sem JS, o conteúdo aparece normalmente).
- Imagens com `width`/`height` (sem layout shift), `loading="lazy"` fora da dobra e `fetchpriority="high"` no hero.
- JavaScript apenas onde há interação real: menu, formulário, filtros do blog e interações do painel.

---

## 6. Convenções

- **Branches:** `main` protegida; trabalho em `feature/*`, `fix/*`, `hotfix/*`.
- **Segredos:** nunca versionados; `.env.example` documenta as variáveis previstas.
- **Ambiente:** apenas **produção** será persistente. Local e previews técnicos são temporários.
- **Nomenclatura de recursos Cloudflare (Etapa 2):** `essencial-saude`, `essencial-saude-db`, `essencial-saude-media`, `essencial-saude-turnstile`.
