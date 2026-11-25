// landing/check/check-core.js
// 오탈자 검사기 — 순수 계산 모듈. 브라우저(전역 CheckCore)와 Node(module.exports) 공용.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CheckCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // pdf.js 글자 조각들을 한 쪽 글자로 잇는다. spans: 조각 i 가 text 의 [start,end) 범위
  function joinPageLines(items) {
    var text = '', spans = [];
    for (var i = 0; i < items.length; i++) {
      var s = items[i].str || '';
      spans.push({ item: i, start: text.length, end: text.length + s.length });
      text += s;
      if (items[i].hasEOL && !/\n\n$/.test(text)) text += '\n';
    }
    return { text: text, spans: spans };
  }

  function header(page) { return '[[쪽 ' + page + ']]\n'; }

  // 쪽들을 maxChars 이하 묶음으로. 긴 쪽은 줄 단위(줄도 길면 강제로)로 쪼갠다
  function chunkPages(pages, maxChars) {
    maxChars = maxChars || 3000;
    var units = [];
    pages.forEach(function (p) {
      var h = header(p.page), room = maxChars - h.length;
      if (p.text.length <= room) { units.push({ page: p.page, text: h + p.text }); return; }
      var cur = '';
      p.text.split('\n').forEach(function (line) {
        while (line.length > room) { // 한 줄이 너무 길면 잘라서
          if (cur) { units.push({ page: p.page, text: h + cur }); cur = ''; }
          units.push({ page: p.page, text: h + line.slice(0, room) });
          line = line.slice(room);
        }
        var next = cur ? cur + '\n' + line : line;
        if (next.length > room) { units.push({ page: p.page, text: h + cur }); cur = line; }
        else cur = next;
      });
      if (cur) units.push({ page: p.page, text: h + cur });
    });
    var chunks = [], c = null;
    units.forEach(function (u) {
      if (c && c.text.length + 1 + u.text.length <= maxChars) {
        c.text += '\n' + u.text;
        if (c.pages[c.pages.length - 1] !== u.page) c.pages.push(u.page);
      } else {
        c = { pages: [u.page], text: u.text };
        chunks.push(c);
      }
    });
    return chunks;
  }

  function noSpace(s) { return String(s || '').replace(/\s+/g, ''); }

  // 인쇄 줄바꿈 자리를 띄어쓰기 오류로 잘못 잡은 지적을 버린다
  function dropLineBreakArtifacts(findings, text) {
    var flat = text.replace(/\n/g, '');
    return findings.filter(function (f) {
      var spacingOnly = noSpace(f.wrong) === noSpace(f.right);
      var acrossBreak = text.indexOf(f.wrong) === -1 && flat.indexOf(f.wrong) !== -1;
      return !(spacingOnly && acrossBreak);
    });
  }

  // text 안에서 wrong 을 찾는다. 줄바꿈은 건너뛰고 비교. 결과는 text 기준 [start,end)
  function locate(text, wrong, from) {
    from = from || 0;
    var needle = String(wrong || '').replace(/\n/g, '');
    if (!needle) return null;
    var flat = '', idx = [];
    for (var i = 0; i < text.length; i++) {
      if (text[i] === '\n') continue;
      flat += text[i]; idx.push(i);
    }
    var k0 = 0;
    while (k0 < idx.length && idx[k0] < from) k0++;
    var k = flat.indexOf(needle, k0);
    if (k === -1) return null;
    return { start: idx[k], end: idx[k + needle.length - 1] + 1 };
  }

  // [start,end) 가 걸친 조각마다 조각 안 가로 위치(조각 width 기준 비율)
  function rectsFor(spans, items, start, end) {
    var out = [];
    spans.forEach(function (sp) {
      var a = Math.max(start, sp.start), b = Math.min(end, sp.end), len = sp.end - sp.start;
      if (b <= a || len <= 0) return;
      var w = items[sp.item].width || 0;
      out.push({ item: sp.item, x0: w * (a - sp.start) / len, x1: w * (b - sp.start) / len });
    });
    return out;
  }

  // 고칠 자리들을 뒤에서부터 바꾼다
  function applyFixes(text, marks) {
    var sorted = marks.slice().sort(function (x, y) { return y.start - x.start; });
    sorted.forEach(function (m) { text = text.slice(0, m.start) + m.fix + text.slice(m.end); });
    return text;
  }

  function bare(s) { return String(s || '').replace(/[^0-9A-Za-z가-힣ㄱ-ㆎ]/g, ''); }

  // 오른쪽 끝까지 찬 줄은 문단 안 줄바꿈 → 이어 붙이고, 짧은 줄은 문단 끝(\n).
  // 이어 붙일 때: 줄 끝 어절 + 다음 줄 첫 어절이 joins(줄에서 잘린 단어)에 있으면 glue, 아니면 한 칸 띄움
  function toPlainText(lines, maxRight, joins, glue) {
    var set = {};
    (joins || []).forEach(function (w) { var b = bare(w); if (b) set[b] = true; });
    glue = glue || '';
    var out = '';
    lines.forEach(function (l, i) {
      out += l.text;
      if (i >= lines.length - 1) return;
      if (l.right < maxRight * 0.95) { out += '\n'; return; }
      var tail = l.text.split(/\s+/).pop(), head = lines[i + 1].text.split(/\s+/)[0];
      out += set[bare(tail + head)] && /\S$/.test(l.text) ? glue : ' ';
    });
    return out;
  }

  function formatReport(findings) {
    var rows = ['쪽\t틀린 부분\t고친 부분\t이유'];
    findings.forEach(function (f) {
      rows.push([f.page, f.wrong, f.unsure ? '(확인 필요)' : f.right, f.reason || ''].join('\t'));
    });
    return rows.join('\n');
  }

  return {
    joinPageLines: joinPageLines, chunkPages: chunkPages, dropLineBreakArtifacts: dropLineBreakArtifacts,
    locate: locate, rectsFor: rectsFor, applyFixes: applyFixes, toPlainText: toPlainText, formatReport: formatReport,
  };
}));
