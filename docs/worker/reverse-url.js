// docs/worker/reverse-url.js — 리버스 비즈니스 해부기 (/reverse)의 순수 함수 모음
// 주소 검사·정규화, 토스 Origin 허용, 요금제 링크 찾기, 차단 화면 판정. 네트워크 호출 없음.

// 주소를 깨끗하게 만든다. 스킴 없으면 https, 해시·utm_* 제거, 끝 / 제거, 호스트 소문자
export function normalizeUrl(input) {
  const raw = String(input == null ? '' : input).trim();
  if (!raw) return { ok: false, reason: 'empty' };
  // http(s) 외의 스킴(ftp:, file:, javascript:, data: 등)은 먼저 거절. "a.com:8080"처럼 콜론 뒤가 숫자면 포트
  if (/^(?!https?:)[a-z][a-z0-9+.-]*:(\/\/|(?!\d))/i.test(raw)) return { ok: false, reason: 'scheme' };
  const withScheme = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
  let u;
  try { u = new URL(withScheme); } catch { return { ok: false, reason: 'host' }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ok: false, reason: 'scheme' };
  // 끝점(localhost. 등)으로 내부 호스트 검사를 피하지 못하게 떼고, 캐시 키도 같게 만든다
  const h = u.hostname.toLowerCase().replace(/\.+$/, '');
  // 내부망·IP 주소는 막는다 (워커가 대신 접속하므로)
  if (!h || h.startsWith('[') || /^\d{1,3}(\.\d{1,3}){3}$/.test(h)
    || h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) {
    return { ok: false, reason: 'host' };
  }
  u.hostname = h;
  u.hash = '';
  for (const k of [...u.searchParams.keys()]) if (/^utm_/i.test(k)) u.searchParams.delete(k);
  const path = u.pathname.replace(/\/+$/, '');
  return { ok: true, url: u.origin + path + u.search };
}

// 호출을 허용할 출처: 토스 미니앱 4종 도메인과 로컬 개발(localhost)만
const TOSS_ORIGIN = /^https:\/\/[a-z0-9-]+\.(private-)?(apps|web)\.tossmini\.com$/;
const LOCAL_ORIGIN = /^http:\/\/localhost:\d+$/;
export function isAllowedOrigin(origin) {
  if (!origin) return false;
  return TOSS_ORIGIN.test(origin) || LOCAL_ORIGIN.test(origin);
}

// 같은 호스트 안에서 요금제 페이지로 보이는 링크 하나를 찾는다
const PRICING_RE = /(pricing|plans?|price|요금|가격|구독)/i;
export function findPricingLink(links, pageUrl) {
  let base;
  try { base = new URL(pageUrl); } catch { return null; }
  const self = base.origin + base.pathname.replace(/\/+$/, '');
  for (const l of links || []) {
    let u;
    try { u = new URL(l, base); } catch { continue; }
    if (u.host !== base.host) continue;
    let p = u.pathname;
    try { p = decodeURIComponent(p); } catch { /* 깨진 인코딩은 그대로 검사 */ }
    if (!PRICING_RE.test(p)) continue;
    u.hash = '';
    if (u.origin + u.pathname.replace(/\/+$/, '') === self) continue;
    return u.href;
  }
  return null;
}

// 읽을 수 없는 화면인지: 오류 코드, 봇 확인, 로그인 화면. 글자가 적다고 막힌 건 아니다
const BOT_TITLE = /just a moment|attention required|access denied|verify you are human|captcha/i;
const LOGIN_RE = /log ?in|sign ?in|로그인/i;
export function isBlockedPage({ status, title, text }) {
  const t = String(title || '');
  const body = String(text || '');
  if (status >= 400) return true;
  if (BOT_TITLE.test(t)) return true;
  if (body.length < 300 && (LOGIN_RE.test(t) || LOGIN_RE.test(body.slice(0, 300)))) return true;
  return false;
}
