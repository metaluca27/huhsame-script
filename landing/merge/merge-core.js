// landing/merge/merge-core.js
// 다락방 합체 게임 — 순수 계산 모듈. 브라우저(전역 MergeCore)와 Node(module.exports) 공용.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MergeCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // index 0 = 1단계. diamPct = 통 안쪽 폭 대비 지름 %, score = 이 단계 둘이 합쳐질 때 기본 점수(삼각수)
  var STAGES = [
    { key: 'jujuya',      name: '주주야',   img: 'img/jujuya.png',      diamPct: 8,  score: 1 },
    { key: 'ruric',       name: '루릭',     img: 'img/ruric.png',       diamPct: 11, score: 3 },
    { key: 'pureum',      name: '푸름이',   img: 'img/pureum.png',      diamPct: 14, score: 6 },
    { key: 'nova',        name: '노바',     img: 'img/nova.png',        diamPct: 17, score: 10 },
    { key: 'luna',        name: '루나',     img: 'img/luna.png',        diamPct: 21, score: 15 },
    { key: 'luka',        name: '루카',     img: 'img/luka.png',        diamPct: 25, score: 21 },
    { key: 'luka-gold',   name: '황금 루카', img: 'img/luka-gold.png',   diamPct: 29, score: 28 },
    { key: 'luka-fire',   name: '불꽃 루카', img: 'img/luka-fire.png',   diamPct: 33, score: 36 },
    { key: 'luka-space',  name: '우주 루카', img: 'img/luka-space.png',  diamPct: 37, score: 45 },
    { key: 'luka-angel',  name: '천사 루카', img: 'img/luka-angel.png',  diamPct: 41, score: 55 },
    { key: 'luka-legend', name: '전설 루카', img: 'img/luka-legend.png', diamPct: 45, score: 66 },
  ];

  var MERGE_CONFIG = {
    comboWindowMs: 1500,
    maxMultiplier: 3,
    legendBonus: 100,
    dangerHoldMs: 1500,
    dropLockMs: 500,
    dropWeights: [30, 25, 20, 15, 10],
  };

  function radiusFor(stageIdx, jarInnerWidth) {
    return STAGES[stageIdx].diamPct / 100 * jarInnerWidth / 2;
  }
  function stageScore(stageIdx) { return STAGES[stageIdx].score; }
  function comboMultiplier(combo) {
    var m = 1 + 0.25 * (Math.max(1, combo) - 1);
    return Math.min(MERGE_CONFIG.maxMultiplier, m);
  }
  function mergePoints(stageIdx, combo) {
    return Math.floor(stageScore(stageIdx) * comboMultiplier(combo));
  }
  // stages[i] = i단계 둘이 합쳐진 횟수. 최대 배율 ×3 가정 + 전설 소멸 보너스.
  function scoreCap(stages) {
    var sum = 0;
    for (var i = 0; i < STAGES.length; i++) sum += (stages[i] || 0) * STAGES[i].score;
    return sum * MERGE_CONFIG.maxMultiplier + (stages[10] || 0) * MERGE_CONFIG.legendBonus;
  }
  function pickDropStage(rand) {
    var w = MERGE_CONFIG.dropWeights, total = 0, i;
    for (i = 0; i < w.length; i++) total += w[i];
    var x = rand * total;
    for (i = 0; i < w.length; i++) { x -= w[i]; if (x < 0) return i; }
    return w.length - 1;
  }

  return { STAGES: STAGES, MERGE_CONFIG: MERGE_CONFIG, radiusFor: radiusFor, stageScore: stageScore,
           comboMultiplier: comboMultiplier, mergePoints: mergePoints, scoreCap: scoreCap, pickDropStage: pickDropStage };
}));
