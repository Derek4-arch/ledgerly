/* Ledgerly - life documents & renewals */
(function (root) {
  'use strict';
  var LG = root.LG, U = LG.U, D = LG.Dates, L = LG.Library, V = LG.V;
  var vs = { q: '', status: 'all', sort: 'expiry' };

  function withStatus() {
    var t = V.today();
    return V.state().documents.map(function (d) { return { doc: d, st: LG.Insights.docStatus(d, t) }; });
  }

  function card(x) {
    var d = x.doc, s = x.st, t = V.today(), type = L.docType(d.type);
    var lead = d.lead || type.lead || 30;
    // progress through the reminder window: 0% = just entered it, 100% = expiry day
    var pct = s.status === 'expired' ? 100 : s.status === 'soon' ? Math.max(4, Math.min(100, ((lead - s.days) / lead) * 100)) : 0;
    var url = d.url || type.url;
    return '<li class="doc-card doc-card--' + s.status + '" data-row="' + U.esc(d.id) + '">' +
      '<button type="button" class="doc-card__main" data-action="edit-doc" data-id="' + U.esc(d.id) + '">' +
      '<span class="doc-card__icon">' + U.icon(type.icon, 22) + '</span><span class="doc-card__text"><span class="doc-card__name">' + U.esc(d.name) + '</span><span class="doc-card__type">' + U.esc(type.name) + (d.ref ? ' \u00B7 ' + U.esc(d.ref) : '') + '</span></span>' + V.statusChip(s.status) + '</button>' +
      '<div class="doc-card__when"><span class="doc-card__rel' + (s.status !== 'ok' ? ' is-' + s.status : '') + '">' + U.esc((s.status === 'expired' ? 'Expired ' : 'Expires ') + D.relative(d.expiry, t)) + '</span><span class="muted small">' + U.esc(D.formatDate(d.expiry, { weekday: true })) + '</span></div>' +
      '<div class="doc-card__bar" role="img" aria-label="' + (s.status === 'ok' ? 'Not yet in reminder window' : Math.round(pct) + '% through the ' + lead + '-day reminder window') + '"><span style="width:' + pct.toFixed(1) + '%"></span></div>' +
      '<div class="doc-card__actions"><span class="muted small">' + U.icon('bell', 14) + ' ' + lead + ' days before</span><span class="doc-card__btns">' +
      (url ? '<a class="icon-btn icon-btn--sm" href="' + U.esc(url) + '" target="_blank" rel="noopener noreferrer" aria-label="Open renewal page for ' + U.esc(d.name) + '" title="Renewal page">' + U.icon('external', 16) + '</a>' : '') +
      '<button type="button" class="icon-btn icon-btn--sm" data-action="delete-doc" data-id="' + U.esc(d.id) + '" aria-label="Delete ' + U.esc(d.name) + '" title="Delete">' + U.icon('trash', 16) + '</button>' +
      '<button type="button" class="btn btn--sm btn--soft" data-action="renew-doc" data-id="' + U.esc(d.id) + '">' + U.icon('check', 16) + '<span>Renewed</span></button></span></div></li>';
  }

  function listHTML() {
    var all = withStatus();
    if (!all.length) {
      var quick = ['passport', 'licence', 'mot', 'cartax', 'carins', 'homeins', 'tvlicence', 'warranty'].map(function (id) { var t = L.docType(id); return '<button type="button" class="quick-doc" data-action="add-doc-type" data-type="' + id + '">' + U.icon(t.icon, 18) + '<span>' + U.esc(t.name) + '</span></button>'; }).join('');
      return V.empty({ icon: 'shield', title: 'Never miss a renewal again', body: 'Passports, MOT, car tax, insurance, warranties\u2026 add the expiry date and Ledgerly reminds you well before.', actions: '<div class="quick-docs">' + quick + '</div>' });
    }
    var q = vs.q.toLowerCase();
    var list = all.filter(function (x) {
      if (vs.status !== 'all' && x.st.status !== vs.status) return false;
      if (q && (x.doc.name + ' ' + L.docType(x.doc.type).name + ' ' + (x.doc.notes || '') + ' ' + (x.doc.ref || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    list.sort(function (a, b) {
      if (vs.sort === 'name') return a.doc.name.localeCompare(b.doc.name);
      if (vs.sort === 'latest') return b.doc.expiry.localeCompare(a.doc.expiry);
      return a.doc.expiry.localeCompare(b.doc.expiry);
    });
    if (!list.length) return V.empty({ icon: 'search', title: 'No matches', body: 'Try a different search or filter.', actions: V.btn('Clear filters', { action: 'docs-clear', icon: 'x' }), compact: true });
    return '<ul class="doc-grid">' + list.map(card).join('') + '</ul>';
  }

  function render() {
    var all = withStatus();
    var counts = { expired: 0, soon: 0, ok: 0 };
    all.forEach(function (x) { counts[x.st.status] = (counts[x.st.status] || 0) + 1; });
    var sub = all.length ? (counts.expired ? counts.expired + ' expired \u00B7 ' : '') + counts.soon + ' due soon \u00B7 ' + counts.ok + ' OK' : 'Passports, MOT, insurance and everything else that expires';
    var toolbar = all.length ? '<div class="toolbar"><label class="search-field">' + U.icon('search', 18) + '<span class="sr-only">Search renewals</span><input type="search" class="input input--search" data-search="docs" value="' + U.esc(vs.q) + '" placeholder="Search renewals\u2026" autocomplete="off"></label>' +
      '<div class="toolbar__row">' + V.segmented('docstatus', [{ value: 'all', label: 'All (' + all.length + ')' }, { value: 'expired', label: 'Expired (' + counts.expired + ')' }, { value: 'soon', label: 'Due soon (' + counts.soon + ')' }, { value: 'ok', label: 'OK (' + counts.ok + ')' }], vs.status, { small: true, label: 'Status filter', action: 'docs-status' }) +
      '<div class="toolbar__selects"><label class="select-pill">' + U.icon('sort', 16) + '<select data-change="docs-sort" aria-label="Sort renewals"><option value="expiry"' + (vs.sort === 'expiry' ? ' selected' : '') + '>Expiring soonest</option><option value="latest"' + (vs.sort === 'latest' ? ' selected' : '') + '>Expiring latest</option><option value="name"' + (vs.sort === 'name' ? ' selected' : '') + '>Name A\u2013Z</option></select></label></div></div></div>' : '';
    return V.pageHead('Documents & renewals', sub, V.btn('Export CSV', { action: 'export-csv-docs', icon: 'download', cls: 'btn--ghost hide-sm' }) + V.btn('Add renewal', { action: 'add-doc', icon: 'plus', cls: 'btn--primary' })) +
      toolbar + '<section data-region="list">' + listHTML() + '</section>';
  }

  function refreshList() { var r = document.querySelector('[data-region="list"]'); if (r) r.innerHTML = listHTML(); }
  LG.App.on('docs-status', function (el) { vs.status = el.value; refreshList(); });
  LG.App.on('docs-sort', function (el) { vs.sort = el.value; refreshList(); });
  LG.App.on('docs-clear', function () { vs.q = ''; vs.status = 'all'; LG.App.render(); });
  LG.App.on('add-doc-type', function (el) { LG.Sheets.docForm({ prefill: { type: el.getAttribute('data-type') } }); });
  LG.App.on('renew-doc', function (el) { LG.Sheets.renewDoc(el.getAttribute('data-id')); });
  LG.App.onSearch = LG.App.onSearch || {};
  LG.App.onSearch.docs = U.debounce(function (v) { vs.q = v; refreshList(); }, 120);

  LG.Views.documents = { title: 'Documents & renewals', render: render };
})(typeof self !== 'undefined' ? self : this);
