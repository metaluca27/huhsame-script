// landing/merge/merge-core.test.mjs — 순수 계산 모듈 테스트 (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const core = require('./merge-core.js');

test('STAGES는 11단계, 지름과 점수가 단조 증가', () => {
  assert.equal(core.STAGES.length, 11);
  for (let i = 1; i < 11; i++) {
    assert.ok(core.STAGES[i].diamPct > core.STAGES[i - 1].diamPct, 'diam ' + i);
    assert.ok(core.STAGES[i].score > core.STAGES[i - 1].score, 'score ' + i);
  }
  assert.equal(core.STAGES[0].key, 'jujuya');
  assert.equal(core.STAGES[10].key, 'luka-legend');
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
  assert.equal(core.mergePoints(2, 2), 7);   // 6 × 1.25 = 7.5 → 7
  assert.equal(core.mergePoints(10, 20), 198);
});

test('점수 상한: 단계별 합체 횟수 × 점수 × 3 + 전설 소멸 × 100', () => {
  const stages = [10, 5, 2, 0, 0, 0, 0, 0, 0, 0, 0];
  assert.equal(core.scoreCap(stages), (10 * 1 + 5 * 3 + 2 * 6) * 3);
  const legend = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2];
  assert.equal(core.scoreCap(legend), 2 * 66 * 3 + 200);
});

test('임의 플레이 로그의 실제 점수는 항상 상한 이하', () => {
  let seed = 7;
  const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  for (let run = 0; run < 200; run++) {
    const stages = new Array(11).fill(0);
    let score = 0, combo = 0;
    const n = 1 + Math.floor(rnd() * 60);
    for (let k = 0; k < n; k++) {
      const st = Math.floor(rnd() * 11);
      combo = rnd() < 0.6 ? combo + 1 : 1;
      stages[st]++;
      score += st === 10 ? core.MERGE_CONFIG.legendBonus : core.mergePoints(st, combo);
    }
    assert.ok(score <= core.scoreCap(stages), `run ${run}: ${score} > ${core.scoreCap(stages)}`);
  }
});

test('낙하 캐릭터 가중치: 0~4단계만, 구간 경계 확인', () => {
  assert.equal(core.pickDropStage(0), 0);
  assert.equal(core.pickDropStage(0.299), 0);
  assert.equal(core.pickDropStage(0.30), 1);
  assert.equal(core.pickDropStage(0.549), 1);
  assert.equal(core.pickDropStage(0.55), 2);
  assert.equal(core.pickDropStage(0.75), 3);
  assert.equal(core.pickDropStage(0.90), 4);
  assert.equal(core.pickDropStage(0.999), 4);
});
