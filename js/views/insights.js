/* Ledgerly - smart insights view */
(function (root) {
  'use strict';
  var LG = root.LG, U = LG.U, D = LG.Dates, L = LG.Library, V = LG.V;
  var vs = { type: 'all' };
  var TYPE_META = {
    duplicate: { icon: 'layers', label: 'Overlap' }, annual: { icon: 'calendar', label: 'Yearly plan' }, unused: { icon: 'pause', label: 'Unused' },
    costperuse: { icon: 'hand', label: 'Cost per use' }, price: { icon: 'trend', label: 'Price rise' }, trial: { icon: 'gift', label: 'Trial' },
    cancelby: { icon: 'clock', label: 'Cancel by' }, budget: { icon: 'wallet', label: 'Budget' }, renewal: { icon: 'shield', label: 'Renewal' }
  };
  var FILTERS = [{ value: 'all', label: 'All' }, { value: 'save', label: 'Save money' }, { value: 'deadline', label: 'Deadlines' }, { value: 'usage', label: 'Usage' }];
  var GROUPS = { save: ['duplicate', 'annual', 'unused'], deadline: ['trial', 'cancelby', 'renewal'], usage: ['unused', 'costperuse'] };

  function actions(i) {
    var st = V.state();
    var a = '';
    var items = i.itemIds.map(function (id) { return LG.Store.item(id); }).filter(Boolean);
    if (i.type === 'duplicate') a += items.map(function (it) { return '<button type="button" class="btn btn--sm btn--ghost" data-action="open-item" data-id="' + it.id + '">' + U.tile(it, 'xs') + '<span>' + U.esc(it.name) + '</span></button>'; }).join('');
    else if (i.type === 'renewal') a += V.btn('View renewals', { href: '#/documents', icon: 'shield', cls: 'btn--sm btn--ghost' });
    else if (i.type === 'budget') a += V.btn('See biggest bills', { action: 'goto-biggest', icon: 'sort', cls: 'btn--sm btn--ghost' });
    else if (items[0]) {
      var it = items[0], svc = it.serviceId ? L.service(it.serviceId) : null;
      if ((i.type === 'trial' || i.type === 'unused' || i.type === 'cancelby') && svc && svc.cancelUrl) a += '<a class="btn btn--sm btn--ghost" href="' + U.esc(svc.cancelUrl) + '" target="_blank" rel="noopener noreferrer">' + U.icon('external', 16) + '<span>How to cancel</span></a>';
      if (i.type === 'unused' || i.type === 'cancelby' || i.type === 'trial') a += '<button type="button" class="btn btn--sm btn--ghost" data-action="mark-cancelled" data-id="' + it.id + '">' + U.icon('ban', 16) + '<span>I\u2019ve cancelled it</span></button>';
      a += '<button type="button" class="btn btn--sm btn--ghost" data-action="open-item" data-id="' + it.id + '">' + U.icon('right', 16) + '<span>Open ' + U.esc(it.name) + '</span></button>';
    }
    a += '<button type="button" class="btn btn--sm btn--text" data-action="dismiss-insight" data-iid="' + U.esc(i.id) + '">' + U.esc(i.type === 'trial' || i.type === 'unused' ? 'Keep it' : 'Dismiss') + '</button>';
    return a;
  }

  function card(i) {
    var m = TYPE_META[i.type] || { icon: 'sparkle', label: 'Insight' };
    return '<li class="insight sev-' + i.severity + '" data-insight="' + U.esc(i.type) + '"><div class="insight__icon">' + U.icon(m.icon, 20) + '</div><div class="insight__body">' +
      '<div class="insight__top"><span class="insight__tag">' + m.label + '</span>' + (i.saving > 0 ? '<span class="pill pill--ok num">Save ' + U.money(i.saving) + '/yr</span>' : '') + '</div>' +
      '<h3 class="insight__title">' + U.esc(i.title) + '</h3><p class="insight__text">' + U.esc(i.body) + '</p>' +
      '<details class="insight__why"><summary>' + U.icon('info', 14) + 'Why am I seeing this?</summary><p>' + U.esc(i.why) + '</p></details>' +
      '<div class="insight__actions">' + actions(i) + '</div></div></li>';
  }

  function render() {
    var st = V.state(), t = V.today();
    var r = LG.Insights.compute(st, t, { money: U.money });
    var list = r.insights.filter(function (i) { return vs.type === 'all' || (GROUPS[vs.type] || []).indexOf(i.type) >= 0; });
    var due = LG.Insights.checkinsDue(st.items, t);
    var hero = '<section class="card savings-hero"><div class="savings-hero__main"><p class="eyebrow">Potential savings</p><div class="savings-hero__value num" data-countup="' + r.potentialSavings.toFixed(2) + '" data-key="ins-save">' + U.money(r.potentialSavings) + '</div><p class="muted">a year, from ' + Object.keys(r.itemSavings).length + ' subscription' + (Object.keys(r.itemSavings).length === 1 ? '' : 's') + '. Each one counted once, even if several tips apply.</p></div>' +
      '<div class="savings-hero__stats"><div><span class="num">' + r.insights.length + '</span><small>insights</small></div><div><span class="num">' + due.length + '</span><small>check-ins</small></div><div><span class="num">' + U.money(LG.Finance.cancelledSavings(st.items), { whole: true }) + '</span><small>saved by cancelling</small></div></div></section>';
    var checkins = due.length ? '<section class="card card--checkins"><div class="card__head"><div><h2 class="card__title">Usage check-in</h2><p class="muted small">Did you use these in ' + U.esc(D.MONTHS_LONG[+due[0].month.slice(5, 7) - 1]) + '? Your answers power the \u201Cunused\u201D and cost-per-use tips.</p></div></div><ul class="checkin-list">' +
      due.map(function (c) {
        return '<li>' + U.tile(c.item) + '<span class="checkin-list__name">' + U.esc(c.item.name) + '<small class="num">' + U.money(LG.Dates.monthlyEquivalent(c.item)) + '/mo</small></span><div class="usage-btns">' + LG.Insights.USAGE_OPTIONS.map(function (o) {
          return '<button type="button" class="fchip fchip--sm" data-action="checkin" data-id="' + c.item.id + '" data-month="' + c.month + '" data-v="' + o.value + '">' + U.esc(o.label) + '</button>';
        }).join('') + '</div></li>';
      }).join('') + '</ul></section>' : '';
    var body;
    if (!st.items.length && !st.documents.length) {
      body = V.empty({ icon: 'sparkle', title: 'Insights appear as you add things', body: 'Ledgerly spots overlapping services, price rises, trials about to charge you and subscriptions you don\u2019t use. Every tip explains why.', actions: V.btn('Add a subscription', { action: 'add-item', icon: 'plus', cls: 'btn--primary' }) + V.btn('Explore with sample data', { action: 'load-sample', icon: 'sparkle' }) });
    } else {
      body = '<div class="toolbar toolbar--compact">' + V.segmented('instype', FILTERS, vs.type, { small: true, label: 'Insight type', action: 'ins-filter' }) + '</div>' +
        (list.length ? '<ul class="insight-list">' + list.map(card).join('') + '</ul>' : V.empty({ icon: 'check', title: vs.type === 'all' ? 'Nothing to flag right now' : 'Nothing in this group', body: 'We\u2019ll let you know when something changes.', compact: true })) +
        (r.dismissedCount ? '<p class="list-foot muted">' + r.dismissedCount + ' dismissed \u00B7 <button type="button" class="link-btn" data-action="restore-insights">Show them again</button></p>' : '');
    }
    return V.pageHead('Insights', 'Rule-based tips, worked out privately on this device', '') + (st.items.length ? hero : '') + checkins + body;
  }

  LG.App.on('ins-filter', function (el) { vs.type = el.value; LG.App.render(); });
  LG.App.on('dismiss-insight', function (el) {
    var id = el.getAttribute('data-iid');
    var li = el.closest('.insight');
    function go() {
      LG.Store.dismissInsight(id);
      LG.UI.toast('Insight dismissed', { action: { label: 'Undo', icon: 'undo', fn: function () { LG.Store.commit(function (s) { delete s.dismissedInsights[id]; }); } } });
    }
    if (li && !U.reducedMotion()) { li.classList.add('is-leaving'); setTimeout(go, 220); } else go();
  });
  LG.App.on('restore-insights', function () { LG.Store.restoreInsights(); LG.UI.toast('Dismissed insights restored'); });
  LG.App.on('goto-biggest', function () { LG.Views.subscriptions.setSort && LG.Views.subscriptions.setSort('cost-desc'); location.hash = '#/subscriptions'; });

  LG.Views.insights = { title: 'Insights', render: render, mount: function (el) { U.countUp(el); } };
})(typeof self !== 'undefined' ? self : this);
