# Changelog

Formato: mudanças relevantes por entrega.

## [0.1.1] — 2026-08-21 — Conteúdo institucional oficial

Incorporação do material institucional oficial ("Resumo da Essencial Saúde
Auditoria.pdf"), recebido após a entrega inicial da Etapa 1.

### Adicionado
- Logomarca oficial extraída do PDF em alta resolução, com fundo transparente
  (`public/logo/essencial-saude-logo.png` e `essencial-saude-mark.png`), substituindo
  a assinatura provisória em `Logo.astro`; placa clara automática atrás do ícone
  quando exibido sobre fundos escuros (rodapé, sidebar do CMS, login), preservando o
  contraste sem alterar a arte fornecida.
- Favicon e apple-touch-icon reais, gerados a partir do ícone oficial (`favicon-32.png`,
  `favicon-192.png`, `favicon-512.png`, `apple-touch-icon.png`), substituindo o SVG
  placeholder; imagem Open Graph padrão passou a embutir o ícone oficial.
- Missão, visão e os 4 valores reais (Assistência Centrada no Paciente, Rigor e
  Assertividade Técnica, Parceria Colaborativa, Integridade e Transparência) em
  `src/data/institutional.ts`, substituindo o conjunto provisório de 6 valores.
- Nova seção `clientSegments` com a segmentação oficial de clientes (Operadoras de
  Saúde, Pacientes Particulares, Embaixadas e Consulados, Seguradoras Internacionais,
  Cartões de Desconto, Corporações e Órgãos Públicos) e o comportamento de compra de
  cada perfil; exibida em cartões na página Quem Somos.
- Detalhamento técnico real incorporado aos 6 serviços: visitas técnicas presenciais
  in loco, dupla checagem por auditores/médicos/enfermeiros, metodologia DRG e
  software de gestão da jornada do paciente, Análise de Causa Raiz (ACR) e planos de
  ação em prazos definidos, ferramentas tecnológicas de transparência em tempo real,
  eventos iatrogênicos específicos (infecções, quedas, lesões por pressão), OPME e
  exames excessivos como exemplo de desperdício, e o vínculo entre segurança
  assistencial e a redução de NIPs com impacto no IGR da ANS.
- "Cartão de Desconto", "Cooperativa Médica" e "Medicina de Grupo" adicionados às
  opções de tipo de organização do formulário de contato.

### Alterado
- Texto institucional de "Quem Somos" e a descrição padrão da empresa (SEO/JSON-LD)
  reescritos a partir do posicionamento oficial do PDF.

## [0.1.0] — 2026-08-21 — Etapa 1 (frontend / visual)

### Adicionado
- Projeto Astro 7 + TypeScript estrito, com lint (ESLint + Prettier), typecheck e build.
- Design system próprio: tokens de cor, tipografia, espaçamento, raio, sombra e movimento.
- Família única de ícones SVG (~90 ícones) e marca provisória em SVG.
- Site público completo: Home, Quem Somos, Serviços, 6 páginas de serviço,
  Conteúdos, artigo, Contato, Política de Privacidade e 404.
- Header com submenu, drawer mobile acessível, rodapé completo e WhatsApp flutuante
  com mensagem contextual por página.
- Diagrama do modelo Essencial em HTML+CSS (horizontal no desktop, vertical no mobile).
- Formulário central com validação no cliente, máscara, contador, estados de erro,
  carregamento e sucesso — envio simulado localmente, sem rede.
- Esqueleto visual do CMS com 17 telas, incluindo editores de Home, serviço e matéria.
- Fixtures tipadas em `src/data/` definindo o contrato de dados da Etapa 2.
- SEO estrutural: canonical, Open Graph, JSON-LD (Organization, WebSite, Service,
  Article, BreadcrumbList), sitemap sem `/admin`, robots.txt e `noindex` no painel.
- Artes institucionais em SVG geradas por `scripts/gen-images.py`.
- Documentação: README, ARCHITECTURE, DESIGN-SYSTEM, ETAPA-1-ENTREGA, ETAPA-2-PENDENCIAS.

### Corrigido durante o QA
- Overflow horizontal das tabelas do painel em telas estreitas.
- Contrastes abaixo de WCAG 2.2 AA no painel, no hero e na numeração de etapas.
- Contagem dos filtros do blog em relação à grade exibida.
- Campos administrativos sem rótulo acessível e link decorativo em card de matéria.
- Abertura do menu mobile sem depender de `requestAnimationFrame`.

### Não incluído (Etapa 2)
Backend, Cloudflare D1/R2/Turnstile, autenticação, sessões, RBAC, persistência,
upload real, sitemap dinâmico, redirects 301 reais, audit log real e deploy.
