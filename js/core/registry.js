/* =========================================================
   技能注册表
   ---------------------------------------------------------
   应用本身不认识任何具体练习：所有训练项目都是一个 "技能包"，
   在启动时注册进来。加新功能 = 新增一个 js/skills/xxx.js，
   在 index.html 里加一行 <script>，不动 app.js。
   ========================================================= */

(function (PC) {
  'use strict';

  var skills = [];
  var byId = Object.create(null);

  /**
   * 注册一个技能包。
   * 必填：id、title、status
   * live 技能还需：buildSession / renderPrompt / options / isCorrect / explain
   */
  PC.registerSkill = function (def) {
    if (!def || !def.id) throw new Error('[PC] 技能包缺少 id');
    if (byId[def.id]) throw new Error('[PC] 技能 id 重复：' + def.id);
    def.status = def.status === 'live' ? 'live' : 'planned';
    byId[def.id] = def;
    skills.push(def);
    return def;
  };

  PC.getSkill = function (id) {
    return byId[id] || null;
  };

  /** live 在前，其余保持注册顺序（即路线图的推进顺序） */
  PC.skills = skills;
  PC.liveSkills = function () {
    return skills.filter(function (s) { return s.status === 'live'; });
  };
})(window.PC = window.PC || {});
