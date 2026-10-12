'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const I = require('../js/insights.js');

const TODAY = '2026-10-15';
const money = (n) => '£' + n.toFixed(2);
function state(items, extra = {}) {
  return Object.assign({ settings: { income: null }, items, documents: [], dismissedInsights: {} }, extra);
}
const byType = (r, t) => r.insights.filter((i) => i.type === t);

test('duplicate music services are flagged with keep-the-priciest savings', () => {
  const r = I.compute(state([
    { id: 's', name: 'Spotify Premium', serviceId: 'spotify', amount: 12.99, cycle: 'monthly', anchor: '2026-10-20', category: 'music' },
    { id: 'a', name: 'Apple Music', serviceId: 'applemusic', amount: 10.99, cycle: 'monthly', anchor: '2026-10-03', category: 'music' }
  ]), TODAY, { money });
  const dup = byType(r, 'duplicate');
  assert.equal(dup.length, 1);
  assert.match(dup[0].title, /2 music streaming services overlap/);
  assert.ok(Math.abs(dup[0].saving - 131.88) < 1e-6);
  assert.match(dup[0].body, /Keeping just Spotify Premium/);
  assert.ok(dup[0].why.length > 10);
});

test('custom items are grouped by keyword (cloud storage)', () => {
  const r = I.compute(state([
    { id: '1', name: 'iCloud 2TB', amount: 8.99, cycle: 'monthly', anchor: '2026-10-20', category: 'software' },
    { id: '2', name: 'Google One', serviceId: 'googleone', amount: 1.99, cycle: 'monthly', anchor: '2026-10-20', category: 'software' }
  ]), TODAY, { money });
  assert.equal(byType(r, 'duplicate').length, 1);
});

test('two video services are fine, three are flagged', () => {
  const base = [
    { id: 'n', name: 'Netflix', serviceId: 'netflix', amount: 12.99, cycle: 'monthly', anchor: '2026-10-20', category: 'entertainment' },
    { id: 'd', name: 'Disney+', serviceId: 'disney', amount: 4.99, cycle: 'monthly', anchor: '2026-10-20', category: 'entertainment' }
  ];
  assert.equal(byType(I.compute(state(base), TODAY), 'duplicate').length, 0);
  const three = base.concat([{ id: 'p', name: 'Paramount+', serviceId: 'paramount', amount: 6.99, cycle: 'monthly', anchor: '2026-10-20', category: 'entertainment' }]);
  assert.equal(byType(I.compute(state(three), TODAY), 'duplicate').length, 1);
});

test('price rise insight shows % increase', () => {
  const r = I.compute(state([{ id: 'b', name: 'Broadband', amount: 32, cycle: 'monthly', anchor: '2026-10-20', category: 'phone',
    priceHistory: [{ date: '2026-04-01', from: 29.99, to: 32 }] }]), TODAY, { money });
  const p = byType(r, 'price');
  assert.equal(p.length, 1);
  assert.equal(p[0].title, 'Broadband went up 6.7%');
  assert.match(p[0].body, /£24\.12 more a year/);
});

test('old price rises (over a year) are ignored', () => {
  const r = I.compute(state([{ id: 'b', name: 'Broadband', amount: 32, cycle: 'monthly', anchor: '2026-10-20', priceHistory: [{ date: '2025-01-01', from: 29.99, to: 32 }] }]), TODAY);
  assert.equal(byType(r, 'price').length, 0);
});

test('trial ending within 14 days, high severity within 3', () => {
  const r = I.compute(state([{ id: 't', name: 'Disney+', amount: 9.99, cycle: 'monthly', anchor: '2026-10-17', trialEnd: '2026-10-17', category: 'entertainment' }]), TODAY, { money });
  const t = byType(r, 'trial');
  assert.equal(t.length, 1);
  assert.equal(t[0].severity, 'high');
  assert.match(t[0].title, /in 2 days/);
  assert.equal(r.insights[0].type, 'trial');
});

test('cancel-by reminders, upcoming and missed', () => {
  const r = I.compute(state([
    { id: 'x', name: 'Gym', amount: 35, cycle: 'monthly', anchor: '2026-10-28', cancelBy: '2026-10-20', category: 'fitness' },
    { id: 'y', name: 'Box', amount: 20, cycle: 'monthly', anchor: '2026-10-28', cancelBy: '2026-10-10', category: 'other' }
  ]), TODAY);
  assert.equal(byType(r, 'cancelby').length, 2);
});

test('annual plan suggestion uses library annual price', () => {
  const r = I.compute(state([{ id: 'd', name: 'Disney+', serviceId: 'disney', amount: 9.99, cycle: 'monthly', anchor: '2026-10-20', category: 'entertainment' }]), TODAY, { money });
  const a = byType(r, 'annual');
  assert.equal(a.length, 1);
  assert.ok(Math.abs(a[0].saving - (9.99 * 12 - 99.9)) < 1e-6);
});

