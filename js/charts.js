/* Ledgerly - hand-rolled SVG charts (donut + bar projection). No libraries. */
(function (root) {
  'use strict';
  var LG = root.LG, U = LG.U;

  /** Donut chart. data: [{label, value, color}] */
  function donut(data, opts) {
    opts = opts || {};
    var size = opts.size || 200, stroke = opts.thickness || 22;
    var r = (size - stroke) / 2, c = 2 * Math.PI * r, cx = size / 2;
    var total = data.reduce(function (s, d) { return s + d.value; }, 0);
    var gap = data.length > 1 ? Math.min(4, c * 0.01) : 0;
    var offset = 0;
    var segs = data.map(function (d, i) {
      var len = total ? (d.value / total) * c : 0;
      var dash = Math.max(0.001, len - gap);
      var s = '<circle class="donut__seg" data-index="' + i + '" cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="' + d.color + '" stroke-width="' + stroke +
        '" stroke-dasharray="' + dash.toFixed(2) + ' ' + (c - dash).toFixed(2) + '" stroke-dashoffset="' + (-offset).toFixed(2) + '"><title>' + U.esc(d.label + ': ' + U.money(d.value) + '/mo (' + Math.round((d.value / (total || 1)) * 100) + '%)') + '</title></circle>';
      offset += len;
      return s;
    }).join('');
    var maskId = 'dm' + Math.random().toString(36).slice(2, 7);
    return '<svg class="donut" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" role="img" aria-label="' + U.esc(opts.label || 'Spending by category') + '">' +
      '<defs><mask id="' + maskId + '"><circle class="donut__reveal" cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="#fff" stroke-width="' + (stroke + 2) + '" stroke-dasharray="' + c.toFixed(2) + '" style="--c:' + c.toFixed(2) + '" transform="rotate(-90 ' + cx + ' ' + cx + ')"/></mask></defs>' +
      '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" class="donut__track" stroke-width="' + stroke + '"/>' +
      '<g mask="url(#' + maskId + ')" transform="rotate(-90 ' + cx + ' ' + cx + ')">' + segs + '</g></svg>';
  }

  function niceMax(v) {
    if (v <= 0) return 10;
    var exp = Math.pow(10, Math.floor(Math.log10(v)));
    var f = v / exp;
    var nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return nice * exp;
  }

  /**
   * Bar chart drawn at the container's real pixel width so text stays crisp.
   * data: [{label, value, sub, highlight}]  opts: {height, average, onHover}
   */
  function bars(el, data, opts) {
    opts = opts || {};
    function draw() {
      var w = Math.max(280, Math.floor(el.clientWidth || 600));
      var h = opts.height || 220;
      var padL = 46, padR = 8, padT = 14, padB = 30;
      var iw = w - padL - padR, ih = h - padT - padB;
      var max = niceMax(Math.max.apply(null, data.map(function (d) { return d.value; }).concat([opts.average || 0, 1])));
      var bw = iw / data.length;
      var barW = Math.max(6, Math.min(34, bw * 0.56));
      var grid = '';
      for (var g = 0; g <= 4; g++) {
        var gy = padT + ih - (ih * g) / 4;
        grid += '<line class="chart__grid" x1="' + padL + '" x2="' + (w - padR) + '" y1="' + gy.toFixed(1) + '" y2="' + gy.toFixed(1) + '"/>';
        grid += '<text class="chart__axis" x="' + (padL - 8) + '" y="' + (gy + 4).toFixed(1) + '" text-anchor="end">' + U.esc(U.money((max * g) / 4, { compact: true })) + '</text>';
      }
      var barsSvg = data.map(function (d, i) {
        var x = padL + bw * i + (bw - barW) / 2;
        var bh = max ? (d.value / max) * ih : 0;
        var y = padT + ih - bh;
        var rad = Math.min(6, barW / 2, bh);
        var path = bh <= 0 ? '' : 'M' + x.toFixed(1) + ',' + (padT + ih).toFixed(1) + 'V' + (y + rad).toFixed(1) + 'Q' + x.toFixed(1) + ',' + y.toFixed(1) + ' ' + (x + rad).toFixed(1) + ',' + y.toFixed(1) +
          'H' + (x + barW - rad).toFixed(1) + 'Q' + (x + barW).toFixed(1) + ',' + y.toFixed(1) + ' ' + (x + barW).toFixed(1) + ',' + (y + rad).toFixed(1) + 'V' + (padT + ih).toFixed(1) + 'Z';
        return '<g class="chart__col' + (d.highlight ? ' is-hl' : '') + '" data-index="' + i + '">' +
          '<rect class="chart__hit" x="' + (padL + bw * i).toFixed(1) + '" y="' + padT + '" width="' + bw.toFixed(1) + '" height="' + ih + '"/>' +
          (path ? '<path class="chart__bar" style="--d:' + (i * 35) + 'ms" d="' + path + '"/>' : '') +
          '<text class="chart__label" x="' + (x + barW / 2).toFixed(1) + '" y="' + (h - 10) + '" text-anchor="middle">' + U.esc(bw < 30 ? d.label.charAt(0) : d.label) + '</text></g>';
      }).join('');
      var avg = '';
      if (opts.average) {
        var ay = padT + ih - (opts.average / max) * ih;
        avg = '<line class="chart__avg" x1="' + padL + '" x2="' + (w - padR) + '" y1="' + ay.toFixed(1) + '" y2="' + ay.toFixed(1) + '"/>';
      }
      el.innerHTML = '<svg class="chart" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + U.esc(opts.label || 'Bar chart') + '">' + grid + avg + barsSvg + '</svg><div class="chart__tip" role="status" hidden></div>';
      var tip = el.querySelector('.chart__tip');
      U.$$('.chart__col', el).forEach(function (col) {
        function show() {
          var d = data[+col.getAttribute('data-index')];
          U.$$('.chart__col', el).forEach(function (c) { c.classList.toggle('is-active', c === col); });
          tip.innerHTML = '<strong>' + U.esc(d.tipTitle || d.label) + '</strong><span>' + U.esc(U.money(d.value)) + '</span>' + (d.sub ? '<small>' + U.esc(d.sub) + '</small>' : '');
          tip.hidden = false;
          var i = +col.getAttribute('data-index');
          var x = padL + bw * i + bw / 2;
          var left = Math.max(70, Math.min(w - 70, x));
          tip.style.left = left + 'px';
        }
        col.addEventListener('mouseenter', show);
        col.addEventListener('click', show);
      });
      el.addEventListener('mouseleave', function () { tip.hidden = true; U.$$('.chart__col', el).forEach(function (c) { c.classList.remove('is-active'); }); });
    }
    draw();
    if (root.ResizeObserver) {
      var lastW = el.clientWidth;
      var ro = new ResizeObserver(U.debounce(function () {
        if (!el.isConnected) { ro.disconnect(); return; }
        if (Math.abs(el.clientWidth - lastW) > 4) { lastW = el.clientWidth; el.classList.add('no-anim'); draw(); }
      }, 120));
      ro.observe(el);
    }
  }

  LG.Charts = { donut: donut, bars: bars, niceMax: niceMax };
})(typeof self !== 'undefined' ? self : this);
