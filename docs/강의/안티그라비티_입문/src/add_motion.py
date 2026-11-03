"""build_deck.js가 만든 PPT의 슬라이드 XML에 등장 효과와 화면 전환을 넣는다.

이름이 "A3|카드" 처럼 시작하는 도형은 3번째 차례에 페이드업으로 등장한다.
차례는 자동으로 흘러서 발표자는 슬라이드 넘길 때만 클릭하면 된다.
"""
import os
import re
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path

from lxml import etree

P = "http://schemas.openxmlformats.org/presentationml/2006/main"
A = "http://schemas.openxmlformats.org/drawingml/2006/main"
MC = "http://schemas.openxmlformats.org/markup-compatibility/2006"
P14 = "http://schemas.microsoft.com/office/powerpoint/2010/main"
P159 = "http://schemas.microsoft.com/office/powerpoint/2015/09/main"
STAGGER_MS = 170
DURATION_MS = 480


class Ids:
    def __init__(self):
        self.n = 2

    def next(self):
        self.n += 1
        return self.n


def effect_xml(ids, spid, delay, first, is_sp):
    grp = ' grpId="0"' if is_sp else ""
    node = "afterEffect" if first else "withEffect"
    tgt = f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl>'
    return f"""<p:par><p:cTn id="{ids.next()}" presetID="42" presetClass="entr" presetSubtype="0" fill="hold"{grp} nodeType="{node}">
<p:stCondLst><p:cond delay="{delay}"/></p:stCondLst><p:childTnLst>
<p:set><p:cBhvr><p:cTn id="{ids.next()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>{tgt}<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>
<p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="{ids.next()}" dur="{DURATION_MS}"/>{tgt}</p:cBhvr></p:animEffect>
<p:anim calcmode="lin" valueType="num"><p:cBhvr additive="base"><p:cTn id="{ids.next()}" dur="{DURATION_MS}" fill="hold"/>{tgt}<p:attrNameLst><p:attrName>ppt_x</p:attrName></p:attrNameLst></p:cBhvr><p:tavLst><p:tav tm="0"><p:val><p:strVal val="#ppt_x"/></p:val></p:tav><p:tav tm="100000"><p:val><p:strVal val="#ppt_x"/></p:val></p:tav></p:tavLst></p:anim>
<p:anim calcmode="lin" valueType="num"><p:cBhvr additive="base"><p:cTn id="{ids.next()}" dur="{DURATION_MS}" fill="hold"/>{tgt}<p:attrNameLst><p:attrName>ppt_y</p:attrName></p:attrNameLst></p:cBhvr><p:tavLst><p:tav tm="0"><p:val><p:strVal val="#ppt_y+0.03"/></p:val></p:tav><p:tav tm="100000"><p:val><p:strVal val="#ppt_y"/></p:val></p:tav></p:tavLst></p:anim>
</p:childTnLst></p:cTn></p:par>"""


def timing_xml(items):
    ids = Ids()
    inner_a, inner_b = ids.next(), ids.next()
    effects = "".join(
        effect_xml(ids, spid, step * STAGGER_MS, i == 0, is_sp)
        for i, (spid, step, is_sp) in enumerate(items)
    )
    builds = "".join(
        f'<p:bldP spid="{spid}" grpId="0" animBg="1"/>' for spid, _, is_sp in items if is_sp
    )
    bld = f"<p:bldLst>{builds}</p:bldLst>" if builds else ""
    return f"""<p:timing xmlns:p="{P}"><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>
<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>
<p:par><p:cTn id="{inner_a}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst>
<p:par><p:cTn id="{inner_b}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>{effects}</p:childTnLst></p:cTn></p:par>
</p:childTnLst></p:cTn></p:par>
</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>
</p:childTnLst></p:cTn></p:par></p:tnLst>{bld}</p:timing>"""


TRANSITION = f"""<mc:AlternateContent xmlns:mc="{MC}" xmlns:p="{P}" xmlns:p14="{P14}" xmlns:p159="{P159}"><mc:Choice Requires="p159"><p:transition spd="slow" p14:dur="900"><p159:morph option="byObject"/></p:transition></mc:Choice><mc:Fallback><p:transition spd="med"><p:fade/></p:transition></mc:Fallback></mc:AlternateContent>"""


def process(xml_bytes):
    root = etree.fromstring(xml_bytes)
    # 영상 도형은 라이브러리가 번호를 따로 매겨서 다른 도형과 겹칠 수 있다. 겹치면 효과가 엉뚱한 도형에 걸린다.
    seen = set()
    all_cnv = list(root.iter(f"{{{P}}}cNvPr"))
    next_id = max(int(c.get("id")) for c in all_cnv) + 1
    for cnv in all_cnv:
        if cnv.get("id") in seen:
            cnv.set("id", str(next_id))
            next_id += 1
        seen.add(cnv.get("id"))
    items = []
    for cnv in root.iter(f"{{{P}}}cNvPr"):
        name = cnv.get("name", "")
        m = re.match(r"A(\d+)\|(.*)", name)
        if not m:
            continue
        cnv.set("name", m.group(2))
        owner = cnv.getparent().getparent()
        items.append((cnv.get("id"), int(m.group(1)), etree.QName(owner).localname == "sp"))
    items.sort(key=lambda it: it[1])

    anchor = root.find(f"{{{P}}}clrMapOvr")
    idx = list(root).index(anchor) + 1
    root.insert(idx, etree.fromstring(TRANSITION))
    if items:
        root.insert(idx + 1, etree.fromstring(timing_xml(items)))
    etree.cleanup_namespaces(root, keep_ns_prefixes=["a", "r", "p"])
    return etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True), len(items)


def main(path):
    path = Path(path)
    fd, tmp_name = tempfile.mkstemp(suffix=".pptx", dir=path.parent)
    os.close(fd)
    tmp = Path(tmp_name)
    with zipfile.ZipFile(path) as src, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as dst:
        for info in src.infolist():
            data = src.read(info.filename)
            if re.fullmatch(r"ppt/slides/slide\d+\.xml", info.filename):
                data, count = process(data)
                print(info.filename, "등장 효과", count)
            dst.writestr(info, data)
    shutil.move(tmp, path)


if __name__ == "__main__":
    main(sys.argv[1])
