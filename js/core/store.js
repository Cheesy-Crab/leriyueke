/* =========================================================
   本地进度存储
   ---------------------------------------------------------
   只写 localStorage，不上传。schema 带版本号 v，
   将来字段变了可以在 migrate() 里补，不丢历史记录。
   ========================================================= */

(function (PC) {
  'use strict';

  var KEY = 'leriyueke.state.v1';
  var VERSION = 1;
  var MAX_SESSIONS = 400;

  function defaults() {
    return {
      v: VERSION,
      settings: { sound: true },
      sessions: []
    };
  }

  function migrate(raw) {
    if (!raw || typeof raw !== 'object') return defaults();
    var next = defaults();
    if (raw.settings && typeof raw.settings === 'object') {
      next.settings.sound = raw.settings.sound !== false;
    }
    if (Array.isArray(raw.sessions)) {
      next.sessions = raw.sessions.filter(function (s) {
        return s && typeof s.t === 'number' && typeof s.day === 'string';
      }).map(function (s) {
        return {
          t: s.t,
          day: s.day,
          skill: String(s.skill || ''),
          total: Math.max(0, Number(s.total) || 0),
          correct: Math.max(0, Number(s.correct) || 0),
          ms: Math.max(0, Number(s.ms) || 0),
          pass: !!s.pass
        };
      }).slice(0, MAX_SESSIONS);
    }
    return next;
  }

  var state = load();

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      return migrate(JSON.parse(raw));
    } catch (e) {
      return defaults();
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* 隐私模式 / 沙箱里写不进去：本次会话仍可正常用，只是不留档 */
    }
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function dayKey(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  /**
   * 记录一轮练习。pass 只对「完整 12 音且达标」为 true。
   */
  function record(r) {
    var ms = Math.max(0, Math.round(r.ms || 0));
    state.sessions.unshift({
      t: Date.now(),
      day: dayKey(new Date()),
      skill: String(r.skillId || ''),
      total: Math.max(0, Math.round(r.total || 0)),
      correct: Math.max(0, Math.round(r.correct || 0)),
      ms: ms,
      pass: !!r.pass
    });
    if (state.sessions.length > MAX_SESSIONS) state.sessions.length = MAX_SESSIONS;
    save();
  }

  var WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

  function summary() {
    var today = new Date();
    var todayKey = dayKey(today);

    var byDay = Object.create(null);
    var bestMs = 0;
    var recent = [];
    var i, s;

    for (i = 0; i < state.sessions.length; i++) {
      s = state.sessions[i];
      byDay[s.day] = (byDay[s.day] || 0) + 1;
      if (s.pass && s.total === 12 && (!bestMs || s.ms < bestMs)) bestMs = s.ms;
      if (recent.length < 5) recent.push(s);
    }

    // 连续天数：今天有练就从今天往前数，否则从昨天往前数
    var cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (!byDay[dayKey(cursor)]) cursor.setDate(cursor.getDate() - 1);
    var streak = 0;
    while (byDay[dayKey(cursor)]) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    var totalAnswers = 0;
    var totalCorrect = 0;
    recent.forEach(function (x) {
      totalAnswers += x.total;
      totalCorrect += x.correct;
    });

    var last7 = [];
    for (i = 6; i >= 0; i--) {
      var d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      var k = dayKey(d);
      last7.push({
        key: k,
        label: WEEKDAYS[d.getDay()],
        count: byDay[k] || 0,
        today: k === todayKey
      });
    }

    return {
      todayCount: byDay[todayKey] || 0,
      streak: streak,
      bestMs: bestMs,
      accuracy: totalAnswers ? Math.round((totalCorrect / totalAnswers) * 100) : null,
      totalSessions: state.sessions.length,
      last7: last7
    };
  }

  function reset() {
    state = defaults();
    save();
  }

  PC.store = {
    get state() { return state; },
    save: save,
    record: record,
    summary: summary,
    reset: reset,
    dayKey: dayKey
  };
})(window.PC = window.PC || {});
