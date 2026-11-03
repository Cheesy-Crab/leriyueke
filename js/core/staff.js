/* =========================================================
   五线谱 SVG 渲染
   ---------------------------------------------------------
   pos 约定：0 = 谱表最下面那条线（高音谱表是 E4），
   每 +1 = 向上半个间距（一间或一线）。
   目前支持高音/低音谱号，后续加调号、临时记号时在这里扩。
   ========================================================= */

(function (PC) {
  'use strict';

  var CLEFS = {
    treble: {
      src: 'assets/treble-clef.png',
      aspect: 0.4536,   // 素材宽高比
      height: 7.05,     // 以「间距」为单位的高度
      curl: 0.705,      // 谱号螺旋中心在素材高度中的位置
      gap: 18           // 谱号右边缘与第一条线之间的距离
    },
    bass: {
      src: 'assets/bass-clef.png',
      aspect: 0.9464,
      height: 5.1,
      curl: 0.60,
      gap: 6
    }
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /**
   * 渲染一张五线谱。
   * opts: {
   *   clef, space(=16), top(=62), width, height,
   *   x1, x2, notes:[{pos, x?}], label, color
   * }
   */
  function render(opts) {
    opts = opts || {};

    var clefName = opts.clef === 'bass' ? 'bass' : 'treble';
    var clef = CLEFS[clefName];
    var space = opts.space || 16;
    var top = opts.top != null ? opts.top : 62;
    var width = opts.width || 560;
    var height = opts.height || 230;
    var bottom = top + space * 4;

    var x1 = opts.x1 != null ? opts.x1 : (clefName === 'bass' ? 122 : 104);
    var x2 = opts.x2 != null ? opts.x2 : width - 26;
    var notes = opts.notes || [];

    var out = [];
    out.push(
      '<svg class="staff-svg" viewBox="0 0 ' + width + ' ' + height + '" ' +
      'preserveAspectRatio="xMidYMid meet" role="img" aria-label="' +
      esc(opts.label || '五线谱') + '">'
    );

    // 五条线
    for (var i = 0; i < 5; i++) {
      var ly = top + i * space;
      out.push(
        '<line x1="' + x1 + '" y1="' + ly + '" x2="' + x2 + '" y2="' + ly + '" ' +
        'stroke="currentColor" stroke-opacity=".72" stroke-width="1.5" />'
      );
    }

    // 谱号
    var ch = clef.height * space;
    var cw = ch * clef.aspect;
    var ctop = bottom - ch * clef.curl;
    var cx = x1 - cw - clef.gap;
    out.push(
      '<image href="' + clef.src + '" x="' + cx.toFixed(1) + '" y="' + ctop.toFixed(1) +
      '" width="' + cw.toFixed(1) + '" height="' + ch.toFixed(1) +
      '" preserveAspectRatio="xMidYMid meet" opacity=".93" />'
    );

    // 音符
    notes.forEach(function (n, idx) {
      if (!n || typeof n.pos !== 'number') return;
      var x = n.x != null ? n.x : defaultX(idx);
      var y = bottom - n.pos * (space / 2);
      var half = space * 1.95;

      // 加线
      if (n.pos <= -2) {
        for (var p = -2; p >= n.pos; p -= 2) {
          var ly2 = bottom - p * (space / 2);
          out.push(
            '<line x1="' + (x - half) + '" y1="' + ly2 + '" x2="' + (x + half) +
            '" y2="' + ly2 + '" stroke="currentColor" stroke-opacity=".8" stroke-width="1.5" />'
          );
        }
      } else if (n.pos >= 10) {
        for (var q = 10; q <= n.pos; q += 2) {
          var ly3 = bottom - q * (space / 2);
          out.push(
            '<line x1="' + (x - half) + '" y1="' + ly3 + '" x2="' + (x + half) +
            '" y2="' + ly3 + '" stroke="currentColor" stroke-opacity=".8" stroke-width="1.5" />'
          );
        }
      }

      // 符头（倾斜的椭圆），符干
      var rx = space * 0.555;
      var ry = space * 0.415;
      var up = n.pos < 4;
      var stemX = up ? x + rx * 0.92 : x - rx * 0.92;
      var stemLen = space * 3.3;

      out.push('<g transform="translate(' + x + ' ' + y + ') rotate(-21)">' +
        '<ellipse rx="' + rx.toFixed(2) + '" ry="' + ry.toFixed(2) + '" fill="currentColor" /></g>');
      out.push('<line x1="' + stemX.toFixed(1) + '" y1="' + (y + (up ? -1 : 1)).toFixed(1) +
        '" x2="' + stemX.toFixed(1) + '" y2="' + (y + (up ? -stemLen : stemLen)).toFixed(1) +
        '" stroke="currentColor" stroke-width="' + Math.max(1.7, space * 0.125).toFixed(2) +
        '" stroke-linecap="round" />');
    });

    out.push('</svg>');
    return out.join('');

    function defaultX(idx) {
      if (notes.length <= 1) return x1 + (x2 - x1) * 0.58;
      var pad = space * 2.4;
      var step = (x2 - x1 - pad * 2) / (notes.length - 1);
      return x1 + pad + step * idx;
    }
  }

  PC.staff = { render: render, CLEFS: CLEFS };
})(window.PC = window.PC || {});
