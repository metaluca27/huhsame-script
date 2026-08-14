const test = require('node:test');
const assert = require('node:assert');
const C = require('../landing/byeol/compat.js');

test('relationKey: 나=물 기준 5관계', () => {
  assert.equal(C.relationKey('water', 'metal'), 'danbi');       // 금생수: 상대가 나를 살림
  assert.equal(C.relationKey('water', 'water'), 'hanmulgyeol'); // 같은 오행
  assert.equal(C.relationKey('water', 'wood'), 'saessakjigi');  // 수생목: 내가 키움
  assert.equal(C.relationKey('water', 'fire'), 'janmulgyeol');  // 수극화: 내가 이끎
  assert.equal(C.relationKey('water', 'earth'), 'keunbawi');    // 토극수: 나를 누름
});

test('relationKey: 나=나무 기준도 정확', () => {
  assert.equal(C.relationKey('wood', 'water'), 'danbi');        // 수생목
  assert.equal(C.relationKey('wood', 'fire'), 'saessakjigi');   // 목생화
  assert.equal(C.relationKey('wood', 'earth'), 'janmulgyeol');  // 목극토
  assert.equal(C.relationKey('wood', 'metal'), 'keunbawi');     // 금극목
});

test('chemiScore: 밴드 범위 안, 결정적', () => {
  const s1 = C.chemiScore('danbi', 12345);
  const s2 = C.chemiScore('danbi', 12345);
  assert.equal(s1, s2, '같은 seed면 같은 점수');
  assert.ok(s1 >= 85 && s1 <= 93, '단비 밴드 85~93 안'); // base85 + 0~8
});

test('computeCompat: 통합 결과', () => {
  const r = C.computeCompat('water', 'metal', C.seedFromBirth({year:1988,month:3,day:2}));
  assert.equal(r.relationKey, 'danbi');
  assert.equal(r.label, '단비');
  assert.ok(r.score >= 85);
  assert.ok(r.desc.length > 0);
});
