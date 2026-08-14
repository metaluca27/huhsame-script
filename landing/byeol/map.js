(function (root) {
  // 케미 점수 → 중심으로부터의 반지름(높을수록 안쪽). 배치는 각도 균등 분산.
  function radiusFor(score, maxR, minR) {
    var t = Math.max(0, Math.min(1, (score - 66) / (93 - 66))); // 66~93 정규화
    return maxR - t * (maxR - minR); // 높은 점수 = 작은 반지름(안쪽)
  }

  var floatState = { raf: 0, nodes: [] };

  function stopFloat() {
    if (floatState.raf) { cancelAnimationFrame(floatState.raf); floatState.raf = 0; }
  }

  function renderMap() {
    stopFloat();
    var people = root.sortByChemi(root.state.people);
    var W = 420, H = 420, cx = W/2, cy = H/2;
    var svg = ['<svg viewBox="0 0 ' + W + ' ' + H + '">'];

    // 궤도 3겹 (천천히 회전)
    svg.push('<g class="orbits">');
    [70,130,185].forEach(function (r) {
      svg.push('<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="#33406b" stroke-dasharray="2 6" opacity="0.4"/>');
    });
    svg.push('</g>');
    // 잔별 25개 (반짝임)
    var stars = [[50,40,1.2],[370,60,1],[380,360,1.3],[60,350,1.1],[210,28,1],[400,200,1.2],[30,210,1],[95,108,0.9],[330,120,1.1],[145,72,0.8],[290,52,1],[402,300,0.9],[25,285,1.1],[112,392,1],[312,394,0.9],[188,404,1.2],[406,112,0.8],[16,150,1],[358,250,0.9],[72,252,0.8],[250,18,1.1],[160,42,0.9],[414,162,1],[44,82,1],[386,40,0.9]];
    stars.forEach(function (s, i) { svg.push('<circle class="tw" style="animation-delay:'+((i%7)*0.45).toFixed(2)+'s" cx="'+s[0]+'" cy="'+s[1]+'" r="'+(s[2]||1.1)+'" fill="#cdd8f5"/>'); });

    // 각 사람: 각도 균등 분산 + 케미 반지름 (부유 애니메이션 대상)
    var n = people.length;
    var meta = [];
    people.forEach(function (p, i) {
      var ang = (-Math.PI/2) + (i * 2*Math.PI / Math.max(n,1));
      var r = radiusFor(p.score, 185, 62);
      var x = cx + r*Math.cos(ang), y = cy + r*Math.sin(ang);
      var t = Math.max(0, Math.min(1, (p.score-66)/(93-66)));
      var dotR = 7 + t*6;           // 케미 높을수록 큰 별
      var lw = 1 + t*1.4, op = 0.35 + t*0.55; // 연결선 진하기
      svg.push('<line data-i="'+i+'" x1="'+cx+'" y1="'+cy+'" x2="'+x.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="#8fb4ff" stroke-width="'+lw.toFixed(1)+'" opacity="'+op.toFixed(2)+'"/>');
      svg.push('<circle class="star-tw" data-i="'+i+'" style="animation-delay:'+(i*0.6).toFixed(1)+'s" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+dotR.toFixed(1)+'" fill="'+p.color2+'"/>');
      svg.push('<text data-i="'+i+'" x="'+x.toFixed(1)+'" y="'+(y-dotR-4).toFixed(1)+'" text-anchor="middle" font-size="10" fill="#dfe8ff">'+escapeXml(p.name)+'</text>');
      meta.push({ baseX: x, baseY: y, dotR: dotR, phase: i * 1.7,
                  ampX: 5 + (i % 3), ampY: 5 + ((i + 1) % 3), speed: 0.4 + (i % 4) * 0.1 });
    });

    // 중앙: 나 (고정, 맥박만)
    svg.push('<circle class="me-star" cx="'+cx+'" cy="'+cy+'" r="24" fill="#ffcf5b"/>');
    svg.push('<text x="'+cx+'" y="'+(cy+4)+'" text-anchor="middle" font-size="12" font-weight="700" fill="#5a3d00">나</text>');
    svg.push('</svg>');
    var box = document.getElementById('byeol-map');
    box.innerHTML = svg.join('');

    // 부유 애니메이션용 요소 참조 수집
    floatState.nodes = meta.map(function (m, i) {
      return {
        star: box.querySelector('circle.star-tw[data-i="'+i+'"]'),
        line: box.querySelector('line[data-i="'+i+'"]'),
        text: box.querySelector('text[data-i="'+i+'"]'),
        baseX: m.baseX, baseY: m.baseY, dotR: m.dotR,
        phase: m.phase, ampX: m.ampX, ampY: m.ampY, speed: m.speed
      };
    });

    renderCounts(root.countByRelation(root.state.people));
    startFloat();
  }

  function startFloat() {
    stopFloat();
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!floatState.nodes.length) return;
    var t0 = (typeof performance !== 'undefined' ? performance.now() : 0);
    function frame(now) {
      var t = (now - t0) / 1000;
      floatState.nodes.forEach(function (nd) {
        if (!nd.star) return;
        var x = nd.baseX + nd.ampX * Math.sin(t * nd.speed + nd.phase);
        var y = nd.baseY + nd.ampY * Math.cos(t * nd.speed * 0.9 + nd.phase * 1.3);
        nd.star.setAttribute('cx', x.toFixed(1));
        nd.star.setAttribute('cy', y.toFixed(1));
        if (nd.line) { nd.line.setAttribute('x2', x.toFixed(1)); nd.line.setAttribute('y2', y.toFixed(1)); }
        if (nd.text) { nd.text.setAttribute('x', x.toFixed(1)); nd.text.setAttribute('y', (y - nd.dotR - 4).toFixed(1)); }
      });
      floatState.raf = requestAnimationFrame(frame);
    }
    floatState.raf = requestAnimationFrame(frame);
  }

  function renderCounts(c) {
    var R = root.RELATIONS;
    var order = ['danbi','hanmulgyeol','saessakjigi','janmulgyeol','keunbawi'];
    document.getElementById('map-counts').innerHTML = order.map(function (k) {
      return '<div class="cnt"><div class="n">'+c[k]+'</div><div class="l">'+R[k].emoji+' '+R[k].label+'</div></div>';
    }).join('');
  }

  function escapeXml(s) { return String(s).replace(/[<>&]/g, function (ch) { return ({'<':'&lt;','>':'&gt;','&':'&amp;'})[ch]; }); }

  root.renderMap = renderMap;
  root.stopByeolFloat = stopFloat;
})(typeof window !== 'undefined' ? window : globalThis);
