// PPT 해석. .pptx 는 여러 XML 파일을 묶은 zip 이라서, 풀어서 글자·노트·그림을 꺼낸다.
// 브라우저와 Node 양쪽에서 돌도록 JSZip 을 인자로 받고, XML 은 정규식으로 읽는다.

export const MAX_SLIDES = 60;

const ERR_UNREADABLE = 'pptx 파일을 읽을 수 없어요';
const ERR_TOO_MANY = `${MAX_SLIDES}장까지 검사할 수 있어요`;

// 모델이 읽을 수 있는 그림 형식만 넘긴다.
const IMAGE_MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };

// 노트에서 본문이 아닌 자리 표시
const NOTE_SKIP_PLACEHOLDERS = new Set(['sldNum', 'sldImg', 'hdr', 'ftr', 'dt']);

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

// XML 조각에서 문단별 글자를 꺼낸다. 한 문단 안의 조각은 이어 붙이고 문단은 줄바꿈으로 나눈다.
function paragraphsOf(xml) {
  const lines = [];
  for (const p of xml.matchAll(/<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g)) {
    let line = '';
    for (const part of p[1].matchAll(/<a:t\b[^>]*>([\s\S]*?)<\/a:t>|<a:br\b[^>]*\/?>/g)) {
      line += part[1] !== undefined ? decodeEntities(part[1]) : '\n';
    }
    line = line.replace(/[ \t]+\n/g, '\n').trim();
    if (line) lines.push(line);
  }
  return lines.join('\n');
}

function notesTextOf(xml) {
  const parts = [];
  for (const sp of xml.matchAll(/<p:sp\b[^>]*>([\s\S]*?)<\/p:sp>/g)) {
    const ph = sp[1].match(/<p:ph\b[^>]*\btype="([^"]+)"/);
    if (ph && NOTE_SKIP_PLACEHOLDERS.has(ph[1])) continue;
    const text = paragraphsOf(sp[1]);
    if (text) parts.push(text);
  }
  return parts.join('\n');
}

function relsOf(xml) {
  const rels = [];
  for (const m of xml.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const attr = (name) => (m[1].match(new RegExp(`\\b${name}="([^"]*)"`)) ?? [])[1];
    const id = attr('Id');
    const type = attr('Type');
    const target = attr('Target');
    if (id && type && target && attr('TargetMode') !== 'External') {
      rels.push({ id, type, target: decodeEntities(target) });
    }
  }
  return rels;
}

// 'ppt/slides' 기준의 '../media/a.png' 를 'ppt/media/a.png' 로 푼다.
function resolvePath(baseDir, target) {
  if (target.startsWith('/')) return target.slice(1);
  const parts = baseDir.split('/');
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.' && seg !== '') parts.push(seg);
  }
  return parts.join('/');
}

async function readText(zip, path) {
  const f = zip.file(path);
  return f ? f.async('string') : null;
}

// 발표 순서대로 슬라이드 파일 경로를 돌려준다.
async function slidePathsInOrder(zip) {
  const all = Object.keys(zip.files).filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p));
  const byNumber = [...all].sort((a, b) => Number(a.match(/(\d+)\.xml$/)[1]) - Number(b.match(/(\d+)\.xml$/)[1]));

  const presentation = await readText(zip, 'ppt/presentation.xml');
  const presRels = await readText(zip, 'ppt/_rels/presentation.xml.rels');
  if (!presentation || !presRels) return byNumber;

  const targetById = new Map(relsOf(presRels).map((r) => [r.id, resolvePath('ppt', r.target)]));
  const ordered = [];
  for (const m of presentation.matchAll(/<p:sldId\b[^>]*\br:id="([^"]+)"/g)) {
    const path = targetById.get(m[1]);
    if (path && all.includes(path) && !ordered.includes(path)) ordered.push(path);
  }
  // 순서 정보가 어긋나 있으면 파일 번호 순서로 돌아간다.
  return ordered.length === all.length ? ordered : byNumber;
}

/**
 * @param {ArrayBuffer | Uint8Array} arrayBuffer .pptx 파일 내용
 * @param {object} JSZip JSZip 생성자(브라우저에서는 window.JSZip)
 * @returns {Promise<Array<{ slide: number, text: string, notes: string, images: Array<{ name: string, bytes: Uint8Array, mime: string }> }>>}
 */
export async function parsePptx(arrayBuffer, JSZip) {
  let zip;
  try {
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch {
    throw new Error(ERR_UNREADABLE);
  }

  const paths = await slidePathsInOrder(zip);
  if (paths.length === 0) throw new Error(ERR_UNREADABLE);
  if (paths.length > MAX_SLIDES) throw new Error(ERR_TOO_MANY);

  const slides = [];
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    const xml = (await readText(zip, path)) ?? '';
    const fileName = path.split('/').pop();
    const relsXml = await readText(zip, `ppt/slides/_rels/${fileName}.rels`);
    const rels = relsXml ? relsOf(relsXml) : [];

    let notes = '';
    const noteRel = rels.find((r) => r.type.endsWith('/notesSlide'));
    if (noteRel) {
      const notesXml = await readText(zip, resolvePath('ppt/slides', noteRel.target));
      if (notesXml) notes = notesTextOf(notesXml);
    }

    const images = [];
    const seen = new Set();
    for (const r of rels.filter((x) => x.type.endsWith('/image'))) {
      const imgPath = resolvePath('ppt/slides', r.target);
      if (seen.has(imgPath)) continue;
      seen.add(imgPath);
      const name = imgPath.split('/').pop();
      const mime = IMAGE_MIME[name.split('.').pop().toLowerCase()];
      const file = zip.file(imgPath);
      if (!mime || !file) continue;
      images.push({ name, bytes: await file.async('uint8array'), mime });
    }

    slides.push({ slide: i + 1, text: paragraphsOf(xml), notes, images });
  }
  return slides;
}
