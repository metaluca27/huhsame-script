"""참가신청서(AI 영상, 붙임1-3) 작품 칸 채우기. 개인정보(성명·생년월일·연락처·주소)와 서명·날짜는 비워 둠.
사용: python fill_video_form.py
결과: ../제출/참가신청서_AI영상_문신임.hwpx
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile
from xml.sax.saxutils import escape

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, "..", "공식자료", "신청서_영상.hwpx"))
OUT = os.path.normpath(os.path.join(HERE, "..", "제출", "참가신청서_AI영상_문신임.hwpx"))
SKILL = os.path.expanduser("~/.claude/skills/hwpxskill/scripts")
BLACK = "29"   # 양식의 검정 10pt 글자 스타일(회색 안내문은 33·34)

ONE_LINE = "작은 전구 반짝이가 혁신조달 제도를 따라 세계적인 기업으로 자라는 동화 애니메이션"

FILL = {
    (1, 2): " ☑ 개인         □ 팀 ",
    (1, 7): "작은 전구의 여행",
    (1, 8): "애니메이션 (동화풍 내레이션)",
    (1, 9): ONE_LINE,
    (1, 10): (
        "그동안 공공조달 홍보는 주로 '내 일상 속 조달'을 보여 주었습니다. 이 작품은 시선을 바꿔, 한 사람의 작은 아이디어가 "
        "조달청의 혁신조달 제도를 하나씩 거치며 기업으로 자라는 '성장의 길'을 따라갑니다.\n"
        "처음 보는 제품은 아무도 사 주지 않는다는 혁신기업의 현실적인 벽을 보여 주고, 그 벽을 혁신제품 지정·나라장터·시범구매가 "
        "어떻게 넘게 해 주는지 어린이도 이해할 수 있는 동화로 풀었습니다.\n"
        "전하고 싶은 메시지는 \"공공조달은 혁신기업의 디딤돌\"입니다."
    ),
    (1, 11): (
        "3분 20초, 15장면. 노란 전구 캐릭터 '반짝이'가 주인공입니다.\n"
        "① 밤 작업실에서 아이디어가 반짝 켜짐 → ② 설계도 → ③ 시제품 → ④ 시험·인증 → ⑤ 중소기업 제품 탄생 → "
        "⑥ 위기: 처음 보는 제품이라 아무도 사 주지 않아 빛이 흐려짐 → ⑦ 혁신제품 지정 → ⑧ 나라장터 등록 → "
        "⑨ 시범구매로 학교·병원·소방서에 첫 납품 → ⑩ 현장에서 쓰이는 모습 → ⑪ 전국 공공기관으로 → ⑫ 해외 수출 → "
        "⑬ K-혁신 대표기업 → ⑭ 다른 책상 위에서 새 전구가 켜지며 마무리.\n"
        "따뜻한 동화 구연 내레이션과 한글 자막을 넣어 소리 없이 봐도 이해되도록 했습니다. "
        "함께 출품한 AI 게임 「쑥쑥! 혁신제품」의 11단계 배지 그림체와 같은 세계관이라 게임·영상을 묶어 홍보에 쓸 수 있습니다."
    ),
    (1, 12): (
        "영상의 줄거리 자체가 혁신조달 제도의 순서이며, 내레이션으로 다음 내용을 정확히 전달합니다.\n"
        "· 혁신시제품: 뛰어난 시제품을 뽑아 공공기관이 먼저 써 보게 지원\n"
        "· 혁신제품 지정: 기술력을 인정받으면 공공기관이 입찰 없이 수의계약으로 구매(지정 3년, 연장 시 최대 6년)\n"
        "· 나라장터: 7만여 공공기관과 60만여 기업이 만나는 공공 온라인 장터\n"
        "· 시범구매: 조달청이 혁신제품을 먼저 사서 학교·병원·소방서 현장에서 성능 확인\n"
        "· 공공조달 규모(연 238조 원), G-PASS 기업의 해외 공공조달 시장 진출 지원\n"
        "· 마무리 메시지: \"공공조달은 혁신기업의 디딤돌\""
    ),
    (1, 13): (
        "· 이미지: Nano Banana(Google, Higgsfield에서 사용)로 캐릭터 시트와 15장면 일러스트 생성\n"
        "· 영상: Seedance 1.5(ByteDance, Higgsfield에서 사용)로 장면 일러스트를 움직이는 클립으로 변환\n"
        "· 음성: Gemini TTS(Google)로 내레이션 낭독(작가가 만든 TTS 도구 '킬링보이스' 사용)\n"
        "· 음악: Lyria 3.5(Google, Abocado에서 사용)로 배경음악 생성\n"
        "· Claude(Anthropic, Claude Code): 대본 초안, 장면 지시문 작성, 편집 자동화 스크립트 작성\n"
        "주제·줄거리·캐릭터 방향 결정, 장면 선택과 재생성 지시, 최종 검수는 작가가 직접 했습니다."
    ),
    (1, 14): "Higgsfield(Nano Banana, Seedance 1.5), Abocado(Lyria 3.5), Gemini TTS(킬링보이스), Claude Code, FFmpeg·Python(편집·자막)",
    (1, 15): "AI영상_작은전구의여행_문신임.mp4",
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