test('unused subscription check-in and cost-per-use', () => {
  const r = I.compute(state([
    { id: 'g', name: 'Gym', amount: 35, cycle: 'monthly', anchor: '2026-10-28', category: 'fitness', usage: { '2026-09': 0, '2026-10': 0 } },
    { id: 'c', name: 'Cinema club', amount: 18, cycle: 'monthly', anchor: '2026-10-28', category: 'entertainment', usage: { '2026-09': 2 } }
  ]), TODAY, { money });
  const u = byType(r, 'unused');
  assert.equal(u.length, 1);
  assert.equal(u[0].severity, 'high');
  assert.ok(Math.abs(u[0].saving - 420) < 1e-6);
  const cpu = byType(r, 'costperuse');
  assert.equal(cpu.length, 1);
  assert.match(cpu[0].title, /£9\.00/);
});

test('potential savings never double counts an item', () => {
  const items = [
    { id: 's', name: 'Spotify Premium', serviceId: 'spotify', amount: 12.99, cycle: 'monthly', anchor: '2026-10-20', category: 'music' },
    { id: 'a', name: 'Apple Music', serviceId: 'applemusic', amount: 10.99, cycle: 'monthly', anchor: '2026-10-20', category: 'music', usage: { '2026-10': 0 } }
  ];
  const r = I.compute(state(items), TODAY, { money });
  // Apple Music: duplicate (131.88), unused (131.88) and annual (131.88 - 109 = 22.88) -> counted once at 131.88
  assert.ok(Math.abs(r.potentialSavings - 131.88) < 1e-6, String(r.potentialSavings));
});

test('dismissed insights are hidden and excluded from savings', () => {
  const items = [
    { id: 's', name: 'Spotify Premium', serviceId: 'spotify', amount: 12.99, cycle: 'monthly', anchor: '2026-10-20', category: 'music' },
    { id: 'a', name: 'Apple Music', serviceId: 'applemusic', amount: 10.99, cycle: 'monthly', anchor: '2026-10-20', category: 'music' }
  ];
  const first = I.compute(state(items), TODAY);
  const dupId = byType(first, 'duplicate')[0].id;
  const r = I.compute(state(items, { dismissedInsights: { [dupId]: TODAY } }), TODAY);
  assert.equal(byType(r, 'duplicate').length, 0);
  assert.equal(r.dismissedCount, 1);
  assert.ok(Math.abs(r.potentialSavings - (10.99 * 12 - 109)) < 1e-6);
});

test('budget and renewal insights', () => {
  const r = I.compute(state([{ id: 'r', name: 'Rent', amount: 1500, cycle: 'monthly', anchor: '2026-11-01', category: 'home' }], {
    settings: { income: 2000 },
    documents: [
      { id: 'p', name: 'Passport', type: 'passport', expiry: '2027-02-01', lead: 180 },
      { id: 'm', name: 'MOT', type: 'mot', expiry: '2026-10-01', lead: 30 },
      { id: 'l', name: 'Licence', type: 'licence', expiry: '2030-01-01', lead: 60 }
    ]
  }), TODAY);
  assert.equal(byType(r, 'budget')[0].title, 'Bills take 75% of your income');
  const ren = byType(r, 'renewal')[0];
  assert.equal(ren.severity, 'high');
  assert.deepEqual(ren.docIds, ['m', 'p']);
});

test('document status chips', () => {
  assert.equal(I.docStatus({ expiry: '2026-10-14', lead: 30 }, TODAY).status, 'expired');
  assert.equal(I.docStatus({ expiry: '2026-11-01', lead: 30 }, TODAY).status, 'soon');
  assert.equal(I.docStatus({ expiry: '2027-11-01', lead: 30 }, TODAY).status, 'ok');
  assert.equal(I.docStatus({ expiry: '2026-10-15', lead: 0 }, TODAY).status, 'soon');
});

test('check-ins: ask about last month early in the month, skip bills and trials', () => {
  const items = [
    { id: 'n', name: 'Netflix', amount: 12.99, cycle: 'monthly', anchor: '2026-09-20', category: 'entertainment' },
    { id: 'c', name: 'Council Tax', amount: 180, cycle: 'monthly', anchor: '2026-09-01', category: 'home' },
    { id: 't', name: 'Trial', amount: 5, cycle: 'monthly', anchor: '2026-10-20', trialEnd: '2026-10-20', category: 'software' },
    { id: 'd', name: 'Done', amount: 5, cycle: 'monthly', anchor: '2026-09-01', category: 'software', usage: { '2026-09': 3 } }
  ];
  assert.equal(I.checkinMonth('2026-10-03'), '2026-09');
  assert.equal(I.checkinMonth('2026-10-15'), '2026-10');
  assert.deepEqual(I.checkinsDue(items, '2026-10-03').map((x) => x.item.id), ['n']);
});
