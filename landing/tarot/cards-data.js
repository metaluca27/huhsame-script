// 심연의 타로 — 카드 콘텐츠 데이터
// 바닐라 JS 전역 상수. <script> 순차 로드 방식. export/import 사용 금지.

const TAROT_CARDS = [
  // ===== 메이저 아르카나 (0~21) =====
  {
    id: 0, code: "ar00", nameKo: "바보", nameEn: "The Fool",
    arcana: "major", suit: null, number: 0,
    upright: "새로운 시작과 순수한 가능성의 카드입니다. 계산 없이 내딛는 첫걸음이 오히려 행운을 부릅니다.",
    reversed: "무모함과 준비 부족을 경고합니다. 낭만이 현실 감각을 가리고 있지 않은지 돌아보세요.",
    keywords: ["시작", "자유", "모험"],
    astro: "천왕성 · 공기 원소"
  },
  {
    id: 1, code: "ar01", nameKo: "마법사", nameEn: "The Magician",
    arcana: "major", suit: null, number: 1,
    upright: "가진 재능과 도구를 온전히 활용해 원하는 결과를 만들어낼 힘이 있음을 알려줍니다. 의지가 현실이 되는 시점입니다.",
    reversed: "재능을 엉뚱한 곳에 쓰거나 조작적인 태도로 흐르고 있지 않은지 살펴야 합니다.",
    keywords: ["의지", "창조", "능력"],
    astro: "수성 · 공기 원소"
  },
  {
    id: 2, code: "ar02", nameKo: "여사제", nameEn: "The High Priestess",
    arcana: "major", suit: null, number: 2,
    upright: "겉으로 드러나지 않은 진실과 직관의 목소리를 신뢰하라고 말합니다. 조용히 관찰할 때 답이 보입니다.",
    reversed: "직관을 무시하거나 감춰야 할 것을 성급히 드러내려는 상태를 나타냅니다.",
    keywords: ["직관", "비밀", "내면"],
    astro: "달 · 물 원소"
  },
  {
    id: 3, code: "ar03", nameKo: "여황제", nameEn: "The Empress",
    arcana: "major", suit: null, number: 3,
    upright: "풍요와 생명력, 돌봄의 에너지가 넘치는 시기임을 뜻합니다. 만들고 기르는 모든 일이 순조롭게 자랍니다.",
    reversed: "과잉보호나 정체된 창조력, 스스로를 돌보지 못하는 상태를 가리킵니다.",
    keywords: ["풍요", "모성", "창조"],
    astro: "금성 · 흙 원소"
  },
  {
    id: 4, code: "ar04", nameKo: "황제", nameEn: "The Emperor",
    arcana: "major", suit: null, number: 4,
    upright: "체계와 규율로 안정된 기반을 세우는 힘을 뜻합니다. 책임을 맡아 질서를 만들 때 신뢰가 쌓입니다.",
    reversed: "지나친 통제나 경직된 태도가 관계와 상황을 억누르고 있을 수 있습니다.",
    keywords: ["권위", "질서", "안정"],
    astro: "양자리 · 불 원소"
  },
  {
    id: 5, code: "ar05", nameKo: "교황", nameEn: "The Hierophant",
    arcana: "major", suit: null, number: 5,
    upright: "전통과 배움, 검증된 가르침을 따르는 것이 도움이 되는 시기입니다. 스승이나 공동체의 지혜에 귀 기울이세요.",
    reversed: "관습에 얽매이거나 형식적인 가르침에 회의를 느끼는 상태를 나타냅니다.",
    keywords: ["전통", "가르침", "신념"],
    astro: "황소자리 · 흙 원소"
  },
  {
    id: 6, code: "ar06", nameKo: "연인", nameEn: "The Lovers",
    arcana: "major", suit: null, number: 6,
    upright: "가치관에 따른 선택과 깊은 유대를 상징합니다. 마음이 이끄는 방향이 곧 옳은 길일 가능성이 큽니다.",
    reversed: "가치관의 불일치나 우유부단함으로 관계에 균열이 생길 수 있음을 경고합니다.",
    keywords: ["사랑", "선택", "조화"],
    astro: "쌍둥이자리 · 공기 원소"
  },
  {
    id: 7, code: "ar07", nameKo: "전차", nameEn: "The Chariot",
    arcana: "major", suit: null, number: 7,
    upright: "상반된 힘을 하나로 통제해 목표를 향해 밀고 나가는 의지력을 뜻합니다. 지금은 추진력을 발휘할 때입니다.",
    reversed: "방향을 잃거나 내적 갈등으로 인해 전진이 멈추는 상태를 나타냅니다.",
    keywords: ["의지", "승리", "전진"],
    astro: "게자리 · 물 원소"
  },
  {
    id: 8, code: "ar08", nameKo: "힘", nameEn: "Strength",
    arcana: "major", suit: null, number: 8,
    upright: "부드러운 인내와 자기 통제로 거친 본능마저 다스리는 진짜 힘을 뜻합니다. 온화함이 결국 이깁니다.",
    reversed: "자신감 결여나 감정 조절 실패로 힘이 소진된 상태를 가리킵니다.",
    keywords: ["용기", "인내", "자제"],
    astro: "사자자리 · 불 원소"
  },
  {
    id: 9, code: "ar09", nameKo: "은둔자", nameEn: "The Hermit",
    arcana: "major", suit: null, number: 9,
    upright: "홀로 물러나 내면을 성찰하며 답을 찾는 시기임을 알려줍니다. 침묵 속에서 얻는 지혜가 있습니다.",
    reversed: "고립이 지나쳐 외로움에 잠식되거나 조언을 거부하는 상태를 뜻합니다.",
    keywords: ["성찰", "고독", "지혜"],
    astro: "처녀자리 · 흙 원소"
  },
  {
    id: 10, code: "ar10", nameKo: "운명의 수레바퀴", nameEn: "Wheel of Fortune",
    arcana: "major", suit: null, number: 10,
    upright: "변화의 흐름이 다시 순환하며 새로운 국면이 열리는 것을 뜻합니다. 흐름을 거스르지 말고 올라타세요.",
    reversed: "예기치 못한 역전이나 정체된 운의 흐름에 발이 묶인 상태를 나타냅니다.",
    keywords: ["순환", "변화", "운명"],
    astro: "목성 · 불 원소"
  },
  {
    id: 11, code: "ar11", nameKo: "정의", nameEn: "Justice",
    arcana: "major", suit: null, number: 11,
    upright: "공정한 판단과 그에 따른 합당한 결과를 뜻합니다. 지금까지의 선택이 정직하게 저울질됩니다.",
    reversed: "불공정한 처사나 책임 회피로 균형이 무너진 상태를 경고합니다.",
    keywords: ["균형", "공정", "인과"],
    astro: "천칭자리 · 공기 원소"
  },
  {
    id: 12, code: "ar12", nameKo: "매달린 사람", nameEn: "The Hanged Man",
    arcana: "major", suit: null, number: 12,
    upright: "기존 관점을 내려놓고 다른 각도로 바라볼 때 얻는 깨달음을 뜻합니다. 멈춤이 곧 성장입니다.",
    reversed: "불필요한 희생이나 정체된 상황에 계속 갇혀 있는 상태를 나타냅니다.",
    keywords: ["관점전환", "희생", "기다림"],
    astro: "해왕성 · 물 원소"
  },
  {
    id: 13, code: "ar13", nameKo: "죽음", nameEn: "Death",
    arcana: "major", suit: null, number: 13,
    upright: "한 시기의 완전한 종결과 그로 인한 재생을 뜻합니다. 놓아주어야 새로운 것이 들어올 자리가 생깁니다.",
    reversed: "변화에 대한 저항이나 끝맺지 못하고 질질 끄는 상태를 가리킵니다.",
    keywords: ["종결", "변화", "재생"],
    astro: "전갈자리 · 물 원소"
  },
  {
    id: 14, code: "ar14", nameKo: "절제", nameEn: "Temperance",
    arcana: "major", suit: null, number: 14,
    upright: "서로 다른 요소를 조화롭게 섞어 균형을 이루는 지혜를 뜻합니다. 서두르지 않을 때 최선이 완성됩니다.",
    reversed: "극단으로 치우치거나 균형을 잃어 조화가 깨진 상태를 나타냅니다.",
    keywords: ["조화", "균형", "치유"],
    astro: "사수자리 · 불 원소"
  },
  {
    id: 15, code: "ar15", nameKo: "악마", nameEn: "The Devil",
    arcana: "major", suit: null, number: 15,
    upright: "집착이나 욕망, 스스로 만든 속박에 얽매여 있음을 보여줍니다. 그 사슬을 직시하는 것이 첫걸음입니다.",
    reversed: "억눌렸던 속박에서 벗어나기 시작하거나 유혹을 조금씩 끊어내는 과정을 뜻합니다.",
    keywords: ["속박", "욕망", "집착"],
    astro: "염소자리 · 흙 원소"
  },
  {
    id: 16, code: "ar16", nameKo: "탑", nameEn: "The Tower",
    arcana: "major", suit: null, number: 16,
    upright: "갑작스러운 붕괴로 거짓된 구조가 무너지는 것을 뜻합니다. 충격적이지만 진실을 드러내는 계기입니다.",
    reversed: "무너짐을 계속 미루거나 작은 위기로 축소되어 나타나는 상태를 뜻합니다.",
    keywords: ["붕괴", "각성", "격변"],
    astro: "화성 · 불 원소"
  },
  {
    id: 17, code: "ar17", nameKo: "별", nameEn: "The Star",
    arcana: "major", suit: null, number: 17,
    upright: "시련 뒤에 찾아오는 희망과 치유의 빛을 뜻합니다. 지금은 회복을 믿고 나아갈 때입니다.",
    reversed: "희망을 잃거나 자신을 믿지 못해 방향을 잡지 못하는 상태를 나타냅니다.",
    keywords: ["희망", "치유", "영감"],
    astro: "물병자리 · 공기 원소"
  },
  {
    id: 18, code: "ar18", nameKo: "달", nameEn: "The Moon",
    arcana: "major", suit: null, number: 18,
    upright: "불안과 착각이 뒤섞인 모호한 상황을 뜻합니다. 두려움 속에서도 직관을 따라 천천히 나아가세요.",
    reversed: "혼란이 걷히며 감춰졌던 진실이 서서히 드러나는 상태를 뜻합니다.",
    keywords: ["불안", "환상", "무의식"],
    astro: "물고기자리 · 물 원소"
  },
  {
    id: 19, code: "ar19", nameKo: "태양", nameEn: "The Sun",
    arcana: "major", suit: null, number: 19,
    upright: "순수한 기쁨과 성공, 명료함이 가득한 카드입니다. 있는 그대로의 자신으로 빛날 시기입니다.",
    reversed: "일시적인 우울감이나 성과가 과하게 부풀려진 상태를 조심하라고 알려줍니다.",
    keywords: ["기쁨", "성공", "생명력"],
    astro: "태양 · 불 원소"
  },
  {
    id: 20, code: "ar20", nameKo: "심판", nameEn: "Judgement",
    arcana: "major", suit: null, number: 20,
    upright: "지난 삶을 돌아보고 다시 태어나는 각성의 순간을 뜻합니다. 부름에 응답할 용기가 필요합니다.",
    reversed: "자기 비판에 갇히거나 중요한 부름을 외면하는 상태를 나타냅니다.",
    keywords: ["각성", "부활", "결산"],
    astro: "명왕성 · 물 원소"
  },
  {
    id: 21, code: "ar21", nameKo: "세계", nameEn: "The World",
    arcana: "major", suit: null, number: 21,
    upright: "긴 여정의 완성과 성취를 뜻합니다. 하나의 주기가 온전히 마무리되고 다음 문이 열립니다.",
    reversed: "마무리가 늦어지거나 완성 직전에 미련이 남아 있는 상태를 뜻합니다.",
    keywords: ["완성", "통합", "성취"],
    astro: "토성 · 흙 원소"
  },

  // ===== 완드 (불 원소 · 열정·행동·일) =====
  {
    id: 22, code: "wa01", nameKo: "완드 에이스", nameEn: "Ace of Wands",
    arcana: "minor", suit: "wands", number: 1,
    upright: "새로운 열정과 창조적 충동이 솟아오르는 순간입니다. 하고 싶었던 일을 시작하기에 더없이 좋은 때입니다.",
    reversed: "의욕은 있지만 실행으로 옮기지 못하거나 지연되는 답답함을 나타냅니다.",
    keywords: ["열정", "시작", "영감"],
    astro: "불 원소 (완드)"
  },
  {
    id: 23, code: "wa02", nameKo: "완드 2", nameEn: "Two of Wands",
    arcana: "minor", suit: "wands", number: 2,
    upright: "이룬 것을 발판 삼아 더 큰 세계로 나아갈 계획을 세우는 시기입니다. 시야를 넓혀 다음 수를 그려보세요.",
    reversed: "두려움 때문에 안전지대에 머물며 결정을 미루는 상태를 뜻합니다.",
    keywords: ["계획", "확장", "결정"],
    astro: "불 원소 (완드)"
  },
  {
    id: 24, code: "wa03", nameKo: "완드 3", nameEn: "Three of Wands",
    arcana: "minor", suit: "wands", number: 3,
    upright: "뿌린 씨앗이 자라 결실이 다가오는 것을 지켜보는 시기입니다. 시야를 멀리 두고 다음 기회를 준비하세요.",
    reversed: "기대했던 결과가 지연되거나 협력이 어긋나 계획이 틀어지는 상태입니다.",
    keywords: ["확장", "전망", "협력"],
    astro: "불 원소 (완드)"
  },
  {
    id: 25, code: "wa04", nameKo: "완드 4", nameEn: "Four of Wands",
    arcana: "minor", suit: "wands", number: 4,
    upright: "노력의 결실을 축하하고 공동체와 기쁨을 나누는 시기입니다. 안정된 기반 위에서 마음껏 즐기세요.",
    reversed: "축하할 일이 미뤄지거나 소속감을 느끼지 못해 겉도는 기분을 나타냅니다.",
    keywords: ["축하", "안정", "화합"],
    astro: "불 원소 (완드)"
  },
  {
    id: 26, code: "wa05", nameKo: "완드 5", nameEn: "Five of Wands",
    arcana: "minor", suit: "wands", number: 5,
    upright: "의견 충돌과 사소한 경쟁이 뒤섞이는 시기입니다. 다투는 에너지를 건설적인 경쟁으로 바꿔보세요.",
    reversed: "갈등이 곪아 터지거나 반대로 회피만 계속되는 상태를 뜻합니다.",
    keywords: ["갈등", "경쟁", "혼란"],
    astro: "불 원소 (완드)"
  },
  {
    id: 27, code: "wa06", nameKo: "완드 6", nameEn: "Six of Wands",
    arcana: "minor", suit: "wands", number: 6,
    upright: "노력한 만큼 인정받고 승리의 기쁨을 누리는 시기입니다. 자신감을 가지고 성과를 드러내세요.",
    reversed: "인정받지 못하거나 자만심으로 오히려 신뢰를 잃는 상태를 경고합니다.",
    keywords: ["승리", "인정", "자신감"],
    astro: "불 원소 (완드)"
  },
  {
    id: 28, code: "wa07", nameKo: "완드 7", nameEn: "Seven of Wands",
    arcana: "minor", suit: "wands", number: 7,
    upright: "자신의 입장과 성과를 지켜내야 하는 시기입니다. 유리한 위치에 서 있으니 물러서지 마세요.",
    reversed: "압박감에 눌려 방어조차 포기하거나 지나치게 방어적으로 구는 상태입니다.",
    keywords: ["방어", "도전", "고수"],
    astro: "불 원소 (완드)"
  },
  {
    id: 29, code: "wa08", nameKo: "완드 8", nameEn: "Eight of Wands",
    arcana: "minor", suit: "wands", number: 8,
    upright: "일이 빠르게 진행되고 소식이 속도감 있게 오가는 시기입니다. 흐름을 놓치지 말고 신속히 움직이세요.",
    reversed: "일정이 지연되거나 소통이 엇갈려 답답하게 멈춰선 상태를 뜻합니다.",
    keywords: ["속도", "진전", "소식"],
    astro: "불 원소 (완드)"
  },
  {
    id: 30, code: "wa09", nameKo: "완드 9", nameEn: "Nine of Wands",
    arcana: "minor", suit: "wands", number: 9,
    upright: "지칠 대로 지쳤지만 마지막 한 걸음을 남겨둔 상태입니다. 경계를 늦추지 않고 끝까지 버텨내세요.",
    reversed: "방어적 태도가 지나쳐 지쳐 쓰러지거나 모든 것을 포기하고 싶은 마음을 나타냅니다.",
    keywords: ["인내", "경계", "지구력"],
    astro: "불 원소 (완드)"
  },
  {
    id: 31, code: "wa10", nameKo: "완드 10", nameEn: "Ten of Wands",
    arcana: "minor", suit: "wands", number: 10,
    upright: "짊어진 책임과 부담이 정점에 이른 상태입니다. 완주가 눈앞이지만 짐을 나누는 것도 고려해보세요.",
    reversed: "과중한 부담을 내려놓거나 오히려 무너져 번아웃에 이르는 상태를 뜻합니다.",
    keywords: ["부담", "책임", "과로"],
    astro: "불 원소 (완드)"
  },
  {
    id: 32, code: "wapa", nameKo: "완드 시종", nameEn: "Page of Wands",
    arcana: "minor", suit: "wands", number: 11,
    upright: "호기심 많고 열정 넘치는 젊은 기운을 뜻합니다. 새로운 소식이나 아이디어를 열린 마음으로 받아들이세요.",
    reversed: "충동적으로 일을 벌이거나 계획 없이 흥분만 앞서는 상태를 조심해야 합니다.",
    keywords: ["호기심", "소식", "열의"],
    astro: "불 원소 (완드)"
  },
  {
    id: 33, code: "wakn", nameKo: "완드 기사", nameEn: "Knight of Wands",
    arcana: "minor", suit: "wands", number: 12,
    upright: "저돌적이고 열정적인 행동가의 기운입니다. 망설이지 말고 지금 이 순간의 추진력을 믿고 나아가세요.",
    reversed: "성급함과 무모함이 앞서 일을 그르치거나 금세 열정이 식는 모습을 나타냅니다.",
    keywords: ["추진력", "열정", "모험심"],
    astro: "불 원소 (완드)"
  },
  {
    id: 34, code: "waqu", nameKo: "완드 여왕", nameEn: "Queen of Wands",
    arcana: "minor", suit: "wands", number: 13,
    upright: "당당하고 매력적인 카리스마로 주변을 이끄는 힘을 뜻합니다. 자신감 있게 스스로를 드러내세요.",
    reversed: "질투나 과시욕에 휘둘리거나 자신감이 위축되어 있는 상태를 나타냅니다.",
    keywords: ["카리스마", "자신감", "독립"],
    astro: "불 원소 (완드)"
  },
  {
    id: 35, code: "waki", nameKo: "완드 왕", nameEn: "King of Wands",
    arcana: "minor", suit: "wands", number: 14,
    upright: "비전을 갖고 사람들을 이끄는 타고난 리더십을 뜻합니다. 대담한 결정을 내려도 좋을 때입니다.",
    reversed: "독선적이거나 성급한 지시로 주변과 마찰을 빚는 상태를 경고합니다.",
    keywords: ["리더십", "비전", "결단력"],
    astro: "불 원소 (완드)"
  },

  // ===== 컵 (물 원소 · 감정·관계) =====
  {
    id: 36, code: "cu01", nameKo: "컵 에이스", nameEn: "Ace of Cups",
    arcana: "minor", suit: "cups", number: 1,
    upright: "새로운 감정과 사랑, 마음이 충만해지는 시작을 뜻합니다. 마음을 열면 넘치는 사랑이 흘러들어옵니다.",
    reversed: "감정을 억누르거나 마음이 메말라 사랑을 받아들이지 못하는 상태입니다.",
    keywords: ["사랑", "감정", "충만"],
    astro: "물 원소 (컵)"
  },
  {
    id: 37, code: "cu02", nameKo: "컵 2", nameEn: "Two of Cups",
    arcana: "minor", suit: "cups", number: 2,
    upright: "서로 마음을 나누는 진실한 유대와 파트너십을 뜻합니다. 상호 존중이 관계를 단단하게 만듭니다.",
    reversed: "오해나 불균형으로 관계에 균열이 생기거나 헤어짐을 암시할 수 있습니다.",
    keywords: ["유대", "사랑", "파트너십"],
    astro: "물 원소 (컵)"
  },
  {
    id: 38, code: "cu03", nameKo: "컵 3", nameEn: "Three of Cups",
    arcana: "minor", suit: "cups", number: 3,
    upright: "친구, 동료와 함께 기쁨을 나누는 축하의 시간을 뜻합니다. 함께하는 즐거움이 위로가 됩니다.",
    reversed: "과도한 향락이나 삼각관계, 소외감으로 인한 불편함을 나타냅니다.",
    keywords: ["우정", "축하", "공동체"],
    astro: "물 원소 (컵)"
  },
  {
    id: 39, code: "cu04", nameKo: "컵 4", nameEn: "Four of Cups",
    arcana: "minor", suit: "cups", number: 4,
    upright: "권태와 무관심 속에서 눈앞의 기회를 놓치고 있는 상태를 뜻합니다. 고개를 들어 다시 살펴보세요.",
    reversed: "권태에서 벗어나 새로운 가능성을 향해 마음이 다시 열리는 상태입니다.",
    keywords: ["권태", "무관심", "성찰"],
    astro: "물 원소 (컵)"
  },
  {
    id: 40, code: "cu05", nameKo: "컵 5", nameEn: "Five of Cups",
    arcana: "minor", suit: "cups", number: 5,
    upright: "상실감에 젖어 잃은 것에만 집중하고 있는 상태입니다. 뒤에 남은 두 잔이 있음을 잊지 마세요.",
    reversed: "슬픔을 딛고 다시 일어나거나 서서히 받아들이며 회복해가는 과정을 뜻합니다.",
    keywords: ["상실", "슬픔", "회복"],
    astro: "물 원소 (컵)"
  },
  {
    id: 41, code: "cu06", nameKo: "컵 6", nameEn: "Six of Cups",
    arcana: "minor", suit: "cups", number: 6,
    upright: "그리운 추억과 순수했던 시절의 정서를 뜻합니다. 과거의 인연이나 기억이 다시 떠오를 수 있습니다.",
    reversed: "과거에 지나치게 얽매이거나 현실 도피로 흐르는 상태를 경계해야 합니다.",
    keywords: ["추억", "순수", "재회"],
    astro: "물 원소 (컵)"
  },
  {
    id: 42, code: "cu07", nameKo: "컵 7", nameEn: "Seven of Cups",
    arcana: "minor", suit: "cups", number: 7,
    upright: "여러 선택지와 환상이 뒤섞여 무엇이 진짜인지 흐릿한 상태입니다. 현실을 분별하는 눈이 필요합니다.",
    reversed: "혼란 속에서 마침내 하나를 선택하거나 환상이 걷히고 명확해지는 상태입니다.",
    keywords: ["환상", "선택", "혼란"],
    astro: "물 원소 (컵)"
  },
  {
    id: 43, code: "cu08", nameKo: "컵 8", nameEn: "Eight of Cups",
    arcana: "minor", suit: "cups", number: 8,
    upright: "겉으로는 만족스러워 보여도 마음이 채워지지 않아 떠나는 것을 뜻합니다. 더 깊은 의미를 찾아 나서세요.",
    reversed: "떠나야 할 때 미련 때문에 머물거나 반대로 도피성으로 떠나는 상태입니다.",
    keywords: ["떠남", "성찰", "탐색"],
    astro: "물 원소 (컵)"
  },
  {
    id: 44, code: "cu09", nameKo: "컵 9", nameEn: "Nine of Cups",
    arcana: "minor", suit: "cups", number: 9,
    upright: "바라던 소망이 이루어져 만족감을 누리는 시기입니다. 스스로에게 흡족한 순간을 즐기세요.",
    reversed: "겉치레뿐인 만족이나 과도한 탐닉으로 공허함이 남는 상태를 나타냅니다.",
    keywords: ["만족", "소원성취", "행복"],
    astro: "물 원소 (컵)"
  },
  {
    id: 45, code: "cu10", nameKo: "컵 10", nameEn: "Ten of Cups",
    arcana: "minor", suit: "cups", number: 10,
    upright: "가족과 함께하는 진정한 행복과 정서적 완성을 뜻합니다. 화목한 관계가 삶의 든든한 기반이 됩니다.",
    reversed: "겉보기와 다른 가정불화나 이상적인 행복에 대한 압박감을 나타냅니다.",
    keywords: ["행복", "가정", "화합"],
    astro: "물 원소 (컵)"
  },
  {
    id: 46, code: "cupa", nameKo: "컵 시종", nameEn: "Page of Cups",
    arcana: "minor", suit: "cups", number: 11,
    upright: "순수한 감성과 창의적 영감이 피어나는 시기입니다. 뜻밖의 다정한 소식에 마음을 열어보세요.",
    reversed: "감정 기복이 심하거나 미성숙한 태도로 상처받기 쉬운 상태를 나타냅니다.",
    keywords: ["감성", "소식", "순수"],
    astro: "물 원소 (컵)"
  },
  {
    id: 47, code: "cukn", nameKo: "컵 기사", nameEn: "Knight of Cups",
    arcana: "minor", suit: "cups", number: 12,
    upright: "낭만적이고 이상을 좇는 마음으로 다가오는 제안이나 인연을 뜻합니다. 마음이 이끄는 대로 따라가 보세요.",
    reversed: "감정적 변덕이나 비현실적인 약속에 휘둘리는 상태를 조심해야 합니다.",
    keywords: ["낭만", "이상", "제안"],
    astro: "물 원소 (컵)"
  },
  {
    id: 48, code: "cuqu", nameKo: "컵 여왕", nameEn: "Queen of Cups",
    arcana: "minor", suit: "cups", number: 13,
    upright: "깊은 공감 능력과 따뜻한 포용력을 지닌 성숙한 감정을 뜻합니다. 타인의 마음을 있는 그대로 받아주세요.",
    reversed: "감정에 지나치게 휩쓸리거나 타인의 문제까지 떠안아 지치는 상태입니다.",
    keywords: ["공감", "포용", "직관"],
    astro: "물 원소 (컵)"
  },
  {
    id: 49, code: "cuki", nameKo: "컵 왕", nameEn: "King of Cups",
    arcana: "minor", suit: "cups", number: 14,
    upright: "감정을 성숙하게 다스리며 균형 잡힌 조언을 주는 힘을 뜻합니다. 침착하게 마음을 헤아려 판단하세요.",
    reversed: "감정을 억누르다 폭발하거나 겉으로만 냉정한 척하는 상태를 나타냅니다.",
    keywords: ["절제", "관용", "성숙"],
    astro: "물 원소 (컵)"
  },

  // ===== 소드 (공기 원소 · 사고·갈등·소통) =====
  {
    id: 50, code: "sw01", nameKo: "소드 에이스", nameEn: "Ace of Swords",
    arcana: "minor", suit: "swords", number: 1,
    upright: "명료한 통찰과 진실을 꿰뚫는 새로운 생각의 시작을 뜻합니다. 정신이 맑아지고 결단이 선명해집니다.",
    reversed: "생각이 혼란스럽거나 왜곡된 정보로 판단력이 흐려진 상태를 나타냅니다.",
    keywords: ["통찰", "진실", "결단"],
    astro: "공기 원소 (소드)"
  },
  {
    id: 51, code: "sw02", nameKo: "소드 2", nameEn: "Two of Swords",
    arcana: "minor", suit: "swords", number: 2,
    upright: "감정과 이성 사이에서 결정을 미루고 있는 교착 상태를 뜻합니다. 눈을 가린 채 더 이상 피할 수 없습니다.",
    reversed: "억눌렸던 결정을 마침내 내리거나 반대로 혼란이 더 심해지는 상태입니다.",
    keywords: ["교착", "선택", "균형"],
    astro: "공기 원소 (소드)"
  },
  {
    id: 52, code: "sw03", nameKo: "소드 3", nameEn: "Three of Swords",
    arcana: "minor", suit: "swords", number: 3,
    upright: "마음을 찌르는 아픔과 상심, 진실이 주는 상처를 뜻합니다. 슬픔을 회피하지 말고 있는 그대로 인정하세요.",
    reversed: "아픔이 서서히 아물거나 반대로 오래된 상처가 다시 덧나는 상태를 나타냅니다.",
    keywords: ["상심", "이별", "고통"],
    astro: "공기 원소 (소드)"
  },
  {
    id: 53, code: "sw04", nameKo: "소드 4", nameEn: "Four of Swords",
    arcana: "minor", suit: "swords", number: 4,
    upright: "잠시 멈추어 쉬며 재충전이 필요한 시기입니다. 몸과 마음의 휴식이 다음 전략을 위한 준비가 됩니다.",
    reversed: "억지로 휴식을 미루다 지치거나 정체가 길어져 답답한 상태를 뜻합니다.",
    keywords: ["휴식", "회복", "재정비"],
    astro: "공기 원소 (소드)"
  },
  {
    id: 54, code: "sw05", nameKo: "소드 5", nameEn: "Five of Swords",
    arcana: "minor", suit: "swords", number: 5,
    upright: "이겼지만 씁쓸함이 남는 소모적인 갈등을 뜻합니다. 이기는 것보다 관계를 지키는 것이 나을 수 있습니다.",
    reversed: "갈등의 후유증이 계속되거나 화해의 실마리를 찾기 시작하는 상태입니다.",
    keywords: ["갈등", "패배감", "긴장"],
    astro: "공기 원소 (소드)"
  },
  {
    id: 55, code: "sw06", nameKo: "소드 6", nameEn: "Six of Swords",
    arcana: "minor", suit: "swords", number: 6,
    upright: "힘들었던 상황을 벗어나 더 평온한 곳으로 나아가는 이행의 시기입니다. 천천히 나아가면 안정이 찾아옵니다.",
    reversed: "떠나야 할 상황에서 벗어나지 못하거나 이행 과정이 순탄치 않은 상태입니다.",
    keywords: ["이동", "회복", "전환"],
    astro: "공기 원소 (소드)"
  },
  {
    id: 56, code: "sw07", nameKo: "소드 7", nameEn: "Seven of Swords",
    arcana: "minor", suit: "swords", number: 7,
    upright: "은밀한 책략이나 회피, 혼자 몰래 처리하려는 태도를 뜻합니다. 정직한 방법이 결국 더 안전합니다.",
    reversed: "숨겨왔던 일이 드러나거나 양심의 가책으로 스스로 고백하게 되는 상태입니다.",
    keywords: ["책략", "회피", "은밀함"],
    astro: "공기 원소 (소드)"
  },
  {
    id: 57, code: "sw08", nameKo: "소드 8", nameEn: "Eight of Swords",
    arcana: "minor", suit: "swords", number: 8,
    upright: "스스로 만든 생각의 틀에 갇혀 옴짝달싹 못하는 상태를 뜻합니다. 눈가리개를 벗으면 출구가 보입니다.",
    reversed: "속박에서 벗어나기 시작하거나 반대로 자기 제한이 더 심해지는 상태입니다.",
    keywords: ["속박", "제한", "무력감"],
    astro: "공기 원소 (소드)"
  },
  {
    id: 58, code: "sw09", nameKo: "소드 9", nameEn: "Nine of Swords",
    arcana: "minor", suit: "swords", number: 9,
    upright: "불안과 악몽 같은 걱정에 잠 못 이루는 상태를 뜻합니다. 대부분은 실제보다 부풀려진 두려움입니다.",
    reversed: "억눌렸던 불안이 표면화되거나 서서히 그 굴레에서 벗어나는 과정을 뜻합니다.",
    keywords: ["불안", "걱정", "죄책감"],
    astro: "공기 원소 (소드)"
  },
  {
    id: 59, code: "sw10", nameKo: "소드 10", nameEn: "Ten of Swords",
    arcana: "minor", suit: "swords", number: 10,
    upright: "바닥까지 내려간 끝맺음과 완전한 종결을 뜻합니다. 더 이상 나빠질 것 없는 지점에서 새벽이 시작됩니다.",
    reversed: "끝을 받아들이지 못해 질질 끌거나 서서히 회복의 조짐이 보이는 상태입니다.",
    keywords: ["종결", "바닥", "재기"],
    astro: "공기 원소 (소드)"
  },
  {
    id: 60, code: "swpa", nameKo: "소드 시종", nameEn: "Page of Swords",
    arcana: "minor", suit: "swords", number: 11,
    upright: "예리한 호기심과 정보에 민감한 기민함을 뜻합니다. 새로운 소식을 빠르게 파악하되 성급히 판단하지 마세요.",
    reversed: "말이 앞서거나 경솔한 언행으로 오해를 사는 상태를 조심해야 합니다.",
    keywords: ["기민함", "소식", "경계"],
    astro: "공기 원소 (소드)"
  },
  {
    id: 61, code: "swkn", nameKo: "소드 기사", nameEn: "Knight of Swords",
    arcana: "minor", suit: "swords", number: 12,
    upright: "거침없이 밀어붙이는 결단력과 빠른 행동력을 뜻합니다. 목표가 분명하다면 지금이 돌진할 때입니다.",
    reversed: "성급함과 공격적인 태도로 주변과 충돌하거나 일을 그르치는 상태입니다.",
    keywords: ["결단력", "저돌성", "속도"],
    astro: "공기 원소 (소드)"
  },
  {
    id: 62, code: "swqu", nameKo: "소드 여왕", nameEn: "Queen of Swords",
    arcana: "minor", suit: "swords", number: 13,
    upright: "감정에 휘둘리지 않는 냉철한 통찰과 독립성을 뜻합니다. 명확한 언어로 경계를 세워도 좋습니다.",
    reversed: "지나치게 냉소적이거나 날카로운 말로 상처를 주는 상태를 조심해야 합니다.",
    keywords: ["냉철함", "독립", "명확함"],
    astro: "공기 원소 (소드)"
  },
  {
    id: 63, code: "swki", nameKo: "소드 왕", nameEn: "King of Swords",
    arcana: "minor", suit: "swords", number: 14,
    upright: "논리와 원칙에 따라 공정하게 판단하는 권위를 뜻합니다. 감정을 배제하고 이성적으로 결정하세요.",
    reversed: "독단적이거나 지나치게 비판적인 태도로 주변을 몰아세우는 상태입니다.",
    keywords: ["논리", "권위", "공정"],
    astro: "공기 원소 (소드)"
  },

  // ===== 펜타클 (흙 원소 · 물질·현실·돈) =====
  {
    id: 64, code: "pe01", nameKo: "펜타클 에이스", nameEn: "Ace of Pentacles",
    arcana: "minor", suit: "pentacles", number: 1,
    upright: "새로운 물질적 기회와 안정적인 시작을 뜻합니다. 구체적인 계획을 세우면 실질적 성과로 이어집니다.",
    reversed: "좋은 기회를 놓치거나 준비 부족으로 실속을 챙기지 못하는 상태입니다.",
    keywords: ["기회", "풍요", "안정"],
    astro: "흙 원소 (펜타클)"
  },
  {
    id: 65, code: "pe02", nameKo: "펜타클 2", nameEn: "Two of Pentacles",
    arcana: "minor", suit: "pentacles", number: 2,
    upright: "여러 일과 자원을 동시에 저글링하며 균형을 맞추는 시기입니다. 유연하게 우선순위를 조율하세요.",
    reversed: "너무 많은 일을 벌여 균형이 무너지거나 재정 관리에 어려움을 겪는 상태입니다.",
    keywords: ["균형", "적응", "관리"],
    astro: "흙 원소 (펜타클)"
  },
  {
    id: 66, code: "pe03", nameKo: "펜타클 3", nameEn: "Three of Pentacles",
    arcana: "minor", suit: "pentacles", number: 3,
    upright: "협업을 통해 기술과 실력을 인정받는 시기입니다. 각자의 전문성이 모여 좋은 결과를 만듭니다.",
    reversed: "팀워크가 어긋나거나 실력을 제대로 인정받지 못하는 상태를 나타냅니다.",
    keywords: ["협업", "숙련", "인정"],
    astro: "흙 원소 (펜타클)"
  },
  {
    id: 67, code: "pe04", nameKo: "펜타클 4", nameEn: "Four of Pentacles",
    arcana: "minor", suit: "pentacles", number: 4,
    upright: "가진 것을 단단히 지키려는 안정 추구의 마음을 뜻합니다. 절약도 좋지만 너무 움켜쥐지는 마세요.",
    reversed: "집착에 가까운 소유욕이나 반대로 재물에 대한 통제력을 잃은 상태입니다.",
    keywords: ["소유", "안정", "집착"],
    astro: "흙 원소 (펜타클)"
  },
  {
    id: 68, code: "pe05", nameKo: "펜타클 5", nameEn: "Five of Pentacles",
    arcana: "minor", suit: "pentacles", number: 5,
    upright: "경제적 어려움이나 소외감 속에서도 가까이에 있는 도움을 보지 못하는 상태를 뜻합니다. 문을 두드려보세요.",
    reversed: "어려운 시기를 지나 회복이 시작되거나 도움의 손길을 받아들이는 상태입니다.",
    keywords: ["결핍", "고난", "소외"],
    astro: "흙 원소 (펜타클)"
  },
  {
    id: 69, code: "pe06", nameKo: "펜타클 6", nameEn: "Six of Pentacles",
    arcana: "minor", suit: "pentacles", number: 6,
    upright: "베풀고 나누는 균형 잡힌 관계를 뜻합니다. 주고받는 것이 공정할 때 진정한 풍요가 이어집니다.",
    reversed: "일방적인 시혜나 부당한 조건, 의존 관계로 인한 불균형을 나타냅니다.",
    keywords: ["나눔", "균형", "베풂"],
    astro: "흙 원소 (펜타클)"
  },
  {
    id: 70, code: "pe07", nameKo: "펜타클 7", nameEn: "Seven of Pentacles",
    arcana: "minor", suit: "pentacles", number: 7,
    upright: "그동안의 노력을 점검하며 결실을 기다리는 인내의 시기입니다. 장기적인 안목으로 지켜보세요.",
    reversed: "조급함에 노력을 포기하거나 투자한 만큼 결과가 없어 실망하는 상태입니다.",
    keywords: ["인내", "점검", "결실"],
    astro: "흙 원소 (펜타클)"
  },
  {
    id: 71, code: "pe08", nameKo: "펜타클 8", nameEn: "Eight of Pentacles",
    arcana: "minor", suit: "pentacles", number: 8,
    upright: "묵묵히 기술을 갈고닦는 성실한 노력의 시기입니다. 반복된 연습이 곧 실력이 되어 돌아옵니다.",
    reversed: "성의 없는 태도나 반복 작업에 대한 권태로 완성도가 떨어지는 상태입니다.",
    keywords: ["숙련", "성실", "노력"],
    astro: "흙 원소 (펜타클)"
  },
  {
    id: 72, code: "pe09", nameKo: "펜타클 9", nameEn: "Nine of Pentacles",
    arcana: "minor", suit: "pentacles", number: 9,
    upright: "스스로 일군 성취로 누리는 여유와 독립을 뜻합니다. 혼자만의 시간 속에서 만족을 느끼는 시기입니다.",
    reversed: "겉으로 보이는 풍요와 달리 재정적 불안이나 과시적 소비를 조심해야 합니다.",
    keywords: ["독립", "여유", "성취"],
    astro: "흙 원소 (펜타클)"
  },
  {
    id: 73, code: "pe10", nameKo: "펜타클 10", nameEn: "Ten of Pentacles",
    arcana: "minor", suit: "pentacles", number: 10,
    upright: "가문과 대를 잇는 안정된 부와 유산을 뜻합니다. 오랜 기반이 든든한 버팀목이 되어줍니다.",
    reversed: "가족 간 재산 분쟁이나 물려받은 부담으로 인한 갈등을 나타냅니다.",
    keywords: ["유산", "안정", "번영"],
    astro: "흙 원소 (펜타클)"
  },
  {
    id: 74, code: "pepa", nameKo: "펜타클 시종", nameEn: "Page of Pentacles",
    arcana: "minor", suit: "pentacles", number: 11,
    upright: "성실하게 배우며 착실히 기반을 다지는 태도를 뜻합니다. 새로운 공부나 재정 계획을 시작하기 좋습니다.",
    reversed: "실속 없는 계획이나 게으름으로 배움의 기회를 놓치는 상태를 조심해야 합니다.",
    keywords: ["학구열", "실용", "성실"],
    astro: "흙 원소 (펜타클)"
  },
  {
    id: 75, code: "pekn", nameKo: "펜타클 기사", nameEn: "Knight of Pentacles",
    arcana: "minor", suit: "pentacles", number: 12,
    upright: "꾸준하고 신중하게 한 걸음씩 나아가는 책임감을 뜻합니다. 느리더라도 확실한 길을 택하세요.",
    reversed: "지나치게 신중해 기회를 놓치거나 반대로 게으름에 빠지는 상태입니다.",
    keywords: ["신중함", "책임감", "꾸준함"],
    astro: "흙 원소 (펜타클)"
  },
  {
    id: 76, code: "pequ", nameKo: "펜타클 여왕", nameEn: "Queen of Pentacles",
    arcana: "minor", suit: "pentacles", number: 13,
    upright: "실질적인 돌봄과 풍요로운 살림살이를 꾸리는 능력을 뜻합니다. 현실적 감각으로 주변을 넉넉히 챙기세요.",
    reversed: "일과 돌봄 사이에서 지치거나 물질적인 것에만 몰두하는 상태를 나타냅니다.",
    keywords: ["돌봄", "실용", "풍요"],
    astro: "흙 원소 (펜타클)"
  },
  {
    id: 77, code: "peki", nameKo: "펜타클 왕", nameEn: "King of Pentacles",
    arcana: "minor", suit: "pentacles", number: 14,
    upright: "안정된 부와 성공을 든든하게 다스리는 힘을 뜻합니다. 현실적 기반 위에서 여유롭게 베풀 수 있습니다.",
    reversed: "물질에 대한 집착이나 완고한 태도로 주변과 거리가 생기는 상태를 뜻합니다.",
    keywords: ["부", "안정", "관대함"],
    astro: "흙 원소 (펜타클)"
  }
];

