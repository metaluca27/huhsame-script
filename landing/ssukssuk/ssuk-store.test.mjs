// landing/ssukssuk/ssuk-store.test.mjs — 저장 모듈 테스트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createStore } = require('./ssuk-store.js');

function fakeStorage() {
  const m = {};
  return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, _m: m };
}
const brokenStorage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };

test('처음엔 최고점수 0, 카드 없음, 소리 켜짐', () => {
  const s = createStore(fakeStorage());
  assert.equal(s.best(), 0);
  assert.deepEqual(s.cards(), []);
  assert.equal(s.soundOn(), true);
});

test('최고점수·소리 저장이 같은 저장소의 새 인스턴스에서도 유지', () => {
  const st = fakeStorage();
  const a = createStore(st); a.saveBest(1234); a.saveSound(false);
  const b = createStore(st);
  assert.equal(b.best(), 1234);
  assert.equal(b.soundOn(), false);
});

test('addCard: 새 카드면 true, 이미 있으면 false, 정렬 유지', () => {
  const s = createStore(fakeStorage());
  assert.equal(s.addCard(5), true);
  assert.equal(s.addCard(0), true);
  assert.equal(s.addCard(5), false);
  assert.deepEqual(s.cards(), [0, 5]);
  assert.equal(s.hasCard(5), true);
  assert.equal(s.hasCard(3), false);
});

test('저장소가 깨진 JSON이거나 범위 밖 값이면 무시', () => {
  const st = fakeStorage(); st.setItem('ssuk.cards', '{oops');
  assert.deepEqual(createStore(st).cards(), []);
  st.setItem('ssuk.cards', JSON.stringify([1, 99, -1, 'x', 2.5, 3]));
  assert.deepEqual(createStore(st).cards(), [1, 3]);
});

test('저장소 접근이 막혀도(시크릿 창) 같은 인스턴스 안에서는 메모리로 동작', () => {
  const s = createStore(brokenStorage);
  s.saveBest(50); s.addCard(2); s.saveSound(false);
  assert.equal(s.best(), 50);
  assert.deepEqual(s.cards(), [2]);
  assert.equal(s.soundOn(), false);
});

test('저장소가 null이어도 동작', () => {
  const s = createStore(null);
  assert.equal(s.addCard(1), true);
  assert.deepEqual(s.cards(), [1]);
});

test('addCard: 범위 밖·정수 아닌 값은 거부하고 저장하지 않음', () => {
  const st = fakeStorage();
  const s = createStore(st);
  for (const bad of [11, -1, 3.5, '3', NaN, undefined]) {
    assert.equal(s.addCard(bad), false, `거부되어야 함: ${String(bad)}`);
  }
  assert.deepEqual(s.cards(), []);
  assert.equal(st._m['ssuk.cards'], undefined);
});

test('깨진 최고점수는 0으로 처리', () => {
  const st = fakeStorage(); st.setItem('ssuk.best', 'abc');
  assert.equal(createStore(st).best(), 0);
});
