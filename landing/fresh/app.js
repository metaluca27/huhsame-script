// 화면 상태와 이벤트. 올리기 → 공식 사이트 확인 → 검사 중 → 결과.
// 페이지나 모델에서 온 글은 textContent 로만 넣는다(innerHTML 을 쓰지 않는다).

import { API_BASE, MAX_FILE_BYTES } from './config.js';
import { parsePptx } from './pptx.js';
import { parsePdf } from './pdf.js';
import { runCheck, pickImage } from './run.js';
import { summarize, toMarkdown, VERDICT_LABEL, formatElapsed } from './report.js';

const $ = (id) => document.getElementById(id);
const DOMAIN_RE = /^(?=.{4,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
const ORIGIN_LABEL = { text: '슬라이드 글자', notes: '발표 노트', image: '슬라이드 그림' };
const ORIGIN_LABEL_PDF = { text: '본문 글자', notes: '메모', image: '쪽 그림' };
const VERDICT_ORDER = ['changed', 'unverified', 'same'];

const state = { fileName: '', kind: 'pptx', slides: [], domains: null, run: null, controller: null, filter: 'all' };

// ---------- 작은 도구 ----------

// PPT 는 "슬라이드 3장", PDF 는 "3쪽" 이라고 부른다.
const isPdf = () => state.kind === 'pdf';
const unitWord = () => (isPdf() ? '쪽' : '슬라이드');
const countLabel = (n) => (isPdf() ? `${n}쪽` : `슬라이드 ${n}장`);
const itemLabel = (n) => (isPdf() ? `${n}쪽` : `슬라이드 ${n}`);
const originLabel = (origin) => (isPdf() ? ORIGIN_LABEL_PDF : ORIGIN_LABEL)[origin] ?? '';

// pdf.js 는 PDF 를 올렸을 때만 불러온다.
let pdfjsPromise;
function loadPdfjs() {
  pdfjsPromise ??= import('./vendor/pdfjs/pdf.min.mjs').then((lib) => {
    lib.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
    return lib;
  });
  return pdfjsPromise;
}

// PDF 한 쪽을 그림으로 만든다. 글자가 없는 쪽(스캔한 쪽)을 모델이 읽을 수 있게 한다.
async function renderPdfPage(page) {
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(2.5, MAX_IMAGE_SIDE / Math.max(base.width, base.height));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  return { bytes: new Uint8Array(await blob.arrayBuffer()), mime: 'image/jpeg' };
}

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c) node.append(c);
  return node;
}

function show(step) {
  for (const id of ['step-upload', 'step-sites', 'step-run', 'step-result']) $(id).hidden = id !== step;
  $(step).scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setStatus(id, message, isError = false) {
  const node = $(id);
  node.textContent = message;
  node.classList.toggle('error', isError);
}

// 워커 호출. 잠깐의 혼잡(429, 5xx)은 한 번 기다렸다 다시 보낸다.
async function callApi(path, body, signal) {
  if (!API_BASE) throw new Error('워커 주소가 설정되지 않았어요.');
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(API_BASE + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal });
    if (res.ok) return res.json();
    if (attempt === 0 && (res.status === 429 || res.status >= 500)) {
      await new Promise((r) => setTimeout(r, res.status === 429 ? 5000 : 1500));
      continue;
    }
    throw new Error(`요청 실패 (${res.status})`);
  }
}

function parseDomainInput(value) {
  const items = value.split(/[,\s]+/).map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '')).filter(Boolean);
  return { items: [...new Set(items)], invalid: items.filter((d) => !DOMAIN_RE.test(d)) };
}

// ---------- 1. 올리기 ----------

