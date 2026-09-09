# Continuidade — Editor Visual (branch `feature/editor-visual`)

Arquivo de checkpoint, sem segredos. Atualizado automaticamente durante o
desenvolvimento autônomo pedido pelo usuário. Nunca commitado à `main`.

## Estado em 2026-09-08/09 (fim desta sessão)

Último commit: `cd109a3` — "Adiciona modelos de auditoria e missão/visão/
valores ao organograma" (branch `feature/editor-visual`, já enviado para
`origin/feature/editor-visual`).

`npm run qa` passa integralmente (lint + typecheck + testes + build), 0
erros/0 avisos, 267 testes. Banco real local (porta 4321) recebeu apenas
migrações de schema (colunas/tabelas novas, sempre anuláveis ou vazias) —
nenhuma gravação de dado real feita pelo agente; toda linha criada durante
teste manual foi só no banco isolado (porta 4322), sempre descartado ao
final (`npm run test:ui:isolated:discard`).

## Itens do escopo original — estado atual

- **Item 3 (cópia de produção)** — **bloqueado, não por falta de tentativa**:
  `wrangler whoami` (somente leitura) confirmou que as credenciais atuais só
  têm escopo `account:read`/`user:read`, sem D1/Workers/R2. Por instrução
  explícita do usuário, nenhum comando `--remote` foi tentado, nenhum segredo
  foi pedido, e o ambiente "cópia de produção" (porta 4323) não foi criado
  (seria enganoso chamá-lo assim alimentado só com dados locais). Só avança
  se o usuário liberar acesso real.
- **Item 4 (migrar páginas restantes)** — **concluído**. Todas as páginas
  públicas fixas (Home, Quem Somos, Contato, Política de Privacidade,
  Serviços — moldura e individuais —, Conteúdos — listagem e matérias
  individuais) estão no Editor Visual, com os 4 pontos de entrada (Editar
  conteúdo / Editor visual / Aparência / Configurações) e aparecem
  automaticamente em Conteúdo → Editor Visual → Páginas.
