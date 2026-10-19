// landing/ssukssuk/ssuk-core.js
// 쑥쑥! 혁신제품 — 순수 계산·데이터 모듈. 브라우저(전역 SsukCore)와 Node(module.exports) 공용.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SsukCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // index 0 = 1단계. diamPct = 통 안쪽 폭 대비 지름 %, score = 이 단계 둘이 합쳐질 때 기본 점수(삼각수).
  // card = 도감 카드 "알쓸조달" 문구 (근거: 설계서 3절, 2026-10 기사)
  var STAGES = [
    { key: 'idea',        name: '아이디어',          emoji: '💡', color: '#FFE27A', img: './img/stage01.png', diamPct: 8,  score: 1,
      card: '모든 혁신은 작은 생각 하나에서 시작해요.' },
    { key: 'blueprint',   name: '설계도',            emoji: '📝', color: '#9AD0FF', img: './img/stage02.png', diamPct: 11, score: 3,
      card: '생각을 그림과 숫자로 옮기면 만들 수 있는 계획이 돼요.' },
    { key: 'prototype',   name: '시제품',            emoji: '🔧', color: '#FFB37A', img: './img/stage03.png', diamPct: 14, score: 6,
      card: '처음 만든 물건이에요. 조달청은 뛰어난 시제품을 \'혁신시제품\'으로 뽑아 공공기관이 써 보게 도와요.' },
    { key: 'certified',   name: '시험·인증',          emoji: '🧪', color: '#B6E3A8', img: './img/stage04.png', diamPct: 17, score: 10,
      card: '안전하고 품질이 좋은지 꼼꼼히 검증받아요. 믿고 쓸 수 있어야 공공기관이 살 수 있어요.' },
    { key: 'product',     name: '우리 동네 기업 제품', emoji: '🏭', color: '#C9B6FF', img: './img/stage05.png', diamPct: 21, score: 15,
      card: '중소기업이 만든 진짜 제품이 탄생했어요!' },
    { key: 'innovation',  name: '혁신제품 지정',      emoji: '⭐', color: '#FFD34D', img: './img/stage06.png', diamPct: 25, score: 21,
      card: '조달청이 기술력을 인정하면 혁신제품이 돼요. 공공기관이 입찰 없이 바로 살 수 있어요(3년, 최대 6년).' },
    { key: 'naramarket',  name: '나라장터 등록',      emoji: '🛒', color: '#5EC8C8', img: './img/stage07.png', diamPct: 29, score: 28,
      card: '나라장터는 공공기관이 물건을 사는 온라인 장터예요. 7만여 공공기관과 60만여 기업이 이용해요.' },
    { key: 'pilot',       name: '첫 공공 납품',       emoji: '🏫', color: '#FF9AA2', img: './img/stage08.png', diamPct: 33, score: 36,
      card: '시범구매: 조달청이 혁신제품을 사서 학교·병원·소방서에 주면, 현장에서 직접 써 보며 성능을 확인해요.' },
    { key: 'nationwide',  name: '전국 공공기관으로',   emoji: '🏢', color: '#6FA8FF', img: './img/stage09.png', diamPct: 37, score: 45,
      card: '검증된 제품은 전국 공공기관으로 퍼져요. 우리나라 공공구매는 한 해 238조 원 규모예요.' },
    { key: 'export',      name: '해외 수출',          emoji: '🌏', color: '#7ED6A5', img: './img/stage10.png', diamPct: 41, score: 55,
      card: '조달청은 경쟁력 있는 기업을 \'G-PASS 기업\'으로 뽑아 해외 공공조달 시장 진출을 도와요.' },
    { key: 'k-champion',  name: 'K-혁신 대표기업',    emoji: '🏆', color: '#FF7A59', img: './img/stage11.png', diamPct: 45, score: 66,
      card: '작은 아이디어가 세계적인 기업이 됐어요! 공공조달은 혁신기업의 디딤돌이에요.' },
  ];

  var MERGE_CONFIG = {
    comboWindowMs: 1500,
    maxMultiplier: 3,
    legendBonus: 100,
    dangerHoldMs: 1500,
    dropLockMs: 500,
    dropWeights: [40, 35, 25],   // 1~3단계만 떨어짐 → 4단계 이상은 합체로만 (정책 순서대로 카드가 열림)
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
  function pickDropStage(rand) {
    var w = MERGE_CONFIG.dropWeights, total = 0, i;
    for (i = 0; i < w.length; i++) total += w[i];
    var x = rand * total;
    for (i = 0; i < w.length; i++) { x -= w[i]; if (x < 0) return i; }
    return w.length - 1;
  }
  function highestStage(discovered) {
    for (var i = discovered.length - 1; i >= 0; i--) if (discovered[i]) return i;
    return 0;
  }

  return { STAGES: STAGES, MERGE_CONFIG: MERGE_CONFIG, radiusFor: radiusFor, stageScore: stageScore,
           comboMultiplier: comboMultiplier, mergePoints: mergePoints, pickDropStage: pickDropStage,
           highestStage: highestStage };
}));
