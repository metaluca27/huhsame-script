// docs/worker/smalllib.test.mjs — 작은도서관 소개관 워커 테스트 (node --test)
import { test } from "node:test";
import assert from "node:assert/strict";
import { handleSmalllib, sha256hex, decodePhoto, cleanText } from "./smalllib.js";

function fakeKV() {
  const store = new Map();
  return {
    get: async (k, type) => {
      const e = store.get(k); if (!e) return null;
      return type === "json" ? JSON.parse(e.v) : e.v;
    },
    getWithMetadata: async (k) => { const e = store.get(k); return e ? { value: e.v, metadata: e.m } : { value: null, metadata: null }; },
    put: async (k, v, o) => { store.set(k, { v, m: o && o.metadata }); },
    delete: async (k) => { store.delete(k); },
    _store: store,
  };
}
const CORS = { "Access-Control-Allow-Origin": "*" };
const TOKEN = "tok-ulju-1-aaaaaaaaaaaa";
const ADMIN = "admin-key-bbbbbbbbbbbb";
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function setup() {
  const env = { MERGE_RANK: fakeKV() };
  await env.MERGE_RANK.put("sl:tok:" + (await sha256hex(TOKEN)), "ulju-1");
  await env.MERGE_RANK.put("sl:admin:" + (await sha256hex(ADMIN)), "1");
  return env;
}
async function call(env, method, path, body, now = 1000) {
  const req = new Request("https://w.test" + path, { method, body: body ? JSON.stringify(body) : undefined, headers: { "Content-Type": "application/json" } });
  const res = await handleSmalllib(req, new URL(req.url), env, CORS, now);
  const type = res.headers.get("Content-Type") || "";
  return { status: res.status, body: type.includes("json") ? await res.json() : await res.arrayBuffer(), res };
}

test("글자 정리: 제어문자 빼고 길이 자르기", () => {
  assert.equal(cleanText(" 안녕\u0000하세요\r\n둘째 줄 ", 100), "안녕하세요\n둘째 줄");
  assert.equal(cleanText("가".repeat(20), 5), "가가가가가");
});

test("사진 해독: 형식 틀리면 거절", () => {
  assert.equal(decodePhoto("hello"), "bad_photo");
  assert.equal(decodePhoto("data:image/gif;base64,AAAA"), "bad_photo_type");
  const ok = decodePhoto(PNG);
  assert.equal(ok.type, "image/png");
  assert.ok(ok.bytes.length > 10);
});

test("틀린 링크로는 못 올림", async () => {
  const env = await setup();
  const r = await call(env, "POST", "/smalllib/post", { token: "wrong-token-xxxxxxxxx", text: "hi", consent: true });
  assert.equal(r.status, 403);
});

test("동의 체크 없으면 못 올림", async () => {
  const env = await setup();
  const r = await call(env, "POST", "/smalllib/post", { token: TOKEN, text: "책 읽기 모임" });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, "need_consent");
});

test("올리면 바로 공개: 도서관 페이지·첫 화면·사진에 다 나옴", async () => {
  const env = await setup();
  const up = await call(env, "POST", "/smalllib/post", { token: TOKEN, text: "그림책 읽어주기 했어요", photos: [PNG, PNG], consent: true }, 5000);
  assert.equal(up.status, 200);
  assert.equal(up.body.post.photos.length, 2);

  const lib = await call(env, "GET", "/smalllib/lib/ulju-1");
  assert.equal(lib.body.posts.length, 1);
  assert.equal(lib.body.posts[0].text, "그림책 읽어주기 했어요");

  const home = await call(env, "GET", "/smalllib/home");
  assert.equal(home.body.index["ulju-1"].count, 1);
  assert.equal(home.body.index["ulju-1"].cover, up.body.post.photos[0]);
  assert.equal(home.body.feed[0].lib, "ulju-1");

  const ph = await call(env, "GET", "/smalllib/photo/" + up.body.post.photos[0]);
  assert.equal(ph.status, 200);
  assert.equal(ph.res.headers.get("Content-Type"), "image/png");
});

