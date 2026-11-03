/* =========================================================
   技能路线图（尚未实现的项目）
   ---------------------------------------------------------
   这些条目只是把计划里的乐理顺序搬进注册表，用来占位和提示。
   实现某个项目时：新建 js/skills/xxx.js，注册同一个 id 且
   status 改为 'live'，并在这里删掉占位条目即可。
   ========================================================= */

(function (PC) {
  'use strict';

  var planned = [
    {
      id: 'note-bass',
      title: '低音谱表认音',
      week: '第 2 周',
      desc: 'C3–C4，与高音谱表对称着练',
      icon: '𝄢',
      note: '第 2 周开放'
    },
    {
      id: 'rhythm-duration',
      title: '时值与休止符',
      week: '第 2 周',
      desc: '全音符到十六分音符、附点、休止符',
      icon: '𝅗𝅥',
      note: '第 2 周开放'
    },
    {
      id: 'meter',
      title: '拍号与节奏',
      week: '第 3 周',
      desc: '2/4、3/4、4/4，跟着拍子数',
      icon: '4/4',
      note: '第 3 周开放'
    },
    {
      id: 'key-signature',
      title: '调号与音阶',
      week: '第 5 周',
      desc: 'C / G / F 大调与音级',
      icon: '♯',
      note: '第 5 周开放'
    },
    {
      id: 'interval',
      title: '音程与度数',
      week: '第 7 周',
      desc: '大小音程、度数速判',
      icon: '3',
      note: '第 7 周开放'
    },
    {
      id: 'triad',
      title: '三和弦与转位',
      week: '第 10 周',
      desc: '四种三和弦、原位与转位',
      icon: '♬',
      note: '第 10 周开放'
    }
  ];

  planned.forEach(function (s) {
    s.status = 'planned';
    PC.registerSkill(s);
  });
})(window.PC = window.PC || {});
