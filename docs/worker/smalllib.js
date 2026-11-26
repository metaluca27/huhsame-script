// docs/worker/smalllib.js
// 울산 작은도서관 소개관(/smalllib) — 도서관별 사진·활동 소식. 관장님이 비밀 링크로 직접 올리고 바로 공개.
//
//   GET  /smalllib/home            : 도서관별 요약(대표사진·소식 수·마지막 소식) + 최근 소식 60개
//   GET  /smalllib/lib/<id>        : 도서관 소개 + 소식 목록(숨김 제외)
//   GET  /smalllib/photo/<photoId> : 사진 (한 번 올린 사진은 안 바뀌니 1년 캐시)
//   POST /smalllib/me      {token}                       : 이 링크가 어느 도서관 것인지
//   POST /smalllib/post    {token, text, photos[], consent:true} : 소식 올리기 (사진은 data:URL, 최대 6장)
//   POST /smalllib/edit    {token, pid, text, event?}    : 내 소식 글(·행사 날짜) 고치기
//   (post·edit 의 event = { date: "2026-12-06", time: "오전 10시", link?: 신청 폼 주소 } 또는 null — 행사 안내일 때만)
//   POST /smalllib/delete  {token, pid}                  : 내 소식 지우기 (사진도 같이 지움)
//   POST /smalllib/profile {token, ...소개 칸, cover?, removeCover?} : 도서관 소개 고치기 (cover = 대표사진 data:URL, removeCover:true = 빼기)
//   POST /smalllib/admin/list {admin, lib}               : 루카용 — 숨긴 것까지 전부 보기
//   POST /smalllib/admin/hide {admin, lib, pid, hidden}  : 루카용 숨기기 버튼
//
// KV: env.MERGE_RANK (공용 저장소) 안에 "sl:" 로 시작하는 키만 씀.
//   sl:tok:<sha256(토큰)>   → 도서관 id      (토큰 원문은 저장하지 않음)
//   sl:admin:<sha256(키)>   → "1"
//   sl:prof:<id>            → 소개 { intro, hours, phone, opened, members, volunteers, address, cover, updatedAt }
//   sl:posts:<id>           → [{ pid, at, text, photos:[photoId], hidden? }] 최신순
//   sl:index                → { <id>: { cover, count, last } }   첫 화면 한 번에 읽기용
//   sl:feed                 → [{ lib, pid, at, text, photo }] 최신 60개
//   sl:events               → [{ lib, pid, date, time, text, photo }] 아직 안 지난 행사, 날짜순
//   sl:ph:<photoId>         → 사진 바이트 (metadata.type)

const TEXT_MAX = 1000;
const PHOTOS_MAX = 6;
const PHOTO_BYTES_MAX = 1_500_000;
const POSTS_MAX = 300;
const FEED_MAX = 60;
const PHOTO_TYPES = { "image/jpeg": 1, "image/webp": 1, "image/png": 1 };
const PROFILE_FIELDS = { intro: 500, hours: 120, phone: 40, opened: 20, members: 12, volunteers: 12, address: 120 };
const EVENTS_MAX = 120;
const LIB_ID = /^[a-z]+-\d{1,3}$/;
const PHOTO_ID = /^[a-z0-9-]{6,40}$/;

export async function sha256hex(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(s)));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(obj, status, cors, extra) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...cors, ...(extra || {}) },
  });
}

export function cleanText(v, max) {
  return String(v == null ? "" : v)
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);
}

// "data:image/jpeg;base64,...." → { type, bytes } 또는 에러 문자열
export function decodePhoto(dataUrl) {
  const m = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(String(dataUrl || ""));
  if (!m) return "bad_photo";
  if (!PHOTO_TYPES[m[1]]) return "bad_photo_type";
  const b64 = m[2].replace(/\s/g, "");
  if (b64.length * 0.75 > PHOTO_BYTES_MAX + 4) return "photo_too_big";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { type: m[1], bytes };
}

// 한국 날짜 "YYYY-MM-DD"
export function kstDate(ms) {
  return new Date(ms + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

// 행사 정보 검사: 없으면 null, 틀리면 에러 문자열
export function parseEvent(ev, now) {
  if (ev == null || ev === false) return null;
  if (typeof ev !== "object") return "bad_event";
  const date = String(ev.date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date + "T00:00:00Z"))) return "bad_event_date";
  const t = Date.parse(date + "T00:00:00Z");
  if (t < now - 400 * 86400000 || t > now + 800 * 86400000) return "bad_event_date";
  const out = { date, time: cleanText(ev.time, 30) };
  const link = parseLink(ev.link);
  if (link === false) return "bad_event_link";
  if (link) out.link = link;
  return out;
}

