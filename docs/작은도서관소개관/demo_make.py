# 데모용 가상 협회 사이트 데이터 만들기 → landing/smalllib-demo/
#   python demo_make.py
# 가상의 "한빛시 작은도서관협회" 19곳 + 미리 채운 소식·행사 + 포스터 느낌 그림(img/*.jpg).
# 날짜는 상대값(daysAgo: 며칠 전 올림, eventIn: 며칠 뒤 행사)이라 언제 열어도 "다가오는 행사"가 보임.
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "landing/smalllib-demo"
(OUT / "img").mkdir(parents=True, exist_ok=True)

GROUPS = {"해솔구": "#5fb3a1", "달빛구": "#8c8fe6", "별내구": "#e8a33d", "산들군": "#7fbf5a"}
COUNCIL = "달빛구아파트도서관협의회"
LIBS = [
    ("hs-1", "해솔구", "해솔숲작은도서관", "해솔로 12, 관리동 1층", None),
    ("hs-2", "해솔구", "파랑새어린이도서관", "파랑새길 5, 2층", None),
    ("hs-3", "해솔구", "책마중작은도서관", "솔밭로 33", None),
    ("hs-4", "해솔구", "솔방울도서관", "솔방울2길 8, 3층", None),
    ("hs-5", "해솔구", "바다빛작은도서관", "바닷가로 101", None),
    ("db-1", "달빛구", "달빛책방작은도서관", "달빛로 21, 2층", None),
    ("db-2", "달빛구", "반딧불이도서관", "반딧불길 14", None),
    ("db-3", "달빛구", "꿈다락작은도서관", "다락골길 7, 4층", None),
    ("db-4", "달빛구", "푸른마을작은도서관", "푸른마을로 40, 관리동 2층", COUNCIL),
    ("db-5", "달빛구", "햇살가득도서관", "햇살로 9, 105동 1층", COUNCIL),
    ("db-6", "달빛구", "도란도란작은도서관", "도란길 3, 관리동 지하1층", COUNCIL),
    ("db-7", "달빛구", "이야기샘도서관", "샘터로 52, 202동 1층", COUNCIL),
    ("bn-1", "별내구", "별내책숲도서관", "별내로 88", None),
    ("bn-2", "별내구", "다솜작은도서관", "다솜길 16, 2층", None),
    ("bn-3", "별내구", "은하수작은도서관", "은하수로 4, 관리동", None),
    ("bn-4", "별내구", "책구름작은도서관", "구름다리길 27", None),
    ("sd-1", "산들군", "산들바람작은도서관", "산들면 바람길 11", None),
    ("sd-2", "산들군", "들마루작은도서관", "들마루읍 마루로 6", None),
    ("sd-3", "산들군", "들꽃작은도서관", "꽃내면 들꽃길 30", None),
]

# 포스터 그림: (파일 이름, 배경색, 큰 제목, 작은 줄)
POSTERS = [
    ("picturebook", "#f2c9a0", "그림책\n읽어주기", "5~9세 · 보호자 함께"),
    ("xmas", "#b5473a", "그림책\n카드 파티", "함께 읽고 카드 만들기"),
    ("author", "#3a6fb5", "동네 작가와\n만남", "그림책 작가 초청 북토크"),
    ("memoir", "#6d5a8c", "어르신\n자서전 쓰기", "내 삶을 한 권의 책으로"),
    ("boardgame", "#2f8a6c", "보드게임의 날", "가족 누구나 · 신청 없이"),
    ("bookclub", "#a8743f", "엄마들의\n독서모임", "한 달에 한 권, 저녁 7시"),
    ("movie", "#23324d", "도서관\n영화 상영", "팝콘은 도서관이 쏩니다"),
    ("origami", "#e0705a", "종이접기 교실", "초등 저학년 · 재료 제공"),
    ("market", "#7fbf5a", "책 나눔 장터", "다 읽은 책을 이웃과 바꿔요"),
    ("summer", "#3fa7c9", "방학\n독서교실", "방학 동안 일주일에 두 번"),
    ("bookstart", "#f0b6c8", "북스타트\n아기 그림책", "0~3세 아기와 보호자"),
    ("stars", "#1e2a4a", "별자리 읽는 밤", "천체망원경으로 토성 보기"),
]