test("사진 7장은 거절", async () => {
  const env = await setup();
  const r = await call(env, "POST", "/smalllib/post", { token: TOKEN, text: "x", photos: Array(7).fill(PNG), consent: true });
  assert.equal(r.body.error, "too_many_photos");
});

test("관장님이 고치고 지우면 사진도 같이 지워짐", async () => {
  const env = await setup();
  const up = await call(env, "POST", "/smalllib/post", { token: TOKEN, text: "처음 글", photos: [PNG], consent: true });
  const pid = up.body.post.pid;
  await call(env, "POST", "/smalllib/edit", { token: TOKEN, pid, text: "고친 글" });
  assert.equal((await call(env, "GET", "/smalllib/lib/ulju-1")).body.posts[0].text, "고친 글");

  await call(env, "POST", "/smalllib/delete", { token: TOKEN, pid });
  assert.equal((await call(env, "GET", "/smalllib/lib/ulju-1")).body.posts.length, 0);
  assert.equal((await call(env, "GET", "/smalllib/photo/" + up.body.post.photos[0])).status, 404);
  assert.equal((await call(env, "GET", "/smalllib/home")).body.feed.length, 0);
});

test("루카 숨기기 버튼: 숨기면 안 보이고, 틀린 키는 거절", async () => {
  const env = await setup();
  const up = await call(env, "POST", "/smalllib/post", { token: TOKEN, text: "문제 글", consent: true });
  const pid = up.body.post.pid;
  assert.equal((await call(env, "POST", "/smalllib/admin/hide", { admin: "wrong-admin-xxxxxxxxx", lib: "ulju-1", pid, hidden: true })).status, 403);
  await call(env, "POST", "/smalllib/admin/hide", { admin: ADMIN, lib: "ulju-1", pid, hidden: true });
  assert.equal((await call(env, "GET", "/smalllib/lib/ulju-1")).body.posts.length, 0);
  assert.equal((await call(env, "GET", "/smalllib/home")).body.index["ulju-1"].count, 0);
  const all = await call(env, "POST", "/smalllib/admin/list", { admin: ADMIN, lib: "ulju-1" });
  assert.equal(all.body.posts[0].hidden, true);
  await call(env, "POST", "/smalllib/admin/hide", { admin: ADMIN, lib: "ulju-1", pid, hidden: false });
  assert.equal((await call(env, "GET", "/smalllib/lib/ulju-1")).body.posts.length, 1);
});

test("소개 고치기 + 대표사진", async () => {
  const env = await setup();
  const r = await call(env, "POST", "/smalllib/profile", { token: TOKEN, intro: "아파트 안 작은 도서관", hours: "평일 10~18시", members: "798", cover: PNG, hacked: "x" });
  assert.equal(r.status, 200);
  assert.equal(r.body.profile.intro, "아파트 안 작은 도서관");
  assert.equal(r.body.profile.hacked, undefined);
  const home = await call(env, "GET", "/smalllib/home");
  assert.equal(home.body.index["ulju-1"].cover, r.body.profile.cover);
  const me = await call(env, "POST", "/smalllib/me", { token: TOKEN });
  assert.equal(me.body.lib, "ulju-1");
});

test("대표사진 빼기 → 소개 글은 그대로, 사진은 지워짐", async () => {
  const env = await setup();
  const r = await call(env, "POST", "/smalllib/profile", { token: TOKEN, intro: "그대로", cover: PNG });
  const old = r.body.profile.cover;
  const r2 = await call(env, "POST", "/smalllib/profile", { token: TOKEN, removeCover: true });
  assert.equal(r2.status, 200);
  assert.equal(r2.body.profile.cover, undefined);
  assert.equal(r2.body.profile.intro, "그대로");
  assert.equal((await call(env, "GET", "/smalllib/photo/" + old)).status, 404);
  assert.equal((await call(env, "GET", "/smalllib/home")).body.index["ulju-1"].cover, null);
});

