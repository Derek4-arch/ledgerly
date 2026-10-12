/* Ledgerly - UI primitives: sheets, dialogs, toasts, command palette */
(function (root) {
  'use strict';
  var LG = root.LG, U = LG.U;
  var stack = [];
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function overlayRoot() { return document.getElementById('overlay-root'); }
  function syncLock() { document.documentElement.classList.toggle('has-overlay', stack.length > 0); }

  function trap(e, el) {
    if (e.key !== 'Tab') return;
    var f = U.$$(FOCUSABLE, el).filter(function (x) { return x.offsetParent !== null || x === document.activeElement; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /** Generic overlay. kind: 'sheet' | 'dialog' | 'palette' */
  function open(kind, opts) {
    opts = opts || {};
    var prevFocus = document.activeElement;
    var id = 'ov' + U.uid();
    var wrap = document.createElement('div');
    wrap.className = 'overlay overlay--' + kind + (opts.className ? ' ' + opts.className : '');
    var head = opts.title !== undefined
      ? '<header class="' + kind + '__head">' + (kind === 'sheet' ? '<span class="sheet__grab" aria-hidden="true"></span>' : '') +
        '<div class="' + kind + '__titles"><h2 id="' + id + '-t" class="' + kind + '__title">' + opts.title + '</h2>' + (opts.subtitle ? '<p class="' + kind + '__sub">' + opts.subtitle + '</p>' : '') + '</div>' +
        (opts.headExtra || '') + '<button type="button" class="icon-btn" data-ov-close aria-label="Close">' + U.icon('x', 20) + '</button></header>'
      : '';
    wrap.innerHTML = '<div class="scrim" data-ov-close></div><section class="' + kind + '" role="dialog" aria-modal="true"' + (opts.title !== undefined ? ' aria-labelledby="' + id + '-t"' : ' aria-label="' + U.esc(opts.label || 'Dialog') + '"') + '>' +
      head + '<div class="' + kind + '__body">' + (opts.body || '') + '</div>' + (opts.footer ? '<footer class="' + kind + '__foot">' + opts.footer + '</footer>' : '') + '</section>';
    overlayRoot().appendChild(wrap);
    var panel = wrap.querySelector('section');
    var api = {
      el: panel, wrap: wrap, closed: false,
      close: function (result) {
        if (api.closed) return;
        api.closed = true;
        stack = stack.filter(function (s) { return s !== api; });
        syncLock();
        wrap.classList.remove('is-open');
        wrap.classList.add('is-closing');
        var done = function () { wrap.remove(); };
        if (U.reducedMotion()) done(); else setTimeout(done, 260);
        if (prevFocus && prevFocus.focus && document.contains(prevFocus)) { try { prevFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
        if (opts.onClose) opts.onClose(result);
      },
      setBody: function (html) { panel.querySelector('.' + kind + '__body').innerHTML = html; },
      setFooter: function (html) { var f = panel.querySelector('.' + kind + '__foot'); if (f) f.innerHTML = html; }
    };
    wrap.addEventListener('click', function (e) { if (e.target.closest('[data-ov-close]')) { e.preventDefault(); api.close(); } });
    panel.addEventListener('keydown', function (e) { trap(e, panel); });
    stack.push(api);
    syncLock();
    requestAnimationFrame(function () { requestAnimationFrame(function () { wrap.classList.add('is-open'); }); });
    if (opts.onMount) opts.onMount(panel, api);
    setTimeout(function () {
      if (api.closed) return;
      var target = panel.querySelector('[autofocus]') || panel.querySelector('.' + kind + '__body ' + FOCUSABLE) || panel.querySelector(FOCUSABLE);
      if (target) try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
    }, 60);
    return api;
  }

  function sheet(opts) { return open('sheet', opts); }
  function closeTop() { var top = stack[stack.length - 1]; if (top) { top.close(); return true; } return false; }
  function closeAll() { stack.slice().reverse().forEach(function (s) { s.close(); }); }
  function isOpen() { return stack.length > 0; }

  /** Promise-based confirm dialog */
  function confirm(o) {
    return new Promise(function (resolve) {
      var answered = false;
      var d = open('dialog', {
        title: U.esc(o.title || 'Are you sure?'),
        body: '<p class="dialog__text">' + (o.body || '') + '</p>' + (o.extra || ''),
        footer: '<button type="button" class="btn btn--ghost" data-dlg="no">' + U.esc(o.cancelLabel || 'Cancel') + '</button>' +
          '<button type="button" class="btn ' + (o.danger ? 'btn--danger' : 'btn--primary') + '" data-dlg="yes" autofocus>' + U.esc(o.confirmLabel || 'Confirm') + '</button>',
        onClose: function () { if (!answered) resolve(false); }
      });
      d.el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-dlg]');
        if (!b) return;
        answered = true;
        resolve(b.getAttribute('data-dlg') === 'yes' ? (o.collect ? o.collect(d.el) || true : true) : false);
        d.close();
      });
    });
  }

  /* ---------- toasts ---------- */
  function toast(message, o) {
    o = o || {};
    var host = document.getElementById('toasts');
    var el = document.createElement('div');
    el.className = 'toast' + (o.tone ? ' toast--' + o.tone : '');
    el.setAttribute('role', o.tone === 'error' ? 'alert' : 'status');
    el.innerHTML = '<span class="toast__icon">' + U.icon(o.icon || (o.tone === 'error' ? 'alert' : 'check'), 18) + '</span><span class="toast__msg">' + U.esc(message) + '</span>' +
      (o.action ? '<button type="button" class="toast__action">' + (o.action.icon ? U.icon(o.action.icon, 16) : '') + U.esc(o.action.label) + '</button>' : '') +
      '<button type="button" class="toast__close" aria-label="Dismiss">' + U.icon('x', 16) + '</button>';
    host.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-in'); });
    var timer, remaining = o.timeout || (o.action ? 7000 : 3500), started;
    function remove() {
      clearTimeout(timer);
      el.classList.remove('is-in'); el.classList.add('is-out');
      setTimeout(function () { el.remove(); }, U.reducedMotion() ? 0 : 240);
    }
    function arm() { started = Date.now(); timer = setTimeout(remove, remaining); }
    el.addEventListener('mouseenter', function () { clearTimeout(timer); remaining -= Date.now() - started; });
    el.addEventListener('mouseleave', arm);
    el.querySelector('.toast__close').addEventListener('click', remove);
    if (o.action) el.querySelector('.toast__action').addEventListener('click', function () { o.action.fn(); remove(); });
    // only keep 3 toasts on screen
    var all = host.querySelectorAll('.toast:not(.is-out)');
    if (all.length > 3) all[0].querySelector('.toast__close').click();
    arm();
    return { close: remove, el: el };
  }

  /* ---------- command palette ---------- */
  function score(label, q) {
    if (!q) return 1;
    var l = label.toLowerCase();
    var tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    var s = 0;
    for (var i = 0; i < tokens.length; i++) {
      var idx = l.indexOf(tokens[i]);
      if (idx < 0) return 0;
      s += idx === 0 ? 3 : l.charAt(idx - 1) === ' ' ? 2 : 1;
    }
    return s;
  }

  function palette(getEntries) {
    if (stack.some(function (s) { return s.wrap.classList.contains('overlay--palette'); })) return;
    var active = 0, results = [];
    var p = open('palette', {
      label: 'Command palette',
      body: '<div class="palette__search">' + U.icon('search', 20) + '<input type="text" class="palette__input" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-autocomplete="list" aria-label="Search or run a command" placeholder="Search, add or jump to\u2026" autocomplete="off" spellcheck="false" autofocus><kbd>Esc</kbd></div>' +
        '<ul class="palette__list" id="palette-list" role="listbox"></ul><div class="palette__foot"><span><kbd>\u2191</kbd><kbd>\u2193</kbd> navigate</span><span><kbd>\u21B5</kbd> select</span><span><kbd>Ctrl</kbd><kbd>K</kbd> toggle</span></div>'
    });
    var input = p.el.querySelector('.palette__input');
    var list = p.el.querySelector('.palette__list');
    function render() {
      var q = input.value.trim();
      var entries = getEntries(q);
      results = entries.map(function (e) { return { e: e, s: score(e.label + ' ' + (e.keywords || ''), q) }; })
        .filter(function (r) { return r.s > 0; })
        .sort(function (a, b) { return q ? b.s - a.s || (a.e.rank || 0) - (b.e.rank || 0) : (a.e.rank || 0) - (b.e.rank || 0); })
        .slice(0, 40).map(function (r) { return r.e; });
      active = Math.min(active, Math.max(0, results.length - 1));
      var lastGroup = null;
      list.innerHTML = results.length ? results.map(function (e, i) {
        var grp = e.group !== lastGroup ? '<li class="palette__group" role="presentation">' + U.esc(e.group) + '</li>' : '';
        lastGroup = e.group;
        return grp + '<li role="option" id="pal-' + i + '" class="palette__item' + (i === active ? ' is-active' : '') + '" data-i="' + i + '" aria-selected="' + (i === active) + '">' +
          '<span class="palette__icon">' + (e.tile || U.icon(e.icon || 'right', 18)) + '</span><span class="palette__label">' + U.esc(e.label) + (e.hint ? '<small>' + U.esc(e.hint) + '</small>' : '') + '</span>' +
          (e.kbd ? '<kbd>' + U.esc(e.kbd) + '</kbd>' : '') + '</li>';
      }).join('') : '<li class="palette__empty">No matches. Press Enter to add \u201C' + U.esc(q) + '\u201D as a new subscription.</li>';
      input.setAttribute('aria-activedescendant', results.length ? 'pal-' + active : '');
      var a = list.querySelector('.is-active');
      if (a) a.scrollIntoView({ block: 'nearest' });
    }
    function run(i) {
      var e = results[i];
      var q = input.value.trim();
      p.close();
      setTimeout(function () {
        if (e) e.run();
        else if (q) LG.Sheets.itemForm({ prefill: { name: q } });
      }, 30);
    }
    input.addEventListener('input', function () { active = 0; render(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(results.length - 1, active + 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); render(); }
      else if (e.key === 'Enter') { e.preventDefault(); run(active); }
    });
    list.addEventListener('click', function (e) { var li = e.target.closest('[data-i]'); if (li) run(+li.getAttribute('data-i')); });
    list.addEventListener('mousemove', function (e) {
      var li = e.target.closest('[data-i]'); if (!li) return;
      var i = +li.getAttribute('data-i'); if (i === active) return;
      active = i;
      U.$$('.palette__item', list).forEach(function (x) { var on = +x.getAttribute('data-i') === active; x.classList.toggle('is-active', on); x.setAttribute('aria-selected', on); });
      input.setAttribute('aria-activedescendant', 'pal-' + active);
    });
    render();
    return p;
  }

  LG.UI = { sheet: sheet, dialog: function (o) { return open('dialog', o); }, confirm: confirm, toast: toast, palette: palette, closeTop: closeTop, closeAll: closeAll, isOpen: isOpen, stackSize: function () { return stack.length; } };
})(typeof self !== 'undefined' ? self : this);
