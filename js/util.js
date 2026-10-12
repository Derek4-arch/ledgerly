/* Ledgerly - small DOM, formatting and icon helpers (browser only) */
(function (root) {
  'use strict';
  var LG = root.LG = root.LG || {};

  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }

  function uid() {
    if (root.crypto && root.crypto.getRandomValues) {
      var a = new Uint32Array(2); root.crypto.getRandomValues(a);
      return a[0].toString(36) + a[1].toString(36).slice(0, 4);
    }
    return Math.random().toString(36).slice(2, 12);
  }

  var fmtCache = {};
  function currencyInfo() {
    var code = (LG.Store && LG.Store.state && LG.Store.state.settings.currency) || 'GBP';
    var c = LG.Library.CURRENCIES.filter(function (x) { return x.code === code; })[0] || LG.Library.CURRENCIES[0];
    return c;
  }
  function formatter(opts) {
    var c = currencyInfo();
    var key = c.code + JSON.stringify(opts || {});
    if (!fmtCache[key]) {
      try { fmtCache[key] = new Intl.NumberFormat(c.locale, Object.assign({ style: 'currency', currency: c.code }, opts || {})); }
      catch (e) { fmtCache[key] = { format: function (n) { return c.code + ' ' + Number(n).toFixed(2); } }; }
    }
    return fmtCache[key];
  }
  /** money(12.5) -> "£12.50"; money(1200, {whole:true}) -> "£1,200" */
  function money(n, o) {
    o = o || {};
    var v = Number(n) || 0;
    if (Math.abs(v) < 0.005) v = 0;
    if (o.whole) return formatter({ maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(Math.round(v));
    if (o.compact) {
      if (Math.abs(v) >= 1000) return formatter({ notation: 'compact', maximumFractionDigits: 1 }).format(v);
      return formatter({ maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(Math.round(v));
    }
    return formatter().format(v);
  }
  function currencySymbol() {
    try {
      var parts = formatter().formatToParts(0);
      for (var i = 0; i < parts.length; i++) if (parts[i].type === 'currency') return parts[i].value;
    } catch (e) { /* ignore */ }
    return currencyInfo().code;
  }

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function reducedMotion() { return root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  function download(filename, content, mime) {
    var blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; a.rel = 'noopener';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }

  function debounce(fn, ms) {
    var t; return function () { var args = arguments, self = this; clearTimeout(t); t = setTimeout(function () { fn.apply(self, args); }, ms); };
  }

  /** readable text colour on a tile background */
  function textOn(hex) {
    var h = (hex || '#888888').replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
    var lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return lum > 0.62 ? '#111111' : '#FFFFFF';
  }
  var TILE_PALETTE = ['#4F46E5', '#0E7490', '#9333EA', '#BE123C', '#B45309', '#15803D', '#1D4ED8', '#7C2D12', '#334155', '#0F766E'];
  function hashColor(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return TILE_PALETTE[h % TILE_PALETTE.length]; }
  function initials(name) {
    var words = String(name || '?').replace(/[^\p{L}\p{N}\s+]/gu, ' ').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '?';
    if (words.length === 1) return words[0].slice(0, 2).replace(/^./, function (c) { return c.toUpperCase(); });
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  /** Monogram tile for a service or custom item */
  function tile(item, size) {
    var svc = item && item.serviceId ? LG.Library.service(item.serviceId) : (item && item.mono ? item : null);
    var color = (item && item.color) || (svc && svc.color) || hashColor((item && item.name) || '');
    var mono = (svc && svc.mono) || initials(item && item.name);
    var len = Array.from(mono).length;
    return '<span class="tile' + (size ? ' tile--' + size : '') + (len >= 3 ? ' tile--long' : '') + '" style="--tile:' + color + ';color:' + textOn(color) + '" aria-hidden="true">' + esc(mono) + '</span>';
  }

  /* Hand-drawn 24px stroke icons */
  var P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
    repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
    shield: '<path d="M12 2.8 4.5 5.6v6.1c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V5.6Z"/><path d="m8.8 12 2.2 2.2 4.3-4.4"/>',
    sparkle: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><path d="M12 7.5 13.4 10.6 16.5 12 13.4 13.4 12 16.5 10.6 13.4 7.5 12 10.6 10.6Z"/><path d="m5.6 5.6 1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    trash: '<path d="M3 6h18M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6M18.5 6l-.8 13.1A2 2 0 0 1 15.7 21H8.3a2 2 0 0 1-2-1.9L5.5 6"/><path d="M10 11v6M14 11v6"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
    upload: '<path d="M12 21V9M7 14l5-5 5 5"/><path d="M5 3h14"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
    note: '<path d="M14.5 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.5Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    passport: '<rect x="4.5" y="2.5" width="15" height="19" rx="2"/><circle cx="12" cy="10.5" r="3.5"/><path d="M8.5 17.5h7"/>',
    id: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5.5 16c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4M14 10h4.5M14 13.5h3"/>',
    car: '<path d="M5 16.5V12l2-5h10l2 5v4.5"/><path d="M3.5 12h17v4.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1Z"/><circle cx="7.5" cy="14.8" r=".6"/><circle cx="16.5" cy="14.8" r=".6"/><path d="M6 17.5V20M18 17.5V20"/>',
    homeins: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
    paw: '<circle cx="5.5" cy="10.5" r="1.8"/><circle cx="9.5" cy="6" r="1.8"/><circle cx="14.5" cy="6" r="1.8"/><circle cx="18.5" cy="10.5" r="1.8"/><path d="M8 17.2c0-2.6 1.8-5.2 4-5.2s4 2.6 4 5.2c0 1.6-1.2 2.3-2.4 2.3-.7 0-1-.4-1.6-.4s-.9.4-1.6.4C9.2 19.5 8 18.8 8 17.2Z"/>',
    plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2Z"/>',
    tv: '<rect x="2.5" y="6.5" width="19" height="13" rx="2"/><path d="m8 2.5 4 4 4-4"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    flame: '<path d="M12 22a7 7 0 0 0 7-7c0-4-3-6.5-4-10-2 1-3.5 3.5-3.5 6-1.5-.5-2.5-2-2.5-3.5C7 9.5 5 12 5 15a7 7 0 0 0 7 7Z"/>',
    train: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14M9 21l-2-4M15 21l2-4"/><circle cx="9" cy="14" r=".6"/><circle cx="15" cy="14" r=".6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01"/>',
    doc: '<path d="M14.5 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.5Z"/><path d="M14 3v6h6"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
    wallet: '<path d="M19 7V5.5A1.5 1.5 0 0 0 17.5 4H5a2 2 0 0 0 0 4h14a1 1 0 0 1 1 1v3h-4a2 2 0 0 0 0 4h4v3a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V6"/>',
    trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5Z"/><path d="m3 13 9 5 9-5"/>',
    keyboard: '<rect x="2.5" y="5.5" width="19" height="13" rx="2"/><path d="M6.5 9.5h.01M10 9.5h.01M14 9.5h.01M17.5 9.5h.01M6.5 13h.01M17.5 13h.01M9 15.5h6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
    pie: '<path d="M21 12A9 9 0 1 1 12 3v9Z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15Z"/>',
    filter: '<path d="M3 5h18l-7 8.5V19l-4 2v-7.5Z"/>',
    sort: '<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8"/><path d="M12 8c-1.5-3.5-5-4-5-1.5S10 8 12 8Zm0 0c1.5-3.5 5-4 5-1.5S14 8 12 8Z"/>',
    arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    hand: '<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8a8 8 0 0 0 16 0v-3a2 2 0 0 0-4 0"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    command: '<path d="M9 6v12M15 6v12M6 9h12M6 15h12"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/>'
  };
  P.pet = P.paw;
  function icon(name, size, extraClass) {
    var s = size || 20;
    return '<svg class="icon' + (extraClass ? ' ' + extraClass : '') + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (P[name] || P.doc) + '</svg>';
  }

  /** Animate numbers in [data-countup] from their last shown value */
  var lastShown = {};
  function countUp(rootEl) {
    $$('[data-countup]', rootEl).forEach(function (el) {
      var target = Number(el.getAttribute('data-countup')) || 0;
      var key = el.getAttribute('data-key') || '';
      var opts = { whole: el.hasAttribute('data-whole') };
      var from = key && lastShown[key] !== undefined ? lastShown[key] : 0;
      if (key) lastShown[key] = target;
      if (reducedMotion() || from === target) { el.textContent = money(target, opts); return; }
      var start = null, dur = 900;
      function step(ts) {
        if (start === null) start = ts;
        var t = Math.min(1, (ts - start) / dur);
        var e = 1 - Math.pow(1 - t, 3);
        el.textContent = money(from + (target - from) * e, opts);
        if (t < 1 && el.isConnected) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  LG.U = {
    esc: esc, uid: uid, money: money, currencySymbol: currencySymbol, $: $, $$: $$, reducedMotion: reducedMotion,
    download: download, debounce: debounce, textOn: textOn, tile: tile, icon: icon, initials: initials,
    countUp: countUp, hashColor: hashColor, clearFormatCache: function () { fmtCache = {}; }
  };
})(typeof self !== 'undefined' ? self : this);
