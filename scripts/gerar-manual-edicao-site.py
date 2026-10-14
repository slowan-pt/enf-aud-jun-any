from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "manual-edicao-site-essencial-saude-worker.pdf"
ASSET = ROOT / "public" / "favicon-192.png"
SITE_URL = "https://essencial-saude-nova.slowgithub.workers.dev"

BRAND = colors.HexColor("#06203A")
BRAND_2 = colors.HexColor("#0B3A57")
ACCENT = colors.HexColor("#28C7B7")
ACTION = colors.HexColor("#0EA5C6")
WHATSAPP = colors.HexColor("#25D366")
INK = colors.HexColor("#10243B")
MUTED = colors.HexColor("#607087")
LINE = colors.HexColor("#D7E0EA")
SOFT = colors.HexColor("#F2F7FA")
WHITE = colors.white


def register_fonts():
    font_dir = Path("C:/Windows/Fonts")
    regular = font_dir / "arial.ttf"
    bold = font_dir / "arialbd.ttf"
    if regular.exists() and bold.exists():
        pdfmetrics.registerFont(TTFont("ManualSans", str(regular)))
        pdfmetrics.registerFont(TTFont("ManualSans-Bold", str(bold)))
        return "ManualSans", "ManualSans-Bold"
    return "Helvetica", "Helvetica-Bold"


FONT, FONT_BOLD = register_fonts()


def styles():
    base = getSampleStyleSheet()
    base.add(
        ParagraphStyle(
            "CoverTitle",
            fontName=FONT_BOLD,
            fontSize=30,
            leading=35,
            textColor=WHITE,
            alignment=TA_LEFT,
            spaceAfter=14,
        )
    )
    base.add(
        ParagraphStyle(
            "CoverSub",
            fontName=FONT,
            fontSize=12.5,
            leading=18,
            textColor=colors.HexColor("#D9EEF5"),
            alignment=TA_LEFT,
            spaceAfter=10,
        )
    )
    base.add(
        ParagraphStyle(
            "H1Manual",
            fontName=FONT_BOLD,
            fontSize=21,
            leading=26,
            textColor=BRAND,
            spaceBefore=4,
            spaceAfter=12,
        )
    )
    base.add(
        ParagraphStyle(
            "H2Manual",
            fontName=FONT_BOLD,
            fontSize=14.5,
            leading=18,
            textColor=BRAND_2,
            spaceBefore=14,
            spaceAfter=7,
        )
    )
    base.add(
        ParagraphStyle(
            "BodyManual",
            fontName=FONT,
            fontSize=9.7,
            leading=14,
            textColor=INK,
            alignment=TA_LEFT,
            spaceAfter=7,
        )
    )
    base.add(
        ParagraphStyle(
            "BodyLeft",
            fontName=FONT,
            fontSize=9.7,
            leading=14,
            textColor=INK,
            alignment=TA_LEFT,
            spaceAfter=7,
        )
    )
    base.add(
        ParagraphStyle(
            "Small",
            fontName=FONT,
            fontSize=8,
            leading=11,
            textColor=MUTED,
            alignment=TA_LEFT,
        )
    )
    base.add(
        ParagraphStyle(
            "SmallLink",
            fontName=FONT_BOLD,
            fontSize=7.2,
            leading=10,
            textColor=ACTION,
            alignment=TA_LEFT,
        )
    )
    base.add(
        ParagraphStyle(
            "SmallBold",
            fontName=FONT_BOLD,
            fontSize=8,
            leading=11,
            textColor=BRAND,
            alignment=TA_LEFT,
        )
    )
    base.add(
        ParagraphStyle(
            "SmallWhite",
            fontName=FONT_BOLD,
            fontSize=8,
            leading=11,
            textColor=WHITE,
            alignment=TA_LEFT,
        )
    )
    base.add(
        ParagraphStyle(
            "CardTitle",
            fontName=FONT_BOLD,
            fontSize=10.5,
            leading=13,
            textColor=BRAND,
            spaceAfter=4,
        )
    )
    base.add(
        ParagraphStyle(
            "TOC",
            fontName=FONT,
            fontSize=10,
            leading=15,
            textColor=INK,
            leftIndent=8,
            bulletIndent=0,
            spaceAfter=4,
        )
    )
    base.add(
        ParagraphStyle(
            "Center",
            fontName=FONT,
            fontSize=9.5,
            leading=13,
            textColor=MUTED,
            alignment=TA_CENTER,
        )
    )
    return base


S = styles()


def p(text, style="BodyManual"):
    return Paragraph(text, S[style])


