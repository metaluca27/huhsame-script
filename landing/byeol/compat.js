(function (root) {
  var D = (typeof module !== 'undefined') ? require('./data.js') : root;

  function relationKey(me, other) {
    if (me === other) return 'hanmulgyeol';
    if (D.SHENG[other] === me) return 'danbi';        // 상대가 나를 생
    if (D.SHENG[me] === other) return 'saessakjigi';  // 내가 상대를 생
    if (D.KE[me] === other) return 'janmulgyeol';     // 내가 상대를 극
    if (D.KE[other] === me) return 'keunbawi';        // 상대가 나를 극
    return 'hanmulgyeol'; // 도달 불가(방어)
  }

  function chemiScore(relKey, seed) {
    var rel = D.RELATIONS[relKey];
    var span = rel.span + 1;
    var h = Math.abs(seed) % span;
    return rel.base + h;
  }

  function seedFromBirth(b) {
    return (b.year * 10000 + b.month * 100 + b.day);
  }

  function computeCompat(me, other, seed) {
    var key = relationKey(me, other);
    var rel = D.RELATIONS[key];
    return {
      relationKey: key,
      label: rel.label,
      emoji: rel.emoji,
      score: chemiScore(key, seed),
      desc: rel.desc,
      caution: rel.caution
    };
  }

  var api = { relationKey: relationKey, chemiScore: chemiScore, seedFromBirth: seedFromBirth, computeCompat: computeCompat };
  if (typeof module !== 'undefined') module.exports = api;
  else { root.relationKey = relationKey; root.chemiScore = chemiScore; root.seedFromBirth = seedFromBirth; root.computeCompat = computeCompat; }
})(typeof window !== 'undefined' ? window : globalThis);
