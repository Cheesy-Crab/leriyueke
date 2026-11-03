/* =========================================================
   界面与流程
   ---------------------------------------------------------
   首页 → 练习 → 结果；速查表。
   app.js 不认识「音符」这类东西，只认技能包约定的接口：
   buildSession / question / renderPrompt / options / isCorrect / explain
   ========================================================= */

(function (PC) {
  'use strict';

  var appEl = document.getElementById('app');
  var toastEl = document.getElementById('toast');

  var state = {
    screen: 'home',
    skill: null,
    session: null,
    lastResult: null,
    advanceTimer: 0,
    tickTimer: 0,
    cardStart: 0
  };

  var toastTimer = 0;

  var ICON_SOUND_ON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4 9.5v5h3.4L12 18V6L7.4 9.5H4z"/>' +
    '<path d="M15.4 9a4.2 4.2 0 0 1 0 6"/><path d="M18 6.6a7.6 7.6 0 0 1 0 10.8"/></svg>';

  var ICON_SOUND_OFF =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4 9.5v5h3.4L12 18V6L7.4 9.5H4z"/>' +
    '<path d="M15.6 9.6l5 4.8M20.6 9.6l-5 4.8"/></svg>';

  /* ---------- 工具 ---------- */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtSec(ms) { return (ms / 1000).toFixed(1) + 's'; }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2800);
  }

  function stopTick() {
    if (state.tickTimer) { clearInterval(state.tickTimer); state.tickTimer = 0; }
  }

  function clearTimers() {
    stopTick();
    if (state.advanceTimer) { clearTimeout(state.advanceTimer); state.advanceTimer = 0; }
  }

  function setTitle(t) {
    document.title = t ? t + ' · 乐理日课' : '乐理日课 · 识谱';
  }

  /* ---------- 顶栏 ---------- */

  function syncChrome() {
    var sum = PC.store.summary();
    var pill = document.getElementById('streakPill');
    if (sum.streak > 0) {
      pill.hidden = false;
      pill.textContent = '连续 ' + sum.streak + ' 天';
    } else {
      pill.hidden = true;
    }
    var btn = document.getElementById('soundBtn');
    var on = PC.store.state.settings.sound;
    btn.innerHTML = on ? ICON_SOUND_ON : ICON_SOUND_OFF;
    btn.classList.toggle('is-off', !on);
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? '关闭提示音' : '开启提示音');
  }

  /* ---------- 首页 ---------- */

  function renderHome() {
    clearTimers();
    try { window.scrollTo(0, 0); } catch (e) { /* ignore */ }
    state.screen = 'home';
    state.skill = null;
    state.session = null;
    setTitle('');

    var sum = PC.store.summary();
    var round = sum.todayCount + 1;
    var cta = sum.todayCount
      ? '开始今天的第 ' + round + ' 轮'
      : '开始第一轮 · 约 3 分钟';
    var best = sum.bestMs ? fmtSec(sum.bestMs) : '—';
    var acc = sum.accuracy == null ? '—' : sum.accuracy + '%';

    var live = PC.skills.filter(function (s) { return s.status === 'live'; });
    var planned = PC.skills.filter(function (s) { return s.status !== 'live'; });
    var primary = live[0];

    var liveHTML = live.map(function (s) {
      return '<button class="skill-card is-live" type="button" data-action="start" data-skill="' + esc(s.id) + '">' +
        '<span class="skill-icon" aria-hidden="true">' + esc(s.icon || '♪') + '</span>' +
        '<span class="skill-body">' +
          '<span class="skill-meta">' + esc(s.week) + ' · ' + esc(s.duration || '5 分钟') + '</span>' +
          '<strong>' + esc(s.title) + '</strong>' +
          '<span class="skill-desc">' + esc(s.desc) + '</span>' +
        '</span>' +
        '<span class="skill-go">开始<span aria-hidden="true">→</span></span>' +
      '</button>';
    }).join('');

    var plannedHTML = planned.map(function (s) {
      var tip = '「' + s.title + '」' + (s.note || '按计划稍后开放');
      return '<button class="skill-card is-planned" type="button" data-action="planned" data-tip="' + esc(tip) + '">' +
        '<span class="skill-icon" aria-hidden="true">' + esc(s.icon || '·') + '</span>' +
        '<span class="skill-body">' +
          '<span class="skill-meta">' + esc(s.week) + '</span>' +
          '<strong>' + esc(s.title) + '</strong>' +
          '<span class="skill-desc">' + esc(s.desc) + '</span>' +
        '</span>' +
        '<span class="skill-lock">待开放</span>' +
      '</button>';
    }).join('');

    var bars = sum.last7.map(function (d) {
      var pct = d.count ? Math.min(100, 20 + d.count * 20) : 0;
      return '<div class="week-day' + (d.today ? ' is-today' : '') + '">' +
        '<div class="week-bar"><i class="' + (d.count ? '' : 'is-empty') + '" style="height:' + pct + '%"></i></div>' +
        '<span>' + d.label + '</span>' +
      '</div>';
    }).join('');

    appEl.innerHTML =
      '<section class="hero">' +
        '<div class="hero-copy">' +
          '<p class="eyebrow">第 1 周 · 识谱打地基</p>' +
          '<h1>把十二个音<br />认成条件反射</h1>' +
          '<p class="lede">看谱直接说音名，不数线、不数间。</p>' +
          '<p class="lede lede-target">第 1 周硬指标 <b>12 个音 · 3 秒内 · 45 秒全对</b></p>' +
          '<div class="hero-actions">' +
            '<button class="btn btn-primary" type="button" data-action="start" data-skill="' + esc(primary ? primary.id : 'note-treble') + '">' +
              esc(cta) + '<span class="btn-arrow" aria-hidden="true">→</span>' +
            '</button>' +
            '<button class="btn btn-ghost" type="button" data-action="reference">速查表</button>' +
          '</div>' +
          (sum.todayCount ? '<p class="hero-note">今天已经完成 ' + sum.todayCount + ' 轮</p>' : '') +
        '</div>' +
        '<div class="hero-art" id="heroArt" aria-hidden="true"></div>' +
      '</section>' +

      '<section class="section">' +
        '<div class="section-head">' +
          '<h2>训练项目</h2>' +
          '<span>已开放 ' + live.length + ' 项 · 按 16 周计划逐个解锁</span>' +
        '</div>' +
        '<div class="skill-grid">' + liveHTML + plannedHTML + '</div>' +
      '</section>' +

      '<section class="section">' +
        '<div class="section-head">' +
          '<h2>这周的记录</h2>' +
          '<span>只存在本机</span>' +
        '</div>' +
        '<div class="stat-row">' +
          '<div class="stat"><b>' + sum.streak + '</b><span>连续天数</span></div>' +
          '<div class="stat"><b>' + sum.todayCount + '</b><span>今日轮次</span></div>' +
          '<div class="stat"><b>' + best + '</b><span>最佳 12 音</span></div>' +
          '<div class="stat"><b>' + acc + '</b><span>最近正确率</span></div>' +
        '</div>' +
        '<div class="week-chart">' + bars + '</div>' +
        '<p class="chart-caption">' +
          (sum.totalSessions
            ? '柱高 = 当天的练习轮次。目标不是天天满分，是天天碰一下。'
            : '还没有记录。第一轮结束后，这里会自动出现。') +
        '</p>' +
      '</section>';

    var art = document.getElementById('heroArt');
    if (art) {
      art.innerHTML = PC.staff.render({
        clef: 'treble',
        width: 430,
        height: 200,
        space: 15,
        top: 58,
        x1: 92,
        x2: 380,
        notes: [{ pos: -2 }, { pos: 2 }, { pos: 7 }],
        label: '高音谱表示意：中央 C、G、高音 E'
      });
    }

    syncChrome();
  }

  /* ---------- 练习 ---------- */

  function startSession(skillId, opts) {
    clearTimers();
    var skill = PC.getSkill(skillId);
    if (!skill || skill.status !== 'live') return;

    var cards = skill.buildSession(opts || {});
    if (!cards || !cards.length) { toast('这个项目还没有题目'); return; }

    state.skill = skill;
    state.session = {
      skillId: skill.id,
      cards: cards,
      index: 0,
      total: cards.length,
      answers: [],
      wrong: [],
      locked: false,
      requeue: false,
      requeueUsed: false
    };
    state.screen = 'practice';
    setTitle(skill.title);
    renderPracticeShell();
    paintCard();
  }

  function renderPracticeShell() {
    var skill = state.skill;
    var session = state.session;
    try { window.scrollTo(0, 0); } catch (e) { /* ignore */ }

    appEl.innerHTML =
      '<section class="practice" aria-label="' + esc(skill.title) + '">' +
        '<div class="practice-bar">' +
          '<button class="back-btn" type="button" data-action="quit" aria-label="退出练习">←</button>' +
          '<div class="practice-title">' + esc(skill.title) + '<span>' + esc(skill.week) + '</span></div>' +
          '<div class="practice-timer" id="practiceTimer">0.0s</div>' +
        '</div>' +
        '<div class="exit-confirm" id="exitConfirm" hidden>' +
          '<p>本轮还没做完，退出不会记录成绩。</p>' +
          '<div class="exit-actions">' +
            '<button class="btn btn-ghost" type="button" data-action="exit-no">继续练</button>' +
            '<button class="btn btn-danger" type="button" data-action="exit-yes">退出</button>' +
          '</div>' +
        '</div>' +
        '<div class="progress" id="progress"></div>' +
        '<div class="stage" id="stage">' +
          '<p class="stage-q" id="stageQ">' + esc(skill.question ? skill.question(session.cards[0]) : '这个音是？') + '</p>' +
          '<div class="staff-slot" id="staffSlot"></div>' +
          '<p class="stage-hint" id="stageHint"><span class="hint-keyboard">A–G 作答 · 空格继续</span><span class="hint-touch">点下面的字母作答</span></p>' +
        '</div>' +
        '<div class="options" id="options"></div>' +
        '<div class="feedback-slot" id="feedback" aria-live="polite"></div>' +
      '</section>';
  }

  function paintCard() {
    var session = state.session;
    var skill = state.skill;
    var card = session.cards[session.index];
    if (!card) { finishSession(); return; }

    session.locked = false;
    state.cardStart = performance.now();

    document.getElementById('stageQ').textContent = skill.question ? skill.question(card) : '这个音是？';

    var slot = document.getElementById('staffSlot');
    slot.innerHTML = '';
    skill.renderPrompt(slot, card);

    document.getElementById('options').innerHTML = skill.options(card).map(function (o) {
      return '<button class="opt" type="button" data-answer="' + esc(o.value) + '" aria-label="' + esc(o.label) + '">' +
        '<span class="opt-letter">' + esc(o.label) + '</span>' +
      '</button>';
    }).join('');

    document.getElementById('feedback').innerHTML = '';
    document.getElementById('stage').className = 'stage';
    paintProgress();
    startTimer();
  }

  function paintProgress() {
    var session = state.session;
    var html = '';
    for (var i = 0; i < session.total; i++) {
      var cls = session.requeue ? 'is-done'
        : (i < session.index ? 'is-done' : i === session.index ? 'is-now' : '');
      html += '<i class="' + cls + '"></i>';
    }
    document.getElementById('progress').innerHTML = html;
  }

  function startTimer() {
    stopTick();
    var el = document.getElementById('practiceTimer');
    if (!el) return;
    el.classList.remove('is-slow');
    el.textContent = '0.0s';
    var t0 = performance.now();
    state.tickTimer = setInterval(function () {
      if (!document.body.contains(el)) { stopTick(); return; }
      var ms = performance.now() - t0;
      el.textContent = fmtSec(ms);
      if (ms > 3000) el.classList.add('is-slow');
    }, 100);
  }

  function answer(value) {
    var session = state.session;
    var skill = state.skill;
    if (!session || session.locked) return;

    var card = session.cards[session.index];
    var ms = performance.now() - state.cardStart;
    var ok = skill.isCorrect(card, value);

    session.locked = true;
    stopTick();

    session.answers.push({ card: card, value: value, ok: ok, ms: ms, requeue: session.requeue });
    if (!session.requeue && !ok) session.wrong.push(card);

    // 先排好下一题：后面任何一步出错（画反馈、播声音）都不会把整轮卡死
    state.advanceTimer = setTimeout(nextCard, ok ? 1100 : 2200);

    try {
      var timerEl = document.getElementById('practiceTimer');
      if (timerEl) {
        timerEl.textContent = fmtSec(ms);
        timerEl.classList.toggle('is-slow', ms > 3000);
      }

      Array.prototype.forEach.call(document.querySelectorAll('.opt'), function (b) {
        b.disabled = true;
        if (b.dataset.answer === card.letter) b.classList.add('is-right');
        else if (b.dataset.answer === value) b.classList.add('is-wrong');
      });

      document.getElementById('stage').classList.add(ok ? 'is-ok' : 'is-bad');

      var detail = skill.explain(card);
      var isLast = session.index + 1 >= session.cards.length;

      document.getElementById('feedback').innerHTML =
        '<div class="feedback ' + (ok ? 'ok' : 'bad') + '">' +
          '<span class="fb-mark" aria-hidden="true">' + (ok ? '✓' : '✕') + '</span>' +
          '<div class="fb-text">' +
            '<p class="fb-main">' + esc(detail.main) + '</p>' +
            '<p class="fb-sub">' + esc(detail.sub) + '</p>' +
            (!ok && detail.hint ? '<p class="fb-hint">' + esc(detail.hint) + '</p>' : '') +
          '</div>' +
          '<button class="fb-next" type="button" data-action="next">' + (isLast ? '完成 →' : '继续 →') + '</button>' +
        '</div>';
    } catch (err) {
      reportError(err);
    }

    try {
      if (ok) PC.audio.note(card.freq);
      else PC.audio.wrong();
    } catch (err) {
      /* 音效失败不影响答题流程 */
    }
  }

  function nextCard() {
    try {
      nextCardInner();
    } catch (err) {
      // 哪怕换题出错，也要保证这轮能走到结算
      reportError(err);
      finishSession();
    }
  }

  function nextCardInner() {
    if (state.advanceTimer) { clearTimeout(state.advanceTimer); state.advanceTimer = 0; }
    var session = state.session;
    if (!session || !session.locked) return;

    session.index += 1;

    if (session.index < session.cards.length) {
      paintCard();
      return;
    }

    // 第一遍结束：有错题就先重练一遍（不计成绩）
    if (!session.requeueUsed && session.wrong.length) {
      session.requeueUsed = true;
      session.requeue = true;
      session.cards = session.wrong.slice();
      session.index = 0;
      paintCard();
      document.getElementById('stageQ').textContent = '错题重练 · 再认一次';
      document.getElementById('stageHint').textContent = '这一遍不计入成绩';
      return;
    }

    finishSession();
  }

  function finishSession() {
    clearTimers();
    var session = state.session;
    var skill = state.skill;
    if (!session || !skill) return;

    var first = session.answers.filter(function (a) { return !a.requeue; });
    if (!first.length) { goHome(true); return; }

    var total = first.length;
    var correct = first.filter(function (a) { return a.ok; }).length;
    var ms = first.reduce(function (sum, a) { return sum + a.ms; }, 0);
    var standardMs = total === 12 ? 45000 : null;
    var pass = standardMs === null ? null : (correct === total && ms <= standardMs);

    var round = 1;
    try { round = PC.store.summary().todayCount + 1; } catch (err) { reportError(err); }

    var result = {
      skillId: skill.id,
      total: total,
      correct: correct,
      ms: ms,
      avg: total ? ms / total : 0,
      pass: pass,
      standardMs: standardMs,
      wrong: first.filter(function (a) { return !a.ok; }),
      slow: first.filter(function (a) { return a.ok && a.ms > 3000; }),
      round: round
    };

    try {
      PC.store.record({
        skillId: skill.id,
        total: total,
        correct: correct,
        ms: Math.round(ms),
        pass: pass === true
      });
    } catch (err) {
      reportError(err);
    }

    state.lastResult = result;
    state.session = null;
    state.screen = 'result';
    setTitle('结果');

    try {
      renderResult();
    } catch (err) {
      reportError(err);
      showResultFallback();
    }
  }

  /* ---------- 结果 ---------- */

  function chips(list, cls, withMs) {
    return list.map(function (a) {
      var c = a.card;
      return '<span class="chip ' + cls + '">' + esc(c.pitch) +
        '<em>' + esc(c.where) + (withMs ? ' · ' + fmtSec(a.ms) : '') + '</em></span>';
    }).join('');
  }

  function renderResult() {
    try { window.scrollTo(0, 0); } catch (e) { /* ignore */ }
    var r = state.lastResult;
    var isFull = r.total === 12;
    var headline, badge, badgeCls, sub;

    if (isFull && r.pass) {
      headline = fmtSec(r.ms) + '，全对。';
      badge = '✓ 达成第 1 周目标';
      badgeCls = 'is-pass';
      sub = '12 个音全部认对，目标线 45 秒。明天用同样的标准再刷一轮。';
    } else if (isFull && r.correct === r.total) {
      headline = '全对，用时 ' + fmtSec(r.ms) + '。';
      badge = '准确率够了，差 ' + fmtSec(Math.max(0, r.ms - 45000)) + ' 到 45 秒';
      badgeCls = 'is-close';
      sub = '速度是熟练度带来的，不用急着赶。明天再刷两轮自然就快了。';
    } else if (isFull) {
      var miss = r.total - r.correct;
      headline = '对了 ' + r.correct + ' 个。';
      badge = miss === 1 ? '先把错的那 1 个音认熟' : '先把错的 ' + miss + ' 个音认熟';
      badgeCls = 'is-todo';
      sub = '错题已经自动重练过一遍。今天只做「只练错题」，比整轮重刷更有效。';
    } else {
      headline = r.correct === r.total ? '这 ' + r.total + ' 个音，全对。' : '对了 ' + r.correct + ' / ' + r.total + ' 个。';
      badge = '错题专项 · 不计入周目标';
      badgeCls = 'is-todo';
      sub = '专项练完，回到整轮再验一次 45 秒。';
    }

    var details = '';
    if (r.wrong.length) {
      details += '<div class="detail-label">错题（已重练一遍）</div>' +
        '<div class="chips">' + chips(r.wrong, 'is-bad', false) + '</div>';
    }
    if (r.slow.length) {
      details += '<div class="detail-label">答对但超过 3 秒</div>' +
        '<div class="chips">' + chips(r.slow, 'is-slow', true) + '</div>';
    }
    if (!r.wrong.length && !r.slow.length) {
      details = '<p class="detail-empty">这一轮没有错题，也没有慢题。</p>';
    }

    appEl.innerHTML =
      '<section class="result">' +
        '<p class="result-kicker">第 ' + r.round + ' 轮 · ' +
          (isFull ? '高音谱表 12 音' : '错题专项') + '</p>' +
        '<h2>' + esc(headline) + '</h2>' +
        '<span class="pass-badge ' + badgeCls + '">' + esc(badge) + '</span>' +
        '<p class="result-sub">' + esc(sub) + '</p>' +
        '<div class="metrics">' +
          '<div class="metric"><b>' + Math.round((r.correct / r.total) * 100) + '%</b><span>正确率</span></div>' +
          '<div class="metric"><b>' + fmtSec(r.ms) + '</b><span>总用时</span></div>' +
          '<div class="metric"><b>' + fmtSec(r.avg) + '</b><span>平均每题</span></div>' +
          '<div class="metric"><b>' + r.slow.length + '</b><span>慢于 3 秒</span></div>' +
        '</div>' +
        '<div class="result-detail">' + details + '</div>' +
        '<div class="result-actions">' +
          '<button class="btn btn-primary" type="button" data-action="again">再来一轮</button>' +
          (r.wrong.length
            ? '<button class="btn btn-ghost" type="button" data-action="drill">只练这 ' + r.wrong.length + ' 个音</button>'
            : '') +
          '<button class="btn btn-ghost" type="button" data-action="home">回首页</button>' +
        '</div>' +
        '<p class="result-foot">达标线：12 个音全对且 ≤ 45 秒。错题重练不计入成绩，放心练。</p>' +
      '</section>';

    syncChrome();
  }

  /* ---------- 速查表 ---------- */

  function openReference() {
    clearTimers();
    try { window.scrollTo(0, 0); } catch (e) { /* ignore */ }
    var skill = PC.getSkill('note-treble');
    state.screen = 'reference';
    state.session = null;
    setTitle('速查表');

    var items = skill.notes.map(function (n) {
      var svg = PC.staff.render({
        clef: 'treble',
        width: 200,
        height: 120,
        space: 10,
        top: 40,
        x1: 62,
        x2: 182,
        notes: [{ pos: n.pos }],
        label: n.pitch + ' 的位置'
      });
      return '<button class="ref-item" type="button" data-action="play-note" data-freq="' + n.freq + '" ' +
        'aria-label="' + esc(n.pitch + '，' + n.where + '，点击听音') + '">' +
        '<span class="ref-staff">' + svg + '</span>' +
        '<span class="ref-name">' + n.pitch + '<em>' + esc(n.solfa) + '</em></span>' +
        '<span class="ref-where">' + esc(n.where) + '</span>' +
      '</button>';
    }).join('');

    appEl.innerHTML =
      '<section class="ref">' +
        '<div class="ref-head">' +
          '<div>' +
            '<h1>高音谱表速查</h1>' +
            '<p>C4–C5 十二个音 · 点任意一张可以听音高</p>' +
          '</div>' +
          '<button class="btn btn-ghost" type="button" data-action="home">返回</button>' +
        '</div>' +
        '<div class="ref-grid">' + items + '</div>' +
        '<div class="ref-tips">' +
          '<div class="tip-card">' +
            '<h3>两条口诀，只用来核对</h3>' +
            '<p><b>线上的音</b><br /><span class="mono">E G B D F</span></p>' +
            '<p><b>间里的音</b><br /><span class="mono">F A C E</span></p>' +
            '<p>口诀是检查用的，不是数出来的。练习时要求「一眼认出」。</p>' +
          '</div>' +
          '<div class="tip-card">' +
            '<h3>三条禁忌</h3>' +
            '<p>① 不按顺序背 —— 必须洗乱，否则记的是位置不是音。</p>' +
            '<p>② 不从下往上数线 —— 那是计算，不是认读。</p>' +
            '<p>③ 不靠唱名反推音名 —— 两套系统分开练。</p>' +
          '</div>' +
        '</div>' +
        '<div class="ref-actions">' +
          '<button class="btn btn-primary" type="button" data-action="start" data-skill="note-treble">开始练习</button>' +
        '</div>' +
      '</section>';

    syncChrome();
  }

  /* ---------- 导航 ---------- */

  function goHome(force) {
    if (!force && state.screen === 'practice' && state.session && state.session.answers.length) {
      showExitConfirm();
      return;
    }
    renderHome();
  }

  function showExitConfirm() {
    var bar = document.getElementById('exitConfirm');
    if (!bar) return;
    bar.hidden = false;
    var stay = bar.querySelector('[data-action="exit-no"]');
    if (stay) stay.focus();
  }

  function hideExitConfirm() {
    var bar = document.getElementById('exitConfirm');
    if (bar) bar.hidden = true;
  }

  /* ---------- 出错兜底 ---------- */

  var errorShown = false;

  function reportError(err) {
    try { console.error('[乐理日课]', err); } catch (e) { /* ignore */ }
    if (errorShown) return;
    errorShown = true;
    try {
      var bar = document.createElement('div');
      bar.className = 'error-bar';
      bar.setAttribute('role', 'alert');
      bar.innerHTML = '<span>页面出了点问题，本轮可能没记上。</span>' +
        '<button type="button" class="error-home">回首页</button>' +
        '<button type="button" class="error-reload">刷新</button>';
      document.body.appendChild(bar);

      bar.querySelector('.error-home').addEventListener('click', function () {
        errorShown = false;
        if (bar.parentNode) bar.parentNode.removeChild(bar);
        state.session = null;
        state.screen = 'home';
        try { renderHome(); } catch (e) { location.reload(); }
      });
      bar.querySelector('.error-reload').addEventListener('click', function () {
        location.reload();
      });
    } catch (e) {
      /* 兜底本身出错就不再处理 */
    }
  }

  function showResultFallback() {
    appEl.innerHTML =
      '<section class="result">' +
        '<p class="result-kicker">结算出错</p>' +
        '<h2>这轮成绩没算出来</h2>' +
        '<p class="result-sub">记录没有保存。回首页可以直接重开一轮。</p>' +
        '<div class="result-actions">' +
          '<button class="btn btn-primary" type="button" data-action="home">回首页</button>' +
        '</div>' +
      '</section>';
  }

  function toggleSound() {
    var s = PC.store.state.settings;
    s.sound = !s.sound;
    PC.store.save();
    syncChrome();
    if (s.sound) PC.audio.note(523.25);
    toast(s.sound ? '提示音已打开' : '提示音已关闭');
  }

  /* ---------- 事件 ---------- */

  document.querySelector('.topbar').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-nav]');
    if (!btn) return;
    if (btn.dataset.nav === 'home') goHome();
    else if (btn.dataset.nav === 'sound') toggleSound();
  });

  appEl.addEventListener('click', function (e) {
    var opt = e.target.closest('.opt');
    if (opt && !opt.disabled) {
      PC.audio.unlock();
      answer(opt.dataset.answer);
      return;
    }

    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.dataset.action;

    if (action === 'start') {
      PC.audio.unlock();
      startSession(btn.dataset.skill || 'note-treble');
    } else if (action === 'again') {
      startSession(state.lastResult ? state.lastResult.skillId : 'note-treble');
    } else if (action === 'drill') {
      var wrongPitches = state.lastResult.wrong.map(function (a) { return a.card.pitch; });
      startSession(state.lastResult.skillId, { only: wrongPitches });
    } else if (action === 'next') {
      nextCard();
    } else if (action === 'quit') {
      goHome();
    } else if (action === 'exit-yes') {
      goHome(true);
    } else if (action === 'exit-no') {
      hideExitConfirm();
    } else if (action === 'home') {
      goHome(true);
    } else if (action === 'reference') {
      openReference();
    } else if (action === 'planned') {
      toast(btn.dataset.tip || '这个项目还没开放');
    } else if (action === 'play-note') {
      PC.audio.unlock();
      PC.audio.note(parseFloat(btn.dataset.freq));
    }
  });

  var KEYMAP = {
    a: 'A', b: 'B', c: 'C', d: 'D', e: 'E', f: 'F', g: 'G',
    '1': 'C', '2': 'D', '3': 'E', '4': 'F', '5': 'G', '6': 'A', '7': 'B'
  };

  document.addEventListener('keydown', function (e) {
    if (state.screen === 'practice' && state.session) {
      if (e.key === ' ' || e.key === 'Enter') {
        if (state.session.locked) { e.preventDefault(); nextCard(); }
        return;
      }
      if (state.session.locked) return;
      var value = KEYMAP[e.key.toLowerCase()];
      if (value) { e.preventDefault(); answer(value); }
      return;
    }

    if (e.key === 'Escape') {
      var confirmBar = document.getElementById('exitConfirm');
      if (confirmBar && !confirmBar.hidden) { hideExitConfirm(); return; }
      if (state.screen !== 'home') goHome();
      return;
    }

    if (e.key === 'Enter' && state.screen === 'result') {
      // 焦点在按钮上时交给按钮自己处理，避免重复开始
      if (e.target && e.target.closest && e.target.closest('button')) return;
      startSession(state.lastResult ? state.lastResult.skillId : 'note-treble');
    }
  });

  /* ---------- 启动 ---------- */

  window.addEventListener('error', function (e) {
    reportError(e.error || e.message);
  });

  syncChrome();
  renderHome();

  var hash = (location.hash || '').replace('#', '');
  if (hash === 'practice') startSession('note-treble');
  else if (hash === 'reference') openReference();
})(window.PC = window.PC || {});
