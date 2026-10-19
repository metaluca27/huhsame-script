// landing/ssukssuk/ssuk-core.test.mjs — 순수 계산·데이터 테스트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const core = require('./ssuk-core.js');

test('STAGES는 11단계, 지름과 점수가 단조 증가', () => {
  assert.equal(core.STAGES.length, 11);
  for (let i = 1; i < 11; i++) {
    assert.ok(core.STAGES[i].diamPct > core.STAGES[i - 1].diamPct, 'diam ' + i);
    assert.ok(core.STAGES[i].score > core.STAGES[i - 1].score, 'score ' + i);
  }
  assert.equal(core.STAGES[0].key, 'idea');
  assert.equal(core.STAGES[5].key, 'innovation');
  assert.equal(core.STAGES[10].key, 'k-champion');
});

test('모든 단계에 이름·이모지·색·도감 문구·상대경로 이미지가 있고 key가 겹치지 않음', () => {
  const keys = new Set();
  core.STAGES.forEach((s, i) => {
    assert.ok(s.name && s.name.length <= 14, 'name ' + i);
    assert.ok(s.emoji, 'emoji ' + i);
    assert.match(s.color, /^#[0-9A-F]{6}$/i, 'color ' + i);
    assert.ok(s.card && s.card.length >= 10 && s.card.length <= 90, 'card ' + i + ' len ' + (s.card || '').length);
    assert.equal(s.img, './img/stage' + String(i + 1).padStart(2, '0') + '.png');
    assert.ok(!keys.has(s.key), 'dup ' + s.key); keys.add(s.key);
  });
});

test('단계 점수는 삼각수', () => {
  assert.deepEqual(core.STAGES.map(s => s.score), [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66]);
  assert.equal(core.stageScore(5), 21);
});

test('반지름: 통 폭 360에서 1단계 14.4, 11단계 81', () => {
  assert.equal(core.radiusFor(0, 360), 14.4);
  assert.equal(core.radiusFor(10, 360), 81);
});

test('콤보 배율: 1→1, 2→1.25, 5→2, 9 이상→3 고정', () => {
  assert.equal(core.comboMultiplier(1), 1);
  assert.equal(core.comboMultiplier(2), 1.25);
  assert.equal(core.comboMultiplier(5), 2);
  assert.equal(core.comboMultiplier(9), 3);
  assert.equal(core.comboMultiplier(30), 3);
});

test('합체 점수는 단계점수×배율 내림', () => {
  assert.equal(core.mergePoints(0, 1), 1);
  assert.equal(core.mergePoints(2, 2), 7);
  assert.equal(core.mergePoints(10, 20), 198);
});

test('낙하 단계 가중치: 0~4단계만, 구간 경계 확인', () => {
  assert.equal(core.pickDropStage(0), 0);
  assert.equal(core.pickDropStage(0.299), 0);
  assert.equal(core.pickDropStage(0.30), 1);
  assert.equal(core.pickDropStage(0.55), 2);
  assert.equal(core.pickDropStage(0.75), 3);
  assert.equal(core.pickDropStage(0.90), 4);
  assert.equal(core.pickDropStage(0.999), 4);
});

test('highestStage: 발견 배열에서 가장 높은 단계 번호, 없으면 0', () => {
  assert.equal(core.highestStage([true, true, false, true, false, false, false, false, false, false, false]), 3);
  assert.equal(core.highestStage(new Array(11).fill(false)), 0);
});
