// landing/smalllib/graph.js — 옵시디언 그래프 뷰처럼 도서관들이 점으로 둥둥 떠다니는 화면
// SLGraph.mount(canvas, { libs, index, onOpen(id) })
// 협회(가운데) ─ 구·군 ─ 도서관, 협의회처럼 묶음으로 가입한 곳은 묶음 점을 거쳐 이어짐.
// 구군 이름·색, 가운데 이름은 SL.CFG(common.js 설정)에서 가져옴.
const SLGraph = (() => {
  const GU_COLOR = SL.CFG.groups;

  function mount(canvas, { libs, index, onOpen }) {
    const ctx = canvas.getContext('2d');
    const nodes = [];
    const links = [];
    const byKey = {};
    const add = (n) => { n.x = (Math.random() - 0.5) * 300; n.y = (Math.random() - 0.5) * 300; n.vx = 0; n.vy = 0; nodes.push(n); byKey[n.key] = n; return n; };
    const link = (a, b, len) => { links.push({ a: byKey[a], b: byKey[b], len }); };

    add({ key: 'root', label: SL.CFG.rootLabel, r: 11, color: '#d9d4c7', kind: 'root' });
    for (const gu of Object.keys(GU_COLOR)) {
      add({ key: 'gu:' + gu, label: gu, r: 8, color: GU_COLOR[gu], kind: 'gu' });
      link('root', 'gu:' + gu, 110);
    }
    for (const g of [...new Set(libs.filter((l) => l.group).map((l) => l.group))]) {
      const gu = libs.find((l) => l.group === g).gu;
      add({ key: 'grp:' + g, label: g, r: 6.5, color: GU_COLOR[gu] || '#aaa', kind: 'grp' });
      link('gu:' + gu, 'grp:' + g, 60);
    }
    for (const l of libs) {
      const count = (index[l.id] && index[l.id].count) || 0;
      add({ key: l.id, id: l.id, label: l.name, r: 4.5 + Math.min(7, Math.sqrt(count) * 2), color: GU_COLOR[l.gu] || '#aaa', kind: 'lib', count });
      if (l.group) link('grp:' + l.group, l.id, 55); else link('gu:' + l.gu, l.id, 70);
    }
    const neighbors = new Map(nodes.map((n) => [n, new Set()]));
    for (const e of links) { neighbors.get(e.a).add(e.b); neighbors.get(e.b).add(e.a); }

    // 화면 크기·확대
    let W = 0, H = 0, dpr = 1, scale = 1, panX = 0, panY = 0;
    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = rect.width; H = rect.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      scale = Math.min(W, H) / 560;
    }
    resize();
    new ResizeObserver(resize).observe(canvas);

    // 물리: 서로 밀어내기 + 줄 당기기 + 가운데로 + 살짝 떠다니기
    let hot = 1; // 처음엔 크게 움직이다가 잦아듦
    function step(t) {
      const N = nodes.length;
      for (let i = 0; i < N; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < N; j++) {
          const b = nodes[j];
          let dx = a.x - b.x, dy = a.y - b.y;
          let d2 = dx * dx + dy * dy + 0.01;
          if (d2 > 90000) continue;
          const f = 900 / d2;
          const d = Math.sqrt(d2);
          dx /= d; dy /= d;
          a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f;
        }
      }
      for (const e of links) {
        const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (d - e.len) * 0.012;
        const fx = (dx / d) * f, fy = (dy / d) * f;
        e.a.vx += fx; e.a.vy += fy; e.b.vx -= fx; e.b.vy -= fy;
      }
      for (const n of nodes) {
        n.vx -= n.x * 0.002; n.vy -= n.y * 0.002;
        // 둥둥: 점마다 다른 박자로 아주 살짝 흔들림
        const ph = (n.key.length * 1.7 + n.r) % 6.28;
        n.vx += Math.sin(t / 1900 + ph) * 0.03; n.vy += Math.cos(t / 2300 + ph * 1.3) * 0.03;
        if (n === drag) { n.vx = 0; n.vy = 0; continue; }
        n.vx *= 0.82; n.vy *= 0.82;
        const cap = 6 * hot + 0.6;
        n.x += Math.max(-cap, Math.min(cap, n.vx));
        n.y += Math.max(-cap, Math.min(cap, n.vy));
      }
      hot = Math.max(0, hot - 0.004);
    }

    const toScreen = (n) => [W / 2 + (n.x + panX) * scale, H / 2 + (n.y + panY) * scale];
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#1e1f1c'; ctx.fillRect(0, 0, W, H);
      const focus = hover || null;
      const near = focus ? neighbors.get(focus) : null;
      const lit = (n) => !focus || n === focus || near.has(n);
      // 줄
      for (const e of links) {
        const [x1, y1] = toScreen(e.a), [x2, y2] = toScreen(e.b);
        const on = focus && (e.a === focus || e.b === focus);
        ctx.strokeStyle = on ? 'rgba(201,178,255,.85)' : focus ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.16)';
        ctx.lineWidth = on ? 1.6 : 1;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      // 점
      for (const n of nodes) {
        const [x, y] = toScreen(n);
        const r = n.r * Math.max(0.8, scale);
        ctx.globalAlpha = lit(n) ? 1 : 0.18;
        if (n === focus) { ctx.fillStyle = 'rgba(201,178,255,.25)'; ctx.beginPath(); ctx.arc(x, y, r + 7, 0, 7); ctx.fill(); }
        ctx.fillStyle = n === focus ? '#c9b2ff' : n.color;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
        if (n.kind === 'lib' && n.count) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.2; ctx.stroke(); }
      }
      // 이름표: 협회·구군은 늘, 도서관은 가리킨 점과 이웃만
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (const n of nodes) {
        const show = n.kind !== 'lib' ? lit(n) : focus && (n === focus || near.has(n));
        if (!show) continue;
        const [x, y] = toScreen(n);
        const r = n.r * Math.max(0.8, scale);
        ctx.globalAlpha = 1;
        ctx.font = `${n === focus ? 700 : n.kind === 'lib' ? 400 : 600} ${n.kind === 'root' ? 13 : 12}px "Pretendard","Malgun Gothic",system-ui,sans-serif`;
        ctx.fillStyle = n === focus ? '#fff' : 'rgba(235,232,224,.85)';
        ctx.fillText(n.label + (n === focus && n.count ? ` · 소식 ${n.count}` : ''), x, y + r + 4);
      }
      ctx.globalAlpha = 1;
    }

    // 가리키기·끌기·누르기
    let hover = null, drag = null, downAt = null, moved = false;
    function pick(px, py) {
      let best = null, bd = Infinity;
      for (const n of nodes) {
        const [x, y] = toScreen(n);
        const d = Math.hypot(x - px, y - py);
        const reach = Math.max(18, n.r * Math.max(0.8, scale) + 6); // 손가락으로도 잡히게
        if (d < reach && d < bd) { bd = d; best = n; }
      }
      return best;
    }
    const pos = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    canvas.addEventListener('pointerdown', (e) => {
      const [px, py] = pos(e);
      const n = pick(px, py);
      downAt = [px, py]; moved = false;
      if (n) { drag = n; hover = n; canvas.setPointerCapture(e.pointerId); hot = Math.max(hot, 0.3); }
    });
    canvas.addEventListener('pointermove', (e) => {
      const [px, py] = pos(e);
      if (drag) {
        if (downAt && Math.hypot(px - downAt[0], py - downAt[1]) > 5) moved = true;
        drag.x = (px - W / 2) / scale - panX; drag.y = (py - H / 2) / scale - panY;
        hot = Math.max(hot, 0.3);
      } else if (e.pointerType === 'mouse') {
        hover = pick(px, py);
        canvas.style.cursor = hover && hover.kind === 'lib' ? 'pointer' : hover ? 'grab' : 'default';
      }
    });
    canvas.addEventListener('pointerup', (e) => {
      const n = drag; drag = null;
      if (!n || moved) return;
      // 마우스는 한 번 클릭으로 열기, 손가락은 첫 탭=이름 보기 → 같은 점 다시 탭=열기
      if (n.kind === 'lib' && (e.pointerType === 'mouse' || canvas._lastTap === n)) onOpen(n.id);
      canvas._lastTap = n; hover = n;
    });
    canvas.addEventListener('pointerleave', () => { if (!drag) hover = null; });

    let running = true;
    const io = new IntersectionObserver((es) => { running = es[0].isIntersecting; if (running) requestAnimationFrame(loop); });
    io.observe(canvas);
    function loop(t) { if (!running) return; step(t || 0); draw(); requestAnimationFrame(loop); }
    // 처음 자리 잡기를 미리 조금 돌려 둠
    for (let i = 0; i < 120; i++) step(i * 16);
    requestAnimationFrame(loop);
  }
  return { mount, GU_COLOR };
})();