POSTS = {
    "hs-1": [
        dict(pid="d1", daysAgo=1, text="그림책 읽어주기 시간에 아이들 14명이 왔어요! 사자 그림책을 읽고 각자 동물 가면도 만들었어요 🦁", photos=["picturebook"]),
        dict(pid="d2", daysAgo=4, text="그림책 카드 파티를 열어요 💌 그림책 3권 함께 읽고, 직접 카드를 만들어 가요. 전화로 신청해 주세요.", photos=["xmas"], eventIn=9, time="오전 10시~12시"),
    ],
    "hs-2": [dict(pid="d3", daysAgo=2, text="북스타트 꾸러미가 들어왔어요. 0~3세 아기와 보호자는 도서관에 오셔서 받아 가세요 👶", photos=["bookstart"], eventIn=5, time="오후 2시")],
    "hs-4": [dict(pid="d4", daysAgo=6, text="다 읽은 책 바꿔 가는 책 나눔 장터! 한 권 가져오면 한 권 가져가요 📚", photos=["market"], eventIn=12, time="오전 11시")],
    "db-1": [
        dict(pid="d5", daysAgo=3, text="동네 그림책 작가님을 모시고 북토크를 열어요. 작가님 사인도 받을 수 있어요 ✍️", photos=["author"], eventIn=6, time="오후 4시"),
        dict(pid="d6", daysAgo=20, text="엄마들의 독서모임 이번 달 책은 습관에 관한 자기계발서였어요. 다음 달 책도 정했어요!", photos=["bookclub"]),
    ],
    "db-3": [dict(pid="d7", daysAgo=5, text="어르신 자서전 쓰기 수업 다섯 번째 시간. 어린 시절 사진을 가져와 이야기를 나눴어요. 눈물 나는 이야기가 많았어요.", photos=["memoir"])],
    "db-4": [dict(pid="d8", daysAgo=1, text="보드게임의 날이 돌아왔어요 🎲 가족 누구나, 신청 없이 오시면 돼요.", photos=["boardgame"], eventIn=3, time="오후 3시~6시")],
    "db-6": [dict(pid="d9", daysAgo=9, text="관리동 지하 도서관에서 영화 상영회를 했어요. 팝콘 냄새가 가득~ 다음엔 애니메이션 틀어요!", photos=["movie"])],
    "bn-1": [dict(pid="d10", daysAgo=2, text="별자리 읽는 밤 🌌 별자리 그림책 읽고 옥상에서 천체망원경으로 토성을 봐요. 자리가 20개뿐이라 [신청하기]로 미리 신청해 주세요!", photos=["stars"], eventIn=16, time="저녁 7시", link="https://form.naver.com/")],
    "bn-2": [dict(pid="d11", daysAgo=7, text="종이접기 교실 첫날! 학 접기에 성공한 친구들 표정 좀 보세요 😊", photos=["origami"])],
    "sd-1": [dict(pid="d12", daysAgo=30, text="방학 독서교실을 마쳤어요. 방학 동안 아이들이 읽은 책이 모두 312권이에요!", photos=["summer"])],
    "sd-3": [dict(pid="d13", daysAgo=12, text="들꽃 도서관 마당에 들꽃이 활짝 폈어요. 책 읽다 잠깐 산책하기 좋아요.", photos=[])],
}
PROFILES = {
    "hs-1": dict(intro="아파트 관리동 1층, 아이들이 혼자 걸어올 수 있는 동네 도서관이에요. 주말마다 그림책을 읽어 줘요.", hours="평일 10시~18시, 토요일 10시~13시", opened="2015년 3월", members="640", volunteers="9", cover="cover-hs1"),
    "db-1": dict(intro="동네 책방 같은 작은도서관. 어른 독서모임이 활발해요.", hours="화~토 11시~19시", opened="2018년 9월", members="410", volunteers="6", cover="cover-db1"),
    "bn-1": dict(intro="별을 좋아하는 관장님이 운영하는 과학 그림책 도서관이에요.", hours="평일 13시~19시", opened="2012년 5월", members="880", volunteers="12", cover="cover-bn1"),
}

libs = [dict(id=i, gu=g, name=n, phone="", address=f"한빛시 {g} {a}", lng=None, lat=None, loc=None, group=c, hidden=False) for i, g, n, a, c in LIBS]
(OUT / "libraries.json").write_text(json.dumps({"source": "체험용 가상 데이터 — 실제 단체·도서관과 관계없음", "libraries": libs}, ensure_ascii=False, indent=1), encoding="utf-8")
(OUT / "demo.json").write_text(json.dumps({"demoLib": "hs-1", "posts": POSTS, "profiles": PROFILES}, ensure_ascii=False, indent=1), encoding="utf-8")

# ── 포스터 그림 ──
B = "C:/Windows/Fonts/malgunbd.ttf"; R = "C:/Windows/Fonts/malgun.ttf"
def light(hexc):
    r, g, b = (int(hexc[i:i + 2], 16) for i in (1, 3, 5))
    return (r * 299 + g * 587 + b * 114) / 1000 > 150