- **Item 5 (gerenciamento completo de páginas)** — **parcial, avançado**:
  - ✅ Renomear slug com redirecionamento 301 automático (serviços e
    matérias).
  - ✅ Criar novo serviço de verdade (antes era um placeholder "liberado na
    Etapa 2") e nova matéria (já existia).
  - ✅ Duplicar serviço/matéria (sempre como rascunho, nunca em destaque,
    slug nunca colide, `editor_json` nunca copiado).
  - ✅ Publicar/despublicar/arquivar (já existia via campo `status`).
  - ✅ SEO título/descrição por página/serviço/matéria (já existia).
  - ✅ Thumbnail real na listagem de Serviços (Matérias já tinha).
  - ✅ Submenu de Serviços no cabeçalho deixou de ser lista estática
    desatualizável — agora vem de `Astro.locals.services` (publicados,
    na ordem de `display_order`).
  - ❌ **Excluir de verdade com confirmação forte** — hoje só existe
    "arquivar" (soft delete via status), que já é seguro; avaliar se isso
    já satisfaz o pedido ou se falta uma exclusão definitiva.
  - ❌ **Reordenar os 5 itens fixos do cabeçalho** (Início/Quem Somos/
    Serviços/Conteúdos/Contato) — continuam em ordem fixa em
    `src/data/site.ts` (`mainNav`); só o SUBMENU de Serviços é dinâmico.
  - ❌ **"Adicionar página" genérica (em branco ou por modelo)** — **decisão
    de arquitetura pendente, não tarefa mecânica**: hoje cada página
    institucional fixa é uma rota `.astro` própria com conteúdo em uma
    linha da tabela `pages`. Não existe mecanismo para o usuário criar uma
    página TOTALMENTE NOVA (ex.: "Nossa História") sem um desenvolvedor
    adicionar um novo arquivo de rota. Fazer isso de verdade exige um
    construtor de páginas genérico (rota catch-all, modelo de conteúdo em
    blocos, tabela própria de "páginas custom") — uma escolha de design que
    molda o restante do item 5 e o item 9. Recomendo confirmar com o
    usuário o formato desejado antes de construir.
- **Item 6 (biblioteca visual)** — **parcial**: o painel "Adicionar
  elemento" (presente em toda página migrada) já cobre Texto/Imagem/Vídeo/
  Ícone/Forma, com link para Uploads (`/admin/midia`); "Camadas" e "Cores"
  (fundo) já existem por seção. "Organogramas" ganhou uma ferramenta própria
  (ver item 8). "Modelos" tem só um começo (ver item 9) — os modelos de
  organograma, não modelos de SEÇÃO DE PÁGINA ainda.
- **Item 7 (ícones de saúde)** — **concluído**. Biblioteca já tinha boa
  cobertura (`stethoscope`, `hospital`, `ambulance`, `pill`, `syringe`,
  `microscope`, `first-aid`, `shield-check`, etc.); esta sessão completou as
  lacunas da lista pedida: `nurse` (enfermagem), `icu` (UTI), `telemedicine`
  (telemedicina), `exam` (exames). Todos em `src/data/icons.ts`, aparecem
  automaticamente em `/admin/icones`.
- **Item 8 (organogramas/fluxogramas)** — **concluído**. Nova área livre em
  `/admin/organogramas` (lista) e `/admin/organogramas/[id]` (editor),
  usando Fabric.js **só nesta tela** (nunca no site público nem nas páginas
  semânticas — carregado via `<script is:inline src="/vendor/fabric.min.js">`,
  igual ao padrão já usado por `moveable.min.js`). Caixas, texto, conectores
  com seta que acompanham os nós ao mover, duplicar/excluir elemento,
  camadas (frente/trás), cor de preenchimento/borda/texto, exportar como
  PNG, 4 modelos iniciais (fluxo simples, hierarquia, etapas de auditoria,
  missão/visão/valores). Nova tabela `diagrams`
  (`migrations/0006_diagrams.sql`), CRUD em `src/lib/diagrams.ts`.
  **fabric@7.4.0** foi escolhido deliberadamente (não a série 5.x, que tem
  uma vulnerabilidade XSS conhecida na exportação SVG, corrigida só a partir
  da 7.4.0 — verificado com `npm audit` antes de fixar a versão).
- **Item 9 (modelos prontos)** — **parcial, só a fatia de organograma**: dos
  9 modelos pedidos (apresentação institucional, auditoria concorrente,
  indicadores hospitalares, missão/visão/valores, equipe, organograma, fluxo
  assistencial, etapas de auditoria, CTA), **organograma**, **etapas de
  auditoria** e **missão/visão/valores** já têm modelo inicial — mas dentro
  da ferramenta de organogramas (Fabric.js), não como modelo de SEÇÃO DE
  PÁGINA inserível via "Adicionar elemento". Os demais (apresentação
  institucional, indicadores hospitalares, equipe, fluxo assistencial, CTA)
  não têm nenhum modelo ainda. Implementar "modelos de seção" de verdade
  exigiria adicionar uma aba "Modelos" ao painel "Adicionar elemento" **em
  cada editor de página** (Home, Quem Somos, Contato, Serviços — moldura e
  individual —, Política, Conteúdos — listagem e matéria individual —, ~8
  arquivos grandes), inserindo um conjunto de overlays pré-configurados sem
  apagar o conteúdo existente (mesmo princípio já usado nos modelos de
  organograma). É uma tarefa grande, mecânica mas repetitiva; também caberia
  perguntar ao usuário o conteúdo/redação exata de cada modelo antes de
  escrever texto institucional em nome da empresa.
- **Item 10 (qualidade/segurança)** — seguido em todo o trabalho desta
  sessão: banco isolado para todo teste destrutivo, backup antes de migração
  em coluna com dado existente, nunca `--remote`, validação server-side
  (slug, tamanho de JSON, sanitização de ícone/URL), sem `innerHTML`/
  `set:html` para conteúdo vindo do usuário, `npm audit` verificado antes de
  fixar a versão do Fabric.js, testes automatizados por funcionalidade nova,
  verificação manual real no navegador para cada funcionalidade.

## Todos os commits desta sessão (ordem cronológica)

`26c81aa` (QA/escopo) → `e8c402c` (ícone/imagem de serviço) →
`1ba1f30` (testes de transferência entre seções) → `c256723` (Política de
Privacidade) → `536c6c8` (página de Conteúdos) → `e6ab208` (Matérias
individuais + generaliza `editor:image-style`) → `f19bb0d` (slug editável +
redirect 301) → `32a90f9` (continuidade) → `e91b50d` (criar/duplicar
serviço e matéria) → `72ac85c` (submenu dinâmico + thumbnail) → `de41fc5`
(continuidade) → `a45d2e1` (ícones de saúde) → `6b5c4ba` (organogramas) →
`cd109a3` (modelos de organograma para auditoria/MVV).

## Pendente — próximas tarefas sugeridas, em ordem

1. **Item 9 de verdade (modelos de seção de página)** — decidir com o
   usuário o conteúdo exato de cada modelo antes de implementar (é texto
   institucional em nome da empresa, não uma escolha técnica) e então
   adicionar a aba "Modelos" ao painel "Adicionar elemento" de cada editor.
2. **Decisão de arquitetura do item 5** ("adicionar página" genérica) —
   confirmar com o usuário se vale construir um construtor de páginas
   completo (rota catch-all + tabela própria) ou se o escopo atual (páginas
   fixas + serviços/matérias dinâmicos) já atende.
3. Itens menores do item 5: excluir de verdade com confirmação (avaliar se
   necessário), reordenar os 5 itens fixos do cabeçalho, thumbnail nos hubs
   secundários (`/admin/editor/servicos`, `/admin/editor/materias`).
4. Item 3 continua bloqueado por credencial — só avança se o usuário liberar
   acesso de leitura real à produção.

## Como continuar

- Ambiente de teste isolado: `npm run test:ui:isolated:init` (cria cópia em
  `.testing/isolated-wrangler-state`, porta 4322) → `npm run dev:isolated`
  (ou `preview_start` com o nome `essencial-saude-test` do
  `.claude/launch.json`) → criar um usuário admin de teste com
  `node scripts/create-user.mjs` + `wrangler d1 execute ... --local
  --persist-to .testing/isolated-wrangler-state` → ao terminar,
  `npm run test:ui:isolated:discard`.
- **Nunca** usar `--remote` em nenhum comando `wrangler d1`.
- Antes de alterar uma tabela com dado real (ALTER TABLE numa coluna
  existente), fazer backup: `wrangler d1 execute ... --local --command
  "SELECT * FROM <tabela>" --json > .testing/db-snapshots/<nome>.json`.
- QA completo: `npm run qa`.
- Commits pequenos e coerentes, sempre `git push origin
  feature/editor-visual` — nunca mexer em `main`.
