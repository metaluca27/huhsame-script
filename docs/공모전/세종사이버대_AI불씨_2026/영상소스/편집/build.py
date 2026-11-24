# -*- coding: utf-8 -*-
"""「AI 불씨」 트랙 2 영상 조립.
실행: python 영상소스/편집/build.py   (공모전 폴더에서)
목소리를 다시 녹음하면 영상소스/목소리/1~6.m4a 를 바꾸고, 아래 CUTS·SUBS·시간표를 새 받아쓰기에 맞춰 고친 뒤 다시 돌린다.
"""
import os, sys, json, io, subprocess, shutil
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance, ImageOps

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, '영상소스')
OLD = os.path.join(ROOT, '옛자료')
TMP = os.path.join(os.environ.get('BUILD_TMP') or os.path.join(SRC, '편집', '_tmp'))
os.makedirs(TMP, exist_ok=True)
W, H, FPS = 1920, 1080, 30
BOLD = "C:/Windows/Fonts/malgunbd.ttf"
REG = "C:/Windows/Fonts/malgun.ttf"
ONLY = sys.argv[1:]  # 예: python build.py s3 final


def run(cmd):
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode != 0:
        print(' '.join(str(c) for c in cmd)[:3000])
        print(r.stderr.decode('utf-8', 'ignore')[-3000:])
        raise SystemExit(1)


def dur(p):
    o = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True).stdout
    return float(o.decode().strip())


def font(sz, bold=True):
    return ImageFont.truetype(BOLD if bold else REG, sz)


# ---------- 그림 준비 ----------
def bg():
    p = os.path.join(TMP, 'bg.png')
    im = Image.new('RGB', (W, H), (24, 22, 26))
    d = ImageDraw.Draw(im)
    for y in range(H):
        c = int(8 * y / H)
        d.line([(0, y), (W, y)], fill=(26 + c, 23 + c, 30 + c))
    glow = Image.new('RGB', (W, H), (0, 0, 0))
    ImageDraw.Draw(glow).ellipse((300, 100, 1620, 980), fill=(46, 38, 60))
    glow = glow.filter(ImageFilter.GaussianBlur(220))
    im = Image.blend(im, Image.composite(glow, im, Image.new('L', (W, H), 255)), 0.55)
    im.save(p)
    return p


def card(name, im, h, blur=(), border=8):
    """그림을 높이 h의 흰 테두리 카드로."""
    im = im.convert('RGB')
    for b in blur:
        reg = im.crop(b).filter(ImageFilter.GaussianBlur(14))
        im.paste(reg, b[:2])
    w = int(im.width * h / im.height) // 2 * 2
    im = im.resize((w, h), Image.LANCZOS)
    out = Image.new('RGB', (w + border * 2, h + border * 2), 'white')
    out.paste(im, (border, border))
    p = os.path.join(TMP, name + '.png')
    out.save(p)
    return p, out.size


def text_png(name, items):
    """items: [(text, x, y, size, color, anchor, bold)] → 전체 화면 투명 PNG"""
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ds = ImageDraw.Draw(sh)
    for t, x, y, sz, col, an, b in items:
        ds.text((x + 2, y + 3), t, font=font(sz, b), fill=(0, 0, 0, 170), anchor=an)
    sh = sh.filter(ImageFilter.GaussianBlur(4))
    im = Image.alpha_composite(im, sh)
    d = ImageDraw.Draw(im)
    for t, x, y, sz, col, an, b in items:
        d.text((x, y), t, font=font(sz, b), fill=col, anchor=an)
    p = os.path.join(TMP, name + '.png')
    im.save(p)
    return p


def sub_png(name, text):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    f = font(46)
    tw = d.textlength(text, font=f)
    x0 = (W - tw) / 2 - 34
    y0 = 948
    d.rounded_rectangle((x0, y0, x0 + tw + 68, y0 + 84), radius=20, fill=(12, 12, 16, 205))
    d.text((W / 2, y0 + 41), text, font=f, fill=(255, 255, 255, 255), anchor='mm')
    p = os.path.join(TMP, name + '.png')
    im.save(p)
    return p


