# Etapa 2 — pendências e plano de execução

> **Etapa 2 aprovada pelo proprietário em 21/08/2026** e em andamento. Ver
> `ADMIN.md` para o que já é real hoje.

## 1. O que fica pendente por definição da Etapa 1

| Item | Situação hoje (Etapa 1) | Etapa 2 |
| --- | --- | --- |
| Banco de dados | fixtures em `src/data/*.ts` | Cloudflare D1 + migrations versionadas |
| CMS funcional | telas visuais, ações simuladas | CRUD real com gravação e soft delete |
| Autenticação | tela de login sem verificação | hash de senha, sessão, cookie HttpOnly/Secure/SameSite, expiração, proteção contra força bruta |
| Permissões | tabela de perfis apenas ilustrativa | RBAC real (Administrador / Editor) |
| Formulários | simulação local, sem rede | POST no servidor, validação, sanitização, gravação e aviso |
| Antispam | honeypot no cliente | Cloudflare Turnstile + rate limiting + honeypot |
| Contatos | 6 registros de demonstração | contatos reais gravados no D1, com status e histórico |
| Mídia | SVGs em `public/images` | upload real para R2, validação de tipo/MIME/extensão/tamanho, nome seguro |
| SEO administrável | campos exibidos, sem gravação | metadados por página/serviço/matéria no banco |
| Sitemap | automático a partir das rotas | dinâmico a partir do que estiver publicado |
| Redirecionamentos | tabela ilustrativa | 301 reais, criados ao alterar slug publicado |
| Logs | 6 eventos de demonstração | audit log real das ações relevantes |
| Preview de rascunho | botão que sinaliza a etapa | preview protegido, não indexado, fora do sitemap |
| Marca | assinatura SVG provisória | logotipo oficial carregado pelo CMS |
| Infraestrutura | nenhuma | conta Cloudflare exclusiva, Pages/Workers, D1, R2, Turnstile, deploy |
| Documentação | README, ARCHITECTURE, DESIGN-SYSTEM | + `CLOUDFLARE.md`, `FREE_TIER.md`, `DEPLOY.md`, `ADMIN.md`, `SEO.md`, `BACKUP.md` |

## 2. Pendências que dependem do proprietário

