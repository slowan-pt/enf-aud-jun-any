/**
 * Cor dos cards no Editor Visual — carregado por editor-runtime.js (só dentro do
 * iframe do editor, com usuário autenticado).
 *
 * Passe o mouse sobre um card: aparece o botão "Cor". Escolha um tom para AQUELE
 * card, use "Aplicar em todos os cards" para valer para o site inteiro, ou volte
 * ao tom geral. Grava em /admin/api/card-style (mesma fonte usada pela página
 * pública, por isso vale em todas as páginas). Ver src/lib/card-style.ts.
 */
(function () {
  'use strict';
  if (window.top === window.self) return;

  var state = null; // { tones, all, overrides }
  var chip = null;
  var pop = null;
  var current = null; // card com o botão aberto
  var hideTimer = null;

  var css = document.createElement('style');
  css.textContent = [
    '.ecc-chip{position:fixed;z-index:2147483000;display:none;align-items:center;gap:6px;padding:5px 10px;',
    'border:1px solid #cbd5e1;border-radius:999px;background:#fff;color:#0b2545;font:600 12px/1 system-ui,sans-serif;',
    'box-shadow:0 4px 14px rgba(11,37,69,.18);cursor:pointer}',
    '.ecc-chip i{width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #94a3b8}',
    '.ecc-pop{position:fixed;z-index:2147483001;display:none;width:236px;padding:12px;border:1px solid #cbd5e1;',
    'border-radius:12px;background:#fff;color:#0b2545;font:13px/1.3 system-ui,sans-serif;box-shadow:0 12px 32px rgba(11,37,69,.25)}',
    '.ecc-pop b{display:block;margin-bottom:8px;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#475569}',
    '.ecc-sw{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-bottom:10px}',
    '.ecc-sw button{height:30px;border-radius:8px;cursor:pointer;padding:0;border:2px solid transparent}',
    '.ecc-sw button.is-on{outline:2px solid #2563eb;outline-offset:1px}',
    '.ecc-act{display:block;width:100%;margin-top:6px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;',
    'background:#f8fafc;color:#0b2545;font:600 12px/1.2 system-ui,sans-serif;cursor:pointer;text-align:left}',
    '.ecc-act:hover{background:#eef4fb}',
    '.ecc-msg{margin-top:8px;font-size:11px;color:#475569;min-height:14px}',
  ].join('');
  document.head.appendChild(css);

  function tone(id) {
    if (!state) return null;
    for (var i = 0; i < state.tones.length; i++) if (state.tones[i].id === id) return state.tones[i];
    return null;
  }

  function toneOfCard(card) {
    var key = card.getAttribute('data-card-key');
    return state.overrides[key] || state.all;
  }

  function api(body) {
    return fetch('/admin/api/card-style', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error(j.error || 'Falha ao salvar.');
        return j;
      });
    });
  }

  function applyVars(el, t) {
    el.style.setProperty('--card-bg', t.bg);
    el.style.setProperty('--card-border', t.border);
    el.style.setProperty('--card-accent', t.accent);
  }

  function clearVars(el) {
    el.style.removeProperty('--card-bg');
    el.style.removeProperty('--card-border');
    el.style.removeProperty('--card-accent');
  }

  function say(text) {
    var m = pop.querySelector('.ecc-msg');
    if (m) m.textContent = text || '';
  }

  function build() {
    chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'ecc-chip';
    chip.setAttribute('data-ecc', '');
    chip.innerHTML = '<i></i>Cor do card';
    document.body.appendChild(chip);

    pop = document.createElement('div');
    pop.className = 'ecc-pop';
    pop.setAttribute('data-ecc', '');
    pop.innerHTML =
      '<b>Cor do card</b><div class="ecc-sw"></div>' +
      '<button type="button" class="ecc-act" data-act="all">Aplicar esta cor em todos os cards</button>' +
      '<button type="button" class="ecc-act" data-act="reset">Voltar ao tom geral</button>' +
      '<div class="ecc-msg"></div>';
    document.body.appendChild(pop);

    var sw = pop.querySelector('.ecc-sw');
    state.tones.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.title = t.label;
      b.setAttribute('data-tone', t.id);
      b.style.background = t.bg;
      b.style.borderColor = t.accent;
      sw.appendChild(b);
    });

    chip.addEventListener('mouseenter', function () {
      clearTimeout(hideTimer);
    });
    chip.addEventListener('click', function () {
      if (!current) return;
      var r = chip.getBoundingClientRect();
      pop.style.display = 'block';
      var left = Math.min(window.innerWidth - 248, Math.max(8, r.right - 236));
      var top = r.bottom + 6;
      if (top + 200 > window.innerHeight) top = Math.max(8, r.top - 200);
      pop.style.left = left + 'px';
      pop.style.top = top + 'px';
      refreshPop();
      say('');
    });

    pop.addEventListener('mouseenter', function () {
      clearTimeout(hideTimer);
    });

    pop.addEventListener('click', function (event) {
      var target = event.target;
      if (!current) return;
      var key = current.getAttribute('data-card-key');
      var toneBtn = target.closest('[data-tone]');
      var act = target.closest('[data-act]');

      if (toneBtn) {
        var id = toneBtn.getAttribute('data-tone');
        say('Salvando…');
        api({ op: 'set', key: key, color: id })
          .then(function (res) {
            state.overrides = res.overrides;
            applyVars(current, tone(id));
            refreshPop();
            say('Cor deste card salva.');
          })
          .catch(function (e) {
            say(e.message);
          });
      } else if (act && act.getAttribute('data-act') === 'all') {
        var id2 = toneOfCard(current);
        if (!window.confirm('Aplicar esta cor em TODOS os cards do site? As cores individuais serão substituídas.')) return;
        say('Salvando…');
        api({ op: 'all', color: id2 })
          .then(function (res) {
            state.all = res.all;
            state.overrides = {};
            var t = tone(res.all);
            var el = document.getElementById('card-style');
            if (el && t) {
              el.textContent =
                ':root{--card-bg:' + t.bg + ';--card-border:' + t.border + ';--card-accent:' + t.accent + '}';
            }
            document.querySelectorAll('[data-card-key]').forEach(clearVars);
            refreshPop();
            say('Aplicado em todos os cards.');
          })
          .catch(function (e) {
            say(e.message);
          });
      } else if (act && act.getAttribute('data-act') === 'reset') {
        say('Salvando…');
        api({ op: 'set', key: key, color: null })
          .then(function (res) {
            state.overrides = res.overrides;
            clearVars(current);
            // exceção removida: o CSS do servidor ainda tem a regra antiga, então fixa o tom geral inline
            applyVars(current, tone(state.all));
            refreshPop();
            say('Voltou ao tom geral.');
          })
          .catch(function (e) {
            say(e.message);
          });
      }
    });
  }

  function refreshPop() {
    if (!current) return;
    var id = toneOfCard(current);
    pop.querySelectorAll('[data-tone]').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-tone') === id);
    });
    var t = tone(id);
    if (t) chip.querySelector('i').style.background = t.accent;
  }

  function showChip(card) {
    current = card;
    var r = card.getBoundingClientRect();
    chip.style.display = 'inline-flex';
    chip.style.left = Math.max(8, Math.min(window.innerWidth - 120, r.right - 112)) + 'px';
    chip.style.top = Math.max(8, r.top + 8) + 'px';
    refreshPop();
  }

  function hideChip() {
    if (chip) chip.style.display = 'none';
    if (pop) pop.style.display = 'none';
    current = null;
  }

  document.addEventListener('mouseover', function (event) {
    if (!state) return;
    var card = event.target.closest && event.target.closest('[data-card-key]');
    if (card) {
      clearTimeout(hideTimer);
      if (card !== current) {
        if (pop) pop.style.display = 'none';
        showChip(card);
      }
    } else if (!event.target.closest('[data-ecc]')) {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(hideChip, 350);
    }
  });

  window.addEventListener('scroll', function () {
    if (current && chip && chip.style.display !== 'none') showChip(current);
  }, true);

  fetch('/admin/api/card-style')
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(function (data) {
      if (!data || !data.tones) return;
      state = data;
      build();
    })
    .catch(function () {});
})();
