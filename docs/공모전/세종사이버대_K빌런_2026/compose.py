# 원화(raw/cutNN.png)에 한글 대사·자막을 얹어 1080x1350 완성 컷을 만든다.
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent
RAW, OUT = HERE / "raw", HERE / "final"
OUT.mkdir(exist_ok=True)
W, H = 1080, 1350
S = 2  # 2배로 그린 뒤 줄여서 글자 가장자리를 부드럽게
FONT = "C:/Windows/Fonts/NotoSansKR-VF.ttf"
INK, CREAM, TEAL, WHITE = (30, 28, 26), (253, 246, 232), (52, 96, 102), (255, 255, 255)
YELLOW, RED = (255, 236, 150), (200, 50, 45)


def font(size, weight=700):
    f = ImageFont.truetype(FONT, size * S)
    f.set_variation_by_axes([weight])
    return f


def base(n, framed):
    im = Image.open(RAW / f"cut{n:02d}.png").convert("RGB")
    if framed:  # 테두리 없이 나온 그림은 다른 컷과 같은 액자 안에 넣는다
        page = Image.new("RGB", (W * S, H * S), CREAM)
        m = 44 * S
        inner = im.resize((W * S - 2 * m, H * S - 2 * m), Image.LANCZOS)
        page.paste(inner, (m, m))
        ImageDraw.Draw(page).rectangle([m, m, W * S - m, H * S - m], outline=INK, width=4 * S)
        return page
    return im.resize((W * S, H * S), Image.LANCZOS)


def text_size(d, text, f, spacing):
    l, t, r, b = d.multiline_textbbox((0, 0), text, font=f, spacing=spacing)
    return r - l, b - t, l, t


def box(d, xy, text, size=40, weight=700, fill=WHITE, ink=INK, outline=INK, radius=28, pad=(30, 22),
        anchor="lt", tail=None, align="left", width=4):
    """글상자. xy는 anchor 기준 좌표(1080 기준). tail=(x,y)면 말꼬리."""
    f = font(size, weight)
    sp = int(size * 0.35) * S
    tw, th, ox, oy = text_size(d, text, f, sp)
    bw, bh = tw + 2 * pad[0] * S, th + 2 * pad[1] * S
    x, y = xy[0] * S, xy[1] * S
    if anchor[0] == "c":
        x -= bw // 2
    elif anchor[0] == "r":
        x -= bw
    if anchor[1] == "b":
        y -= bh
    elif anchor[1] == "m":
        y -= bh // 2
    if tail:
        tx, ty = tail[0] * S, tail[1] * S
        cx = min(max(tx, x + 60 * S), x + bw - 60 * S)
        by = y + bh if ty > y + bh else y
        pts = [(cx - 26 * S, by), (cx + 26 * S, by), (tx, ty)]
        d.polygon(pts, fill=fill)
        d.line([pts[0], pts[2], pts[1]], fill=outline, width=width * S, joint="curve")
    d.rounded_rectangle([x, y, x + bw, y + bh], radius=radius * S, fill=fill,
                        outline=outline, width=width * S if outline else 0)
    if tail:  # 말꼬리와 상자 사이 테두리 지우기
        d.line([(cx - 23 * S, by), (cx + 23 * S, by)], fill=fill, width=(width + 2) * S)
    d.multiline_text((x + pad[0] * S - ox, y + pad[1] * S - oy), text, font=f, fill=ink, spacing=sp, align=align)
    return x // S, y // S, bw // S, bh // S


def caption(d, xy, text, size=38, anchor="cm", dark=True):
    return box(d, xy, text, size=size, weight=800, fill=INK if dark else CREAM, ink=CREAM if dark else INK,
               outline=None if dark else INK, radius=8, pad=(28, 16), anchor=anchor, align="center")


def label(d, xy, text, size=26, ink=INK, anchor="lt", weight=600):
    f = font(size, weight)
    tw, th, ox, oy = text_size(d, text, f, 0)
    x, y = xy[0] * S, xy[1] * S
    if anchor[0] == "r":
        x -= tw
    elif anchor[0] == "c":
        x -= tw // 2
    d.text((x - ox, y - oy), text, font=f, fill=ink)


def sent(d, right, y, text, size=40):  # 호랑이가 보낸 문자(오른쪽)
    return box(d, (right, y), text, size=size, fill=TEAL, ink=WHITE, outline=INK, anchor="rt")


