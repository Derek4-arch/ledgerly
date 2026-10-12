/*
 * Ledgerly - dates & recurrence engine
 * Pure functions, no DOM. Works in the browser (window.LG.Dates) and in Node (require).
 * All dates are plain calendar dates as 'YYYY-MM-DD' strings, handled as UTC day
 * numbers so daylight-saving changes can never shift a due date.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.LG = root.LG || {}).Dates = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MS_DAY = 86400000;
  var DAYS_PER_YEAR = 365.2425; // mean Gregorian year
  var MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
  function daysInMonth(y, m) { return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]; }

  function parse(s) {
    if (typeof s !== 'string') return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null;
    return { y: y, m: mo, d: d };
  }
  function isValid(s) { return parse(s) !== null; }
  function fmt(y, m, d) { return String(y).padStart(4, '0') + '-' + pad(m) + '-' + pad(d); }
  function toDayNum(s) { var p = parse(s); if (!p) throw new Error('Invalid date: ' + s); return Math.round(Date.UTC(p.y, p.m - 1, p.d) / MS_DAY); }
  function fromDayNum(n) { var dt = new Date(n * MS_DAY); return fmt(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()); }
  function addDays(s, n) { return fromDayNum(toDayNum(s) + n); }
  /** whole days from a to b (b - a) */
  function diffDays(a, b) { return toDayNum(b) - toDayNum(a); }
  function compare(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

  /**
   * Add n months, clamping to the end of shorter months.
   * anchorDay lets a series keep its intended day (31 -> 30 -> 28/29 -> 31) without drift.
   */
  function addMonths(s, n, anchorDay) {
    var p = parse(s);
    if (!p) throw new Error('Invalid date: ' + s);
    var total = p.y * 12 + (p.m - 1) + n;
    var y = Math.floor(total / 12), m = total - y * 12 + 1;
    return fmt(y, m, Math.min(anchorDay || p.d, daysInMonth(y, m)));
  }
  function addYears(s, n) { return addMonths(s, n * 12); }

  function today(now) {
    var d = now || new Date();
    return fmt(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }
  /** 0 = Monday ... 6 = Sunday (UK weeks start on Monday) */
  function weekday(s) { return (((toDayNum(s) + 3) % 7) + 7) % 7; }
  function monthKey(s) { return s.slice(0, 7); }
  function startOfMonth(s) { return s.slice(0, 8) + '01'; }
  function endOfMonth(s) { var p = parse(s); return fmt(p.y, p.m, daysInMonth(p.y, p.m)); }
  function addMonthKey(key, n) { return addMonths(key + '-01', n).slice(0, 7); }

  /* ---------- cycles ---------- */
  var CYCLES = {
    weekly: { label: 'Weekly', short: 'wk' },
    monthly: { label: 'Monthly', short: 'mo' },
    quarterly: { label: 'Quarterly', short: 'qtr' },
    yearly: { label: 'Yearly', short: 'yr' },
    custom: { label: 'Custom', short: '' }
  };

  /** Normalise an item's cycle into { unit: 'day' | 'month', n } */
  function cycleSpec(item) {
    if (!item) return null;
    switch (item.cycle) {
      case 'weekly': return { unit: 'day', n: 7 };
      case 'monthly': return { unit: 'month', n: 1 };
      case 'quarterly': return { unit: 'month', n: 3 };
      case 'yearly': return { unit: 'month', n: 12 };
      case 'custom': {
        var n = Math.max(1, Math.floor(Number(item.every) || 1));
        switch (item.unit) {
          case 'day': return { unit: 'day', n: n };
          case 'week': return { unit: 'day', n: 7 * n };
          case 'year': return { unit: 'month', n: 12 * n };
          default: return { unit: 'month', n: n };
        }
      }
      default: return null;
    }
  }

  function cycleLabel(item) {
    if (!item) return '';
    if (item.cycle !== 'custom') return (CYCLES[item.cycle] || {}).label || '';
    var n = Math.max(1, Math.floor(Number(item.every) || 1));
    var unit = item.unit || 'month';
    return 'Every ' + (n === 1 ? '' : n + ' ') + unit + (n === 1 ? '' : 's');
  }
  function cycleShort(item) {
    if (!item) return '';
    if (item.cycle !== 'custom') return (CYCLES[item.cycle] || {}).short || '';
    var n = Math.max(1, Math.floor(Number(item.every) || 1));
    var u = { day: 'day', week: 'wk', month: 'mo', year: 'yr' }[item.unit || 'month'];
    return n === 1 ? u : n + ' ' + u + 's';
  }

  /** k-th occurrence (k >= 0) counted from the anchor, never from the previous one (no drift) */
  function nth(anchor, spec, k) {
    if (spec.unit === 'day') return addDays(anchor, k * spec.n);
    return addMonths(anchor, k * spec.n, parse(anchor).d);
  }

  function firstIndexNear(anchor, spec, from) {
    if (spec.unit === 'day') return Math.max(0, Math.ceil(diffDays(anchor, from) / spec.n));
    var a = parse(anchor), f = parse(from);
    var months = (f.y - a.y) * 12 + (f.m - a.m);
    return Math.max(0, Math.floor(months / spec.n) - 1);
  }

  /** All occurrence dates within [from, to] inclusive, starting at item.anchor and ending at item.endDate */
  function occurrencesBetween(item, from, to, limit) {
    var spec = cycleSpec(item);
    var out = [];
    if (!spec || !isValid(item.anchor) || !isValid(from) || !isValid(to)) return out;
    var end = to;
    if (item.endDate && isValid(item.endDate) && item.endDate < end) end = item.endDate;
    if (end < from) return out;
    var k = firstIndexNear(item.anchor, spec, from);
    for (var guard = 0; guard < 100000; guard++, k++) {
      var d = nth(item.anchor, spec, k);
      if (d > end) break;
      if (d >= from) {
        out.push(d);
        if (limit && out.length >= limit) break;
      }
    }
    return out;
  }

  /** Next occurrence on or after `from` (or null if the series has ended) */
  function nextOccurrence(item, from) {
    var spec = cycleSpec(item);
    if (!spec || !isValid(item.anchor)) return null;
    var k = firstIndexNear(item.anchor, spec, from);
    for (var guard = 0; guard < 100000; guard++, k++) {
      var d = nth(item.anchor, spec, k);
      if (item.endDate && isValid(item.endDate) && d > item.endDate) return null;
      if (d >= from) return d;
    }
    return null;
  }

  /** Next n occurrences from `from` */
  function nextOccurrences(item, from, n) {
    var res = [];
    var d = nextOccurrence(item, from);
    var spec = cycleSpec(item);
    if (!d || !spec) return res;
    var k = firstIndexNear(item.anchor, spec, d);
    for (var guard = 0; res.length < n && guard < 100000; guard++, k++) {
      var x = nth(item.anchor, spec, k);
      if (item.endDate && x > item.endDate) break;
      if (x >= from) res.push(x);
    }
    return res;
  }

  /** Average number of payments per year for the cycle */
  function periodsPerYear(item) {
    var spec = cycleSpec(item);
    if (!spec) return 0;
    return spec.unit === 'day' ? DAYS_PER_YEAR / spec.n : 12 / spec.n;
  }
  /** Average monthly cost of an item regardless of cycle */
  function monthlyEquivalent(item) {
    var amt = Number(item && item.amount) || 0;
    return (amt * periodsPerYear(item)) / 12;
  }
  function yearlyEquivalent(item) {
    var amt = Number(item && item.amount) || 0;
    return amt * periodsPerYear(item);
  }

  /* ---------- formatting ---------- */
  function formatDate(s, opts) {
    var p = parse(s);
    if (!p) return '';
    opts = opts || {};
    var str = p.d + ' ' + MONTHS_SHORT[p.m - 1];
    if (opts.weekday) str = WEEKDAYS_SHORT[weekday(s)] + ' ' + str;
    if (opts.year !== false) str += ' ' + p.y;
    return str;
  }
  function formatMonth(key, short) {
    var y = +key.slice(0, 4), m = +key.slice(5, 7);
    return (short ? MONTHS_SHORT : MONTHS_LONG)[m - 1] + ' ' + y;
  }
  /** "today", "tomorrow", "in 5 days", "3 days ago" */
  function relative(s, base) {
    var n = diffDays(base, s);
    if (n === 0) return 'today';
    if (n === 1) return 'tomorrow';
    if (n === -1) return 'yesterday';
    if (n > 1 && n < 60) return 'in ' + n + ' days';
    if (n < -1 && n > -60) return Math.abs(n) + ' days ago';
    var months = Math.round(Math.abs(n) / 30.44);
    if (months < 24) return n > 0 ? 'in ' + months + ' months' : months + ' months ago';
    var years = Math.round(Math.abs(n) / DAYS_PER_YEAR);
    return n > 0 ? 'in ' + years + ' years' : years + ' years ago';
  }

  return {
    DAYS_PER_YEAR: DAYS_PER_YEAR, MONTHS_SHORT: MONTHS_SHORT, MONTHS_LONG: MONTHS_LONG, WEEKDAYS_SHORT: WEEKDAYS_SHORT, CYCLES: CYCLES,
    pad: pad, isLeap: isLeap, daysInMonth: daysInMonth, parse: parse, isValid: isValid, fmt: fmt,
    toDayNum: toDayNum, fromDayNum: fromDayNum, addDays: addDays, diffDays: diffDays, compare: compare,
    addMonths: addMonths, addYears: addYears, today: today, weekday: weekday, monthKey: monthKey,
    startOfMonth: startOfMonth, endOfMonth: endOfMonth, addMonthKey: addMonthKey,
    cycleSpec: cycleSpec, cycleLabel: cycleLabel, cycleShort: cycleShort, nth: nth,
    occurrencesBetween: occurrencesBetween, nextOccurrence: nextOccurrence, nextOccurrences: nextOccurrences,
    periodsPerYear: periodsPerYear, monthlyEquivalent: monthlyEquivalent, yearlyEquivalent: yearlyEquivalent,
    formatDate: formatDate, formatMonth: formatMonth, relative: relative
  };
});
