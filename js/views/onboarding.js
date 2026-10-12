/* Ledgerly - 60-second onboarding */
(function (root) {
  'use strict';
  var LG = root.LG, U = LG.U, D = LG.Dates, L = LG.Library, V = LG.V;
  var ob = null;
  var POPULAR = ['netflix', 'spotify', 'prime', 'disney', 'icloud', 'googleone', 'youtube', 'chatgpt', 'gym', 'counciltax', 'energy', 'broadband', 'mobile', 'tvlicence', 'carins', 'water', 'applemusic', 'm365', 'adobe', 'nowtv'];
  var QUICK_DOCS = ['passport', 'licence', 'mot', 'cartax', 'carins', 'homeins', 'tvlicence'];

  function reset() {
    var s = LG.Store.state.settings;
    ob = { step: 0, name: s.name || '', currency: s.currency || 'GBP', income: s.income === null ? '' : s.income, picks: {}, order: [], docs: {}, q: '', cat: '' };
  }

  function defaultDate(svc) {
    if (svc.cycle === 'yearly') return D.addMonths(V.today(), 3);
    return D.addDays(V.today(), 7);
  }

  function progress() {
    var steps = 3, cur = Math.min(ob.step, steps);
    return '<div class="ob-progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + steps + '" aria-valuenow="' + cur + '" aria-label="Setup progress"><span style="width:' + (cur / steps) * 100 + '%"></span></div>' +
      '<div class="ob-steplabel"><span>Step ' + cur + ' of ' + steps + '</span><button type="button" class="link-btn" data-action="ob-skip">Skip setup</button></div>';
  }

  function svcGrid() {
    var q = ob.q.toLowerCase();
    var list = L.SERVICES.filter(function (s) { return (!ob.cat || s.category === ob.cat) && (!q || s.name.toLowerCase().indexOf(q) >= 0); });
    if (!q && !ob.cat) list.sort(function (a, b) { var ia = POPULAR.indexOf(a.id), ib = POPULAR.indexOf(b.id); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
    return list.map(function (s) {
      var on = !!ob.picks[s.id];
      return '<button type="button" class="svc svc--pick' + (on ? ' is-on' : '') + '" data-action="ob-toggle" data-id="' + s.id + '" aria-pressed="' + on + '">' + U.tile({ serviceId: s.id, name: s.name }, 'lg') +
        '<span class="svc__name">' + U.esc(s.name) + '</span><span class="svc__price num">' + U.money(s.price) + '/' + D.cycleShort({ cycle: s.cycle }) + '</span><span class="svc__check" aria-hidden="true">' + U.icon('check', 14) + '</span></button>';
    }).join('') || '<p class="muted">No services match \u201C' + U.esc(ob.q) + '\u201D. You can add custom items later.</p>';
  }

  function picksList() {
    if (!ob.order.length) return '<p class="muted small ob-picks__empty">Tap services above to add them. You can edit prices and dates here.</p>';
    var total = 0;
    var rows = ob.order.map(function (id) {
      var p = ob.picks[id], s = L.service(id);
      total += D.monthlyEquivalent({ amount: Number(p.amount) || 0, cycle: s.cycle });
      return '<li class="ob-pick">' + U.tile({ serviceId: id, name: s.name }) + '<span class="ob-pick__name">' + U.esc(s.name) + '<small>' + D.cycleLabel({ cycle: s.cycle }) + '</small></span>' +
        '<label class="ob-pick__f"><span class="sr-only">' + U.esc(s.name) + ' price</span><span class="input-affix input-affix--sm"><span class="input-affix__pre">' + U.esc(U.currencySymbol()) + '</span><input class="input input--sm" type="number" min="0" step="0.01" inputmode="decimal" value="' + p.amount + '" data-ob-amount="' + id + '"></span></label>' +
        '<label class="ob-pick__f"><span class="sr-only">' + U.esc(s.name) + ' next payment</span><input class="input input--sm" type="date" value="' + p.anchor + '" data-ob-date="' + id + '"></label>' +
        '<button type="button" class="icon-btn icon-btn--sm" data-action="ob-toggle" data-id="' + id + '" aria-label="Remove ' + U.esc(s.name) + '">' + U.icon('x', 16) + '</button></li>';
    }).join('');
    return '<ul class="ob-picks__list">' + rows + '</ul><p class="ob-picks__total">' + ob.order.length + ' selected \u00B7 <strong class="num" data-ob-total>' + U.money(total) + '</strong>/mo</p>';
  }

  function stepHTML() {
    if (ob.step === 0) {
      return '<div class="ob-welcome"><div class="brand brand--xl">' + logo(44) + '<span>Ledgerly</span></div>' +
        '<h1 class="ob-title">Never be surprised by a bill again.</h1>' +
        '<p class="ob-lead">Subscriptions, bills, free trials and renewals \u2014 all in one calm place, with reminders before anything costs you.</p>' +
        '<ul class="ob-benefits"><li>' + U.icon('repeat', 20) + '<span><strong>See your real monthly cost</strong> across weekly, monthly and yearly bills</span></li>' +
        '<li>' + U.icon('sparkle', 20) + '<span><strong>Find savings</strong>: duplicate services, price rises, unused subscriptions</span></li>' +
        '<li>' + U.icon('shield', 20) + '<span><strong>Stay ahead of renewals</strong>: passport, MOT, insurance, TV licence</span></li></ul>' +
        '<div class="ob-choices"><button type="button" class="ob-choice ob-choice--primary" data-action="ob-start">' + U.icon('plus', 22) + '<span><strong>Start fresh</strong><small>60-second setup</small></span></button>' +
        '<button type="button" class="ob-choice" data-action="load-sample">' + U.icon('sparkle', 22) + '<span><strong>Explore with sample data</strong><small>See it working first</small></span></button></div>' +
        '<p class="ob-restore">Moving from another device? <label class="link-btn file-btn">Restore a backup<input type="file" accept="application/json,.json" data-change="import-json" class="sr-only"></label></p>' +
        '<p class="ob-privacy">' + U.icon('lock', 16) + 'Private by design: no account, no bank login. Your data stays on this device.</p></div>';
    }
    if (ob.step === 1) {
      return progress() + '<h1 class="ob-title ob-title--sm">A little about you</h1><p class="ob-lead">All optional, and only stored on this device.</p>' +
        '<form class="form ob-form" data-ob-form="1" novalidate>' +
        LG.Sheets.field({ name: 'ob-name', label: 'What should we call you?', value: ob.name, optional: true, placeholder: 'First name', attrs: ' maxlength="40" autocomplete="given-name"' }) +
        '<div class="grid-2">' + LG.Sheets.field({ name: 'ob-currency', label: 'Currency', type: 'select', value: ob.currency, options: L.CURRENCIES.map(function (c) { return [c.code, c.code + ' \u2014 ' + c.name]; }) }) +
        LG.Sheets.field({ name: 'ob-income', label: 'Monthly take-home income', type: 'number', value: ob.income, optional: true, placeholder: 'e.g. 2400', attrs: ' min="0" step="0.01" inputmode="decimal"', hint: 'Shows what\u2019s left after bills.' }) + '</div>' +
        '</form><div class="ob-nav"><button type="button" class="btn btn--ghost" data-action="ob-back">' + U.icon('left', 18) + '<span>Back</span></button><button type="button" class="btn btn--primary" data-action="ob-next">Continue' + U.icon('right', 18) + '</button></div>';
    }
    if (ob.step === 2) {
      var cats = L.CATEGORIES.filter(function (c) { return L.SERVICES.some(function (s) { return s.category === c.id; }); });
      return progress() + '<h1 class="ob-title ob-title--sm">What do you pay for?</h1><p class="ob-lead">Pick everything that applies. Typical UK prices are filled in \u2014 tweak them below.</p>' +
        '<label class="search-field">' + U.icon('search', 18) + '<span class="sr-only">Search services</span><input type="search" class="input input--search" data-ob-q value="' + U.esc(ob.q) + '" placeholder="Search ' + L.SERVICES.length + ' services\u2026" autocomplete="off"></label>' +
        '<div class="chips-scroll" role="group" aria-label="Category"><button type="button" class="fchip' + (!ob.cat ? ' is-on' : '') + '" data-action="ob-cat" data-cat="">Popular</button>' + cats.map(function (c) { return '<button type="button" class="fchip' + (ob.cat === c.id ? ' is-on' : '') + '" data-action="ob-cat" data-cat="' + c.id + '">' + U.esc(c.name) + '</button>'; }).join('') + '</div>' +
        '<div class="svc-grid svc-grid--ob" data-ob-grid>' + svcGrid() + '</div>' +
        '<div class="ob-picks" data-ob-picks>' + picksList() + '</div>' +
        '<div class="ob-nav ob-nav--sticky"><button type="button" class="btn btn--ghost" data-action="ob-back">' + U.icon('left', 18) + '<span>Back</span></button><button type="button" class="btn btn--primary" data-action="ob-next">' + (ob.order.length ? 'Continue with ' + ob.order.length : 'Skip for now') + U.icon('right', 18) + '</button></div>';
    }
    if (ob.step === 3) {
      return progress() + '<h1 class="ob-title ob-title--sm">Anything to renew?</h1><p class="ob-lead">Add expiry dates and we\u2019ll remind you in good time. Leave blank to skip.</p>' +
        '<ul class="ob-docs">' + QUICK_DOCS.map(function (id) {
          var t = L.docType(id);
          return '<li class="ob-doc"><span class="doc-mini__icon">' + U.icon(t.icon, 18) + '</span><label for="ob-doc-' + id + '" class="ob-doc__name">' + U.esc(t.name) + '<small>Reminder ' + t.lead + ' days before</small></label><input class="input input--sm" type="date" id="ob-doc-' + id + '" data-ob-doc="' + id + '" value="' + (ob.docs[id] || '') + '"></li>';
        }).join('') + '</ul>' +
        '<div class="ob-nav"><button type="button" class="btn btn--ghost" data-action="ob-back">' + U.icon('left', 18) + '<span>Back</span></button><button type="button" class="btn btn--primary" data-action="ob-finish">' + U.icon('check', 18) + '<span>Finish setup</span></button></div>';
    }
    // done
    var tot = LG.Finance.totals(LG.Store.state.items, V.today());
    return '<div class="ob-done"><span class="ob-done__badge">' + U.icon('check', 30) + '</span><h1 class="ob-title">You\u2019re all set' + (ob.name ? ', ' + U.esc(ob.name) : '') + '</h1>' +
      '<p class="ob-lead">' + (tot.count ? 'You\u2019re tracking ' + tot.count + ' item' + (tot.count > 1 ? 's' : '') + ' worth' : 'Add your first items any time from the dashboard.') + '</p>' +
      (tot.count ? '<div class="ob-done__total num" data-countup="' + tot.monthly.toFixed(2) + '" data-key="ob-total">' + U.money(tot.monthly) + '</div><p class="muted">a month \u00B7 <span class="num">' + U.money(tot.yearly) + '</span> a year</p>' : '') +
      '<div class="ob-choices ob-choices--row"><a class="btn btn--primary btn--lg" href="#/">Go to my dashboard' + U.icon('right', 18) + '</a>' + (LG.Notify.permission() === 'default' ? '<button type="button" class="btn btn--ghost btn--lg" data-action="enable-notify">' + U.icon('bell', 18) + '<span>Turn on reminders</span></button>' : '') + '</div></div>';
  }

  function logo(size) { return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="13" fill="var(--accent)"/><path d="M15 13v22h18" fill="none" stroke="#fff" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 27l4.5 4L35 20" fill="none" stroke="#fff" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/></svg>'; }

  function render() {
    if (!ob) reset();
    return '<div class="onboarding"><div class="ob-card ob-step-' + ob.step + '" data-ob-root>' + stepHTML() + '</div></div>';
  }

  function rerender() {
    var r = document.querySelector('[data-ob-root]');
    if (!r) return LG.App.render();
    r.className = 'ob-card ob-step-' + ob.step;
    r.innerHTML = stepHTML();
    r.classList.remove('ob-anim'); void r.offsetWidth; r.classList.add('ob-anim');
    U.countUp(r);
    var f = r.querySelector('h1');
    if (f) { f.setAttribute('tabindex', '-1'); f.focus({ preventScroll: true }); }
    window.scrollTo(0, 0);
  }

  function collectStep1() {
    var n = document.getElementById('f-ob-name'), c = document.getElementById('f-ob-currency'), i = document.getElementById('f-ob-income');
    if (!n) return true;
    var inc = i.value.trim();
    var form = document.querySelector('[data-ob-form]');
    if (inc !== '' && !(Number(inc) >= 0)) { LG.Sheets.setError(form, 'ob-income', 'Enter a positive number, or leave it blank.'); i.focus(); return false; }
    LG.Sheets.setError(form, 'ob-income', '');
    ob.name = n.value.trim(); ob.currency = c.value; ob.income = inc;
    LG.Store.state.settings.currency = ob.currency; // preview prices in the chosen currency
    U.clearFormatCache();
    return true;
  }

  function mount(el) {
    U.countUp(el);
    el.addEventListener('input', function (e) {
      if (e.target.matches('[data-ob-q]')) { ob.q = e.target.value.trim(); el.querySelector('[data-ob-grid]').innerHTML = svcGrid(); }
      var a = e.target.getAttribute('data-ob-amount');
      if (a && ob.picks[a]) {
        ob.picks[a].amount = e.target.value;
        var total = ob.order.reduce(function (s, id) { return s + D.monthlyEquivalent({ amount: Number(ob.picks[id].amount) || 0, cycle: L.service(id).cycle }); }, 0);
        var tEl = el.querySelector('[data-ob-total]'); if (tEl) tEl.textContent = U.money(total);
      }
    });
    el.addEventListener('change', function (e) {
      var d = e.target.getAttribute('data-ob-date');
      if (d && ob.picks[d] && D.isValid(e.target.value)) ob.picks[d].anchor = e.target.value;
      var doc = e.target.getAttribute('data-ob-doc');
      if (doc) { if (D.isValid(e.target.value)) ob.docs[doc] = e.target.value; else delete ob.docs[doc]; }
    });
  }

  LG.App.on('ob-start', function () { ob.step = 1; rerender(); });
  LG.App.on('ob-back', function () { if (ob.step === 1) collectStep1(); ob.step = Math.max(0, ob.step - 1); rerender(); });
  LG.App.on('ob-next', function () { if (ob.step === 1 && !collectStep1()) return; ob.step++; rerender(); });
  LG.App.on('ob-cat', function (el) {
    ob.cat = el.getAttribute('data-cat');
    U.$$('[data-action="ob-cat"]').forEach(function (b) { b.classList.toggle('is-on', b === el); });
    document.querySelector('[data-ob-grid]').innerHTML = svcGrid();
  });
  LG.App.on('ob-toggle', function (el) {
    var id = el.getAttribute('data-id'), s = L.service(id);
    if (ob.picks[id]) { delete ob.picks[id]; ob.order = ob.order.filter(function (x) { return x !== id; }); }
    else { ob.picks[id] = { amount: s.price, anchor: defaultDate(s) }; ob.order.push(id); }
    document.querySelector('[data-ob-grid]').innerHTML = svcGrid();
    document.querySelector('[data-ob-picks]').innerHTML = picksList();
    var next = document.querySelector('.ob-nav [data-action="ob-next"]');
    if (next) next.innerHTML = (ob.order.length ? 'Continue with ' + ob.order.length : 'Skip for now') + U.icon('right', 18);
  });
  function finish(skipAll) {
    var s = LG.Store.state;
    var items = skipAll ? [] : ob.order.map(function (id) {
      var svc = L.service(id), p = ob.picks[id];
      return { name: svc.name, serviceId: id, amount: Math.max(0, Number(p.amount) || 0), cycle: svc.cycle, anchor: D.isValid(p.anchor) ? p.anchor : defaultDate(svc), category: svc.category, createdAt: new Date().toISOString() };
    });
    var docs = skipAll ? [] : Object.keys(ob.docs).map(function (id) { var t = L.docType(id); return { type: id, name: t.name, expiry: ob.docs[id], lead: t.lead }; });
    var next = JSON.parse(JSON.stringify(s));
    next.settings = Object.assign({}, s.settings, { name: ob.name, currency: ob.currency, income: ob.income === '' ? null : Number(ob.income), onboarded: true, sample: false });
    next.items = s.items.concat(items);
    next.documents = s.documents.concat(docs);
    LG.Store.replace(next, { type: 'onboarded' });
  }
  LG.App.on('ob-finish', function () { finish(false); ob.step = 4; rerender(); });
  LG.App.on('ob-skip', function () { if (ob.step === 1) collectStep1(); finish(true); ob = null; location.hash = '#/'; });

  LG.Views.welcome = {
    title: 'Welcome', fullscreen: true, render: render, mount: mount,
    enter: function () { reset(); }
  };
  LG.Brand = { logo: logo };
})(typeof self !== 'undefined' ? self : this);