async function handleFile(file) {
  if (!file) return;
  const kind = /\.pdf$/i.test(file.name) ? 'pdf' : /\.pptx$/i.test(file.name) ? 'pptx' : null;
  if (!kind) return setStatus('upload-status', '.pptx 와 .pdf 파일만 검사할 수 있어요. 한글이나 워드 문서는 PDF로 저장해서 올려 주세요.', true);
  if (file.size > MAX_FILE_BYTES) return setStatus('upload-status', '파일이 너무 커요. 80MB까지 검사할 수 있어요.', true);

  setStatus('upload-status', '파일을 읽고 있어요…');
  let slides;
  try {
    if (kind === 'pdf') {
      const pdfjsLib = await loadPdfjs();
      const base = new URL('./vendor/pdfjs/', import.meta.url).href;
      slides = await parsePdf(await file.arrayBuffer(), pdfjsLib, {
        renderPage: renderPdfPage,
        documentOptions: { cMapUrl: base + 'cmaps/', cMapPacked: true, standardFontDataUrl: base + 'standard_fonts/' },
      });
    } else {
      slides = await parsePptx(await file.arrayBuffer(), window.JSZip);
    }
  } catch (e) {
    return setStatus('upload-status', e?.message || '파일을 읽을 수 없어요', true);
  }
  // 글자가 그림 안에만 있는 자료도 그림을 읽어 검사할 수 있으니, 글자도 그림도 없을 때만 막는다.
  const withContent = slides.filter((s) => s.text.trim() || s.notes.trim() || s.images.length).length;
  if (withContent === 0) return setStatus('upload-status', '자료에서 글자나 그림을 찾지 못했어요.', true);

  state.fileName = file.name;
  state.run = null; // 새 자료는 내용을 새로 뽑는다
  state.kind = kind;
  clearThumbs();
  state.slides = slides;
  setStatus('upload-status', '');
  $('tier1').value = '';
  $('tier2').value = '';
  $('confirm').checked = false;
  updateStart();
  show('step-sites');
  setStatus('sites-status', `${file.name} · ${countLabel(slides.length)}을 읽었어요. 공식 사이트를 제안받는 중이에요…`);

  // 주제를 보고 공식 사이트를 제안받는다. 실패해도 직접 적으면 된다.
  try {
    // 글자가 그림으로만 들어 있는 자료도 있어서, 글자가 적으면 발표 노트도 함께 보낸다.
    const texts = slides.map((s) => s.text).filter((t) => t.trim()).join('\n');
    const notes = slides.map((s) => s.notes).filter((t) => t.trim()).join('\n');
    const sample = (texts.length >= 200 ? texts : `${texts}\n${notes}`).trim().slice(0, 3000);
    // 글자가 거의 없으면(그림으로만 된 자료) 표지 그림을 함께 보내 무엇을 다루는 자료인지 알아내게 한다.
    // 표지에는 제품 이름이 없을 수 있어서 앞쪽 그림을 3장까지 보낸다.
    const imageDataUrls = [];
    if (sample.length < 40) {
      for (const s of slides.filter((x) => pickImage(x)).slice(0, 3)) {
        const url = await slideImageDataUrl(s).catch(() => null);
        if (url) imageDataUrls.push(url);
      }
    }
    const ask = { sample, imageDataUrls };
    let out = await callApi('/api/suggest-sites', ask);
    if (!out.tier1?.length) out = await callApi('/api/suggest-sites', ask); // 빈 제안이면 한 번 더 묻는다
    if (!$('tier1').value) $('tier1').value = (out.tier1 ?? []).join(', ');
    if (!$('tier2').value) $('tier2').value = (out.tier2 ?? []).join(', ');
    if ($('tier1').value.trim()) {
      setStatus('sites-status', `${file.name} · ${countLabel(slides.length)}. AI가 제안한 사이트예요. 맞는지 확인하고 필요하면 고쳐 주세요.`);
    } else {
      setStatus('sites-status', `${file.name} · ${countLabel(slides.length)}. AI가 공식 사이트를 제안하지 못했어요. 위 칸에 공식 사이트 도메인을 직접 적어 주세요.`);
      $('tier1').focus();
    }
  } catch {
    setStatus('sites-status', `${file.name} · ${countLabel(slides.length)}. 사이트 제안을 받지 못했어요. 공식 사이트 도메인을 직접 적어 주세요.`);
  }
  updateStart();
}

// ---------- 2. 공식 사이트 확인 ----------

function readDomains() {
  const t1 = parseDomainInput($('tier1').value);
  const t2 = parseDomainInput($('tier2').value);
  if (t1.items.length === 0) return { error: '공식 사이트를 하나 이상 적어 주세요.' };
  const invalid = [...t1.invalid, ...t2.invalid];
  if (invalid.length) return { error: `도메인 모양이 아니에요: ${invalid.join(', ')} (예: example.com)` };
  if (t1.items.length > 3) return { error: '공식 사이트는 3개까지 적을 수 있어요.' };
  if (t2.items.length > 5) return { error: '다른 공식 채널은 5개까지 적을 수 있어요.' };
  return { domains: { tier1: t1.items, tier2: t2.items.filter((d) => !t1.items.includes(d)) } };
}

// 시작 버튼을 켜고 끄고, 꺼져 있을 때는 무엇이 남았는지 버튼 옆에 알려 준다.
function updateStart() {
  const { domains, error } = readDomains();
  const ready = Boolean(domains && $('confirm').checked);
  $('start').disabled = !ready;
  let hint = '';
  if (error) hint = error.startsWith('공식 사이트를 하나') ? '먼저 위의 "공식 사이트" 칸에 도메인을 적어 주세요. 예: example.com' : error;
  else if (!$('confirm').checked) hint = '사이트가 맞는지 확인하고 위의 확인란에 표시해 주세요.';
  $('start-hint').textContent = hint;
}

