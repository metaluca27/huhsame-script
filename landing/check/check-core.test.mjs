// landing/check/check-core.test.mjs — 오탈자 검사기 계산 모듈 테스트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const C = require('./check-core.js');

test('joinPageLines: 같은 줄은 잇고 hasEOL에서 줄바꿈, spans 기록', () => {
  const r = C.joinPageLines([{ str: '할수', hasEOL: false }, { str: '있다', hasEOL: true }, { str: '다음', hasEOL: false }]);
  assert.equal(r.text, '할수있다\n다음');
  assert.deepEqual(r.spans[1], { item: 1, start: 2, end: 4 });
});

test('chunkPages: 쪽 머리 붙이고 maxChars 전에 자른다', () => {
  const out = C.chunkPages([{ page: 1, text: '가'.repeat(2000) }, { page: 2, text: '나'.repeat(2000) }]);
  assert.equal(out.length, 2);
  assert.deepEqual(out[0].pages, [1]);
  assert.ok(out[1].text.startsWith('[[쪽 2]]'));
});

test('chunkPages: 긴 쪽은 줄 단위로 쪼개고 조각마다 같은 머리', () => {
  const text = Array.from({ length: 50 }, () => '다'.repeat(100)).join('\n');
  const out = C.chunkPages([{ page: 1, text }]);
  assert.ok(out.length >= 2);
  for (const c of out) { assert.ok(c.text.length <= 3000); assert.ok(c.text.startsWith('[[쪽 1]]')); }
});

test('dropLineBreakArtifacts: 줄바꿈에 걸친 띄어쓰기 지적만 버린다', () => {
  const art = { page: 1, wrong: '서로도우며', right: '서로 도우며', reason: '', unsure: false };
  assert.deepEqual(C.dropLineBreakArtifacts([art], '함께 서로\n도우며'), []);
  const f = { page: 1, wrong: '할수있다', right: '할 수 있다', reason: '', unsure: false };
  assert.equal(C.dropLineBreakArtifacts([f], '이걸 할수있다').length, 1);
  const g = { page: 1, wrong: '몇일', right: '며칠', reason: '', unsure: false };
  assert.equal(C.dropLineBreakArtifacts([g], '몇\n일').length, 1);
});

test('locate: 줄바꿈 건너뛰며 찾고 from 이후부터, 없으면 null', () => {
  assert.deepEqual(C.locate('가 할수\n있다', '할수있다'), { start: 2, end: 7 });
  assert.deepEqual(C.locate('안되요 안되요', '안되요', 3), { start: 4, end: 7 });
  assert.equal(C.locate('아무말', '없는말'), null);
});

test('rectsFor: 조각 안 글자 비율로 가로 위치', () => {
  assert.deepEqual(C.rectsFor([{ item: 0, start: 0, end: 4 }], [{ width: 40 }], 2, 4), [{ item: 0, x0: 20, x1: 40 }]);
});

test('applyFixes: 범위를 바꾸고 범위 안 줄바꿈은 사라진다', () => {
  assert.equal(C.applyFixes('이걸 할수\n있다', [{ start: 3, end: 8, fix: '할 수 있다' }]), '이걸 할 수 있다');
});

test('toPlainText: 꽉 찬 줄은 이어 붙이고 짧은 줄은 문단 끝', () => {
  assert.equal(C.toPlainText([{ text: '주민들은', right: 100 }, { text: '모였다.', right: 40 }, { text: '다음 문단', right: 60 }], 100),
    '주민들은 모였다.\n다음 문단');
});

test('formatReport: 머리글 + 확인 필요 표시', () => {
  const lines = C.formatReport([{ page: 2, wrong: '덕하동카페', right: '', reason: '고유명사', unsure: true }]).split('\n');
  assert.equal(lines[1], '2\t덕하동카페\t(확인 필요)\t고유명사');
});

test('toPlainText: joins에 있는 잘린 단어는 glue 글자로 잇는다', () => {
  const lines = [{ text: '함께 하는 마음', right: 100 }, { text: '을 확인했다. "몇', right: 100 }, { text: '일" 동안', right: 30 }];
  assert.equal(C.toPlainText(lines, 100, ['마음을', '몇일'], '~'), '함께 하는 마음~을 확인했다. "몇~일" 동안');
  assert.equal(C.toPlainText(lines, 100, ['마음을', '몇일']), '함께 하는 마음을 확인했다. "몇일" 동안');
});

test('dropLineBreakArtifacts: 줄바꿈 옆이라도 진짜 띄어쓰기 오류는 남긴다', () => {
  const f = { page: 1, wrong: '집에갈수', right: '집에 갈 수', reason: '', unsure: false };
  assert.equal(C.dropLineBreakArtifacts([f], '그는 집에\n갈수 있다').length, 1);
  const g = { page: 1, wrong: '할수있다', right: '할 수 있다', reason: '', unsure: false };
  assert.equal(C.dropLineBreakArtifacts([g], '이걸 할수\n있다').length, 1);
});

test('locate: 줄바꿈 자리에 모델이 띄어쓰기를 넣어 베껴도 찾는다', () => {
  assert.deepEqual(C.locate('그는 집에\n갈수 있다', '집에 갈수'), { start: 3, end: 8 });
});
