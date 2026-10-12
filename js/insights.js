/*
 * Ledgerly - smart insights. Every rule is plain, explainable logic (no AI, nothing leaves the device).
 * Each insight carries a `why` explaining exactly what triggered it.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var deps = node
    ? { Dates: require('./dates.js'), Library: require('./library.js'), Finance: require('./finance.js') }
    : { Dates: root.LG.Dates, Library: root.LG.Library, Finance: root.LG.Finance };
  var api = factory(deps.Dates, deps.Library, deps.Finance);
  if (node) module.exports = api;
  else (root.LG = root.LG || {}).Insights = api;
})(typeof self !== 'undefined' ? self : this, function (D, Library, F) {
  'use strict';

  var SEVERITY_RANK = { high: 0, medium: 1, low: 2 };
  var USAGE_OPTIONS = [
    { value: 0, label: 'Not at all' },
    { value: 2, label: 'Once or twice' },
    { value: 4, label: 'About weekly' },
    { value: 12, label: 'Few times a week' },
    { value: 25, label: 'Most days' }
  ];

  function defaultMoney(n) { return '\u00A3' + (Math.round(n * 100) / 100).toFixed(2); }

  function docStatus(doc, today) {
    if (!doc || !D.isValid(doc.expiry)) return { status: 'unknown', days: null };
    var days = D.diffDays(today, doc.expiry);
    var lead = Number(doc.lead) >= 0 ? Number(doc.lead) : 30;
    if (days < 0) return { status: 'expired', days: days };
    if (days <= lead) return { status: 'soon', days: days };
    return { status: 'ok', days: days };
  }

  function trackable(item) {
    if (item.trackUsage === false) return false;
    if (item.trackUsage === true) return true;
    return !!Library.category(item.category).track;
  }

  /** Which month a usage check-in is about: early in the month we ask about last month */
  function checkinMonth(today) {
    var p = D.parse(today);
    return p.d <= 7 ? D.addMonthKey(D.monthKey(today), -1) : D.monthKey(today);
  }

  function checkinsDue(items, today) {
    var key = checkinMonth(today);
    var monthEnd = D.endOfMonth(key + '-01');
    return (items || []).filter(function (it) {
      if (!F.isActive(it, today) || !trackable(it)) return false;
      if (it.trialEnd && it.trialEnd >= today) return false; // still on a free trial
      if (it.anchor && it.anchor > monthEnd && !(it.createdAt && it.createdAt.slice(0, 7) <= key)) return false;
      return !(it.usage && Object.prototype.hasOwnProperty.call(it.usage, key));
    }).map(function (it) { return { item: it, month: key }; });
  }

  function costPerUse(item, monthKey) {
    var uses = item.usage ? item.usage[monthKey] : undefined;
    if (uses === undefined || uses === null) return null;
    if (uses === 0) return Infinity;
    return D.monthlyEquivalent(item) / uses;
  }

  function compute(state, today, opts) {
    opts = opts || {};
    var money = opts.money || defaultMoney;
    var dismissed = opts.dismissed || (state && state.dismissedInsights) || {};
    var cpuThreshold = opts.costPerUseThreshold || 5;
    var items = ((state && state.items) || []).filter(function (it) { return F.isActive(it, today); });
    var docs = (state && state.documents) || [];
    var income = state && state.settings ? state.settings.income : null;
    var out = [];
    function single(id, v) { var m = {}; m[id] = v; return m; }
    function perMonth(it) { return money(D.monthlyEquivalent(it)) + '/mo'; }

    // 1. Duplicate / overlapping services
    var groups = {};
    items.forEach(function (it) {
      var g = Library.groupFor(it);
      if (!g) return;
      (groups[g] = groups[g] || []).push(it);
    });
    Object.keys(groups).forEach(function (g) {
      var list = groups[g];
      var threshold = Library.GROUP_THRESHOLD[g] || 2;
      if (list.length < threshold) return;
      list.sort(function (a, b) { return D.monthlyEquivalent(b) - D.monthlyEquivalent(a); });
      var keep = list[0];
      var others = list.slice(1);
      var saving = others.reduce(function (s, it) { return s + D.yearlyEquivalent(it); }, 0);
      var label = Library.GROUP_LABELS[g] || g;
      var names = list.map(function (it) { return it.name + ' (' + perMonth(it) + ')'; });
      var ids = list.map(function (it) { return it.id; }).sort();
      out.push({
        id: 'dup:' + g + ':' + ids.join(','), type: 'duplicate', severity: list.length >= 3 ? 'high' : 'medium',
        title: list.length + ' ' + label + ' services overlap',
        body: 'You pay for ' + names.join(', ') + '. Keeping just ' + keep.name + ' would save about ' + money(saving) + ' a year.',
        why: 'These services do largely the same job. Savings assume you keep the most expensive one (' + keep.name + '), so the real figure could be higher.',
        itemIds: list.map(function (it) { return it.id; }), saving: saving,
        perItem: others.reduce(function (m, it) { m[it.id] = D.yearlyEquivalent(it); return m; }, {})
      });
    });

    // 2. Yearly billing is cheaper
    items.forEach(function (it) {
      if (it.cycle !== 'monthly') return;
      var svc = it.serviceId && Library.service(it.serviceId);
      if (!svc || !svc.annualPrice) return;
      var monthlyYear = (Number(it.amount) || 0) * 12;
      var saving = monthlyYear - svc.annualPrice;
      if (saving < 1) return;
      var pct = Math.round((saving / monthlyYear) * 100);
      out.push({
        id: 'annual:' + it.id + ':' + it.amount, type: 'annual', severity: 'low',
        title: 'Pay yearly for ' + it.name + ' and save ' + pct + '%',
        body: 'Paying monthly costs ' + money(monthlyYear) + ' a year. The typical annual plan is ' + money(svc.annualPrice) + ', saving ' + money(saving) + '.',
        why: 'Based on typical UK annual pricing for ' + svc.name + '. Check the current price on their site before switching.',
        itemIds: [it.id], saving: saving, perItem: single(it.id, saving)
      });
    });

    // 3. Usage check-ins: unused subscriptions and high cost per use
    var thisKey = D.monthKey(today);
    var lastKey = D.addMonthKey(thisKey, -1);
    items.forEach(function (it) {
      if (!it.usage) return;
      var cur = it.usage[thisKey], prev = it.usage[lastKey];
      var latestKey = cur !== undefined ? thisKey : prev !== undefined ? lastKey : null;
      if (!latestKey) return;
      var latest = it.usage[latestKey];
      var monthName = D.MONTHS_LONG[+latestKey.slice(5, 7) - 1];
      if (latest === 0) {
        var twice = cur === 0 && prev === 0;
        var yearly = D.yearlyEquivalent(it);
        out.push({
          id: 'unused:' + it.id + ':' + latestKey, type: 'unused', severity: twice ? 'high' : 'medium',
          title: twice ? it.name + ' unused for 2 months' : 'You didn\u2019t use ' + it.name + ' in ' + monthName,
          body: 'It costs ' + perMonth(it) + '. Cancelling would save ' + money(yearly) + ' a year.',
          why: 'From your own check-in' + (twice ? 's: you said you didn\u2019t use it last month or this month.' : ': you said you didn\u2019t use it in ' + monthName + '.'),
          itemIds: [it.id], saving: yearly, perItem: single(it.id, yearly)
        });
      } else {
        var cpu = D.monthlyEquivalent(it) / latest;
        if (cpu >= cpuThreshold) {
          out.push({
            id: 'cpu:' + it.id + ':' + latestKey + ':' + latest, type: 'costperuse', severity: 'low',
            title: 'Each use of ' + it.name + ' costs ' + money(cpu),
            body: 'You used it about ' + latest + ' time' + (latest === 1 ? '' : 's') + ' in ' + monthName + ' for ' + perMonth(it) + '. Pay-as-you-go or a cheaper tier might work out better.',
            why: 'Cost per use = monthly cost \u00F7 times used, from your check-in. We flag anything at ' + money(cpuThreshold) + ' or more per use.',
            itemIds: [it.id], saving: 0
          });
        }
      }
    });

    // 4. Price rises in the last 12 months
    items.forEach(function (it) {
      var ch = F.lastPriceChange(it);
      if (!ch || ch.to <= ch.from) return;
      if (D.diffDays(ch.date, today) > 365 || ch.date > today) return;
      out.push({
        id: 'price:' + it.id + ':' + ch.date + ':' + ch.to, type: 'price', severity: ch.pct >= 10 ? 'high' : 'medium',
        title: it.name + ' went up ' + ch.pct.toFixed(1) + '%',
        body: money(ch.from) + ' \u2192 ' + money(ch.to) + ' on ' + D.formatDate(ch.date) + '. That\u2019s ' + money(ch.yearlyDelta) + ' more a year.',
        why: 'From the price history you recorded. A price rise is a good moment to haggle, downgrade or switch provider.',
        itemIds: [it.id], saving: 0
      });
    });

    // 5. Free trials ending & cancel-by dates
    items.forEach(function (it) {
      var trialDays = D.isValid(it.trialEnd) ? D.diffDays(today, it.trialEnd) : null;
      var cancelDays = D.isValid(it.cancelBy) ? D.diffDays(today, it.cancelBy) : null;
      if (trialDays !== null && trialDays >= 0 && trialDays <= 14) {
        var by = D.isValid(it.cancelBy) ? it.cancelBy : it.trialEnd;
        out.push({
          id: 'trial:' + it.id + ':' + it.trialEnd, type: 'trial', severity: trialDays <= 3 ? 'high' : 'medium',
          title: it.name + ' free trial ends ' + D.relative(it.trialEnd, today),
          body: 'You\u2019ll be charged ' + money(Number(it.amount) || 0) + ' (' + D.cycleLabel(it).toLowerCase() + ') unless you cancel by ' + D.formatDate(by, { weekday: true }) + '.',
          why: 'You set a free-trial end date of ' + D.formatDate(it.trialEnd) + '. We warn you 14 days ahead.',
          itemIds: [it.id], saving: 0
        });
        return;
      }
      if (cancelDays !== null && cancelDays >= 0 && cancelDays <= 14) {
        out.push({
          id: 'cancelby:' + it.id + ':' + it.cancelBy, type: 'cancelby', severity: cancelDays <= 3 ? 'high' : 'medium',
          title: 'Cancel ' + it.name + ' by ' + D.formatDate(it.cancelBy, { year: false }),
          body: 'Your cancel-by reminder is ' + D.relative(it.cancelBy, today) + '. Next payment: ' + money(Number(it.amount) || 0) + '.',
          why: 'You set a cancel-by date for this subscription.',
          itemIds: [it.id], saving: 0
        });
      } else if (cancelDays !== null && cancelDays < 0 && cancelDays >= -30) {
        out.push({
          id: 'cancelby-missed:' + it.id + ':' + it.cancelBy, type: 'cancelby', severity: 'high',
          title: 'Cancel-by date for ' + it.name + ' has passed',
          body: 'It was ' + D.relative(it.cancelBy, today) + ' and the subscription is still marked active. Cancel now or update the date.',
          why: 'Your cancel-by date is in the past but the item is not marked as cancelled.',
          itemIds: [it.id], saving: 0
        });
      }
    });

    // 6. Budget pressure
    var t = F.totals(items, today);
    if (income !== null && income !== undefined && income !== '' && Number(income) > 0 && t.monthly > 0) {
      var ratio = t.monthly / Number(income);
      if (ratio > 0.5) {
        out.push({
          id: 'budget:' + Math.round(ratio * 100), type: 'budget', severity: ratio > 1 ? 'high' : 'medium',
          title: ratio > 1 ? 'Bills are higher than your income' : 'Bills take ' + Math.round(ratio * 100) + '% of your income',
          body: 'Regular bills average ' + money(t.monthly) + ' a month against income of ' + money(Number(income)) + '.',
          why: 'A common rule of thumb keeps fixed costs around 50% of take-home pay, leaving room for spending and saving.',
          itemIds: [], saving: 0
        });
      }
    }

    // 7. Renewals needing attention
    var urgent = docs.map(function (d) { return { doc: d, st: docStatus(d, today) }; })
      .filter(function (x) { return x.st.status === 'expired' || x.st.status === 'soon'; })
      .sort(function (a, b) { return a.st.days - b.st.days; });
    if (urgent.length) {
      var anyExpired = urgent.some(function (x) { return x.st.status === 'expired'; });
      out.push({
        id: 'renewal:' + urgent.map(function (x) { return x.doc.id + '@' + x.doc.expiry; }).join(','), type: 'renewal', severity: anyExpired ? 'high' : 'medium',
        title: urgent.length + ' renewal' + (urgent.length > 1 ? 's need' : ' needs') + ' attention',
        body: urgent.slice(0, 4).map(function (x) { return x.doc.name + ' ' + (x.st.status === 'expired' ? 'expired ' + D.relative(x.doc.expiry, today) : 'expires ' + D.relative(x.doc.expiry, today)); }).join(' \u00B7 '),
        why: 'Each document has a reminder lead time; these are inside it or already past their expiry date.',
        itemIds: [], docIds: urgent.map(function (x) { return x.doc.id; }), saving: 0
      });
    }

    var visible = out.filter(function (i) { return !dismissed[i.id]; });
    visible.sort(function (a, b) {
      return (SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]) || (b.saving - a.saving) || a.title.localeCompare(b.title);
    });

    // potential savings: per item, the best saving among visible saving insights
    var visibleSavings = {};
    visible.forEach(function (ins) {
      var per = ins.perItem || {};
      Object.keys(per).forEach(function (id) { visibleSavings[id] = Math.max(visibleSavings[id] || 0, per[id]); });
    });
    var potential = Object.keys(visibleSavings).reduce(function (s, id) { return s + visibleSavings[id]; }, 0);

    return { insights: visible, potentialSavings: potential, dismissedCount: out.length - visible.length, itemSavings: visibleSavings };
  }

  return {
    compute: compute, docStatus: docStatus, checkinsDue: checkinsDue, checkinMonth: checkinMonth,
    costPerUse: costPerUse, trackable: trackable, USAGE_OPTIONS: USAGE_OPTIONS
  };
});
