'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../js/dates.js');

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('leap years follow Gregorian rules', () => {
  assert.equal(D.isLeap(2024), true);
  assert.equal(D.isLeap(2025), false);
  assert.equal(D.isLeap(1900), false);
  assert.equal(D.isLeap(2000), true);
  assert.equal(D.daysInMonth(2024, 2), 29);
  assert.equal(D.daysInMonth(2026, 2), 28);
});

test('parse rejects impossible dates', () => {
  assert.equal(D.parse('2026-02-29'), null);
  assert.equal(D.parse('2026-13-01'), null);
  assert.equal(D.parse('nonsense'), null);
  assert.deepEqual(D.parse('2028-02-29'), { y: 2028, m: 2, d: 29 });
});

test('addDays crosses month, year and DST boundaries', () => {
  assert.equal(D.addDays('2026-03-28', 2), '2026-03-30'); // UK clocks change 29 Mar 2026
  assert.equal(D.addDays('2026-10-24', 7), '2026-10-31');
  assert.equal(D.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(D.addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(D.diffDays('2026-01-01', '2027-01-01'), 365);
});

test('weekday is Monday-based', () => {
  assert.equal(D.weekday('2026-10-05'), 0); // Monday
  assert.equal(D.weekday('2026-10-07'), 2); // Wednesday
  assert.equal(D.weekday('2026-10-11'), 6); // Sunday
});

test('monthly on the 31st clamps to month end and returns to the 31st (no drift)', () => {
  const item = { cycle: 'monthly', anchor: '2026-01-31' };
  const occ = D.occurrencesBetween(item, '2026-01-01', '2026-12-31');
  assert.deepEqual(occ, ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31', '2026-06-30',
    '2026-07-31', '2026-08-31', '2026-09-30', '2026-10-31', '2026-11-30', '2026-12-31']);
});

test('monthly on the 31st uses 29 Feb in a leap year', () => {
  const occ = D.occurrencesBetween({ cycle: 'monthly', anchor: '2027-12-31' }, '2028-02-01', '2028-03-31');
  assert.deepEqual(occ, ['2028-02-29', '2028-03-31']);
});

test('monthly on the 30th and 29th', () => {
  assert.deepEqual(D.occurrencesBetween({ cycle: 'monthly', anchor: '2026-01-30' }, '2026-02-01', '2026-03-31'), ['2026-02-28', '2026-03-30']);
  assert.deepEqual(D.occurrencesBetween({ cycle: 'monthly', anchor: '2026-01-29' }, '2026-02-01', '2026-03-31'), ['2026-02-28', '2026-03-29']);
});

test('yearly on 29 Feb falls on 28 Feb in common years and returns in leap years', () => {
  const item = { cycle: 'yearly', anchor: '2024-02-29' };
  assert.deepEqual(D.occurrencesBetween(item, '2024-01-01', '2029-01-01'), ['2024-02-29', '2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29']);
});

test('quarterly from 30 Nov', () => {
  const occ = D.occurrencesBetween({ cycle: 'quarterly', anchor: '2025-11-30' }, '2025-11-01', '2026-12-31');
  assert.deepEqual(occ, ['2025-11-30', '2026-02-28', '2026-05-30', '2026-08-30', '2026-11-30']);
});

test('weekly and custom cycles', () => {
  assert.deepEqual(D.occurrencesBetween({ cycle: 'weekly', anchor: '2026-10-01' }, '2026-10-01', '2026-10-31'),
    ['2026-10-01', '2026-10-08', '2026-10-15', '2026-10-22', '2026-10-29']);
  assert.deepEqual(D.occurrencesBetween({ cycle: 'custom', every: 2, unit: 'week', anchor: '2026-10-02' }, '2026-10-01', '2026-11-15'),
    ['2026-10-02', '2026-10-16', '2026-10-30', '2026-11-13']);
  assert.deepEqual(D.occurrencesBetween({ cycle: 'custom', every: 10, unit: 'day', anchor: '2026-12-25' }, '2026-12-01', '2027-01-20'),
    ['2026-12-25', '2027-01-04', '2027-01-14']);
  assert.deepEqual(D.occurrencesBetween({ cycle: 'custom', every: 6, unit: 'month', anchor: '2026-08-31' }, '2026-01-01', '2028-01-01'),
    ['2026-08-31', '2027-02-28', '2027-08-31']);
  assert.deepEqual(D.occurrencesBetween({ cycle: 'custom', every: 2, unit: 'year', anchor: '2024-02-29' }, '2024-01-01', '2031-01-01'),
    ['2024-02-29', '2026-02-28', '2028-02-29', '2030-02-28']);
});

test('no occurrences before the anchor, none after endDate', () => {
  const item = { cycle: 'monthly', anchor: '2026-06-15', endDate: '2026-09-15' };
  assert.deepEqual(D.occurrencesBetween(item, '2026-01-01', '2026-12-31'), ['2026-06-15', '2026-07-15', '2026-08-15', '2026-09-15']);
  assert.equal(D.nextOccurrence(item, '2026-09-16'), null);
});

test('nextOccurrence finds the first date on/after a day, far from the anchor', () => {
  assert.equal(D.nextOccurrence({ cycle: 'monthly', anchor: '2020-01-31' }, '2026-02-01'), '2026-02-28');
  assert.equal(D.nextOccurrence({ cycle: 'monthly', anchor: '2020-01-31' }, '2026-02-28'), '2026-02-28');
  assert.equal(D.nextOccurrence({ cycle: 'weekly', anchor: '2026-01-05' }, '2026-10-07'), '2026-10-12');
  assert.equal(D.nextOccurrence({ cycle: 'yearly', anchor: '2026-12-01' }, '2026-10-07'), '2026-12-01');
  assert.deepEqual(D.nextOccurrences({ cycle: 'monthly', anchor: '2026-01-31' }, '2026-02-01', 3), ['2026-02-28', '2026-03-31', '2026-04-30']);
});

test('jumping straight to a far range matches stepping through it', () => {
  const item = { cycle: 'monthly', anchor: '2019-05-31' };
  const all = D.occurrencesBetween(item, '2019-01-01', '2035-12-31');
  const slice = D.occurrencesBetween(item, '2031-02-01', '2031-07-31');
  assert.deepEqual(slice, all.filter((d) => d >= '2031-02-01' && d <= '2031-07-31'));
  assert.equal(all.length, 12 * 16 + 8);
});

test('monthly and yearly equivalents for every cycle', () => {
  close(D.monthlyEquivalent({ cycle: 'monthly', amount: 12.99 }), 12.99);
  close(D.yearlyEquivalent({ cycle: 'monthly', amount: 12.99 }), 155.88);
  close(D.monthlyEquivalent({ cycle: 'yearly', amount: 174.5 }), 174.5 / 12);
  close(D.monthlyEquivalent({ cycle: 'quarterly', amount: 30 }), 10);
  close(D.yearlyEquivalent({ cycle: 'weekly', amount: 10 }), 10 * 365.2425 / 7);
  close(D.monthlyEquivalent({ cycle: 'weekly', amount: 7 }), 365.2425 / 12);
  close(D.yearlyEquivalent({ cycle: 'custom', every: 2, unit: 'week', amount: 20 }), 20 * 365.2425 / 14);
  close(D.yearlyEquivalent({ cycle: 'custom', every: 6, unit: 'month', amount: 50 }), 100);
  close(D.yearlyEquivalent({ cycle: 'custom', every: 2, unit: 'year', amount: 80 }), 40);
  close(D.yearlyEquivalent({ cycle: 'custom', every: 1, unit: 'day', amount: 1 }), 365.2425);
  assert.equal(D.monthlyEquivalent({ cycle: 'bogus', amount: 5 }), 0);
});

test('labels and relative dates', () => {
  assert.equal(D.cycleLabel({ cycle: 'custom', every: 2, unit: 'week' }), 'Every 2 weeks');
  assert.equal(D.cycleLabel({ cycle: 'quarterly' }), 'Quarterly');
  assert.equal(D.formatDate('2026-10-07', { weekday: true }), 'Wed 7 Oct 2026');
  assert.equal(D.relative('2026-10-08', '2026-10-07'), 'tomorrow');
  assert.equal(D.relative('2026-10-17', '2026-10-07'), 'in 10 days');
  assert.equal(D.relative('2026-10-04', '2026-10-07'), '3 days ago');
});
