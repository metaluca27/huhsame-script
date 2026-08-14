var STEM_WUXING = {
  '甲':'wood','乙':'wood','丙':'fire','丁':'fire','戊':'earth',
  '己':'earth','庚':'metal','辛':'metal','壬':'water','癸':'water'
};
var BRANCH_WUXING = {
  '寅':'wood','卯':'wood','巳':'fire','午':'fire',
  '辰':'earth','戌':'earth','丑':'earth','未':'earth',
  '申':'metal','酉':'metal','亥':'water','子':'water'
};
var SEASON_BY_BRANCH = {
  '寅':'spring','卯':'spring','辰':'spring',
  '巳':'summer','午':'summer','未':'summer',
  '申':'autumn','酉':'autumn','戌':'autumn',
  '亥':'winter','子':'winter','丑':'winter'
};
var SHENG = { wood:'fire', fire:'earth', earth:'metal', metal:'water', water:'wood' };
var KE    = { wood:'earth', earth:'water', water:'fire', fire:'metal', metal:'wood' };

var SPIRITS = {
  water: { name:'여울', el:'물', hanja:'水', symbol:'drop',  color1:'#8fe0ff', color2:'#3aa6ea', tagline:'흐름 · 지혜 · 유연',
    desc:'속을 잘 드러내지 않지만 깊어요. 상황에 맞춰 유연하게 흐르고, 눈치가 빨라요. 지혜로운 대신 가끔 마음을 정하기 어려워해요.', strength:'유연함과 통찰' },
  fire:  { name:'노을', el:'불', hanja:'火', symbol:'flame', color1:'#ffb27a', color2:'#ff6f4d', tagline:'열정 · 표현 · 번짐',
    desc:'감정과 표현이 풍부하고 따뜻해요. 사람을 끌어당기는 힘이 있지만, 금방 타올랐다 식기도 해요.', strength:'열정과 표현력' },
  wood:  { name:'새록', el:'나무', hanja:'木', symbol:'sprout', color1:'#7bec96', color2:'#38b45f', tagline:'자라남 · 챙김',
    desc:'곧게 자라려는 힘이 있어요. 배려심이 많고 남을 잘 챙기지만, 한번 정하면 고집이 세요.', strength:'성장과 배려' },
  earth: { name:'두름', el:'흙', hanja:'土', symbol:'mount', color1:'#ffdf8f', color2:'#f5b73e', tagline:'안정 · 품음 · 중심',
    desc:'믿음직하고 품이 넓어요. 어디서든 중심을 잡아주지만, 큰 변화 앞에선 무거워져요.', strength:'안정과 포용' },
  metal: { name:'빛돌', el:'쇠', hanja:'金', symbol:'gem',   color1:'#ffffff', color2:'#c2d0ea', tagline:'결단 · 단단함 · 명료',
    desc:'판단이 분명하고 단단해요. 결단력 있고 의리를 지키지만, 가끔 말이 날카로워요.', strength:'결단과 의리' }
};

var SEASONS = {
  spring: { label:'봄', adj:'움트는',   mood:'막 피어나 설레는 기운' },
  summer: { label:'여름', adj:'무르익은', mood:'한껏 무르익어 왕성한 기운' },
  autumn: { label:'가을', adj:'깊어지는', mood:'차분히 깊어지는 기운' },
  winter: { label:'겨울', adj:'고요한',   mood:'고요히 안으로 모으는 기운' }
};

var RELATIONS = {
  danbi:       { label:'단비',     emoji:'🌟', base:85, span:8, desc:'지칠 때 기운을 채워주는 사람', caution:'기대기만 하면 그 사람이 지쳐요' },
  hanmulgyeol: { label:'한 물결',  emoji:'🤝', base:80, span:7, desc:'설명 없이 손발 맞는 사람', caution:'닮은 만큼 같은 약점도 나눠 가져요' },
  saessakjigi: { label:'새싹지기', emoji:'🌱', base:74, span:7, desc:'내가 마음 써서 키우는 사람', caution:'너무 퍼주면 내 기운이 빠져요' },
  janmulgyeol: { label:'잔물결',   emoji:'🧭', base:70, span:7, desc:'내 옆에서 척척 도와주는 사람', caution:'이끄는 게 지나치면 눌린다 느껴요' },
  keunbawi:    { label:'큰바위',   emoji:'⚡', base:66, span:9, desc:'긴장되지만 나를 다잡아주는 사람', caution:'부딪히면 세게 부딪혀요 — 거리 조절' }
};

function typeName(wuxingKey, seasonKey) {
  return SEASONS[seasonKey].adj + ' ' + SPIRITS[wuxingKey].name;
}

if (typeof module !== 'undefined') {
  module.exports = { STEM_WUXING, BRANCH_WUXING, SEASON_BY_BRANCH, SHENG, KE, SPIRITS, SEASONS, RELATIONS, typeName };
}
