# Essencial Saúde Auditoria — Site + CMS

Site institucional e painel administrativo próprio da **Essencial Saúde Auditoria**
(gestão e auditoria em saúde — Brasília/DF).

> **Estado atual: ETAPA 1 — frontend / visual / esqueleto completo.**
> Não há backend, banco de dados, autenticação real, upload real ou persistência.
> Todos os formulários e ações do painel são **simulados no navegador**.
> A Etapa 2 (backend, CMS funcional, Cloudflare D1/R2/Turnstile, deploy) só começa
> após aprovação explícita do proprietário.

---

## Como rodar localmente

Pré-requisitos: **Node.js 20+** (testado com Node 25) e npm.

```bash
npm install
```

```bash
npm run dev
```

O site sobe em <http://localhost:4321>.

| Comando             | O que faz                                              |
| ------------------- | ------------------------------------------------------ |
| `npm run dev`       | Servidor de desenvolvimento com hot reload             |
| `npm run build`     | Gera o site estático em `dist/`                        |
| `npm run preview`   | Serve o build de produção localmente                   |
| `npm run lint`      | ESLint + Prettier (verificação)                        |
| `npm run format`    | Aplica a formatação do Prettier                        |
| `npm run typecheck` | `astro check` (TypeScript + templates)                 |
| `npm run qa`        | lint + typecheck + build (portão de qualidade completo)|

Para regenerar as artes SVG institucionais:

```bash
python scripts/gen-images.py
```

---

## Mapa de rotas

### Site público

| Rota | Página |
| --- | --- |
| `/` | Home |
| `/quem-somos` | Quem Somos |
| `/servicos` | Lista de serviços |
| `/servicos/auditoria-concorrente` | Auditoria Concorrente (destaque) |
| `/servicos/auditoria-de-contas-hospitalares` | Auditoria de Contas Hospitalares |
| `/servicos/gestao-da-jornada-do-paciente` | Gestão da Jornada do Paciente |
| `/servicos/gestao-hospitalar` | Gestão Hospitalar |
| `/servicos/qualificacao-da-rede-prestadora` | Qualificação da Rede Prestadora |
| `/servicos/seguranca-e-qualidade-assistencial` | Segurança e Qualidade Assistencial |
| `/conteudos` | Blog / listagem com filtros |
| `/conteudos/[slug]` | Página de artigo (6 matérias de demonstração) |
| `/contato` | Contato + formulário completo |
| `/politica-de-privacidade` | Política de Privacidade (LGPD) |
| `/404` | Página 404 personalizada |

### CMS (visual, `noindex`)

`/admin/login` · `/admin` (dashboard) · `/admin/paginas` · `/admin/paginas/home`
· `/admin/servicos` · `/admin/servicos/[slug]` · `/admin/conteudos`
· `/admin/conteudos/nova` · `/admin/categorias` · `/admin/autores` · `/admin/midia`
· `/admin/contatos` · `/admin/contatos/[id]` · `/admin/seo` · `/admin/configuracoes`
· `/admin/usuarios` · `/admin/logs`

O login aceita qualquer credencial válida em formato (é apenas a tela); ele leva
ao dashboard de demonstração.

---

## Estrutura

```
src/
  data/          fixtures locais (contrato de dados do futuro CMS)
    site.ts          empresa, contato, WhatsApp, navegação, SEO padrão
    services.ts      6 serviços com conteúdo completo
    posts.ts         matérias, categorias e autores
    institutional.ts Home, Quem Somos, missão/visão/valores
    admin.ts         dados de DEMONSTRAÇÃO do painel
  components/    componentes do site e do painel (Astro, CSS escopado)
  layouts/       BaseLayout (site público) e AdminLayout (CMS)
  pages/         rotas do site e do painel
  styles/        tokens.css → global.css → admin.css
public/
  images/        artes SVG geradas por scripts/gen-images.py
  favicon.svg, robots.txt
```

**Regra central:** telefone, e-mail, endereço, WhatsApp e SEO padrão vivem apenas em
`src/data/site.ts`. Nenhum componente contém esses dados fixos no código.

---

## Documentação

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — stack, decisões e contratos de dados
- [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md) — tokens, componentes e padrões visuais
- [`ETAPA-1-ENTREGA.md`](ETAPA-1-ENTREGA.md) — o que foi entregue e como foi testado
- [`ETAPA-2-PENDENCIAS.md`](ETAPA-2-PENDENCIAS.md) — plano objetivo da Etapa 2
- [`CHANGELOG.md`](CHANGELOG.md) — histórico de mudanças

`CLOUDFLARE.md`, `FREE_TIER.md`, `DEPLOY.md`, `ADMIN.md`, `SEO.md` e `BACKUP.md`
serão criados na Etapa 2, quando existirem recursos reais a documentar.