// 신청 링크(네이버 폼·구글 폼 등): 없으면 null, http(s) 주소가 아니면 false. "naver.me/xx"처럼 앞을 빼먹어도 받아 줌
export function parseLink(v) {
  let s = String(v == null ? "" : v).trim();
  if (!s) return null;
  if (s.length > 500) return false;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) return false;
    return u.href;
  } catch { return false; }
}

function newId(now) {
  const r = crypto.getRandomValues(new Uint8Array(6));
  return now.toString(36) + "-" + [...r].map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 8);
}

async function libFromToken(env, token) {
  const t = String(token || "");
  if (t.length < 16 || t.length > 100) return null;
  return await env.MERGE_RANK.get("sl:tok:" + (await sha256hex(t)));
}

async function getJSON(env, key, fallback) {
  const v = await env.MERGE_RANK.get(key, "json");
  return v == null ? fallback : v;
}
const putJSON = (env, key, v) => env.MERGE_RANK.put(key, JSON.stringify(v));

// 첫 화면 요약과 최근 소식을 도서관의 현재 소식 목록에 맞춰 다시 계산
async function refreshSummary(env, lib, posts, profile, now = Date.now()) {
  const visible = posts.filter((p) => !p.hidden);
  const index = await getJSON(env, "sl:index", {});
  const prof = profile || (await getJSON(env, "sl:prof:" + lib, {}));
  const firstPhoto = visible.find((p) => p.photos && p.photos.length);
  index[lib] = {
    cover: prof.cover || (firstPhoto ? firstPhoto.photos[0] : null),
    count: visible.length,
    last: visible.length ? visible[0].at : null,
  };
  await putJSON(env, "sl:index", index);

  let feed = (await getJSON(env, "sl:feed", [])).filter((f) => f.lib !== lib);
  for (const p of visible.slice(0, FEED_MAX)) {
    feed.push({ lib, pid: p.pid, at: p.at, text: p.text.slice(0, 120), photo: p.photos[0] || null });
  }
  feed.sort((a, b) => b.at - a.at);
  feed = feed.slice(0, FEED_MAX);
  await putJSON(env, "sl:feed", feed);

  const today = kstDate(now);
  let events = (await getJSON(env, "sl:events", [])).filter((e) => e.lib !== lib && e.date >= today);
  for (const p of visible) {
    if (p.event && p.event.date >= today) {
      events.push({ lib, pid: p.pid, date: p.event.date, time: p.event.time || "", link: p.event.link || null, text: p.text.slice(0, 120), photo: p.photos[0] || null });
    }
  }
  events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  await putJSON(env, "sl:events", events.slice(0, EVENTS_MAX));
}

async function readBody(request) {
  try { return await request.json(); } catch { return null; }
}

