# Continuidade — Editor Visual (branch `feature/editor-visual`)

Arquivo de checkpoint, sem segredos. Atualizado automaticamente durante o
desenvolvimento autônomo pedido pelo usuário. Nunca commitado à `main`.

## Estado em 2026-09-08 (fim desta sessão)

Último commit: `72ac85c` — "Torna o submenu de Serviços do cabeçalho
dinâmico + thumbnail na listagem" (branch `feature/editor-visual`, já
enviado para `origin/feature/editor-visual`).

`npm run qa` passa integralmente (lint + typecheck + testes + build), 0
erros/0 avisos, 259 testes. Banco real local (porta 4321) recebeu apenas
migrações de schema (colunas novas, sempre `NULL`/anuláveis) — nenhuma
gravação de dado real feita pelo agente. Banco isolado (porta 4322) usado
para todo teste manual/destrutivo, sempre descartado ao final
(`npm run test:ui:isolated:discard`).

**Commits desta rodada, além dos já listados abaixo:** `f19bb0d` (slug
editável + redirect 301 em serviços/matérias), `32a90f9` (este arquivo),
`e91b50d` (criar/duplicar serviços e matérias — "Novo serviço" antes era
um placeholder "liberado na Etapa 2", agora cria de verdade), `72ac85c`
(submenu de Serviços no cabeçalho deixou de ser uma lista estática
desatualizável e passou a vir de `Astro.locals.services`; thumbnail real
na listagem de serviços).

## Concluído nesta sessão (em ordem)

1. **QA**: corrigido escopo do TypeScript/Vitest que analisava
   `mobile-app/` por engano (`tsconfig.json`, `vitest.config.ts`).
2. **Serviços individuais**: controles de ícone (cor/tamanho/opacidade/
   ocultar/restaurar) e de imagem (cover/contain/posição) completos;
   testes manuais de inserir/mover/redimensionar/camadas/undo-redo.
3. **Produção**: confirmado (via `wrangler whoami`, somente leitura) que as
   credenciais atuais não têm escopo D1/Workers/R2 — só `account:read` e
   `user:read`. Por instrução explícita do usuário, nenhum comando
   `--remote` foi tentado e o ambiente "cópia de produção" (porta 4323)
   **não foi criado**, pois teria que ser alimentado só com dados locais,
   o que seria enganoso chamar de "cópia de produção". **Isto continua
   pendente e depende só de o usuário liberar acesso real.**
4. **Política de Privacidade** migrada para o Editor Visual (commit
   `c256723`): modelo em `documents.ts`, página pública dinâmica, editor
   visual + aparência + formulário de conteúdo, registrada nos hubs.
5. **Página de Conteúdos** (listagem) migrada (commit `536c6c8`): hero +
   CTA final editáveis; a grade de matérias em si continua vindo do banco
   (tabela `posts`).
6. **Matérias individuais** ganharam Editor Visual + Aparência próprios
   (commit `e6ab208`): nova coluna `posts.editor_json`
   (`migrations/0005_posts_editor_json.sql`), `src/lib/post-editor.ts`,
   `/admin/api/post-editor-content.ts`, `/admin/editor/materias/*`. A
   página pública `/conteudos/[slug]` ganhou seções "corpo"/"relacionados"
   com cor/overlays próprios e ajuste de cover/contain/posição da capa
   (a imagem oficial continua só em Conteúdo → Matérias). Generalizado o
   handler `editor:image-style` do `editor-runtime.js` (antes fixo em
   `data-edit="image"`) para aceitar um `path`, sem quebrar Serviços.
7. **Slug editável com redirecionamento 301** (commit `f19bb0d`, início do
   item 5): serviços e matérias agora podem ter o slug alterado pelo CRUD
   tradicional; ao salvar, `slugExists` impede colisão e
   `createRedirect` grava o 301 automaticamente na tabela `redirects` já
   existente (aplicada de verdade pelo middleware). Testado manualmente:
   renomear persiste, URL antiga redireciona, colisão é rejeitada sem
   side-effect.

## Todas as páginas públicas fixas já estão no Editor Visual

Home, Quem Somos, Contato, Política de Privacidade, Serviços (moldura +
individuais) e Conteúdos (listagem + matérias individuais) — todas com os
4 pontos de entrada (Editar conteúdo / Editor visual / Aparência /
Configurações) e aparecendo automaticamente em Conteúdo → Editor Visual →
Páginas. **Item 4 do escopo original está concluído.**

