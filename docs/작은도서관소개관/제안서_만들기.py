# 울산작은도서관협회 운영위원회용 「울산 작은도서관 마실」 운영 제안서 (HWPX)
#   python 제안서_만들기.py 60   → 울산작은도서관마실_운영제안서_연60만원.hwpx  (숫자 = 연 운영비, 만 원)
#   python 제안서_만들기.py 범용 → 작은도서관마실_운영제안서_범용.hwpx  (단체명·금액 칸이 ○○로 비어 있는 판)
# hwpxskill report 템플릿 스타일 ID 사용 (charPr 12 제목, 13 섹션헤더, 9 표헤더 / paraPr 20 가운데, 23 오른쪽, 24 □항목, 27 섹션헤더)
import re, subprocess, sys
from pathlib import Path
from xml.sax.saxutils import escape

SKILL = Path("C:/Users/atlia/.claude/skills/hwpxskill")
HERE = Path(__file__).resolve().parent
GENERIC = len(sys.argv) > 1 and sys.argv[1] == "범용"
FEE = int(sys.argv[1]) if len(sys.argv) > 1 and not GENERIC else 60  # 연 운영비(만 원)
MONTH = FEE / 12
MONTH_TXT = (f"{MONTH:g}" if MONTH == int(MONTH) else f"약 {MONTH:.1f}")
OUT = HERE / ("작은도서관마실_운영제안서_범용.hwpx" if GENERIC else f"울산작은도서관마실_운영제안서_연{FEE}만원.hwpx")

tpl = (SKILL / "templates/report/section0.xml").read_text(encoding="utf-8")
head = tpl[: tpl.index("</hp:p>") + len("</hp:p>")]  # secPr 들어 있는 첫 문단까지
_id = [1000000100]
def nid():
    _id[0] += 1
    return str(_id[0])

def p(text, para=0, char=0, runs=None):
    rs = runs or [(char, text)]
    inner = "".join(f'<hp:run charPrIDRef="{c}"><hp:t>{escape(t)}</hp:t></hp:run>' if t else f'<hp:run charPrIDRef="{c}"><hp:t/></hp:run>' for c, t in rs)
    return f'<hp:p id="{nid()}" paraPrIDRef="{para}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">{inner}</hp:p>'

blank = lambda: p("")
section = lambda t: p("", 0, 0, runs=[(13, t)])  # 테두리 문단(27)은 밑줄이 다음 줄에 겹쳐서 일반 문단 + 굵은 13pt로
item = lambda t, bold=None: p("", 24, 0, runs=[(0, "□ "), (9, bold), (0, t)] if bold else [(0, "□ " + t)])

def cell(text, col, row, width, height, header=False):
    bf = 4 if header else 3
    para = 21 if header else 22
    char = 9 if header else 0
    lines = text.split("\n")
    ps = "".join(f'<hp:p paraPrIDRef="{para}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0" id="{nid()}"><hp:run charPrIDRef="{char}"><hp:t>{escape(l)}</hp:t></hp:run></hp:p>' for l in lines)
    return (f'<hp:tc name="" header="0" hasMargin="1" protect="0" editable="0" dirty="1" borderFillIDRef="{bf}">'
            f'<hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">{ps}</hp:subList>'
            f'<hp:cellAddr colAddr="{col}" rowAddr="{row}"/><hp:cellSpan colSpan="1" rowSpan="1"/>'
            f'<hp:cellSz width="{width}" height="{height}"/><hp:cellMargin left="510" right="510" top="200" bottom="200"/></hp:tc>')

