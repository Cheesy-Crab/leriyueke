/* =========================================================
   技能包 01：高音谱表认音
   ---------------------------------------------------------
   范围：C4–C5 十二个音（对应计划第 1 周硬指标 ②）
   形式：谱上出现一个音，3 秒内说出音名，七选一 / 键盘作答
   ========================================================= */

(function (PC) {
  'use strict';

  // pos：0 = 第一线 E4，每 +1 向上半个间距
  var NOTES = [
    { pitch: 'A3', letter: 'A', solfa: 'la', num: '6', pos: -4, where: '下加二线', freq: 220.00 },
    { pitch: 'B3', letter: 'B', solfa: 'si', num: '7', pos: -3, where: '下加一线下方', freq: 246.94 },
    { pitch: 'C4', letter: 'C', solfa: 'do', num: '1', pos: -2, where: '下加一线 · 中央 C', freq: 261.63 },
    { pitch: 'D4', letter: 'D', solfa: 're', num: '2', pos: -1, where: '第一线下方', freq: 293.66 },
    { pitch: 'E4', letter: 'E', solfa: 'mi', num: '3', pos: 0, where: '第一线', freq: 329.63 },
    { pitch: 'F4', letter: 'F', solfa: 'fa', num: '4', pos: 1, where: '第一间', freq: 349.23 },
    { pitch: 'G4', letter: 'G', solfa: 'sol', num: '5', pos: 2, where: '第二线', freq: 392.00 },
    { pitch: 'A4', letter: 'A', solfa: 'la', num: '6', pos: 3, where: '第二间', freq: 440.00 },
    { pitch: 'B4', letter: 'B', solfa: 'si', num: '7', pos: 4, where: '第三线', freq: 493.88 },
    { pitch: 'C5', letter: 'C', solfa: 'do', num: '1', pos: 5, where: '第三间', freq: 523.25 },
    { pitch: 'D5', letter: 'D', solfa: 're', num: '2', pos: 6, where: '第四线', freq: 587.33 },
    { pitch: 'E5', letter: 'E', solfa: 'mi', num: '3', pos: 7, where: '第四间', freq: 659.25 }
  ];

  var LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  PC.registerSkill({
    id: 'note-treble',
    title: '高音谱表认音',
    week: '第 1 周',
    duration: '5 分钟',
    desc: 'C4–C5 十二个音，看谱直出音名',
    icon: '♪',
    metric: '12 个音 · 45 秒 · 全对',
    status: 'live',
    notes: NOTES,

    /**
     * opts.only: 只练这几个音（错题专项）
     */
    buildSession: function (opts) {
      opts = opts || {};
      var pool = NOTES;

      if (opts.only && opts.only.length) {
        pool = NOTES.filter(function (n) { return opts.only.indexOf(n.pitch) >= 0; });
        if (!pool.length) pool = NOTES;
      }

      var cards = shuffle(pool);

      // 错题太少时重复几遍，保证练够手感
      if (pool.length < 4) {
        var repeated = pool.slice();
        while (repeated.length < 6) repeated = repeated.concat(pool);
        cards = shuffle(repeated).slice(0, 6);
      }
      return cards;
    },

    question: function () { return '这个音是？'; },

    renderPrompt: function (host, card) {
      host.innerHTML = PC.staff.render({
        clef: 'treble',
        width: 480,
        height: 212,
        space: 22,
        top: 50,
        x1: 100,
        x2: 450,
        notes: [{ pos: card.pos }],
        label: '高音谱表上的一个音，请说出音名'
      });
    },

    options: function () {
      return LETTERS.map(function (l) { return { value: l, label: l }; });
    },

    isCorrect: function (card, value) {
      return value === card.letter;
    },

    explain: function (card) {
      return {
        main: card.letter + ' · ' + card.solfa + '（简谱 ' + card.num + '）',
        sub: card.pitch + ' · ' + card.where,
        hint: card.pos % 2 === 0
          ? '线上的音：E G B D F（饿鬼不吃饭）'
          : '间里的音：F A C E（face）',
        freq: card.freq
      };
    }
  });
})(window.PC = window.PC || {});
