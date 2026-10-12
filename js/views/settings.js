/* Ledgerly - settings, data & privacy */
(function (root) {
  'use strict';
  var LG = root.LG, U = LG.U, D = LG.Dates, L = LG.Library, V = LG.V;

  function section(title, desc, body, icon) {
    return '<section class="card set-card"><div class="set-card__head"><span class="set-card__icon">' + U.icon(icon || 'settings', 18) + '</span><div><h2 class="card__title">' + title + '</h2>' + (desc ? '<p class="muted small">' + desc + '</p>' : '') + '</div></div><div class="set-card__body">' + body + '</div></section>';
  }
  function row(label, hint, control, forId) {
    return '<div class="set-row"><div class="set-row__text">' + (forId ? '<label for="' + forId + '" class="set-row__label">' + label + '</label>' : '<span class="set-row__label">' + label + '</span>') + (hint ? '<span class="set-row__hint">' + hint + '</span>' : '') + '</div><div class="set-row__control">' + control + '</div></div>';
  }

  function render() {
    var st = V.state(), s = st.settings;
    var perm = LG.Notify.permission();
    var http = location.protocol.indexOf('http') === 0;
    var bytes = 0;
    try { bytes = new Blob([JSON.stringify(st)]).size; } catch (e) { /* ignore */ }
    var notifControl = perm === 'unsupported' ? '<span class="chip chip--muted">Not supported here</span>'
      : perm === 'denied' ? '<span class="chip chip--danger">Blocked in browser</span>'
      : '<input type="checkbox" class="switch" role="switch" id="set-notify" data-change="set-notify" aria-label="Browser notifications"' + (s.notify && perm === 'granted' ? ' checked' : '') + '>';

    var html = V.pageHead('Settings', 'Make Ledgerly yours. Everything here stays on this device.', '') + '<div class="settings-grid">' +
      section('Profile & money', 'Used for greetings and the \u201Cleft after bills\u201D figure.',
        row('First name', 'Optional', '<input class="input" id="set-name" data-change="set-name" value="' + U.esc(s.name) + '" maxlength="40" placeholder="Your name" autocomplete="given-name">', 'set-name') +
        row('Monthly take-home income', 'Optional. Leave blank to hide.', '<div class="input-affix"><span class="input-affix__pre">' + U.esc(U.currencySymbol()) + '</span><input class="input" id="set-income" type="number" min="0" step="0.01" inputmode="decimal" data-change="set-income" value="' + (s.income === null ? '' : s.income) + '" placeholder="e.g. 2400"></div>', 'set-income') +
        row('Currency', 'Changes how amounts are shown. Amounts are not converted.', '<select class="input" id="set-currency" data-change="set-currency">' + L.CURRENCIES.map(function (c) { return '<option value="' + c.code + '"' + (c.code === s.currency ? ' selected' : '') + '>' + c.code + ' \u2014 ' + U.esc(c.name) + '</option>'; }).join('') + '</select>', 'set-currency'), 'wallet') +
      section('Appearance', 'Light, dark or follow your device.',
        row('Theme', 'Shortcut: T', V.segmented('theme', [{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }], s.theme, { small: true, label: 'Theme', action: 'set-theme' })), 'sun') +
      section('Reminders', 'In-app reminders always work. System notifications show while Ledgerly is open.',
        row('Default reminder', 'For bills without their own setting', '<select class="input" id="set-remind" data-change="set-remind">' + [0, 1, 2, 3, 5, 7, 14].map(function (n) { return '<option value="' + n + '"' + (n === s.remindDays ? ' selected' : '') + '>' + (n === 0 ? 'On the day' : n + ' day' + (n > 1 ? 's' : '') + ' before') + '</option>'; }).join('') + '</select>', 'set-remind') +
        row('Browser notifications', perm === 'denied' ? 'Allow notifications for this page in your browser\u2019s site settings, then reload.' : 'We\u2019ll ask your browser for permission first.', notifControl, perm === 'default' || perm === 'granted' ? 'set-notify' : null) +
        (perm === 'granted' && s.notify ? row('Test it', '', V.btn('Send a test notification', { action: 'test-notify', icon: 'bell', cls: 'btn--ghost btn--sm' })) : ''), 'bell') +
      section('Calendar sync', 'Download an .ics file with every payment, trial and renewal \u2014 with alerts.',
        '<div class="set-actions">' + V.btn('Download calendar (.ics)', { action: 'export-ics', icon: 'calendar', cls: 'btn--primary' }) + '</div>' +
        '<details class="howto"><summary>How to add it to Google or Outlook</summary><ol><li><strong>Google Calendar:</strong> on a computer open calendar.google.com \u2192 Settings \u2192 Import & export \u2192 choose the file \u2192 Import.</li><li><strong>Outlook:</strong> Calendar \u2192 Add calendar \u2192 Upload from file \u2192 choose the file.</li><li><strong>Apple Calendar:</strong> double-click the file and choose a calendar.</li></ol><p class="muted small">Re-import after big changes; events keep the same IDs so they update rather than duplicate in most apps.</p></details>', 'calendar') +
      section('Your data', 'Back up, move to another device, or take your data to a spreadsheet.',
        '<div class="set-actions">' + V.btn('Export backup (JSON)', { action: 'export-json', icon: 'download' }) +
        '<label class="btn btn--ghost file-btn">' + U.icon('upload', 18) + '<span>Import backup</span><input type="file" accept="application/json,.json" data-change="import-json" class="sr-only"></label>' +
        V.btn('Subscriptions CSV', { action: 'export-csv-items', icon: 'download' }) + V.btn('Renewals CSV', { action: 'export-csv-docs', icon: 'download' }) + '</div>' +
        '<div class="set-actions set-actions--split">' + V.btn('Load sample data', { action: 'load-sample', icon: 'sparkle' }) + V.btn('Clear all data', { action: 'clear-all', icon: 'trash', cls: 'btn--danger-ghost' }) + '</div>', 'layers') +
      section('Privacy', '',
        '<div class="privacy"><p><strong>Your data never leaves this device.</strong> Ledgerly has no server, no account and no tracking. Everything is saved in this browser\u2019s local storage' + (LG.Store.isPersistent() ? '' : ' <span class="chip chip--warn">storage blocked \u2014 changes won\u2019t persist</span>') + '.</p>' +
        '<ul class="privacy__list"><li>' + U.icon('lock', 16) + 'No sign-up, no cookies, no analytics.</li><li>' + U.icon('wallet', 16) + 'No bank connection needed \u2014 you stay in control.</li><li>' + U.icon('download', 16) + 'Export or delete everything at any time.</li></ul>' +
        '<p class="muted small">Currently storing ' + st.items.length + ' subscriptions and ' + st.documents.length + ' renewals (' + (bytes / 1024).toFixed(1) + ' KB). Clearing your browser data will erase it, so keep a backup.</p></div>', 'lock') +
      section('Install as an app', http ? 'Works offline once installed.' : 'Run start.bat to install Ledgerly as an app.',
        (http ? (LG.App.canInstall() ? '<div class="set-actions">' + V.btn('Install Ledgerly', { action: 'install-app', icon: 'download', cls: 'btn--primary' }) + '</div>' : '<p class="muted small">' + (LG.App.isStandalone() ? 'Ledgerly is installed. ' : 'Use your browser\u2019s menu \u2192 \u201CInstall Ledgerly\u201D (or \u201CAdd to Home Screen\u201D on a phone). ') + 'Offline mode: ' + (navigator.serviceWorker && navigator.serviceWorker.controller ? '<span class="chip chip--ok">ready</span>' : '<span class="chip chip--muted">preparing</span>') + '</p>')
          : '<p class="muted small">You opened Ledgerly straight from a file, which works great. To install it as an app with offline support, double-click <code>start.bat</code> in the Ledgerly folder (needs Node.js) and use the browser\u2019s Install button.</p>'), 'download') +
      section('Help', '', '<div class="set-actions">' + V.btn('Keyboard shortcuts', { action: 'shortcuts', icon: 'keyboard' }) + V.btn('Replay welcome', { href: '#/welcome', icon: 'sparkle' }) + '</div><p class="muted small">Ledgerly 1.0 \u00B7 made to run fully offline.</p>', 'info') +
      '</div>';
    return html;
  }

  LG.App.on('set-name', function (el) { LG.Store.setSettings({ name: el.value.trim().slice(0, 40) }); LG.UI.toast('Name saved'); });
  LG.App.on('set-income', function (el) {
    var v = el.value.trim();
    if (v !== '' && !(Number(v) >= 0)) { LG.UI.toast('Income must be a positive number', { tone: 'error' }); return; }
    LG.Store.setSettings({ income: v === '' ? null : Number(v) });
    LG.UI.toast(v === '' ? 'Income removed' : 'Income saved');
  });
  LG.App.on('set-currency', function (el) { LG.Store.setSettings({ currency: el.value }); U.clearFormatCache(); LG.UI.toast('Showing amounts in ' + el.value); });
  LG.App.on('set-theme', function (el) { LG.App.setTheme(el.value); });
  LG.App.on('set-remind', function (el) { LG.Store.setSettings({ remindDays: Number(el.value) }); LG.UI.toast('Default reminder updated'); });
  LG.App.on('set-notify', function (el) {
    if (el.checked) LG.App.enableNotifications();
    else { LG.Store.setSettings({ notify: false }); LG.UI.toast('Browser notifications off'); }
  });
  LG.App.on('test-notify', function () { LG.Notify.show({ key: 'test-' + Date.now(), title: 'Ledgerly is set up', body: 'This is what a reminder looks like.' }); });
  LG.App.on('shortcuts', function () { LG.Sheets.shortcuts(); });

  LG.Views.settings = { title: 'Settings', render: render };
})(typeof self !== 'undefined' ? self : this);
