/* =========================================================
   音源
   ---------------------------------------------------------
   用运行时合成的 WAV + <audio> 播放，而不是 Web Audio：
   - iPhone 静音键会掐掉 Web Audio（ambient 通道），但媒体播放
     走 playback 通道，不受静音键影响；
   - 微信 / QQ 内置浏览器、部分 WebView 对 Web Audio 的支持也更差；
   - 首次播放发生在点击答题的手势里，符合 iOS 的播放策略。
   浏览器不支持 Blob 时再退回 Web Audio。
   ========================================================= */

(function (PC) {
  'use strict';

  var SAMPLE_RATE = 22050;
  var players = Object.create(null);   // key -> HTMLAudioElement
  var webCtx = null;
  var canUseAudio = !!(window.URL && window.URL.createObjectURL) && typeof Audio !== 'undefined';

  function enabled() {
    return !!(PC.store && PC.store.state.settings.sound);
  }

  /** iOS 16.4+ 可以把音频会话声明成 playback，进一步确保不被静音键影响 */
  function setSession() {
    try {
      if (navigator.audioSession && navigator.audioSession.type !== 'playback') {
        navigator.audioSession.type = 'playback';
      }
    } catch (e) { /* 不支持就算了 */ }
  }

  function writeString(view, offset, str) {
    for (var i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  /**
   * 合成一小段单声道 16-bit WAV。
   * kind: 'note' 钢琴骨架音 / 'thud' 答错的下坠声
   */
  function makeWav(freq, dur, kind) {
    var sr = SAMPLE_RATE;
    var n = Math.max(1, Math.floor(sr * dur));
    var buffer = new ArrayBuffer(44 + n * 2);
    var view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + n * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);          // PCM
    view.setUint16(22, 1, true);          // 单声道
    view.setUint32(24, sr, true);
    view.setUint32(28, sr * 2, true);     // byte rate
    view.setUint16(32, 2, true);          // block align
    view.setUint16(34, 16, true);         // 16 bit
    writeString(view, 36, 'data');
    view.setUint32(40, n * 2, true);

    var offset = 44;
    var phase = 0;

    for (var i = 0; i < n; i++) {
      var t = i / sr;
      var s;

      if (kind === 'thud') {
        var f = 170 * Math.pow(96 / 170, Math.min(1, t / 0.16));
        phase += 2 * Math.PI * f / sr;
        s = Math.sin(phase) * Math.exp(-t * 14) * 0.45;
      } else {
        var env = Math.min(1, t / 0.006) * Math.exp(-t * 3.0);
        s = (Math.sin(2 * Math.PI * freq * t) * 0.62 +
             Math.sin(4 * Math.PI * freq * t) * 0.24 +
             Math.sin(6.02 * Math.PI * freq * t) * 0.09) * env * 0.55;
      }

      s = Math.max(-1, Math.min(1, s));
      view.setInt16(offset, s * 32767, true);
      offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  function playerFor(key, freq, dur, kind) {
    if (!players[key]) {
      var url = URL.createObjectURL(makeWav(freq, dur, kind));
      var el = new Audio(url);
      el.preload = 'auto';
      el.volume = 1;
      players[key] = el;
    }
    return players[key];
  }

  /* ---- Web Audio 兜底：Blob 或 <audio> 不可用时 ---- */

  function ensureWeb() {
    if (!webCtx) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      try { webCtx = new Ctx(); } catch (e) { return null; }
    }
    if (webCtx.state === 'suspended') {
      try {
        var p = webCtx.resume();
        if (p && p.catch) p.catch(function () { /* 等下一次手势 */ });
      } catch (e) { /* ignore */ }
    }
    return webCtx;
  }

  function webTone(freq, dur, kind) {
    try {
      var c = ensureWeb();
      if (!c) return;

      var t = c.currentTime;
      var master = c.createGain();
      master.connect(c.destination);
      master.gain.setValueAtTime(0.0001, t);
      master.gain.exponentialRampToValueAtTime(kind === 'thud' ? 0.08 : 0.15, t + 0.01);
      master.gain.exponentialRampToValueAtTime(0.0004, t + dur);

      var osc = c.createOscillator();
      osc.type = 'triangle';
      if (kind === 'thud') {
        osc.frequency.setValueAtTime(170, t);
        osc.frequency.exponentialRampToValueAtTime(96, t + 0.16);
      } else {
        osc.frequency.value = freq;
      }
      osc.connect(master);
      osc.start(t);
      osc.stop(t + dur + 0.05);

      if (kind !== 'thud') {
        var o2 = c.createOscillator();
        var g2 = c.createGain();
        o2.type = 'sine';
        o2.frequency.value = freq * 2;
        g2.gain.value = 0.24;
        o2.connect(g2);
        g2.connect(master);
        o2.start(t);
        o2.stop(t + dur);
      }
    } catch (e) { /* 声音失败不影响流程 */ }
  }

  /* ---- 对外 ---- */

  function play(key, freq, dur, kind) {
    if (!enabled()) return;
    setSession();

    if (canUseAudio) {
      try {
        var el = playerFor(key, freq, dur, kind);
        try { el.pause(); } catch (e) { /* ignore */ }
        if (el.currentTime) {
          try { el.currentTime = 0; } catch (e) { /* ignore */ }
        }
        var p = el.play();
        if (p && p.catch) {
          p.catch(function () { webTone(freq, dur, kind); });
        }
        return;
      } catch (e) {
        /* 落到 Web Audio */
      }
    }

    webTone(freq, dur, kind);
  }

  function note(freq) {
    if (!freq) return;
    play('n' + Math.round(freq), freq, 1.35, 'note');
  }

  function wrong() {
    play('thud', 120, 0.28, 'thud');
  }

  function preload(freqs) {
    if (!canUseAudio || !enabled()) return;
    setSession();
    (freqs || []).forEach(function (f) {
      if (!f) return;
      try { playerFor('n' + Math.round(f), f, 1.35, 'note').load(); } catch (e) { /* ignore */ }
    });
  }

  function unlock() {
    setSession();
    ensureWeb();
  }

  PC.audio = {
    note: note,
    wrong: wrong,
    preload: preload,
    unlock: unlock,
    setSession: setSession
  };
})(window.PC = window.PC || {});
