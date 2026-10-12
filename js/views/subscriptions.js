/* Ledgerly - subscriptions & bills list with search, filter and sort */
(function (root) {
  'use strict';
  var LG = root.LG, U = LG.U, D = LG.Dates, F = LG.Finance, L = LG.Library, V = LG.V;
  var vs = { q: '', status: 'all', cat: '', sort: 'next' };

  var SORTS = [['next', 'Next payment'], ['cost-desc', 'Cost: high to low'], ['cost-asc', 'Cost: low to high'], ['name', 'Name A\u2013Z'], ['recent', 'Recently added']];
  var STATUS = [{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'trial', label: 'Trials' }, { value: 'paused', label: 'Paused' }, { value: 'cancelled', label: 'Cancelled' }];

  function filtered() {
    var st = V.state(), t = V.today();
    var q = vs.q.toLowerCase();
    var list = st.items.filter(function (it) {
      if (vs.status === 'active' && it.status !== 'active') return false;
      if (vs.status === 'trial' && !(it.trialEnd && it.trialEnd >= t && it.status === 'active')) return false;
      if (vs.status === 'paused' && it.status !== 'paused') return false;
      if (vs.status === 'cancelled' && it.status !== 'cancelled') return false;
      if (vs.cat && it.category !== vs.cat) return false;
      if (q) {
        var hay = (it.name + ' ' + L.category(it.category).name + ' ' + (it.method || '') + ' ' + (it.notes || '') + ' ' + D.cycleLabel(it)).toLowerCase();
        if (q.split(/\s+/).some(function (w) { return hay.indexOf(w) < 0; })) return false;
      }
      return true;
    });
    var next = {};
    list.forEach(function (it) { next[it.id] = it.status === 'active' ? D.nextOccurrence(it, t) || '9999' : '9999'; });
    list.sort(function (a, b) {
      switch (vs.sort) {
        case 'cost-desc': return D.monthlyEquivalent(b) - D.monthlyEquivalent(a);
        case 'cost-asc': return D.monthlyEquivalent(a) - D.monthlyEquivalent(b);
        case 'name': return a.name.localeCompare(b.name);
        case 'recent': return (b.createdAt || '').localeCompare(a.createdAt || '');
        default: return next[a.id] < next[b.id] ? -1 : next[a.id] > next[b.id] ? 1 : a.name.localeCompare(b.name);
      }
    });
    return { list: list, next: next };
  }

  function row(it, next) {
    var t = V.today();
    var nd = next !== '9999' ? next : null;
    var inactive = it.status !== 'active';
    return '<li class="sub-row' + (inactive ? ' is-inactive' : '') + '" data-row="' + U.esc(it.id) + '">' +
      '<button type="button" class="sub-row__main" data-action="open-item" data-id="' + U.esc(it.id) + '">' + U.tile(it) +
      '<span class="sub-row__text"><span class="sub-row__name">' + U.esc(it.name) + ' ' + V.itemStatusChip(it) + '</span>' +
      '<span class="sub-row__meta">' + V.catChip(it.category) + '<span class="hide-sm">\u00B7 ' + U.esc(D.cycleLabel(it)) + (it.method ? ' \u00B7 ' + U.esc(it.method) : '') + '</span></span></span>' +
      '<span class="sub-row__due">' + (nd ? '<span class="' + (D.diffDays(t, nd) <= 3 ? 'is-soon' : '') + '">' + U.esc(D.relative(nd, t).replace(/^./, function (c) { return c.toUpperCase(); })) + '</span><small>' + U.esc(D.formatDate(nd, { year: false })) + '</small>' : '<span class="muted">' + (it.status === 'active' ? 'Ended' : it.status === 'paused' ? 'Paused' : 'Cancelled') + '</span>') + '</span>' +
      '<span class="sub-row__amt"><span class="num">' + U.money(it.amount) + '<small>/' + U.esc(D.cycleShort(it)) + '</small></span>' + (it.cycle !== 'monthly' ? '<small class="num">' + U.money(D.monthlyEquivalent(it)) + '/mo</small>' : '') + '</span></button>' +
      '<button type="button" class="icon-btn sub-row__del" data-action="delete-item" data-id="' + U.esc(it.id) + '" aria-label="Delete ' + U.esc(it.name) + '" title="Delete">' + U.icon('trash', 18) + '</button></li>';
  }

  function listHTML() {
    var st = V.state();
    if (!st.items.length) return V.empty({ art: V.ART, title: 'No subscriptions yet', body: 'Add Netflix, your phone contract, council tax\u2026 anything that repeats. Ledgerly turns it into monthly and yearly totals.', actions: V.btn('Add your first one', { action: 'add-item', icon: 'plus', cls: 'btn--primary' }) + V.btn('Explore with sample data', { action: 'load-sample', icon: 'sparkle' }) });
    var r = filtered();
    if (!r.list.length) return V.empty({ icon: 'search', title: 'No matches', body: vs.q ? 'Nothing matches \u201C' + U.esc(vs.q) + '\u201D with these filters.' : 'Nothing matches these filters.', actions: V.btn('Clear filters', { action: 'subs-clear', icon: 'x' }), compact: true });
    var monthly = r.list.reduce(function (s, it) { return s + (F.isActive(it, V.today()) ? D.monthlyEquivalent(it) : 0); }, 0);
    return '<ul class="sub-list" aria-label="Subscriptions and bills">' + r.list.map(function (it) { return row(it, r.next[it.id]); }).join('') + '</ul>' +
      '<p class="list-foot muted">Showing ' + r.list.length + ' of ' + st.items.length + ' \u00B7 <strong class="num">' + U.money(monthly) + '</strong>/mo active</p>';
  }

  function render() {
    var st = V.state(), t = V.today();
    var tot = F.totals(st.items, t);
    var usedCats = L.CATEGORIES.filter(function (c) { return st.items.some(function (i) { return i.category === c.id; }); });
    var toolbar = st.items.length ? '<div class="toolbar">' +
      '<label class="search-field">' + U.icon('search', 18) + '<span class="sr-only">Search subscriptions</span><input type="search" class="input input--search" data-search="subs" value="' + U.esc(vs.q) + '" placeholder="Search name, category, card\u2026" autocomplete="off"></label>' +
      '<div class="toolbar__row">' + V.segmented('substatus', STATUS, vs.status, { small: true, label: 'Status filter', action: 'subs-status' }) +
      '<div class="toolbar__selects"><label class="select-pill"><span class="sr-only">Category</span>' + U.icon('filter', 16) + '<select data-change="subs-cat" aria-label="Filter by category"><option value="">All categories</option>' + usedCats.map(function (c) { return '<option value="' + c.id + '"' + (vs.cat === c.id ? ' selected' : '') + '>' + U.esc(c.name) + '</option>'; }).join('') + '</select></label>' +
      '<label class="select-pill">' + U.icon('sort', 16) + '<select data-change="subs-sort" aria-label="Sort">' + SORTS.map(function (s) { return '<option value="' + s[0] + '"' + (vs.sort === s[0] ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select></label></div></div></div>' : '';
    return V.pageHead('Subscriptions & bills', st.items.length ? tot.count + ' active \u00B7 <span class="num">' + U.money(tot.monthly) + '</span>/mo \u00B7 <span class="num">' + U.money(tot.yearly) + '</span>/yr' : 'Everything that repeats, in one list',
      V.btn('Export CSV', { action: 'export-csv-items', icon: 'download', cls: 'btn--ghost hide-sm' }) + V.btn('Add', { action: 'add-item', icon: 'plus', cls: 'btn--primary' })) +
      toolbar + '<section class="card card--list" data-region="list">' + listHTML() + '</section>';
  }

  function refreshList() { var r = document.querySelector('[data-region="list"]'); if (r) r.innerHTML = listHTML(); }

  LG.App.on('subs-status', function (el) { vs.status = el.value; refreshList(); });
  LG.App.on('subs-cat', function (el) { vs.cat = el.value; refreshList(); });
  LG.App.on('subs-sort', function (el) { vs.sort = el.value; refreshList(); });
  LG.App.on('subs-clear', function () { vs = { q: '', status: 'all', cat: '', sort: vs.sort }; LG.App.render(); });
  LG.App.onSearch = LG.App.onSearch || {};
  LG.App.onSearch.subs = U.debounce(function (v) { vs.q = v; refreshList(); }, 120);

  LG.Views.subscriptions = { title: 'Subscriptions & bills', render: render, setQuery: function (q) { vs.q = q; }, setSort: function (s) { vs.sort = s; vs.status = 'active'; } };
})(typeof self !== 'undefined' ? self : this);