# ---------- 한 화면(비트) 만들기 ----------
def beat(out, length, layers, base=None):
    """layers: dict(src, kind='img'|'vid', x, y, at=0, ss=0, crop=None, h=None, speed=1.0, border=True, fade=0.5, until=None, full=False)"""
    cmd = ['ffmpeg', '-v', 'error', '-y', '-loop', '1', '-t', f'{length:.3f}', '-i', base or bg()]
    fc = [f'[0:v]scale={W}:{H},fps={FPS},format=yuv420p,setsar=1[b0]']
    last = 'b0'
    for i, L in enumerate(layers, 1):
        at = L.get('at', 0.0)
        if L['kind'] == 'img':
            cmd += ['-loop', '1', '-t', f'{length:.3f}', '-i', L['src']]
            chain = f'[{i}:v]fps={FPS},setsar=1'
        else:
            cmd += ['-ss', f"{L.get('ss', 0):.3f}", '-i', L['src']]
            chain = f'[{i}:v]fps={FPS}'
            if L.get('crop'):
                cw, ch, cx, cy = L['crop']
                chain += f',crop={cw}:{ch}:{cx}:{cy}'
            if L.get('full'):
                chain += f',scale={W}:{H}:flags=lanczos'
            else:
                chain += f",scale=-2:{L['h']}:flags=lanczos"
                if L.get('border', True):
                    chain += ',pad=iw+16:ih+16:8:8:color=white'
            chain += f",setsar=1,setpts={L.get('speed', 1.0)}*(PTS-STARTPTS)+{at}/TB,tpad=stop_mode=clone:stop_duration=90"
        fd = L.get('fade', 0.5)
        chain += f',format=yuva420p'
        if fd > 0:
            chain += f',fade=t=in:st={at}:d={fd}:alpha=1'
        if L.get('until') is not None and L.get('fadeout', 0) > 0:
            chain += f",fade=t=out:st={L['until'] - L['fadeout']}:d={L['fadeout']}:alpha=1"
        chain += f'[l{i}]'
        fc.append(chain)
        en = f"gte(t,{at})" if L.get('until') is None else f"between(t,{at},{L['until']})"
        fc.append(f"[{last}][l{i}]overlay={L.get('x', 0)}:{L.get('y', 0)}:enable='{en}':eof_action=repeat[b{i}]")
        last = f'b{i}'
    cmd += ['-filter_complex', ';'.join(fc), '-map', f'[{last}]', '-t', f'{length:.3f}', '-r', str(FPS),
            '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-an', out]
    run(cmd)


def concat(parts, out):
    lst = os.path.join(TMP, os.path.basename(out) + '.txt')
    io.open(lst, 'w', encoding='utf-8').write(''.join(f"file '{p.replace(chr(92), '/')}'\n" for p in parts))
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', out])


def want(k):
    return not ONLY or k in ONLY


# ---------- 목소리 ----------
VO_OFF = {1: 1.0, 2: 0.3, 3: 0.3, 4: 0.3, 5: 0.3, 6: 0.3}
CUTS = {3: [(9.30, 12.15)], 5: [(10.45, 11.74)]}   # 다시 말한 부분 잘라내기
GAP = {1: 0.7, 2: 0.7, 3: 0.8, 4: 0.7, 5: 0.7}


def shift(n, t):
    for a, b in CUTS.get(n, []):
        if t >= b:
            t -= (b - a)
    return t


def voices():
    out = {}
    for n in range(1, 7):
        src = os.path.join(SRC, '목소리', f'{n}.m4a')
        dst = os.path.join(TMP, f'vo{n}.wav')
        D = dur(src)
        keep, t = [], 0.0
        for a, b in CUTS.get(n, []):
            keep.append((t, a)); t = b
        keep.append((t, D))
        fc = ''.join(f'[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st={b - a - 0.03}:d=0.03[k{i}];' for i, (a, b) in enumerate(keep))
        fc += ''.join(f'[k{i}]' for i in range(len(keep))) + f'concat=n={len(keep)}:v=0:a=1,highpass=f=85,afftdn=nf=-26,acompressor=threshold=-22dB:ratio=2.5:attack=8:release=160,loudnorm=I=-16:TP=-1.5:LRA=9,aresample=48000[o]'
        if want('vo') or not os.path.exists(dst):
            run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-filter_complex', fc, '-map', '[o]', '-ac', '2', dst])
        out[n] = (dst, dur(dst))
    return out


