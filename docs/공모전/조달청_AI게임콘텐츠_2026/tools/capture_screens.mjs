// 시연영상용 정지 화면(시작·도감 카드·결과·도감)을 웹 버전에서 찍는다. 크롬 헤드리스 + CDP.
// 사용: node capture_screens.mjs   → ../녹화/shot_*.png (1134x1704, 루카 녹화와 같은 크기)
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '녹화');
const URL = 'https://vaulted-bus-346411.web.app/ssukssuk';
const EDGE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';   // 엣지는 번역·코파일럿 버튼이 화면에 찍혀서 크롬
const PORT = 9333;
mkdirSync(OUT, { recursive: true });

const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, '--hide-scrollbars', '--disable-extensions',
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'ssukcap-'))}`, '--window-size=567,852', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let targets;
for (let i = 0; i < 40; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets.some((t) => t.type === 'page')) break; } catch {}
  await sleep(250);
}
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const cdp = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const js = async (expr) => (await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
async function shot(name) {
  await sleep(600);
  // 정책으로 강제 설치된 확장 프로그램이 붙이는 떠다니는 버튼 숨기기(게임 화면이 아님)
  const extra = await js(`(function(){var n=0; [].forEach.call(document.documentElement.children,function(e){if(e!==document.head&&e!==document.body){e.style.display='none';n++}});
    [].forEach.call(document.body.children,function(e){if(e.tagName!=='SCRIPT'&&!e.id){e.style.display='none';n++}}); return n})()`);
  if (extra) console.log('  hid', extra, 'foreign nodes');
  const r = await cdp('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(OUT, `shot_${name}.png`), Buffer.from(r.result.data, 'base64'));
  console.log('saved', name);
}

await cdp('Emulation.setDeviceMetricsOverride', { width: 567, height: 852, deviceScaleFactor: 2, mobile: false });
await cdp('Page.enable');
await cdp('Page.navigate', { url: URL });
await sleep(3000);
await js("localStorage.clear(); location.reload()");
await sleep(3000);
await shot('01_start');

// 시작 → 1단계 카드가 실제로 뜸
await js("document.getElementById('btn-start').click()");
await sleep(1200);
await shot('02_card1');

// 다른 단계 카드는 같은 팝업에 그 단계 내용을 채워서 찍음
for (const i of [5, 6, 10]) {
  await js(`(function(){var s=SsukCore.STAGES[${i}];
    document.getElementById('card-tag').textContent='${i + 1}단계 발견!';
    document.getElementById('card-img').src=s.img; document.getElementById('card-name').textContent=s.emoji+' '+s.name;
    document.getElementById('card-text').textContent=s.card; document.getElementById('card-pop').classList.add('show');})()`);
  await shot(`03_card${i + 1}`);
}

// 결과 화면(11단계 도달)
await js(`(function(){var s=SsukCore.STAGES[10];
  document.getElementById('card-pop').classList.remove('show');
  document.getElementById('result-reached-img').src=s.img;
  document.getElementById('result-reached-text').textContent="당신의 아이디어는 '"+s.emoji+' '+s.name+"'까지 자랐어요!";
  document.getElementById('result-score').textContent='6,772점';
  document.getElementById('result-sub').textContent='도감 11/11 · 신기록!';
  ['start','play','result','book'].forEach(function(n){document.getElementById('screen-'+n).classList.toggle('show',n==='result')});})()`);
await shot('04_result');

// 도감 11/11
await js("localStorage.setItem('ssuk.cards', JSON.stringify([0,1,2,3,4,5,6,7,8,9,10])); location.reload()");
await sleep(4000);
await js("new Promise(function(r){(function w(){var b=document.getElementById('btn-book-start'); if(window.SsukUI&&b){b.click();r()} else setTimeout(w,200)})()})");
await shot('05_book');

ws.close(); edge.kill();
process.exit(0);