def admin_link(label, path):
    href = f"{SITE_URL}{path}"
    return f'<link href="{href}"><u>{label}</u></link>'


def bullets(items, numbered=False):
    rows = []
    for index, item in enumerate(items, 1):
        marker = f"{index}." if numbered else "-"
        rows.append([p(marker, "SmallBold"), p(item, "BodyLeft")])
    table = Table(rows, colWidths=[0.55 * cm, 15.0 * cm])
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TEXTCOLOR", (0, 0), (0, -1), ACTION),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 1),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ]
        )
    )
    return table


def card(title, body, accent=ACCENT):
    data = [[p(title, "CardTitle")], [p(body, "BodyLeft")]]
    table = Table(data, colWidths=[15.5 * cm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), SOFT),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("LINEBEFORE", (0, 0), (0, -1), 3, accent),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def route_table(rows):
    table_data = [[p("O que editar", "SmallWhite"), p("Onde entrar", "SmallWhite"), p("Observação", "SmallWhite")]]
    for a, b, c in rows:
        if b.startswith("/"):
            href = f"{SITE_URL}{b}"
            table_data.append([p(a, "Small"), p(admin_link(href, b), "SmallLink"), p(c, "Small")])
        else:
            table_data.append([p(a, "Small"), p(b, "Small"), p(c, "Small")])
    table = Table(table_data, colWidths=[3.7 * cm, 6.3 * cm, 5.5 * cm], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BRAND),
                ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
                ("GRID", (0, 0), (-1, -1), 0.35, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, colors.HexColor("#F8FBFD")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def cover(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setFillColor(BRAND)
    canvas.rect(0, 0, w, h, fill=1, stroke=0)
    canvas.setFillColor(BRAND_2)
    canvas.circle(w - 1.8 * cm, h - 2.0 * cm, 5.8 * cm, fill=1, stroke=0)
    canvas.setFillColor(ACCENT)
    canvas.rect(0, 0, w, 0.65 * cm, fill=1, stroke=0)
    canvas.restoreState()


def body_page(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setStrokeColor(LINE)
    canvas.line(2 * cm, h - 1.35 * cm, w - 2 * cm, h - 1.35 * cm)
    canvas.setFillColor(MUTED)
    canvas.setFont(FONT, 7.5)
    canvas.drawString(2 * cm, h - 1.1 * cm, "Manual de edição do site - Essencial Saúde Auditoria")
    canvas.drawRightString(w - 2 * cm, h - 1.1 * cm, f"Página {doc.page}")
    canvas.setStrokeColor(LINE)
    canvas.line(2 * cm, 1.25 * cm, w - 2 * cm, 1.25 * cm)
    canvas.restoreState()


class ManualDoc(BaseDocTemplate):
    def __init__(self, filename):
        super().__init__(
            filename,
            pagesize=A4,
            rightMargin=2 * cm,
            leftMargin=2 * cm,
            topMargin=1.7 * cm,
            bottomMargin=1.7 * cm,
            title="Manual de edição do site - Essencial Saúde Auditoria",
            author="Essencial Saúde Auditoria",
        )
        cover_frame = Frame(2.0 * cm, 2.0 * cm, 17.0 * cm, 24.8 * cm, id="cover")
        body_frame = Frame(2.0 * cm, 1.65 * cm, 17.0 * cm, 24.0 * cm, id="body")
        self.addPageTemplates(
            [
                PageTemplate(id="Cover", frames=[cover_frame], onPage=cover),
                PageTemplate(id="Body", frames=[body_frame], onPage=body_page),
            ]
        )


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    story = []

    story.append(Spacer(1, 2.15 * cm))
    story.append(p("Manual de edição do site", "CoverTitle"))
    story.append(p("Essencial Saúde Auditoria", "CoverSub"))
    story.append(
        p(
            "Guia didático para atualizar textos, imagens, carrosséis, ícones, perguntas frequentes, matérias, contatos, cores e configurações principais pelo painel administrativo.",
            "CoverSub",
        )
    )
    story.append(Spacer(1, 10.8 * cm))
    story.append(p("Versão prática para uso no dia a dia - 2026", "CoverSub"))
    story.append(NextPageTemplate("Body"))
    story.append(PageBreak())

    story.append(p("1. Visão Geral", "H1Manual"))
    story.append(
        p(
            "Este manual explica como editar o site sem mexer no código. O painel foi organizado para concentrar, em cada página, os itens usados naquela área: textos, imagens, carrosséis, ícones, perguntas frequentes e cores. A ideia é simples: se o conteúdo aparece na Home, procure em Home; se aparece em Contato, procure em Contato.",
        )
    )
    story.append(card("Acesso rápido", "No rodapé do site existe o botão <b>Login para edição</b>. Ele leva para <b>/admin/login</b>. Entre com o usuário e a senha cadastrados para o painel.", ACTION))
    story.append(Spacer(1, 0.3 * cm))
    story.append(p("Índice rápido", "H2Manual"))
    story.append(
        bullets(
            [
                "Entrar no painel e salvar alterações.",
                "Editar a página inicial: banner, serviços, ícones, matérias e FAQ.",
                "Editar serviços, páginas internas e imagens.",
                "Cadastrar e publicar matérias do blog.",
                "Atualizar contato, WhatsApp, logotipo, mídia e cores.",
                "Checklist antes de considerar a edição concluída.",
            ]
        )
    )
    story.append(PageBreak())

    story.append(p("2. Onde Editar Cada Coisa", "H1Manual"))
    story.append(
        route_table(
            [
                ("Página inicial", "/admin/paginas/home", "Banner/carrossel, tempo dos slides, serviços da Home, ícones, textos, FAQ e seções principais."),
                ("Textos e ícones dos serviços na Home", "/admin/paginas/home", "Use a área de serviços. É possível adicionar até 10, inativar ou arquivar."),
                ("Página de serviço individual", "/admin/servicos", "Edite nome, resumo, imagem, mensagem de WhatsApp, destaques, blocos, entrega e público."),
                ("Aparência visual de serviços", "/admin/editor/servicos", "Ajuste layout livre, ordem de seções e cores específicas."),
                ("Matérias/conteúdos", "/admin/conteudos", "Crie, publique, despublique ou arquive posts. As matérias publicadas aparecem automaticamente no site."),
                ("Imagens e arquivos", "/admin/midia", "Envie imagens para usar em banners, capas, serviços, ícones enviados e conteúdos."),
                ("Contato", "/admin/paginas/contato", "Textos da página de contato e formulário. Os canais ficam em Configurações."),
                ("WhatsApp, e-mail, telefone e endereço", "/admin/configuracoes", "Dados usados no cabeçalho, rodapé, contato e botões do site."),
                ("Cores globais", "/admin/editor/home/aparencia", "Altera padrão visual do site inteiro. Use com cuidado."),
                ("SEO", "/admin/seo", "Títulos e descrições para mecanismos de busca."),
            ]
        )
    )
    story.append(Spacer(1, 0.35 * cm))
    story.append(card("Regra de ouro", "Antes de procurar em várias telas: pense em qual página mostra aquele conteúdo. A edição principal deve estar concentrada nessa página.", ACCENT))
    story.append(PageBreak())

    story.append(p("3. Entrar, Salvar e Conferir", "H1Manual"))
    story.append(p("Para acessar o painel, role até o rodapé do site e clique em <b>Login para edição</b>. Também é possível digitar diretamente <b>/admin/login</b> no navegador."))
    story.append(
        bullets(
            [
                "Digite usuário e senha do painel.",
                "Use o menu lateral para navegar: Dashboard, Páginas, Serviços, Matérias, Mídia, Configurações e SEO.",
                "Depois de editar uma tela, clique sempre em <b>Salvar</b>.",
                "Abra o site em outra aba e atualize a página para conferir o resultado.",
                "Se algo não aparecer, confirme se o item está <b>publicado/ativo</b> e se a imagem foi salva no campo correto.",
            ],
            numbered=True,
        )
    )
    story.append(card("Importante", "Editar conteúdo pelo painel não exige terminal. Terminal/deploy só é necessário quando há alteração de código do site.", colors.HexColor("#F59E0B")))

    story.append(p("4. Editar a Home", "H1Manual"))
    story.append(p("A Home fica em <b>/admin/paginas/home</b>. Esta é a tela principal para editar quase tudo que aparece na página inicial."))
    story.append(p("Banner e carrossel", "H2Manual"))
    story.append(
        bullets(
            [
                "Edite o título, texto e imagem de cada slide.",
                "Use imagens largas, preferencialmente no formato 1920 x 850 px ou proporção parecida.",
                "Para não cobrir o texto, escolha imagens com área mais limpa do lado esquerdo.",
                "Ajuste o <b>tempo de troca</b> dos slides no campo do intervalo do carrossel.",
                "Salve e confira no site se o texto permanece à esquerda e sem invadir a imagem principal.",
            ],
            numbered=True,
        )
    )
    story.append(p("Serviços, ícones e textos", "H2Manual"))
    story.append(
        bullets(
            [
                "Na área de serviços da Home, edite o título da aba, texto do ícone, ícone do cartão, mensagem de WhatsApp, texto principal e imagem.",
                "O seletor de ícones mostra opções em português e também o nome técnico entre parênteses.",
                "É possível enviar um ícone próprio em SVG/PNG quando nenhum ícone do sistema servir.",
                "Use <b>Ativo/Inativo</b> para esconder temporariamente sem excluir.",
                "Use <b>Excluir/Arquivar</b> quando o serviço não deve mais aparecer.",
                "O limite da Home é de 10 serviços para manter a página organizada.",
            ],
            numbered=True,
        )
    )
    story.append(PageBreak())

    story.append(p("5. FAQ e Matérias na Home", "H1Manual"))
    story.append(p("Perguntas frequentes", "H2Manual"))
    story.append(
        bullets(
            [
                "Na Home, localize a área de FAQ.",
                "Edite a pergunta e a resposta nos campos correspondentes.",
                "Para adicionar, preencha uma nova pergunta com resposta.",
                "Para remover, apague pergunta e resposta ou use a opção de exclusão quando disponível.",
                "No site, a pergunta aparece fechada ocupando a linha; ao clicar, abre a resposta e fecha as demais.",
            ],
            numbered=True,
        )
    )
    story.append(p("Últimas matérias", "H2Manual"))
    story.append(
        p(
            "A seção de matérias da Home é automática. Ela busca as matérias publicadas em <b>/admin/conteudos</b>, mostra três por vez e troca o grupo periodicamente. Portanto, para mudar o que aparece ali, edite ou publique as matérias no painel de Conteúdos."
        )
    )
    story.append(card("Dica de capa", "Para capas de matérias, use imagens horizontais e claras. Evite textos pequenos dentro da imagem, porque podem ficar ilegíveis no cartão.", ACTION))

    story.append(p("6. Serviços", "H1Manual"))
    story.append(p("A lista de serviços fica em <b>/admin/servicos</b>. Cada serviço tem conteúdo próprio e também pode aparecer na Home."))
    story.append(
        bullets(
            [
                "Clique em um serviço para editar nome, nome curto, resumo, imagem, texto principal, destaques, entregáveis, público e mensagem do WhatsApp.",
                "Use status <b>Publicado</b> quando o serviço deve aparecer no site.",
                "Use <b>Rascunho/Inativo</b> quando quiser preparar sem mostrar ao público.",
                "Use <b>Arquivar</b> para tirar do site sem apagar definitivamente do histórico.",
                "A imagem do serviço aparece no topo da página interna e pode ser ajustada no editor visual quando necessário.",
            ],
            numbered=True,
        )
    )
    story.append(p("Editor visual de serviços", "H2Manual"))
    story.append(p("Em <b>/admin/editor/servicos</b> e nas telas de aparência, ajuste cores, ordem de seções, posição de elementos e detalhes visuais. Use este editor para acabamento; use o formulário do serviço para alterar conteúdo textual."))
    story.append(PageBreak())

    story.append(p("7. Matérias e Conteúdos", "H1Manual"))
    story.append(p("As matérias ficam em <b>/admin/conteudos</b>. Elas alimentam a página de Conteúdos e também a seção de últimas matérias na Home."))
    story.append(
        bullets(
            [
                "Clique em <b>Nova matéria</b>.",
                "Preencha título, resumo, categoria e autor.",
                "Depois edite os blocos de conteúdo: parágrafo, lista, imagem, citação ou outros blocos disponíveis.",
                "Escolha a imagem de capa e escreva o texto alternativo.",
                "Revise título SEO e descrição SEO.",
                "Marque como <b>Publicado</b> para aparecer no site.",
                "Use <b>Despublicar</b> ou <b>Arquivar</b> quando não quiser mostrar mais.",
            ],
            numbered=True,
        )
    )
    story.append(card("Publicou e não apareceu?", "Confira se a matéria está com status Publicado, se a data de publicação está correta e se a página foi atualizada no navegador.", colors.HexColor("#F59E0B")))

    story.append(p("8. Imagens e Mídia", "H1Manual"))
    story.append(p("A biblioteca de arquivos fica em <b>/admin/midia</b>. Use esta tela para subir imagens antes de aplicá-las em banners, serviços, matérias e ícones enviados."))
    story.append(
        bullets(
            [
                "Prefira imagens grandes e horizontais para banners: 1920 x 850 px ou maior na mesma proporção.",
                "Para cards e capas de matérias, imagens horizontais funcionam melhor.",
                "Nomeie arquivos de forma simples, por exemplo: banner-gestao-jornada.jpg.",
                "Evite imagens com muito texto dentro. O texto importante deve ficar no campo editável do site.",
                "Preencha sempre texto alternativo, descrevendo a imagem em uma frase curta.",
            ]
        )
    )
    story.append(p("Ícones", "H2Manual"))
    story.append(p("Sempre que houver campo de ícone, tente primeiro usar um ícone do sistema. Se precisar de algo muito específico, envie um SVG/PNG pela própria tela."))

    story.append(PageBreak())
    story.append(p("9. Contato, WhatsApp e Configurações", "H1Manual"))
    story.append(p("A página de contato fica em <b>/admin/paginas/contato</b>. O formulário aparece somente nessa página."))
    story.append(
        bullets(
            [
                "Edite os textos da página de contato no editor da página.",
                "Altere e-mail, telefone, WhatsApp, endereço e horários em <b>/admin/configuracoes</b>.",
                "A mensagem padrão do WhatsApp também fica em Configurações.",
                "Os botões de WhatsApp usam a cor verde do WhatsApp automaticamente.",
                "Os contatos recebidos pelo formulário podem ser acompanhados em <b>/admin/contatos</b>.",
            ],
            numbered=True,
        )
    )
    story.append(p("Logotipo e redes sociais", "H2Manual"))
    story.append(p("Em <b>/admin/configuracoes</b>, ajuste marca, logo e redes sociais. Redes desativadas não aparecem no rodapé."))

    story.append(p("10. Cores e Aparência", "H1Manual"))
    story.append(p("As telas de Aparência permitem mudar cores globais ou específicas por página/seção. Use com atenção, porque cores globais afetam cabeçalho, rodapé e várias páginas."))
    story.append(
        bullets(
            [
                "Para mudar o padrão geral: use a Aparência da Home ou o editor visual indicado no painel.",
                "Para mudar só uma página: use a Aparência daquela página.",
                "Para mudar só uma seção: procure a área de cores por seção.",
                "Se quiser voltar ao padrão, use a opção de herdar/remover sobrescrita quando disponível.",
            ],
            numbered=True,
        )
    )
    story.append(card("Sugestão visual", "Mantenha bom contraste: texto escuro em fundo claro ou texto branco em fundo escuro. Evite tons muito parecidos entre texto e fundo.", ACCENT))
    story.append(PageBreak())

    story.append(p("11. Checklist Antes de Finalizar", "H1Manual"))
    story.append(
        bullets(
            [
                "Salvei a tela que editei.",
                "Abri o site em nova aba e atualizei a página.",
                "Conferi no celular ou reduzi a janela para ver se o texto não ficou cortado.",
                "Confirmei que imagens não cobrem textos importantes.",
                "Verifiquei se links de botões levam para a página certa.",
                "Confirmei se serviços/matérias estão Publicados quando devem aparecer.",
                "Preenchi texto alternativo nas imagens importantes.",
                "Conferi telefone, WhatsApp e e-mail antes de divulgar.",
            ]
        )
    )
    story.append(p("12. Problemas Comuns", "H1Manual"))
    story.append(
        route_table(
            [
                ("Imagem não aparece", "Verifique se o upload terminou e se o campo recebeu o caminho da imagem.", "Salve novamente a tela."),
                ("Conteúdo não aparece", "Confirme se o item está publicado/ativo.", "Rascunhos e inativos podem ficar escondidos."),
                ("Texto ficou grande demais", "Reduza o texto ou ajuste a fonte/seção no editor visual.", "Prefira frases curtas em banners."),
                ("Carrossel rápido/lento", "Ajuste o tempo de troca na edição da Home.", "Use algo entre 6 e 12 segundos na maioria dos casos."),
                ("WhatsApp errado", "Vá em Configurações e edite o número.", "Use formato internacional quando o campo pedir."),
            ]
        )
    )
    story.append(Spacer(1, 0.5 * cm))
    story.append(card("Resumo final", "Para o uso diário, comece em <b>Páginas</b>, <b>Serviços</b>, <b>Conteúdos</b>, <b>Mídia</b> e <b>Configurações</b>. O Editor Visual é melhor para acabamento de layout, cores e posição.", ACTION))
    story.append(Spacer(1, 0.35 * cm))
    story.append(p("Manual preparado para a versão atual do site Essencial Saúde Auditoria.", "Center"))

    doc = ManualDoc(str(OUT))
    doc.build(story)
    print(OUT)


if __name__ == "__main__":
    build()
