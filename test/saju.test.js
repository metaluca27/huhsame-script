const test = require('node:test');
const assert = require('node:assert');
const S = require('../landing/byeol/saju.js');

test('countWuxing: 6글자 오행 개수를 센다', () => {
  const dist = S.countWuxing(['甲','丙','戊'], ['子','午','辰']);
  // 甲=wood, 丙=fire, 戊=earth / 子=water, 午=fire, 辰=earth
  assert.equal(dist.wood, 1);
  assert.equal(dist.fire, 2);
  assert.equal(dist.earth, 2);
  assert.equal(dist.water, 1);
  assert.equal(dist.metal, 0);
});

test('computeSaju: 양력 생일에서 일간 오행·계절·분포를 구한다', () => {
  const r = S.computeSaju({ year:1990, month:6, day:15, calendar:'solar' });
  assert.ok(['wood','fire','earth','metal','water'].includes(r.dayWuxing));
  assert.ok(['spring','summer','autumn','winter'].includes(r.season));
  const total = r.distribution.wood + r.distribution.fire + r.distribution.earth + r.distribution.metal + r.distribution.water;
  assert.equal(total, 6, '연월일 6글자 합은 6');
});

test('computeSaju: 음력 입력도 처리한다', () => {
  const r = S.computeSaju({ year:1990, month:5, day:22, calendar:'lunar' });
  assert.ok(r.dayWuxing);
  assert.equal(Object.values(r.distribution).reduce((a,b)=>a+b,0), 6);
});
