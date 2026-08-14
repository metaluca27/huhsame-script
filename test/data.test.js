const test = require('node:test');
const assert = require('node:assert');
const D = require('../landing/byeol/data.js');

test('천간→오행 매핑', () => {
  assert.equal(D.STEM_WUXING['甲'], 'wood');
  assert.equal(D.STEM_WUXING['壬'], 'water');
  assert.equal(D.STEM_WUXING['戊'], 'earth');
});

test('지지→오행 매핑', () => {
  assert.equal(D.BRANCH_WUXING['子'], 'water');
  assert.equal(D.BRANCH_WUXING['午'], 'fire');
  assert.equal(D.BRANCH_WUXING['辰'], 'earth');
});

test('지지→계절 매핑', () => {
  assert.equal(D.SEASON_BY_BRANCH['寅'], 'spring');
  assert.equal(D.SEASON_BY_BRANCH['子'], 'winter');
});

test('정령 5종이 모두 정의됨', () => {
  ['wood','fire','earth','metal','water'].forEach(k => {
    assert.ok(D.SPIRITS[k] && D.SPIRITS[k].name, k + ' 정령 필요');
  });
  assert.equal(D.SPIRITS['water'].name, '여울');
  assert.equal(D.SPIRITS['metal'].name, '빛돌');
});

test('관계 5종이 모두 정의됨', () => {
  ['danbi','hanmulgyeol','saessakjigi','janmulgyeol','keunbawi'].forEach(k => {
    assert.ok(D.RELATIONS[k] && typeof D.RELATIONS[k].base === 'number');
  });
});

test('상생·상극 맵', () => {
  assert.equal(D.SHENG['water'], 'wood');   // 수생목
  assert.equal(D.KE['water'], 'fire');      // 수극화
});

test('유형 이름 조합', () => {
  assert.equal(D.typeName('water', 'winter'), '고요한 여울');
  assert.equal(D.typeName('wood', 'spring'), '움트는 새록');
});
