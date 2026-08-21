# Etapa 1 — relatório de entrega

Data: 21/08/2026 · Escopo: **frontend completo + esqueleto visual do CMS**.
Sem backend, sem banco, sem autenticação real, sem upload, sem persistência.

---

## 1. Site público (14 páginas)

| Página | Rota | Conteúdo |
| --- | --- | --- |
| Home | `/` | Hero, proposta de valor, diagrama do modelo, serviços, Auditoria Concorrente em destaque, Gestão Hospitalar, benefícios, como atuamos, qualificação da rede, missão/visão/valores, para quem atuamos, conteúdos recentes, CTA final, formulário e dados de contato |
| Quem Somos | `/quem-somos` | Apresentação, princípios, diagrama do modelo, como atuamos, MVV, público, serviços |
| Serviços | `/servicos` | Os 6 serviços, metodologia e público |
| Auditoria Concorrente | `/servicos/auditoria-concorrente` | Serviço em destaque, com 4 blocos técnicos |
| Auditoria de Contas Hospitalares | `/servicos/auditoria-de-contas-hospitalares` | Escopo, justificativa técnica, sustentabilidade contratual |
| Gestão da Jornada do Paciente | `/servicos/gestao-da-jornada-do-paciente` | Nível de atenção, continuidade, desospitalização |
| Gestão Hospitalar | `/servicos/gestao-hospitalar` | Processos, qualidade, eficiência, integração |
| Qualificação da Rede | `/servicos/qualificacao-da-rede-prestadora` | Evidências, não conformidades, causa raiz, planos de ação |
| Segurança e Qualidade | `/servicos/seguranca-e-qualidade-assistencial` | Barreiras, notificação, indicadores |
| Conteúdos | `/conteudos` | Destaque, filtros por categoria, busca, estado vazio |
| Artigo | `/conteudos/[slug]` | 6 matérias, sumário, compartilhamento, autor, relacionados |
| Contato | `/contato` | Canais, formulário completo, endereço, privacidade |
| Política de Privacidade | `/politica-de-privacidade` | 13 seções em conformidade com a LGPD |
| 404 | `/404` | Identidade preservada, atalhos, serviços e conteúdos |

Cada página de serviço tem: hero com imagem, 4 destaques, blocos técnicos, "o que
entregamos", "para quem", CTA de WhatsApp contextual, formulário com o serviço
pré-selecionado, outros serviços e `Schema.org/Service`.

Elementos globais: header com submenu de serviços, drawer mobile acessível, rodapé
completo, WhatsApp flutuante (mensagem contextual por página), CTAs, breadcrumbs,
microinterações e revelação progressiva ao rolar.

## 2. CMS visual (17 telas)

`/admin/login` · dashboard · páginas · **editor da Home por seções** · serviços ·
**editor de serviço (4 abas: conteúdo, blocos, mídia, SEO)** · matérias ·
**editor de matéria com barra de blocos e pré-visualização de SERP** · categorias ·
autores · mídia (galeria, dropzone e modal de detalhe) · contatos ·
**detalhe do contato com ações e histórico** · SEO (metadados, redirecionamentos,
SEO técnico) · configurações (empresa, site, WhatsApp, redes, marca) · usuários
(com matriz RBAC) · logs.

Padrões implementados: tabelas com busca e filtro funcionando localmente, paginação,
estados vazios, modais, toasts, abas, formulários administrativos, upload simulado e
aviso permanente de que os dados são de demonstração.

## 3. Formulários

Um componente central (`ContactForm.astro`) em duas variantes:
completa (contato) e comercial (Home e páginas de serviço).

Campos: nome, empresa/organização, cargo, e-mail, telefone/WhatsApp, tipo de
organização (11 opções), serviço de interesse (vindo do cadastro de serviços),
assunto, mensagem e consentimento LGPD — mais `origem` (página) e honeypot ocultos.

Validação no cliente com mensagens específicas, máscara de telefone, contador de
caracteres, foco no primeiro erro, bloqueio de reenvio, estado de carregamento e
painel de sucesso que exibe o payload que **seria** enviado. Nenhuma requisição de
rede é feita — verificado no monitor de rede do navegador.

