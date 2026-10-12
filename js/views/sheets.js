/* Ledgerly - sheets: add/edit subscription, item detail, documents, notifications, shortcuts */
(function (root) {
  'use strict';
  var LG = root.LG, U = LG.U, D = LG.Dates, F = LG.Finance, L = LG.Library, V = LG.V, S = LG.Store, UI = LG.UI;

  var CYCLE_OPTS = [{ value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'yearly', label: 'Yearly' }, { value: 'custom', label: 'Custom' }];
  var REMIND_OPTS = [[0, 'On the day'], [1, '1 day before'], [2, '2 days before'], [3, '3 days before'], [7, '1 week before'], [14, '2 weeks before']];
  var LEAD_OPTS = [[7, '1 week before'], [14, '2 weeks before'], [28, '4 weeks before'], [30, '30 days before'], [60, '2 months before'], [90, '3 months before'], [120, '4 months before'], [180, '6 months before']];

  function field(o) {
    var id = 'f-' + o.name;
    var input;
    var common = ' id="' + id + '" name="' + o.name + '"' + (o.required ? ' required aria-required="true"' : '') + ' aria-describedby="' + id + '-err' + (o.hint ? ' ' + id + '-hint' : '') + '"';
    if (o.type === 'select') {
      input = '<select class="input"' + common + '>' + o.options.map(function (op) { return '<option value="' + U.esc(op[0]) + '"' + (String(op[0]) === String(o.value) ? ' selected' : '') + '>' + U.esc(op[1]) + '</option>'; }).join('') + '</select>';
    } else if (o.type === 'textarea') {
      input = '<textarea class="input" rows="3"' + common + ' placeholder="' + U.esc(o.placeholder || '') + '">' + U.esc(o.value || '') + '</textarea>';
    } else {
      input = '<input class="input" type="' + (o.type || 'text') + '"' + common + ' value="' + U.esc(o.value === undefined || o.value === null ? '' : o.value) + '"' +
        (o.placeholder ? ' placeholder="' + U.esc(o.placeholder) + '"' : '') + (o.attrs || '') + '>';
      if (o.prefix) input = '<div class="input-affix"><span class="input-affix__pre" aria-hidden="true">' + U.esc(o.prefix) + '</span>' + input + '</div>';
    }
    return '<div class="field' + (o.cls ? ' ' + o.cls : '') + '"' + (o.hidden ? ' hidden' : '') + ' data-field="' + o.name + '"><label class="field__label" for="' + id + '">' + o.label + (o.optional ? ' <span class="field__opt">optional</span>' : '') + '</label>' + input +
      (o.hint ? '<p class="field__hint" id="' + id + '-hint">' + o.hint + '</p>' : '') + '<p class="field__error" id="' + id + '-err" role="alert"></p></div>';
  }

  function toggle(name, label, checked, hint) {
    return '<label class="switch-row"><span class="switch-row__text"><span class="switch-row__label">' + label + '</span>' + (hint ? '<span class="switch-row__hint">' + hint + '</span>' : '') + '</span>' +
      '<input type="checkbox" class="switch" name="' + name + '" role="switch"' + (checked ? ' checked' : '') + '></label>';
  }

  function setError(form, name, msg) {
    var f = form.querySelector('[data-field="' + name + '"]');
    if (!f) return;
    var input = f.querySelector('input, select, textarea');
    f.classList.toggle('has-error', !!msg);
    f.querySelector('.field__error').textContent = msg || '';
    if (input) { if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); }
  }

  /* ---------------- library picker ---------------- */
  function pickerHTML(q, cat) {
    var ql = (q || '').toLowerCase();
    var list = L.SERVICES.filter(function (s) { return (!cat || s.category === cat) && (!ql || s.name.toLowerCase().indexOf(ql) >= 0 || L.category(s.category).name.toLowerCase().indexOf(ql) >= 0); });
    var custom = '<button type="button" class="svc svc--custom" data-pick="__custom">' + '<span class="tile tile--lg tile--plus">' + U.icon('plus', 22) + '</span><span class="svc__name">' + (q ? 'Add \u201C' + U.esc(q) + '\u201D' : 'Custom') + '</span><span class="svc__price">Anything else</span></button>';
    return custom + list.map(function (s) {
      return '<button type="button" class="svc" data-pick="' + s.id + '">' + U.tile({ serviceId: s.id, name: s.name }, 'lg') + '<span class="svc__name">' + U.esc(s.name) + '</span><span class="svc__price num">' + U.money(s.price) + '/' + D.cycleShort({ cycle: s.cycle }) + '</span></button>';
    }).join('');
  }

  function picker(sheet, onPick) {
    var cats = L.CATEGORIES.filter(function (c) { return L.SERVICES.some(function (s) { return s.category === c.id; }); });
    sheet.setBody('<div class="picker"><label class="search-field">' + U.icon('search', 18) + '<span class="sr-only">Search services</span><input type="search" class="input input--search" data-picker-q placeholder="Search ' + L.SERVICES.length + ' services, e.g. Netflix, council tax\u2026" autofocus autocomplete="off"></label>' +
      '<div class="chips-scroll" role="group" aria-label="Filter by category"><button type="button" class="fchip is-on" data-picker-cat="">All</button>' + cats.map(function (c) { return '<button type="button" class="fchip" data-picker-cat="' + c.id + '">' + U.esc(c.name) + '</button>'; }).join('') + '</div>' +
      '<div class="svc-grid" data-picker-grid>' + pickerHTML('', '') + '</div><p class="picker__note">' + U.icon('info', 16) + 'Prices are typical UK prices. You can edit everything on the next step.</p></div>');
    var el = sheet.el, q = '', cat = '';
    var input = el.querySelector('[data-picker-q]');
    setTimeout(function () { input.focus(); }, 80);
    function refresh() { el.querySelector('[data-picker-grid]').innerHTML = pickerHTML(q, cat); }
    input.addEventListener('input', function () { q = input.value.trim(); refresh(); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var first = el.querySelector('[data-pick]:not([data-pick="__custom"])'); onPick(first && q ? first.getAttribute('data-pick') : '__custom', q); } });
    el.querySelector('.picker').addEventListener('click', function (e) {
      var c = e.target.closest('[data-picker-cat]');
      if (c) { cat = c.getAttribute('data-picker-cat'); U.$$('[data-picker-cat]', el).forEach(function (b) { b.classList.toggle('is-on', b === c); b.setAttribute('aria-pressed', b === c); }); refresh(); return; }
      var p = e.target.closest('[data-pick]');
      if (p) onPick(p.getAttribute('data-pick'), q);
    });
  }

  /* ---------------- add / edit subscription ---------------- */
  function itemForm(opts) {
    opts = opts || {};
    var editing = opts.id ? S.item(opts.id) : null;
    var sheet = UI.sheet({ title: editing ? 'Edit ' + U.esc(editing.name) : 'Add a subscription or bill', className: 'sheet--form', body: '', footer: '' });
    sheet.el.setAttribute('data-sheet', 'item-form');
    if (editing || opts.prefill) renderForm(sheet, editing, opts.prefill || {});
    else picker(sheet, function (id, q) {
      if (id === '__custom') renderForm(sheet, null, { name: q || '' });
      else {
        var s = L.service(id);
        renderForm(sheet, null, { serviceId: s.id, name: s.name, amount: s.price, cycle: s.cycle, category: s.category });
      }
    });
    return sheet;
  }

  function renderForm(sheet, editing, pre) {
    var it = editing || {};
    var t = V.today();
    var svc = (pre.serviceId || it.serviceId) ? L.service(pre.serviceId || it.serviceId) : null;
    var val = function (k, d) { return pre[k] !== undefined ? pre[k] : it[k] !== undefined && it[k] !== null && it[k] !== '' ? it[k] : d; };
    var shownDue = editing ? (D.nextOccurrence(editing, t) || editing.anchor) : (pre.anchor || t);
    var category = val('category', svc ? svc.category : 'other');
    var trackDefault = it.trackUsage !== undefined ? it.trackUsage : L.category(category).track;
    var methods = {};
    ['Direct Debit', 'Debit card', 'Credit card', 'PayPal', 'Apple Pay', 'Google Pay', 'Apple ID'].forEach(function (m) { methods[m] = 1; });
    S.state.items.forEach(function (i) { if (i.method) methods[i.method] = 1; });
    var trialOn = !!val('trialEnd', '');
    var sym = U.currencySymbol();
    var html = '<form class="form" novalidate data-form="item">' +
      (!editing ? '<button type="button" class="link-btn back-btn" data-form-back>' + U.icon('left', 16) + 'Choose a different service</button>' : '') +
      '<div class="form-hero">' + '<span data-hero-tile>' + U.tile({ serviceId: svc ? svc.id : '', name: val('name', '') || '?' }, 'lg') + '</span><div><div class="form-hero__name" data-hero-name>' + U.esc(val('name', '') || 'New item') + '</div><div class="form-hero__sum num" data-summary></div></div></div>' +
      field({ name: 'name', label: 'Name', value: val('name', ''), required: true, placeholder: 'e.g. Netflix, Gym, Council Tax', attrs: ' maxlength="80" autocomplete="off"' }) +
      '<div class="grid-2">' +
      field({ name: 'amount', label: 'Amount', type: 'number', value: val('amount', ''), required: true, prefix: sym, attrs: ' inputmode="decimal" step="0.01" min="0" max="999999"', placeholder: '0.00' }) +
      field({ name: 'anchor', label: 'Next payment', type: 'date', value: shownDue, required: true }) +
      '</div>' +
      '<fieldset class="field"><legend class="field__label">How often</legend>' + V.segmented('cycle', CYCLE_OPTS, val('cycle', 'monthly'), { label: 'Billing cycle' }) + '</fieldset>' +
      '<div class="custom-row" data-custom' + (val('cycle', 'monthly') === 'custom' ? '' : ' hidden') + '><span>Every</span>' +
      field({ name: 'every', label: '<span class="sr-only">Repeat every</span>', type: 'number', value: val('every', 2), attrs: ' min="1" max="999" step="1" inputmode="numeric"', cls: 'field--inline' }) +
      field({ name: 'unit', label: '<span class="sr-only">Unit</span>', type: 'select', value: val('unit', 'week'), options: [['day', 'days'], ['week', 'weeks'], ['month', 'months'], ['year', 'years']], cls: 'field--inline' }) + '</div>' +
      '<div class="grid-2">' +
      field({ name: 'category', label: 'Category', type: 'select', value: category, options: L.CATEGORIES.map(function (c) { return [c.id, c.name]; }) }) +
      field({ name: 'method', label: 'Paid with', value: val('method', ''), optional: true, placeholder: 'e.g. Visa \u2022\u2022 4242', attrs: ' list="methods-list" maxlength="60" autocomplete="off"' }) +
      '</div><datalist id="methods-list">' + Object.keys(methods).map(function (m) { return '<option value="' + U.esc(m) + '">'; }).join('') + '</datalist>' +
      '<div class="form-group">' + toggle('trial', 'Free trial', trialOn, 'We\u2019ll warn you before the first charge') +
      field({ name: 'trialEnd', label: 'Trial ends', type: 'date', value: val('trialEnd', ''), hidden: !trialOn, hint: 'Your first payment is taken on this date.' }) + '</div>' +
      '<div class="grid-2">' +
      field({ name: 'cancelBy', label: 'Cancel-by reminder', type: 'date', value: val('cancelBy', ''), optional: true, hint: 'Handy for contracts and trials.' }) +
      field({ name: 'remindDays', label: 'Remind me', type: 'select', value: it.remindDays === null || it.remindDays === undefined ? 'default' : it.remindDays, options: [['default', 'Default (' + S.state.settings.remindDays + ' days before)']].concat(REMIND_OPTS) }) +
      '</div>' +
      (editing ? '<fieldset class="field"><legend class="field__label">Status</legend>' + V.segmented('status', [{ value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }, { value: 'cancelled', label: 'Cancelled' }], it.status || 'active', { label: 'Status' }) + '</fieldset>' : '') +
      (editing ? '<div class="price-change" data-price-change hidden><label class="check"><input type="checkbox" name="recordPrice" checked> <span>Record this as a price change</span></label>' +
        field({ name: 'priceDate', label: 'Changed on', type: 'date', value: t, cls: 'field--compact' }) + '<p class="price-change__pct" data-pct></p></div>' : '') +
      '<div class="form-group">' + toggle('trackUsage', 'Monthly usage check-ins', trackDefault, 'A quick \u201Cdid you use it?\u201D to spot waste') + '</div>' +
      field({ name: 'notes', label: 'Notes', type: 'textarea', value: val('notes', ''), optional: true, placeholder: 'Contract end date, account email, who it\u2019s shared with\u2026' }) +
      '<button type="submit" hidden></button></form>';
    sheet.setBody(html);
    var foot = sheet.el.querySelector('.sheet__foot');
    if (!foot) { foot = document.createElement('footer'); foot.className = 'sheet__foot'; sheet.el.appendChild(foot); }
    foot.innerHTML = '<button type="button" class="btn btn--ghost" data-ov-close>Cancel</button><button type="button" class="btn btn--primary" data-form-save>' + U.icon('check', 18) + '<span>' + (editing ? 'Save changes' : 'Add to Ledgerly') + '</span></button>';
    foot.querySelector('[data-ov-close]').addEventListener('click', function () { sheet.close(); });

    var form = sheet.el.querySelector('form');
    var titleEl = sheet.el.querySelector('.sheet__title');
    if (!editing && titleEl) titleEl.textContent = svc ? 'Add ' + svc.name : 'Add a custom item';

    function data() {
      var fd = new FormData(form);
      return {
        name: (fd.get('name') || '').trim(), amount: fd.get('amount'), anchor: fd.get('anchor'), cycle: fd.get('cycle'),
        every: fd.get('every'), unit: fd.get('unit'), category: fd.get('category'), method: (fd.get('method') || '').trim(),
        trial: form.trial.checked, trialEnd: fd.get('trialEnd'), cancelBy: fd.get('cancelBy'), remindDays: fd.get('remindDays'),
        status: fd.get('status') || (editing ? editing.status : 'active'), trackUsage: form.trackUsage.checked, notes: (fd.get('notes') || '').trim(),
        recordPrice: form.recordPrice ? form.recordPrice.checked : false, priceDate: fd.get('priceDate')
      };
    }
    function summary() {
      var d = data();
      var amt = Number(d.amount);
      var probe = { amount: isFinite(amt) ? amt : 0, cycle: d.cycle, every: d.every, unit: d.unit };
      var sumEl = sheet.el.querySelector('[data-summary]');
      sumEl.textContent = amt > 0 ? '\u2248 ' + U.money(D.monthlyEquivalent(probe)) + '/mo \u00B7 ' + U.money(D.yearlyEquivalent(probe)) + '/yr' : 'Enter an amount to see the monthly & yearly cost';
      sheet.el.querySelector('[data-hero-name]').textContent = d.name || 'New item';
      sheet.el.querySelector('[data-hero-tile]').innerHTML = U.tile({ serviceId: svc && d.name === svc.name ? svc.id : (svc ? svc.id : ''), name: d.name || '?' }, 'lg');
      sheet.el.querySelector('[data-custom]').hidden = d.cycle !== 'custom';
      if (editing) {
        var box = sheet.el.querySelector('[data-price-change]');
        var changed = isFinite(amt) && d.amount !== '' && Math.round(amt * 100) !== Math.round(editing.amount * 100);
        box.hidden = !changed;
        if (changed && editing.amount > 0) {
          var pct = ((amt - editing.amount) / editing.amount) * 100;
          sheet.el.querySelector('[data-pct]').innerHTML = U.money(editing.amount) + ' \u2192 ' + U.money(amt) + ' <strong class="' + (pct > 0 ? 'is-up' : 'is-down') + '">' + (pct > 0 ? '+' : '') + pct.toFixed(1) + '%</strong>';
        }
      }
    }
    function validate(showAll) {
      var d = data(), errs = {};
      if (!d.name) errs.name = 'Give it a name.';
      var amt = Number(d.amount);
      if (d.amount === '' || d.amount === null) errs.amount = 'Enter an amount.';
      else if (!isFinite(amt) || amt < 0) errs.amount = 'Amount must be zero or more.';
      else if (amt > 999999) errs.amount = 'That looks too large.';
      if (!D.isValid(d.anchor)) errs.anchor = 'Pick the next payment date.';
      if (d.cycle === 'custom') { var e = Number(d.every); if (!(e >= 1 && e <= 999 && Math.floor(e) === e)) errs.every = 'Use a whole number from 1 to 999.'; }
      if (d.trial && !D.isValid(d.trialEnd)) errs.trialEnd = 'When does the trial end?';
      if (d.cancelBy && !D.isValid(d.cancelBy)) errs.cancelBy = 'Enter a valid date.';
      if (editing && d.recordPrice && !sheet.el.querySelector('[data-price-change]').hidden && !D.isValid(d.priceDate)) errs.priceDate = 'When did the price change?';
      ['name', 'amount', 'anchor', 'every', 'trialEnd', 'cancelBy', 'priceDate'].forEach(function (k) { if (showAll || form.querySelector('[data-field="' + k + '"].has-error')) setError(form, k, errs[k]); });
      return errs;
    }
    form.addEventListener('input', function (e) {
      if (e.target.name === 'name' && !editing && svc && e.target.value.trim() !== svc.name) { /* custom rename keeps service link for logo/cancel help */ }
      summary(); validate(false);
    });
    form.addEventListener('change', function (e) {
      if (e.target.name === 'trial') {
        var on = e.target.checked;
        form.querySelector('[data-field="trialEnd"]').hidden = !on;
        if (on && !form.trialEnd.value) { form.trialEnd.value = D.addDays(V.today(), 7); }
        if (on && form.trialEnd.value) form.anchor.value = form.trialEnd.value;
        if (on) form.trialEnd.focus();
      }
      if (e.target.name === 'trialEnd' && D.isValid(e.target.value)) {
        form.anchor.value = e.target.value;
        if (!form.cancelBy.value) form.cancelBy.value = D.addDays(e.target.value, -1);
      }
      if (e.target.name === 'category' && it.trackUsage === undefined) form.trackUsage.checked = L.category(e.target.value).track;
      summary();
    });
    var back = sheet.el.querySelector('[data-form-back]');
    if (back) back.addEventListener('click', function () {
      foot.innerHTML = '';
      if (titleEl) titleEl.textContent = 'Add a subscription or bill';
      picker(sheet, function (id, q) {
        if (id === '__custom') renderForm(sheet, null, { name: q || '' });
        else { var s = L.service(id); renderForm(sheet, null, { serviceId: s.id, name: s.name, amount: s.price, cycle: s.cycle, category: s.category }); }
      });
    });
    function save() {
      var errs = validate(true);
      var keys = Object.keys(errs);
      if (keys.length) {
        var first = form.querySelector('[data-field="' + keys[0] + '"] input, [data-field="' + keys[0] + '"] select');
        if (first) first.focus();
        UI.toast('Please fix the highlighted field' + (keys.length > 1 ? 's' : ''), { tone: 'error' });
        return;
      }
      var d = data();
      var payload = {
        name: d.name, serviceId: svc ? svc.id : '', amount: Number(d.amount), cycle: d.cycle, every: d.every, unit: d.unit,
        category: d.category, method: d.method, trialEnd: d.trial ? d.trialEnd : '', cancelBy: d.cancelBy || '',
        remindDays: d.remindDays === 'default' ? null : Number(d.remindDays), status: d.status, trackUsage: d.trackUsage, notes: d.notes
      };
      if (editing) {
        payload.anchor = d.anchor === shownDue ? editing.anchor : d.anchor;
        S.updateItem(editing.id, payload, { recordPrice: d.recordPrice, priceDate: d.priceDate });
        sheet.close();
        UI.toast(d.name + ' saved');
      } else {
        payload.anchor = d.anchor;
        var added = S.addItem(payload);
        LG.App.flash(added.id);
        sheet.close();
        UI.toast(d.name + ' added', { action: { label: 'View', fn: function () { itemDetail(added.id); } } });
      }
    }
    foot.querySelector('[data-form-save]').addEventListener('click', save);
    form.addEventListener('submit', function (e) { e.preventDefault(); save(); });
    summary();
    setTimeout(function () { var n = form.querySelector(editing || !pre.name ? '#f-name' : '#f-amount'); if (n) n.focus(); }, 80);
  }

  /* ---------------- item detail ---------------- */
  function itemDetail(id) {
    var sheet = UI.sheet({ title: '', className: 'sheet--detail', body: '' });
    sheet.el.setAttribute('data-sheet', 'item-detail');
    function render() {
      var it = S.item(id);
      if (!it) { sheet.close(); return; }
      var t = V.today();
      var svc = it.serviceId ? L.service(it.serviceId) : null;
      var next = D.nextOccurrence(it, t);
      var upcoming = it.status === 'active' ? D.nextOccurrences(it, t, 5) : [];
      var ch = F.lastPriceChange(it);
      sheet.el.querySelector('.sheet__title').innerHTML = U.esc(it.name);
      var hist = it.priceHistory.slice().map(function (p, i) { return { p: p, i: i }; }).sort(function (a, b) { return a.p.date < b.p.date ? 1 : -1; });
      var months = [];
      for (var k = 5; k >= 0; k--) months.push(D.addMonthKey(D.monthKey(t), -k));
      var maxUse = Math.max.apply(null, months.map(function (m) { return it.usage[m] || 0; }).concat([4]));
      var ciMonth = LG.Insights.checkinMonth(t);
      var cpu = LG.Insights.costPerUse(it, ciMonth);
      var html = '<div class="detail">' +
        '<div class="detail__hero">' + U.tile(it, 'xl') + '<div class="detail__hero-main"><div class="detail__amount num">' + U.money(it.amount) + '<span>/' + U.esc(D.cycleShort(it) || D.cycleLabel(it)) + '</span></div>' +
        '<div class="detail__meta">' + V.catChip(it.category) + ' ' + V.itemStatusChip(it) + (it.method ? ' <span class="muted">\u00B7 ' + U.esc(it.method) + '</span>' : '') + '</div></div></div>' +
        '<div class="stat-row"><div class="stat"><span class="stat__label">Per month</span><span class="stat__value num">' + U.money(D.monthlyEquivalent(it)) + '</span></div>' +
        '<div class="stat"><span class="stat__label">Per year</span><span class="stat__value num">' + U.money(D.yearlyEquivalent(it)) + '</span></div>' +
        '<div class="stat"><span class="stat__label">Next payment</span><span class="stat__value">' + (it.status !== 'active' ? '\u2014' : next ? U.esc(D.formatDate(next, { year: false })) + '<small>' + U.esc(D.relative(next, t)) + '</small>' : 'Ended') + '</span></div></div>' +
        (it.trialEnd && it.trialEnd >= t ? '<div class="callout callout--info">' + U.icon('gift', 18) + '<div><strong>Free trial ends ' + U.esc(D.relative(it.trialEnd, t)) + '</strong><p>First charge of ' + U.money(it.amount) + ' on ' + U.esc(D.formatDate(it.trialEnd, { weekday: true })) + (it.cancelBy ? '. Cancel by ' + U.esc(D.formatDate(it.cancelBy, { weekday: true })) : '') + '.</p></div></div>' : '') +
        (it.cancelBy && !(it.trialEnd && it.trialEnd >= t) && it.cancelBy >= t ? '<div class="callout callout--warn">' + U.icon('clock', 18) + '<div><strong>Cancel by ' + U.esc(D.formatDate(it.cancelBy, { weekday: true })) + '</strong><p>That\u2019s ' + U.esc(D.relative(it.cancelBy, t)) + '.</p></div></div>' : '') +
        (upcoming.length ? '<section class="detail__sec"><h3>Upcoming payments</h3><ul class="date-list">' + upcoming.map(function (d) { return '<li><span>' + U.esc(D.formatDate(d, { weekday: true })) + '</span><span class="num">' + U.money(it.amount) + '</span></li>'; }).join('') + '</ul></section>' : '') +
        '<section class="detail__sec"><div class="sec-head"><h3>Price history</h3><button type="button" class="link-btn" data-d="log-price">' + U.icon('plus', 16) + 'Log a price change</button></div>' +
        '<div data-log-price hidden class="inline-form"><div class="grid-2">' + field({ name: 'newPrice', label: 'New price', type: 'number', value: it.amount, prefix: U.currencySymbol(), attrs: ' step="0.01" min="0" inputmode="decimal"' }) + field({ name: 'newPriceDate', label: 'From', type: 'date', value: t }) + '</div><div class="inline-form__actions"><button type="button" class="btn btn--ghost btn--sm" data-d="log-cancel">Cancel</button><button type="button" class="btn btn--primary btn--sm" data-d="log-save">Save price</button></div></div>' +
        (hist.length ? '<ul class="price-list">' + hist.map(function (h) {
          var pct = h.p.from > 0 ? ((h.p.to - h.p.from) / h.p.from) * 100 : 0;
          return '<li><span class="price-list__date">' + U.esc(D.formatDate(h.p.date)) + '</span><span class="num">' + U.money(h.p.from) + ' \u2192 ' + U.money(h.p.to) + '</span><span class="pct ' + (pct > 0 ? 'is-up' : 'is-down') + '">' + U.icon(pct > 0 ? 'arrowUp' : 'down', 14) + Math.abs(pct).toFixed(1) + '%</span><button type="button" class="icon-btn icon-btn--sm" data-d="del-price" data-i="' + h.i + '" aria-label="Remove price change from ' + U.esc(D.formatDate(h.p.date)) + '">' + U.icon('x', 14) + '</button></li>';
        }).join('') + '</ul>' + (ch && ch.to > ch.from ? '<p class="muted small">Latest rise costs you ' + U.money(ch.yearlyDelta) + ' more a year.</p>' : '') : '<p class="muted small">No price changes recorded. When the price goes up, edit the amount or log it here and Ledgerly will track the % increase.</p>') + '</section>' +
        (LG.Insights.trackable(it) && it.status === 'active' ? '<section class="detail__sec"><h3>Usage</h3><p class="muted small">Did you use it in ' + U.esc(D.MONTHS_LONG[+ciMonth.slice(5, 7) - 1]) + '?</p><div class="usage-btns">' + LG.Insights.USAGE_OPTIONS.map(function (o) {
          return '<button type="button" class="fchip' + (it.usage[ciMonth] === o.value ? ' is-on' : '') + '" data-d="usage" data-v="' + o.value + '" aria-pressed="' + (it.usage[ciMonth] === o.value) + '">' + U.esc(o.label) + '</button>';
        }).join('') + '</div><div class="usage-bars" aria-label="Usage over the last 6 months">' + months.map(function (m) {
          var v = it.usage[m]; var h = v === undefined ? 0 : Math.max(6, (v / maxUse) * 100);
          return '<div class="usage-bar' + (v === undefined ? ' is-empty' : v === 0 ? ' is-zero' : '') + '" title="' + U.esc(D.formatMonth(m) + ': ' + (v === undefined ? 'no check-in' : v + ' uses')) + '"><span style="height:' + h + '%"></span><small>' + U.esc(D.MONTHS_SHORT[+m.slice(5, 7) - 1].charAt(0)) + '</small></div>';
        }).join('') + '</div>' + (cpu !== null ? '<p class="small ' + (cpu === Infinity || cpu >= 5 ? 'text-warn' : 'muted') + '">' + (cpu === Infinity ? 'Not used this month \u2014 that\u2019s ' + U.money(D.monthlyEquivalent(it)) + ' for nothing.' : 'About ' + U.money(cpu) + ' per use.') + '</p>' : '') + '</section>' : '') +
        '<section class="detail__sec cancel-help"><h3>How to cancel</h3><p>' + U.esc(svc && svc.cancelNote ? svc.cancelNote : 'Check the provider\u2019s website or app under Account or Billing. For Direct Debits you can also cancel in your banking app (the Direct Debit Guarantee protects you).') + '</p>' +
        '<div class="cancel-help__actions">' + (svc && svc.cancelUrl ? '<a class="btn btn--ghost btn--sm" href="' + U.esc(svc.cancelUrl) + '" target="_blank" rel="noopener noreferrer">' + U.icon('external', 16) + '<span>Open ' + U.esc(new URL(svc.cancelUrl).hostname.replace(/^www\./, '')) + '</span></a>' : '') +
        (it.status !== 'cancelled' ? '<button type="button" class="btn btn--ghost btn--sm" data-d="mark-cancelled">' + U.icon('ban', 16) + '<span>Mark as cancelled</span></button>' : '<button type="button" class="btn btn--ghost btn--sm" data-d="reactivate">' + U.icon('refresh', 16) + '<span>Reactivate</span></button>') + '</div></section>' +
        (it.notes ? '<section class="detail__sec"><h3>Notes</h3><p class="notes">' + U.esc(it.notes) + '</p></section>' : '') +
        '</div>';
      var body = sheet.el.querySelector('.sheet__body');
      var scroll = body.scrollTop;
      sheet.setBody(html);
      body.scrollTop = scroll;
    }
    var foot = document.createElement('footer');
    foot.className = 'sheet__foot';
    foot.innerHTML = '<button type="button" class="btn btn--danger-ghost" data-d="delete">' + U.icon('trash', 18) + '<span>Delete</span></button><button type="button" class="btn btn--primary" data-d="edit">' + U.icon('edit', 18) + '<span>Edit</span></button>';
    sheet.el.appendChild(foot);
    render();
    var unsub = S.subscribe(function () { if (!sheet.closed) render(); });
    var origClose = sheet.close;
    sheet.close = function (r) { unsub(); origClose(r); };
    sheet.el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-d]'); if (!b) return;
      var it = S.item(id); if (!it) return;
      var act = b.getAttribute('data-d');
      if (act === 'edit') { sheet.close(); setTimeout(function () { itemForm({ id: id }); }, 120); }
      else if (act === 'delete') { sheet.close(); LG.App.deleteItem(id); }
      else if (act === 'usage') { S.setUsage(id, LG.Insights.checkinMonth(V.today()), +b.getAttribute('data-v')); UI.toast('Thanks \u2014 usage noted'); }
      else if (act === 'mark-cancelled') { S.updateItem(id, { status: 'cancelled' }); UI.toast(it.name + ' marked as cancelled \u2014 saving ' + U.money(D.yearlyEquivalent(it)) + '/yr', { icon: 'sparkle', action: { label: 'Undo', icon: 'undo', fn: function () { S.updateItem(id, { status: 'active' }); } } }); }
      else if (act === 'reactivate') { S.updateItem(id, { status: 'active' }); UI.toast(it.name + ' is active again'); }
      else if (act === 'log-price') { var box = sheet.el.querySelector('[data-log-price]'); box.hidden = false; box.querySelector('input').focus(); }
      else if (act === 'log-cancel') { sheet.el.querySelector('[data-log-price]').hidden = true; }
      else if (act === 'log-save') {
        var box2 = sheet.el.querySelector('[data-log-price]');
        var v = Number(box2.querySelector('[name=newPrice]').value), dt = box2.querySelector('[name=newPriceDate]').value;
        var ok = true;
        if (!(v >= 0) || box2.querySelector('[name=newPrice]').value === '') { setError(box2, 'newPrice', 'Enter the new price.'); ok = false; } else setError(box2, 'newPrice', '');
        if (!D.isValid(dt)) { setError(box2, 'newPriceDate', 'Pick a date.'); ok = false; } else setError(box2, 'newPriceDate', '');
        if (!ok) return;
        if (Math.round(v * 100) === Math.round(it.amount * 100)) { setError(box2, 'newPrice', 'That\u2019s the current price.'); return; }
        S.logPrice(id, v, dt);
        UI.toast('Price change recorded');
      }
      else if (act === 'del-price') { S.removePriceEntry(id, +b.getAttribute('data-i')); }
    });
    return sheet;
  }

  /* ---------------- documents ---------------- */
  function docForm(opts) {
    opts = opts || {};
    var editing = opts.id ? S.doc(opts.id) : null;
    var pre = opts.prefill || {};
    var d = editing || {};
    var typeId = pre.type || d.type || 'passport';
    var type = L.docType(typeId);
    var sheet = UI.sheet({
      title: editing ? 'Edit ' + U.esc(editing.name) : 'Add a document or renewal', className: 'sheet--form',
      body: '<form class="form" novalidate data-form="doc">' +
        '<fieldset class="field"><legend class="field__label">Type</legend><div class="doc-types" role="radiogroup" aria-label="Document type">' + L.DOC_TYPES.map(function (t) {
          return '<label class="doc-type"><input type="radio" name="type" value="' + t.id + '"' + (t.id === typeId ? ' checked' : '') + '><span>' + U.icon(t.icon, 18) + U.esc(t.name) + '</span></label>';
        }).join('') + '</div></fieldset>' +
        field({ name: 'name', label: 'Label', value: pre.name || d.name || type.name, required: true, attrs: ' maxlength="80" autocomplete="off"', hint: 'e.g. \u201CMOT \u2014 Ford Fiesta\u201D or \u201CSam\u2019s passport\u201D' }) +
        '<div class="grid-2">' + field({ name: 'expiry', label: 'Expiry / renewal date', type: 'date', value: pre.expiry || d.expiry || '', required: true }) +
        field({ name: 'lead', label: 'Remind me', type: 'select', value: d.lead !== undefined ? d.lead : type.lead, options: LEAD_OPTS.concat(LEAD_OPTS.some(function (o) { return o[0] === (d.lead !== undefined ? d.lead : type.lead); }) ? [] : [[d.lead !== undefined ? d.lead : type.lead, (d.lead !== undefined ? d.lead : type.lead) + ' days before']]) }) + '</div>' +
        '<p class="type-tip" data-tip>' + (type.tip ? U.icon('info', 16) + U.esc(type.tip) : '') + '</p>' +
        field({ name: 'ref', label: 'Reference', value: d.ref || '', optional: true, attrs: ' maxlength="40" autocomplete="off"', hint: U.icon('lock', 14) + ' Store only the last few characters \u2014 never full passport or licence numbers.' }) +
        field({ name: 'url', label: 'Renewal link', type: 'url', value: d.url || type.url || '', optional: true, placeholder: 'https://', attrs: ' inputmode="url"' }) +
        field({ name: 'notes', label: 'Notes', type: 'textarea', value: d.notes || '', optional: true }) +
        '<button type="submit" hidden></button></form>',
      footer: (editing ? '<button type="button" class="btn btn--danger-ghost" data-doc="delete">' + U.icon('trash', 18) + '<span>Delete</span></button>' : '<button type="button" class="btn btn--ghost" data-ov-close>Cancel</button>') +
        '<button type="button" class="btn btn--primary" data-doc="save">' + U.icon('check', 18) + '<span>' + (editing ? 'Save changes' : 'Add renewal') + '</span></button>'
    });
    sheet.el.setAttribute('data-sheet', 'doc-form');
    var form = sheet.el.querySelector('form');
    var nameTouched = !!editing || !!pre.name;
    form.name.addEventListener('input', function () { nameTouched = true; });
    form.addEventListener('change', function (e) {
      if (e.target.name === 'type') {
        var t = L.docType(e.target.value);
        if (!nameTouched) form.name.value = t.name;
        if (!editing) {
          var sel = form.lead;
          if (!U.$$('option', sel).some(function (o) { return +o.value === t.lead; })) sel.insertAdjacentHTML('beforeend', '<option value="' + t.lead + '">' + t.lead + ' days before</option>');
          sel.value = String(t.lead);
          form.url.value = t.url || '';
        }
        sheet.el.querySelector('[data-tip]').innerHTML = t.tip ? U.icon('info', 16) + U.esc(t.tip) : '';
      }
    });
    function save() {
      var fd = new FormData(form);
      var errs = {};
      var name = (fd.get('name') || '').trim();
      if (!name) errs.name = 'Give it a label.';
      if (!D.isValid(fd.get('expiry'))) errs.expiry = 'Pick the expiry date.';
      var url = (fd.get('url') || '').trim();
      if (url && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(url)) errs.url = 'Enter a full link starting with https://';
      ['name', 'expiry', 'url'].forEach(function (k) { setError(form, k, errs[k]); });
      var keys = Object.keys(errs);
      if (keys.length) { var f = form.querySelector('[name=' + keys[0] + ']'); if (f) f.focus(); return; }
      var payload = { type: fd.get('type'), name: name, expiry: fd.get('expiry'), lead: Number(fd.get('lead')), ref: (fd.get('ref') || '').trim(), url: url, notes: (fd.get('notes') || '').trim() };
      if (editing) { S.updateDoc(editing.id, payload); UI.toast(name + ' saved'); }
      else { var added = S.addDoc(payload); LG.App.flash(added.id); UI.toast(name + ' added'); }
      sheet.close();
    }
    sheet.el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-doc]'); if (!b) return;
      if (b.getAttribute('data-doc') === 'save') save();
      if (b.getAttribute('data-doc') === 'delete') { sheet.close(); LG.App.deleteDoc(editing.id); }
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); save(); });
    return sheet;
  }

  /** "Renewed" flow: bump the expiry date by the type's usual period */
  function renewDoc(id) {
    var doc = S.doc(id); if (!doc) return;
    var type = L.docType(doc.type);
    var base = doc.expiry < V.today() ? V.today() : doc.expiry;
    var suggested = type.renew ? D.addMonths(base, type.renew) : D.addYears(base, 1);
    UI.confirm({
      title: 'Renewed ' + doc.name + '?',
      body: 'Great! Set the new expiry date and Ledgerly will remind you next time.',
      extra: '<div class="field"><label class="field__label" for="renew-date">New expiry date</label><input id="renew-date" class="input" type="date" value="' + suggested + '"></div>',
      confirmLabel: 'Update date',
      collect: function (el) { return el.querySelector('#renew-date').value; }
    }).then(function (val) {
      if (!val) return;
      if (!D.isValid(val)) { UI.toast('That date isn\u2019t valid', { tone: 'error' }); return; }
      var prev = doc.expiry;
      S.updateDoc(id, { expiry: val });
      UI.toast(doc.name + ' renewed until ' + D.formatDate(val), { action: { label: 'Undo', icon: 'undo', fn: function () { S.updateDoc(id, { expiry: prev }); } } });
    });
  }

  /* ---------------- notifications ---------------- */
  function notifications() {
    var sheet = UI.sheet({ title: 'Reminders', subtitle: 'Bills, trials and renewals coming up', className: 'sheet--notif', body: '' });
    sheet.el.setAttribute('data-sheet', 'notifications');
    function render() {
      var st = S.state, t = V.today();
      var list = LG.Notify.compute(st, t);
      var perm = LG.Notify.permission();
      var permCard = '';
      if (perm === 'unsupported') permCard = '<div class="callout">' + U.icon('info', 18) + '<div><strong>System notifications aren\u2019t available here</strong><p>You\u2019ll still see reminders in this list. For alerts on your phone, export your calendar from Settings.</p></div></div>';
      else if (!st.settings.notify || perm !== 'granted') permCard = '<div class="callout callout--accent">' + U.icon('bell', 18) + '<div><strong>Want a nudge before bills?</strong><p>' + (perm === 'denied' ? 'Notifications are blocked for this page. You can allow them in your browser\u2019s site settings.' : 'Ledgerly can show a notification when something is due. We\u2019ll only ask once, and you can turn it off any time.') + '</p>' + (perm !== 'denied' ? '<button type="button" class="btn btn--primary btn--sm" data-n="enable">Turn on notifications</button>' : '') + '</div></div>';
      var html = permCard + (list.length ? '<div class="notif-actions"><button type="button" class="link-btn" data-n="read-all">' + U.icon('check', 16) + 'Mark all as read</button></div><ul class="notif-list">' + list.map(function (n) {
        var unread = !st.notif.read[n.key];
        return '<li><button type="button" class="notif' + (unread ? ' is-unread' : '') + ' notif--' + n.severity + '" data-n="open" data-key="' + U.esc(n.key) + '" data-item="' + U.esc(n.itemId || '') + '" data-doc="' + U.esc(n.docId || '') + '">' +
          '<span class="notif__icon">' + U.icon(n.kind === 'doc' ? 'shield' : n.kind === 'trial' ? 'gift' : n.kind === 'cancel' ? 'ban' : 'clock', 18) + '</span><span class="notif__text"><strong>' + U.esc(n.title) + '</strong><span>' + U.esc(n.body) + '</span></span>' + (unread ? '<span class="dot" aria-label="Unread"></span>' : '') + '</button></li>';
      }).join('') + '</ul>' : V.empty({ icon: 'check', title: 'You\u2019re all caught up', body: 'Nothing is due in the next few days. We\u2019ll list reminders here as dates get close.', compact: true })) +
        '<p class="muted small notif-foot">' + U.icon('info', 14) + ' Reminders appear when Ledgerly is open. To get alerts even when it\u2019s closed, <button type="button" class="link-btn" data-n="ics">add everything to your calendar (.ics)</button>.</p>';
      sheet.setBody(html);
    }
    render();
    var unsub = S.subscribe(function () { if (!sheet.closed) render(); });
    var oc = sheet.close; sheet.close = function (r) { unsub(); oc(r); };
    sheet.el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-n]'); if (!b) return;
      var a = b.getAttribute('data-n');
      if (a === 'enable') LG.App.enableNotifications();
      else if (a === 'read-all') { S.markRead(LG.Notify.compute(S.state, V.today()).map(function (n) { return n.key; })); }
      else if (a === 'ics') { LG.App.exportICS(); }
      else if (a === 'open') {
        S.markRead([b.getAttribute('data-key')]);
        var item = b.getAttribute('data-item'), doc = b.getAttribute('data-doc');
        sheet.close();
        setTimeout(function () { if (item) itemDetail(item); else if (doc) { location.hash = '#/documents'; setTimeout(function () { docForm({ id: doc }); }, 150); } }, 140);
      }
    });
    return sheet;
  }

  function shortcuts() {
    var rows = [['Ctrl/\u2318 K', 'Command palette: search, add, jump'], ['N', 'Add a subscription or bill'], ['R', 'Add a document / renewal'], ['/', 'Search on this page'],
      ['1 \u2013 6', 'Dashboard, Bills, Calendar, Renewals, Insights, Settings'], ['T', 'Toggle dark mode'], ['B', 'Open reminders'], ['?', 'Show this help'], ['Esc', 'Close sheets and dialogs']];
    return UI.dialog({ title: 'Keyboard shortcuts', body: '<dl class="kbd-list">' + rows.map(function (r) { return '<div><dt><kbd>' + U.esc(r[0]) + '</kbd></dt><dd>' + U.esc(r[1]) + '</dd></div>'; }).join('') + '</dl>', footer: '<button type="button" class="btn btn--primary" data-ov-close>Got it</button>' });
  }

  LG.Sheets = { itemForm: itemForm, itemDetail: itemDetail, docForm: docForm, renewDoc: renewDoc, notifications: notifications, shortcuts: shortcuts, field: field, toggle: toggle, setError: setError };
})(typeof self !== 'undefined' ? self : this);