SUBS = {
    1: [(0, 3, "저는 메타버스에서 놀던 사람이에요."), (4, 11, "제페토에서 옷을 만들어서 제 아바타에 입혔어요."),
        (12, 17, "가끔 제 옷을 입은 아바타가 지나가면"), (18, 22, "너무 신기해서 한참을 쳐다보곤 했어요."),
        (23, 28, "이프랜드에서는 강의도 하고 북토크도 하고"), (29, 35, "제가 낸 전자책 두 권으로 강의도 했어요."),
        (36, 42, "평일 낮에는 서른 명쯤 들어오는 게 보통이었는데"), (43, 50, "제가 강의하던 날, 정원 131명이 꽉 찼어요."),
        (51, 53, "아주 신기한 경험이었어요."), (54, 61, "스페이셜에는 제 그림을 건 전시 공간도 만들었고요.")],
    2: [(0, 2, "그러다 AI를 만났어요."), (3, 9, "메타버스는 문 열고 들어가면 놀 게 있는데"), (10, 13, "AI는 빈 입력창 하나뿐이었어요."),
        (14, 17, "뭘 물어봐야 할지 모르겠더라고요."), (18, 24, "배울 곳을 찾아봤는데, 강의 광고는 넘치고"),
        (25, 32, "어떤 게 좋은 건지 고를 눈이 저한테는 없었어요."), (33, 39, "그래서 강의를 고르는 대신 AI한테 직접 물어보면서"), (40, 41, "혼자 배웠어요.")],
    3: [(0, 5, "그러는 사이 이프랜드는 문을 닫았어요."), (6, 12, "올해 5월에는 스페이셜에서 메일이 한 통 왔어요."),
        (17, 22, "서비스를 닫으니 작품을 내려받으라는 메일이었는데"), (23, 25, "너무 늦게 봐서"), (26, 30, "결국은 제 작품을 내려받지 못하고"),
        (31, 33, "전시 공간은 그대로 사라졌어요."), (34, 35, "그때 알았죠."), (36, 41, "남의 땅에 지은 건, 땅 주인이 떠나면"), (42, 44, "같이 없어진다는 거예요.")],
    4: [(0, 5, "그래서 이번에는 제가 직접 짓기로 했어요."), (6, 7, "AI한테 물었어요."), (8, 13, "“이런 거 어때? 이거 만들 수 있어?”"),
        (14, 16, "저는 코딩을 몰라요."), (17, 22, "그래서 코드 대신 제 느낌을 말했어요."), (23, 30, "소리를 듣고 “춥다”고 했더니 AI가 높은 소리를 줄였어요."),
        (31, 34, "“칙칙하다”고 했더니 밝게 바꿨고요."), (35, 40, "그래도 아니어서 진짜 피아노 곡을 넣자고 했어요."),
        (41, 42, "틀려도 괜찮았어요."), (43, 45, "다시 말하면 되니까요.")],
    5: [(0, 2, "그래서 「쉼」이 생겼어요."), (3, 9, "제 그림을 보면서 피아노와 자연 소리를 듣는 갤러리예요."),
        (10, 15, "이번에는 파일이 전부 제 손에 있어요."), (19, 26, "어디가 문을 닫아도 다른 곳에 다시 올리면 돼요."), (27, 32, "링크만 있으면 누구나 들어올 수 있고요.")],
    6: [(0, 7, "처음의 저처럼 빈 입력창 앞에서 멈춘 분들을 위해서"), (8, 14, "제가 실제로 쓰는 첫 지시문 열 개를 올려 뒀어요."),
        (15, 18, "첫마디는 이거면 돼요."), (19, 22, "“이것도 만들 수 있어?”")],
}
WORDS = json.load(io.open(os.path.join(SRC, '목소리', '받아쓰기.json'), encoding='utf-8'))


def wt(n, i, end=False):
    ws = [w for s in WORDS[str(n)] for w in s['w']]
    return shift(n, ws[i][2 if end else 1])


