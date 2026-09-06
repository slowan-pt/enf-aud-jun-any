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
    return {
      path: element.getAttribute('data-edit'),
      kind: kindOf(element),
      value: valueOf(element),
      label: element.getAttribute('data-edit-label') || '',
      section: closestSection(element),
      rect: rectOf(element),
    };
  }

  function closestSection(element) {
    var node = element.closest('[data-section]');
    return node ? node.getAttribute('data-section') : '';
  }

  // -------------------------------------------------------------- seleção
  function clearSelection() {
    if (!selected) return;
    if (selected.isContentEditable) {
      selected.removeAttribute('contenteditable');
    }
    selected.classList.remove('is-edit-selected');
    selected = null;
  }

  function select(element, options) {
    if (selected === element) return;
    clearSelection();
    selected = element;
    element.classList.add('is-edit-selected');

    var kind = kindOf(element);
    if (kind === 'text' || kind === 'multiline') {
      element.setAttribute('contenteditable', 'true');
      element.spellcheck = false;
      if (!options || options.focus !== false) element.focus();
    }

    post({ type: 'editor:select', element: describe(element) });
  }

  // -------------------------------------------------------------- eventos
  document.addEventListener(
    'mouseover',
    function (event) {
      var target = event.target.closest('[data-edit]');
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
      var target = event.target.closest('[data-edit]');

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

  // Digitação em elemento de texto: avisa o editor a cada alteração.
  document.addEventListener('input', function (event) {
    var target = event.target.closest('[data-edit]');
    if (!target || !target.isContentEditable) return;
    post({
      type: 'editor:change',
      path: target.getAttribute('data-edit'),
      value: target.textContent.trim(),
    });
  });

  // Enter finaliza a edição de um título de uma linha em vez de criar parágrafo.
  document.addEventListener('keydown', function (event) {
    if (!selected || !selected.isContentEditable) return;
    if (event.key === 'Enter' && kindOf(selected) !== 'multiline') {
      event.preventDefault();
      selected.blur();
    }
    if (event.key === 'Escape') {
      selected.blur();
      clearSelection();
      post({ type: 'editor:deselect' });
    }
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
  function applySet(path, value, extra) {
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

  function applySectionStyle(section, property, value) {
    var element = document.querySelector('[data-section="' + CSS.escape(section) + '"]');
    if (!element) return;
    if (property === 'bg') element.style.background = value;
    if (property === 'text') element.style.color = value;
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
        applySet(data.path, data.value, data.extra);
        break;
      case 'editor:section-style':
        applySectionStyle(data.section, data.property, data.value);
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
    }
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
