# Restaurar o projeto em um computador novo

Guia SEM segredos (este repositório é público). Os segredos e os dados reais ficam no HD externo,
em `F:\Segredos-Claude\Enfemagem` (ver o `RESTAURAR.md` que está lá).

Atualizado em 23/10/2026.

## 1. O que instalar
- **Git** e **GitHub CLI** (`gh`), com login na conta `slowan-pt` (`gh auth login`).
- **Node.js 22.13 ou mais novo** (o projeto foi usado com Node 24).
- **Claude Code** (para continuar a conversa; ver passo 5).
- Opcional: Python 3 + PyMuPDF/Pillow (só para converter PDF em imagens por script; o painel já faz isso no navegador).
- Opcional (app Android, pasta `mobile-app`, que NÃO está no Git): JDK 17/21 e Android SDK.

## 2. Clonar
O Claude guarda o histórico pelo caminho da pasta. O histórico deste projeto pertence à pasta
`C:\Users\Sloan\Desktop\Backup\junior-site-enfermagem` (a pasta PAI), e o repositório Git do site
é a subpasta `auditoriaenf`. Portanto:

```powershell
mkdir C:\Users\Sloan\Desktop\Backup\junior-site-enfermagem
cd C:\Users\Sloan\Desktop\Backup\junior-site-enfermagem
git clone https://github.com/slowan-pt/enf-aud-jun-any.git auditoriaenf
cd auditoriaenf
```

Todos os comandos abaixo rodam dentro de `auditoriaenf` (onde está o `package.json`).

## 3. Instalar e testar
```powershell
npm install
npx astro check      # tipos: deve dar 0 errors
npx vitest run       # testes: devem passar (339 no último teste)
npm run dev          # site local em http://localhost:4321 (copia as bibliotecas de public/vendor sozinho)
```

## 4. Logins que precisam ser refeitos
| Onde | Como |
|---|---|
| GitHub | `gh auth login` (conta `slowan-pt`) |
| Cloudflare (Wrangler) | `npx wrangler login` (conta dona do domínio e do Worker) |
| Cloudflare (painel) | https://dash.cloudflare.com |
| Resend (e-mails do site) | https://resend.com |
| UOL (e-mail institucional) | webmail `pro.suite.uol` |
| Painel do site | https://essencialsaudeauditoria.com.br/admin/login (não há link no site) |

### Segredos do Worker (a Cloudflare não permite exportar; precisam ser gravados de novo)
```powershell
npx wrangler secret put RESEND_API_KEY -c wrangler.nova.jsonc        # chave do Resend (gere uma nova se perdeu)
npx wrangler secret put CLOUDFLARE_API_TOKEN -c wrangler.nova.jsonc  # token só com "Zona > Análise > Lido"
npx wrangler secret put CLOUDFLARE_ZONE_ID -c wrangler.nova.jsonc    # ID da zona (aparece na Visão geral do domínio)
```
O script `scripts/configurar-analytics.ps1` faz os dois últimos (pede o token sem mostrar na tela).
Local: coloque os mesmos valores em `.dev.vars` (ignorado pelo Git). Veja `.env.example`.

## 5. Recuperar a conversa com o Claude
Depois de clonar no caminho acima, copie a pasta do histórico (guardada no HD) para o perfil do Claude:

```powershell
Copy-Item -Recurse -Force "F:\Segredos-Claude\Enfemagem\claude-historico\projects\C--Users-Sloan-Desktop-Backup-junior-site-enfermagem" "$env:USERPROFILE\.claude\projects\"
Copy-Item "F:\Segredos-Claude\Enfemagem\claude-historico\CLAUDE.md-global.md" "$env:USERPROFILE\.claude\CLAUDE.md"
cd C:\Users\Sloan\Desktop\Backup\junior-site-enfermagem   # a pasta PAI de auditoriaenf
claude --resume
```

## 6. Publicar o site
```powershell
npm run deploy:nova     # build + deploy do Worker "essencial-saude-nova"
```
Domínios ligados pelo próprio deploy: `essencialsaudeauditoria.com.br`, `www`, e `essencialsaudeauditoria.online` (redireciona).
Banco D1 `clone-estratagema-claude-db` e bucket R2 `essencial-saude-nova-media` (ids/nomes em `wrangler.nova.jsonc`).
Migrações novas: `npx wrangler d1 execute clone-estratagema-claude-db --remote -c wrangler.nova.jsonc --file migrations/00NN_nome.sql`
(até a 0014 já aplicadas em produção).

## 7. Estado atual do projeto (23/10/2026)
- **Site**: Astro (SSR) em Cloudflare Workers, D1 e R2. Código no GitHub, `main` = produção.
- **Painel** (`/admin`): páginas e Editor Visual, matérias, comentários e inscritos (newsletter), Portfólio
  (pedidos aprovados por e-mail + envio de PDF novo, que o navegador converte em revista), Pop-up do site,
  Textos do site (rodapé, botão do topo, etc.), Estatísticas do Site (Cloudflare GraphQL Analytics, só admin).
- **Portfólio**: página pública `/portfolio` com revista (modo HTML nítido, zoom por clique/pinça, setas laterais,
  dica animada). PDF para download só por link aprovado (7 dias).
- **E-mail institucional** `contato@essencialsaudeauditoria.com.br` no **UOL Suite**. DNS na Cloudflare:
  MX `mx001..mx004.uolhost.xion.oxcs.net` (prioridade 10); SPF
  `v=spf1 include:spf30.oxsus-vadesecure.net include:oxsus-vadesecure.net include:spf.whservidor.com ~all`;
  DMARC `v=DMARC1; p=none`; DKIM do Resend (`resend._domainkey`) e CNAMEs `send`/`rsend` (Resend). Email Routing da Cloudflare foi desativado.
- **Avisos** de contato, currículo e Portfólio saem pelo Resend, para o e-mail cadastrado em Configurações.
- **App Android** (`mobile-app/`, fora do Git): keystore e senhas ficam só no HD externo.

### Pendências conhecidas
- DKIM próprio do domínio no UOL (o DKIM atual é do UOL; DMARC passa pelo SPF).
- O SPF usa servidores de envio observados nos cabeçalhos; se o UOL trocar de servidor e o SPF falhar, ajustar.
- Dois pedidos de teste antigos ("Teste Auto" e "Sloan Teste") continuam em `/admin/portfolio`.
- Opcional: tirar a permissão "Zona > Leitura" do token de Analytics (só serviu para achar o ID da zona).

## 8. O que NÃO está neste repositório
Segredos (chaves, tokens, keystore do app), dados reais (banco de produção, mídia, currículos), histórico do Claude,
pasta `mobile-app/`, `node_modules`, `dist`, `.wrangler`, `.astro`, `public/vendor` (gera sozinho no `npm install`/`npm run dev`).
