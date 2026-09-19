"""그림 16:9 맞춤, 웹 그림 색감 보정, 엔딩 카드, 켄 번스 ffmpeg 필터."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps

SIZE = (1920, 1080)
FPS = 30
ZOOM = 0.08
PAPER = (245, 240, 228)
GUNGSUH = ("C:/Windows/Fonts/batang.ttc", 2)
ART_BOX = (1000, 900)
CREDIT = "그림: Metaluca."
CREDIT_PX = 80
MARGIN = 60


def fit_cover(img, size=SIZE):
    """비율이 달라도 가운데 기준으로 잘라 size를 꽉 채운다."""
    img = img.convert("RGB")
    scale = max(size[0] / img.width, size[1] / img.height)
    img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    left, top = (img.width - size[0]) // 2, (img.height - size[1]) // 2
    return img.crop((left, top, left + size[0], top + size[1]))


def web_tone(img):
    """웹 Nano Banana 그림은 Z Image보다 색이 옅어서 채도·대비를 조금 올린다."""
    img = ImageEnhance.Color(img).enhance(1.18)
    return ImageEnhance.Contrast(img).enhance(1.06)


def credit_box(art_size, credit=CREDIT):
    """엔딩 카드에서 (그림 썸네일 뒤) 크레딧 글자의 가로 시작·끝 위치. 오른쪽 여백을 넘지 않게 당긴다."""
    scale = min(ART_BOX[0] / art_size[0], ART_BOX[1] / art_size[1], 1)
    art_w = round(art_size[0] * scale)
    font = ImageFont.truetype(GUNGSUH[0], CREDIT_PX, index=GUNGSUH[1])
    w = ImageDraw.Draw(Image.new("RGB", (1, 1))).textlength(credit, font=font)
    x0 = min(180 + art_w + 90, SIZE[0] - MARGIN - w)
    return round(x0), round(x0 + w)


def make_end_card(painting, out, credit=CREDIT):
    card = Image.new("RGB", SIZE, PAPER)
    # 폰 사진은 회전 정보(EXIF)로 세워 보여주므로 그대로 쓰면 옆으로 눕는다
    art = ImageOps.exif_transpose(Image.open(painting)).convert("RGB")
    original_size = art.size
    art.thumbnail(ART_BOX, Image.LANCZOS)
    x, y = 180, (SIZE[1] - art.height) // 2
    card.paste(art, (x, y))
    d = ImageDraw.Draw(card)
    font = ImageFont.truetype(GUNGSUH[0], CREDIT_PX, index=GUNGSUH[1])
    text_x, _ = credit_box(original_size, credit)
    d.text((text_x, SIZE[1] // 2 - 50), credit, font=font, fill=(40, 34, 30))
    card.save(out)
    return out


def kenburns_filter(frames, zoom_in=True):
    z = f"1+{ZOOM}*on/{frames}" if zoom_in else f"{1 + ZOOM:.2f}-{ZOOM}*on/{frames}"
    return (f"scale=3840:2160:force_original_aspect_ratio=increase,crop=3840:2160,"
            f"zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s=1920x1080:fps={FPS},"
            f"format=yuv420p")