test("행사 신청 링크: 주소 정리·검사, 다가오는 행사에 실림", async () => {
  const { parseEvent, parseLink } = await import("./smalllib.js");
  const now = Date.parse("2026-11-26T00:00:00Z");
  assert.equal(parseLink(""), null);
  assert.equal(parseLink("naver.me/abc"), "https://naver.me/abc");
  assert.equal(parseLink("https://forms.gle/xyz"), "https://forms.gle/xyz");
  assert.equal(parseLink("javascript:alert(1)"), false);
  assert.equal(parseLink("그냥 글"), false);
  assert.equal(parseEvent({ date: "2026-12-06", link: "javascript:alert(1)" }, now), "bad_event_link");
  const env = await setup();
  const r = await call(env, "POST", "/smalllib/post", { token: TOKEN, text: "별자리 밤", consent: true, event: { date: "2026-12-01", link: "form.naver.com/response/abc" } }, now);
  assert.equal(r.status, 200);
  assert.equal(r.body.post.event.link, "https://form.naver.com/response/abc");
  const home = await call(env, "GET", "/smalllib/home", null, now);
  assert.equal(home.body.events[0].link, "https://form.naver.com/response/abc");
});

test("이상한 도서관 id·사진 id는 404", async () => {
  const env = await setup();
  assert.equal((await call(env, "GET", "/smalllib/lib/../etc")).status, 404);
  assert.equal((await call(env, "GET", "/smalllib/photo/zz")).status, 404);
});

test("행사: 날짜 검사", async () => {
  const { parseEvent, kstDate } = await import("./smalllib.js");
  const now = Date.parse("2026-11-25T03:00:00Z");
  assert.equal(kstDate(Date.parse("2026-11-25T16:00:00Z")), "2026-11-26"); // 한국은 벌써 다음 날
  assert.equal(parseEvent(null, now), null);
  assert.deepEqual(parseEvent({ date: "2026-12-06", time: "오전 10시" }, now), { date: "2026-12-06", time: "오전 10시" });
  assert.equal(parseEvent({ date: "12/6" }, now), "bad_event_date");
  assert.equal(parseEvent({ date: "2031-01-01" }, now), "bad_event_date");
});

test("행사: 다가오는 행사에 날짜순, 지나면 빠지고, 고치기·지우기 반영", async () => {
  const env = await setup();
  const now = Date.parse("2026-11-25T03:00:00Z");
  const day = 86400000;
  await call(env, "POST", "/smalllib/post", { token: TOKEN, text: "크리스마스 그림책", consent: true, event: { date: "2026-12-20", time: "오전 10시" } }, now);
  const b = await call(env, "POST", "/smalllib/post", { token: TOKEN, text: "작가와의 만남", consent: true, event: { date: "2026-12-01" } }, now + 1);
  await call(env, "POST", "/smalllib/post", { token: TOKEN, text: "그냥 소식", consent: true }, now + 2);
  let home = await call(env, "GET", "/smalllib/home", null, now);
  assert.deepEqual(home.body.events.map((e) => e.date), ["2026-12-01", "2026-12-20"]);
  assert.equal(home.body.events[1].time, "오전 10시");

  // 12월 2일이 되면 12월 1일 행사는 빠짐
  home = await call(env, "GET", "/smalllib/home", null, now + 7 * day);
  assert.deepEqual(home.body.events.map((e) => e.date), ["2026-12-20"]);

  // 행사 날짜 고치기 → 반영, 행사 빼기 → 사라짐
  await call(env, "POST", "/smalllib/edit", { token: TOKEN, pid: b.body.post.pid, text: "작가와의 만남", event: { date: "2026-12-27" } }, now);
  home = await call(env, "GET", "/smalllib/home", null, now);
  assert.deepEqual(home.body.events.map((e) => e.date), ["2026-12-20", "2026-12-27"]);
  await call(env, "POST", "/smalllib/edit", { token: TOKEN, pid: b.body.post.pid, text: "작가와의 만남", event: null }, now);
  home = await call(env, "GET", "/smalllib/home", null, now);
  assert.equal(home.body.events.length, 1);

  const bad = await call(env, "POST", "/smalllib/post", { token: TOKEN, text: "x", consent: true, event: { date: "내일" } }, now);
  assert.equal(bad.body.error, "bad_event_date");
});
