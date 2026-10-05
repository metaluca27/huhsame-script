// 무당벌레 형광펜 — 페이지 위를 기어 다니며 문장에 형광펜을 칠하는 무당벌레.
// 아이콘을 다시 누르면 이 파일이 또 주입되므로, 이미 있으면 토글만 한다.
(() => {
  if (window.__ladybug) {
    window.__ladybug.toggle();
    return;
  }

  const SIZE = 46;              // 무당벌레 화면 크기(px)
  const PAINT_SPEED = 115;      // 칠하면서 걷는 속도(px/s)
  const WALK_SPEED = 190;       // 그냥 걷는 속도(px/s)
  const MAX_BUGS = 3;           // 숏폼용으로 최대 세 마리까지
  // 마리마다 다른 색: 등껍질·테두리·형광펜·낙서 잉크
  const THEMES = [
    { name: "red", shell: "#e3122b", edge: "#7a0010", hl: "rgba(255, 36, 64, 0.32)", ink: "#d0001f" },
    { name: "yellow", shell: "#f6c400", edge: "#7d6200", hl: "rgba(255, 210, 0, 0.40)", ink: "#c79600" },
    { name: "orange", shell: "#ff7a1a", edge: "#8a3a00", hl: "rgba(255, 140, 30, 0.34)", ink: "#e06000" },
  ];
  const STOP = Symbol("stop");
  const SVG_NS = "http://www.w3.org/2000/svg";

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // ---------- 화면 틀: Shadow DOM 안에 모든 걸 그린다 ----------
  const host = document.createElement("div");
  host.id = "ladybug-highlighter-host";
  host.style.cssText =
    "position:absolute;left:0;top:0;width:0;height:0;overflow:hidden;" +
    "z-index:2147483647;pointer-events:none;margin:0;padding:0;border:0;";
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .layer { position:absolute; left:0; top:0; pointer-events:none; }
      .hl { position:absolute; border-radius:3px; width:0; }
      .doodle { position:absolute; overflow:visible; }
      .doodle path { fill:none; stroke-width:2.4; stroke-linecap:round; stroke-linejoin:round; opacity:.9; }
      .bug { position:absolute; left:0; top:0; width:${SIZE}px; height:${SIZE}px;
             pointer-events:auto; cursor:pointer; will-change:transform;
             filter: drop-shadow(1px 2px 1.5px rgba(0,0,0,.35)); }
      .bug svg { width:100%; height:100%; overflow:visible; display:block; }
      .pill { position:fixed; bottom:18px; left:50%; transform:translateX(-50%);
              pointer-events:auto; cursor:pointer; user-select:none;
              font: 600 13px/1 -apple-system, "Segoe UI", "Malgun Gothic", sans-serif;
              color:#fff; background:rgba(24,24,28,.88); border:1px solid rgba(255,255,255,.18);
              padding:9px 16px; border-radius:999px; box-shadow:0 4px 14px rgba(0,0,0,.3);
              transition: background .15s; }
      .pill:hover { background:rgba(200,0,30,.92); }
    </style>
    <div class="layer marks"></div>
    <div class="layer bugs"></div>
    <div class="pill" title="무당벌레와 자국을 모두 지워요">🐞 무당벌레 끄기</div>
  `;
  const marksLayer = shadow.querySelector(".marks");
  const bugsLayer = shadow.querySelector(".bugs");
  shadow.querySelector(".pill").addEventListener("click", destroyAll);
  document.documentElement.appendChild(host);

  // ---------- 페이지에서 칠할 줄 찾기 ----------
  const progress = new WeakMap(); // 문단 → 다음에 칠할 줄 번호 (Infinity = 다 칠함)
  const claimed = new Set();      // 지금 다른 무당벌레가 칠하고 있는 문단
  const SELECTOR = "p, li, dd, blockquote, h1, h2, h3, h4";

  function viewport() {
    return {
      x: window.scrollX, y: window.scrollY,
      w: document.documentElement.clientWidth, h: window.innerHeight,
    };
  }

  // 문단 안의 글자들을 줄 단위 상자로 묶는다 (페이지 좌표)
  function getLines(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    const rects = [];
    // "…"로 잘린 글(줄 수 제한)은 숨은 줄도 상자가 잡히므로, 문단 상자 밖으로 나간 줄은 버린다
    const box = el.getBoundingClientRect();
    const range = document.createRange();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) if (r.width > 2 && r.height > 4 && r.top < box.bottom - 2) rects.push(r);
    }
    rects.sort((a, b) => a.top - b.top || a.left - b.left);
    const lines = [];
    for (const r of rects) {
      const cy = (r.top + r.bottom) / 2;
      const line = lines.find((l) => cy > l.top && cy < l.bottom);
      if (line) {
        line.left = Math.min(line.left, r.left);
        line.right = Math.max(line.right, r.right);
        line.top = Math.min(line.top, r.top);
        line.bottom = Math.max(line.bottom, r.bottom);
      } else {
        lines.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
      }
    }
    lines.sort((a, b) => a.top - b.top);
    return lines
      .filter((l) => l.right - l.left > 24)
      .map((l) => ({
        left: l.left + window.scrollX, right: l.right + window.scrollX,
        top: l.top + window.scrollY, bottom: l.bottom + window.scrollY,
        cy: (l.top + l.bottom) / 2 + window.scrollY,
      }));
  }

  // 다음에 칠할 문단과 줄 1~4개를 고른다
  function pickJob(from) {
    const vp = viewport();
    const options = [];
    for (const el of document.querySelectorAll(SELECTOR)) {
      if (progress.get(el) === Infinity || claimed.has(el)) continue;
      if (el.closest("nav, [role=navigation], #ladybug-highlighter-host")) continue;
      if (el.tagName === "LI" && el.querySelector("p")) continue;
      const box = el.getBoundingClientRect();
      if (box.width < 40 || box.bottom < 0 || box.top > vp.h || box.right < 0 || box.left > vp.w) continue;
      if ((el.innerText || "").trim().length < 12) continue;

      const lines = getLines(el);
      let start = progress.get(el) || 0;
      // 화면 위로 지나간 줄은 건너뛴다
      while (start < lines.length && lines[start].top < vp.y + 4) start++;
      if (start >= lines.length) { progress.set(el, Infinity); continue; }
      const first = lines[start];
      if (first.bottom > vp.y + vp.h - 4) continue;
      const d = Math.hypot(first.left - from.x, first.cy - from.y);
      options.push({ el, lines, start, d });
    }
    if (!options.length) return null;
    options.sort((a, b) => a.d - b.d);
    const o = pick(options.slice(0, 3));
    const count = Math.floor(rand(1, 5));
    const chosen = [];
    for (let i = o.start; i < o.lines.length && chosen.length < count; i++) {
      if (o.lines[i].bottom > vp.y + vp.h - 4) break;
      chosen.push(o.lines[i]);
    }
    const next = o.start + chosen.length;
    progress.set(o.el, next >= o.lines.length ? Infinity : next);
    return { el: o.el, lines: chosen };
  }

  // ---------- 무당벌레 그림 (SVG, 오른쪽을 바라보는 기준) ----------
  // 다리: [뿌리x, 뿌리y, 기본각도(도), 세다리 묶음 0/1]
  const LEGS = [
    [5, -5, -60, 0], [0, -6, -95, 1], [-6, -5, -130, 0],
    [5, 5, 60, 1], [0, 6, 95, 0], [-6, 5, 130, 1],
  ];

  function el(tag, attrs, parent) {
    const e = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function buildBugSvg(theme) {
    const svg = el("svg", { viewBox: "-23 -23 46 46" });
    const legs = LEGS.map(([x, y, , ]) => {
      const g = el("g", {}, svg);
      // 뿌리에서 바깥으로 뻗는 꺾인 다리 (각도 0 = 오른쪽)
      el("polyline", {
        points: `${x},${y} ${x + 7},${y} ${x + 12},${y + (y < 0 ? -2 : 2)}`,
        fill: "none", stroke: "#151515", "stroke-width": 1.5,
        "stroke-linecap": "round", "stroke-linejoin": "round",
      }, g);
      return g;
    });
    const hind = [-1, 1].map((s) =>
      el("ellipse", { cx: -7, cy: 9 * s, rx: 13, ry: 5, fill: "rgba(235,225,200,.55)",
        stroke: "rgba(90,70,40,.5)", "stroke-width": 0.5, opacity: 0 }, svg));
    const antennae = [-1, 1].map((s) => {
      const g = el("g", {}, svg);
      el("path", { d: `M14 ${-1.5 * s} Q18 ${-3 * s} 20 ${-7 * s}`, fill: "none",
        stroke: "#151515", "stroke-width": 0.9, "stroke-linecap": "round" }, g);
      el("circle", { cx: 20, cy: -7 * s, r: 1.1, fill: "#151515" }, g);
      return g;
    });
    const shells = [-1, 1].map((s) => {
      const g = el("g", {}, svg);
      el("path", { d: `M9 0 A11 10 0 0 ${s < 0 ? 0 : 1} -13 0 Z`, fill: theme.shell,
        stroke: theme.edge, "stroke-width": 0.6 }, g);
      for (const [x, y, r] of [[2, 5, 2.4], [-5, 6, 2.1], [-9, 2.2, 1.7], [4, 1.6, 1.3]])
        el("circle", { cx: x, cy: y * s, r, fill: "#141414" }, g);
      el("ellipse", { cx: 1, cy: 5.5 * s, rx: 4, ry: 1.6, fill: "rgba(255,255,255,.35)",
        transform: `rotate(${-12 * s} 1 ${5.5 * s})` }, g);
      return g;
    });
    el("ellipse", { cx: 9, cy: 0, rx: 3.8, ry: 6.8, fill: "#141414" }, svg);
    el("ellipse", { cx: 9.4, cy: -4, rx: 1.3, ry: 1.7, fill: "#f4f1ea" }, svg);
    el("ellipse", { cx: 9.4, cy: 4, rx: 1.3, ry: 1.7, fill: "#f4f1ea" }, svg);
    el("circle", { cx: 13, cy: 0, r: 3.6, fill: "#141414" }, svg);
    el("circle", { cx: 14.6, cy: -1.8, r: 0.8, fill: "#fff" }, svg);
    el("circle", { cx: 14.6, cy: 1.8, r: 0.8, fill: "#fff" }, svg);
    return { svg, legs, hind, antennae, shells };
  }

  // ---------- 무당벌레들 ----------
  const bugs = []; // 화면에 있는 무당벌레 (날아가는 중인 것 포함)

  function createBug(theme) {
    const node = document.createElement("div");
    node.className = "bug";
    node.title = "클릭하면 날아가요";
    const parts = buildBugSvg(theme);
    node.appendChild(parts.svg);
    bugsLayer.appendChild(node);

    const vp = viewport();
    // 화면 왼쪽이나 아래 가장자리 바깥에서 걸어 들어온다
    const fromLeft = Math.random() < 0.5;
    const b = {
      node, parts, theme,
      x: fromLeft ? vp.x - SIZE : vp.x + rand(0.2, 0.8) * vp.w,
      y: fromLeft ? vp.y + rand(0.3, 0.7) * vp.h : vp.y + vp.h + SIZE,
      angle: fromLeft ? 0 : -Math.PI / 2,
      gait: 0, t: 0, scale: 1, opacity: 1,
      shellOpen: 0, flutter: 0, resting: false,
      alive: true, flying: false,
    };
    node.addEventListener("click", (e) => { e.stopPropagation(); flyAway(b); });
    render(b);
    return b;
  }

  function render(b) {
    const { legs, antennae, shells, hind } = b.parts;
    legs.forEach((g, i) => {
      const [x, y, base, set] = LEGS[i];
      const swing = b.flying ? -10 * Math.sign(y) : Math.sin(b.gait + set * Math.PI) * 20;
      g.setAttribute("transform", `rotate(${base + swing} ${x} ${y})`);
    });
    antennae.forEach((g, i) => {
      const wig = b.resting ? Math.sin(b.t * 7 + i * 1.7) * 9 : Math.sin(b.gait * 0.5 + i) * 3;
      g.setAttribute("transform", `rotate(${wig} 14 0)`);
    });
    shells.forEach((g, i) => {
      const s = i === 0 ? 1 : -1; // 왼쪽 껍질은 +각도, 오른쪽은 -각도로 벌어진다
      g.setAttribute("transform", `rotate(${s * 38 * b.shellOpen} 9 0)`);
    });
    hind.forEach((e, i) => {
      const s = i === 0 ? -1 : 1;
      const ry = 5 * (0.4 + 0.6 * Math.abs(Math.sin(b.flutter)));
      e.setAttribute("ry", ry.toFixed(2));
      e.setAttribute("opacity", (b.shellOpen * 0.95).toFixed(2));
      e.setAttribute("transform", `rotate(${s * 28 * b.shellOpen} 4 0)`);
    });
    const deg = (b.angle * 180) / Math.PI;
    b.node.style.transform =
      `translate(${b.x - SIZE / 2}px, ${b.y - SIZE / 2}px) rotate(${deg}deg) scale(${b.scale})`;
    b.node.style.opacity = b.opacity;
  }

  function turnToward(b, target, dt, rate = 9) {
    let diff = target - b.angle;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    b.angle += diff * Math.min(1, dt * rate);
  }

  // 한 프레임씩 진행하는 기본 루프. step(dt)가 true를 돌려주면 끝.
  function animate(b, step) {
    return new Promise((resolve, reject) => {
      let last = performance.now();
      const frame = (now) => {
        if (!b.alive || b.flying) return reject(STOP);
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        b.t += dt;
        const done = step(dt);
        render(b);
        if (done) resolve(); else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }

  // (x, y)까지 걸어간다. onStep으로 걷는 동안 형광펜/낙서를 함께 그린다.
  function walkTo(b, x, y, speed, { wobble = true, onStep } = {}) {
    b.resting = false;
    return animate(b, (dt) => {
      const dx = x - b.x, dy = y - b.y;
      const dist = Math.hypot(dx, dy);
      const stepLen = speed * dt;
      if (dist <= stepLen || dist < 0.5) {
        b.x = x; b.y = y; b.gait += dist * 0.32;
        onStep && onStep();
        return true;
      }
      let dir = Math.atan2(dy, dx);
      if (wobble && dist > 50) dir += Math.sin(b.t * 2.6) * 0.35;
      b.x += Math.cos(dir) * stepLen;
      b.y += Math.sin(dir) * stepLen;
      b.gait += stepLen * 0.32;
      turnToward(b, dir, dt);
      onStep && onStep();
      return false;
    });
  }

  function rest(b, ms) {
    b.resting = true;
    let left = ms / 1000;
    return animate(b, (dt) => (left -= dt) <= 0).finally(() => { b.resting = false; });
  }

  // 한 줄을 따라 걸으며 형광펜을 칠한다
  async function paintLine(b, line) {
    const hl = document.createElement("div");
    hl.className = "hl";
    hl.style.background = b.theme.hl;
    hl.style.left = `${line.left - 2}px`;
    hl.style.top = `${line.top - 1}px`;
    hl.style.height = `${line.bottom - line.top + 2}px`;
    marksLayer.appendChild(hl);
    await walkTo(b, line.right + 2, line.cy, PAINT_SPEED, {
      wobble: false,
      onStep: () => { hl.style.width = `${Math.max(0, b.x - line.left + 2)}px`; },
    });
  }

  // ---------- 낙서: 무당벌레가 직접 따라 그린다 ----------
  function doodlePath(lines) {
    const line = pick(lines);
    const h = line.bottom - line.top;
    const kind = pick(["circle", "circle", "wave", "star"]);
    if (kind === "circle") {
      const w = Math.min(line.right - line.left, rand(60, 110));
      const cx = rand(line.left + w / 2, line.right - w / 2);
      const rx = w / 2 + 6, ry = h / 2 + 6;
      // 손으로 그린 듯 살짝 겹치게 한 바퀴 반 가까이 돈다
      const pts = [];
      for (let a = 0; a <= Math.PI * 2.25; a += 0.18) {
        const wob = 1 + Math.sin(a * 3) * 0.04;
        pts.push([cx + Math.cos(a + Math.PI) * rx * wob, line.cy + Math.sin(a + Math.PI) * ry * wob + a * 0.6]);
      }
      return pts;
    }
    if (kind === "wave") {
      const w = Math.min(line.right - line.left, rand(80, 160));
      const x0 = rand(line.left, line.right - w);
      const y = line.bottom + 3;
      const pts = [];
      for (let x = 0; x <= w; x += 4) pts.push([x0 + x, y + Math.sin(x / 6) * 2.5]);
      return pts;
    }
    // 별: 줄 끝 오른쪽에
    const R = h * 0.8, pts = [];
    const vp = viewport();
    const cx = Math.min(line.right + R + 6, vp.x + vp.w - R - 10), cy = line.cy;
    for (let i = 0; i <= 5; i++) {
      const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
      pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]);
    }
    return pts;
  }

  async function doodle(b, lines) {
    const pts = doodlePath(lines);
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const minX = Math.min(...xs) - 4, minY = Math.min(...ys) - 4;
    const svg = el("svg", {
      class: "doodle", width: Math.max(...xs) - minX + 8, height: Math.max(...ys) - minY + 8,
    });
    svg.style.left = `${minX}px`;
    svg.style.top = `${minY}px`;
    const path = el("path", { stroke: b.theme.ink }, svg);
    marksLayer.appendChild(svg);

    await walkTo(b, pts[0][0], pts[0][1], WALK_SPEED);
    let d = `M${pts[0][0] - minX} ${pts[0][1] - minY}`;
    for (let i = 1; i < pts.length; i++) {
      const [x, y] = pts[i];
      await walkTo(b, x, y, PAINT_SPEED * 0.8, {
        wobble: false,
        onStep: () => path.setAttribute("d", `${d} L${b.x - minX} ${b.y - minY}`),
      });
      d += ` L${x - minX} ${y - minY}`;
    }
    path.setAttribute("d", d);
  }

  // ---------- 하루 일과 ----------
  async function life(b) {
    try {
      const vp = viewport();
      await walkTo(b, vp.x + rand(0.25, 0.75) * vp.w, vp.y + rand(0.3, 0.7) * vp.h, WALK_SPEED);
      while (b.alive && !b.flying) {
        const job = pickJob(b);
        if (!job || !job.lines.length) {
          // 칠할 데가 없으면 화면 안을 어슬렁거리다 다시 찾는다
          const v = viewport();
          await walkTo(b, v.x + rand(0.15, 0.85) * v.w, v.y + rand(0.2, 0.8) * v.h, WALK_SPEED * 0.7);
          await rest(b, rand(800, 1600));
          continue;
        }
        // 화면을 많이 벗어나 있으면(스크롤했을 때) 가장자리로 순간이동해서 걸어 들어온다
        const v = viewport();
        if (b.y < v.y - SIZE * 2 || b.y > v.y + v.h + SIZE * 2) {
          b.y = b.y < v.y ? v.y - SIZE : v.y + v.h + SIZE;
          b.x = Math.min(Math.max(b.x, v.x + 20), v.x + v.w - 20);
        }
        claimed.add(job.el);
        try {
          for (const line of job.lines) {
            await walkTo(b, line.left - 2, line.cy, WALK_SPEED);
            await paintLine(b, line);
            await rest(b, rand(150, 450));
          }
          if (Math.random() < 0.75) await doodle(b, job.lines);
        } finally {
          claimed.delete(job.el);
        }
        await rest(b, rand(500, 1300));
      }
    } catch (e) {
      if (e !== STOP) console.error("[무당벌레]", e);
    }
  }

  // ---------- 날아가기 ----------
  async function flyAway(b) {
    if (b.flying || !b.alive) return;
    b.flying = true;
    const node = b.node;
    node.style.pointerEvents = "none";
    let t = 0;
    const vp = viewport();
    // 위쪽 화면 밖 아무 데나로
    const tx = b.x + rand(-0.6, 0.6) * vp.w, ty = vp.y - SIZE * 3;
    const dir = Math.atan2(ty - b.y, tx - b.x);
    let speed = 0;
    await new Promise((resolve) => {
      let last = performance.now();
      const frame = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        t += dt;
        b.t += dt;
        b.shellOpen = Math.min(1, t / 0.25);
        b.flutter += dt * 70;
        if (t > 0.35) {
          speed = Math.min(900, speed + dt * 1100);
          b.x += Math.cos(dir) * speed * dt;
          b.y += Math.sin(dir) * speed * dt;
          turnToward(b, dir, dt, 6);
          b.scale = Math.min(1.9, b.scale + dt * 0.9);
          node.style.filter = `drop-shadow(${4 + b.scale * 6}px ${6 + b.scale * 10}px ${3 + b.scale * 3}px rgba(0,0,0,.25))`;
        } else {
          b.scale = 1 + t * 0.3; // 살짝 들썩
        }
        if (t > 1.2) b.opacity = Math.max(0, 1 - (t - 1.2) / 0.4);
        render(b);
        if (t < 1.6) requestAnimationFrame(frame); else resolve();
      };
      requestAnimationFrame(frame);
    });
    b.alive = false;
    node.remove();
    const i = bugs.indexOf(b);
    if (i >= 0) bugs.splice(i, 1);
  }

  // ---------- 바깥에서 부르는 동작 ----------
  // 그림판을 페이지 크기에 딱 맞춰서, 무당벌레가 가장자리를 넘어가도 스크롤바가 안 생기게 한다
  function fitHost() {
    host.style.width = "0px";
    host.style.height = "0px";
    const d = document.documentElement;
    host.style.width = `${d.clientWidth}px`;
    host.style.height = `${Math.max(d.scrollHeight, document.body ? document.body.scrollHeight : 0)}px`;
  }
  window.addEventListener("resize", fitHost);

  function spawn() {
    if (!host.isConnected) document.documentElement.appendChild(host);
    fitHost();
    // 아직 안 쓰인 색부터 (빨강 → 노랑 → 주황)
    const used = bugs.map((x) => x.theme);
    const theme = THEMES.find((t) => !used.includes(t)) || THEMES[0];
    const b = createBug(theme);
    bugs.push(b);
    life(b);
  }

  function destroyAll() {
    for (const b of bugs) b.alive = false;
    bugs.length = 0;
    claimed.clear();
    host.remove();
    marksLayer.replaceChildren();
    bugsLayer.replaceChildren();
    delete window.__ladybug;
  }

  window.__ladybug = {
    // 아이콘 누를 때마다 한 마리씩 늘고, 세 마리일 때 또 누르면 전부 날아간다
    toggle() {
      const walking = bugs.filter((x) => !x.flying);
      if (walking.length < MAX_BUGS) spawn();
      else walking.forEach(flyAway);
    },
  };

  spawn();
})();
