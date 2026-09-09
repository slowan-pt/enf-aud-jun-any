# Continuidade - Editor Visual

Checkpoint operacional sem segredos, atualizado em 2026-09-09.

## Estado final

- Implementacao concluida na branch `feature/editor-visual`.
- Codigo entregue no commit `d1d96fb` (`Completa ciclo de arquivamento de organogramas`).
- `origin/main` e `origin/feature/editor-visual` apontam para `d1d96fb` antes deste checkpoint documental.
- Tag anotada de restauracao: `pre-deploy-editor-visual-20260909`.
- Worker publicado em `https://essencial-saude.slowgithub.workers.dev`.
- Versao ativa do Worker: `f82bdaf2-eb1e-4d8a-b2f3-b992ae6b343b`.
- Versao anterior, preservada para rollback: `bef7c211-a1d5-4a62-a038-d90cac607e8c`.

## Entrega

- Paginas genericas com criacao em branco ou por modelo, edicao, duplicacao,
  publicacao, arquivamento, restauracao e exclusao definitiva com confirmacao
  forte.
- Slugs editaveis com redirecionamento permanente da URL anterior.
- Rota publica catch-all para paginas genericas publicadas.
- Menu principal administravel, hierarquico e ordenavel, com protecao contra
  ciclos e fallback estatico.
- Editor visual responsivo com desktop/celular, camadas, undo/redo, texto,
  imagem, video, icone, forma, modelos de secao e integracao com a biblioteca
  de midia. Imagens exigem texto alternativo.
- Editor e bibliotecas pesadas continuam ausentes do HTML publico anonimo.
- Organogramas e fluxogramas com modelos, exportacao PNG, arquivamento,
  restauracao e exclusao definitiva confirmada pelo titulo.
- Protecao CSRF/origem aplicada a mutacoes administrativas.

## Banco de producao

As migracoes aditivas abaixo foram aplicadas com sucesso ao D1 remoto:

- `migrations/0007_generic_pages_navigation.sql`
- `migrations/0008_seed_fixed_navigation.sql`

Validacao final somente leitura:

- `pages`: 5
- `navigation_items`: 5
- `users`: 2
- `media`: 10
- `services`: 6
- `posts`: 6
- `redirects`: 0
- `PRAGMA foreign_key_check`: sem resultados

As contagens existentes de usuarios, midias, servicos e materias foram
preservadas durante as migracoes.

## Backups

- D1 completo: `.backups/d1-production-20260908-235258.sql`
  - 99.737 bytes
  - SHA-256: `F5214214D37CF9ACF54EA828BCD4D3017F535DACD528A15C20DC27F12B8DF03C`
- R2 completo: `.backups/r2-production-20260908-235258/`
  - 10 objetos
  - 73.213.508 bytes
  - hashes individuais em `manifest.json`

`.backups/` esta ignorado pelo Git. O deploy nao alterou objetos do R2.

## Verificacao

`npm run qa` passou no commit implantado:

- lint e Prettier aprovados;
- Astro check com 0 erros e 0 avisos;
- 22 arquivos de teste, 275 testes aprovados;
- build de producao aprovado;
- `wrangler deploy --dry-run` aprovado.

O fluxo completo de edicao foi exercitado em D1 isolado: criacao, modelo,
texto, forma, imagem e alt, undo/redo, modos desktop/celular, persistencia,
publicacao, alteracao de slug e redirecionamento 301. O ambiente isolado foi
descartado ao final.

Smoke test no Worker publicado:

- Home, Quem Somos, Servicos, Conteudos, Contato, Politica de Privacidade,
  servico e materia representativos: HTTP 200.
- Rota inexistente: HTTP 404.
- Areas administrativas anonimas: HTTP 302 para `/admin/login`.
- POST administrativo com origem externa: HTTP 403.
- Objeto real do R2 com range: HTTP 206 e `video/mp4`.
- Navegador sem erros ou avisos de console.
- Menu dinamico renderizado e breakpoints de 768, 390 e 375 px verificados.
- Logs ao vivo do Worker: resultado `ok`, sem excecoes, na versao ativa.

## Limitacoes externas

O dominio `https://essencialsaudeauditoria.com.br` ainda nao esta roteado para
este Worker: a raiz responde 200 por outra publicacao, mas `/quem-somos` e as
demais rotas respondem 404. Nenhuma alteracao de DNS ou rota foi feita sem uma
configuracao comprovada. Ate esse roteamento ser configurado, a URL publicada
e validada e a URL `workers.dev` acima.

Nao foram feitas mutacoes editoriais no banco de producao durante o smoke
test. Por isso, telas administrativas autenticadas e uma pagina generica nova
foram validadas no ambiente isolado; em producao foi validado o redirecionamento
anonimo, evitando criar dados artificiais ou solicitar credenciais.

## Rollback

Se houver regressao grave no codigo, reverter imediatamente o Worker para a
versao anterior:

```powershell
npx wrangler rollback bef7c211-a1d5-4a62-a038-d90cac607e8c
```

O rollback do Worker nao desfaz schema do D1. As migracoes sao aditivas e
compativeis com o codigo anterior; nao remover tabelas ou colunas. Se uma
restauracao de dados for realmente necessaria, preservar primeiro o estado
atual e usar o export completo de D1 acima ou o Time Travel do Cloudflare D1.
Restauracao destrutiva deve ser tratada como operacao separada e revisada.

## Comandos uteis

```powershell
npm run qa
npx wrangler deployments list
npx wrangler tail --format json
```
