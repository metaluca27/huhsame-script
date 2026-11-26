# "작은도서관은 왜 필요할까?" 페이지 만들기 → landing/smalllib/why.html (울산), landing/smalllib-demo/why.html (체험판)
#   python why_make.py
# 조문은 2026-11-26 국가법령정보센터(law.go.kr)에서 직접 확인한 내용만. 법이 바뀌면 여기를 고치고 다시 실행.
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
L = "https://www.law.go.kr/"

def item(title, sub, plain, quotes, href):
    q = "".join(f"<li>{x}</li>" for x in quotes)
    return f"""
  <section class="law">
    <h2>{title} <small>{sub}</small></h2>
    <p class="plain">💡 {plain}</p>
    <ul class="quotes">{q}</ul>
    <a class="src" href="{href}" target="_blank" rel="noopener">국가법령정보센터에서 원문 보기 ↗</a>
  </section>"""

NATIONAL = [
  item("작은도서관 진흥법", "2012년 제정 · 현재 2025.8.1. 시행본",
       "나라와 지자체는 작은도서관을 키울 <b>책임</b>이 있어요. '도와줄 수도 있다'가 아니라 '하여야 한다'라고 적혀 있어요.",
       ["<b>제3조</b> 국가 및 지방자치단체는 작은도서관 진흥 시책을 강구하고, 행정적·재정적 지원방안을 마련하여야 한다.",
        "<b>제5조②</b> (2025년 새로 생김) 작은도서관의 원활한 운영을 위해 인력지원, 장서확충, 독서·문화 프로그램 활성화를 위해 노력하여야 한다.",
        "<b>제6조①</b> 작은도서관은 주민의 참여와 자치를 기반으로 지역사회의 생활문화 향상에 이바지하도록 운영한다.",
        "<b>제9조</b> 등록한 사립 작은도서관에 국유·공유 재산을 무상으로 쓰게 하거나 빌려줄 수 있다.",
        "<b>제12조</b> 시장·군수·구청장은 매년 관할 작은도서관 운영 실태를 조사해야 한다."],
       L + "법령/작은도서관진흥법"),
  item("도서관법", "제4조 도서관의 구분",
       "작은도서관은 법으로 정한 <b>공공도서관</b>이에요. 아파트 한켠에 있어도 시립도서관과 같은 갈래예요.",
       ["<b>제4조②1호 가목</b> 공공도서관에는 주민의 참여와 자치를 기반으로 지역사회의 생활 친화적 도서관문화의 향상을 주된 목적으로 하는 작은도서관이 포함된다."],
       L + "법령/도서관법/제4조"),
  item("주택건설기준 등에 관한 규정", "제55조의2 주민공동시설",
       "<b>500세대 이상 아파트를 새로 지을 때</b>는 경로당·어린이놀이터처럼 작은도서관도 두는 게 원칙이에요. 다만 2026년 개정으로 안 둘 수 있는 경우가 생겼어요.",
       ["<b>제55조의2③3호</b> 500세대 이상 주택단지의 주민공동시설에는 경로당, 어린이놀이터, 어린이집, 주민운동시설, <b>작은도서관</b>, 다함께돌봄센터가 포함되어야 한다.",
        "<b>제55조의2④</b> (2026년 개정으로 새로 생김) 다음의 경우에는 설치하지 않을 수 있다.",
        "　<b>1호</b> 사업계획승인권자가 단지 특성, 인근 시설 현황 등을 고려해 설치할 필요가 없다고 인정하는 시설",
        "　<b>2호</b> 단지 경계에서 300미터 안에 공공도서관(작은도서관 제외)이 있거나, 단지 안에 공공도서관 설치가 계획된 경우의 작은도서관"],
       L + "법령/주택건설기준등에관한규정/제55조의2"),
]

WORRY = """
  <section class="law worry">
    <h2>🏠 동네 사랑방이 사라지지 않으려면</h2>
    <p>위 규정은 <b>아파트를 새로 지을 때</b>의 기준이에요. 이미 문을 연 작은도서관이 계속 열려 있으려면, 결국 <b>찾아오는 사람과 지켜보는 이웃</b>이 가장 큰 힘이에요.
    게다가 2026년 개정으로, 가까이에 공공도서관이 있거나 승인권자가 필요 없다고 보면 새 아파트에도 작은도서관을 안 둘 수 있게 됐어요.
    아이들이 혼자 걸어갈 수 있는 거리의 작은도서관은 멀리 있는 큰 도서관이 대신하기 어려워요. 지금 있는 작은도서관을 자주 찾고, 소식을 나눠 주세요.</p>
  </section>"""

