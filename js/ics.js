/*
 * Ledgerly - iCalendar (RFC 5545) export.
 * Produces CRLF line endings, escapes TEXT values and folds lines at 75 octets (UTF-8 aware).
 * Recurring payments become RRULEs; month-end dates use BYMONTHDAY + BYSETPOS=-1 so a bill on
 * the 31st lands on the last day of shorter months, exactly matching Ledgerly's own engine.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var deps = node
    ? { Dates: require('./dates.js'), Library: require('./library.js') }
    : { Dates: root.LG.Dates, Library: root.LG.Library };
  var api = factory(deps.Dates, deps.Library);
  if (node) module.exports = api;
  else (root.LG = root.LG || {}).ICS = api;
})(typeof self !== 'undefined' ? self : this, function (D, Library) {
  'use strict';

  var CRLF = '\r\n';

  function escapeText(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r\n|\r|\n/g, '\\n');
  }

  function utf8Len(cp) { return cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4; }

  /** Fold one content line so that no physical line exceeds 75 octets (RFC 5545 3.1). */
  function foldLine(line) {
    var out = [];
    var cur = '';
    var bytes = 0;
    var limit = 75;
    for (var ch of line) {
      var len = utf8Len(ch.codePointAt(0));
      if (bytes + len > limit) {
        out.push(cur);
        cur = ' ';
        bytes = 1;
        limit = 75;
      }
      cur += ch;
      bytes += len;
    }
    out.push(cur);
    return out.join(CRLF);
  }

  function dateValue(s) { return s.replace(/-/g, ''); }
  function stamp(now) {
    var d = now || new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + 'T' + p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + 'Z';
  }

  /** RRULE for an item, or null for unknown cycles */
  function rruleFor(item) {
    var spec = D.cycleSpec(item);
    if (!spec || !D.isValid(item.anchor)) return null;
    var parts;
    if (spec.unit === 'day') {
      parts = spec.n % 7 === 0 ? ['FREQ=WEEKLY', 'INTERVAL=' + spec.n / 7] : ['FREQ=DAILY', 'INTERVAL=' + spec.n];
    } else {
      var p = D.parse(item.anchor);
      var yearly = spec.n % 12 === 0;
      parts = yearly ? ['FREQ=YEARLY', 'INTERVAL=' + spec.n / 12] : ['FREQ=MONTHLY', 'INTERVAL=' + spec.n];
      if (yearly) {
        if (p.m === 2 && p.d === 29) parts.push('BYMONTH=2', 'BYMONTHDAY=28,29', 'BYSETPOS=-1');
      } else if (p.d > 28) {
        var days = [];
        for (var d = 28; d <= p.d; d++) days.push(d);
        parts.push('BYMONTHDAY=' + days.join(','), 'BYSETPOS=-1');
      }
    }
    if (item.endDate && D.isValid(item.endDate)) parts.push('UNTIL=' + dateValue(item.endDate));
    return parts.join(';');
  }

  function alarm(lines, triggerDays, text) {
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + escapeText(text));
    lines.push(triggerDays > 0 ? 'TRIGGER:-P' + triggerDays + 'D' : 'TRIGGER:PT9H');
    lines.push('END:VALARM');
  }

  function allDayEvent(lines, o) {
    lines.push('BEGIN:VEVENT');
    lines.push('UID:' + o.uid);
    lines.push('DTSTAMP:' + o.stamp);
    lines.push('DTSTART;VALUE=DATE:' + dateValue(o.date));
    lines.push('DTEND;VALUE=DATE:' + dateValue(D.addDays(o.date, 1)));
    if (o.rrule) lines.push('RRULE:' + o.rrule);
    lines.push('SUMMARY:' + escapeText(o.summary));
    if (o.description) lines.push('DESCRIPTION:' + escapeText(o.description));
    if (o.url) lines.push('URL:' + o.url);
    if (o.categories) lines.push('CATEGORIES:' + escapeText(o.categories));
    lines.push('TRANSP:TRANSPARENT');
    if (o.alarmDays !== undefined && o.alarmDays !== null) alarm(lines, o.alarmDays, o.summary);
    lines.push('END:VEVENT');
  }

  /**
   * Build a calendar for all active subscriptions, trials, cancel-by dates and document renewals.
   * opts: { money(n) -> string, now: Date, name: string, includeItems, includeDocs }
   */
  function build(state, opts) {
    opts = opts || {};
    var money = opts.money || function (n) { return (Math.round(n * 100) / 100).toFixed(2); };
    var st = stamp(opts.now);
    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Ledgerly//Life admin//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:' + escapeText(opts.name || 'Ledgerly bills & renewals'),
      'X-WR-TIMEZONE:Europe/London'
    ];
    var defaultLead = state.settings && state.settings.remindDays !== undefined ? Number(state.settings.remindDays) : 3;

    (state.items || []).forEach(function (it) {
      if (it.status === 'cancelled' || it.status === 'paused') return;
      var rrule = rruleFor(it);
      if (!rrule) return;
      var cat = Library.category(it.category);
      var desc = D.cycleLabel(it) + ' payment of ' + money(Number(it.amount) || 0) + ' (' + cat.name + ').';
      if (it.method) desc += '\nPaid with: ' + it.method + '.';
      if (it.notes) desc += '\n' + it.notes;
      desc += '\nAdded by Ledgerly.';
      var lead = it.remindDays !== undefined && it.remindDays !== null && it.remindDays !== '' ? Number(it.remindDays) : defaultLead;
      allDayEvent(lines, {
        uid: 'sub-' + it.id + '@ledgerly.app', stamp: st, date: it.anchor, rrule: rrule,
        summary: it.name + ' \u00B7 ' + money(Number(it.amount) || 0), description: desc,
        categories: cat.name, alarmDays: lead
      });
      if (D.isValid(it.trialEnd)) {
        allDayEvent(lines, {
          uid: 'trial-' + it.id + '@ledgerly.app', stamp: st, date: it.trialEnd,
          summary: 'Free trial ends: ' + it.name,
          description: 'First charge of ' + money(Number(it.amount) || 0) + ' unless you cancel.',
          alarmDays: 2
        });
      }
      if (D.isValid(it.cancelBy)) {
        var svc = it.serviceId ? Library.service(it.serviceId) : null;
        allDayEvent(lines, {
          uid: 'cancel-' + it.id + '@ledgerly.app', stamp: st, date: it.cancelBy,
          summary: 'Cancel ' + it.name + ' by today',
          description: svc && svc.cancelNote ? 'How to cancel: ' + svc.cancelNote : 'Your cancel-by reminder from Ledgerly.',
          url: svc && svc.cancelUrl ? svc.cancelUrl : '', alarmDays: 0
        });
      }
    });

    (state.documents || []).forEach(function (doc) {
      if (!D.isValid(doc.expiry)) return;
      var type = Library.docType(doc.type);
      var lead = Number(doc.lead) >= 0 ? Number(doc.lead) : type.lead;
      allDayEvent(lines, {
        uid: 'doc-' + doc.id + '@ledgerly.app', stamp: st, date: doc.expiry,
        summary: doc.name + ' expires',
        description: (type.tip ? type.tip + '\n' : '') + (doc.notes ? doc.notes + '\n' : '') + 'Added by Ledgerly.',
        url: doc.url || type.url || '', categories: 'Renewals', alarmDays: Math.min(lead, 28)
      });
      if (lead > 0) {
        allDayEvent(lines, {
          uid: 'docrenew-' + doc.id + '@ledgerly.app', stamp: st, date: D.addDays(doc.expiry, -lead),
          summary: 'Renew ' + doc.name + ' (expires ' + D.formatDate(doc.expiry) + ')',
          description: 'Time to start renewing. ' + (type.tip || ''),
          url: doc.url || type.url || '', categories: 'Renewals', alarmDays: 0
        });
      }
    });

    lines.push('END:VCALENDAR');
    return lines.map(foldLine).join(CRLF) + CRLF;
  }

  return { build: build, foldLine: foldLine, escapeText: escapeText, rruleFor: rruleFor, stamp: stamp };
});
