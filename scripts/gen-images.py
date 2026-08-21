# -*- coding: utf-8 -*-
"""
Gerador das artes SVG do site (ETAPA 1).

Não há banco de imagens fotográficas disponível nesta etapa. Para que o site
não fique sem imagem, as composições institucionais são geradas em SVG, com a
mesma gramática visual (paleta da marca, malha de pontos, cartões translúcidos,
traço de 6px e um motivo temático por página).

Todas são substituíveis pelo CMS na Etapa 2 (Mídia > upload) sem alterar layout:
mesma proporção 4:3 (1200x900) e mesmo enquadramento.

Uso:  python scripts/gen-images.py
"""
import os

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "images")
os.makedirs(OUT, exist_ok=True)

BRAND_950 = "#041526"
BRAND_900 = "#06203a"
BRAND_800 = "#092c4e"
BRAND_700 = "#0d3d69"
BRAND_600 = "#12558e"
BRAND_400 = "#2f8ecd"
BRAND_200 = "#a8d3ef"
BRAND_100 = "#d7eaf8"
BRAND_50 = "#eff7fd"
ACCENT = "#12a794"
ACCENT_300 = "#6fd0c2"
WHITE = "#ffffff"

# motivos (paths em grade 24x24, do mesmo conjunto de ícones do site)
MOTIFS = {
    "pulse": "M2 12h4l2.5-6 4 12 2.5-6H22",
    "stethoscope": "M6 3v5a4 4 0 0 0 8 0V3 M10 12v2a5 5 0 0 0 5 5 4 4 0 0 0 4-4v-1.2",
    "clipboard": "M5 5h14v16H5z M9 11h6 M9 15h4",
    "route": "M8.5 6H14a3.5 3.5 0 0 1 0 7h-4a3.5 3.5 0 0 0 0 5h5.5",
    "building": "M4 21V8l8-5 8 5v13 M12 10v5 M9.5 12.5h5",
    "network": "M12 8v4 M5.5 16v-2a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v2",
    "shield": "M12 21s7-3.2 7-9V6l-7-3-7 3v6c0 5.8 7 9 7 9Z",
    "scale": "M12 4v16 M7 20h10 M5 8h14 M5 8 2.5 14h5Z M19 8l-2.5 6h5Z",
    "layers": "m12 3 8.5 4.5L12 12 3.5 7.5Z M3.5 12 12 16.5 20.5 12",
    "handshake": "m6 15.5 3 2.5 1.5-1.3L12 18l1.5-1.3L15 18l3-2.5 M11 8 8.8 6.5a2 2 0 0 0-2.3 0L3 9v6 M13 8l2.2-1.5a2 2 0 0 1 2.3 0L21 9v6",
}


def head(dark):
    if dark:
        return f"""  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{BRAND_950}"/>
      <stop offset="0.55" stop-color="{BRAND_800}"/>
      <stop offset="1" stop-color="{BRAND_600}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.78" cy="0.18" r="0.62">
      <stop offset="0" stop-color="{ACCENT}" stop-opacity="0.45"/>
      <stop offset="1" stop-color="{ACCENT}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.6" fill="{WHITE}" fill-opacity="0.16"/>
    </pattern>
  </defs>
  <rect width="1200" height="900" fill="url(#bg)"/>
  <rect width="1200" height="900" fill="url(#glow)"/>"""
    return f"""  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{BRAND_50}"/>
      <stop offset="1" stop-color="{BRAND_100}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.82" cy="0.14" r="0.6">
      <stop offset="0" stop-color="{ACCENT_300}" stop-opacity="0.45"/>
      <stop offset="1" stop-color="{ACCENT_300}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.6" fill="{BRAND_600}" fill-opacity="0.16"/>
    </pattern>
  </defs>
  <rect width="1200" height="900" fill="url(#bg)"/>
  <rect width="1200" height="900" fill="url(#glow)"/>"""