def mix(hexc, t, k):
    c = [int(hexc[i:i + 2], 16) for i in (1, 3, 5)]
    return tuple(int(v + (t - v) * k) for v in c)
for name, bg, title, sub in POSTERS:
    W, H = 1080, 1350
    im = Image.new("RGB", (W, H), bg); d = ImageDraw.Draw(im)
    ink = (34, 30, 26) if light(bg) else (250, 247, 240)
    soft = mix(bg, 255 if not light(bg) else 0, 0.12)
    # 동그라미 장식
    for (x, y, r) in [(880, 180, 230), (130, 1180, 260), (980, 1150, 120)]:
        d.ellipse([x - r, y - r, x + r, y + r], fill=soft)
    # 책 더미
    bx, by = 150, 980
    for i, (w, h, c) in enumerate([(420, 70, 0.25), (380, 64, 0.4), (440, 76, 0.55)]):
        col = mix(bg, 255 if light(bg) else 0, c) if False else mix(bg, 0 if light(bg) else 255, c)
        d.rounded_rectangle([bx + i * 18, by - i * 82, bx + i * 18 + w, by - i * 82 + h], radius=12, fill=col)
        d.rectangle([bx + i * 18 + 24, by - i * 82 + 10, bx + i * 18 + 34, by - i * 82 + h - 10], fill=bg)
    d.text((110, 150), "한빛시 작은도서관", font=ImageFont.truetype(B, 40), fill=ink)
    d.multiline_text((110, 300), title, font=ImageFont.truetype(B, 124), fill=ink, spacing=18)
    d.text((114, 300 + 150 * (title.count("\n") + 1) + 30), sub, font=ImageFont.truetype(R, 46), fill=ink)
    im.save(OUT / "img" / f"{name}.jpg", quality=82)
# ── 대표 사진용 가로 그림(16:9): 책장·창문·책상이 있는 도서관 안 풍경 ──
import random
COVERS = [("cover-hs1", "#f3e6cf", "#b8d8e8", "#7a5a3c"), ("cover-db1", "#e9e1f2", "#2c3560", "#5b4a6e"), ("cover-bn1", "#e3efe2", "#f6d79a", "#4f6b4a")]
SPINES = ["#c8553d", "#e8a33d", "#5fb3a1", "#8c8fe6", "#3a6fb5", "#7fbf5a", "#e07a9a", "#f2c14e", "#6d5a8c"]
for name, wall, sky, wood in COVERS:
    random.seed(name); W, H = 1600, 900
    im = Image.new("RGB", (W, H), wall); d = ImageDraw.Draw(im)
    d.rectangle([0, 700, W, H], fill=mix(wood, 255, .55))                      # 바닥
    d.rounded_rectangle([640, 110, 960, 470], radius=18, fill=wood)            # 창틀
    d.rounded_rectangle([660, 130, 940, 450], radius=10, fill=sky)             # 하늘
    d.line([800, 130, 800, 450], fill=wood, width=10); d.line([660, 290, 940, 290], fill=wood, width=10)
    for x0 in (90, 1030):                                                      # 양쪽 책장
        d.rectangle([x0, 120, x0 + 480, 700], fill=wood)
        for row in range(4):
            y = 140 + row * 140; x = x0 + 20
            while x < x0 + 450:
                w = random.randint(18, 34); h = random.randint(80, 118)
                d.rectangle([x, y + 118 - h, x + w, y + 118], fill=random.choice(SPINES)); x += w + 3
            d.rectangle([x0, y + 118, x0 + 480, y + 132], fill=mix(wood, 0, .25))
    d.ellipse([520, 760, 1080, 880], fill=mix(sky, 255, .3))                   # 러그
    d.rounded_rectangle([600, 600, 1000, 640], radius=10, fill=mix(wood, 0, .15))  # 책상
    for lx in (630, 950): d.rectangle([lx, 640, lx + 20, 760], fill=mix(wood, 0, .15))
    d.rectangle([700, 575, 790, 600], fill=SPINES[0]); d.rectangle([720, 552, 800, 575], fill=SPINES[2])
    d.line([900, 600, 900, 500], fill="#333", width=6); d.polygon([(860, 500), (940, 500), (920, 460), (880, 460)], fill=SPINES[7])  # 스탠드
    im.save(OUT / "img" / f"{name}.jpg", quality=84)

print("도서관", len(libs), "· 소식", sum(len(v) for v in POSTS.values()), "· 그림", len(POSTERS), "→", OUT)