// ---------- 슬라이드 그림 ----------

const MAX_IMAGE_SIDE = 1568;

// 글자가 그림 안에 들어 있는 장은 그림을 작게 줄여 모델에 보여 준다. 읽을 그림이 없으면 null.
async function slideImageDataUrl(slide) {
  const image = pickImage(slide);
  if (!image) return null;
  const bitmap = await createImageBitmap(new Blob([image.bytes], { type: image.mime }));
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas.toDataURL('image/jpeg', 0.85);
}

// 결과 화면에서 글자 없는 장 대신 보여 줄 그림 주소. 장마다 한 번만 만든다.
const thumbUrls = new Map();
function slideThumbUrl(slide) {
  if (!thumbUrls.has(slide.slide)) {
    const image = pickImage(slide);
    thumbUrls.set(slide.slide, image ? URL.createObjectURL(new Blob([image.bytes], { type: image.mime })) : null);
  }
  return thumbUrls.get(slide.slide);
}

function clearThumbs() {
  for (const url of thumbUrls.values()) if (url) URL.revokeObjectURL(url);
  thumbUrls.clear();
}

// ---------- 3. 검사 ----------

async function startRun() {
  const { domains, error } = readDomains();
  if (error) return setStatus('sites-status', error, true);
  state.domains = domains;
  state.controller = new AbortController();
  const signal = state.controller.signal;

  $('live').replaceChildren();
  $('bar-fill').style.width = '0%';
  $('run-phase').textContent = '자료에서 낡을 수 있는 내용을 고르는 중이에요';
  $('run-count').textContent = '';
  $('stop').disabled = false;
  show('step-run');

  const api = {
    extract: (input) => callApi('/api/extract', input, undefined),
    check: (input) => callApi('/api/check', input, undefined),
  };

  // 같은 자료를 공식 사이트만 고쳐 다시 검사하면, 앞에서 뽑은 내용을 그대로 다시 검사한다.
  const prev = state.run;
  const reuse = prev && !prev.stopped && prev.claims.length > 0 ? { claims: prev.claims, skipped: prev.skipped, failedSlides: prev.failedSlides } : undefined;
  if (reuse) $('run-phase').textContent = '앞에서 고른 내용을 새 공식 사이트로 다시 대조하는 중이에요';
  state.run = await runCheck(state.slides, domains, api, onProgress, { signal, imageFor: slideImageDataUrl, reuse });
  renderResult();
  show('step-result');
}

function onProgress(e) {
  if (e.phase === 'extract') {
    $('run-phase').textContent = '자료에서 낡을 수 있는 내용을 고르는 중이에요';
    $('run-count').textContent = `${unitWord()} ${e.done} / ${e.total}`;
    $('bar-fill').style.width = `${Math.round((e.done / Math.max(1, e.total)) * 30)}%`;
  } else if (e.phase === 'check') {
    $('run-phase').textContent = '공식 문서와 대조하는 중이에요';
    $('run-count').textContent = `내용 ${e.done} / ${e.total}`;
    $('bar-fill').style.width = `${30 + Math.round((e.done / Math.max(1, e.total)) * 70)}%`;
    const item = el('li', {}, [
      el('span', { class: `badge ${e.result.verdict}`, text: VERDICT_LABEL[e.result.verdict] ?? '확인 못 함' }),
      el('span', { class: 'text', text: `${itemLabel(e.claim.slide)} · ${e.claim.text}` }),
    ]);
    $('live').prepend(item);
    while ($('live').children.length > 5) $('live').lastElementChild.remove();
  }
}

// ---------- 4. 결과 ----------

function renderResult() {
  const { claims, results, elapsedMs, skipped, stopped, failedSlides } = state.run;
  const sum = summarize(results);

  $('summary').replaceChildren(
    stat('changed', sum.changed, '바뀜'),
    stat('unverified', sum.unverified, '확인 못 함'),
    stat('same', sum.same, '그대로'),
    stat('', formatElapsed(elapsedMs), `걸린 시간 · ${countLabel(state.slides.length)}`),
  );

  const notes = [];
  if (stopped) notes.push('중간에 중단해서 그때까지의 결과만 보여요.');
  if (skipped) notes.push(`내용이 많아 ${skipped}개는 검사하지 않았어요.`);
  if (failedSlides.length) notes.push(`${unitWord()} ${failedSlides.join(', ')}번은 내용을 고르지 못했어요.`);
  if (claims.length === 0 && !stopped) notes.push('낡을 수 있는 내용(버전, 요금, 숫자, 날짜, 메뉴, 기능)을 찾지 못했어요.');
  setStatus('result-notes', notes.join(' '));
  renderSiteTip(results);

  state.filter = sum.changed > 0 ? 'changed' : 'all';
  renderFilters(sum);
  renderCards();
}