// ===== 수비학 =====
const NUMEROLOGY = {
  1: { title: "개척자", meaning: "새로운 길을 여는 시작과 독립의 기운을 뜻합니다. 스스로 결정하고 앞장서는 힘이 강합니다." },
  2: { title: "협력자", meaning: "타인과의 조화와 균형을 중시하는 기운을 뜻합니다. 함께할 때 진가가 드러나는 관계 지향적 성향입니다." },
  3: { title: "표현가", meaning: "창조성과 자기표현이 풍부하게 드러나는 기운을 뜻합니다. 말과 예술로 주변에 즐거움을 전합니다." },
  4: { title: "건축가", meaning: "안정과 기반을 다지는 성실한 기운을 뜻합니다. 꾸준함과 인내로 튼튼한 토대를 세웁니다." },
  5: { title: "자유인", meaning: "변화와 자유를 추구하는 역동적인 기운을 뜻합니다. 새로운 경험을 통해 삶을 확장해 나갑니다." },
  6: { title: "돌봄이", meaning: "사랑과 책임감으로 주변을 살피는 기운을 뜻합니다. 가정과 공동체의 조화를 중요하게 여깁니다." },
  7: { title: "탐구자", meaning: "내면을 탐구하며 진리를 찾는 사색적인 기운을 뜻합니다. 홀로 있는 시간 속에서 깊은 통찰을 얻습니다." },
  8: { title: "성취자", meaning: "물질적 성취와 힘을 추구하는 강한 기운을 뜻합니다. 목표를 향한 실행력과 관리 능력이 뛰어납니다." },
  9: { title: "완성자", meaning: "포용과 완성을 향해 나아가는 성숙한 기운을 뜻합니다. 널리 베풀며 한 주기를 마무리 짓는 힘이 있습니다." },
  11: { title: "직관가", meaning: "높은 직관과 영감을 지닌 마스터 넘버의 기운을 뜻합니다. 남들이 보지 못하는 것을 감지하는 예민한 감각을 지녔습니다." },
  22: { title: "실현가", meaning: "큰 비전을 현실로 만드는 마스터 넘버의 기운을 뜻합니다. 이상과 실행력을 동시에 갖춘 대업의 그릇입니다." }
};

// ===== 별자리 =====
const ZODIAC_SIGNS = [
  { name: "양자리", start: [3, 21], end: [4, 19], element: "불" },
  { name: "황소자리", start: [4, 20], end: [5, 20], element: "흙" },
  { name: "쌍둥이자리", start: [5, 21], end: [6, 21], element: "공기" },
  { name: "게자리", start: [6, 22], end: [7, 22], element: "물" },
  { name: "사자자리", start: [7, 23], end: [8, 22], element: "불" },
  { name: "처녀자리", start: [8, 23], end: [9, 22], element: "흙" },
  { name: "천칭자리", start: [9, 23], end: [10, 22], element: "공기" },
  { name: "전갈자리", start: [10, 23], end: [11, 22], element: "물" },
  { name: "사수자리", start: [11, 23], end: [12, 24], element: "불" },
  { name: "염소자리", start: [12, 25], end: [1, 19], element: "흙" },
  { name: "물병자리", start: [1, 20], end: [2, 18], element: "공기" },
  { name: "물고기자리", start: [2, 19], end: [3, 20], element: "물" }
];

// ===== 스프레드 포지션 =====
const SPREAD_POSITIONS = ["현재 상황", "장애물", "과거의 뿌리", "조언", "예상 결과"];
