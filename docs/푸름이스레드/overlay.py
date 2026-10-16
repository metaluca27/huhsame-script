import os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
B = r"C:\Users\atlia\Desktop\huhsame-script\docs\푸름이스레드"
FONT = os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Windows\Fonts\UhBeeSe_hyun.ttf")
posts = [
  ("00_소개", "시안/sian2.png", ["10년을 함께한 푸름이가", "작년 겨울 하늘로 갔다.", "보고 싶어서", "그림으로 다시 만나기로 했다."]),
  ("01_밥", "컷/cut1.png", ["냐앙~ 집사야.", "나 여기서 잘 지내.", "너도 밥은 챙겨 먹어."]),
  ("02_빼꼼", "컷/cut2.png", ["안 보인다고 없는 거 아니야.", "여기서 다 보고 있어, 집사야."]),
  ("03_잘했어", "컷/cut3.png", ["오늘 별일 없이 지나갔으면", "그걸로 잘한 거야, 집사야."]),
  ("04_꿀잠", "컷/cut4.png", ["냐앙~ 오늘은 그만하고 자.", "내일 3시에 또 올게."]),
  ("05_다리", "컷/cut05.png", ["집사 다리가 제일 편했어.", "지금도 그래."]),
  ("06_생선", "컷/cut06.png", ["하늘에도 생선 인형은 있어.", "근데 던져주는 집사가 없어."]),
  ("08_간식", "컷/cut08.png", ["냐앙~ 집사야.", "3시야. 간식 시간이야."]),
  ("09_앞발", "컷/cut09.png", ["힘들면 손 내밀어.", "내 앞발 여기 있어."]),
  ("10_이불", "컷/cut10.png", ["날이 추워졌어.", "이불 꼭 덮고 자, 집사야."]),
  ("11_낮잠", "컷/cut11.png", ["오늘 하루 어땠어?", "나는 구름 위에서 낮잠 세 번 잤어."]),
]
W, H = 1080, 1350
only = sys.argv[1:]
for name, src, lines in posts:
    if only and name[:2] not in only: continue
    art = Image.open(os.path.join(B, src)).convert("RGB")
    bg = art.getpixel((20, 20))
    canvas = Image.new("RGB", (W, H), bg)
    aw = int(W * 0.86); ah = int(art.height * aw / art.width)
    art = art.resize((aw, ah), Image.LANCZOS)
    mask = Image.new("L", (aw, ah), 0); md = ImageDraw.Draw(mask)
    pad = 60; md.rectangle([pad, pad, aw - pad, ah - pad], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(40))
    canvas.paste(art, ((W - aw) // 2, H - ah + 10), mask)
    d = ImageDraw.Draw(canvas)
    size = 60
    ft = ImageFont.truetype(FONT, size)
    while max(d.textlength(l, font=ft) for l in lines) > W - 140:
        size -= 2; ft = ImageFont.truetype(FONT, size)
    lh = int(size * 1.45); y = 90
    for l in lines:
        tw = d.textlength(l, font=ft)
        d.text(((W - tw) / 2, y), l, font=ft, fill=(68, 78, 98))
        y += lh
    canvas.save(os.path.join(B, "완성", name + ".jpg"), quality=92)
    print(name, size, y, H - ah + 10)
