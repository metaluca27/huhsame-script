// 결과 요약과 Markdown 내보내기. 원본 PPT 는 고치지 않고, 수정 목록만 가져가게 한다.

export const VERDICT_LABEL = { same: '그대로', changed: '바뀜', unverified: '확인 못 함' };

export function summarize(results) {
  const out = { same: 0, changed: 0, unverified: 0, total: 0 };
  for (const r of results ?? []) {
    if (r && Object.hasOwn(VERDICT_LABEL, r.verdict)) {
      out[r.verdict] += 1;
      out.total += 1;
    }
  }
  return out;
}

export function formatElapsed(ms) {
  const sec = Math.max(0, Math.round((ms ?? 0) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}초`;
  return s === 0 ? `${m}분` : `${m}분 ${s}초`;
}

// 한 줄로 만들고, 줄 맨 앞에서 Markdown 구조로 읽힐 기호를 무력화한다.
function oneLine(text) {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\|/g, '\\|')
    .replace(/^([#>\-+*]|\d+\.)/, '\\$1');
}

/**
 * @param {object[]} claims 검사 대상 내용
 * @param {object[]} results 판정 결과
 * @param {{ unit?: string, fileName?: string, domains?: object, elapsedMs?: number, checkedAt?: string, skipped?: number, stopped?: boolean }} meta
 */
export function toMarkdown(claims, results, meta = {}) {
  const byId = new Map((results ?? []).filter(Boolean).map((r) => [r.claimId, r]));
  const sum = summarize(results);
  const lines = ['# 강의자료 유통기한 검사 결과', ''];

  if (meta.fileName) lines.push(`- 파일: ${oneLine(meta.fileName)}`);
  if (meta.checkedAt) lines.push(`- 검사일: ${meta.checkedAt}`);
  if (meta.elapsedMs !== undefined) lines.push(`- 걸린 시간: ${formatElapsed(meta.elapsedMs)}`);
  const d = meta.domains;
  if (d?.tier1?.length) lines.push(`- 공식 사이트(1등급): ${d.tier1.join(', ')}`);
  if (d?.tier2?.length) lines.push(`- 함께 지정한 공식 채널(2등급): ${d.tier2.join(', ')}`);
  lines.push(`- 판정: 바뀜 ${sum.changed} · 그대로 ${sum.same} · 확인 못 함 ${sum.unverified}`);
  if (meta.stopped) lines.push('- 검사를 중간에 중단했어요. 아래에는 그때까지의 결과만 있어요.');
  if (meta.skipped) lines.push(`- 내용이 많아 ${meta.skipped}개는 검사하지 않았어요.`);
  lines.push('', '판정 근거는 사용자가 확인한 공식 사이트의 본문에 실제로 있는 문장만 썼어요. 그 밖의 출처는 참고로만 적었어요.', '');

  const sorted = [...(claims ?? [])].sort((a, b) => (a.slide ?? 0) - (b.slide ?? 0));
  let currentSlide = null;
  for (const c of sorted) {
    if (c.slide !== currentSlide) {
      currentSlide = c.slide;
      lines.push(meta.unit === '쪽' ? `## ${c.slide}쪽` : `## 슬라이드 ${c.slide}`, '');
    }
    const r = byId.get(c.id);
    const label = r ? VERDICT_LABEL[r.verdict] ?? '확인 못 함' : '검사하지 않음';
    lines.push(`- **${label}** · ${oneLine(c.text)}`);
    if (!r) continue;

    for (const e of r.evidence ?? []) {
      lines.push(`  - 근거(${e.tier}등급, ${e.hostname}): "${oneLine(e.quote)}"`);
      lines.push(`    - 출처: ${e.url}`);
    }
    if (r.verdict === 'changed' && r.suggestion) lines.push(`  - 수정안: ${oneLine(r.suggestion)}`);
    if (r.verdict === 'unverified' && r.humanTask) lines.push(`  - 할 일: ${oneLine(r.humanTask)}`);
    if (r.verdict === 'unverified') for (const p of r.officialPages ?? []) lines.push(`  - 직접 열어 볼 공식 문서: ${p.url}`);
    for (const ref of r.references ?? []) {
      lines.push(`  - 참고(판정 근거 아님): ${ref.hostname}${ref.title ? ` · ${oneLine(ref.title)}` : ''} ${ref.url}`);
    }
  }

  return lines.join('\n').trimEnd() + '\n';
}