def main():
    vo = voices()
    A = os.path.join(SRC, 'AI장면')
    REC = os.path.join(SRC, '화면녹화')
    secs = {}

    # ===== 1. 메타버스 시절 =====
    o1 = VO_OFF[1]
    L1 = o1 + vo[1][1] + GAP[1]
    if want('s1'):
        z1 = os.path.join(OLD, 'KakaoTalk_20261124_112411459.mp4')
        z2 = os.path.join(OLD, 'KakaoTalk_20261124_112409978.mp4')
        sp = os.path.join(OLD, '스페이셜내갤러리.mp4')
        c12, s12 = card('c_if12', Image.open(os.path.join(OLD, 'KakaoTalk_20261124_112421850_12.jpg')).crop((0, 384, 1080, 1509)), 620)
        ce1, se1 = card('c_eb1', Image.open(os.path.join(OLD, 'KakaoTalk_20261124_112421850.jpg')).crop((0, 276, 1080, 872)), 300)
        ce2, se2 = card('c_eb2', Image.open(os.path.join(OLD, 'KakaoTalk_20261124_112421850_02.jpg')).crop((0, 563, 1080, 1903)), 620)
        im131 = Image.open(os.path.join(OLD, 'KakaoTalk_20261124_112421850_05.jpg')).crop((0, 364, 1080, 1432))
        c131, s131 = card('c_131', im131, 740, blur=[(805, 418, 985, 478), (425, 468, 550, 508), (1150, 30, 1080, 30)][:2])
        tA, tB, tC, tD, tE = 0, o1 + wt(1, 12) - 0.1, o1 + wt(1, 23) - 0.1, o1 + wt(1, 36) - 0.1, o1 + wt(1, 54) - 0.2
        cap = lambda n, t1, t2: text_png(n, [(t1, 120, 70, 44, (255, 255, 255, 255), 'la', True), (t2, 122, 130, 30, (205, 200, 215, 255), 'la', False)])
        parts = []
        # A: 제페토 옷걸이
        p = os.path.join(TMP, 's1a.mp4'); parts.append(p)
        beat(p, tB - tA, [dict(src=z1, kind='vid', ss=0.3, crop=(930, 1370, 0, 150), h=740, x=701, y=180, at=0.3),
                          dict(src=cap('k1a', '제페토', '2021~2022 · 옷을 만들어 아바타에게 입혔어요'), kind='img', at=0.3)])
        # B: 제페토 두 장
        p = os.path.join(TMP, 's1b.mp4'); parts.append(p)
        beat(p, tC - tB, [dict(src=z1, kind='vid', ss=4.0, crop=(930, 1370, 0, 150), h=740, x=420, y=180, fade=0.3),
                          dict(src=z2, kind='vid', ss=5.0, crop=(1078, 1230, 0, 0), h=740, x=1020, y=180, at=0.2),
                          dict(src=cap('k1a', '제페토', '2021~2022 · 옷을 만들어 아바타에게 입혔어요'), kind='img', fade=0)])
        # C: 이프랜드 강의·전자책
        p = os.path.join(TMP, 's1c.mp4'); parts.append(p)
        x0 = (W - (s12[0] + se1[0] + se2[0] + 80)) // 2
        beat(p, tD - tC, [dict(src=c12, kind='img', x=x0, y=230, at=0.1),
                          dict(src=ce1, kind='img', x=x0 + s12[0] + 40, y=230 + (620 - 300) // 2, at=3.2),
                          dict(src=ce2, kind='img', x=x0 + s12[0] + se1[0] + 80, y=230, at=4.2),
                          dict(src=cap('k1c', '이프랜드', '2021~2022 · 강의, 북토크, 전자책 두 권'), kind='img', at=0.1)])
        # D: 131명
        p = os.path.join(TMP, 's1d.mp4'); parts.append(p)
        big = text_png('k1d', [("이프랜드", 120, 70, 44, (255, 255, 255, 255), 'la', True), ("2022년 3월 7일 월요일 오후 3시", 122, 130, 30, (205, 200, 215, 255), 'la', False),
                               ("평소", 1290, 380, 40, (205, 200, 215, 255), 'la', False), ("서른 명쯤", 1290, 430, 76, (255, 255, 255, 255), 'la', True)])
        big2 = text_png('k1d2', [("이날", 1290, 590, 40, (205, 200, 215, 255), 'la', False), ("131명", 1290, 640, 130, (255, 214, 102, 255), 'la', True),
                                 ("정원이 꽉 찼어요", 1294, 800, 36, (255, 255, 255, 255), 'la', False)])
        beat(p, tE - tD, [dict(src=c131, kind='img', x=400, y=180, at=0.1),
                          dict(src=big, kind='img', at=0.3), dict(src=big2, kind='img', at=o1 + wt(1, 47) - tD - 0.2)])
        # E: 스페이셜 내 갤러리
        p = os.path.join(TMP, 's1e.mp4'); parts.append(p)
        beat(p, L1 - tE, [dict(src=sp, kind='vid', ss=0.5, crop=(336, 528, 0, 112), h=740, x=716, y=180, at=0.2),
                          dict(src=cap('k1e', '스페이셜', '나의 가상 전시공간 · 메타루카\'s Healing space'), kind='img', at=0.2)])
        concat(parts, os.path.join(TMP, 's1.mp4'))
    secs[1] = L1

    # ===== 2. 빈 입력창 =====
    o2 = VO_OFF[2]
    L2 = o2 + vo[2][1] + GAP[2]
    blink = os.path.join(TMP, 'blink.mp4')
    if want('s2') or want('blink') or not os.path.exists(blink):
        base = Image.open(os.path.join(A, '끝화면_정리.png')).convert('RGB')
        bw, bh = base.size
        fr = os.path.join(TMP, 'blinkf'); os.makedirs(fr, exist_ok=True)
        z = 1.10; w = bw / z; h = w * H / W; cx, cy = 964, 400
        x = min(max(cx - w / 2, 0), bw - w); y = min(max(cy - h / 2, 0), bh - h)
        tx, ty = 660 + (608 - 477) / 2 - 6, 362
        for on in (0, 1):
            b = base.copy()
            if on:
                ImageDraw.Draw(b).rectangle((tx + 6, ty + 6, tx + 10, ty + 62), fill=(45, 45, 50))
            b.crop((int(x), int(y), int(x + w), int(y + h))).resize((W, H), Image.LANCZOS).save(os.path.join(fr, f'{on}.png'))
        # 0.5초씩 번갈아 12초
        lst = os.path.join(TMP, 'blink.txt')
        io.open(lst, 'w', encoding='utf-8').write(''.join(f"file '{os.path.join(fr, str((i + 1) % 2) + '.png').replace(chr(92), '/')}'\nduration 0.5\n" for i in range(24)))
        run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-vf', f'fps={FPS},format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', blink])
    if want('s2'):
        t1 = o2 + wt(2, 14) - 0.15     # 뭘 물어봐야
        t2 = o2 + wt(2, 33) - 0.1      # 그래서 강의를 고르는 대신
        parts = []
        p = os.path.join(TMP, 's2a.mp4'); parts.append(p)
        beat(p, t1, [dict(src=os.path.join(A, '장면2_빈입력창_편집.mp4'), kind='vid', full=True, speed=t1 / 7.0, fade=0)])
        p = os.path.join(TMP, 's2b.mp4'); parts.append(p)
        beat(p, t2 - t1, [dict(src=os.path.join(A, '장면3_쏟아지는광고_v1.mp4'), kind='vid', full=True, speed=(t2 - t1) / 8.0, fade=0.4)])
        p = os.path.join(TMP, 's2c.mp4'); parts.append(p)
        beat(p, L2 - t2, [dict(src=blink, kind='vid', full=True, fade=0.4)])
        concat(parts, os.path.join(TMP, 's2.mp4'))
    secs[2] = L2

    # ===== 3. 잃은 것 =====
    o3 = VO_OFF[3]
    L3 = o3 + vo[3][1] + GAP[3]
    if want('s3'):
        im131 = Image.open(os.path.join(OLD, 'KakaoTalk_20261124_112421850_05.jpg')).crop((0, 364, 1080, 1432))
        c131, s131 = card('c_131b', im131, 760, blur=[(805, 418, 985, 478), (425, 468, 550, 508)])
        g = ImageEnhance.Brightness(ImageOps.grayscale(Image.open(c131)).convert('RGB')).enhance(0.32)
        cg = os.path.join(TMP, 'c_131g.png'); g.save(cg)
        # 메일 카드
        mail = Image.open(os.path.join(OLD, '스페이셜_종료메일_2026-05-29.png')).convert('RGB')
        mc = Image.new('RGB', (1560, 800), 'white')
        d = ImageDraw.Draw(mc)
        d.text((60, 44), "받은 메일", font=font(30), fill=(120, 110, 140))
        d.text((1500, 44), "2026년 5월 29일", font=font(30), fill=(120, 110, 140), anchor='ra')
        d.line([(60, 100), (1500, 100)], fill=(225, 222, 232), width=2)
        sub = mail.crop((44, 48, 604, 80)); sub = sub.resize((int(sub.width * 2.5), int(sub.height * 2.5)), Image.LANCZOS); mc.paste(sub, (56, 130))
        snd = mail.crop((44, 86, 190, 106)); snd = snd.resize((int(snd.width * 1.9), int(snd.height * 1.9)), Image.LANCZOS); mc.paste(snd, (60, 228))
        bl = mail.crop((336, 584, 1062, 608)); bl = bl.resize((int(bl.width * 1.95), int(bl.height * 1.95)), Image.LANCZOS); mc.paste(bl, (60, 320))
        d.text((62, 392), "→ 7월 27일에 창작자용 서비스를 닫습니다. (옮긴 뜻)", font=font(30, False), fill=(90, 84, 110))
        d.line([(60, 470), (1500, 470)], fill=(225, 222, 232), width=2)
        dl = mail.crop((62, 1340, 830, 1472)); dl = dl.resize((int(dl.width * 1.75), int(dl.height * 1.75)), Image.LANCZOS); mc.paste(dl, (56, 500))
        d.text((62, 742), "→ 그 전에 작품을 내려받으세요. (옮긴 뜻)", font=font(30, False), fill=(90, 84, 110))
        cm, sm = card('c_mail', mc, 800)
        ring = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        mx, my = (W - sm[0]) // 2, 110
        ImageDraw.Draw(ring).rounded_rectangle((mx + 8 + 56 + 6, my + 8 + 500 + 142, mx + 8 + 56 + 290, my + 8 + 500 + 226), radius=16, outline=(235, 70, 70, 255), width=7)
        rp = os.path.join(TMP, 'ring.png'); ring.save(rp)
        ta = o3 + wt(3, 6) - 0.25      # 올해 5월
        tb = o3 + wt(3, 26) - 0.1      # 결국은
        parts = []
        p = os.path.join(TMP, 's3a.mp4'); parts.append(p)
        beat(p, ta, [dict(src=c131, kind='img', x=(W - s131[0]) // 2, y=150, fade=0.3),
                     dict(src=cg, kind='img', x=(W - s131[0]) // 2, y=150, at=o3 + wt(3, 4) - 0.2, fade=1.2),
                     dict(src=text_png('k3a', [("이프랜드", 120, 70, 44, (255, 255, 255, 255), 'la', True), ("서비스 종료", 122, 130, 30, (205, 200, 215, 255), 'la', False)]), kind='img', at=o3 + wt(3, 4))])
        p = os.path.join(TMP, 's3b.mp4'); parts.append(p)
        beat(p, tb - ta, [dict(src=cm, kind='img', x=mx, y=my, at=0.1),
                          dict(src=rp, kind='img', at=o3 + wt(3, 19) - ta, fade=0.3)])
        p = os.path.join(TMP, 's3c.mp4'); parts.append(p)
        beat(p, L3 - tb, [dict(src=os.path.join(A, '장면1_불꺼진전시장_v1.mp4'), kind='vid', full=True, speed=1.5, fade=0.5)])
        concat(parts, os.path.join(TMP, 's3.mp4'))
    secs[3] = L3

    # ===== 4. 이번엔 내가 짓는다 =====
    o4 = VO_OFF[4]
    L4 = o4 + vo[4][1] + GAP[4]
    if want('s4'):
        shim = os.path.join(REC, '쉼_화면녹화_소리뺌.mp4')
        t_chat = o4 + wt(4, 6) - 0.15
        title = text_png('k4t', [("이번에는,", W // 2, 440, 70, (205, 200, 215, 255), 'mm', False), ("직접 짓기로 했어요.", W // 2, 560, 104, (255, 255, 255, 255), 'mm', True)])

        def bubbles(name, items, note=True):
            im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            d = ImageDraw.Draw(im)
            if note:
                d.text((150, 78), "실제 대화를 다시 옮긴 화면", font=font(28, False), fill=(190, 185, 205, 255))
            y = 170
            f = font(46)
            for who, t in items:
                tw = d.textlength(t, font=f)
                bw_, bh_ = tw + 72, 98
                if who == 'me':
                    x = 1120 - bw_
                    d.rounded_rectangle((x, y, x + bw_, y + bh_), radius=34, fill=(124, 92, 232, 255))
                    d.text((x + 36, y + bh_ / 2), t, font=f, fill=(255, 255, 255, 255), anchor='lm')
                else:
                    x = 150
                    d.rounded_rectangle((x, y, x + bw_, y + bh_), radius=34, fill=(242, 240, 247, 255))
                    d.text((x + 36, y + bh_ / 2), t, font=f, fill=(40, 38, 50, 255), anchor='lm')
                y += bh_ + 26
            p = os.path.join(TMP, name + '.png'); im.save(p); return p
        seq = [('me', "이런 거 어때? 만들 수 있어?"), ('me', "소리가 춥다"), ('ai', "높은 소리를 줄였어요"), ('me', "칙칙하고 다크해"), ('ai', "밝게 바꿨어요"), ('me', "진짜 피아노 곡을 넣자")]
        times = [o4 + wt(4, 8) - 0.1, o4 + wt(4, 25) - 0.1, o4 + wt(4, 27) + 0.5, o4 + wt(4, 31) - 0.1, o4 + wt(4, 33) + 0.4, o4 + wt(4, 37) - 0.1]
        lay = [dict(src=title, kind='img', at=0.2, until=t_chat, fadeout=0.4),
               dict(src=shim, kind='vid', ss=20.0, h=820, x=1330, y=96, at=t_chat, fade=0.5),
               dict(src=bubbles('bb0', []), kind='img', at=t_chat, until=times[0], fade=0.3)]
        for i in range(len(seq)):
            lay.append(dict(src=bubbles(f'bb{i + 1}', seq[:i + 1]), kind='img', at=times[i], until=(times[i + 1] if i + 1 < len(seq) else None), fade=0.0))
        badge = text_png('k4b', [("코드 0줄 · 말로만", 150, 880, 40, (255, 214, 102, 255), 'la', True)])
        lay.append(dict(src=badge, kind='img', at=o4 + wt(4, 14), fade=0.4))
        beat(os.path.join(TMP, 's4.mp4'), L4, lay)
    secs[4] = L4

    # ===== 5. 쉼 =====
    o5 = VO_OFF[5]
    L5 = o5 + vo[5][1] + GAP[5]
    if want('s5'):
        shim = os.path.join(REC, '쉼_화면녹화_소리뺌.mp4')
        k5 = text_png('k5', [("쉼", 190, 360, 150, (255, 255, 255, 255), 'la', True), ("듣는 갤러리", 196, 550, 56, (255, 255, 255, 255), 'la', True),
                             ("2026년 10월", 198, 640, 34, (205, 200, 215, 255), 'la', False), ("AI에게 말로 시켜서 지었어요", 198, 692, 34, (205, 200, 215, 255), 'la', False)])
        k5b = text_png('k5b', [("이번에는", 1330, 400, 40, (205, 200, 215, 255), 'la', False), ("원본이 내 손에", 1330, 455, 66, (255, 214, 102, 255), 'la', True),
                               ("코드 한 줄 없이 만든 앱 29개", 1332, 590, 34, (255, 255, 255, 255), 'la', False), ("(2026년 8월 기준)", 1332, 640, 28, (205, 200, 215, 255), 'la', False)])
        beat(os.path.join(TMP, 's5.mp4'), L5, [dict(src=shim, kind='vid', ss=1.0, h=880, x=(W - 526) // 2, y=40, at=0.1),
                                              dict(src=k5, kind='img', at=0.4), dict(src=k5b, kind='img', at=o5 + wt(5, 10) - 0.1)])
    secs[5] = L5

    # ===== 6. 마무리 =====
    o6 = VO_OFF[6]
    t_sw = o6 + wt(6, 15) + 0.15          # 첫마디는
    t_type = o6 + wt(6, 19) - 1.05        # 장면4 시작(글자는 1초 뒤부터 찍힘)
    L6 = t_type + 6.5
    if want('s6'):
        pr = os.path.join(REC, '첫지시문10개_화면녹화.mp4')
        k6 = text_png('k6', [("첫 지시문 10개", 170, 380, 96, (255, 255, 255, 255), 'la', True), ("처음 AI 앞에 앉은 사람을 위한 문장 · 무료", 176, 520, 34, (205, 200, 215, 255), 'la', False),
                             ("luca-darakbang.netlify.app/prompts", 176, 600, 34, (255, 214, 102, 255), 'la', True)])
        parts = []
        p = os.path.join(TMP, 's6a.mp4'); parts.append(p)
        beat(p, t_sw, [dict(src=pr, kind='vid', ss=28.5, crop=(994, 1700, 0, 0), h=880, x=1200, y=40, at=0.1), dict(src=k6, kind='img', at=0.4)])
        p = os.path.join(TMP, 's6b.mp4'); parts.append(p)
        beat(p, t_type - t_sw, [dict(src=blink, kind='vid', full=True, fade=0.4)])
        p = os.path.join(TMP, 's6c.mp4'); parts.append(p)
        beat(p, 6.5, [dict(src=os.path.join(A, '장면4_마무리_글자찍힘.mp4'), kind='vid', full=True, fade=0)])
        concat(parts, os.path.join(TMP, 's6.mp4'))
    secs[6] = L6

    # ===== 이어 붙이기 + 자막 + 소리 =====
    if want('final'):
        body = os.path.join(TMP, 'body.mp4')
        concat([os.path.join(TMP, f's{n}.mp4') for n in range(1, 7)], body)
        for n in range(1, 7):
            secs[n] = dur(os.path.join(TMP, f's{n}.mp4'))   # 실제 길이로 맞춤
        start = {}; t = 0.0
        for n in range(1, 7):
            start[n] = t; t += secs[n]
        total = t
        subs = []
        for n in range(1, 7):
            S = SUBS[n]
            for i, (a, b, txt) in enumerate(S):
                st = start[n] + VO_OFF[n] + wt(n, a) - 0.05
                en = start[n] + VO_OFF[n] + wt(n, b, True) + 0.35
                if i + 1 < len(S):
                    en = min(en, start[n] + VO_OFF[n] + wt(n, S[i + 1][0]) - 0.08)
                subs.append((max(st, 0), en, sub_png(f'sub{n}_{i}', txt), txt))
        bgm = os.path.join(SRC, '음악', 'B_Warm Felt Memories.mp3')
        cmd = ['ffmpeg', '-v', 'error', '-y', '-i', body]
        for s in subs:
            cmd += ['-loop', '1', '-t', f'{total:.3f}', '-i', s[2]]
        k = 1 + len(subs)
        for n in range(1, 7):
            cmd += ['-i', vo[n][0]]
        cmd += ['-i', bgm]
        fc = []; last = '0:v'
        for i, s in enumerate(subs, 1):
            fc.append(f"[{last}][{i}:v]overlay=0:0:enable='between(t,{s[0]:.2f},{s[1]:.2f})'[v{i}]"); last = f'v{i}'
        fc.append(f"[{last}]fade=t=in:st=0:d=0.6,fade=t=out:st={total - 1.2:.2f}:d=1.2[vout]")
        for j, n in enumerate(range(1, 7)):
            ms = int((start[n] + VO_OFF[n]) * 1000)
            fc.append(f"[{k + j}:a]adelay={ms}|{ms}[a{n}]")
        fc.append(f"[{k + 6}:a]volume=0.20,afade=t=in:d=1.5,afade=t=out:st={total - 3:.2f}:d=3,atrim=0:{total:.2f}[m]")
        fc.append(''.join(f'[a{n}]' for n in range(1, 7)) + f"[m]amix=inputs=7:duration=longest:normalize=0,alimiter=limit=0.95,atrim=0:{total:.2f}[aout]")
        fs = os.path.join(TMP, 'final_fc.txt')
        io.open(fs, 'w', encoding='utf-8').write(';\n'.join(fc))
        out = os.path.join(ROOT, '불씨_트랙2_가편집_v1.mp4')
        cmd += ['-/filter_complex', fs, '-map', '[vout]', '-map', '[aout]', '-t', f'{total:.3f}', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19',
                '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out]
        run(cmd)
        info = {'total': round(total, 2), 'sections': {n: [round(start[n], 2), round(secs[n], 2)] for n in secs}, 'subs': [(round(a, 2), round(b, 2), t) for a, b, _, t in subs]}
        json.dump(info, io.open(os.path.join(SRC, '편집', '시간표.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print('TOTAL', round(total, 2), out.encode('ascii', 'ignore').decode())


if __name__ == '__main__':
    main()
