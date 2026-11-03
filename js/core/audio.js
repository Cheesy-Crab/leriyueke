/* =========================================================
   极简音源（Web Audio）
   ---------------------------------------------------------
   不是采样钢琴，只是给「答对」一个音高反馈；
   后面的听音、音程、和弦技能包可以直接复用 note()。
   ========================================================= */

(function (PC) {
  'use strict';

  var ctx = null;

  function ensure() {
    if (!ctx) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      try { ctx = new Ctx(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') {
      try { ctx.resume(); } catch (e) { /* 等用户手势 */ }
    }
    return ctx;
  }

  function enabled() {
    return !!(PC.store && PC.store.state.settings.sound);
  }

  /**
   * 弹一个有钢琴骨架的单音：基音三角波 + 2/3 次泛音，指数衰减。
   */
  function note(freq, opts) {
    if (!enabled() || !freq) return;
    var c = ensure();
    if (!c) return;

    opts = opts || {};
    var delay = opts.delay || 0;
    var dur = opts.dur || 1.25;
    var t = c.currentTime + delay;

    var master = c.createGain();
    master.connect(c.destination);
    master.gain.setValueAtTime(0.0001, t);
    master.gain.exponentialRampToValueAtTime(0.16, t + 0.012);
    master.gain.exponentialRampToValueAtTime(0.0004, t + dur);

    [
      { type: 'triangle', mult: 1, gain: 1 },
      { type: 'sine', mult: 2, gain: 0.26 },
      { type: 'sine', mult: 3.01, gain: 0.08 }
    ].forEach(function (p) {
      var osc = c.createOscillator();
      var g = c.createGain();
      osc.type = p.type;
      osc.frequency.value = freq * p.mult;
      g.gain.value = p.gain;
      osc.connect(g);
      g.connect(master);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    });
  }

  /** 答错声：短促下坠，不刺耳 */
  function wrong() {
    if (!enabled()) return;
    var c = ensure();
    if (!c) return;

    var t = c.currentTime;
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(170, t);
    osc.frequency.exponentialRampToValueAtTime(96, t + 0.16);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 0.22);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  PC.audio = {
    note: note,
    wrong: wrong,
    unlock: ensure
  };
})(window.PC = window.PC || {});
