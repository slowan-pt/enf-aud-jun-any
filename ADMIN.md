# ADMIN — como acessar e usar o painel (estado atual)

> Este documento reflete o que **já funciona de verdade** hoje. Vai sendo
> atualizado conforme cada tela do CMS passa de "simulada" para "real".
> Ver `ETAPA-2-PENDENCIAS.md` para o que ainda falta.

## O que já é real

Praticamente todo o painel grava de verdade no banco (Cloudflare D1) e no
armazenamento de mídia (R2 — local em desenvolvimento, precisa de bucket
real na conta Cloudflare de produção, ver `CLOUDFLARE.md`).

- **Login e sessão** — usuário e senha verificados contra o banco, hash de
  senha (PBKDF2), proteção contra força bruta (bloqueio após 8 tentativas
  falhas em 15 min), sessão em cookie `HttpOnly` + `Secure` (expira em 7
  dias). "Sair" encerra a sessão no banco.
- **Configurações → Empresa, WhatsApp, Redes sociais, SEO técnico e Marca**
  — todos os campos gravam no banco e refletem no site publicado
  imediatamente, sem rebuild: dados da empresa (rodapé, Contato,
  Schema.org), número/mensagem do WhatsApp (header, rodapé, botão
  flutuante, CTAs), redes sociais (rodapé), verificação do Google Search
  Console e ID do Google Analytics (`<head>` de toda página pública) e o
  **logotipo principal do site** — upload real de arquivo (SVG/PNG/WebP),
  aplicado em todo o site assim que salvo. **Ainda não editável por aqui:**
  logo para fundo escuro, favicon e razão social/CNPJ (aguardando dado
  real do proprietário).
- **Formulário de contato (site público)** — grava no banco (`/api/contato`),
  com honeypot e limite de 5 envios por hora por IP.
- **Contatos (`/admin/contatos`)** — lista, detalhe, status, arquivar e nota
  interna gravam no banco.
- **Serviços (`/admin/servicos`)** — nome, resumo, textos da página,
  entregáveis, público-alvo, mensagem de WhatsApp, SEO, status e destaque
  gravam no banco e aparecem na Home, em `/servicos` e na página do
  serviço. Arquivar é real. **Ainda não editável por aqui:** ícone, ordem,
  slug e os cards de "Destaques"/"Blocos de conteúdo" (ficam preservados,
  só leitura).
- **Página Home (`/admin/paginas/home`)** — **todas** as seções
  institucionais são editáveis e gravam no banco (`pages.sections_json`):
  Hero, Proposta de valor, Elo estratégico, Benefícios, Como atuamos,
  Missão/Visão/Valores, Para quem atuamos e CTA final. Serviços em
  destaque (Auditoria Concorrente, Gestão Hospitalar, Qualificação da
  rede) usam os dados cadastrados em Serviços. Conteúdos recentes usa as
  matérias publicadas. **Ainda não editável por aqui:** ícones de
  cada item, ordem/seleção de seções, e os detalhes de "comportamento" dos
  segmentos de clientes (só a Home; em Quem Somos seguem como fixture).
- **Categorias e Autores (`/admin/categorias`, `/admin/autores`)** — CRUD
  completo (criar, editar, excluir). Categoria/autor em uso por alguma
  matéria não pode ser excluído.
- **Matérias (`/admin/conteudos`)** — CRUD completo: título, slug (fixo após
  criado), categoria, autor, resumo, capa (caminho de imagem), status,
  destaque, tempo de leitura, SEO e o **corpo do texto em blocos**
  (parágrafo, H2, H3, lista, citação, separador — adicionar/remover/editar
  cada bloco). Publicar reflete em `/conteudos` e na página da matéria sem
  rebuild. O editor de blocos é estruturado (tipo + texto por bloco), não
  um editor visual de HTML livre — ver nota em "Trade-offs" abaixo.