def table(rows, widths=(10500, 32020)):
    hs = []
    trs = ""
    for r, (k, v) in enumerate(rows):
        h = 1500 + 1100 * (v.count("\n"))
        hs.append(h)
        trs += "<hp:tr>" + cell(k, 0, r, widths[0], h, header=True) + cell(v, 1, r, widths[1], h) + "</hp:tr>"
    tbl = (f'<hp:tbl id="{nid()}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="0" rowCnt="{len(rows)}" colCnt="2" cellSpacing="0" borderFillIDRef="3" noAdjust="0">'
           f'<hp:sz width="{sum(widths)}" widthRelTo="ABSOLUTE" height="{sum(hs)}" heightRelTo="ABSOLUTE" protect="0"/>'
           '<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>'
           '<hp:outMargin left="0" right="0" top="0" bottom="0"/><hp:inMargin left="0" right="0" top="0" bottom="0"/>'
           f'{trs}</hp:tbl>')
    return f'<hp:p id="{nid()}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="0">{tbl}</hp:run></hp:p>'

body = [
    p("「울산 작은도서관 마실」 운영 제안서", 20, 12),
    p("울산작은도서관협회 운영위원회 귀중  |  2026. 12.  |  제안: 다락방 대표 루카", 23, 11),
    section("1. 제안 배경"),
    item(" — 협회 2026년 사업 목표", "“도서관 홍보 강화로 작은도서관 인지도 높이기”"),
    item("회원 도서관들의 좋은 활동이 카페·밴드 안에만 머물러 동네 주민에게 잘 닿지 않습니다. 링크 하나만 있으면 누구나 볼 수 있는 공개 페이지가 필요합니다."),
    section("2. 이미 만들어 둔 사이트 (2026년 11월 개설, 운영 중)"),
    item("https://vaulted-bus-346411.web.app/smalllib", "주소: "),
    item("https://vaulted-bus-346411.web.app/smalllib-demo (직접 올려 보기 가능)", "체험판: "),
    item("회원 도서관 42곳(2026. 2. 4. 명단) 등록 — 도서관 그래프·지도·구군별 목록"),
    item("관장님 전용 링크로 사진·소식을 직접 올림 (가입·로그인 없음, 휴대폰으로 1분)"),
    item("다가오는 행사를 날짜순으로 모아 보여 주고, 지난 행사는 자동 정리"),
    item("보호자 동의 확인 체크, 관장님 본인 수정·삭제, 문제 게시물 숨기기 기능"),
    section("3. 운영 위탁 내용"),
    table([
        ("서버·저장소 관리", "사이트 유지·백업, 사진 저장공간 관리(용량이 차면 이전 작업 포함)"),
        ("명단 관리", "가입·탈퇴 도서관 반영(연 2~3회), 관장님 링크 발급·재발급"),
        ("게시물 대응", "삭제·숨김 요청 처리"),
        ("사용 안내", "관장님 사용법 안내, 간단한 기능 개선"),
    ]),
    section("4. 비용 및 조건"),
    table([
        ("사이트 제작", "무상 제공 (제작비 150만 원 상당)"),
        ("연 운영비", f"{FEE}만 원 (월 {MONTH_TXT}만 원, 서버·저장소 비용 포함)"),
        ("계약 기간", "2027. 1. 1. ~ 2027. 12. 31. (1년, 이후 협의해 갱신)"),
        ("표기", "사이트 하단에 “제작·운영: 다락방” 표기"),
        ("공식 지정", "운영위원회 의결로 협회 공식 홍보 사이트 지정, 회의록 기재"),
    ]),
    item("울산연구원 등 공모사업 신청 시 ‘홍보 플랫폼 운영비’ 항목으로 넣으면 회비 부담 없이 운영할 수 있습니다.", "참고: "),
    section("5. 위탁하지 않을 경우"),
    item("제안자는 2026년 12월부로 협회와의 관계가 끝나, 계약이 없으면 운영을 이어 가기 어렵습니다. 아래 중 하나를 정해 주시기 바랍니다."),
    p("① 운영 위탁 (본 제안)   ② 협회 계정으로 이전 후 협회가 직접 관리   ③ 2027. 1. 31. 운영 종료 (올라온 사진·글은 파일로 전달)", 25, 0),
    blank(),
    p("제안자: 다락방 대표 루카 (앱개발자·작가)    연락처: ______________________", 23, 0),
]
# 범용판: 어느 지역·단체에나 내밀 수 있게 이름·금액·날짜를 ○○로 비워 둠
generic = [
    p("「○○ 작은도서관 마실」 제작·운영 제안서", 20, 12),
    p("○○○○협회 귀중  |  20○○. ○.  |  제안: 다락방 대표 루카", 23, 11),
    section("1. 제안 배경"),
    item("회원 도서관들의 좋은 활동이 카페·밴드 안에만 머물러 동네 주민에게 잘 닿지 않습니다."),
    item("링크 하나만 있으면 누구나 볼 수 있는 공개 페이지로, 협회와 회원 도서관을 함께 알릴 수 있습니다."),
    section("2. 제공하는 사이트 (울산 운영 사례)"),
    item("https://vaulted-bus-346411.web.app/smalllib (울산작은도서관협회 42곳)", "실제 예시: "),
    item("https://vaulted-bus-346411.web.app/smalllib-demo (직접 올려 보기 가능)", "체험판: "),
    item("회원 도서관 전체 등록 — 도서관 그래프·지도·지역별 목록, 도서관마다 소개 페이지"),
    item("관장님 전용 링크로 사진·소식을 직접 올림 (가입·로그인 없음, 휴대폰으로 1분)"),
    item("다가오는 행사를 날짜순으로 모아 보여 주고, 지난 행사는 자동 정리"),
    item("보호자 동의 확인 체크, 관장님 본인 수정·삭제, 문제 게시물 숨기기 기능"),
    section("3. 운영 내용"),
    table([
        ("서버·저장소 관리", "사이트 유지·백업, 사진 저장공간 관리(용량이 차면 이전 작업 포함)"),
        ("명단 관리", "가입·탈퇴 도서관 반영(연 2~3회), 관장님 링크 발급·재발급"),
        ("게시물 대응", "삭제·숨김 요청 처리"),
        ("사용 안내", "관장님 사용법 안내, 간단한 기능 개선"),
    ]),
    section("4. 비용 및 조건"),
    table([
        ("사이트 제작", "○○만 원 (명단 정리·지도·미리보기 그림 포함, 개설까지 약 2주)"),
        ("연 운영비", "○○만 원 (월 ○만 원, 서버·저장소 비용 포함)"),
        ("계약 기간", "20○○. ○. ○. ~ 20○○. ○. ○. (1년, 이후 협의해 갱신)"),
        ("표기", "사이트 하단에 “제작·운영: 다락방” 표기"),
        ("공식 지정", "협회 공식 홍보 사이트로 지정, 회의록 기재"),
    ]),
    item("지자체·재단 공모사업 신청 시 ‘홍보 플랫폼 운영비’ 항목으로 넣으면 회비 부담 없이 운영할 수 있습니다.", "참고: "),
    section("5. 진행 순서"),
    p("① 회원 도서관 명단(이름·주소·전화) 전달  →  ② 약 2주 안에 사이트 개설·관장님 링크 발급  →  ③ 관장님 사용 안내  →  ④ 운영 시작", 25, 0),
    blank(),
    p("제안자: 다락방 대표 루카 (앱개발자·작가)    연락처: ______________________", 23, 0),
]
if GENERIC:
    body = generic
xml = head + "".join(body) + "</hs:sec>"
sec = HERE / "_section0.xml"
sec.write_text(xml, encoding="utf-8")
py = sys.executable
subprocess.run([py, str(SKILL / "scripts/build_hwpx.py"), "--template", "report", "--section", str(sec),
                "--title", ("작은도서관 마실 제작·운영 제안서" if GENERIC else "울산 작은도서관 마실 운영 제안서"), "--creator", "다락방", "--output", str(OUT)], check=True)
subprocess.run([py, str(SKILL / "scripts/validate.py"), str(OUT)], check=True)
sec.unlink()
print(OUT)
