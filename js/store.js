/*
 * Ledgerly - local-first store. Everything lives in this browser's localStorage under one key.
 * Nothing is ever sent anywhere. Falls back to in-memory storage if localStorage is blocked.
 */
(function (root) {
  'use strict';
  var LG = root.LG;
  var D = LG.Dates;
  var KEY = 'ledgerly:v1';
  var VERSION = 1;
  var listeners = [];
  var persistent = true;

  function defaults() {
    return {
      app: 'ledgerly', version: VERSION,
      settings: { name: '', currency: 'GBP', income: null, theme: 'system', remindDays: 3, notify: false, onboarded: false, createdAt: new Date().toISOString() },
      items: [], documents: [], dismissedInsights: {},
      notif: { read: {}, notified: {} }
    };
  }

  function num(v, fallback) { var n = Number(v); return isFinite(n) ? n : fallback; }
  function str(v, max) { return v === undefined || v === null ? '' : String(v).slice(0, max || 500); }
  function date(v) { return D.isValid(v) ? v : ''; }

  function cleanItem(it) {
    if (!it || typeof it !== 'object') return null;
    var cycles = ['weekly', 'monthly', 'quarterly', 'yearly', 'custom'];
    var out = {
      id: str(it.id, 40) || LG.U.uid(),
      name: str(it.name, 80).trim() || 'Untitled',
      serviceId: it.serviceId && LG.Library.service(it.serviceId) ? it.serviceId : '',
      amount: Math.max(0, Math.round(num(it.amount, 0) * 100) / 100),
      cycle: cycles.indexOf(it.cycle) >= 0 ? it.cycle : 'monthly',
      every: Math.max(1, Math.min(999, Math.floor(num(it.every, 1)))),
      unit: ['day', 'week', 'month', 'year'].indexOf(it.unit) >= 0 ? it.unit : 'month',
      anchor: date(it.anchor) || D.today(),
      endDate: date(it.endDate),
      category: LG.Library.CATEGORIES.some(function (c) { return c.id === it.category; }) ? it.category : 'other',
      method: str(it.method, 60), notes: str(it.notes, 2000),
      trialEnd: date(it.trialEnd), cancelBy: date(it.cancelBy),
      remindDays: it.remindDays === '' || it.remindDays === null || it.remindDays === undefined ? null : Math.max(0, Math.min(60, Math.floor(num(it.remindDays, 3)))),
      status: ['active', 'paused', 'cancelled'].indexOf(it.status) >= 0 ? it.status : 'active',
      trackUsage: it.trackUsage === false ? false : it.trackUsage === true ? true : undefined,
      priceHistory: Array.isArray(it.priceHistory) ? it.priceHistory.filter(function (p) { return p && D.isValid(p.date); }).map(function (p) { return { date: p.date, from: num(p.from, 0), to: num(p.to, 0) }; }) : [],
      usage: {},
      createdAt: str(it.createdAt, 40) || new Date().toISOString(),
      cancelledOn: date(it.cancelledOn)
    };
    if (it.usage && typeof it.usage === 'object') Object.keys(it.usage).forEach(function (k) { if (/^\d{4}-\d{2}$/.test(k)) out.usage[k] = Math.max(0, Math.floor(num(it.usage[k], 0))); });
    return out;
  }
  function cleanDoc(d) {
    if (!d || typeof d !== 'object' || !D.isValid(d.expiry)) return null;
    var type = LG.Library.docType(d.type);
    return {
      id: str(d.id, 40) || LG.U.uid(), type: type.id, name: str(d.name, 80).trim() || type.name, expiry: d.expiry,
      lead: Math.max(0, Math.min(730, Math.floor(num(d.lead, type.lead)))), ref: str(d.ref, 40), notes: str(d.notes, 2000),
      url: /^https?:\/\//i.test(d.url || '') ? str(d.url, 500) : '', createdAt: str(d.createdAt, 40) || new Date().toISOString()
    };
  }

  /** Validate + normalise any incoming state (from storage or an imported backup) */
  function normalise(raw) {
    var base = defaults();
    if (!raw || typeof raw !== 'object') return base;
    var s = raw.settings || {};
    base.settings.name = str(s.name, 40);
    base.settings.currency = LG.Library.CURRENCIES.some(function (c) { return c.code === s.currency; }) ? s.currency : 'GBP';
    base.settings.income = s.income === null || s.income === undefined || s.income === '' || !isFinite(Number(s.income)) ? null : Math.max(0, Number(s.income));
    base.settings.theme = ['system', 'light', 'dark'].indexOf(s.theme) >= 0 ? s.theme : 'system';
    base.settings.remindDays = Math.max(0, Math.min(30, Math.floor(num(s.remindDays, 3))));
    base.settings.notify = !!s.notify;
    base.settings.onboarded = !!s.onboarded;
    base.settings.sample = !!s.sample;
    base.settings.createdAt = str(s.createdAt, 40) || base.settings.createdAt;
    base.items = (Array.isArray(raw.items) ? raw.items : []).map(cleanItem).filter(Boolean);
    base.documents = (Array.isArray(raw.documents) ? raw.documents : []).map(cleanDoc).filter(Boolean);
    base.dismissedInsights = raw.dismissedInsights && typeof raw.dismissedInsights === 'object' ? raw.dismissedInsights : {};
    base.notif = { read: (raw.notif && raw.notif.read) || {}, notified: (raw.notif && raw.notif.notified) || {} };
    return base;
  }

  function load() {
    var raw = null;
    try {
      raw = root.localStorage.getItem(KEY);
      root.localStorage.setItem(KEY + ':probe', '1');
      root.localStorage.removeItem(KEY + ':probe');
    } catch (e) { persistent = false; }
    var parsed = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch (e) { parsed = null; }
    Store.state = normalise(parsed);
    return Store.state;
  }

  function save() {
    if (!persistent) return false;
    try { root.localStorage.setItem(KEY, JSON.stringify(Store.state)); return true; }
    catch (e) { persistent = false; emit({ type: 'storage-error' }); return false; }
  }

  function emit(evt) { listeners.slice().forEach(function (fn) { try { fn(evt || {}); } catch (e) { console.error(e); } }); }

  /** Apply a mutation, persist and notify subscribers */
  function commit(mutator, evt) {
    mutator(Store.state);
    save();
    emit(evt || {});
  }

  function findItem(id) { return Store.state.items.filter(function (i) { return i.id === id; })[0] || null; }
  function findDoc(id) { return Store.state.documents.filter(function (d) { return d.id === id; })[0] || null; }

  var Store = {
    KEY: KEY, state: null, load: load, save: save, commit: commit, normalise: normalise, defaults: defaults,
    isPersistent: function () { return persistent; },
    subscribe: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (l) { return l !== fn; }); }; },
    item: findItem, doc: findDoc,

    addItem: function (data) {
      var it = cleanItem(Object.assign({}, data, { id: LG.U.uid(), createdAt: new Date().toISOString() }));
      commit(function (s) { s.items.push(it); }, { type: 'item-added', id: it.id });
      return it;
    },
    /** Update an item; if the amount changed and recordPrice is set, log it in priceHistory */
    updateItem: function (id, patch, opts) {
      opts = opts || {};
      var cur = findItem(id); if (!cur) return null;
      var next = cleanItem(Object.assign({}, cur, patch, { id: id, createdAt: cur.createdAt, priceHistory: cur.priceHistory, usage: cur.usage }));
      if (opts.recordPrice && next.amount !== cur.amount) {
        next.priceHistory = cur.priceHistory.concat([{ date: opts.priceDate && D.isValid(opts.priceDate) ? opts.priceDate : D.today(), from: cur.amount, to: next.amount }]);
      }
      if (next.status === 'cancelled' && cur.status !== 'cancelled') next.cancelledOn = D.today();
      if (next.status !== 'cancelled') next.cancelledOn = '';
      commit(function (s) { s.items = s.items.map(function (i) { return i.id === id ? next : i; }); }, { type: 'item-updated', id: id });
      return next;
    },
    logPrice: function (id, newAmount, date) {
      return Store.updateItem(id, { amount: newAmount }, { recordPrice: true, priceDate: date });
    },
    removePriceEntry: function (id, index) {
      commit(function (s) { var it = s.items.filter(function (i) { return i.id === id; })[0]; if (it) it.priceHistory.splice(index, 1); }, { type: 'item-updated', id: id });
    },
    setUsage: function (id, monthKey, uses) {
      commit(function (s) {
        var it = s.items.filter(function (i) { return i.id === id; })[0];
        if (it) { it.usage = it.usage || {}; it.usage[monthKey] = Math.max(0, Math.floor(uses)); }
      }, { type: 'usage', id: id });
    },
    /** Remove an item; returns an undo function that restores it in place */
    removeItem: function (id) {
      var idx = -1, removed = null;
      Store.state.items.forEach(function (i, n) { if (i.id === id) { idx = n; removed = i; } });
      if (!removed) return function () {};
      commit(function (s) { s.items.splice(idx, 1); }, { type: 'item-removed', id: id });
      return function undo() {
        if (findItem(id)) return;
        commit(function (s) { s.items.splice(Math.min(idx, s.items.length), 0, removed); }, { type: 'item-restored', id: id });
      };
    },

    addDoc: function (data) {
      var d = cleanDoc(Object.assign({}, data, { id: LG.U.uid(), createdAt: new Date().toISOString() }));
      if (!d) return null;
      commit(function (s) { s.documents.push(d); }, { type: 'doc-added', id: d.id });
      return d;
    },
    updateDoc: function (id, patch) {
      var cur = findDoc(id); if (!cur) return null;
      var next = cleanDoc(Object.assign({}, cur, patch, { id: id, createdAt: cur.createdAt }));
      if (!next) return null;
      commit(function (s) { s.documents = s.documents.map(function (d) { return d.id === id ? next : d; }); }, { type: 'doc-updated', id: id });
      return next;
    },
    removeDoc: function (id) {
      var idx = -1, removed = null;
      Store.state.documents.forEach(function (d, n) { if (d.id === id) { idx = n; removed = d; } });
      if (!removed) return function () {};
      commit(function (s) { s.documents.splice(idx, 1); }, { type: 'doc-removed', id: id });
      return function undo() {
        if (findDoc(id)) return;
        commit(function (s) { s.documents.splice(Math.min(idx, s.documents.length), 0, removed); }, { type: 'doc-restored', id: id });
      };
    },

    setSettings: function (patch) { commit(function (s) { Object.assign(s.settings, patch); }, { type: 'settings', keys: Object.keys(patch) }); },
    dismissInsight: function (id) { commit(function (s) { s.dismissedInsights[id] = D.today(); }, { type: 'insight-dismissed' }); },
    restoreInsights: function () { commit(function (s) { s.dismissedInsights = {}; }, { type: 'insights-restored' }); },
    markRead: function (keys) { commit(function (s) { keys.forEach(function (k) { s.notif.read[k] = 1; }); }, { type: 'notif-read' }); },

    /** Replace everything with imported/sample data */
    replace: function (raw, evt) {
      Store.state = normalise(raw);
      save();
      emit(evt || { type: 'replaced' });
    },
    exportJSON: function () {
      return JSON.stringify(Object.assign({ exportedAt: new Date().toISOString() }, Store.state), null, 2);
    },
    clearAll: function () {
      try { root.localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
      Store.state = defaults();
      save();
      emit({ type: 'cleared' });
    }
  };

  LG.Store = Store;
})(typeof self !== 'undefined' ? self : this);