- **Mídia (`/admin/midia`)** — upload real para R2 (JPG/PNG/WebP/SVG, até
  5 MB), com validação de tipo e tamanho no servidor, listagem, edição de
  título/alt e exclusão (soft delete). Os arquivos são servidos por
  `/media/[arquivo]`.
- **Usuários (`/admin/usuarios`)** — criar (com senha inicial definida pelo
  administrador — ainda não há convite por e-mail), editar nome/e-mail/
  perfil/status e redefinir senha. Não é possível desativar ou rebaixar o
  último administrador ativo — o painel bloqueia essa ação.
- **Logs (`/admin/logs`)** — lista real das últimas 200 ações administrativas
  (login, logout, criação/edição/exclusão em qualquer tela, alterações de
  Configurações), com usuário, ação, item e IP.
- **SEO (`/admin/seo`)** — aba Metadados lista o SEO real de Home, cada
  serviço e cada matéria (com link direto para editar). Aba
  Redirecionamentos: CRUD real de redirects 301/302, **aplicados de
  verdade** a cada requisição pública (middleware). Aba SEO técnico:
  verificação do Search Console, ID do Analytics e imagem Open Graph
  padrão (mesmos campos de Configurações → SEO técnico).
- **Registro de ações** — toda ação relevante acima grava em `audit_logs`,
  visível em `/admin/logs`.

Esse encadeamento foi testado de ponta a ponta em cada peça: alterar dados
em Configurações e ver o site mudar no mesmo instante; enviar o formulário
público e ver o contato em `/admin/contatos`; editar um serviço, uma
matéria e cada seção da Home e ver a mudança ao vivo; enviar um arquivo em
Mídia e usá-lo como logo; criar um usuário pelo painel e logar com ele;
criar um redirecionamento e confirmar que a URL antiga realmente
redireciona.

## Trade-offs conscientes desta fase

- **Editor de matérias por blocos estruturados**, não um editor visual de
  HTML livre (contenteditable/WYSIWYG). Cobre os mesmos tipos de conteúdo
  (parágrafo, títulos, listas, citação, separador) com gravação real,
  trocando liberdade de formatação por simplicidade e segurança (sem HTML
  arbitrário para sanitizar).
- **Slug de Serviços e Matérias é fixo após a criação** — evita quebrar
  links já publicados sem um sistema de redirect automático. Redirects
  manuais já são reais (ver SEO → Redirecionamentos); redirect automático
  ao trocar slug continua pendente.
- **Ícone, ordem e alguns campos "de exibição fina"** (destaques/blocos de
  serviço, ícones de item da Home) continuam somente leitura — ficam
  preservados ao salvar, mas a edição visual deles é um CRUD à parte que
  não coube nesta fase.

## O que ainda é simulado ou pendente

- **Convite de usuário por e-mail** — hoje o administrador define a senha
  inicial diretamente; convite com token por e-mail depende do e-mail
  transacional (ver abaixo).
- **Aviso automático de novo contato** — ainda não envia e-mail (depende de
  domínio + Cloudflare Email Routing) nem WhatsApp automático (exigiria a
  API paga do WhatsApp Business/Meta — decisão de adiar registrada com o
  proprietário em 21/08/2026).
- **Cloudflare Turnstile** — o formulário de contato usa honeypot + rate
  limiting; o desafio visível (Turnstile) ainda não está conectado.
- **Logo para fundo escuro e favicon** — upload real ainda não conectado
  para esses dois (só o logo principal).
- **Infraestrutura de produção** — conta Cloudflare exclusiva, domínio
  próprio, bucket R2 e banco D1 reais (hoje só existem local/dev) — ver
  `ETAPA-2-PENDENCIAS.md`.

## Como acessar localmente (ambiente de desenvolvimento)

