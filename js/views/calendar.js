/* Ledgerly - month calendar of payments and renewals */
(function (root) {
  'use strict';
  var LG = root.LG, U = LG.U, D = LG.Dates, F = LG.Finance, L = LG.Library, V = LG.V;
  var vs = { month: null, selected: null };

  function eventsByDay(key) {
    var st = V.state();
    var map = {};
    F.paymentsInMonth(st.items, key).forEach(function (p) { (map[p.date] = map[p.date] || { pays: [], docs: [] }).pays.push(p); });
    st.documents.forEach(function (d) { if (d.expiry.slice(0, 7) === key) (map[d.expiry] = map[d.expiry] || { pays: [], docs: [] }).docs.push(d); });
    st.items.forEach(function (it) {
      if (it.status !== 'active') return;
      if (it.trialEnd && it.trialEnd.slice(0, 7) === key) (map[it.trialEnd] = map[it.trialEnd] || { pays: [], docs: [] }).trial = (map[it.trialEnd].trial || []).concat([it]);
      if (it.cancelBy && it.cancelBy.slice(0, 7) === key) (map[it.cancelBy] = map[it.cancelBy] || { pays: [], docs: [] }).cancel = (map[it.cancelBy].cancel || []).concat([it]);
    });
    return map;
  }

  function dayPanel(date, ev) {
    var t = V.today();
    ev = ev || { pays: [], docs: [] };
    var total = F.sumAmounts(ev.pays);
    var items = ev.pays.map(function (p) { return V.payRow(p, { showDate: false }); }).join('');
    var docs = ev.docs.map(function (d) {
      var s = LG.Insights.docStatus(d, t);
      return '<li class="pay-row"><button type="button" class="pay-row__btn" data-action="edit-doc" data-id="' + U.esc(d.id) + '"><span class="tile tile--doc">' + U.icon(L.docType(d.type).icon, 18) + '</span><span class="pay-row__main"><span class="pay-row__name">' + U.esc(d.name) + ' expires</span><span class="pay-row__meta">' + U.esc(L.docType(d.type).name) + '</span></span>' + V.statusChip(s.status) + '</button></li>';
    }).join('');
    var flags = (ev.trial || []).map(function (it) { return '<li class="cal-flag">' + U.icon('gift', 16) + '<span><strong>' + U.esc(it.name) + '</strong> free trial ends</span></li>'; }).join('') +
      (ev.cancel || []).map(function (it) { return '<li class="cal-flag cal-flag--warn">' + U.icon('ban', 16) + '<span>Cancel <strong>' + U.esc(it.name) + '</strong> by today</span></li>'; }).join('');
    var any = ev.pays.length || ev.docs.length || flags;
    return '<div class="day-panel" aria-live="polite"><div class="day-panel__head"><div><h2 class="card__title">' + U.esc(D.formatDate(date, { weekday: true })) + '</h2><p class="muted small">' + U.esc(D.relative(date, t).replace(/^./, function (c) { return c.toUpperCase(); })) + (ev.pays.length ? ' \u00B7 <span class="num">' + U.money(total) + '</span>' : '') + '</p></div></div>' +
      (any ? (flags ? '<ul class="cal-flags">' + flags + '</ul>' : '') + '<ul class="pay-list">' + items + docs + '</ul>' : '<p class="muted day-panel__empty">Nothing due on this day.</p>') +
      '<div class="day-panel__actions">' + V.btn('Add payment', { action: 'add-item-on', data: { date: date }, icon: 'plus', cls: 'btn--ghost btn--sm' }) + V.btn('Add renewal', { action: 'add-doc-on', data: { date: date }, icon: 'shield', cls: 'btn--ghost btn--sm' }) + '</div></div>';
  }

  function render() {
    var t = V.today();
    var params = LG.App.params();
    if (params.m && /^\d{4}-\d{2}$/.test(params.m)) vs.month = params.m;
    if (!vs.month) vs.month = D.monthKey(t);
    if (!vs.selected || vs.selected.slice(0, 7) !== vs.month) vs.selected = vs.month === D.monthKey(t) ? t : vs.month + '-01';
    var key = vs.month;
    var first = key + '-01';
    var dim = D.daysInMonth(+key.slice(0, 4), +key.slice(5, 7));
    var lead = D.weekday(first);
    var ev = eventsByDay(key);
    var monthPays = F.paymentsInMonth(V.state().items, key);
    var monthTotal = F.sumAmounts(monthPays);
    var cells = '';
    var totalCells = Math.ceil((lead + dim) / 7) * 7;
    for (var i = 0; i < totalCells; i++) {
      var dayNum = i - lead + 1;
      if (dayNum < 1 || dayNum > dim) { cells += '<div class="cal-cell is-out" role="gridcell" aria-hidden="true"></div>'; continue; }
      var date = D.fmt(+key.slice(0, 4), +key.slice(5, 7), dayNum);
      var e = ev[date];
      var amt = e ? F.sumAmounts(e.pays) : 0;
      var count = e ? e.pays.length + e.docs.length + (e.trial || []).length + (e.cancel || []).length : 0;
      var tiles = e ? e.pays.slice(0, 3).map(function (p) { return U.tile(p.item, 'xs'); }).join('') + e.docs.slice(0, 2).map(function () { return '<span class="tile tile--xs tile--docdot" aria-hidden="true">' + U.icon('shield', 10) + '</span>'; }).join('') : '';
      var more = e && e.pays.length > 3 ? '<span class="cal-more">+' + (e.pays.length - 3) + '</span>' : '';
      var flag = e && (e.trial || e.cancel) ? '<span class="cal-flagdot" aria-hidden="true"></span>' : '';
      var label = D.formatDate(date, { weekday: true }) + (count ? ', ' + count + ' item' + (count > 1 ? 's' : '') + (amt ? ', ' + U.money(amt) : '') : ', nothing due');
      cells += '<div class="cal-cell" role="gridcell"><button type="button" class="cal-day' + (date === t ? ' is-today' : '') + (date === vs.selected ? ' is-selected' : '') + (date < t ? ' is-past' : '') + (count ? ' has-items' : '') + '" data-action="cal-select" data-date="' + date + '" aria-label="' + U.esc(label) + '" aria-pressed="' + (date === vs.selected) + '"' + (date === vs.selected ? '' : ' tabindex="-1"') + '>' +
        '<span class="cal-day__num">' + dayNum + '</span>' + flag + (count ? '<span class="cal-day__tiles">' + tiles + more + '</span><span class="cal-day__dots" aria-hidden="true">' + new Array(Math.min(count, 3) + 1).join('<i></i>') + '</span>' + (amt ? '<span class="cal-day__amt num">' + U.money(amt, { compact: true }) + '</span>' : '') : '') + '</button></div>';
    }
    var grid = '<div class="cal-grid" role="grid" aria-label="' + U.esc(D.formatMonth(key)) + '"><div class="cal-week cal-week--head" role="row">' + D.WEEKDAYS_SHORT.map(function (w) { return '<div class="cal-wd" role="columnheader">' + w + '</div>'; }).join('') + '</div><div class="cal-body" role="rowgroup">' + cells + '</div></div>';
    var biggest = monthPays.slice().sort(function (a, b) { return b.amount - a.amount; })[0];
    return V.pageHead('Calendar', 'Payments, trials and renewals by day', V.btn('Add', { action: 'add-item', icon: 'plus', cls: 'btn--primary' })) +
      '<div class="cal-layout"><section class="card card--cal"><div class="cal-head"><div class="cal-nav">' +
      '<button type="button" class="icon-btn" data-action="cal-prev" aria-label="Previous month">' + U.icon('left', 20) + '</button>' +
      '<h2 class="cal-title" aria-live="polite">' + U.esc(D.formatMonth(key)) + '</h2>' +
      '<button type="button" class="icon-btn" data-action="cal-next" aria-label="Next month">' + U.icon('right', 20) + '</button></div>' +
      '<div class="cal-head__right">' + (key !== D.monthKey(t) ? '<button type="button" class="btn btn--ghost btn--sm" data-action="cal-today">Today</button>' : '') +
      '<div class="cal-total"><span class="num">' + U.money(monthTotal) + '</span><small>' + monthPays.length + ' payment' + (monthPays.length === 1 ? '' : 's') + '</small></div></div></div>' + grid +
      (biggest ? '<p class="chart-note">' + U.icon('info', 14) + ' Biggest this month: ' + U.esc(biggest.item.name) + ' (' + U.money(biggest.amount) + ') on ' + U.esc(D.formatDate(biggest.date, { year: false })) + '.</p>' : '') +
      '</section><aside class="card card--day" data-region="day">' + dayPanel(vs.selected, ev[vs.selected]) + '</aside></div>';
  }

  function go(n) { vs.month = D.addMonthKey(vs.month, n); vs.selected = null; LG.App.setParams({ m: vs.month }); }
  LG.App.on('cal-prev', function () { go(-1); });
  LG.App.on('cal-next', function () { go(1); });
  LG.App.on('cal-today', function () { vs.month = D.monthKey(V.today()); vs.selected = V.today(); LG.App.setParams({ m: vs.month }); });
  LG.App.on('cal-select', function (el) {
    vs.selected = el.getAttribute('data-date');
    U.$$('.cal-day').forEach(function (b) { var on = b === el; b.classList.toggle('is-selected', on); b.setAttribute('aria-pressed', on); b.setAttribute('tabindex', on ? '0' : '-1'); });
    var region = document.querySelector('[data-region="day"]');
    if (region) region.innerHTML = dayPanel(vs.selected, eventsByDay(vs.month)[vs.selected]);
    if (root.matchMedia('(max-width: 899px)').matches && region) region.scrollIntoView({ behavior: U.reducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
  });
  LG.App.on('add-item-on', function (el) { LG.Sheets.itemForm({ prefill: { anchor: el.getAttribute('data-date'), name: '' } }); });
  LG.App.on('add-doc-on', function (el) { LG.Sheets.docForm({ prefill: { expiry: el.getAttribute('data-date') } }); });

  function keynav(e) {
    var b = e.target.closest && e.target.closest('.cal-day');
    if (!b) return;
    var delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!delta) return;
    e.preventDefault();
    var target = D.addDays(b.getAttribute('data-date'), delta);
    if (target.slice(0, 7) !== vs.month) { vs.month = target.slice(0, 7); vs.selected = target; LG.App.setParams({ m: vs.month }); setTimeout(function () { var n = document.querySelector('.cal-day[data-date="' + target + '"]'); if (n) n.focus(); }, 30); return; }
    var nb = document.querySelector('.cal-day[data-date="' + target + '"]');
    if (nb) { LG.App.actions['cal-select'](nb); nb.focus(); }
  }

  LG.Views.calendar = { title: 'Calendar', render: render, mount: function (el) { el.addEventListener('keydown', keynav); } };
})(typeof self !== 'undefined' ? self : this);
