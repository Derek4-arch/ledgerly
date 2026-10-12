/* Ledgerly - a realistic UK sample household, generated relative to today */
(function (root) {
  'use strict';
  var LG = root.LG, D = LG.Dates;

  function build(today) {
    today = today || D.today();
    var p = D.parse(today);
    var thisKey = D.monthKey(today), lastKey = D.addMonthKey(thisKey, -1), prevKey = D.addMonthKey(thisKey, -2);
    // a start date `monthsAgo` months back on day-of-month `day` (clamped)
    function started(monthsAgo, day) { return D.addMonths(D.fmt(p.y, p.m, 1), -monthsAgo, day); }
    var n = 0;
    function id() { n++; return 'sample' + n; }
    function usage(a, b, c) { var u = {}; if (a !== undefined) u[prevKey] = a; if (b !== undefined) u[lastKey] = b; if (c !== undefined) u[thisKey] = c; return u; }
    var trialEnd = D.addDays(today, 3);

    var items = [
      { name: 'Netflix', serviceId: 'netflix', amount: 12.99, cycle: 'monthly', anchor: started(14, 18), category: 'entertainment', method: 'Visa \u2022\u2022 4821', usage: usage(10, 12),
        priceHistory: [{ date: D.addDays(today, -230), from: 10.99, to: 12.99 }] },
      { name: 'Spotify Premium', serviceId: 'spotify', amount: 12.99, cycle: 'monthly', anchor: started(20, 3), category: 'music', method: 'Monzo', usage: usage(25, 25) },
      { name: 'Apple Music', serviceId: 'applemusic', amount: 10.99, cycle: 'monthly', anchor: started(5, 22), category: 'music', method: 'Apple ID', usage: usage(2, 1), notes: 'Came free with AirPods, now paying.' },
      { name: 'iCloud+ (200GB)', serviceId: 'icloud', amount: 2.99, cycle: 'monthly', anchor: started(30, 9), category: 'software', method: 'Apple ID' },
      { name: 'Google One (100GB)', serviceId: 'googleone', amount: 1.99, cycle: 'monthly', anchor: started(11, 27), category: 'software', method: 'Google Pay' },
      { name: 'Amazon Prime', serviceId: 'prime', amount: 8.99, cycle: 'monthly', anchor: started(26, 12), category: 'shopping', method: 'Visa \u2022\u2022 4821', usage: usage(6, 4) },
      { name: 'Disney+', serviceId: 'disney', amount: 9.99, cycle: 'monthly', anchor: trialEnd, trialEnd: trialEnd, cancelBy: D.addDays(trialEnd, -1), category: 'entertainment', method: 'Visa \u2022\u2022 4821', notes: '7-day trial for the new series.' },
      { name: 'ChatGPT Plus', serviceId: 'chatgpt', amount: 20.00, cycle: 'monthly', anchor: started(8, 6), category: 'ai', method: 'Amex \u2022\u2022 1009', usage: usage(20, 18) },
      { name: 'PureGym', serviceId: 'puregym', amount: 24.99, cycle: 'monthly', anchor: started(12, 1), category: 'fitness', method: 'Direct Debit', usage: usage(3, 0, 0), notes: 'New Year resolution\u2026' },
      { name: 'Council Tax', serviceId: 'counciltax', amount: 176.40, cycle: 'monthly', anchor: started(6, 1), category: 'home', method: 'Direct Debit', notes: 'Band C, 10 instalments + 2 free months could be set up.' },
      { name: 'Gas & electricity', serviceId: 'energy', amount: 128.00, cycle: 'monthly', anchor: started(18, 15), category: 'home', method: 'Direct Debit' },
      { name: 'Broadband', serviceId: 'broadband', amount: 32.00, cycle: 'monthly', anchor: started(22, 20), category: 'phone', method: 'Direct Debit',
        priceHistory: [{ date: D.addDays(today, -170), from: 29.99, to: 32.00 }], notes: 'Contract ends next spring.' },
      { name: 'Mobile phone', serviceId: 'mobile', amount: 18.00, cycle: 'monthly', anchor: started(9, 25), category: 'phone', method: 'Direct Debit' },
      { name: 'Water', serviceId: 'water', amount: 41.50, cycle: 'monthly', anchor: started(15, 10), category: 'home', method: 'Direct Debit' },
      { name: 'TV Licence', serviceId: 'tvlicence', amount: 174.50, cycle: 'yearly', anchor: D.addDays(today, 54), category: 'home', method: 'Debit card' },
      { name: 'Car insurance', serviceId: 'carins', amount: 612.00, cycle: 'yearly', anchor: D.addDays(today, 41), category: 'insurance', method: 'Visa \u2022\u2022 4821', notes: 'Compare quotes 3-4 weeks before renewal.' },
      { name: 'Home insurance', serviceId: 'homeins', amount: 15.20, cycle: 'monthly', anchor: started(10, 14), category: 'insurance', method: 'Direct Debit' },
      { name: 'Veg box', amount: 21.50, cycle: 'custom', every: 2, unit: 'week', anchor: D.addDays(today, -((D.diffDays('2026-01-02', today) % 14 + 14) % 14) + 4), category: 'food', method: 'Visa \u2022\u2022 4821', trackUsage: false },
      { name: 'Headspace', serviceId: 'headspace', amount: 10.99, cycle: 'monthly', anchor: started(9, 4), category: 'fitness', status: 'cancelled', cancelledOn: D.addDays(today, -40), method: 'Apple ID' }
    ].map(function (it) { it.id = id(); it.createdAt = new Date().toISOString(); return it; });

    function y(years, days) { return D.addDays(D.addYears(today, years), days || 0); }
    var documents = [
      { name: 'Passport', type: 'passport', expiry: D.addDays(today, 152), lead: 180, ref: '\u2022\u2022\u2022\u20224417', notes: 'Renewing online takes about 3 weeks.' },
      { name: 'Driving licence', type: 'licence', expiry: y(4, 63), lead: 60 },
      { name: 'MOT \u2014 Ford Fiesta', type: 'mot', expiry: D.addDays(today, 19), lead: 30, ref: 'LK19 \u2022\u2022\u2022' },
      { name: 'Car tax', type: 'cartax', expiry: D.addDays(today, 85), lead: 14 },
      { name: 'Car insurance', type: 'carins', expiry: D.addDays(today, 41), lead: 28 },
      { name: 'Boiler service', type: 'boiler', expiry: D.addDays(today, -12), lead: 30 },
      { name: 'Dyson V15 warranty', type: 'warranty', expiry: y(1, 120), lead: 30 },
      { name: 'GHIC card', type: 'ghic', expiry: y(3, -20), lead: 60 }
    ].map(function (d) { d.id = id(); d.createdAt = new Date().toISOString(); return d; });

    return {
      settings: { name: 'Alex', currency: 'GBP', income: 2850, theme: (LG.Store.state && LG.Store.state.settings.theme) || 'system', remindDays: 3, notify: false, onboarded: true, sample: true },
      items: items, documents: documents, dismissedInsights: {}, notif: { read: {}, notified: {} }
    };
  }

  LG.Sample = { build: build };
})(typeof self !== 'undefined' ? self : this);