1. Instale as dependências e aplique o schema no banco local (SQLite, roda
   dentro do próprio `wrangler`/`astro dev` — não precisa de conta Cloudflare):

   ```bash
   npm install
   npm run db:migrate:local
   ```

   Depois, popule as tabelas com os dados reais já cadastrados no site
   (empresa/WhatsApp, serviços, Home institucional, categorias/autores e as
   matérias de demonstração):

   ```bash
   node scripts/seed-settings.mjs > /tmp/seed-settings.sql
   npx wrangler d1 execute essencial-saude-db --local --file=/tmp/seed-settings.sql
   node scripts/seed-services.mjs > /tmp/seed-services.sql
   npx wrangler d1 execute essencial-saude-db --local --file=/tmp/seed-services.sql
   node scripts/seed-pages.mjs > /tmp/seed-pages.sql
   npx wrangler d1 execute essencial-saude-db --local --file=/tmp/seed-pages.sql
   node scripts/seed-posts.mjs > /tmp/seed-posts.sql
   npx wrangler d1 execute essencial-saude-db --local --file=/tmp/seed-posts.sql
   ```

2. Crie o primeiro usuário administrador:

   ```bash
   node scripts/create-user.mjs "Seu Nome" seu-email@dominio.com "SenhaForte123!" admin
   ```

   Esse comando **imprime** um SQL — copie o resultado e aplique:

   ```bash
   node scripts/create-user.mjs "Seu Nome" seu-email@dominio.com "SenhaForte123!" admin > /tmp/user.sql
   npx wrangler d1 execute essencial-saude-db --local --file=/tmp/user.sql
   ```

3. Suba o site:

   ```bash
   npm run dev
   ```

4. Acesse **http://localhost:4321/admin/login** com o e-mail e senha
   cadastrados no passo 2.

### Credencial de teste já criada nesta sessão

Para você testar agora mesmo, já existe este usuário no banco **local**:

- E-mail: `admin@essencialsaude.local`
- Senha: `TrocarSenha123!`

**Troque essa senha ou crie seu próprio usuário antes de qualquer uso real** —
ela está registrada neste repositório e não deve ir para produção. Para trocar
a senha, gere um novo SQL com `create-user.mjs` (o `ON CONFLICT` atualiza o
usuário existente pelo e-mail).

## Como criar mais usuários (Editor, por exemplo)

O jeito normal, no dia a dia, é pelo próprio painel: **Usuários → Novo
usuário** (`/admin/usuarios`), informando nome, e-mail, perfil e uma senha
inicial (o painel ainda não envia convite por e-mail — combine a senha com
a pessoa por um canal seguro e peça para trocá-la no primeiro acesso).

Alternativa via linha de comando (útil para o primeiro usuário, antes de
haver qualquer conta no banco):

```bash
node scripts/create-user.mjs "Nome do Editor" editor@dominio.com "OutraSenha123!" editor > /tmp/user.sql
npx wrangler d1 execute essencial-saude-db --local --file=/tmp/user.sql
```

Perfis disponíveis: `admin` (acesso total) e `editor` (sem acesso a
Configurações, Usuários e Logs — ver matriz completa em `/admin/usuarios`).
O painel impede desativar ou rebaixar o último administrador ativo.

## Quando a conta Cloudflare de produção existir (Etapa 2, Fase 1)

Os mesmos comandos de banco funcionam trocando `--local` por `--remote`,
depois que:

1. `wrangler d1 create essencial-saude-db` for executado na conta Cloudflare
   exclusiva do projeto e o `database_id` retornado for colado em
   `wrangler.jsonc`;
2. `wrangler r2 bucket create essencial-saude-media` for executado para o
   bucket de mídia (o binding `MEDIA` em `wrangler.jsonc` já está pronto,
   só precisa do bucket real existir);
3. `npm run db:migrate:remote` for rodado uma vez.

Isso é documentado em detalhe em `CLOUDFLARE.md` (a ser criado quando a conta
Cloudflare exclusiva estiver pronta).
