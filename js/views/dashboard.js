/* Ledgerly - dashboard */
(function (root) {
  'use strict';
  var LG = root.LG, U = LG.U, D = LG.Dates, F = LG.Finance, L = LG.Library, V = LG.V;
  var range = 7;
  var skippedCheckins = {};

  function greeting(name) {
    var h = new Date().getHours();
    var g = h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    return g + (name ? ', ' + U.esc(name) : '');
  }

  function kpi(o) {
    return '<article class="card kpi' + (o.cls ? ' ' + o.cls : '') + '"><div class="kpi__head"><span class="kpi__icon">' + U.icon(o.icon, 18) + '</span><h2 class="kpi__label">' + o.label + '</h2></div>' +
      '<div class="kpi__value num' + (o.tone ? ' is-' + o.tone : '') + '"' + (o.value !== undefined ? ' data-countup="' + o.value + '" data-key="' + o.key + '"' : '') + '>' + (o.value !== undefined ? U.money(o.value) : o.valueHTML) + '</div>' +
      (o.sub ? '<p class="kpi__sub">' + o.sub + '</p>' : '') + (o.extra || '') + '</article>';
  }

  function render() {
    var st = V.state(), t = V.today();
    var items = st.items, docs = st.documents;
    var head = '<header class="page-head page-head--dash"><div><p class="eyebrow">' + U.esc(D.formatDate(t, { weekday: true })) + '</p><h1 class="page-title">' + greeting(st.settings.name) + '</h1></div>' +
      '<div class="page-actions">' + V.btn('Add renewal', { action: 'add-doc', icon: 'shield', cls: 'btn--ghost hide-sm' }) + V.btn('Add subscription', { action: 'add-item', icon: 'plus', cls: 'btn--primary' }) + '</div></header>';
    var banner = st.settings.sample ? '<div class="banner">' + U.icon('sparkle', 18) + '<span>You\u2019re exploring <strong>sample data</strong>. Have a click around \u2014 nothing here is real.</span><button type="button" class="btn btn--sm btn--ghost" data-action="start-fresh">Start fresh</button></div>' : '';
    if (!LG.Store.isPersistent()) banner += '<div class="banner banner--warn">' + U.icon('alert', 18) + '<span>Your browser is blocking storage, so changes will be lost when you close this tab. Try Chrome or Edge, or run start.bat.</span></div>';

    if (!items.length && !docs.length) {
      return head + banner + '<section class="card hero-empty">' + V.empty({
        art: V.ART, title: 'One calm place for every bill, subscription and renewal',
        body: 'Add what you pay for and the documents you need to renew. Ledgerly works out what it all costs, what\u2019s coming up and where you could save.',
        actions: V.btn('Add your first subscription', { action: 'add-item', icon: 'plus', cls: 'btn--primary' }) + V.btn('Add a renewal', { action: 'add-doc', icon: 'shield' }) + V.btn('Explore with sample data', { action: 'load-sample', icon: 'sparkle' })
      }) + '</section>';
    }

    var tot = F.totals(items, t);
    var income = st.settings.income;
    var left = F.leftAfterBills(income, tot.monthly);
    var next30 = F.upcoming(items, t, 30);
    var sum30 = F.sumAmounts(next30);
    var biggest = next30.slice().sort(function (a, b) { return b.amount - a.amount; })[0];
    var saved = F.cancelledSavings(items);

    var kpis = '<section class="kpis" aria-label="Totals">' +
      kpi({ icon: 'repeat', label: 'Monthly bills', value: tot.monthly, key: 'k-month', sub: tot.count + ' active \u00B7 about ' + U.money(tot.yearly / D.DAYS_PER_YEAR) + ' a day', cls: 'kpi--accent' }) +
      kpi({ icon: 'calendar', label: 'Per year', value: tot.yearly, key: 'k-year', sub: saved > 0 ? '<span class="text-ok">' + U.icon('sparkle', 14) + ' Saving ' + U.money(saved) + '/yr from cancelled subs</span>' : 'Everything converted to a yearly cost' }) +
      (left !== null
        ? kpi({ icon: 'wallet', label: 'Left after bills', value: left, key: 'k-left', tone: left < 0 ? 'danger' : '', sub: 'of ' + U.money(income) + ' monthly income', extra: '<div class="meter" role="img" aria-label="Bills use ' + Math.round((tot.monthly / (income || 1)) * 100) + '% of income"><span style="width:' + Math.min(100, (tot.monthly / (income || 1)) * 100).toFixed(1) + '%"></span></div>' })
        : kpi({ icon: 'wallet', label: 'Left after bills', valueHTML: '<button type="button" class="link-btn link-btn--lg" data-action="set-income">' + U.icon('plus', 18) + 'Add income</button>', sub: 'See what\u2019s left each month (optional, stays on this device)' })) +
      kpi({ icon: 'clock', label: 'Next 30 days', value: sum30, key: 'k-30', sub: next30.length ? next30.length + ' payment' + (next30.length > 1 ? 's' : '') + (biggest ? ' \u00B7 biggest ' + U.esc(biggest.item.name) + ' ' + U.money(biggest.amount) : '') : 'Nothing due' }) +
      '</section>';

    // upcoming
    var up = F.upcoming(items, t, range);
    var upcoming = '<article class="card card--upcoming"><div class="card__head"><h2 class="card__title">Coming up</h2>' +
      V.segmented('range', [{ value: 7, label: '7 days' }, { value: 30, label: '30 days' }], range, { small: true, label: 'Upcoming range', action: 'dash-range' }) + '</div>' +
      (up.length ? '<ul class="pay-list" data-list="upcoming">' + up.slice(0, 8).map(function (e) { return V.payRow(e); }).join('') + '</ul>' +
        '<div class="card__foot"><span class="muted">' + up.length + ' payment' + (up.length > 1 ? 's' : '') + ' \u00B7 <strong class="num">' + U.money(F.sumAmounts(up)) + '</strong></span><a class="link-btn" href="#/calendar">Open calendar' + U.icon('right', 16) + '</a></div>'
        : V.empty({ icon: 'check', title: 'Nothing due in the next ' + range + ' days', body: range === 7 ? 'Enjoy the quiet week.' : 'A quiet month ahead.', compact: true })) + '</article>';

    // donut
    var cats = F.byCategory(items, t);
    var top = cats.slice(0, 5);
    if (cats.length > 5) top.push({ id: 'rest', name: 'Everything else', color: '#CBD5E1', monthly: cats.slice(5).reduce(function (s, c) { return s + c.monthly; }, 0) });
    var donut = '<article class="card card--donut"><div class="card__head"><h2 class="card__title">Where it goes</h2><span class="muted small">per month</span></div>' +
      (cats.length ? '<div class="donut-wrap"><div class="donut-box">' + LG.Charts.donut(top.map(function (c) { return { label: c.name, value: c.monthly, color: c.color }; }), { size: 180, thickness: 20 }) +
        '<div class="donut-center"><span class="num">' + U.money(tot.monthly, { whole: true }) + '</span><small>a month</small></div></div>' +
        '<ul class="legend">' + top.map(function (c) { return '<li><i style="background:' + c.color + '"></i><span>' + U.esc(c.name) + '</span><span class="num">' + U.money(c.monthly, { whole: true }) + '</span><span class="legend__pct num">' + Math.round((c.monthly / (tot.monthly || 1)) * 100) + '%</span></li>'; }).join('') + '</ul></div>'
        : V.empty({ icon: 'pie', title: 'No active subscriptions', compact: true })) + '</article>';

    // projection
    var proj = F.projection(items, D.monthKey(t), 12);
    var projTotal = proj.reduce(function (s, m) { return s + m.total; }, 0);
    var peak = proj.reduce(function (a, b) { return b.total > a.total ? b : a; }, proj[0]);
    var projection = '<article class="card card--proj"><div class="card__head"><div><h2 class="card__title">Next 12 months</h2><p class="muted small">Actual payments per month, so yearly bills show up when they land.</p></div>' +
      '<div class="proj-sum"><span class="num">' + U.money(projTotal, { whole: true }) + '</span><small>total \u00B7 avg ' + U.money(projTotal / 12, { whole: true }) + '/mo</small></div></div>' +
      '<div class="chart-box" data-chart="projection"></div>' + (peak && peak.total > (projTotal / 12) * 1.25 ? '<p class="chart-note">' + U.icon('info', 14) + ' ' + U.esc(D.formatMonth(peak.key)) + ' is your priciest month (' + U.money(peak.total, { whole: true }) + '). Worth planning for.</p>' : '') + '</article>';

    // attention
    var ins = LG.Insights.compute(st, t, { money: U.money });
    var attention = '<article class="card card--attention"><div class="card__head"><h2 class="card__title">Needs attention</h2>' + (ins.potentialSavings > 0 ? '<span class="pill pill--ok">Save ' + U.money(ins.potentialSavings, { whole: true }) + '/yr</span>' : '') + '</div>' +
      (ins.insights.length ? '<ul class="mini-insights">' + ins.insights.slice(0, 4).map(function (i) {
        return '<li><a href="#/insights" class="mini-insight sev-' + i.severity + '"><span class="mini-insight__dot"></span><span><strong>' + U.esc(i.title) + '</strong><small>' + U.esc(i.body) + '</small></span></a></li>';
      }).join('') + '</ul><div class="card__foot"><span></span><a class="link-btn" href="#/insights">All insights (' + ins.insights.length + ')' + U.icon('right', 16) + '</a></div>'
        : V.empty({ icon: 'check', title: 'All looks good', body: 'No overlaps, rises or trials to worry about.', compact: true })) + '</article>';

    // check-in
    var due = LG.Insights.checkinsDue(items, t).filter(function (c) { return !skippedCheckins[c.item.id + c.month]; });
    var checkin = '';
    if (due.length) {
      var c = due[0];
      checkin = '<article class="card card--checkin"><div class="card__head"><h2 class="card__title">Quick check-in</h2><span class="muted small">' + due.length + ' to go</span></div>' +
        '<div class="checkin">' + U.tile(c.item, 'lg') + '<p>Did you use <strong>' + U.esc(c.item.name) + '</strong> in ' + U.esc(D.MONTHS_LONG[+c.month.slice(5, 7) - 1]) + '?</p></div><div class="usage-btns">' +
        LG.Insights.USAGE_OPTIONS.map(function (o) { return '<button type="button" class="fchip" data-action="checkin" data-id="' + c.item.id + '" data-month="' + c.month + '" data-v="' + o.value + '">' + U.esc(o.label) + '</button>'; }).join('') +
        '<button type="button" class="link-btn" data-action="checkin-skip" data-id="' + c.item.id + '" data-month="' + c.month + '">Skip</button></div>' +
        '<p class="muted small">Helps Ledgerly spot subscriptions you\u2019re paying for but not using.</p></article>';
    }

    // renewals
    var sortedDocs = docs.slice().sort(function (a, b) { return a.expiry < b.expiry ? -1 : 1; });
    var renewals = '<article class="card card--renewals"><div class="card__head"><h2 class="card__title">Renewals</h2><a class="link-btn" href="#/documents">View all' + U.icon('right', 16) + '</a></div>' +
      (sortedDocs.length ? '<ul class="doc-mini">' + sortedDocs.slice(0, 4).map(function (d) {
        var s = LG.Insights.docStatus(d, t);
        return '<li data-row="' + U.esc(d.id) + '"><button type="button" data-action="edit-doc" data-id="' + U.esc(d.id) + '"><span class="doc-mini__icon">' + U.icon(L.docType(d.type).icon, 18) + '</span><span class="doc-mini__main"><strong>' + U.esc(d.name) + '</strong><small>' + U.esc((s.status === 'expired' ? 'Expired ' : 'Expires ') + D.relative(d.expiry, t)) + '</small></span>' + V.statusChip(s.status) + '</button></li>';
      }).join('') + '</ul>' : V.empty({ icon: 'shield', title: 'Track passports, MOT & insurance', body: 'Get reminded months before anything expires.', actions: V.btn('Add a renewal', { action: 'add-doc', icon: 'plus', cls: 'btn--sm btn--ghost' }), compact: true })) + '</article>';

    return head + banner + kpis + '<div class="dash-grid"><div class="dash-main">' + upcoming + projection + '</div><div class="dash-side">' + checkin + attention + donut + renewals + '</div></div>';
  }

  function mount(el) {
    U.countUp(el);
    var box = el.querySelector('[data-chart="projection"]');
    if (box) {
      var t = V.today();
      var proj = F.projection(V.state().items, D.monthKey(t), 12);
      var avg = proj.reduce(function (s, m) { return s + m.total; }, 0) / 12;
      var max = Math.max.apply(null, proj.map(function (m) { return m.total; }));
      LG.Charts.bars(box, proj.map(function (m, i) {
        return { label: m.label, value: m.total, highlight: m.total === max && max > 0, tipTitle: D.formatMonth(m.key), sub: m.count + ' payment' + (m.count === 1 ? '' : 's') + (i === 0 ? ' (this month)' : '') };
      }), { average: avg, height: 230, label: '12-month projection of payments' });
    }
  }

  LG.App.on('dash-range', function (el) { range = +el.value; LG.App.render(); });
  LG.App.on('checkin', function (el) {
    var it = LG.Store.item(el.getAttribute('data-id'));
    LG.Store.setUsage(el.getAttribute('data-id'), el.getAttribute('data-month'), +el.getAttribute('data-v'));
    if (it) LG.UI.toast('Noted for ' + it.name);
  });
  LG.App.on('checkin-skip', function (el) { skippedCheckins[el.getAttribute('data-id') + el.getAttribute('data-month')] = 1; LG.App.render(); });

  LG.Views.dashboard = { title: 'Dashboard', render: render, mount: mount };
})(typeof self !== 'undefined' ? self : this);