def recv(d, left, y, text, size=40):  # 오누이가 보낸 문자(왼쪽)
    return box(d, (left, y), text, size=size, fill=WHITE, ink=INK, outline=INK, anchor="lt")


def notice(d, y, title, body, accent=RED):
    x0, x1 = 110, 970
    d.rounded_rectangle([x0 * S, y * S, x1 * S, (y + 128) * S], radius=26 * S, fill=CREAM, outline=INK, width=4 * S)
    d.ellipse([(x0 + 26) * S, (y + 38) * S, (x0 + 78) * S, (y + 90) * S], fill=accent, outline=INK, width=3 * S)
    label(d, (x0 + 43, y + 44), "!", size=34, ink=WHITE, weight=900)
    label(d, (x0 + 100, y + 24), title, size=26, ink=(110, 100, 90), weight=600)
    label(d, (x0 + 100, y + 64), body, size=34, ink=INK, weight=800)


def cut1(d):
    caption(d, (80, 70), "엄마다, 문 열어라", size=44, anchor="lt")
    box(d, (70, 300), "얘들아, 엄마다.\n문 열어라~", size=42, weight=800, tail=(420, 520))
    caption(d, (540, 1200), "옛날 옛적, 이 수법은 통했다.", dark=False)


def cut2(d):
    caption(d, (540, 150), "2026년 서울. 작전 재개.", size=44, dark=False)


def cut3(d):
    label(d, (980, 120), "받는 사람: 오누이", size=28, ink=(120, 110, 100), anchor="rt")
    _, y, _, h = sent(d, 980, 170, "엄마야~\n폰 액정이 깨져서 그래.")
    _, y, _, h = sent(d, 980, y + h + 24, "문 좀 열어 줄래?")
    label(d, (980, y + h + 14), "읽음", size=24, ink=(120, 110, 100), anchor="rt")


def cut4(d):
    box(d, (90, 62), "오누이", size=26, fill=INK, ink=CREAM, outline=None, radius=20, pad=(18, 8))
    recv(d, 90, 124, "엄마면 영상통화 받아 봐 ㅋ", size=42)
    box(d, (540, 1262), "영상통화 중  ·  뷰티 필터 ON", size=30, fill=INK, ink=CREAM, outline=None,
        radius=40, pad=(34, 16), anchor="cb")


def cut5(d):
    _, y, _, h = recv(d, 80, 1085, "손 보여 줘.", size=40)
    recv(d, 330, 1195, "엄마 어제 네일 했는데?", size=40)


def cut6(d):
    box(d, (560, 110), "삐빅— 비밀번호 5회 오류.\n경비실로 연결합니다.", size=40, weight=800,
        fill=YELLOW, radius=10, tail=(905, 700), anchor="ct", align="center")


def cut7(d):
    notice(d, 130, "Web발신", "사칭 의심 번호로 신고되었습니다.")
    notice(d, 290, "본인인증", "인증 실패 · 더는 시도할 수 없습니다.")
    notice(d, 450, "메시지", "오누이 님이 대화방을 나갔습니다.", accent=TEAL)


def cut8(d):
    box(d, (75, 640), "엄마가 떡\n남겨 두래.\n문은 못 열어 줘.\n      — 오누이", size=34, weight=700,
        fill=YELLOW, radius=6, pad=(26, 24), tail=(452, 955), width=3)
    caption(d, (650, 170), "서울에서는,\n문은 안 열어 줘도 떡은 준다.", size=38)


CUTS = {1: (cut1, False), 2: (cut2, False), 3: (cut3, True), 4: (cut4, False),
        5: (cut5, False), 6: (cut6, False), 7: (cut7, True), 8: (cut8, True)}

if __name__ == "__main__":
    thumbs = []
    for n, (fn, framed) in CUTS.items():
        im = base(n, framed)
        fn(ImageDraw.Draw(im))
        im = im.resize((W, H), Image.LANCZOS)
        im.save(OUT / f"cut{n:02d}.png")
        thumbs.append(im.resize((540, 675)))
    sheet = Image.new("RGB", (540 * 4, 675 * 2), "white")
    for i, t in enumerate(thumbs):
        sheet.paste(t, ((i % 4) * 540, (i // 4) * 675))
    sheet.save(RAW / "contact_final.jpg", quality=88)
    print("done")
