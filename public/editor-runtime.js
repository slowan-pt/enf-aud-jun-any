/**
 * Runtime do editor visual — carregado apenas quando a página pública é aberta
 * com `?__edit=1` por um usuário autenticado, dentro do iframe do editor.
 *
 * Responsabilidade: transformar os elementos marcados com `data-edit` em objetos
 * selecionáveis e editáveis, e conversar com a janela do editor por postMessage.
 * Ele não grava nada — quem chama a API é a janela de cima.
 */
(function () {
  'use strict';

  if (window.top === window.self) return; // fora do editor, não faz nada
  var parentWindow = window.parent;
  var ORIGIN = window.location.origin;

  var selected = null;
  var hovered = null;
  var SELECTABLE = '[data-edit],[data-overlay]';

  // ---------------------------------------------------------------- estilos
  var style = document.createElement('style');
  style.textContent = [
    '[data-edit]{cursor:pointer}',
    '[data-edit].is-edit-hover{outline:2px dashed rgba(37,99,235,.65);outline-offset:3px}',
    '[data-edit].is-edit-selected{outline:2px solid #2563eb;outline-offset:3px;border-radius:2px}',
    '[data-edit][contenteditable="true"]{outline:2px solid #2563eb;outline-offset:3px;cursor:text}',
    '[data-section].is-edit-section-hover{outline:2px dashed rgba(37,99,235,.35);outline-offset:-2px}',
    '[data-reveal]{opacity:1!important;transform:none!important}',
    '.is-edit-hidden-section{display:none!important}',
    '[data-edit-item]{cursor:grab}',
    '[data-edit-item].is-edit-dragging{opacity:.35}',
    '[data-edit-item].is-edit-drop{outline:2px solid #12a794;outline-offset:4px}',
    '[data-overlay]{cursor:pointer}',
    '[data-overlay].is-edit-hover{outline:2px dashed rgba(37,99,235,.65);outline-offset:3px}',
    '[data-overlay].is-edit-selected{outline:2px solid #2563eb;outline-offset:3px}',
    '.is-edit-locked{cursor:not-allowed!important}',
    '.is-edit-hidden{opacity:.3;outline:1px dashed #94a3b8}',
    '[data-section].is-edit-drop-target{outline:3px dashed #12a794;outline-offset:-3px;background-color:rgba(18,167,148,.06)}',
    '[data-section].is-edit-section-selected{outline:2px solid #7c3aed;outline-offset:-2px}',
    '.is-edit-cross-drag{opacity:.85;filter:drop-shadow(0 6px 14px rgba(0,0,0,.35))}',
  ].join('');
  document.head.appendChild(style);

  // ------------------------------------------------------------- utilidades
  function post(message) {
    parentWindow.postMessage(message, ORIGIN);
  }

  function kindOf(element) {
    return element.getAttribute('data-edit-kind') || 'text';
  }

  function valueOf(element) {
    var kind = kindOf(element);
    if (kind === 'image' || kind === 'video') return element.getAttribute('src') || '';
    if (kind === 'icon') return element.getAttribute('data-edit-value') || '';
    return element.textContent.trim();
  }

  function rectOf(element) {
    var r = element.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  }

  function describe(element) {
    var overlayId = element.getAttribute('data-overlay');
    return {
      path: element.getAttribute('data-edit'),
      overlay: overlayId,
      key: overlayId ? 'overlay:' + overlayId : element.getAttribute('data-edit'),
      kind: kindOf(element),
      value: valueOf(element),
      label: element.getAttribute('data-edit-label') || (overlayId ? 'Elemento livre' : ''),
      section: closestSection(element),
      rect: rectOf(element),
      layout: layoutFor(element),
      hasMobile: Boolean((layouts[keyOf(element)] || {}).mobile),
    };
  }

  function closestSection(element) {
    var node = element.closest('[data-section]');
    return node ? node.getAttribute('data-section') : '';
  }

  // ------------------------------------------------- manipulação livre
  // Moveable opera sobre o elemento HTML real: ele continua sendo um <h1>, um
  // <img>, um <p>. Nada aqui vira desenho em canvas.
  var moveable = null;
  var device = 'desktop';
  var layouts = {}; // caminho/overlay -> { desktop, mobile }
  var translate = [0, 0]; // deslocamento em px durante o arrasto
  var angle = 0; // giro em graus durante a manipulacao
  var editingText = false;

  function isOverlay(element) {
    return element.hasAttribute('data-overlay');
  }

  function keyOf(element) {
    return isOverlay(element)
      ? 'overlay:' + element.getAttribute('data-overlay')
      : element.getAttribute('data-edit');
  }

  function sectionOf(element) {
    return element.closest('[data-section]');
  }

  function layoutFor(element) {
    var key = keyOf(element);
    var pair = layouts[key] || { desktop: emptyLayout(), mobile: null };
    layouts[key] = pair;
    return pair[device] || pair.desktop;
  }

  function emptyLayout() {
    return {
      v: 2,
      x: 0,
      y: 0,
      w: 0,
      h: 0,
      z: 0,
      fontSize: 0,
      color: '',
      align: '',
      weight: 0,
      r: 0,
      locked: false,
      hidden: false,
      label: '',
    };
  }

  function reportLayout(element, layout) {
    layouts[keyOf(element)][device] = layout;
    post({
      type: 'editor:layout',
      key: keyOf(element),
      overlay: isOverlay(element) ? element.getAttribute('data-overlay') : null,
      path: isOverlay(element) ? null : element.getAttribute('data-edit'),
      device: device,
      layout: layout,
    });
  }

  /**
   * Irmãos da mesma seção viram guias de alinhamento — mas só os de nível
   * "superior" (itens de lista, cabeças de bloco, elementos livres), não cada
   * <span> e ícone dentro de cada card. Uma grade de 6 cards tem ~18
   * elementos editáveis; usar todos como candidato de encaixe é o que sentia
   * como "barreira invisível" a poucos pixels de qualquer lugar.
   */
  function guidelinesFor(element) {
    var section = sectionOf(element);
    if (!section) return [];
    var nodes = section.querySelectorAll('[data-edit],[data-overlay]');
    var list = [];
    [].forEach.call(nodes, function (node) {
      if (node === element || node.offsetWidth <= 0) return;
      // Ignora nó cujo pai mais próximo editável já está na lista — evita
      // empilhar o card inteiro (ícone + título + texto) como 3 guias iguais.
      var parent = node.parentElement && node.parentElement.closest(SELECTABLE);
      if (parent && parent !== element && list.indexOf(parent) !== -1) return;
      list.push(node);
    });
    return list;
  }

  /** Alt/Option desativa o encaixe enquanto pressionado — sem isso, o
   * usuário não tem como soltar um elemento perto de outro sem ser puxado. */
  var snapDisabled = false;
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Alt') snapDisabled = true;
  });
  document.addEventListener('keyup', function (event) {
    if (event.key === 'Alt') snapDisabled = false;
  });
  window.addEventListener('blur', function () {
    snapDisabled = false;
  });

  function detachMoveable() {
    if (moveable) {
      moveable.destroy();
      moveable = null;
    }
  }

  function attachMoveable(element) {
    detachMoveable();
    if (typeof window.Moveable !== 'function') return;

    var layout = layoutFor(element);
    if (layout.locked) return;

    var overlay = isOverlay(element);
    translate = [0, 0];
    angle = layout.r || 0;

    // Linhas fixas do centro da própria seção — sem isso, uma seção com
    // poucos elementos (ex.: hero) não tem nenhuma guia de centro disponível,
    // já que guias de elemento só existem entre irmãos.
    var section = sectionOf(element);
    var sectionCenter = section ? section.getBoundingClientRect() : null;

    moveable = new window.Moveable(document.body, {
      target: element,
      draggable: true,
      resizable: true,
      rotatable: true,
      snappable: !snapDisabled,
      origin: false,
      edge: false,
      keepRatio: false,
      throttleDrag: 0,
      throttleResize: 0,
      // Bloco funcional (ex.: formulário de contato): sem isto, o próprio
      // Moveable intercepta o mousedown num <input>/<textarea> como início
      // de arrasto, e o campo nunca recebe foco. Não cobre <select> — esse
      // caso é tratado à parte, num mousedown-capture no document (abaixo).
      checkInput: kindOf(element) === 'form',
      elementGuidelines: guidelinesFor(element),
      horizontalGuidelines: sectionCenter ? [sectionCenter.top + sectionCenter.height / 2] : [],
      verticalGuidelines: sectionCenter ? [sectionCenter.left + sectionCenter.width / 2] : [],
      snapThreshold: 5,
      snapGap: true,
      isDisplaySnapDigit: false,
      snapDirections: {
        top: true,
        left: true,
        bottom: true,
        right: true,
        center: true,
        middle: true,
      },
      elementSnapDirections: {
        top: true,
        left: true,
        bottom: true,
        right: true,
        center: true,
        middle: true,
      },
    });

    moveable
      .on('dragStart', function (event) {
        event.set(translate);
        if (overlay) startCrossSectionDrag(element);
      })
      .on('drag', function (event) {
        if (moveable) moveable.snappable = !snapDisabled;
        translate = event.beforeTranslate;
        element.style.transform = liveTransform();
        if (overlay) trackCrossSectionDrag(element, event);
      })
      .on('dragEnd', function () {
        if (overlay && finishCrossSectionDrag(element)) return;
        commitPosition(element, overlay);
      })
      .on('resizeStart', function (event) {
        // Causa raiz do encolhimento: nosso style.width fica em `cqw` entre
        // gestos. O Moveable lê esse texto e trata o número como se já
        // estivesse em pixels, corrompendo o cálculo do gesto inteiro (ex.:
        // "99.16cqw" → interpretado como 99.16px). Fixamos aqui a largura e
        // altura REAIS medidas (offsetWidth/Height, sempre em px de verdade,
        // independente da unidade do CSS) como ponto de partida do gesto.
        event.setOrigin(['%', '%']);
        event.set([element.offsetWidth, element.offsetHeight]);
        if (event.dragStart) event.dragStart.set(translate);
      })
      .on('resize', function (event) {
        if (moveable) moveable.snappable = !snapDisabled;
        element.style.width = event.width + 'px';
        if (overlay) element.style.height = event.height + 'px';
        translate = event.drag.beforeTranslate;
        element.style.transform = liveTransform();
      })
      .on('resizeEnd', function () {
        commitSize(element, overlay);
        commitPosition(element, overlay);
      })
      .on('rotateStart', function (event) {
        event.set(layoutFor(element).r);
      })
      .on('rotate', function (event) {
        angle = event.beforeRotation;
        element.style.transform = liveTransform();
      })
      .on('rotateEnd', function () {
        commitRotation(element);
      });
  }

  /** Converte o arrasto em px para a proporção que vai ser gravada. */
  function commitPosition(element, overlay) {
    var layout = Object.assign({}, layoutFor(element));
    var section = sectionOf(element);
    if (!section) return;

    var box = section.getBoundingClientRect();
    if (box.width <= 0) return;

    // Os dois eixos são divididos pela LARGURA DA SEÇÃO. É isso que garante
    // que mexer no tamanho, no texto ou na fonte do elemento não desloque nada:
    // o denominador não é o elemento.
    layout.v = 2;

    if (overlay) {
      var rect = element.getBoundingClientRect();
      layout.x = round(((rect.left - box.left) / box.width) * 100);
      layout.y = round(((rect.top - box.top) / box.width) * 100);
      element.style.transform = '';
      translate = [0, 0];
    } else {
      layout.x = round((translate[0] / box.width) * 100);
      layout.y = round((translate[1] / box.width) * 100);
    }

    applyLayoutStyle(element, layout);
    reportLayout(element, layout);
    if (moveable) moveable.updateRect();
  }

  function commitSize(element, overlay) {
    var layout = Object.assign({}, layoutFor(element));
    var section = sectionOf(element);
    if (!section) return;
    var box = section.getBoundingClientRect();
    if (box.width <= 0) return;

    layout.w = round((element.offsetWidth / box.width) * 100);
    if (overlay) layout.h = round((element.offsetHeight / box.width) * 100);

    applyLayoutStyle(element, layout);
    reportLayout(element, layout);
  }

  // Mesma defesa que o servidor já aplica em normalizeLayout(): uma conta com
  // um retângulo degenerado (largura/altura zero) produz NaN/Infinity, que
  // vira uma string de CSS inválida e o navegador simplesmente ignora — o
  // elemento fica sem posição nenhuma. Zerar aqui evita esse buraco.
  function round(value) {
    var n = Math.round(value * 100) / 100;
    return Number.isFinite(n) ? n : 0;
  }

  /**
   * Transform durante a manipulação: deslocamento em px (preciso para o mouse)
   * mais o giro. Ao soltar, `commitPosition` grava a proporção e reescreve em
   * `cqw` — o px só existe enquanto o arrasto acontece.
   */
  function liveTransform() {
    var parts = [];
    if (translate[0] || translate[1]) {
      parts.push('translate(' + translate[0] + 'px,' + translate[1] + 'px)');
    }
    if (angle) parts.push('rotate(' + angle + 'deg)');
    return parts.join(' ');
  }

  function commitRotation(element) {
    var layout = Object.assign({}, layoutFor(element), { r: round(angle) });
    applyLayoutStyle(element, layout);
    reportLayout(element, layout);
    if (moveable) moveable.updateRect();
  }

  // ------------------------------------------------- transferência entre seções
  // Elemento livre é `position:absolute` dentro da sua seção. O problema
  // relatado ("fica atrás do fundo da seção seguinte") não se resolve com
  // z-index: seções mais tarde no documento pintam DEPOIS, então qualquer
  // coisa pertencente a uma seção anterior que vise visualmente uma seção
  // posterior fica sob o fundo dela, seja qual for o z-index. A única
  // correção real é o elemento pertencer, de fato, à seção sob o cursor.
  //
  // Durante o arraste, viramos `position:fixed` (âncora no viewport, fora da
  // pilha de qualquer seção) com z-index altíssimo — assim ele sempre pinta
  // por cima, em qualquer seção que estiver sendo cruzada. Isso não afeta o
  // fluxo de mais nada: um elemento livre já estava fora do fluxo antes.
  var crossDrag = null; // { originSection, originParentEl }
  var crossTargetSection = null;

  function startCrossSectionDrag(element) {
    var originSection = sectionOf(element);
    if (!originSection) return;
    var rect = element.getBoundingClientRect();

    crossDrag = { originSection: originSection };
    crossTargetSection = originSection;

    element.style.position = 'fixed';
    element.style.left = rect.left + 'px';
    element.style.top = rect.top + 'px';
    element.style.margin = '0';
    element.style.zIndex = '999999';
    element.classList.add('is-edit-cross-drag');
  }

  function trackCrossSectionDrag(element, event) {
    if (!crossDrag) return;
    var over = document.elementFromPoint(event.clientX, event.clientY);
    var section = over && over.closest('[data-section]');
    if (section === crossTargetSection) return;

    if (crossTargetSection) crossTargetSection.classList.remove('is-edit-drop-target');
    crossTargetSection = section || crossDrag.originSection;
    crossTargetSection.classList.add('is-edit-drop-target');
  }

  /** Retorna true se tratou o fim do gesto (transferiu de seção); false = fluxo normal. */
  function finishCrossSectionDrag(element) {
    if (!crossDrag) return false;
    var origin = crossDrag.originSection;
    var target = crossTargetSection || origin;
    if (target) target.classList.remove('is-edit-drop-target');
    crossDrag = null;
    crossTargetSection = null;
    element.classList.remove('is-edit-cross-drag');

    if (target === origin) {
      // Voltou para a mesma seção: desfaz o "fixed" temporário e segue o
      // fluxo normal de commit (mesma seção, sem mudança de pertencimento).
      element.style.position = '';
      element.style.left = '';
      element.style.top = '';
      element.style.margin = '';
      element.style.zIndex = '';
      element.style.transform = liveTransform();
      return false;
    }

    // Seção diferente: a posição final (viewport) já é a verdade — ela é
    // recalculada em proporção à LARGURA da seção de destino, exatamente como
    // qualquer outra gravação de posição.
    var rect = element.getBoundingClientRect();
    var box = target.getBoundingClientRect();
    if (box.width <= 0) return true;

    target.appendChild(element);
    element.style.position = 'absolute';
    element.style.margin = '';
    element.style.zIndex = '';
    element.style.left = '';
    element.style.top = '';
    element.style.transform = '';

    var layout = Object.assign({}, layoutFor(element));
    layout.v = 2;
    layout.x = round(((rect.left - box.left) / box.width) * 100);
    layout.y = round(((rect.top - box.top) / box.width) * 100);
    applyLayoutStyle(element, layout);

    var overlayId = element.getAttribute('data-overlay');
    var fromSection = origin.getAttribute('data-section');
    var toSection = target.getAttribute('data-section');
    layouts[keyOf(element)][device] = layout;

    post({
      type: 'editor:overlay-move-section',
      id: overlayId,
      from: fromSection,
      to: toSection,
      device: device,
      layout: layout,
    });

    translate = [0, 0];
    if (moveable) moveable.updateRect();
    return true;
  }

  /**
   * Constrói o nó de um elemento livre no cliente, espelhando exatamente o
   * que `SectionOverlays.astro` geraria no servidor — usado só para não
   * precisar recarregar a página ao inserir (o que perderia a rolagem e a
   * seleção). Nunca via innerHTML: cada peça é criada por elemento.
   */
  function createOverlayElement(spec) {
    var el;
    if (spec.kind === 'text') {
      el = document.createElement('p');
      el.className = 'overlay overlay--text';
      el.setAttribute('data-edit-kind', 'multiline');
      el.textContent = spec.content || '';
    } else if (spec.kind === 'shape') {
      el = document.createElement('span');
      el.className = 'overlay overlay--shape';
      el.setAttribute('data-edit-kind', 'shape');
      el.setAttribute('data-shape', spec.content || 'rect');
      el.style.position = 'relative';
      el.appendChild(buildShapeSvg(spec.content || 'rect'));
      var shapeText = document.createElement('span');
      shapeText.className = 'overlay__shape-text';
      shapeText.style.position = 'relative';
      shapeText.style.zIndex = '1';
      shapeText.textContent = spec.text || '';
      el.appendChild(shapeText);
    } else if (spec.kind === 'video') {
      el = document.createElement('video');
      el.className = 'overlay overlay--video';
      el.setAttribute('data-edit-kind', 'video');
      el.controls = true;
      el.preload = 'metadata';
      if (spec.content) el.src = spec.content;
    } else if (spec.kind === 'image') {
      el = document.createElement('img');
      el.className = 'overlay overlay--image';
      el.setAttribute('data-edit-kind', 'image');
      el.loading = 'lazy';
      el.alt = spec.alt || '';
      if (spec.content) el.src = spec.content;
    } else {
      el = document.createElement('span');
      el.className = 'overlay overlay--icon';
      el.setAttribute('data-edit-kind', 'icon');
      el.setAttribute('data-edit-value', spec.content || '');
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '40');
      svg.setAttribute('height', '40');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '1.75');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      if (spec.alt) svg.setAttribute('aria-label', spec.alt);
      else svg.setAttribute('aria-hidden', 'true');
      el.appendChild(svg);
      if (spec.svgInner) drawIcon(svg, spec.svgInner);
    }
    el.setAttribute('data-overlay', spec.id);
    return el;
  }

  // -------------------------------------------------------- migração
  function elementForKey(key) {
    return key.indexOf('overlay:') === 0
      ? document.querySelector('[data-overlay="' + CSS.escape(key.slice(8)) + '"]')
      : document.querySelector('[data-edit="' + CSS.escape(key) + '"]');
  }

  /**
   * Converte as posições gravadas no sistema antigo (porcentagem do próprio
   * elemento) para o atual (centésimos da largura da seção), medindo onde o
   * elemento está agora. Mesma conta de `migrateLayout`, em src/lib/pages.ts.
   *
   * Só converte o conjunto do dispositivo visível: o de celular precisa ser
   * medido com a pré-visualização em largura de celular para dar no mesmo ponto.
   */
  function migrateLegacy() {
    Object.keys(layouts).forEach(function (key) {
      var pair = layouts[key];
      var layout = pair[device];
      if (!layout || layout.v === 2) return;
      if (layout.x === 0 && layout.y === 0) {
        layout.v = 2;
        return;
      }

      var element = elementForKey(key);
      if (!element) return;
      var section = sectionOf(element);
      if (!section) return;

      var box = section.getBoundingClientRect();
      if (box.width <= 0) return;

      var overlay = isOverlay(element);
      var baseX = overlay ? box.width : element.offsetWidth;
      var baseY = overlay ? box.height : element.offsetHeight;

      var converted = Object.assign({}, layout, {
        v: 2,
        x: round((((layout.x / 100) * baseX) / box.width) * 100),
        y: round((((layout.y / 100) * baseY) / box.width) * 100),
      });

      pair[device] = converted;
      applyLayoutStyle(element, converted);
      post({
        type: 'editor:layout',
        key: key,
        overlay: overlay ? element.getAttribute('data-overlay') : null,
        path: overlay ? null : element.getAttribute('data-edit'),
        device: device,
        layout: converted,
        migration: true,
      });
    });
  }

  // -------------------------------------------------------------- seleção
  /** Nó que de fato recebe `contenteditable` — numa forma é o texto interno,
   * nunca o pacote inteiro (que também contém o SVG do desenho). */
  function editableTargetOf(element) {
    if (kindOf(element) === 'shape') return shapeTextNode(element) || element;
    return element;
  }

  function clearSelection() {
    detachMoveable();
    clearSectionSelection();
    if (!selected) return;
    var editable = editableTargetOf(selected);
    if (editable.isContentEditable) editable.removeAttribute('contenteditable');
    selected.classList.remove('is-edit-selected');
    selected = null;
    editingText = false;
  }

  function select(element, options) {
    if (selected === element) return;
    clearSelection();
    selected = element;
    element.classList.add('is-edit-selected');
    attachMoveable(element);
    post({ type: 'editor:select', element: describe(element) });
    if (options && options.scroll) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // ------------------------------------------------ seleção de seção (fundo)
  var sectionSelected = null;

  function clearSectionSelection() {
    if (!sectionSelected) return;
    sectionSelected.classList.remove('is-edit-section-selected');
    sectionSelected = null;
  }

  function selectSection(section) {
    if (sectionSelected === section) return;
    clearSectionSelection();
    sectionSelected = section;
    section.classList.add('is-edit-section-selected');
    post({ type: 'editor:select-section', section: section.getAttribute('data-section') });
  }

  /** Duplo clique entra na edição do texto; enquanto isso o arrasto sai de cena. */
  function startTextEdit(element) {
    var kind = kindOf(element);
    if (kind !== 'text' && kind !== 'multiline' && kind !== 'shape') return;
    detachMoveable();
    editingText = true;
    var editable = editableTargetOf(element);
    editable.setAttribute('contenteditable', 'true');
    editable.spellcheck = false;
    editable.focus();
  }

  function stopTextEdit() {
    if (!editingText || !selected) return;
    editableTargetOf(selected).removeAttribute('contenteditable');
    editingText = false;
    attachMoveable(selected);
  }

  // -------------------------------------------------------------- eventos
  document.addEventListener(
    'mouseover',
    function (event) {
      var target = event.target.closest(SELECTABLE);
      if (hovered && hovered !== target) hovered.classList.remove('is-edit-hover');
      if (target && target !== selected) {
        target.classList.add('is-edit-hover');
        hovered = target;
      }
    },
    true
  );

  document.addEventListener(
    'mouseout',
    function () {
      if (hovered) {
        hovered.classList.remove('is-edit-hover');
        hovered = null;
      }
    },
    true
  );

  // Bloco funcional (formulário): o `checkInput` do Moveable (acima) não
  // cobre <select> — só input/textarea/contentEditable. Este guarda de
  // mousedown roda em capture no document, ANTES de qualquer listener que o
  // próprio Moveable tenha anexado, e corta a propagação antes que ele veja
  // o evento — sem isso, abrir um <select> dentro do formulário podia virar
  // início de arrasto do bloco inteiro.
  document.addEventListener(
    'mousedown',
    function (event) {
      var formBlock = event.target.closest && event.target.closest('[data-edit-kind="form"]');
      if (!formBlock) return;
      var control = event.target.closest('select, input, textarea, label');
      if (control) event.stopPropagation();
    },
    true
  );

  document.addEventListener(
    'click',
    function (event) {
      var target = event.target.closest(SELECTABLE);

      // Em modo de edição nenhum link navega: clicar num botão seleciona o botão.
      var link = event.target.closest('a, button');
      if (link) {
        event.preventDefault();
        event.stopPropagation();
      }

      if (!target) {
        if (selected) {
          clearSelection();
          post({ type: 'editor:deselect' });
        }
        // Clicou fora de qualquer elemento editável e fora de um link/botão:
        // se o ponto ainda está dentro de uma seção, é uma área vazia do
        // fundo dela — seleciona a SEÇÃO. Clique num link/botão apenas
        // desmarca (ele já teve a navegação bloqueada acima).
        if (!link) {
          var section = event.target.closest('[data-section]');
          if (section) selectSection(section);
          else clearSectionSelection();
        }
        return;
      }

      clearSectionSelection();

      // Campo de um bloco de formulário: seleciona o bloco (para poder
      // movê-lo), mas nunca à custa do próprio campo — bloquear o clique
      // aqui cancelaria o toggle nativo de uma checkbox/radio, por exemplo.
      var formControl =
        kindOf(target) === 'form' && event.target.closest('input, textarea, select, label');

      if (target !== selected && !formControl) {
        event.preventDefault();
        event.stopPropagation();
      }
      select(target);
    },
    true
  );

  document.addEventListener(
    'dblclick',
    function (event) {
      var target = event.target.closest(SELECTABLE);
      if (!target) return;

      // Duplo clique num campo de um bloco de formulário é seleção nativa
      // de palavra (input/textarea) ou abre o <select> — nunca "entrar em
      // edição de texto do bloco".
      if (kindOf(target) === 'form' && event.target.closest('input, textarea, select, label')) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      if (target !== selected) select(target);
      startTextEdit(target);
    },
    true
  );

  // Digitação em elemento de texto: avisa o editor a cada alteração.
  document.addEventListener('input', function (event) {
    var target = event.target.closest(SELECTABLE);
    if (!target || !editingText) return;
    post({
      type: 'editor:change',
      path: target.getAttribute('data-edit'),
      overlay: target.getAttribute('data-overlay'),
      value: editableTargetOf(target).textContent.trim(),
    });
  });

  document.addEventListener('keydown', function (event) {
    if (!selected) return;

    // Nunca intercepta setas dentro de um campo de formulário real (o
    // editor não tem inputs próprios no site, mas um formulário de contato
    // vive na mesma página, e pode estar sob o elemento selecionado).
    var activeTag = document.activeElement && document.activeElement.tagName;
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;

    if (editingText) {
      // Enter fecha a edição de um título de uma linha em vez de criar parágrafo.
      if (event.key === 'Enter' && kindOf(selected) !== 'multiline') {
        event.preventDefault();
        editableTargetOf(selected).blur();
        stopTextEdit();
        return;
      }
      if (event.key === 'Escape') {
        editableTargetOf(selected).blur();
        stopTextEdit();
        return;
      }
      return;
    }

    if (event.key === 'Escape') {
      clearSelection();
      post({ type: 'editor:deselect' });
      return;
    }

    // Setas movem o elemento selecionado, como em qualquer editor visual.
    var step = event.shiftKey ? 10 : 1;
    var delta = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }[event.key];
    if (!delta || layoutFor(selected).locked) return;

    event.preventDefault();
    var overlay = isOverlay(selected);
    translate = [translate[0] + delta[0], translate[1] + delta[1]];
    selected.style.transform = 'translate(' + translate[0] + 'px,' + translate[1] + 'px)';
    commitPosition(selected, overlay);
  });

  window.addEventListener(
    'scroll',
    function () {
      if (selected) post({ type: 'editor:rect', rect: rectOf(selected) });
    },
    { passive: true }
  );

  // -------------------------------------------------- desenho de ícone
  // Formas e atributos que um ícone da biblioteca pode ter. Fora desta lista,
  // nada é copiado — nem <script>, nem <foreignObject>, nem manipulador de
  // evento. É o que permite trocar o desenho sem usar innerHTML.
  var ICON_SHAPES = ['path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'g'];
  var ICON_ATTRS = [
    'd',
    'cx',
    'cy',
    'r',
    'rx',
    'ry',
    'x',
    'y',
    'x1',
    'y1',
    'x2',
    'y2',
    'width',
    'height',
    'points',
    'transform',
    'fill',
    'stroke',
    'stroke-width',
    'stroke-linecap',
    'stroke-linejoin',
  ];

  function copyShapes(source, target) {
    [].forEach.call(source.children, function (node) {
      var tag = node.tagName.toLowerCase();
      if (ICON_SHAPES.indexOf(tag) === -1) return;

      var clone = document.createElementNS('http://www.w3.org/2000/svg', tag);
      ICON_ATTRS.forEach(function (attribute) {
        var value = node.getAttribute(attribute);
        if (value !== null) clone.setAttribute(attribute, value);
      });
      copyShapes(node, clone);
      target.appendChild(clone);
    });
  }

  // Mesma geometria (pontos, rx) usada em src/components/SectionOverlays.astro
  // — o contorno agora é `stroke` de um SVG, não `border` de CSS, porque só
  // assim ele acompanha a silhueta recortada (triângulo, losango, seta).
  var SVGNS = 'http://www.w3.org/2000/svg';
  var SHAPE_POLY_POINTS = {
    triangle: '50,2 98,98 2,98',
    diamond: '50,2 98,50 50,98 2,50',
    arrow: '2,35 60,35 60,10 98,50 60,90 60,65 2,65',
  };
  var HEX6 = /^#[0-9a-fA-F]{6}$/;

  /** Constrói o `<rect>`/`<ellipse>`/`<polygon>` de dentro do SVG de fundo da forma. */
  function buildShapeGeometry(kind) {
    if (kind === 'ellipse') {
      var ellipse = document.createElementNS(SVGNS, 'ellipse');
      ellipse.setAttribute('cx', '50');
      ellipse.setAttribute('cy', '50');
      ellipse.setAttribute('rx', '49');
      ellipse.setAttribute('ry', '49');
      ellipse.setAttribute('vector-effect', 'non-scaling-stroke');
      return ellipse;
    }
    if (SHAPE_POLY_POINTS[kind]) {
      var polygon = document.createElementNS(SVGNS, 'polygon');
      polygon.setAttribute('points', SHAPE_POLY_POINTS[kind]);
      polygon.setAttribute('stroke-linejoin', 'round');
      polygon.setAttribute('vector-effect', 'non-scaling-stroke');
      return polygon;
    }
    var rect = document.createElementNS(SVGNS, 'rect');
    rect.setAttribute('x', '1');
    rect.setAttribute('y', '1');
    rect.setAttribute('width', '98');
    rect.setAttribute('height', '98');
    if (kind === 'rounded') {
      rect.setAttribute('rx', '14');
      rect.setAttribute('ry', '14');
    }
    rect.setAttribute('vector-effect', 'non-scaling-stroke');
    return rect;
  }

  /** SVG de fundo, esticado à caixa toda (`preserveAspectRatio="none"`) — o
   * `stroke` fica com espessura constante em tela via `vector-effect`. */
  function buildShapeSvg(kind) {
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', 'overlay__shape-bg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute(
      'style',
      'position:absolute;inset:0;width:100%;height:100%;pointer-events:none'
    );
    svg.appendChild(buildShapeGeometry(kind));
    return svg;
  }

  /** Nó de texto editável de uma forma — separado do SVG para que reescrever
   * o texto (`textContent =`) nunca apague o desenho de fundo. */
  function shapeTextNode(node) {
    return node.querySelector('.overlay__shape-text');
  }

  /**
   * Mesma conta de `shapeGeometry()` no servidor. `full` sempre traz o estado
   * COMPLETO da forma (não um patch parcial) — o remetente (painel do editor)
   * é quem mantém o registro inteiro e manda tudo de novo a cada mudança,
   * senão redesenhar com só o campo alterado apagaria os outros.
   */
  function applyShapeStyle(node, full) {
    var textEl = shapeTextNode(node);
    if (textEl && typeof full.text === 'string' && textEl.textContent.trim() !== full.text) {
      textEl.textContent = full.text;
    }

    var shapePrimitive = node.querySelector('.overlay__shape-bg > *');
    if (!shapePrimitive) return;
    var fill = HEX6.test(full.fill) ? full.fill : '#12a794';
    var strokeWidth = Math.min(20, Math.max(0, Math.round(Number(full.strokeWidth) || 0)));
    var hasStroke = strokeWidth > 0 && HEX6.test(full.stroke);
    shapePrimitive.setAttribute('fill', fill);
    shapePrimitive.setAttribute('stroke', hasStroke ? full.stroke : 'none');
    shapePrimitive.setAttribute('stroke-width', hasStroke ? String(strokeWidth) : '0');
  }

  function drawIcon(svg, markup) {
    var parsed = new DOMParser().parseFromString(
      '<svg xmlns="http://www.w3.org/2000/svg">' + markup + '</svg>',
      'image/svg+xml'
    );
    if (parsed.querySelector('parsererror')) return;

    while (svg.firstChild) svg.removeChild(svg.firstChild);
    copyShapes(parsed.documentElement, svg);
  }

  // ----------------------------------------------- comandos vindos do editor
  // O mesmo campo pode aparecer em mais de um lugar da página (o vídeo do topo
  // e o da seção promocional são o mesmo dado), então todas as ocorrências
  // precisam refletir a edição.
  function applySet(path, value, extra, overlayId) {
    if (overlayId) {
      var node = document.querySelector('[data-overlay="' + CSS.escape(overlayId) + '"]');
      if (node) applySetTo(node, path || '', value, extra);
      return;
    }
    document.querySelectorAll('[data-edit="' + CSS.escape(path) + '"]').forEach(function (el) {
      applySetTo(el, path, value, extra);
    });
  }

  function applySetTo(element, path, value, extra) {
    var kind = kindOf(element);

    if (kind === 'image' || kind === 'video') {
      element.setAttribute('src', value);
      return;
    }

    if (kind === 'icon') {
      element.setAttribute('data-edit-value', value);
      var svg =
        element.tagName.toLowerCase() === 'svg' ? element : element.querySelector('svg');

      if (/^(\/|https?:\/\/)/.test(value)) {
        // Ícone personalizado enviado pela Mídia: vira <img>, montado por DOM
        // (nunca innerHTML) para que a URL não possa injetar marcação.
        var img = document.createElement('img');
        img.src = value;
        img.className = 'icon icon--custom';
        img.setAttribute('data-edit', path);
        img.setAttribute('data-edit-kind', 'icon');
        img.setAttribute('data-edit-value', value);
        img.setAttribute('aria-hidden', 'true');
        if (svg) {
          img.width = svg.getAttribute('width') || 24;
          img.height = svg.getAttribute('height') || 24;
        }
        element.replaceWith(img);
        return;
      }

      if (svg && extra && typeof extra.svgInner === 'string') {
        drawIcon(svg, extra.svgInner);
      }
      return;
    }

    if (kind === 'shape') {
      // Nunca `element.textContent =` aqui: apagaria o SVG do desenho junto.
      var shapeText = shapeTextNode(element);
      if (shapeText && shapeText.textContent.trim() !== value) shapeText.textContent = value;
      return;
    }

    if (element.textContent.trim() !== value) element.textContent = value;
  }

  var BACKGROUND_PROPS = [
    'background',
    'background-image',
    'background-size',
    'background-position',
    'background-color',
    'color',
  ];

  /**
   * O editor manda o CSS já montado e validado (mesmas regras de
   * `sectionStyleAttr`, em src/lib/pages.ts). Aplicamos declaração por
   * declaração para não apagar o `order`, que também vive no style inline.
   */
  function applySectionStyle(section, css) {
    var element = document.querySelector('[data-section="' + CSS.escape(section) + '"]');
    if (!element) return;

    BACKGROUND_PROPS.forEach(function (property) {
      element.style.removeProperty(property);
    });

    String(css || '')
      .split(';')
      .forEach(function (declaration) {
        var split = declaration.indexOf(':');
        if (split === -1) return;
        var property = declaration.slice(0, split).trim();
        var value = declaration.slice(split + 1).trim();
        if (property && value) element.style.setProperty(property, value);
      });
  }

  // A Home posiciona as seções por `order` do flexbox, então reordenar é
  // reescrever esse número — mover os nós no DOM não teria efeito visual.
  function applySectionOrder(orderMap) {
    Object.keys(orderMap).forEach(function (key) {
      var node = document.querySelector('[data-section="' + CSS.escape(key) + '"]');
      if (node) node.style.order = String(orderMap[key]);
    });
  }

  function applyHiddenSections(hidden) {
    document.querySelectorAll('[data-section]').forEach(function (node) {
      var isHidden = hidden.indexOf(node.getAttribute('data-section')) !== -1;
      node.classList.toggle('is-edit-hidden-section', isHidden);
    });
  }

  window.addEventListener('message', function (event) {
    if (event.origin !== ORIGIN || !event.data || typeof event.data !== 'object') return;
    var data = event.data;

    switch (data.type) {
      case 'editor:set':
        applySet(data.path, data.value, data.extra, data.overlay);
        break;

      case 'editor:select-overlay': {
        var node = document.querySelector('[data-overlay="' + CSS.escape(data.id) + '"]');
        if (node) select(node, { scroll: true });
        break;
      }
      case 'editor:section-style':
        applySectionStyle(data.section, data.css);
        break;
      case 'editor:section-order':
        applySectionOrder(data.orderMap || {});
        break;
      case 'editor:hidden-sections':
        applyHiddenSections(data.hidden || []);
        break;
      case 'editor:select-path': {
        var element = document.querySelector('[data-edit="' + CSS.escape(data.path) + '"]');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          select(element, { focus: false });
        }
        break;
      }
      case 'editor:scroll-to-section': {
        var section = document.querySelector(
          '[data-section="' + CSS.escape(data.section) + '"]'
        );
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
      case 'editor:deselect':
        clearSelection();
        break;

      // Layouts já gravados, enviados quando a pré-visualização abre — MAS
      // também reenviados inteiros a cada alteração feita pelo painel de
      // Camadas (reordenar, travar, ocultar, renomear — ver `setLayerProp`
      // no admin). Sem repintar aqui, essas mudanças só apareciam depois de
      // outra ação disparar `applyLayoutStyle` por acaso (ex.: selecionar o
      // elemento) — o painel achava que tinha mudado, a pré-visualização
      // continuava com o estilo antigo.
      case 'editor:layouts':
        layouts = data.layouts || {};
        migrateLegacy();
        Object.keys(layouts).forEach(function (key) {
          var element = elementForKey(key);
          if (element) applyLayoutStyle(element, layoutFor(element));
        });
        sendInventory();
        break;

      case 'editor:inventory-request':
        sendInventory();
        break;

      // Elemento arrastado da barra lateral: o ponto onde foi solto vira a
      // seção correspondente e a coordenada proporcional dentro dela.
      case 'editor:drop-point': {
        var point = document.elementFromPoint(data.clientX, data.clientY);
        var dropSection = point && point.closest('[data-section]');
        if (!dropSection) {
          post({ type: 'editor:drop-missed' });
          break;
        }
        var dropBox = dropSection.getBoundingClientRect();
        post({
          type: 'editor:drop-resolved',
          kind: data.kind,
          section: dropSection.getAttribute('data-section'),
          x: round(((data.clientX - dropBox.left) / dropBox.width) * 100),
          y: round(((data.clientY - dropBox.top) / dropBox.width) * 100),
        });
        break;
      }

      // Inserção por clique: usa o meio da parte da seção que já está visível
      // na tela, em vez de sempre um ponto fixo perto do topo da seção — que
      // podia cair fora da área que o usuário está olhando, numa seção alta.
      case 'editor:visible-insert-request': {
        var target = document.querySelector(
          '[data-section="' + CSS.escape(data.section) + '"]'
        );
        if (!target) break;

        var tbox = target.getBoundingClientRect();
        var visibleTop = Math.max(tbox.top, 0);
        var visibleBottom = Math.min(tbox.bottom, window.innerHeight);

        if (visibleBottom - visibleTop < 40) {
          // Praticamente nada da seção está à vista: traz para o centro da
          // tela antes de calcular o ponto (sem isso o elemento nasceria
          // fora da área visível de qualquer forma).
          target.scrollIntoView({ block: 'center' });
          tbox = target.getBoundingClientRect();
          visibleTop = Math.max(tbox.top, 0);
          visibleBottom = Math.min(tbox.bottom, window.innerHeight);
        }

        var py = (visibleTop + visibleBottom) / 2;
        post({
          type: 'editor:drop-resolved',
          kind: data.kind,
          section: data.section,
          x: round(((tbox.width * 0.35) / tbox.width) * 100),
          y: round(((py - tbox.top) / tbox.width) * 100),
        });
        break;
      }

      case 'editor:select-key': {
        var byKey = elementForKey(data.key);
        if (byKey) select(byKey, { scroll: true });
        break;
      }

      // Cria o elemento livre AO VIVO no DOM (sem recarregar a página), para
      // preservar a rolagem e poder selecioná-lo e movê-lo imediatamente.
      // Preenchimento/borda/texto/link de uma forma mudaram — reaplica ao
      // vivo, na mesma conta que `shapeStyle()` faz em SectionOverlays.astro.
      case 'editor:shape-style': {
        var shapeNode = document.querySelector('[data-overlay="' + CSS.escape(data.id) + '"]');
        if (!shapeNode) break;
        applyShapeStyle(shapeNode, data.style);
        break;
      }

      case 'editor:overlay-create': {
        var created = createOverlayElement(data.overlay);
        if (!created) break;
        var host = document.querySelector(
          '[data-section="' + CSS.escape(data.overlay.section) + '"]'
        );
        if (!host) break;
        layouts['overlay:' + data.overlay.id] = {
          desktop: data.overlay.desktop || emptyLayout(),
          mobile: data.overlay.mobile || null,
        };
        host.appendChild(created);
        applyLayoutStyle(created, layoutFor(created));
        if (data.overlay.kind === 'shape') applyShapeStyle(created, data.overlay);
        select(created, { scroll: false });
        sendInventory();
        break;
      }

      case 'editor:device':
        device = data.device === 'mobile' ? 'mobile' : 'desktop';
        // A conversão precisa medir na largura daquele dispositivo, então cada
        // conjunto é convertido quando passa a ser o visível.
        migrateLegacy();
        sendInventory();
        if (selected) {
          applyLayoutStyle(selected, layoutFor(selected));
          attachMoveable(selected);
          post({ type: 'editor:select', element: describe(selected) });
        }
        break;

      // Propriedade alterada na barra do editor (fonte, cor, camada, trava…).
      case 'editor:layout-prop': {
        if (!selected) break;
        var current = Object.assign({}, layoutFor(selected));
        current[data.property] = data.value;
        layouts[keyOf(selected)][device] = current;
        applyLayoutStyle(selected, current);
        if (data.property === 'locked') {
          if (current.locked) detachMoveable();
          else attachMoveable(selected);
        } else if (moveable) {
          moveable.updateRect();
        }
        reportLayout(selected, current);
        sendInventory();
        break;
      }

      case 'editor:layout-reset': {
        if (!selected) break;
        var cleared = emptyLayout();
        layouts[keyOf(selected)][device] = cleared;
        applyLayoutStyle(selected, cleared);
        translate = [0, 0];
        reportLayout(selected, cleared);
        if (moveable) moveable.updateRect();
        post({ type: 'editor:select', element: describe(selected) });
        break;
      }
    }
  });

  /**
   * Reescreve o style inline a partir do layout, nas mesmas unidades que o
   * servidor usa em `layoutStylesheet` — o que se vê no editor é o que o site
   * vai renderizar.
   */
  function axis(value, layout) {
    return layout.v === 2 ? value + 'cqw' : value + '%';
  }

  function applyLayoutStyle(element, layout) {
    var overlay = isOverlay(element);
    var style = element.style;

    // Mesma composição de `layoutDeclarations` em src/lib/pages.ts: o elemento
    // livre é posicionado por left/top; o existente é deslocado da posição
    // natural por translate. O giro entra no transform nos dois casos.
    var transforms = [];

    if (overlay) {
      style.position = 'absolute';
      style.left = axis(layout.x, layout);
      style.top = axis(layout.y, layout);
      style.height = layout.h > 0 ? layout.h + 'cqw' : '';
    } else {
      if (layout.x || layout.y) {
        transforms.push(
          'translate(' + axis(layout.x, layout) + ',' + axis(layout.y, layout) + ')'
        );
      }
      // `inline-block` é o que faz width/transform funcionarem num <span> de
      // texto (inline por padrão) — mas um bloco funcional (kind "form") já
      // é um container de verdade (div em grid/flex); forçar inline-block
      // nele encolheria a largura para o conteúdo e quebraria o layout.
      style.display =
        kindOf(element) === 'form' ? '' : layout.x || layout.y || layout.w ? 'inline-block' : '';
    }

    if (layout.r) transforms.push('rotate(' + layout.r + 'deg)');
    style.transform = transforms.join(' ');

    // No editor, elemento oculto continua visível e esmaecido para poder ser
    // reativado; no site ele sai com display:none pela folha de estilo.
    element.classList.toggle('is-edit-hidden', layout.hidden === true);

    style.width = layout.w > 0 ? layout.w + 'cqw' : '';
    style.zIndex = layout.z > 0 ? String(layout.z) : '';
    style.fontSize = layout.fontSize > 0 ? layout.fontSize + 'rem' : '';
    style.color = layout.color || '';
    style.textAlign = layout.align || '';
    style.fontWeight = layout.weight > 0 ? String(layout.weight) : '';
    element.classList.toggle('is-edit-locked', layout.locked === true);
  }

  // ------------------------------------------- arrastar itens de uma lista
  // Depois de mover um item, os caminhos (`benefits.items.2.title`) ficam
  // apontando para a posição antiga. Renumerar aqui evita ter que recarregar a
  // pré-visualização a cada arrasto.
  function renumberList(container, listPath) {
    var prefix = listPath + '.';
    container.querySelectorAll('[data-edit-item]').forEach(function (item, index) {
      if (item.parentElement !== container) return;
      item.setAttribute('data-edit-item', String(index));

      var targets = [].slice.call(item.querySelectorAll('[data-edit]'));
      if (item.hasAttribute('data-edit')) targets.push(item);

      targets.forEach(function (el) {
        var path = el.getAttribute('data-edit');
        if (!path || path.indexOf(prefix) !== 0) return;
        var rest = path.slice(prefix.length);
        var dot = rest.indexOf('.');
        el.setAttribute('data-edit', prefix + index + (dot === -1 ? '' : rest.slice(dot)));
      });
    });
  }

  var dragItem = null;

  function itemIndex(element) {
    return Number(element.getAttribute('data-edit-item'));
  }

  document.querySelectorAll('[data-edit-list]').forEach(function (container) {
    var listPath = container.getAttribute('data-edit-list');
    if (!listPath) return;

    container.querySelectorAll('[data-edit-item]').forEach(function (item) {
      if (item.parentElement !== container) return;
      item.draggable = true;
    });

    container.addEventListener('dragstart', function (event) {
      var item = event.target.closest('[data-edit-item]');
      if (!item || item.parentElement !== container) return;
      dragItem = item;
      item.classList.add('is-edit-dragging');
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    });

    container.addEventListener('dragend', function () {
      if (dragItem) dragItem.classList.remove('is-edit-dragging');
      dragItem = null;
      container.querySelectorAll('.is-edit-drop').forEach(function (n) {
        n.classList.remove('is-edit-drop');
      });
    });

    container.addEventListener('dragover', function (event) {
      if (!dragItem || dragItem.parentElement !== container) return;
      event.preventDefault();
      var over = event.target.closest('[data-edit-item]');
      if (over && over.parentElement === container && over !== dragItem) {
        container.querySelectorAll('.is-edit-drop').forEach(function (n) {
          n.classList.remove('is-edit-drop');
        });
        over.classList.add('is-edit-drop');
      }
    });

    container.addEventListener('drop', function (event) {
      if (!dragItem || dragItem.parentElement !== container) return;
      event.preventDefault();
      var over = event.target.closest('[data-edit-item]');
      if (!over || over.parentElement !== container || over === dragItem) return;

      var from = itemIndex(dragItem);
      var to = itemIndex(over);
      container.insertBefore(dragItem, from < to ? over.nextSibling : over);
      renumberList(container, listPath);
      clearSelection();

      post({ type: 'editor:reorder', listPath: listPath, from: from, to: to });
    });
  });

  // -------------------------------------------------------- inventário
  /**
   * Lista o que existe em cada seção, na ordem em que aparece no documento.
   * É o que alimenta o painel de camadas — que precisa mostrar também o que
   * ainda não foi tocado, e portanto não tem layout gravado.
   */
  function inventory() {
    var items = [];
    document.querySelectorAll('[data-section]').forEach(function (section) {
      var key = section.getAttribute('data-section');
      section.querySelectorAll(SELECTABLE).forEach(function (element) {
        // Um campo pode aparecer duas vezes na página (o vídeo do topo e o da
        // seção). A camada é uma só.
        var id = keyOf(element);
        if (!id || items.some((item) => item.key === id)) return;

        var layout = layoutFor(element);
        items.push({
          key: id,
          section: key,
          kind: kindOf(element),
          overlay: element.getAttribute('data-overlay'),
          path: element.getAttribute('data-edit'),
          label:
            layout.label ||
            element.getAttribute('data-edit-label') ||
            (element.getAttribute('data-overlay') ? 'Elemento livre' : id),
          text: (element.textContent || '').trim().slice(0, 40),
          locked: layout.locked === true,
          hidden: layout.hidden === true,
          z: layout.z || 0,
        });
      });
    });
    return items;
  }

  function sendInventory() {
    post({ type: 'editor:inventory', items: inventory(), device: device });
  }

  // ------------------------------------------------------------ inicialização
  function announce() {
    var sections = [];
    document.querySelectorAll('[data-section]').forEach(function (node) {
      sections.push({
        key: node.getAttribute('data-section'),
        label: node.getAttribute('data-section-label') || node.getAttribute('data-section'),
      });
    });
    post({ type: 'editor:ready', sections: sections });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    announce();
  } else {
    document.addEventListener('DOMContentLoaded', announce);
  }
})();
