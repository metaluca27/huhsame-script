// docs/worker/smalllib-tokens.mjs — 작은도서관 관장님 "올리기 링크" 만들기
//
//   node smalllib-tokens.mjs
//
// 1) landing/smalllib/libraries.json 의 도서관마다 비밀 링크를 하나씩 만든다 (이미 있으면 그대로 둠).
// 2) smalllib-links.local.txt  : 관장님께 카톡으로 보낼 링크 목록 + 루카 숨기기용 관리자 링크 (커밋 안 됨)
// 3) smalllib-kv.local.json    : 워커 저장소에 넣을 열쇠 (토큰은 해시로만 저장)
//    넣는 명령: npx wrangler kv bulk put --binding MERGE_RANK smalllib-kv.local.json --remote
//
// 링크를 잃어버린 관장님은 links 파일에서 다시 찾아 보내면 됨. 링크를 바꾸고 싶으면
// links 파일에서 그 줄을 지우고 다시 돌린 뒤 bulk put (옛 열쇠는 wrangler kv key delete 로 지우기).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes, createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const SITE = "https://vaulted-bus-346411.web.app/smalllib";
const LINKS = join(here, "smalllib-links.local.txt");
const KVOUT = join(here, "smalllib-kv.local.json");
const libs = JSON.parse(readFileSync(join(here, "../../landing/smalllib/libraries.json"), "utf8")).libraries;

const sha = (s) => createHash("sha256").update(s).digest("hex");
const newToken = () => randomBytes(18).toString("base64url");

// 기존 파일에서 토큰 읽기: "id<TAB>이름<TAB>링크" 형식, 관리자 줄은 "admin<TAB>...<TAB>링크"
const known = new Map();
if (existsSync(LINKS)) {
  for (const line of readFileSync(LINKS, "utf8").split("\n")) {
    const [id, , link] = line.split("\t");
    const m = /#(.+)$/.exec(link || "");
    if (id && m) known.set(id.trim(), m[1].trim());
  }
}

const rows = [];
const kv = [];
const admin = known.get("admin") || newToken();
rows.push(["admin", "루카 숨기기용 (남한테 주지 말 것)", `${SITE}/admin#${admin}`]);
kv.push({ key: "sl:admin:" + sha(admin), value: "1" });
for (const l of libs) {
  const t = known.get(l.id) || newToken();
  rows.push([l.id, `${l.gu} ${l.name}${l.hidden ? " (숨김)" : ""}`, `${SITE}/write#${t}`]);
  kv.push({ key: "sl:tok:" + sha(t), value: l.id });
}
writeFileSync(LINKS, rows.map((r) => r.join("\t")).join("\n") + "\n");
writeFileSync(KVOUT, JSON.stringify(kv, null, 1));
console.log(`링크 ${rows.length - 1}개 + 관리자 1개 → ${LINKS}`);
console.log(`저장소용 열쇠 → ${KVOUT}`);
