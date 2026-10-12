/*
 * Ledgerly - reminders. Builds the in-app notification centre and (with permission)
 * shows system notifications via the browser Notifications API while Ledgerly is open.
 */
(function (root) {
  'use strict';
  var LG = root.LG, D = LG.Dates, F = LG.Finance, U = LG.U;

  function compute(state, today) {
    var out = [];
    var defaultLead = state.settings.remindDays;
    state.items.forEach(function (it) {
      if (!F.isActive(it, today)) return;
      var lead = it.remindDays === null || it.remindDays === undefined ? defaultLead : it.remindDays;
      var next = D.nextOccurrence(it, today);
      if (next && D.diffDays(today, next) <= lead) {
        var rel = D.relative(next, today);
        out.push({ key: 'due:' + it.id + ':' + next, kind: 'due', itemId: it.id, date: next, severity: next === today ? 'high' : 'medium',
          title: it.name + ' \u00B7 ' + U.money(it.amount) + ' due ' + rel,
          body: D.cycleLabel(it) + ' payment on ' + D.formatDate(next, { weekday: true }) + (it.method ? ' from ' + it.method : '') + '.' });
      }
      if (D.isValid(it.trialEnd) && it.trialEnd >= today && D.diffDays(today, it.trialEnd) <= 3) {
        out.push({ key: 'trial:' + it.id + ':' + it.trialEnd, kind: 'trial', itemId: it.id, date: it.trialEnd, severity: 'high',
          title: it.name + ' free trial ends ' + D.relative(it.trialEnd, today),
          body: 'Cancel before then to avoid paying ' + U.money(it.amount) + '.' });
      }
      if (D.isValid(it.cancelBy) && it.cancelBy >= today && D.diffDays(today, it.cancelBy) <= 3) {
        out.push({ key: 'cancel:' + it.id + ':' + it.cancelBy, kind: 'cancel', itemId: it.id, date: it.cancelBy, severity: 'high',
          title: 'Cancel ' + it.name + ' ' + D.relative(it.cancelBy, today),
          body: 'Your cancel-by reminder. Open Ledgerly for the cancellation link.' });
      }
    });
    state.documents.forEach(function (doc) {
      var st = LG.Insights.docStatus(doc, today);
      if (st.status === 'expired') {
        out.push({ key: 'doc:' + doc.id + ':' + doc.expiry + ':x', kind: 'doc', docId: doc.id, date: doc.expiry, severity: 'high',
          title: doc.name + ' expired ' + D.relative(doc.expiry, today), body: 'Renew it or update the expiry date.' });
      } else if (st.status === 'soon') {
        out.push({ key: 'doc:' + doc.id + ':' + doc.expiry, kind: 'doc', docId: doc.id, date: doc.expiry, severity: st.days <= 14 ? 'high' : 'medium',
          title: doc.name + ' expires ' + D.relative(doc.expiry, today), body: 'Expiry date: ' + D.formatDate(doc.expiry, { weekday: true }) + '.' });
      }
    });
    out.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    return out;
  }

  function unread(state, list) { return list.filter(function (n) { return !state.notif.read[n.key]; }); }

  function support() { return 'Notification' in root; }
  function permission() { return support() ? root.Notification.permission : 'unsupported'; }

  function request() {
    if (!support()) return Promise.resolve('unsupported');
    try {
      var r = root.Notification.requestPermission();
      if (r && r.then) return r;
      return new Promise(function (res) { root.Notification.requestPermission(res); });
    } catch (e) { return Promise.resolve('denied'); }
  }

  function show(n) {
    var opts = { body: n.body, tag: n.key, icon: 'assets/icons/icon-192.png', badge: 'assets/icons/icon-192.png' };
    if (root.navigator.serviceWorker && root.navigator.serviceWorker.controller && location.protocol.indexOf('http') === 0) {
      return root.navigator.serviceWorker.ready.then(function (reg) { return reg.showNotification(n.title, opts); }).catch(function () { try { new root.Notification(n.title, opts); } catch (e) { /* ignore */ } });
    }
    try { new root.Notification(n.title, opts); } catch (e) { /* some platforms only allow SW notifications */ }
    return Promise.resolve();
  }

  /** Show system notifications once per reminder (only when enabled and permitted) */
  function deliver(state, list) {
    if (!state.settings.notify || permission() !== 'granted') return 0;
    var fresh = list.filter(function (n) { return !state.notif.notified[n.key]; }).slice(0, 5);
    if (!fresh.length) return 0;
    fresh.forEach(show);
    LG.Store.commit(function (s) {
      fresh.forEach(function (n) { s.notif.notified[n.key] = D.today(); });
      // prune keys older than 120 days
      Object.keys(s.notif.notified).forEach(function (k) { if (D.isValid(s.notif.notified[k]) && D.diffDays(s.notif.notified[k], D.today()) > 120) delete s.notif.notified[k]; });
    }, { type: 'notif-delivered', silent: true });
    return fresh.length;
  }

  LG.Notify = { compute: compute, unread: unread, support: support, permission: permission, request: request, deliver: deliver, show: show };
})(typeof self !== 'undefined' ? self : this);
