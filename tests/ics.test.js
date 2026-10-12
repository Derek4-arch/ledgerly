'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const ICS = require('../js/ics.js');
const D = require('../js/dates.js');

const NOW = new Date(Date.UTC(2026, 9, 7, 18, 30, 0));
const st = {
  settings: { remindDays: 3 },
  items: [
    { id: 'n1', name: 'Netflix', amount: 12.99, cycle: 'monthly', anchor: '2026-10-31', category: 'entertainment', method: 'Visa \u2022\u2022 4242', notes: 'Shared with family; ask Sam, Alex & Jo' },
    { id: 'w1', name: 'Veg box', amount: 20, cycle: 'weekly', anchor: '2026-10-09', category: 'food', remindDays: 0 },
    { id: 'y1', name: 'Leap thing', amount: 50, cycle: 'yearly', anchor: '2028-02-29', category: 'other' },
    { id: 'q1', name: 'Water', amount: 120, cycle: 'quarterly', anchor: '2026-11-30', category: 'home', endDate: '2027-11-30' },
    { id: 't1', name: 'Disney+', serviceId: 'disney', amount: 9.99, cycle: 'monthly', anchor: '2026-10-11', trialEnd: '2026-10-11', cancelBy: '2026-10-10', category: 'entertainment' },
    { id: 'x1', name: 'Cancelled', amount: 5, cycle: 'monthly', anchor: '2026-10-01', status: 'cancelled' },
    { id: 'e1', name: 'Caf\u00E9 cr\u00E8me br\u00FBl\u00E9e club \u2014 a very long name to force folding over multiple lines \uD83D\uDE00\uD83D\uDE00\uD83D\uDE00', amount: 3, cycle: 'custom', every: 10, unit: 'day', anchor: '2026-10-07' }
  ],
  documents: [{ id: 'p1', name: 'Passport', type: 'passport', expiry: '2027-04-01', lead: 180 }]
};
const out = ICS.build(st, { now: NOW, money: (n) => '\u00A3' + n.toFixed(2) });

function unfold(s) { return s.replace(/\r\n[ \t]/g, ''); }
function events(s) {
  return unfold(s).split('BEGIN:VEVENT').slice(1).map((chunk) => {
    const props = {};
    chunk.split('END:VEVENT')[0].split('\r\n').filter(Boolean).forEach((line) => {
      if (/^(BEGIN|END):VALARM/.test(line)) return;
      const m = /^([A-Z-]+)((?:;[^:]*)?):(.*)$/.exec(line);
      if (m && !(m[1] in props)) props[m[1]] = m[3];
    });
    return props;
  });
}

test('uses CRLF everywhere and ends with CRLF', () => {
  assert.ok(out.endsWith('\r\n'));
  assert.equal(out.replace(/\r\n/g, '').includes('\n'), false);
  assert.equal(out.replace(/\r\n/g, '').includes('\r'), false);
});

test('every physical line is at most 75 octets and continuation lines start with a space', () => {
  const lines = out.split('\r\n').slice(0, -1);
  let folded = 0;
  for (const l of lines) {
    assert.ok(Buffer.byteLength(l, 'utf8') <= 75, `too long (${Buffer.byteLength(l)}): ${l}`);
    if (l.startsWith(' ')) folded++;
  }
  assert.ok(folded > 0, 'expected at least one folded line');
  // folding never splits a multi-byte character
  assert.equal(out.includes('\uFFFD'), false);
  assert.ok(unfold(out).includes('\uD83D\uDE00\uD83D\uDE00\uD83D\uDE00'));
});

test('foldLine round-trips', () => {
  const long = 'DESCRIPTION:' + 'é'.repeat(100) + 'x'.repeat(80);
  const f = ICS.foldLine(long);
  assert.equal(f.replace(/\r\n /g, ''), long);
  f.split('\r\n').forEach((l) => assert.ok(Buffer.byteLength(l) <= 75));
});