export async function handleSmalllib(request, url, env, cors, now = Date.now()) {
  const parts = url.pathname.split("/").filter(Boolean); // ["smalllib", ...]
  const action = parts[1] || "";
  const kv = env.MERGE_RANK;

  if (request.method === "GET") {
    if (action === "home") {
      const [index, feed, events] = await Promise.all([getJSON(env, "sl:index", {}), getJSON(env, "sl:feed", []), getJSON(env, "sl:events", [])]);
      const today = kstDate(now);
      return json({ index, feed, events: events.filter((e) => e.date >= today) }, 200, cors, { "Cache-Control": "public, max-age=30" });
    }
    if (action === "lib" && LIB_ID.test(parts[2] || "")) {
      const id = parts[2];
      const [profile, posts] = await Promise.all([getJSON(env, "sl:prof:" + id, {}), getJSON(env, "sl:posts:" + id, [])]);
      return json({ profile, posts: posts.filter((p) => !p.hidden) }, 200, cors, { "Cache-Control": "public, max-age=30" });
    }
    if (action === "photo" && PHOTO_ID.test(parts[2] || "")) {
      const cache = typeof caches !== "undefined" ? caches.default : null;
      const cacheKey = new Request(url.origin + "/smalllib/photo/" + parts[2]);
      if (cache) { const hit = await cache.match(cacheKey); if (hit) return hit; }
      const { value, metadata } = await kv.getWithMetadata("sl:ph:" + parts[2], "arrayBuffer");
      if (!value) return json({ error: "not_found" }, 404, cors);
      const res = new Response(value, {
        status: 200,
        headers: { "Content-Type": (metadata && metadata.type) || "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable", ...cors },
      });
      if (cache) await cache.put(cacheKey, res.clone());
      return res;
    }
    return json({ error: "not_found" }, 404, cors);
  }

  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, cors);
  const body = await readBody(request);
  if (!body || typeof body !== "object") return json({ error: "bad_body" }, 400, cors);

  if (action === "admin") {
    const ok = typeof body.admin === "string" && body.admin.length >= 16 && (await kv.get("sl:admin:" + (await sha256hex(body.admin))));
    if (!ok) return json({ error: "bad_admin" }, 403, cors);
    if (!LIB_ID.test(String(body.lib || ""))) return json({ error: "bad_lib" }, 400, cors);
    const posts = await getJSON(env, "sl:posts:" + body.lib, []);
    if (parts[2] === "list") return json({ posts }, 200, cors);
    if (parts[2] !== "hide") return json({ error: "not_found" }, 404, cors);
    const p = posts.find((x) => x.pid === body.pid);
    if (!p) return json({ error: "not_found" }, 404, cors);
    p.hidden = !!body.hidden;
    await putJSON(env, "sl:posts:" + body.lib, posts);
    await refreshSummary(env, body.lib, posts, null, now);
    return json({ ok: true, hidden: p.hidden }, 200, cors);
  }

  const lib = await libFromToken(env, body.token);
  if (!lib) return json({ error: "bad_token" }, 403, cors);

  if (action === "me") {
    const profile = await getJSON(env, "sl:prof:" + lib, {});
    const posts = await getJSON(env, "sl:posts:" + lib, []);
    return json({ lib, profile, posts }, 200, cors);
  }

  if (action === "post") {
    if (body.consent !== true) return json({ error: "need_consent" }, 400, cors);
    const text = cleanText(body.text, TEXT_MAX);
    const photos = Array.isArray(body.photos) ? body.photos : [];
    if (photos.length > PHOTOS_MAX) return json({ error: "too_many_photos" }, 400, cors);
    if (!text && !photos.length) return json({ error: "empty" }, 400, cors);
    const event = parseEvent(body.event, now);
    if (typeof event === "string") return json({ error: event }, 400, cors);
    const decoded = [];
    for (const d of photos) {
      const r = decodePhoto(d);
      if (typeof r === "string") return json({ error: r }, 400, cors);
      decoded.push(r);
    }
    const ids = [];
    for (const ph of decoded) {
      const id = newId(now);
      await kv.put("sl:ph:" + id, ph.bytes, { metadata: { type: ph.type, lib } });
      ids.push(id);
    }
    const posts = await getJSON(env, "sl:posts:" + lib, []);
    const post = { pid: newId(now), at: now, text, photos: ids };
    if (event) post.event = event;
    posts.unshift(post);
    for (const old of posts.splice(POSTS_MAX)) for (const id of old.photos || []) await kv.delete("sl:ph:" + id);
    await putJSON(env, "sl:posts:" + lib, posts);
    await refreshSummary(env, lib, posts, null, now);
    return json({ ok: true, post }, 200, cors);
  }

  if (action === "edit" || action === "delete") {
    const posts = await getJSON(env, "sl:posts:" + lib, []);
    const i = posts.findIndex((x) => x.pid === body.pid);
    if (i < 0) return json({ error: "not_found" }, 404, cors);
    if (action === "edit") {
      const text = cleanText(body.text, TEXT_MAX);
      if (!text && !posts[i].photos.length) return json({ error: "empty" }, 400, cors);
      if ("event" in body) {
        const event = parseEvent(body.event, now);
        if (typeof event === "string") return json({ error: event }, 400, cors);
        if (event) posts[i].event = event; else delete posts[i].event;
      }
      posts[i].text = text;
      posts[i].editedAt = now;
    } else {
      const [gone] = posts.splice(i, 1);
      for (const id of gone.photos || []) await kv.delete("sl:ph:" + id);
    }
    await putJSON(env, "sl:posts:" + lib, posts);
    await refreshSummary(env, lib, posts, null, now);
    return json({ ok: true, post: action === "edit" ? posts[i] : undefined }, 200, cors);
  }

  if (action === "profile") {
    const prof = await getJSON(env, "sl:prof:" + lib, {});
    for (const [k, max] of Object.entries(PROFILE_FIELDS)) {
      if (k in body) prof[k] = cleanText(body[k], max);
    }
    if (body.cover) {
      const r = decodePhoto(body.cover);
      if (typeof r === "string") return json({ error: r }, 400, cors);
      const id = newId(now);
      await kv.put("sl:ph:" + id, r.bytes, { metadata: { type: r.type, lib } });
      if (prof.cover) await kv.delete("sl:ph:" + prof.cover);
      prof.cover = id;
    } else if (body.removeCover === true && prof.cover) {
      // 대표 사진 빼기 → 첫 화면·도서관 페이지는 최근 소식 사진으로 돌아감
      await kv.delete("sl:ph:" + prof.cover);
      delete prof.cover;
    }
    prof.updatedAt = now;
    await putJSON(env, "sl:prof:" + lib, prof);
    const posts = await getJSON(env, "sl:posts:" + lib, []);
    await refreshSummary(env, lib, posts, prof, now);
    return json({ ok: true, profile: prof }, 200, cors);
  }

  return json({ error: "not_found" }, 404, cors);
}
