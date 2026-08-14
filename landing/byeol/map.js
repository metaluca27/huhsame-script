(function (root) {
  // 케미 점수 → 중심으로부터의 반지름(높을수록 안쪽). 배치는 각도 균등 분산.
  function radiusFor(score, maxR, minR) {
    var t = Math.max(0, Math.min(1, (score - 66) / (93 - 66))); // 66~93 정규화
    return maxR - t * (maxR - minR); // 높은 점수 = 작은 반지름(안쪽)
  }

  function renderMap() {
    var people = root.sortByChemi(root.state.people);
    var W = 420, H = 420, cx = W/2, cy = H/2;
    var svg = ['<svg viewBox="0 0 ' + W + ' ' + H + '">'];

    // 궤도 3겹 (천천히 회전)
    svg.push('<g class="orbits">');
    [70,130,185].forEach(function (r) {
      svg.push('<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="#33406b" stroke-dasharray="2 6" opacity="0.4"/>');
    });
    svg.push('</g>');
    // 잔별 (반짝임)
    var stars = [[50,40],[370,60],[380,360],[60,350],[210,28],[400,200],[30,210]];
    stars.forEach(function (s, i) { svg.push('<circle class="tw" style="animation-delay:'+(i*0.5).toFixed(1)+'s" cx="'+s[0]+'" cy="'+s[1]+'" r="1.2" fill="#cdd8f5"/>'); });

    // 각 사람: 각도 균등 분산 + 케미 반지름
    var n = people.length;
    people.forEach(function (p, i) {
      var ang = (-Math.PI/2) + (i * 2*Math.PI / Math.max(n,1));
      var r = radiusFor(p.score, 185, 62);
      var x = cx + r*Math.cos(ang), y = cy + r*Math.sin(ang);
      var t = Math.max(0, Math.min(1, (p.score-66)/(93-66)));
      var dotR = 7 + t*6;           // 케미 높을수록 큰 별
      var lw = 1 + t*1.4, op = 0.35 + t*0.55; // 연결선 진하기
      svg.push('<line x1="'+cx+'" y1="'+cy+'" x2="'+x.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="#8fb4ff" stroke-width="'+lw.toFixed(1)+'" opacity="'+op.toFixed(2)+'"/>');
      svg.push('<circle class="star-tw" style="animation-delay:'+(i*0.6).toFixed(1)+'s" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+dotR.toFixed(1)+'" fill="'+p.color2+'"/>');
      svg.push('<text x="'+x.toFixed(1)+'" y="'+(y-dotR-4).toFixed(1)+'" text-anchor="middle" font-size="10" fill="#dfe8ff">'+escapeXml(p.name)+'</text>');
    });

    // 중앙: 나
    svg.push('<circle class="me-star" cx="'+cx+'" cy="'+cy+'" r="24" fill="#ffcf5b"/>');
    svg.push('<text x="'+cx+'" y="'+(cy+4)+'" text-anchor="middle" font-size="12" font-weight="700" fill="#5a3d00">나</text>');
    svg.push('</svg>');
    document.getElementById('byeol-map').innerHTML = svg.join('');

    renderCounts(root.countByRelation(root.state.people));
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
})(typeof window !== 'undefined' ? window : globalThis);