def composition(motif, dark, seed=0, ratio="4/3"):
    line = WHITE if dark else BRAND_700
    op_card = "0.08" if dark else "0.75"
    op_stroke = "0.20" if dark else "0.35"
    card_fill = WHITE
    dx = (seed % 3) * 26
    dy = ((seed // 3) % 3) * 22

    motif_path = MOTIFS[motif]
    parts = [
        # malha de pontos
        f'  <rect x="{70 + dx}" y="{520 - dy}" width="330" height="300" fill="url(#dots)"/>',
        # circunferências decorativas
        f'  <circle cx="{960 - dx}" cy="{230 + dy}" r="250" fill="none" stroke="{line}" stroke-opacity="{op_stroke}" stroke-width="2"/>',
        f'  <circle cx="{960 - dx}" cy="{230 + dy}" r="170" fill="none" stroke="{ACCENT}" stroke-opacity="0.5" stroke-width="2" stroke-dasharray="10 12"/>',
        # cartões translúcidos (referência ao sistema de cards do site)
        f'  <rect x="{120 + dx}" y="{150 + dy}" width="470" height="290" rx="28" fill="{card_fill}" fill-opacity="{op_card}" stroke="{line}" stroke-opacity="{op_stroke}"/>',
        f'  <rect x="{176 + dx}" y="{206 + dy}" width="180" height="16" rx="8" fill="{ACCENT}" fill-opacity="0.85"/>',
        f'  <rect x="{176 + dx}" y="{248 + dy}" width="356" height="12" rx="6" fill="{line}" fill-opacity="{op_stroke}"/>',
        f'  <rect x="{176 + dx}" y="{278 + dy}" width="300" height="12" rx="6" fill="{line}" fill-opacity="{op_stroke}"/>',
        f'  <rect x="{176 + dx}" y="{308 + dy}" width="244" height="12" rx="6" fill="{line}" fill-opacity="{op_stroke}"/>',
        f'  <rect x="{176 + dx}" y="{356 + dy}" width="110" height="40" rx="20" fill="{ACCENT}" fill-opacity="0.9"/>',
        # cartão menor deslocado
        f'  <rect x="{620 + dx}" y="{500 - dy}" width="430" height="250" rx="26" fill="{card_fill}" fill-opacity="{op_card}" stroke="{line}" stroke-opacity="{op_stroke}"/>',
        f'  <rect x="{664 + dx}" y="{548 - dy}" width="150" height="14" rx="7" fill="{line}" fill-opacity="{op_stroke}"/>',
        f'  <rect x="{664 + dx}" y="{584 - dy}" width="320" height="10" rx="5" fill="{line}" fill-opacity="0.22"/>',
        f'  <rect x="{664 + dx}" y="{612 - dy}" width="268" height="10" rx="5" fill="{line}" fill-opacity="0.22"/>',
        # barra de indicadores (sem números — apenas ritmo visual)
        f'  <g fill="{ACCENT}" fill-opacity="0.8">'
        f'<rect x="{664 + dx}" y="{680 - dy}" width="26" height="34" rx="6"/>'
        f'<rect x="{706 + dx}" y="{664 - dy}" width="26" height="50" rx="6"/>'
        f'<rect x="{748 + dx}" y="{646 - dy}" width="26" height="68" rx="6"/>'
        f'<rect x="{790 + dx}" y="{628 - dy}" width="26" height="86" rx="6"/></g>',
        # motivo temático em traço grosso
        f'  <g transform="translate({820 - dx},{110 + dy}) scale(11.6)" fill="none" stroke="{ACCENT_300 if dark else BRAND_600}" '
        f'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.95">'
        f'<path d="{motif_path}"/></g>',
        # traço de pulso atravessando a base
        f'  <path d="M0 {820 - dy} H300 l40 -70 45 130 38 -60 H1200" fill="none" stroke="{ACCENT}" '
        f'stroke-opacity="{0.55 if dark else 0.45}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
    ]
    return "\n".join(parts)


def svg(name, motif, dark, seed=0):
    body = head(dark) + "\n" + composition(motif, dark, seed)
    content = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" width="1200" '
        'height="900" role="img" aria-hidden="true">\n' + body + "\n</svg>\n"
    )
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as fh:
        fh.write(content)
    return name


IMAGES = [
    ("hero-essencial.svg", "pulse", True, 0),
    ("proposta-de-valor.svg", "scale", False, 1),
    ("quem-somos.svg", "handshake", False, 2),
    ("contato.svg", "network", True, 3),
    ("servico-auditoria-concorrente.svg", "stethoscope", True, 1),
    ("servico-contas-hospitalares.svg", "clipboard", True, 2),
    ("servico-jornada-paciente.svg", "route", True, 3),
    ("servico-gestao-hospitalar.svg", "building", True, 4),
    ("servico-qualificacao-rede.svg", "network", True, 5),
    ("servico-seguranca-qualidade.svg", "shield", True, 6),
    ("post-auditoria-concorrente.svg", "stethoscope", False, 3),
    ("post-contas-hospitalares.svg", "clipboard", False, 4),
    ("post-jornada-paciente.svg", "route", False, 5),
    ("post-gestao-hospitalar.svg", "building", False, 6),
    ("post-seguranca-paciente.svg", "shield", False, 7),
    ("post-qualificacao-rede.svg", "layers", False, 8),
]

for item in IMAGES:
    print("gerado:", svg(*item))

# Favicon e apple-touch-icon: gerados a partir do ícone real do logotipo
# fornecido (ver public/logo/essencial-saude-mark.png), não por este script.
# Reexecutar o recorte apenas se o logotipo oficial for atualizado.

# ------------------------------------------------------- imagem Open Graph
import base64

with open(os.path.join(os.path.dirname(OUT), "logo", "essencial-saude-mark.png"), "rb") as fh:
    mark_b64 = base64.b64encode(fh.read()).decode("ascii")

og = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{BRAND_950}"/>
      <stop offset="1" stop-color="{BRAND_600}"/>
    </linearGradient>
    <radialGradient id="r" cx="0.85" cy="0.1" r="0.6">
      <stop offset="0" stop-color="{ACCENT}" stop-opacity="0.5"/>
      <stop offset="1" stop-color="{ACCENT}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <rect width="1200" height="630" fill="url(#r)"/>
  <g transform="translate(84,120)">
    <rect width="100" height="100" rx="22" fill="#ffffff" fill-opacity="0.12"/>
    <image x="8" y="8" width="84" height="84" href="data:image/png;base64,{mark_b64}"
           preserveAspectRatio="xMidYMid meet"/>
  </g>
  <text x="84" y="300" font-family="Sora, Segoe UI, sans-serif" font-size="62" font-weight="600"
        fill="#ffffff">Essencial Saúde Auditoria</text>
  <text x="84" y="366" font-family="Inter, Segoe UI, sans-serif" font-size="30"
        fill="#eaf3fb" fill-opacity="0.82">Gestão e auditoria em saúde · Brasília - DF</text>
  <text x="84" y="424" font-family="Inter, Segoe UI, sans-serif" font-size="24"
        fill="{ACCENT_300}" letter-spacing="3">SEGURANÇA DO PACIENTE · RIGOR TÉCNICO · SUSTENTABILIDADE</text>
  <path d="M0 540 H300 l40 -70 45 130 38 -60 H1200" fill="none" stroke="{ACCENT}"
        stroke-opacity="0.55" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
"""
with open(os.path.join(OUT, "og-default.svg"), "w", encoding="utf-8") as fh:
    fh.write(og)
print("gerado: og-default.svg")