// 공식 사이트에서 아무것도 못 찾은 내용이 많으면, 적어 둔 공식 사이트가 틀렸을 가능성이 크다.
// 검색에 자주 나온 사이트를 후보로 보여 주되, 공식인지 판단하고 추가하는 일은 사용자가 한다.
function renderSiteTip(results) {
  const tip = $('site-tip');
  const missed = results.filter((r) => r.reason === 'no_official_source');
  if (results.length === 0 || missed.length < Math.max(3, results.length / 2)) {
    tip.hidden = true;
    return;
  }
  const counts = new Map();
  for (const r of missed) {
    for (const host of new Set((r.references ?? []).map((x) => x.hostname))) counts.set(host, (counts.get(host) ?? 0) + 1);
  }
  const top = [...counts.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const back = el('button', { type: 'button', class: 'primary', text: '공식 사이트 고치고 다시 검사' });
  back.addEventListener('click', () => {
    $('confirm').checked = false;
    updateStart();
    setStatus('sites-status', `${state.fileName} · ${countLabel(state.slides.length)}. 공식 사이트를 고친 뒤 다시 확인해 주세요.`);
    show('step-sites');
    $('tier1').focus();
  });

  tip.replaceChildren(
    el('p', { class: 'tip-title', text: `${missed.length}개 내용은 적어 주신 공식 사이트(${state.domains.tier1.join(', ')})에서 아무것도 찾지 못했어요.` }),
    el('p', { text: '공식 사이트 주소가 바뀌었거나 다르게 적혔을 수 있어요. 제품 이름이 바뀌면 주소도 함께 바뀌곤 해요.' }),
    top.length ? el('p', {}, ['검색에 자주 나온 사이트: ', ...top.flatMap(([host, n], i) => [i ? ', ' : '', el('strong', { text: host }), ` (${n}번)`]), '. 이 가운데 공식 사이트가 있는지 직접 확인해 주세요. 블로그나 커뮤니티일 수도 있어요.']) : null,
    back,
  );
  tip.hidden = false;
}

function stat(kind, number, label) {
  return el('div', { class: `stat ${kind}` }, [el('span', { class: 'n', text: String(number) }), el('span', { class: 'l', text: label })]);
}

function renderFilters(sum) {
  const options = [['all', `전체 ${sum.total}`], ['changed', `바뀜 ${sum.changed}`], ['unverified', `확인 못 함 ${sum.unverified}`], ['same', `그대로 ${sum.same}`]];
  $('filters').replaceChildren(...options.map(([key, label]) => {
    const b = el('button', { type: 'button', 'aria-pressed': String(state.filter === key), text: label });
    b.addEventListener('click', () => { state.filter = key; renderFilters(sum); renderCards(); });
    return b;
  }));
}

function renderCards() {
  const { claims, results } = state.run;
  const byId = new Map(results.map((r) => [r.claimId, r]));
  const rows = [];

  for (const slide of state.slides) {
    const items = claims
      .filter((c) => c.slide === slide.slide && byId.has(c.id))
      .map((c) => ({ claim: c, result: byId.get(c.id) }))
      .filter((x) => state.filter === 'all' || x.result.verdict === state.filter)
      .sort((a, b) => VERDICT_ORDER.indexOf(a.result.verdict) - VERDICT_ORDER.indexOf(b.result.verdict));
    if (items.length === 0) continue;

    rows.push(el('section', { class: 'slide-row' }, [
      el('div', { class: 'slide-side' }, [
        el('p', { class: 'slide-no', text: itemLabel(slide.slide) }),
        slideThumbUrl(slide) ? el('img', { class: 'slide-thumb', src: slideThumbUrl(slide), alt: `${itemLabel(slide.slide)} 그림`, loading: 'lazy' }) : null,
        slide.text.trim() ? el('p', { class: 'slide-text', text: slide.text }) : (slideThumbUrl(slide) ? null : el('p', { class: 'slide-text', text: '(글자 없음)' })),
      ]),
      el('div', { class: 'slide-cards' }, items.map(card)),
    ]));
  }

  $('cards').replaceChildren(...(rows.length ? rows : [el('p', { class: 'empty', text: '이 판정에 해당하는 내용이 없어요.' })]));
}

function safeLink(url, label) {
  // https 주소만 링크로 만든다.
  if (typeof url === 'string' && url.startsWith('https://')) {
    return el('a', { href: url, target: '_blank', rel: 'noopener noreferrer', text: label });
  }
  return el('span', { text: label });
}

function card({ claim, result }) {
  const v = result.verdict;
  const node = el('article', { class: `card ${v}` }, [
    el('div', { class: 'card-head' }, [
      el('span', { class: `badge ${v}`, text: VERDICT_LABEL[v] ?? '확인 못 함' }),
      el('p', { class: 'claim' }, [claim.text + ' ', el('span', { class: 'origin', text: `· ${originLabel(claim.origin)}` })]),
    ]),
  ]);

  if (v === 'changed' && result.suggestion) {
    node.append(el('div', { class: 'row' }, [el('span', { class: 'k', text: '수정안' }), el('div', { class: 'fix', text: result.suggestion })]));
  }
  if (v === 'unverified' && result.humanTask) {
    node.append(el('div', { class: 'row' }, [el('span', { class: 'k', text: '직접 확인할 일' }), el('div', { class: 'todo', text: result.humanTask })]));
  }

  for (const e of result.evidence ?? []) {
    node.append(el('div', { class: 'row' }, [
      el('span', { class: 'k', text: '공식 문서의 근거 문장' }),
      el('blockquote', { class: 'quote', text: e.quote }),
      el('span', { class: 'src' }, [el('span', { class: `tag t${e.tier}`, text: `${e.tier}등급` }), safeLink(e.url, e.hostname)]),
    ]));
  }

  if (result.references?.length) {
    node.append(el('div', { class: 'row' }, [
      el('span', { class: 'k' }, ['참고로만 보는 출처 ', el('span', { class: 'tag t3', text: '3등급 · 판정 근거 아님' })]),
      el('ul', { class: 'refs' }, result.references.map((r) => el('li', {}, [safeLink(r.url, r.hostname), r.title ? ` · ${r.title}` : '']))),
    ]));
  }
  return node;
}

function markdown() {
  const { claims, results, elapsedMs, skipped, stopped } = state.run;
  const d = new Date();
  const checkedAt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return toMarkdown(claims, results, { fileName: state.fileName, domains: state.domains, elapsedMs, checkedAt, skipped, stopped, unit: unitWord() });
}

// ---------- 이벤트 ----------

function reset() {
  state.controller?.abort();
  clearThumbs();
  Object.assign(state, { fileName: '', kind: 'pptx', slides: [], domains: null, run: null, controller: null, filter: 'all' });
  $('file').value = '';
  setStatus('upload-status', '');
  show('step-upload');
}

$('file').addEventListener('change', (e) => handleFile(e.target.files[0]));
const drop = $('drop');
for (const type of ['dragenter', 'dragover']) drop.addEventListener(type, (e) => { e.preventDefault(); drop.classList.add('over'); });
for (const type of ['dragleave', 'drop']) drop.addEventListener(type, (e) => { e.preventDefault(); drop.classList.remove('over'); });
drop.addEventListener('drop', (e) => handleFile(e.dataTransfer?.files?.[0]));
// 파일을 창 아무 데나 떨어뜨려도 브라우저가 그 파일을 열어 버리지 않게 한다.
for (const type of ['dragover', 'drop']) window.addEventListener(type, (e) => e.preventDefault());

for (const id of ['tier1', 'tier2']) {
  $(id).addEventListener('input', () => {
    $('confirm').checked = false; // 사이트를 고치면 다시 확인받는다.
    const { error } = readDomains();
    if (error && $(id).value.trim()) setStatus('sites-status', error, true);
    else if ($('sites-status').classList.contains('error')) setStatus('sites-status', '');
    updateStart();
  });
}
$('confirm').addEventListener('change', updateStart);
$('start').addEventListener('click', startRun);
$('stop').addEventListener('click', () => {
  state.controller?.abort();
  $('stop').disabled = true;
  $('run-phase').textContent = '진행 중인 요청만 마치고 멈출게요…';
});
$('reset-1').addEventListener('click', reset);
$('reset-2').addEventListener('click', reset);

$('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(markdown());
    $('copy').textContent = '복사했어요';
  } catch {
    $('copy').textContent = '복사하지 못했어요';
  }
  setTimeout(() => { $('copy').textContent = '수정 목록 복사'; }, 1800);
});

$('download').addEventListener('click', () => {
  const blob = new Blob([markdown()], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: `${state.fileName.replace(/\.(pptx|pdf)$/i, '')}_검사결과.md` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
