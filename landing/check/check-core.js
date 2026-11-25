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

  function squash(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  // 인쇄 줄바꿈 자리를 띄어쓰기 오류로 잘못 잡은 지적을 버린다.
  // 띄어쓰기만 다른 지적이고, 원문 구절의 줄바꿈 자리만 띄우거나 붙이면 고친 말과 같아질 때만 버린다
  // (줄바꿈 옆이라도 다른 자리 띄어쓰기를 고치는 진짜 오류는 남김)
  function dropLineBreakArtifacts(findings, text) {
    return findings.filter(function (f) {
      if (noSpace(f.wrong) !== noSpace(f.right)) return true;
      var pos = locate(text, f.wrong);
      if (!pos) return true;
      var seg = text.slice(pos.start, pos.end);
      if (seg.indexOf('\n') === -1) return true;
      var right = squash(f.right);
      return !(squash(seg.replace(/\n/g, ' ')) === right || squash(seg.replace(/\n/g, '')) === right);
    });
  }

  function reEsc(c) { return c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // text 안에서 wrong 을 찾는다. 글자 사이 줄바꿈은 건너뛰고, wrong 의 띄어쓰기는 원문의 띄어쓰기나 줄바꿈과 맞춘다.
  // 결과는 text 기준 [start,end)
  function locate(text, wrong, from) {
    var needle = squash(String(wrong || '').replace(/\n/g, ''));
    if (!needle) return null;
    var parts = needle.split(' ').map(function (w) { return Array.from(w).map(reEsc).join('\\n?'); });
    var re = new RegExp(parts.join('(?:\\n?[ \\t]+\\n?|\\n)'), 'g');
    re.lastIndex = from || 0;
    var m = re.exec(text);
    return m ? { start: m.index, end: m.index + m[0].length } : null;
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

  // items 를 동시에 limit 개까지 fn 으로 돌린다. fn 이 {stop:true} 를 돌려주면(또는 실패하면 무시하고 계속)
  // 새로 시작하지 않는다. 끝나면 시작하지 못한 items 를 원래 순서대로 돌려준다
  function runPool(items, limit, fn) {
    return new Promise(function (resolve) {
      var next = 0, active = 0, stopped = false;
      function finish() { if (active === 0) resolve(items.slice(next)); }
      function launch() {
        while (!stopped && active < limit && next < items.length) start(next++);
      }
      function start(i) {
        active++;
        Promise.resolve().then(function () { return fn(items[i], i); }).then(function (r) {
          if (r && r.stop) stopped = true;
        }, function () {}).then(function () {
          active--;
          if (stopped || next >= items.length) finish(); else launch();
        });
      }
      if (!items.length) resolve([]); else launch();
    });
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
    runPool: runPool, locate: locate, rectsFor: rectsFor, applyFixes: applyFixes, toPlainText: toPlainText, formatReport: formatReport,
  };
}));