ULSAN = item("울산광역시 작은도서관 지원 조례", "울산시 · 2022.4.7. 개정본",
       "울산시장은 작은도서관을 위한 <b>지원방안을 세우고 예산을 지원</b>할 수 있어요. 해마다 세우는 도서관 계획에 작은도서관 내용도 넣어야 해요.",
       ["<b>제3조</b> 시장은 작은도서관이 활성화될 수 있도록 행정적·재정적 지원방안을 강구하고 관련 시책을 적극 추진하여야 한다.",
        "<b>제4조</b> 연도별 시행계획에 작은도서관 현황과 발전방향, 확충 계획, 지원시책, 투자계획을 포함하여야 한다.",
        "<b>제6조</b> 예산의 범위에서 설치비, 도서관자료 구입비, 프로그램 운영비 등을 지원할 수 있다.",
        "<b>제9조</b> 작은도서관 운영자와 종사자에게 필요한 교육을 실시할 수 있다."],
       L + "자치법규/울산광역시작은도서관지원조례")
GUGUN = [("중구", "울산광역시 중구 작은도서관 설치 및 운영에 관한 조례"),
         ("남구", "울산광역시 남구 작은도서관 설치 및 운영 지원에 관한 조례"),
         ("동구", "울산광역시 동구 작은도서관 설치 및 운영에 관한 조례"),
         ("북구", "울산광역시 북구 작은도서관 설치 및 운영 지원에 관한 조례"),
         ("울주군", "울산광역시 울주군 작은도서관 설치 및 운영 지원에 관한 조례")]
ULSAN += """
  <section class="law">
    <h2>구·군 조례 <small>다섯 곳 모두 있어요</small></h2>
    <p class="plain">💡 울산의 구·군마다 작은도서관 설치와 운영을 돕는 조례가 따로 있어요.</p>
    <ul class="quotes">""" + "".join(
    f'<li><a href="{L}자치법규/{n.replace(" ", "")}" target="_blank" rel="noopener">{g} · {n} ↗</a></li>' for g, n in GUGUN) + "</ul>\n  </section>"

DEMO_LOCAL = """
  <section class="law placeholder">
    <h2>○○시 작은도서관 조례 <small>지역 조례 자리</small></h2>
    <p class="plain">💡 실제 사이트에서는 이 자리에 우리 시와 구·군의 작은도서관 조례를 쉬운 말로 정리해 넣어요. (체험판이라 비워 뒀어요)</p>
  </section>"""

def page(site, base, title, local, extra_head):
    return f"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>작은도서관은 왜 필요할까? · {title}</title>
<meta name="description" content="작은도서관을 두고 키우게 한 법과 조례를 쉬운 말로 정리했어요.">
<meta name="theme-color" content="#2f5d46">
<link rel="stylesheet" href="/smalllib/style.css?v=10">
</head>
<body>
{extra_head}<div class="wrap why">
  <a class="back" href="{base}">← 전체 도서관</a>
  <header class="hero">
    <div class="kicker">{site}</div>
    <h1>작은도서관은<br>왜 필요할까?</h1>
    <p>작은도서관은 '있으면 좋은 곳'이 아니라 법이 공공도서관으로 정하고, 나라와 지자체가 키우라고 한 곳이에요.</p>
  </header>
  <ol class="why-sum">
    <li>작은도서관은 법으로 정한 <b>공공도서관</b>이에요.</li>
    <li>나라와 지자체는 작은도서관을 키울 <b>책임</b>이 있어요.</li>
    <li><b>500세대 이상 새 아파트</b>에는 작은도서관을 두는 게 원칙이에요.</li>
  </ol>
{''.join(NATIONAL)}
{WORRY}
{local}
  <p class="note why-foot">조문은 쉽게 읽히도록 줄여 옮겼어요. 법은 바뀔 수 있으니 정확한 내용은 원문에서 확인해 주세요. (2026년 11월 26일 기준)</p>
</div>
<footer>{title}</footer>
</body>
</html>
"""
(ROOT / "landing/smalllib/why.html").write_text(page("울산작은도서관협회 회원 도서관", "/smalllib", "울산 작은도서관 마실", ULSAN, ""), encoding="utf-8")
(ROOT / "landing/smalllib-demo/why.html").write_text(page("한빛시작은도서관협회 (가상)", "/smalllib-demo", "한빛시 작은도서관 마실 · 체험판", DEMO_LOCAL,
    '<div class="demo-bar">🧪 체험용 데모예요 · 아래 법령은 실제 법이고, 지역 조례 칸은 비워 뒀어요</div>\n'), encoding="utf-8")
print("ok")
