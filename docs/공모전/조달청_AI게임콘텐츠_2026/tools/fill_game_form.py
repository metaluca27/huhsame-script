"""참가신청서(AI 게임, 붙임1-1) 작품 칸 채우기. 개인정보(성명·생년월일·연락처·주소)와 서명·날짜는 비워 둠.
사용: python fill_game_form.py
결과: ../제출/참가신청서_AI게임_문신임.hwpx
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile
from xml.sax.saxutils import escape

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, "..", "공식자료", "신청서_게임.hwpx"))
OUT = os.path.normpath(os.path.join(HERE, "..", "제출", "참가신청서_AI게임_문신임.hwpx"))
SKILL = os.path.expanduser("~/.claude/skills/hwpxskill/scripts")
BLACK = "29"   # 양식의 검정 10pt 글자 스타일(회색 안내문은 33·34)

ONE_LINE = "같은 단계끼리 합쳐 작은 아이디어를 K-혁신 대표기업으로 키우는 혁신조달 합체 퍼즐"

# (열, 행) → 채울 내용. 줄바꿈은 셀 안 줄바꿈으로 들어감.
FILL = {
    (1, 2): " ☑ 개인         □ 팀 ",
    (1, 7): "쑥쑥! 혁신제품",
    (1, 8): "퍼즐 (교육)",
    (1, 9): " ☑ PC      ☑ WEB        ☑ 모바일",
    (1, 10): ONE_LINE,
    (1, 11): (
        "조달청의 혁신제품 제도는 기업의 좋은 아이디어가 공공기관의 첫 구매로 이어지도록 돕는 정책이지만, "
        "일반 국민에게는 '혁신제품 지정', '나라장터', '수의계약' 같은 말이 낯섭니다. "
        "누구나 아는 합체 퍼즐의 재미에 아이디어가 기업으로 자라는 11단계를 입혀, 설명서를 읽지 않아도 "
        "놀다 보면 혁신조달의 흐름이 자연스럽게 머리에 남도록 기획했습니다.\n"
        "전하고 싶은 메시지는 \"작은 아이디어도 공공조달을 만나면 세계로 자랄 수 있다\"입니다."
    ),
    (1, 12): (
        "목표: 같은 단계의 조각끼리 부딪혀 합치며 최고 단계인 'K-혁신 대표기업'까지 키우는 것.\n"
        "성장 11단계: 아이디어 → 설계도 → 시제품 → 시험·인증 → 중소기업 제품 → 혁신제품 지정 → "
        "나라장터 등록 → 첫 공공 납품 → 전국 공공기관으로 → 해외 수출 → K-혁신 대표기업\n"
        "도감 카드: 새 단계를 처음 만들면 게임이 잠시 멈추고 그 단계를 설명하는 카드가 열립니다. "
        "모은 카드는 '혁신제품 도감'에서 다시 읽을 수 있습니다.\n"
        "점수·콤보: 높은 단계일수록 점수가 크고, 연달아 합치면 콤보 배율이 붙습니다. "
        "조각이 위쪽 경계선을 넘어 쌓이면 게임이 끝나고, 내 아이디어가 몇 단계까지 자랐는지 보여 줍니다."
    ),
    (1, 13): (
        "마우스·터치: 게임 화면에서 좌우로 움직여 떨어뜨릴 위치를 정하고, 누른 손을 떼면 조각이 떨어집니다.\n"
        "키보드: ←/→ 위치 이동, 스페이스·↓·Enter 떨어뜨리기.\n"
        "떨어지는 조각은 1~3단계뿐이고 4단계부터는 합쳐야만 만들어지므로, 제도 순서대로 카드가 열립니다.\n"
        "설치 없이 브라우저(크롬·엣지 등)에서 바로 실행되며 인터넷 연결 없이도 동작합니다."
    ),
    (1, 14): (
        "게임의 11단계 자체가 혁신제품이 공공시장에 들어가 성장하는 경로이며, 도감 카드로 다음 정책을 소개합니다.\n"
        "· 혁신시제품: 뛰어난 시제품을 뽑아 공공기관이 써 보게 지원\n"
        "· 혁신제품 지정: 기술력을 인정받으면 공공기관이 입찰 없이 수의계약으로 구매(지정 3년, 연장 시 최대 6년)\n"
        "· 나라장터: 7만여 공공기관과 60만여 기업이 이용하는 공공 온라인 장터\n"
        "· 시범구매: 조달청이 혁신제품을 사서 학교·병원·소방서 현장에서 성능 확인\n"
        "· 공공조달 규모(연 238조 원)와 G-PASS 기업의 해외 공공조달 시장 진출 지원\n"
        "마지막 카드는 \"공공조달은 혁신기업의 디딤돌\"이라는 메시지로 마무리됩니다."
    ),
    (1, 15): (
        "· Claude(Anthropic, Claude Code): 게임 규칙 설계 보조, 전체 코드 작성(HTML·JavaScript), 테스트·버그 수정, 도감 카드 문구 초안\n"
        "· Nano Banana 2(Google, Higgsfield에서 사용): 11단계 배지 일러스트 생성\n"
        "· Lyria 3.5(Google, Abocado에서 사용): 시연영상 배경음악 생성\n"
        "주제·11단계 구성·정책 내용 선정·그림 방향·최종 검수는 작가가 직접 했으며, 효과음은 코드로 합성했습니다."
    ),
    (1, 17): "AI게임_시연영상_쑥쑥혁신제품_문신임.mp4\nAI게임_실행파일_쑥쑥혁신제품_문신임.zip",
    (1, 16):"Claude Code, Higgsfield(Nano Banana 2), Abocado(Lyria 3.5), Matter.js(오픈소스 물리엔진, MIT), Python·FFmpeg(이미지·영상 후처리)",
}


def para_xml(para_pr, text):
    t = "<hp:lineBreak/>".join(escape(line) for line in text.split("\n"))
    return (f'<hp:p id="0" paraPrIDRef="{para_pr}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">'
            f'<hp:run charPrIDRef="{BLACK}"><hp:t>{t}</hp:t></hp:run></hp:p>')


tmp = tempfile.mkdtemp(prefix="gameform-")
subprocess.run([sys.executable, os.path.join(SKILL, "office", "unpack.py"), SRC, tmp], check=True, stdout=subprocess.DEVNULL)
sec_path = os.path.join(tmp, "Contents", "section0.xml")
x = open(sec_path, encoding="utf-8").read()

# 신청서 본문 표(‘작품명’ 칸이 있는 표)만 대상
tbl_start = x.rfind("<hp:tbl ", 0, x.index(">작품명<"))
tbl_end = x.index("</hp:tbl>", tbl_start)
body = x[tbl_start:tbl_end]
done = set()


def fill_cell(m):
    cell = m.group(0)
    a = re.search(r'<hp:cellAddr colAddr="(\d+)" rowAddr="(\d+)"/>', cell)
    key = (int(a.group(1)), int(a.group(2)))
    if key not in FILL:
        return cell
    para_pr = re.search(r'<hp:p [^>]*paraPrIDRef="(\d+)"', cell).group(1)
    s = cell.index(">", cell.index("<hp:subList")) + 1
    e = cell.index("</hp:subList>")
    done.add(key)
    return cell[:s] + para_xml(para_pr, FILL[key]) + cell[e:]


body = re.sub(r"<hp:tc\b.*?</hp:tc>", fill_cell, body, flags=re.S)
missing = set(FILL) - done
if missing:
    sys.exit(f"못 찾은 칸: {sorted(missing)}")
x = x[:tbl_start] + body + x[tbl_end:]
open(sec_path, "w", encoding="utf-8").write(x)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
subprocess.run([sys.executable, os.path.join(SKILL, "office", "pack.py"), tmp, OUT], check=True, stdout=subprocess.DEVNULL)
shutil.rmtree(tmp, ignore_errors=True)
print(OUT, "| 한 줄 소개", len(ONE_LINE), "자")
