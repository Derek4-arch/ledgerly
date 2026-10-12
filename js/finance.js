/*
 * Ledgerly - totals, upcoming payments, category split and projections.
 * Pure functions over plain data; shared by the UI and the Node unit tests.
 */
(function (root, factory) {
  var deps = (typeof module === 'object' && module.exports)
    ? { Dates: require('./dates.js'), Library: require('./library.js') }
    : { Dates: root.LG.Dates, Library: root.LG.Library };
  var api = factory(deps.Dates, deps.Library);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.LG = root.LG || {}).Finance = api;
})(typeof self !== 'undefined' ? self : this, function (D, Library) {
  'use strict';

  function round2(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }

  /** Counts towards totals: not paused, not cancelled, series not ended before `today` */
  function isActive(item, today) {
    if (!item) return false;
    if (item.status === 'paused' || item.status === 'cancelled') return false;
    if (today && item.endDate && item.endDate < today) return false;
    return true;
  }

  function totals(items, today) {
    var monthly = 0, yearly = 0, count = 0;
    (items || []).forEach(function (it) {
      if (!isActive(it, today)) return;
      monthly += D.monthlyEquivalent(it);
      yearly += D.yearlyEquivalent(it);
      count++;
    });
    return { monthly: monthly, yearly: yearly, count: count };
  }

  /** Yearly amount no longer being paid thanks to cancelled items */
  function cancelledSavings(items) {
    return (items || []).reduce(function (sum, it) {
      return it.status === 'cancelled' ? sum + D.yearlyEquivalent(it) : sum;
    }, 0);
  }

  function byCategory(items, today) {
    var map = {};
    (items || []).forEach(function (it) {
      if (!isActive(it, today)) return;
      var c = it.category || 'other';
      map[c] = (map[c] || 0) + D.monthlyEquivalent(it);
    });
    return Object.keys(map).map(function (id) {
      var cat = Library.category(id);
      return { id: id, name: cat.name, color: cat.color, monthly: map[id] };
    }).sort(function (a, b) { return b.monthly - a.monthly; });
  }

  /** Payments due in [from, from + days - 1] */
  function upcoming(items, from, days) {
    var to = D.addDays(from, Math.max(1, days) - 1);
    var list = [];
    (items || []).forEach(function (it) {
      if (!isActive(it, from)) return;
      D.occurrencesBetween(it, from, to).forEach(function (date) {
        list.push({ item: it, date: date, amount: Number(it.amount) || 0 });
      });
    });
    list.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.item.name || '').localeCompare(b.item.name || ''); });
    return list;
  }

  function sumAmounts(list) { return list.reduce(function (s, x) { return s + x.amount; }, 0); }

  /** Payments falling in a calendar month ('YYYY-MM') */
  function paymentsInMonth(items, key, today) {
    var from = key + '-01', to = D.endOfMonth(from);
    var out = [];
    (items || []).forEach(function (it) {
      if (it.status === 'paused' || it.status === 'cancelled') return;
      D.occurrencesBetween(it, from, to).forEach(function (date) { out.push({ item: it, date: date, amount: Number(it.amount) || 0 }); });
    });
    out.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    return out;
  }

  /** Actual cash out per calendar month for `months` months starting at startKey (shows lumpy yearly bills) */
  function projection(items, startKey, months) {
    months = months || 12;
    var out = [];
    for (var i = 0; i < months; i++) {
      var key = D.addMonthKey(startKey, i);
      var pays = paymentsInMonth(items, key);
      out.push({ key: key, label: D.MONTHS_SHORT[+key.slice(5, 7) - 1], total: sumAmounts(pays), count: pays.length });
    }
    return out;
  }

  function leftAfterBills(income, monthly) {
    if (income === null || income === undefined || income === '' || isNaN(Number(income))) return null;
    return Number(income) - monthly;
  }

  /** Detect the most recent price change: {from, to, date, pct, yearlyDelta} */
  function lastPriceChange(item) {
    var h = (item && item.priceHistory) || [];
    if (!h.length) return null;
    var sorted = h.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    var last = sorted[sorted.length - 1];
    if (!(last.from > 0)) return null;
    var pct = ((last.to - last.from) / last.from) * 100;
    var perYear = D.periodsPerYear(item);
    return { from: last.from, to: last.to, date: last.date, pct: pct, yearlyDelta: (last.to - last.from) * perYear };
  }

  return {
    round2: round2, isActive: isActive, totals: totals, cancelledSavings: cancelledSavings, byCategory: byCategory,
    upcoming: upcoming, sumAmounts: sumAmounts, paymentsInMonth: paymentsInMonth, projection: projection,
    leftAfterBills: leftAfterBills, lastPriceChange: lastPriceChange
  };
});
