(function (root) {
  var D = (typeof module !== 'undefined') ? require('./data.js') : root;
  var lunarLib = (typeof module !== 'undefined') ? require('./lib/lunar.js') : root;
  var Solar = lunarLib.Solar || root.Solar;
  var Lunar = lunarLib.Lunar || root.Lunar;

  function getLunarFrom(input) {
    if (input.calendar === 'lunar') {
      return Lunar.fromYmd(input.year, input.month, input.day);
    }
    return Solar.fromYmd(input.year, input.month, input.day).getLunar();
  }

  function countWuxing(stems, branches) {
    var dist = { wood:0, fire:0, earth:0, metal:0, water:0 };
    stems.forEach(function (s) { if (D.STEM_WUXING[s]) dist[D.STEM_WUXING[s]]++; });
    branches.forEach(function (b) { if (D.BRANCH_WUXING[b]) dist[D.BRANCH_WUXING[b]]++; });
    return dist;
  }

  function computeSaju(input) {
    var lunar = getLunarFrom(input);
    var ec = lunar.getEightChar();
    var yG = ec.getYearGan(), yZ = ec.getYearZhi();
    var mG = ec.getMonthGan(), mZ = ec.getMonthZhi();
    var dG = ec.getDayGan(), dZ = ec.getDayZhi();
    return {
      dayWuxing: D.STEM_WUXING[dG],
      season: D.SEASON_BY_BRANCH[mZ],
      distribution: countWuxing([yG, mG, dG], [yZ, mZ, dZ]),
      pillars: { year: yG + yZ, month: mG + mZ, day: dG + dZ }
    };
  }

  var api = { computeSaju: computeSaju, countWuxing: countWuxing };
  if (typeof module !== 'undefined') module.exports = api;
  else { root.computeSaju = computeSaju; root.countWuxing = countWuxing; }
})(typeof window !== 'undefined' ? window : globalThis);