## 4. Testes executados

| Verificação | Resultado |
| --- | --- |
| `npm run lint` (ESLint + Prettier) | ✅ sem erros |
| `npm run typecheck` (`astro check`, 49 arquivos) | ✅ 0 erros, 0 avisos |
| `npm run build` | ✅ 46 páginas |
| Scroll horizontal em 320/360/375/390/412/430/768/1024/1280/1440/1920 px | ✅ 0 ocorrências em 153 combinações página × largura |
| Links internos (47 destinos) | ✅ todos respondem 200 |
| Imagens | ✅ todas carregam; todas com `alt` e dimensões |
| Formulário: envio vazio | ✅ 8 campos marcados, alerta exibido, envio bloqueado |
| Formulário: e-mail inválido, máscara, contador | ✅ mensagens e formatação corretas |
| Formulário: envio válido | ✅ carregando → sucesso → "preencher novamente"; **0 requisições de rede** |
| Menu: submenu desktop, ESC, clique fora | ✅ |
| Menu mobile: abertura, foco preso, ESC, trava de rolagem | ✅ |
| Blog: filtro por categoria, busca, estado vazio, limpar | ✅ contagens coerentes com a grade |
| CMS: busca e filtro em tabelas, abas, modais, toasts, sidebar mobile | ✅ |
| CMS: formulários administrativos | ✅ não navegam e apenas emitem toast |
| Login: validação e mostrar/ocultar senha | ✅ |
| WhatsApp (`wa.me` + mensagem codificada) | ✅ com `target="_blank"` e `rel="noopener"` |
| Contraste WCAG 2.2 AA (15 páginas, todos os textos visíveis) | ✅ 0 pares abaixo do mínimo após correções |
| Hierarquia de títulos e `<h1>` único | ✅ |
| SEO do build: canonical, OG, JSON-LD, sitemap sem `/admin`, `noindex` no painel | ✅ |

Correções aplicadas durante o QA: overflow das tabelas do painel (`min-width: 0` na
cadeia de grid), contraste do rótulo da sidebar, do contador de contatos, do tom de
alerta, da numeração de etapas e do eyebrow do hero; contagem dos filtros do blog;
link decorativo do card de matéria; campos sem rótulo no editor da Home; abertura do
menu mobile sem depender de `requestAnimationFrame`.

**Limitação do QA:** o painel de visualização do navegador não estava disponível nesta
sessão, então não há capturas de tela. A validação visual foi feita por medição direta
no DOM (geometria, overflow, contraste calculado, estados e interações). Uma passada
visual humana antes do go-live continua recomendada.

## 5. Conteúdo — o que é real e o que é provisório

**Real, extraído de "Resumo da Essencial Saúde Auditoria.pdf"** (material
institucional oficial recebido em 21/08/2026): nome, e-mail, telefone/WhatsApp,
endereço completo, posicionamento, missão, visão, os 4 valores, a segmentação e o
comportamento dos 6 perfis de cliente, o detalhamento técnico dos 6 serviços (visitas
técnicas in loco, dupla checagem, metodologia DRG, software de gestão da jornada,
ACR, NIPs/IGR da ANS, OPME) e **a logomarca oficial**, recortada em alta resolução a
partir do PDF (`public/logo/`) — ver `src/data/institutional.ts` para o texto-fonte de
cada bloco.

**Ainda de demonstração:** as 6 matérias do blog (conteúdo educativo genérico,
sinalizado como demo na página do artigo) — o PDF pede o espaço de publicação, mas não
fornece matérias específicas.

**Não inventado:** clientes, números, percentuais, economia, cases, depoimentos,
certificações, premiações e tempo de mercado. As estruturas existem no CMS e
permanecem ocultas até haver dado real.

## 6. Como testar

```bash
npm install
npm run dev
```

Acesse <http://localhost:4321> (site) e <http://localhost:4321/admin/login> (painel —
qualquer credencial em formato válido abre a demonstração). Para revisar como ficará em
produção: `npm run build && npm run preview`.