## Pendente — próxima tarefa exata

Continuar o **item 5** (gerenciamento completo de páginas). Já feito nesta
rodada: renomear slug com redirect 301, criar/duplicar serviço e matéria,
thumbnail nas duas listagens, submenu de Serviços no cabeçalho tornado
dinâmico. O que falta, em ordem de prioridade sugerida:

- **Excluir com confirmação forte** — hoje só existe "arquivar"
  (soft delete via status), o que já é seguro; avaliar se "excluir de
  verdade" é realmente necessário ou se arquivar já satisfaz o pedido.
- **Ordem no menu** — os 5 itens fixos do cabeçalho (Início/Quem Somos/
  Serviços/Conteúdos/Contato) continuam em ordem fixa em
  `src/data/site.ts` (`mainNav`); só o SUBMENU de Serviços já é dinâmico
  (ordem = `display_order`, editável ao arrastar em `/admin/servicos`).
  Reordenar os 5 itens fixos do topo não foi implementado — avaliar se
  vale a pena (são só 5 itens, mudam raramente).
- **Thumbnails** — já adicionado em `/admin/servicos` e já existia em
  `/admin/conteudos`; ainda falta nos hubs `/admin/editor/servicos` e
  `/admin/editor/materias` (listas secundárias, menor prioridade).
- **"Adicionar página" genérica (em branco ou por modelo)** — **decisão
  de arquitetura pendente, não uma tarefa mecânica**: hoje cada página
  institucional fixa é uma rota `.astro` própria (`src/pages/*.astro`)
  com conteúdo em uma linha da tabela `pages` (por `slug`). Não existe
  mecanismo para o usuário criar uma página TOTALMENTE NOVA (ex.: "Nossa
  História") sem um desenvolvedor adicionar um novo arquivo de rota.
  Implementar isso de verdade exigiria um construtor de páginas genérico
  (rota catch-all, ex. `src/pages/paginas/[slug].astro`, mais um modelo de
  conteúdo em blocos e uma tabela própria de "páginas custom") — uma
  escolha de design que molda tudo o que vem depois (itens 5, 8, 9). Isto
  é candidato a ser tratado como "decisão que mudaria materialmente o
  resultado" — vale confirmar com o usuário o formato desejado antes de
  construir, em vez de adivinhar.

Depois do item 5 (ou em paralelo, conforme prioridade), os itens ainda não
iniciados são:

- **Item 6** — biblioteca visual completa na barra lateral do Editor
  Visual (Texto/Imagens/Vídeos/Uploads/Ícones/Formas/Fundos/Camadas/
  Organogramas/Modelos). Hoje existe parcialmente (Adicionar
  elemento: texto/imagem/vídeo/ícone/forma; uploads via `/admin/midia`)
  mas sem os painéis dedicados de "Organogramas" e "Modelos".
- **Item 7** — biblioteca de ícones de saúde pesquisável (hoje existe
  `iconPaths`/`/admin/icones`, mas revisar cobertura completa da lista
  pedida: médicos, enfermagem, pacientes, hospitais, UTI, ambulância,
  telemedicina etc.).
- **Item 8** — organogramas/fluxogramas (Fabric.js permitido só nesta
  área livre, nunca nas páginas semânticas).
- **Item 9** — modelos prontos (apresentação institucional, auditoria
  concorrente, indicadores hospitalares, missão/visão/valores, equipe,
  organograma, fluxo assistencial, etapas de auditoria, CTA).
- **Item 10** (contínuo) — manter a disciplina de qualidade/segurança já
  seguida até aqui em todo trabalho futuro.

## Como continuar

- Ambiente de teste isolado: `npm run test:ui:isolated:init` (cria cópia
  em `.testing/isolated-wrangler-state`, porta 4322) →
  `npm run dev:isolated` (ou usar `preview_start` com o nome
  `essencial-saude-test` do `.claude/launch.json`) → criar um usuário
  admin de teste com `node scripts/create-user.mjs` + `wrangler d1
  execute ... --local --persist-to .testing/isolated-wrangler-state` →
  ao terminar, `npm run test:ui:isolated:discard`.
- **Nunca** usar `--remote` em nenhum comando `wrangler d1`.
- QA completo: `npm run qa`.
- Commits pequenos e coerentes, sempre `git push origin
  feature/editor-visual` — nunca mexer em `main`.