1. ~~**PDF institucional**~~ — recebido em 21/08/2026 ("Resumo da Essencial Saúde
   Auditoria.pdf"). Missão, visão, valores, segmentação de clientes e o detalhamento
   técnico dos serviços já foram incorporados ao site a partir desse material.
2. **Logotipo vetorial** — a versão em uso é a arte oficial fornecida no PDF, recortada
   em alta resolução (`public/logo/`), porém em raster (PNG), não vetor. Se a Essencial
   Saúde possuir o arquivo original em vetor (AI/EPS/SVG), ele deve substituir os PNGs
   para melhor nitidez em telas de alta densidade e no favicon.
3. **Razão social e CNPJ** — campo existe em Configurações, ainda sem valor.
4. **Perfis de redes sociais** — desativados no rodapé até haver perfil oficial.
5. **Domínio próprio** — necessário para canonical, sitemap e Search Console definitivos.
6. **Conta Cloudflare exclusiva + repositório GitHub** — pré-requisitos do deploy.
7. **Revisão jurídica da Política de Privacidade** — o texto atual é uma base técnica.
8. **Dados que não podem ser inventados** — clientes, números, cases, certificações e depoimentos. As seções existem no CMS e permanecem ocultas até haver dado real.

## 3. Plano de execução da Etapa 2

**Fase 1 — Infraestrutura ✅ (parte local concluída)**
Adapter Cloudflare no Astro (`output: 'server'`, páginas públicas pré-renderizadas);
`wrangler.jsonc` com binding D1; schema versionado em `migrations/0001_init.sql`
(users, sessions, login_attempts, categories, authors, media, services, posts,
pages, settings, contacts, contact_rate_limit, redirects, audit_logs).
**Pendente:** conta Cloudflare exclusiva, repositório GitHub privado, criação do
banco D1 e do bucket R2 *reais* (hoje só existe a versão local/dev), `CLOUDFLARE.md`
e `FREE_TIER.md`.

**Fase 2 — Banco e autenticação ✅ (concluída)**
Login real com hash de senha (PBKDF2-SHA256, Web Crypto — compatível com Workers),
sessão em cookie `HttpOnly`/`Secure`, proteção contra força bruta (bloqueio após 8
tentativas falhas em 15 min), logout, e audit log de login/logout. Ver `ADMIN.md`
para como criar usuários e testar. RBAC (admin/editor) definido no schema; a
aplicação das permissões por tela ainda será conectada tela a tela na Fase 3.

**Fase 3 — CMS funcional ✅ (concluída)**
Todas as telas do painel gravam de verdade no D1 (e no R2, para mídia) e
refletem no site público sem rebuild — testado ponta a ponta em cada uma:
Configurações (Empresa, WhatsApp, Redes sociais, SEO técnico e Marca —
upload real do logo principal); Serviços; Página Home completa (todas as
seções institucionais, não só Hero/Benefícios); Categorias e Autores (CRUD);
Matérias (CRUD completo com editor de corpo em blocos estruturados —
parágrafo/H2/H3/lista/citação/separador — em vez de HTML livre); Mídia
(upload real para R2, com validação de tipo/tamanho); Usuários (criar,
editar, redefinir senha, com proteção contra remover o último
administrador); Logs (audit log real); SEO (metadados agregados de
Home/Serviços/Matérias e redirecionamentos 301/302 reais, aplicados no
middleware a cada requisição). Soft delete aplicado em Mídia; audit log em
todas as ações relevantes.

**Pendente desta fase:** ícone/ordem/slug de serviços e os blocos ricos
"Destaques"/"Blocos de conteúdo" de cada serviço continuam só leitura;
logo para fundo escuro e favicon ainda não têm upload próprio; RBAC
(admin/editor) está definido no schema e aplicado no menu, mas a
restrição de acesso por tela ainda não bloqueia editores nas telas
restritas a administrador; convite de usuário por e-mail (hoje o admin
define a senha inicial diretamente); redirect 301 automático ao trocar
slug (hoje é manual, via SEO → Redirecionamentos).

**Fase 4 — Formulários e contatos ✅ (concluída, sem Turnstile ainda)**
`/api/contato` real: validação server-side, honeypot, rate limiting por IP
(5 envios/hora), gravação no D1 e visualização em `/admin/contatos` (lista,
detalhe, status, nota interna, WhatsApp e e-mail) — testado ponta a ponta.
**Pendente:** Cloudflare Turnstile (antispam visível, hoje só honeypot +
rate limiting) e aviso automático por e-mail ao proprietário a cada novo
contato (decisão registrada em 21/08/2026: aviso por WhatsApp automático
exigiria a API paga do WhatsApp Business/Meta — fora do escopo de custo
zero; o aviso será por e-mail assim que o domínio + Cloudflare Email Routing
estiverem configurados — ver `src/lib/notify.ts`).

**Fase 5 — SEO dinâmico ✅ (concluída, exceto redirect automático)**
Metadados administráveis (Home/Serviços/Matérias), sitemap dinâmico a partir do
publicado, redirects 301/302 reais (criação manual, aplicados no middleware),
Open Graph por conteúdo e verificação do Search Console + Google Analytics
administráveis. **Pendente:** redirect 301 criado automaticamente ao trocar
um slug publicado (hoje os slugs de Serviços/Matérias são fixos após criados,
justamente para não precisar disso ainda).

**Fase 6 — Segurança, performance e cache**
CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`;
estratégia de cache com invalidação ao publicar; Lighthouse e Core Web Vitals.

**Fase 7 — QA, documentação e deploy**
Testes de formulário, login, CMS, upload, SEO, links, 404 e responsividade;
CI no GitHub Actions (lint, typecheck, build) com deploy em produção;
`DEPLOY.md`, `ADMIN.md`, `SEO.md`, `BACKUP.md` e rollback documentado.

## 4. Regra de preservação

A Etapa 2 **não** é uma segunda rodada de design. Layout, identidade, navegação,
componentes e composição aprovados na Etapa 1 são o contrato. Alterações visuais só
com pedido explícito do proprietário.
