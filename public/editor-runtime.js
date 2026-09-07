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
      locked: false,
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

  /** Irmãos da mesma seção viram guias de alinhamento. */
  function guidelinesFor(element) {
    var section = sectionOf(element);
    if (!section) return [];
    var nodes = section.querySelectorAll('[data-edit],[data-overlay]');
    return [].slice.call(nodes).filter(function (node) {
      return node !== element && node.offsetWidth > 0;
    });
  }

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

    moveable = new window.Moveable(document.body, {
      target: element,
      draggable: true,
      resizable: true,
      snappable: true,
      origin: false,
      edge: false,
      keepRatio: false,
      throttleDrag: 0,
      throttleResize: 0,
      elementGuidelines: guidelinesFor(element),
      snapThreshold: 6,
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
      })
      .on('drag', function (event) {
        translate = event.beforeTranslate;
        element.style.transform = 'translate(' + translate[0] + 'px,' + translate[1] + 'px)';
      })
      .on('dragEnd', function () {
        commitPosition(element, overlay);
      })
      .on('resizeStart', function (event) {
        event.setOrigin(['%', '%']);
        if (event.dragStart) event.dragStart.set(translate);
      })
      .on('resize', function (event) {
        element.style.width = event.width + 'px';
        if (overlay) element.style.height = event.height + 'px';
        translate = event.drag.beforeTranslate;
        element.style.transform = 'translate(' + translate[0] + 'px,' + translate[1] + 'px)';
      })
      .on('resizeEnd', function () {
        commitSize(element, overlay);
        commitPosition(element, overlay);
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

  function round(value) {
    return Math.round(value * 100) / 100;
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
  function clearSelection() {
    detachMoveable();
    if (!selected) return;
    if (selected.isContentEditable) selected.removeAttribute('contenteditable');
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

  /** Duplo clique entra na edição do texto; enquanto isso o arrasto sai de cena. */
  function startTextEdit(element) {
    var kind = kindOf(element);
    if (kind !== 'text' && kind !== 'multiline') return;
    detachMoveable();
    editingText = true;
    element.setAttribute('contenteditable', 'true');
    element.spellcheck = false;
    element.focus();
  }

  function stopTextEdit() {
    if (!editingText || !selected) return;
    selected.removeAttribute('contenteditable');
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
        if (selected && !selected.contains(event.target)) {
          clearSelection();
          post({ type: 'editor:deselect' });
        }
        return;
      }

      if (target !== selected) {
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
    if (!target || !target.isContentEditable) return;
    post({
      type: 'editor:change',
      path: target.getAttribute('data-edit'),
      overlay: target.getAttribute('data-overlay'),
      value: target.textContent.trim(),
    });
  });

  document.addEventListener('keydown', function (event) {
    if (!selected) return;

    if (selected.isContentEditable) {
      // Enter fecha a edição de um título de uma linha em vez de criar parágrafo.
      if (event.key === 'Enter' && kindOf(selected) !== 'multiline') {
        event.preventDefault();
        selected.blur();
        stopTextEdit();
        return;
      }
      if (event.key === 'Escape') {
        selected.blur();
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

      // Ícone da biblioteca: o conteúdo vem do nosso próprio mapa de ícones,
      // enviado pela janela do editor — não é texto digitado pelo usuário.
      if (svg && extra && typeof extra.svgInner === 'string') {
        svg.innerHTML = extra.svgInner;
      }
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

      // Layouts já gravados, enviados quando a pré-visualização abre.
      case 'editor:layouts':
        layouts = data.layouts || {};
        migrateLegacy();
        break;

      case 'editor:device':
        device = data.device === 'mobile' ? 'mobile' : 'desktop';
        // A conversão precisa medir na largura daquele dispositivo, então cada
        // conjunto é convertido quando passa a ser o visível.
        migrateLegacy();
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

    if (overlay) {
      style.position = 'absolute';
      style.left = axis(layout.x, layout);
      style.top = axis(layout.y, layout);
      style.transform = '';
      style.height = layout.h > 0 ? layout.h + 'cqw' : '';
    } else {
      style.transform =
        layout.x || layout.y
          ? 'translate(' + axis(layout.x, layout) + ',' + axis(layout.y, layout) + ')'
          : '';
      style.display = layout.x || layout.y || layout.w ? 'inline-block' : '';
    }

    style.width = layout.w > 0 ? layout.w + '%' : '';
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
