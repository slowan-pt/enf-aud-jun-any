# Design System — Essencial Saúde Auditoria

Fonte única: [`src/styles/tokens.css`](src/styles/tokens.css). Nenhum valor de cor,
espaçamento, raio ou sombra deve ser escrito diretamente em componentes.

## 1. Cor

### Azul institucional (marca)

| Token | Hex | Uso |
| --- | --- | --- |
| `--c-brand-950` | `#041526` | Rodapé, sidebar do CMS |
| `--c-brand-900` | `#06203a` | Seções escuras, hero |
| `--c-brand-800` | `#092c4e` | Marca, títulos fortes |
| `--c-brand-700` | `#0d3d69` | Hover de botão primário |
| `--c-brand-600` | `#12558e` | Botão primário, links, eyebrow |
| `--c-brand-500` | `#1a6faf` | Ícones, numeração de etapas |
| `--c-brand-300/200/100/50` | — | Bordas, fundos suaves, estados |

### Complementar (cuidado / saúde)

`--c-accent-700 #0a6f65` · `--c-accent-600 #0d8b7d` · `--c-accent-500 #12a794` ·
`--c-accent-300 #6fd0c2` · `--c-accent-100/50` — usada com parcimônia: detalhes,
ícones de confirmação, CTA de WhatsApp e destaques sobre fundo escuro.

### Neutros e estados

`--c-ink-900…50` para texto e superfícies; `--c-success-600`, `--c-warning-600`,
`--c-danger-600` para estados. **Todos os pares texto/fundo em uso foram medidos e
atendem WCAG 2.2 AA** (4.5:1 texto normal, 3:1 texto grande).

### Papéis semânticos

`--bg`, `--bg-subtle`, `--bg-brand`, `--text`, `--text-strong`, `--text-muted`,
`--text-faint`, `--line`, `--focus`. Prefira sempre o papel semântico à cor bruta.

## 2. Tipografia

- **Display:** Sora Variable — títulos, números, marca.
- **Texto:** Inter Variable — corpo, interface, formulários.
- Escala fluida com `clamp()`: `--fs-xs` … `--fs-4xl`.
- Alturas de linha: `--lh-tight` (títulos) · `--lh-normal` (texto) · `--lh-relaxed` (leitura longa).
- `eyebrow`: 12px, maiúsculas, `letter-spacing: 0.14em`, precedido de traço curto.

## 3. Espaçamento, container e grade

- Escala base 4px: `--sp-1` … `--sp-32`.
- Ritmo vertical de seção: `--section-y` (`clamp(3.5rem, 6vw, 7rem)`) e `--section-y-sm`.
- Containers: `--container-max 1200px`, `--container-wide 1360px`, `--container-narrow 760px`.
- Gutter fluido: `--gutter` (`clamp(1.125rem, 4vw, 2.5rem)`).
- Utilitários: `.grid--2/3/4`, `.split`, `.split--media-first`, `.cluster`, `.stack`.

## 4. Breakpoints

`480 · 560 · 640 · 700 · 760 · 820 · 900 · 940 · 1000 · 1024 · 1040 · 1100 · 1280`
(mobile-first; cada componente só declara os pontos de que precisa).

Validado em 320, 360, 375, 390, 412, 430, 768, 1024, 1280, 1440 e 1920 px.

## 5. Raio, sombra e movimento

- Raio: `--r-xs 4` · `--r-sm 6` · `--r-md 10` · `--r-lg 16` · `--r-xl 24` · `--r-pill`.
- Sombra discreta e corporativa: `--shadow-xs/sm/md/lg` + `--shadow-focus` (anel de foco).
- Movimento: `--dur-fast 140ms` · `--dur 220ms` · `--dur-slow 420ms`, com `--ease` e `--ease-out`; tudo desligado sob `prefers-reduced-motion`.

## 6. Componentes

### Site público

| Componente | Arquivo | Observações |
| --- | --- | --- |
| Marca | `Logo.astro` | Ícone oficial (extraído do PDF institucional, `public/logo/`) + wordmark em Sora |
| Ícones | `Icon.astro` | ~90 ícones, traço 1.75, grade 24×24 |
| Cabeçalho | `Header.astro` | Topbar, menu com submenu, drawer mobile com foco preso |
| Rodapé | `Footer.astro` | Institucional, serviços, links, conteúdos, contato |
| WhatsApp flutuante | `WhatsAppFloat.astro` | Tooltip, pulso, área segura do iOS, mensagem contextual |
| Hero interno | `PageHero.astro` | Breadcrumbs + título + imagem |
| Diagrama do modelo | `EloDiagram.astro` | HTML+CSS puro; horizontal no desktop, vertical no mobile |
| Processo | `ProcessSteps.astro` | 6 etapas com trilho e numeração |
| Cards | `ServiceCard.astro`, `PostCard.astro` | Área clicável ampliada (`.stretched-link`) |
| Faixa de CTA | `CtaBand.astro` | Fundo em gradiente da marca |
| Formulário | `ContactForm.astro` | Variantes `full` e `commercial` |
| Breadcrumbs | `Breadcrumbs.astro` | Emite `BreadcrumbList` (Schema.org) |

Classes base: `.btn` (`--secondary`, `--ghost`, `--accent`, `--on-brand`,
`--outline-on-brand`, `--sm`, `--lg`, `--block`), `.card`, `.badge`, `.icon-badge`,
`.check-list`, `.figure`, `.media-frame`, `.prose`, `.eyebrow`, `.section--brand`.

### CMS (`src/styles/admin.css`)

`.aside` (sidebar) · `.topbar-admin` · `.panel` · `.stat` · `.toolbar` · `.table` ·
`.pagination` · `.empty-state` · `.tabs` · `.modal` · `.toast` · `.dropzone` ·
`.media-grid` · `.editor-toolbar` / `.editor-area` · `.form-section`.

## 7. Formulários

Estados cobertos: neutro, preenchido válido, **erro** (borda, ícone e mensagem),
**carregando** (rótulo + bloqueio de reenvio) e **sucesso** (painel dedicado).
Campos com rótulo visível, `aria-describedby` para mensagens de erro,
`aria-invalid`, alvo de toque mínimo de 44px e máscara de telefone brasileira.

## 8. Regras de uso

1. Cor, espaçamento e raio **sempre** por token.
2. Um único acento por bloco visual — o azul conduz, o verde-azulado pontua.
3. Ícones sempre da família única; nunca emojis como ícone.
4. Nada de sombra pesada, neon ou gradiente exagerado.
5. Toda imagem precisa de `alt` significativo (ou `alt=""` quando decorativa) e de `width`/`height`.
6. Nenhum dado institucional (telefone, e-mail, endereço) fora de `src/data/site.ts`.