test('calendar structure and required properties', () => {
  const u = unfold(out);
  assert.ok(u.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:'));
  assert.ok(u.trimEnd().endsWith('END:VCALENDAR'));
  assert.equal((u.match(/BEGIN:VEVENT/g) || []).length, (u.match(/END:VEVENT/g) || []).length);
  assert.equal((u.match(/BEGIN:VALARM/g) || []).length, (u.match(/END:VALARM/g) || []).length);
  const evs = events(out);
  const uids = new Set();
  for (const e of evs) {
    assert.ok(e.UID && e.DTSTAMP && e.DTSTART && e.SUMMARY, JSON.stringify(e));
    assert.equal(e.DTSTAMP, '20261007T183000Z');
    assert.match(e.DTSTART, /^\d{8}$/);
    assert.ok(!uids.has(e.UID), 'duplicate UID');
    uids.add(e.UID);
  }
  // 6 active subs + trial + cancel-by + passport expiry + passport renew reminder
  assert.equal(evs.length, 10);
  assert.ok(!u.includes('Cancelled'));
});

test('text values are escaped', () => {
  const u = unfold(out);
  assert.ok(u.includes('Shared with family\\; ask Sam\\, Alex & Jo'));
  assert.ok(/DESCRIPTION:Monthly payment of £12\.99 \(TV & streaming\)\.\\nPaid with/.test(u));
});

test('RRULEs per cycle including month-end and leap day', () => {
  const evs = events(out);
  const r = (uid) => evs.find((e) => e.UID === uid).RRULE;
  assert.equal(r('sub-n1@ledgerly.app'), 'FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=28,29,30,31;BYSETPOS=-1');
  assert.equal(r('sub-w1@ledgerly.app'), 'FREQ=WEEKLY;INTERVAL=1');
  assert.equal(r('sub-y1@ledgerly.app'), 'FREQ=YEARLY;INTERVAL=1;BYMONTH=2;BYMONTHDAY=28,29;BYSETPOS=-1');
  assert.equal(r('sub-q1@ledgerly.app'), 'FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=28,29,30;BYSETPOS=-1;UNTIL=20271130');
  assert.equal(r('sub-e1@ledgerly.app'), 'FREQ=DAILY;INTERVAL=10');
  assert.equal(r('sub-t1@ledgerly.app'), 'FREQ=MONTHLY;INTERVAL=1');
});

test('alarms: lead days, same-day 9am, documents capped at 28 days', () => {
  const u = unfold(out);
  assert.ok(u.includes('TRIGGER:-P3D'));
  assert.ok(u.includes('TRIGGER:PT9H'));
  assert.ok(u.includes('TRIGGER:-P28D'));
  const evs = events(out);
  const renew = evs.find((e) => e.UID === 'docrenew-p1@ledgerly.app');
  assert.equal(renew.DTSTART, D.addDays('2027-04-01', -180).replace(/-/g, ''));
  assert.equal(renew.URL, 'https://www.gov.uk/renew-adult-passport');
});

/* A tiny RRULE expander for the subset Ledgerly emits, to prove calendar apps will
   show the same dates as Ledgerly's own engine (RFC 5545 BYMONTHDAY + BYSETPOS semantics). */
function expand(dtstart, rrule, count) {
  const parts = Object.fromEntries(rrule.split(';').map((p) => p.split('=')));
  const interval = +parts.INTERVAL || 1;
  const start = dtstart.slice(0, 4) + '-' + dtstart.slice(4, 6) + '-' + dtstart.slice(6, 8);
  const res = [];
  if (parts.FREQ === 'DAILY' || parts.FREQ === 'WEEKLY') {
    const step = parts.FREQ === 'DAILY' ? interval : interval * 7;
    for (let i = 0; res.length < count; i++) res.push(D.addDays(start, i * step));
    return res;
  }
  const p = D.parse(start);
  for (let i = 0; res.length < count && i < 1000; i++) {
    const months = parts.FREQ === 'YEARLY' ? i * 12 * interval : i * interval;
    const total = p.y * 12 + (p.m - 1) + months;
    let y = Math.floor(total / 12), m = total - y * 12 + 1;
    if (parts.BYMONTH) m = +parts.BYMONTH;
    const dim = D.daysInMonth(y, m);
    let cand;
    if (parts.BYMONTHDAY) {
      const set = parts.BYMONTHDAY.split(',').map(Number).filter((d) => d <= dim).sort((a, b) => a - b);
      const pos = +(parts.BYSETPOS || 0);
      if (!set.length) continue;
      cand = pos === -1 ? set[set.length - 1] : set[0];
    } else {
      if (p.d > dim) continue; // RFC 5545: invalid dates are skipped
      cand = p.d;
    }
    const d = D.fmt(y, m, cand);
    if (d >= start) res.push(d);
  }
  return res;
}

test('exported RRULEs expand to exactly the dates Ledgerly shows', () => {
  const cases = [
    { cycle: 'monthly', anchor: '2026-01-31' },
    { cycle: 'monthly', anchor: '2026-03-30' },
    { cycle: 'monthly', anchor: '2027-01-29' },
    { cycle: 'monthly', anchor: '2026-10-15' },
    { cycle: 'quarterly', anchor: '2025-08-31' },
    { cycle: 'yearly', anchor: '2024-02-29' },
    { cycle: 'yearly', anchor: '2026-03-31' },
    { cycle: 'weekly', anchor: '2026-10-07' },
    { cycle: 'custom', every: 2, unit: 'month', anchor: '2026-12-31' },
    { cycle: 'custom', every: 3, unit: 'week', anchor: '2026-10-07' },
    { cycle: 'custom', every: 2, unit: 'year', anchor: '2024-02-29' }
  ];
  for (const c of cases) {
    const rrule = ICS.rruleFor(c);
    const ours = D.occurrencesBetween(c, c.anchor, '2200-12-31', 40);
    const theirs = expand(c.anchor.replace(/-/g, ''), rrule, 40);
    assert.deepEqual(theirs, ours, JSON.stringify(c) + ' ' + rrule);
  }
});
