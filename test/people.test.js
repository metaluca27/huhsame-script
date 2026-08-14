const test = require('node:test');
const assert = require('node:assert');
const P = require('../landing/byeol/people.js');

const mkInput = (name, y, m, d) => ({ name, year:y, month:m, day:d, calendar:'solar' });

test('makePerson: 상대의 정령·관계·케미를 조립한다 (나=물)', () => {
  const p = P.makePerson(mkInput('민지', 1992, 8, 3), 'water');
  assert.ok(p.id);
  assert.equal(p.name, '민지');
  assert.ok(['danbi','hanmulgyeol','saessakjigi','janmulgyeol','keunbawi'].includes(p.relationKey));
  assert.ok(p.spiritName && p.typeName && typeof p.score === 'number');
});

test('sortByChemi: 케미 내림차순', () => {
  const list = [{score:70},{score:90},{score:80}];
  const sorted = P.sortByChemi(list);
  assert.deepEqual(sorted.map(x=>x.score), [90,80,70]);
});

test('countByRelation: 관계별 집계', () => {
  const list = [{relationKey:'danbi'},{relationKey:'danbi'},{relationKey:'keunbawi'}];
  const c = P.countByRelation(list);
  assert.equal(c.danbi, 2);
  assert.equal(c.keunbawi, 1);
  assert.equal(c.hanmulgyeol, 0);
});
