// PDF 해석. 쪽마다 글자를 꺼내 PPT 해석(pptx.js)과 같은 모양으로 돌려준다.
// 글자가 거의 없는 쪽(스캔했거나 그림으로 내보낸 쪽)은 그림으로 만들어 함께 담는다.
// 그래야 그림 속 글자를 읽는 기존 흐름을 그대로 쓸 수 있다.
// 브라우저와 Node 양쪽에서 돌도록 pdf.js 와 그림 그리는 함수를 인자로 받는다.

import { IMAGE_TEXT_THRESHOLD } from './run.js';

export const MAX_PAGES = 60;

const ERR_UNREADABLE = 'pdf 파일을 읽을 수 없어요';
const ERR_TOO_MANY = `${MAX_PAGES}쪽까지 검사할 수 있어요`;

// 한 쪽의 글자 조각을 줄 단위로 잇는다.
function textOf(content) {
  let out = '';
  for (const item of content.items ?? []) {
    if (typeof item.str !== 'string') continue;
    out += item.str;
    if (item.hasEOL) out += '\n';
  }
  return out
    .split('\n')
    .map((line) => line.replace(/[ \t ]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

/**
 * @param {ArrayBuffer | Uint8Array} data .pdf 파일 내용
 * @param {object} pdfjsLib pdf.js 모듈
 * @param {{ renderPage?: (page: object, pageNumber: number) => Promise<{ bytes: Uint8Array, mime: string }>, documentOptions?: object }} options
 *   renderPage 는 쪽을 그림으로 만드는 함수. 브라우저에서는 캔버스로 그린다.
 * @returns {Promise<Array<{ slide: number, text: string, notes: string, images: Array<{ name: string, bytes: Uint8Array, mime: string }> }>>}
 */
export async function parsePdf(data, pdfjsLib, options = {}) {
  const { renderPage, documentOptions = {} } = options;

  let doc;
  try {
    // pdf.js 가 넘겨받은 바이트를 가져가 버리므로 사본을 준다.
    const bytes = data instanceof Uint8Array ? data.slice() : new Uint8Array(data.slice(0));
    doc = await pdfjsLib.getDocument({ data: bytes, ...documentOptions }).promise;
  } catch {
    throw new Error(ERR_UNREADABLE);
  }

  try {
    if (!doc.numPages) throw new Error(ERR_UNREADABLE);
    if (doc.numPages > MAX_PAGES) throw new Error(ERR_TOO_MANY);

    const pages = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      let text = '';
      try {
        text = textOf(await page.getTextContent());
      } catch {
        text = '';
      }

      const images = [];
      if (renderPage && text.trim().length < IMAGE_TEXT_THRESHOLD) {
        try {
          const img = await renderPage(page, n);
          if (img?.bytes?.length) images.push({ name: `page-${n}.jpg`, bytes: img.bytes, mime: img.mime || 'image/jpeg' });
        } catch {
          // 그림으로 만들지 못해도 글자는 검사한다.
        }
      }

      pages.push({ slide: n, text, notes: '', images });
      page.cleanup?.();
    }
    return pages;
  } finally {
    try {
      await doc.destroy?.();
    } catch {
      // 정리 실패는 무시한다.
    }
  }
}
