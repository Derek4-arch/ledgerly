'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../js/finance.js');

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const items = [
  { id: 'a', name: 'Netflix', amount: 12.99, cycle: 'monthly', anchor: '2026-10-15', category: 'entertainment' },
  { id: 'b', name: 'TV Licence', amount: 174.5, cycle: 'yearly', anchor: '2027-03-01', category: 'home' },
  { id: 'c', name: 'Veg box', amount: 20, cycle: 'weekly', anchor: '2026-10-09', category: 'food' },
  { id: 'd', name: 'Paused gym', amount: 35, cycle: 'monthly', anchor: '2026-10-01', category: 'fitness', status: 'paused' },
  { id: 'e', name: 'Old app', amount: 5, cycle: 'monthly', anchor: '2026-01-01', category: 'software', status: 'cancelled' },
  { id: 'f', name: 'Water', amount: 120, cycle: 'quarterly', anchor: '2026-11-30', category: 'home' }
];

test('totals ignore paused and cancelled items', () => {
  const t = F.totals(items, '2026-10-07');
  close(t.monthly, 12.99 + 174.5 / 12 + 20 * 365.2425 / 84 + 40);
  close(t.yearly, t.monthly * 12);
  assert.equal(t.count, 4);
});

test('items whose end date has passed stop counting', () => {
  const t = F.totals([{ amount: 10, cycle: 'monthly', anchor: '2026-01-01', endDate: '2026-06-01' }], '2026-10-07');
  assert.equal(t.count, 0);
});

test('cancelled savings', () => close(F.cancelledSavings(items), 60));

test('category split is sorted and sums to monthly total', () => {
  const cats = F.byCategory(items, '2026-10-07');
  assert.equal(cats[0].id, 'food'); // 20/week ≈ 86.97/mo beats home (54.54/mo)
  assert.equal(cats[1].id, 'home');
  close(cats.reduce((s, c) => s + c.monthly, 0), F.totals(items, '2026-10-07').monthly);
});

test('upcoming within 7 and 30 days', () => {
  const seven = F.upcoming(items, '2026-10-07', 7);
  assert.deepEqual(seven.map((x) => x.item.id + '@' + x.date), ['c@2026-10-09']);
  const thirty = F.upcoming(items, '2026-10-07', 30);
  assert.deepEqual(thirty.map((x) => x.date), ['2026-10-09', '2026-10-15', '2026-10-16', '2026-10-23', '2026-10-30']);
  close(F.sumAmounts(thirty), 12.99 + 80);
});

test('12-month projection shows lumpy yearly and quarterly bills', () => {
  const p = F.projection(items, '2026-10', 12);
  assert.equal(p.length, 12);
  assert.equal(p[0].key, '2026-10');
  assert.equal(p[11].key, '2027-09');
  const march = p.find((m) => m.key === '2027-03');
  // Netflix + TV licence + 4 or 5 veg boxes
  assert.ok(march.total > 174.5 + 12.99);
  const nov = p.find((m) => m.key === '2026-11');
  assert.ok(nov.total >= 12.99 + 120 + 80);
  close(p.reduce((s, m) => s + m.total, 0), 12.99 * 12 + 174.5 + 120 * 4 + 20 * 52, 20.01);
});

test('money left after bills', () => {
  assert.equal(F.leftAfterBills(null, 100), null);
  assert.equal(F.leftAfterBills(2000, 750.5), 1249.5);
});

test('price change percentage and yearly delta', () => {
  const ch = F.lastPriceChange({ cycle: 'monthly', priceHistory: [{ date: '2025-04-01', from: 28, to: 29.99 }, { date: '2026-04-01', from: 29.99, to: 32 }] });
  close(ch.pct, (2.01 / 29.99) * 100);
  close(ch.yearlyDelta, 24.12);
  assert.equal(F.lastPriceChange({ priceHistory: [] }), null);
});

test('round2', () => {
  assert.equal(F.round2(1.005), 1.01);
  assert.equal(F.round2(155.88000001), 155.88);
});
