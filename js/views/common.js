/* Ledgerly - shared view helpers */
(function (root) {
  'use strict';
  var LG = root.LG, U = LG.U, D = LG.Dates, F = LG.Finance, L = LG.Library;
  LG.Views = LG.Views || {};
  LG.App = LG.App || { actions: {}, on: function (name, fn) { this.actions[name] = fn; } };

  function today() { return D.today(); }
  function state() { return LG.Store.state; }

  function pageHead(title, sub, actions) {
    return '<header class="page-head"><div><h1 class="page-title">' + title + '</h1>' + (sub ? '<p class="page-sub">' + sub + '</p>' : '') + '</div>' +
      (actions ? '<div class="page-actions">' + actions + '</div>' : '') + '</header>';
  }

  function btn(label, o) {
    o = o || {};
    var attrs = o.action ? ' data-action="' + o.action + '"' : '';
    if (o.data) Object.keys(o.data).forEach(function (k) { attrs += ' data-' + k + '="' + U.esc(o.data[k]) + '"'; });
    if (o.title) attrs += ' title="' + U.esc(o.title) + '"';
    if (o.aria) attrs += ' aria-label="' + U.esc(o.aria) + '"';
    if (o.href) return '<a class="btn ' + (o.cls || 'btn--ghost') + '" href="' + o.href + '"' + attrs + (o.external ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + (o.icon ? U.icon(o.icon, 18) : '') + '<span>' + label + '</span></a>';
    return '<button type="button" class="btn ' + (o.cls || 'btn--ghost') + '"' + attrs + '>' + (o.icon ? U.icon(o.icon, 18) : '') + (label ? '<span>' + label + '</span>' : '') + '</button>';
  }

  function catChip(id) {
    var c = L.category(id);
    return '<span class="cat"><i style="background:' + c.color + '"></i>' + U.esc(c.name) + '</span>';
  }

  var DOC_STATUS = { ok: ['OK', 'ok'], soon: ['Due soon', 'warn'], expired: ['Expired', 'danger'], unknown: ['No date', 'muted'] };
  function statusChip(status) { var s = DOC_STATUS[status] || DOC_STATUS.unknown; return '<span class="chip chip--' + s[1] + '">' + s[0] + '</span>'; }
  function itemStatusChip(it) {
    if (it.status === 'paused') return '<span class="chip chip--muted">Paused</span>';
    if (it.status === 'cancelled') return '<span class="chip chip--muted">Cancelled</span>';
    if (it.trialEnd && it.trialEnd >= today()) return '<span class="chip chip--info">Trial</span>';
    return '';
  }

  /** A payment row: entry {item, date, amount} */
  function payRow(entry, o) {
    o = o || {};
    var it = entry.item, t = today();
    var rel = D.relative(entry.date, t);
    var soon = D.diffDays(t, entry.date) <= 2;
    return '<li class="pay-row" data-row="' + U.esc(it.id) + '"><button type="button" class="pay-row__btn" data-action="open-item" data-id="' + U.esc(it.id) + '">' +
      U.tile(it) + '<span class="pay-row__main"><span class="pay-row__name">' + U.esc(it.name) + ' ' + itemStatusChip(it) + '</span>' +
      '<span class="pay-row__meta">' + (o.showDate === false ? U.esc(D.cycleLabel(it)) : '<span class="' + (soon ? 'is-soon' : '') + '">' + U.esc(rel.charAt(0).toUpperCase() + rel.slice(1)) + '</span> \u00B7 ' + U.esc(D.formatDate(entry.date, { weekday: true, year: false }))) + '</span></span>' +
      '<span class="pay-row__amt num">' + U.money(entry.amount) + '</span></button></li>';
  }

  function empty(o) {
    return '<div class="empty' + (o.compact ? ' empty--compact' : '') + '">' + (o.art ? o.art : '<span class="empty__icon">' + U.icon(o.icon || 'sparkle', 26) + '</span>') +
      '<h3 class="empty__title">' + o.title + '</h3>' + (o.body ? '<p class="empty__body">' + o.body + '</p>' : '') + (o.actions ? '<div class="empty__actions">' + o.actions + '</div>' : '') + '</div>';
  }

  /** Calm line-art illustration used on empty dashboards */
  var ART = '<svg class="empty__art" viewBox="0 0 220 140" width="220" height="140" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="38" y="22" width="120" height="96" rx="14" class="art-card"/><rect x="62" y="34" width="120" height="96" rx="14" class="art-card art-card--front"/>' +
    '<rect x="76" y="50" width="22" height="22" rx="6" class="art-accent"/><path d="M108 56h56M108 66h36" class="art-line"/>' +
    '<rect x="76" y="84" width="22" height="22" rx="6" class="art-soft"/><path d="M108 90h48M108 100h28" class="art-line"/>' +
    '<circle cx="182" cy="30" r="12" class="art-accent-ring"/><path d="M177 30l3.5 3.5L188 26" class="art-check"/></svg>';

  function segmented(name, options, value, o) {
    o = o || {};
    return '<div class="seg' + (o.small ? ' seg--sm' : '') + '" role="radiogroup" aria-label="' + U.esc(o.label || name) + '">' + options.map(function (opt) {
      var id = name + '-' + opt.value;
      return '<input type="radio" class="seg__input" name="' + name + '" id="' + id + '" value="' + U.esc(opt.value) + '"' + (String(opt.value) === String(value) ? ' checked' : '') + (o.action ? ' data-change="' + o.action + '"' : '') + '><label class="seg__btn" for="' + id + '">' + U.esc(opt.label) + '</label>';
    }).join('') + '</div>';
  }

  function nextDue(it) { return D.nextOccurrence(it, today()); }

  LG.V = { today: today, state: state, pageHead: pageHead, btn: btn, catChip: catChip, statusChip: statusChip, itemStatusChip: itemStatusChip, payRow: payRow, empty: empty, ART: ART, segmented: segmented, nextDue: nextDue };
})(typeof self !== 'undefined' ? self : this);
