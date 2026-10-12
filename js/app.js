/* Ledgerly - app shell: router, actions, shortcuts, theme, PWA, reminders */
(function (root) {
  'use strict';
  var LG = root.LG, U = LG.U, D = LG.Dates, F = LG.Finance, L = LG.Library, S = LG.Store, UI = LG.UI, V = LG.V;
  var App = LG.App;
  var current = null, flashIds = {}, lastDay = D.today(), deferredInstall = null, booted = false;
  var NAV = [
    { name: 'dashboard', path: '#/', label: 'Home', long: 'Dashboard', icon: 'home', key: '1' },
    { name: 'subscriptions', path: '#/subscriptions', label: 'Bills', long: 'Subscriptions & bills', icon: 'repeat', key: '2' },
    { name: 'calendar', path: '#/calendar', label: 'Calendar', long: 'Calendar', icon: 'calendar', key: '3' },
    { name: 'documents', path: '#/documents', label: 'Renewals', long: 'Renewals', icon: 'shield', key: '4' },
    { name: 'insights', path: '#/insights', label: 'Insights', long: 'Insights', icon: 'sparkle', key: '5' },
    { name: 'settings', path: '#/settings', label: 'Settings', long: 'Settings', icon: 'settings', key: '6' }
  ];

  LG.Views.notfound = {
    title: 'Not found',
    render: function () { return '<div class="notfound">' + V.empty({ icon: 'search', title: 'This page doesn\u2019t exist', body: 'The link may be old or mistyped.', actions: V.btn('Back to dashboard', { href: '#/', icon: 'home', cls: 'btn--primary' }) }) + '</div>'; }
  };

  /* ---------- routing ---------- */
  function parseHash() {
    var h = (location.hash || '#/').replace(/^#\/?/, '');
    var parts = h.split('?');
    var name = parts[0].replace(/\/$/, '') || 'dashboard';
    var params = {};
    (parts[1] || '').split('&').forEach(function (kv) { if (!kv) return; var p = kv.split('='); params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); });
    return { name: name, params: params };
  }
  App.params = function () { return parseHash().params; };
  App.setParams = function (obj) {
    var r = parseHash();
    var q = Object.keys(obj).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]); }).join('&');
    var target = '#/' + (r.name === 'dashboard' ? '' : r.name) + (q ? '?' + q : '');
    if (location.hash === target) App.render(); else location.hash = target;
  };

  function viewFor(name) { return LG.Views[name] && name !== 'notfound' ? LG.Views[name] : LG.Views.notfound; }

  App.render = function () {
    var r = parseHash();
    if (!S.state.settings.onboarded && r.name !== 'welcome') { location.replace('#/welcome'); renderRoute({ name: 'welcome', params: {} }); return; }
    renderRoute(r);
  };

  function renderRoute(r) {
    var view = viewFor(r.name);
    var changed = r.name !== current;
    if (changed && view.enter) view.enter();
    var main = document.getElementById('view');
    var active = document.activeElement;
    var searchKey = active && active.getAttribute && active.getAttribute('data-search');
    var selStart = searchKey ? active.selectionStart : 0;
    var scroll = root.scrollY;
    var inner = document.createElement('div');
    inner.className = 'view view--' + r.name + (changed && booted ? ' view-enter' : '');
    try { inner.innerHTML = view.render(); }
    catch (err) { console.error(err); inner.innerHTML = V.empty({ icon: 'alert', title: 'Something went wrong', body: U.esc(err.message), actions: V.btn('Reload', { action: 'reload', icon: 'refresh' }) }); }
    main.replaceChildren(inner);
    document.body.classList.toggle('is-fullscreen', !!view.fullscreen);
    if (view.mount) { try { view.mount(inner); } catch (e) { console.error(e); } }
    Object.keys(flashIds).forEach(function (id) {
      U.$$('[data-row="' + cssEsc(id) + '"]', inner).forEach(function (el) { el.classList.add('is-new'); });
    });
    flashIds = {};
    if (searchKey) {
      var s = inner.querySelector('[data-search="' + searchKey + '"]');
      if (s) { s.focus({ preventScroll: true }); try { s.setSelectionRange(selStart, selStart); } catch (e) { /* ignore */ } }
    }
    U.$$('[data-nav]').forEach(function (a) {
      var on = a.getAttribute('data-nav') === r.name;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var nav = NAV.filter(function (n) { return n.name === r.name; })[0];
    document.title = (r.name === 'dashboard' ? 'Ledgerly \u00B7 Bills, subscriptions & renewals' : view.title + ' \u00B7 Ledgerly');
    if (changed) {
      if (booted) {
        root.scrollTo(0, 0);
        routeBar();
        if (!view.fullscreen && !UI.isOpen()) { try { main.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
      }
    } else root.scrollTo(0, scroll);
    current = r.name;
    updateBadge();
  }

  function cssEsc(s) { return root.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/"/g, '\\"'); }
  function routeBar() {
    var bar = document.getElementById('route-bar');
    if (!bar || U.reducedMotion()) return;
    bar.classList.remove('is-running'); void bar.offsetWidth; bar.classList.add('is-running');
  }
  App.flash = function (id) { flashIds[id] = 1; };
  App.current = function () { return current; };

  /* ---------- theme ---------- */
  var mq = root.matchMedia ? root.matchMedia('(prefers-color-scheme: dark)') : null;
  function effectiveTheme() { var p = S.state.settings.theme; return p === 'system' ? (mq && mq.matches ? 'dark' : 'light') : p; }
  function applyTheme(animate) {
    var html = document.documentElement;
    if (animate && !U.reducedMotion()) { html.classList.add('theme-anim'); setTimeout(function () { html.classList.remove('theme-anim'); }, 400); }
    var t = effectiveTheme();
    html.setAttribute('data-theme', t);
    U.$$('meta[name="theme-color"]').forEach(function (m) { m.setAttribute('content', t === 'dark' ? '#0E1211' : '#F7F8F7'); });
    U.$$('[data-theme-icon]').forEach(function (b) { b.innerHTML = U.icon(t === 'dark' ? 'sun' : 'moon', 20); b.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'); b.setAttribute('title', t === 'dark' ? 'Light mode (T)' : 'Dark mode (T)'); });
  }
  App.setTheme = function (pref) { S.setSettings({ theme: pref }); applyTheme(true); };
  App.toggleTheme = function () { App.setTheme(effectiveTheme() === 'dark' ? 'light' : 'dark'); UI.toast(effectiveTheme() === 'dark' ? 'Dark mode on' : 'Light mode on', { icon: effectiveTheme() === 'dark' ? 'moon' : 'sun' }); };
  if (mq && mq.addEventListener) mq.addEventListener('change', function () { if (S.state.settings.theme === 'system') applyTheme(true); });

  /* ---------- reminders ---------- */
  function updateBadge() {
    var list = LG.Notify.compute(S.state, D.today());
    var n = LG.Notify.unread(S.state, list).length;
    U.$$('[data-badge]').forEach(function (b) { b.textContent = n > 9 ? '9+' : String(n); b.hidden = n === 0; });
    U.$$('[data-action="open-notifs"]').forEach(function (b) { b.setAttribute('aria-label', 'Reminders' + (n ? ', ' + n + ' unread' : '')); });
    return list;
  }
  function checkReminders() { var list = updateBadge(); LG.Notify.deliver(S.state, list); }
  App.enableNotifications = function () {
    LG.Notify.request().then(function (p) {
      if (p === 'granted') {
        S.setSettings({ notify: true });
        UI.toast('Notifications on. We\u2019ll nudge you before things are due.', { icon: 'bell' });
        checkReminders();
      } else if (p === 'denied') {
        S.setSettings({ notify: false });
        UI.toast('Notifications are blocked. You can allow them in your browser\u2019s site settings.', { tone: 'error' });
      } else if (p === 'unsupported') {
        UI.toast('This browser doesn\u2019t support notifications here. Try the calendar export instead.', { tone: 'error' });
      } else { S.setSettings({ notify: false }); UI.toast('No problem \u2014 reminders will still show in the app.'); }
    });
  };

  /* ---------- exports ---------- */
  function stamp() { return D.today(); }
  App.exportICS = function () {
    var st = S.state;
    var n = st.items.filter(function (i) { return i.status === 'active'; }).length + st.documents.length;
    if (!n) { UI.toast('Add a subscription or renewal first', { tone: 'error' }); return; }
    U.download('ledgerly-calendar-' + stamp() + '.ics', LG.ICS.build(st, { money: U.money, now: new Date() }), 'text/calendar;charset=utf-8');
    UI.toast('Calendar downloaded \u2014 import it into Google, Outlook or Apple Calendar', { icon: 'calendar' });
  };
  App.exportJSON = function () {
    U.download('ledgerly-backup-' + stamp() + '.json', S.exportJSON(), 'application/json');
    UI.toast('Backup downloaded', { icon: 'download' });
  };
  function csvCell(v) {
    var s = v === undefined || v === null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // stop spreadsheet formula injection
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function toCSV(rows) { return '\uFEFF' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n') + '\r\n'; }
  App.exportCSV = function (kind) {
    var st = S.state, t = D.today(), cur = st.settings.currency;
    if (kind === 'docs') {
      if (!st.documents.length) { UI.toast('No renewals to export yet', { tone: 'error' }); return; }
      var drows = [['Name', 'Type', 'Expiry date', 'Status', 'Days left', 'Reminder (days before)', 'Reference', 'Renewal link', 'Notes']];
      st.documents.forEach(function (d) { var s = LG.Insights.docStatus(d, t); drows.push([d.name, L.docType(d.type).name, d.expiry, { ok: 'OK', soon: 'Due soon', expired: 'Expired' }[s.status] || '', s.days, d.lead, d.ref, d.url, d.notes]); });
      U.download('ledgerly-renewals-' + stamp() + '.csv', toCSV(drows), 'text/csv;charset=utf-8');
    } else {
      if (!st.items.length) { UI.toast('No subscriptions to export yet', { tone: 'error' }); return; }
      var rows = [['Name', 'Category', 'Amount', 'Currency', 'Cycle', 'Next payment', 'Monthly equivalent', 'Yearly equivalent', 'Status', 'Paid with', 'Free trial ends', 'Cancel by', 'Notes']];
      st.items.forEach(function (it) {
        rows.push([it.name, L.category(it.category).name, it.amount.toFixed(2), cur, D.cycleLabel(it), it.status === 'active' ? D.nextOccurrence(it, t) || '' : '', F.round2(D.monthlyEquivalent(it)).toFixed(2), F.round2(D.yearlyEquivalent(it)).toFixed(2), it.status, it.method, it.trialEnd, it.cancelBy, it.notes]);
      });
      U.download('ledgerly-subscriptions-' + stamp() + '.csv', toCSV(rows), 'text/csv;charset=utf-8');
    }
    UI.toast('CSV downloaded \u2014 opens in Excel, Numbers or Google Sheets', { icon: 'download' });
  };
  App.importJSON = function (file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { UI.toast('That file is too large to be a Ledgerly backup', { tone: 'error' }); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var data;
      try { data = JSON.parse(reader.result); } catch (e) { UI.toast('That file isn\u2019t valid JSON', { tone: 'error' }); return; }
      if (!data || typeof data !== 'object' || (!Array.isArray(data.items) && !Array.isArray(data.documents))) { UI.toast('That doesn\u2019t look like a Ledgerly backup', { tone: 'error' }); return; }
      var ni = (data.items || []).length, nd = (data.documents || []).length;
      UI.confirm({ title: 'Restore this backup?', body: 'This replaces everything currently in Ledgerly with ' + ni + ' subscription' + (ni === 1 ? '' : 's') + ' and ' + nd + ' renewal' + (nd === 1 ? '' : 's') + (data.exportedAt ? ' from ' + U.esc(new Date(data.exportedAt).toLocaleString('en-GB')) : '') + '.', confirmLabel: 'Replace my data' })
        .then(function (ok) {
          if (!ok) return;
          data.settings = Object.assign({}, data.settings || {}, { onboarded: true });
          S.replace(data, { type: 'imported' });
          U.clearFormatCache();
          applyTheme(true);
          if (parseHash().name === 'welcome') location.hash = '#/';
          UI.toast('Backup restored: ' + S.state.items.length + ' subscriptions, ' + S.state.documents.length + ' renewals');
        });
    };
    reader.onerror = function () { UI.toast('Couldn\u2019t read that file', { tone: 'error' }); };
    reader.readAsText(file);
  };

  /* ---------- deletes with undo ---------- */
  function animateOut(id, then) {
    var rows = U.$$('#view [data-row="' + cssEsc(id) + '"]');
    if (!rows.length || U.reducedMotion()) { then(); return; }
    rows.forEach(function (r) { r.style.height = r.offsetHeight + 'px'; void r.offsetWidth; r.classList.add('is-leaving'); });
    setTimeout(then, 230);
  }
  App.deleteItem = function (id) {
    var it = S.item(id); if (!it) return;
    animateOut(id, function () {
      var undo = S.removeItem(id);
      UI.toast(it.name + ' deleted', { icon: 'trash', action: { label: 'Undo', icon: 'undo', fn: function () { App.flash(id); undo(); UI.toast(it.name + ' restored'); } } });
    });
  };
  App.deleteDoc = function (id) {
    var d = S.doc(id); if (!d) return;
    animateOut(id, function () {
      var undo = S.removeDoc(id);
      UI.toast(d.name + ' deleted', { icon: 'trash', action: { label: 'Undo', icon: 'undo', fn: function () { App.flash(id); undo(); UI.toast(d.name + ' restored'); } } });
    });
  };

  App.loadSample = function () {
    var st = S.state;
    function go() {
      S.replace(LG.Sample.build(D.today()), { type: 'sample' });
      U.clearFormatCache();
      if (parseHash().name === 'dashboard') App.render(); else location.hash = '#/';
      UI.toast('Sample data loaded. Explore freely \u2014 nothing is real.', { icon: 'sparkle' });
    }
    if ((st.items.length || st.documents.length) && !st.settings.sample) {
      UI.confirm({ title: 'Replace your data with sample data?', body: 'Your ' + st.items.length + ' subscriptions and ' + st.documents.length + ' renewals will be replaced. Export a backup first if you want to keep them.', confirmLabel: 'Load sample data', danger: true }).then(function (ok) { if (ok) go(); });
    } else go();
  };

  /* ---------- palette ---------- */
  function paletteEntries(q) {
    var st = S.state, t = D.today(), out = [], r = 0;
    function add(e) { e.rank = r++; out.push(e); }
    add({ group: 'Quick actions', label: 'Add a subscription or bill', icon: 'plus', kbd: 'N', keywords: 'new create', run: function () { LG.Sheets.itemForm(); } });
    add({ group: 'Quick actions', label: 'Add a document or renewal', icon: 'shield', kbd: 'R', keywords: 'passport mot insurance new', run: function () { LG.Sheets.docForm(); } });
    add({ group: 'Quick actions', label: 'Toggle dark mode', icon: effectiveTheme() === 'dark' ? 'sun' : 'moon', kbd: 'T', keywords: 'theme light dark', run: App.toggleTheme });
    add({ group: 'Quick actions', label: 'Show reminders', icon: 'bell', kbd: 'B', keywords: 'notifications', run: function () { LG.Sheets.notifications(); } });
    add({ group: 'Quick actions', label: 'Download calendar (.ics)', icon: 'calendar', keywords: 'export google outlook ical', run: App.exportICS });
    add({ group: 'Quick actions', label: 'Export backup (JSON)', icon: 'download', keywords: 'save data', run: App.exportJSON });
    add({ group: 'Quick actions', label: 'Export subscriptions (CSV)', icon: 'download', keywords: 'excel spreadsheet', run: function () { App.exportCSV('items'); } });
    add({ group: 'Quick actions', label: 'Keyboard shortcuts', icon: 'keyboard', kbd: '?', keywords: 'help keys', run: function () { LG.Sheets.shortcuts(); } });
    NAV.forEach(function (n) { add({ group: 'Go to', label: n.long, icon: n.icon, kbd: n.key, keywords: n.label, run: function () { location.hash = n.path; } }); });
    var items = st.items.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    (q ? items : items.slice(0, 6)).forEach(function (it) {
      var nd = it.status === 'active' ? D.nextOccurrence(it, t) : null;
      add({ group: 'Your subscriptions', label: it.name, tile: U.tile(it, 'sm'), hint: U.money(it.amount) + ' ' + D.cycleLabel(it).toLowerCase() + (nd ? ' \u00B7 next ' + D.formatDate(nd, { year: false }) : ' \u00B7 ' + it.status), keywords: L.category(it.category).name + ' ' + (it.method || ''), run: function () { LG.Sheets.itemDetail(it.id); } });
    });
    if (q) {
      st.documents.forEach(function (d) { add({ group: 'Renewals', label: d.name, icon: L.docType(d.type).icon, hint: 'Expires ' + D.formatDate(d.expiry), keywords: L.docType(d.type).name, run: function () { LG.Sheets.docForm({ id: d.id }); } }); });
      L.SERVICES.forEach(function (s) { add({ group: 'Add from library', label: 'Add ' + s.name, tile: U.tile({ serviceId: s.id, name: s.name }, 'sm'), hint: U.money(s.price) + ' ' + D.cycleLabel({ cycle: s.cycle }).toLowerCase(), keywords: L.category(s.category).name, run: function () { LG.Sheets.itemForm({ prefill: { serviceId: s.id, name: s.name, amount: s.price, cycle: s.cycle, category: s.category } }); } }); });
    }
    return out;
  }
  App.openPalette = function () {
    var open = document.querySelector('.overlay--palette');
    if (open) { UI.closeTop(); return; }
    UI.palette(paletteEntries);
  };

  App.canInstall = function () { return !!deferredInstall; };
  App.isStandalone = function () { return (root.matchMedia && root.matchMedia('(display-mode: standalone)').matches) || root.navigator.standalone === true; };

  /* ---------- actions ---------- */
  var A = App.actions;
  A['open-item'] = function (el) { LG.Sheets.itemDetail(el.getAttribute('data-id')); };
  A['add-item'] = function () { LG.Sheets.itemForm(); };
  A['add-doc'] = function () { LG.Sheets.docForm(); };
  A['edit-doc'] = function (el) { LG.Sheets.docForm({ id: el.getAttribute('data-id') }); };
  A['delete-item'] = function (el) { App.deleteItem(el.getAttribute('data-id')); };
  A['delete-doc'] = function (el) { App.deleteDoc(el.getAttribute('data-id')); };
  A['mark-cancelled'] = function (el) {
    var id = el.getAttribute('data-id'), it = S.item(id); if (!it) return;
    S.updateItem(id, { status: 'cancelled' });
    UI.toast(it.name + ' marked as cancelled \u2014 saving ' + U.money(D.yearlyEquivalent(it)) + '/yr', { icon: 'sparkle', action: { label: 'Undo', icon: 'undo', fn: function () { S.updateItem(id, { status: 'active' }); } } });
  };
  A['load-sample'] = App.loadSample;
  A['start-fresh'] = function () {
    UI.confirm({ title: 'Start fresh?', body: 'This clears the sample data so you can add your own. It only takes a minute.', confirmLabel: 'Clear sample data' }).then(function (ok) {
      if (!ok) return;
      var theme = S.state.settings.theme;
      S.clearAll(); S.setSettings({ theme: theme });
      location.hash = '#/welcome';
    });
  };
  A['clear-all'] = function () {
    UI.confirm({ title: 'Delete all data?', body: 'This permanently removes every subscription, renewal and setting from this device. There\u2019s no undo, so export a backup first if you might need it.', confirmLabel: 'Delete everything', danger: true }).then(function (ok) {
      if (!ok) return;
      S.clearAll();
      applyTheme(true);
      location.hash = '#/welcome';
      UI.toast('All data cleared');
    });
  };
  A['set-income'] = function () {
    UI.confirm({
      title: 'Monthly take-home income', body: 'Ledgerly uses this to show what\u2019s left after bills. It never leaves this device.',
      extra: '<div class="field"><label class="field__label" for="dlg-income">Amount per month</label><div class="input-affix"><span class="input-affix__pre">' + U.esc(U.currencySymbol()) + '</span><input id="dlg-income" class="input" type="number" min="0" step="0.01" inputmode="decimal" placeholder="e.g. 2400"></div></div>',
      confirmLabel: 'Save', collect: function (el) { return el.querySelector('#dlg-income').value || ''; }
    }).then(function (v) {
      if (v === false || v === true || v === '') return;
      if (!(Number(v) >= 0)) { UI.toast('Please enter a positive number', { tone: 'error' }); return; }
      S.setSettings({ income: Number(v) });
      UI.toast('Income saved');
    });
  };
  A['export-ics'] = App.exportICS;
  A['export-json'] = App.exportJSON;
  A['export-csv-items'] = function () { App.exportCSV('items'); };
  A['export-csv-docs'] = function () { App.exportCSV('docs'); };
  A['import-json'] = function (el) { App.importJSON(el.files && el.files[0]); el.value = ''; };
  A['install-app'] = function () {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    deferredInstall.userChoice.then(function (c) { if (c.outcome === 'accepted') UI.toast('Ledgerly installed'); deferredInstall = null; App.render(); });
  };
  A['enable-notify'] = function () { App.enableNotifications(); };
  A['toggle-theme'] = function () { App.toggleTheme(); };
  A['open-palette'] = function () { App.openPalette(); };
  A['open-notifs'] = function () { LG.Sheets.notifications(); };
  A['fab'] = function () { if (current === 'documents') LG.Sheets.docForm(); else LG.Sheets.itemForm(); };
  A['reload'] = function () { location.reload(); };

  /* ---------- global events ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    var fn = A[el.getAttribute('data-action')];
    if (!fn) { console.warn('No handler for', el.getAttribute('data-action')); return; }
    if (el.tagName === 'A' && !el.getAttribute('href')) e.preventDefault();
    if (el.tagName === 'BUTTON') e.preventDefault();
    fn(el, e);
  });
  document.addEventListener('change', function (e) {
    var el = e.target.closest('[data-change]');
    if (!el) return;
    var fn = A[el.getAttribute('data-change')];
    if (fn) fn(el, e);
  });
  document.addEventListener('input', function (e) {
    var k = e.target.getAttribute && e.target.getAttribute('data-search');
    if (k && App.onSearch && App.onSearch[k]) App.onSearch[k](e.target.value.trim());
  });

  function typing(el) {
    if (!el) return false;
    var tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }
  document.addEventListener('keydown', function (e) {
    var k = e.key;
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (k === 'k' || k === 'K')) { e.preventDefault(); App.openPalette(); return; }
    if (k === 'Escape') { if (UI.closeTop()) e.preventDefault(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target) || UI.isOpen() || current === 'welcome') return;
    var nav = NAV.filter(function (n) { return n.key === k; })[0];
    if (nav) { e.preventDefault(); location.hash = nav.path; return; }
    switch (k) {
      case 'n': case 'N': e.preventDefault(); LG.Sheets.itemForm(); break;
      case 'r': case 'R': e.preventDefault(); LG.Sheets.docForm(); break;
      case 't': case 'T': e.preventDefault(); App.toggleTheme(); break;
      case 'b': case 'B': e.preventDefault(); LG.Sheets.notifications(); break;
      case '?': e.preventDefault(); LG.Sheets.shortcuts(); break;
      case '/': {
        e.preventDefault();
        var s = document.querySelector('#view [data-search]');
        if (s) s.focus(); else App.openPalette();
        break;
      }
    }
  });

  root.addEventListener('hashchange', App.render);
  root.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredInstall = e; if (current === 'settings') App.render(); });
  root.addEventListener('appinstalled', function () { deferredInstall = null; });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { if (D.today() !== lastDay) { lastDay = D.today(); App.render(); } checkReminders(); } });
  root.addEventListener('storage', function (e) { if (e.key === S.KEY) { S.load(); applyTheme(); App.render(); } });

  /* ---------- shell ---------- */
  function hydrateShell() {
    U.$$('[data-icon]').forEach(function (el) { el.innerHTML = U.icon(el.getAttribute('data-icon'), +(el.getAttribute('data-size') || 20)); });
    U.$$('[data-logo]').forEach(function (el) { el.innerHTML = LG.Brand.logo(+(el.getAttribute('data-logo') || 32)); });
    var side = document.getElementById('side-nav'), tabs = document.getElementById('tab-nav');
    side.innerHTML = NAV.map(function (n) { return '<a href="' + n.path + '" class="side-link" data-nav="' + n.name + '">' + U.icon(n.icon, 20) + '<span>' + n.long + '</span><kbd>' + n.key + '</kbd></a>'; }).join('');
    tabs.innerHTML = NAV.slice(0, 5).map(function (n) { return '<a href="' + n.path + '" class="tab-link" data-nav="' + n.name + '">' + U.icon(n.icon, 22) + '<span>' + n.label + '</span></a>'; }).join('');
  }

  function registerPWA() {
    if (location.protocol !== 'https:' && location.protocol !== 'http:') return; // file:// - everything else still works
    var link = document.createElement('link');
    link.rel = 'manifest'; link.href = 'assets/manifest.webmanifest';
    document.head.appendChild(link);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        reg.addEventListener('updatefound', function () {
          var w = reg.installing;
          if (!w) return;
          w.addEventListener('statechange', function () {
            if (w.state === 'installed' && navigator.serviceWorker.controller) UI.toast('A new version of Ledgerly is ready', { icon: 'refresh', action: { label: 'Reload', fn: function () { location.reload(); } }, timeout: 15000 });
          });
        });
      }).catch(function (err) { console.warn('Service worker not registered:', err && err.message); });
    }
  }

  function boot() {
    S.load();
    applyTheme();
    hydrateShell();
    S.subscribe(function (evt) {
      if (evt && evt.silent) { updateBadge(); return; }
      if (evt && evt.type === 'settings' && evt.keys && evt.keys.indexOf('theme') >= 0) applyTheme(true);
      if (evt && (evt.type === 'replaced' || evt.type === 'cleared' || evt.type === 'imported' || evt.type === 'sample' || evt.type === 'onboarded')) U.clearFormatCache();
      if (evt && evt.type === 'storage-error') UI.toast('Couldn\u2019t save \u2014 your browser storage is full or blocked', { tone: 'error' });
      App.render();
    });
    App.render();
    booted = true;
    document.documentElement.classList.add('is-ready');
    registerPWA();
    setTimeout(checkReminders, 1500);
    setInterval(function () {
      if (D.today() !== lastDay) { lastDay = D.today(); App.render(); }
    }, 60000);
    setInterval(checkReminders, 30 * 60000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(typeof self !== 'undefined' ? self : this);
