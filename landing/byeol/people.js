(function (root) {
  var isNode = (typeof module !== 'undefined');
  var D = isNode ? require('./data.js') : root;
  var Saju = isNode ? require('./saju.js') : root;
  var Compat = isNode ? require('./compat.js') : root;

  var _seq = 0;
  function nextId() { _seq++; return 'p' + Date.now().toString(36) + _seq; }

  function makePerson(input, myWuxing) {
    var saju = Saju.computeSaju(input);
    var seed = Compat.seedFromBirth(input);
    var compat = Compat.computeCompat(myWuxing, saju.dayWuxing, seed);
    var sp = D.SPIRITS[saju.dayWuxing];
    return {
      id: nextId(),
      name: input.name,
      birth: { year: input.year, month: input.month, day: input.day, calendar: input.calendar },
      wuxing: saju.dayWuxing,
      season: saju.season,
      typeName: D.typeName(saju.dayWuxing, saju.season),
      spiritName: sp.name,
      color1: sp.color1, color2: sp.color2,
      relationKey: compat.relationKey,
      label: compat.label, emoji: compat.emoji, score: compat.score,
      desc: compat.desc, caution: compat.caution
    };
  }

  function sortByChemi(list) {
    return list.slice().sort(function (a, b) { return b.score - a.score; });
  }

  function countByRelation(list) {
    var c = { danbi:0, hanmulgyeol:0, saessakjigi:0, janmulgyeol:0, keunbawi:0 };
    list.forEach(function (p) { if (c[p.relationKey] != null) c[p.relationKey]++; });
    return c;
  }

  function saveState(me, list) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('byeol_me', JSON.stringify(me));
    localStorage.setItem('byeol_people', JSON.stringify(list));
  }
  function loadState() {
    if (typeof localStorage === 'undefined') return { me:null, list:[] };
    var me = null, list = [];
    try { me = JSON.parse(localStorage.getItem('byeol_me')); } catch (e) {}
    try { list = JSON.parse(localStorage.getItem('byeol_people')) || []; } catch (e) {}
    return { me: me, list: list };
  }

  var api = { makePerson, sortByChemi, countByRelation, saveState, loadState };
  if (isNode) module.exports = api;
  else { root.makePerson = makePerson; root.sortByChemi = sortByChemi; root.countByRelation = countByRelation; root.saveState = saveState; root.loadState = loadState; }
})(typeof window !== 'undefined' ? window : globalThis);
