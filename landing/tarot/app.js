// 심연의 타로 — 화면 전환 + 푸름이 안내 (뼈대)

var state = {
  birth: null,
  situation: "",
  zodiac: null,
  lifePath: null
};

var TAROT_API = "https://small-recipe-9345.atlia0318.workers.dev/tarot";
var TAROT_TIMEOUT_MS = 45000;
var deepReadingState = {
  loading: false,
  session: 0
};

function reduceToCore(n) { // 11·22는 보존, 그 외엔 한 자리로 축약
  while (n > 9 && n !== 11 && n !== 22)
    n = String(n).split("").reduce((a, b) => a + +b, 0);
  return n;
}

function getLifePath(dateStr) { // "1990-03-18"
  let n = dateStr.replace(/\D/g, "").split("").reduce((a, b) => a + +b, 0);
  return reduceToCore(n);
}

function getReadingNumber(drawnArr) {
  var sum = drawnArr.reduce(function (acc, entry) {
    return acc + entry.card.number;
  }, 0);
  return reduceToCore(sum);
}

function getZodiac(month, day) {
  return ZODIAC_SIGNS.find(z => {
    const [sm, sd] = z.start, [em, ed] = z.end;
    if (sm <= em) return (month === sm && day >= sd) || (month === em && day <= ed) || (month > sm && month < em);
    // 연도 걸침(염소자리 12/25~1/19)
    return (month === sm && day >= sd) || (month === em && day <= ed);
  });
}

function showScreen(id) {
  var screens = document.querySelectorAll(".screen");
  screens.forEach(function (screen) {
    screen.classList.remove("active");
  });
  var target = document.getElementById("screen-" + id);
  if (target) {
    target.classList.add("active");
  }
}

function pureumSay(text) {
  var activeScreen = document.querySelector(".screen.active");
  if (!activeScreen) return;
  var bubble = activeScreen.querySelector(".pureum-guide .bubble");
  if (bubble) {
    bubble.textContent = text;
  }
}

// ===== Task 5: 셔플 + 부채꼴 78장 선택 =====

var drawn = [];
var shuffledDeck = [];
var selectState = {
  fanned: false,
  shuffling: false
};
var selectSession = 0;
var readingSession = 0;

function startReveal(drawnArr) {
  readingSession++;
  var session = readingSession;

  deepReadingState.loading = false;
  deepReadingState.session = session;
  var deepResultEl = document.getElementById("deep-reading-result");
  if (deepResultEl) deepResultEl.innerHTML = "";
  var deepBtn = document.getElementById("btn-deep-reading");
  if (deepBtn) {
    deepBtn.hidden = false;
    deepBtn.disabled = false;
    deepBtn.textContent = "심층 리딩 보기";
  }

  showScreen("reading");
  pureumSay("카드를 펼쳐요.");

  var spreadContainer = document.getElementById("spread-container");
  var overlay = document.getElementById("card-detail-overlay");
  if (overlay) overlay.classList.remove("open");
  if (!spreadContainer) return;
  spreadContainer.innerHTML = "";

  var flipEls = drawnArr.map(function (entry, i) {
    var wrap = document.createElement("div");
    wrap.className = "reading-card-wrap";

    var label = document.createElement("div");
    label.className = "reading-position-label";
    label.textContent = "①②③④⑤"[i] + " " + entry.position;
    wrap.appendChild(label);

    var flip = document.createElement("div");
    flip.className = "reading-card-flip";

    var inner = document.createElement("div");
    inner.className = "reading-card-inner";

    var faceBack = document.createElement("div");
    faceBack.className = "reading-card-face face-back card-back";

    var faceFront = document.createElement("div");
    faceFront.className = "reading-card-face face-front" + (entry.reversed ? " is-reversed" : "");
    var img = document.createElement("img");
    img.src = "/tarot/images/cards/" + entry.card.code + ".jpg";
    img.alt = entry.card.nameKo;
    faceFront.appendChild(img);

    inner.appendChild(faceBack);
    inner.appendChild(faceFront);
    flip.appendChild(inner);
    wrap.appendChild(flip);

    if (entry.reversed) {
      var badge = document.createElement("div");
      badge.className = "reading-reversed-badge";
      badge.textContent = "역방향";
      badge.style.visibility = "hidden";
      wrap.appendChild(badge);
      flip.dataset.hasBadge = "1";
    }

    flip.addEventListener("click", function () {
      if (!flip.classList.contains("flipped")) return;
      openCardDetail(entry);
    });

    spreadContainer.appendChild(wrap);
    return { flip: flip, wrap: wrap, entry: entry };
  });

  buildSummaryBar(drawnArr);

  flipEls.forEach(function (item, i) {
    setTimeout(function () {
      if (session !== readingSession) return;
      item.flip.classList.add("flipped");
      if (item.entry.reversed) {
        var badgeEl = item.wrap.querySelector(".reading-reversed-badge");
        if (badgeEl) {
          setTimeout(function () {
            if (session !== readingSession) return;
            badgeEl.style.visibility = "visible";
          }, 600);
        }
      }
      if (i === flipEls.length - 1) {
        setTimeout(function () {
          if (session !== readingSession) return;
          pureumSay("카드를 탭하면 자세히 볼 수 있어요.");
        }, 650);
      }
    }, i * 600);
  });
}

function reduceNumberForDisplay(number) {
  if (number === 0) return null; // 바보 카드는 고정 문구 처리
  return reduceToCore(number);
}

function openCardDetail(entry) {
  var overlay = document.getElementById("card-detail-overlay");
  var body = document.getElementById("card-detail-body");
  if (!overlay || !body) return;

  var card = entry.card;
  var direction = entry.reversed ? "역방향" : "정방향";
  var text = entry.reversed ? card.reversed : card.upright;

  var numerologyHtml;
  if (card.number === 0) {
    numerologyHtml = "수비학 0 — 0 · 무한한 가능성, 시작 이전의 자유";
  } else {
    var core = reduceToCore(card.number);
    var num = NUMEROLOGY[core];
    numerologyHtml = "수비학 " + core + (num ? ": " + num.title + " — " + num.meaning : "");
  }

  var keywordsHtml = (card.keywords || []).slice(0, 3).map(function (kw) {
    return '<span class="keyword-chip">' + kw + "</span>";
  }).join("");

  body.innerHTML =
    "<h3>" + card.nameKo + "(" + card.nameEn + ")</h3>" +
    '<p class="detail-en">' + card.nameEn + "</p>" +
    '<div class="detail-direction">' + direction + "</div>" +
    '<p class="detail-text">' + text + "</p>" +
    '<div class="detail-keywords">' + keywordsHtml + "</div>" +
    '<p class="detail-astro">점성학: ' + card.astro + "</p>" +
    '<p class="detail-numerology">' + numerologyHtml + "</p>";

  overlay.classList.add("open");
}

function closeCardDetail() {
  var overlay = document.getElementById("card-detail-overlay");
  if (overlay) overlay.classList.remove("open");
}

function buildSummaryBar(drawnArr) {
  var bar = document.getElementById("summary-bar");
  if (!bar) return;
  bar.innerHTML = "";

  if (state.zodiac) {
    var zodiacChip = document.createElement("button");
    zodiacChip.className = "summary-chip";
    zodiacChip.textContent = "내 별자리 " + state.zodiac.name + "(" + state.zodiac.element + ")";
    zodiacChip.addEventListener("click", function () {
      pureumSay(state.zodiac.name + "는 " + state.zodiac.element + " 원소의 별자리예요.");
    });
    bar.appendChild(zodiacChip);
  }

  if (state.lifePath) {
    var lp = state.lifePath;
    var lpInfo = NUMEROLOGY[lp];
    var lpChip = document.createElement("button");
    lpChip.className = "summary-chip";
    lpChip.textContent = "라이프패스 " + lp + " " + (lpInfo ? lpInfo.title : "");
    lpChip.addEventListener("click", function () {
      pureumSay(lpInfo ? lpInfo.meaning : "");
    });
    bar.appendChild(lpChip);
  }

  var readingNum = getReadingNumber(drawnArr);
  var rnInfo = NUMEROLOGY[readingNum];
  var rnChip = document.createElement("button");
  rnChip.className = "summary-chip";
  rnChip.textContent = "리딩 넘버 " + readingNum + " " + (rnInfo ? rnInfo.title : "");
  rnChip.addEventListener("click", function () {
    pureumSay(rnInfo ? rnInfo.meaning : "");
  });
  bar.appendChild(rnChip);
}

// ===== Task 8: 심층 리딩 (워커 API 연동) =====

function buildTarotPayload(drawnArr) {
  return {
    situation: state.situation || "",
    cards: drawnArr.map(function (entry) {
      return {
        name: entry.card.nameKo + " (" + entry.card.nameEn + ")",
        position: entry.position,
        reversed: entry.reversed,
        astro: entry.card.astro,
        number: entry.card.number
      };
    }),
    zodiac: (state.zodiac && state.zodiac.name) || null,
    lifePath: state.lifePath,
    readingNumber: getReadingNumber(drawnArr)
  };
}

function renderDeepReadingText(container, text) {
  container.innerHTML = "";
  var wrap = document.createElement("div");
  wrap.className = "deep-reading-text";

  var paragraphs = text.split(/\n\n+/).reduce(function (acc, block) {
    return acc.concat(block.split(/\n/));
  }, []).map(function (p) { return p.trim(); }).filter(Boolean);

  paragraphs.forEach(function (p) {
    var pEl = document.createElement("p");
    pEl.textContent = p;
    wrap.appendChild(pEl);
  });

  container.appendChild(wrap);
}

function renderDeepReadingLoading(container) {
  container.innerHTML = "";
  var loading = document.createElement("div");
  loading.className = "deep-loading";
  for (var i = 0; i < 3; i++) {
    var dot = document.createElement("div");
    dot.className = "dot";
    loading.appendChild(dot);
  }
  container.appendChild(loading);
}

function renderDeepReadingError(container, onRetry) {
  container.innerHTML = "";
  var wrap = document.createElement("div");
  wrap.className = "deep-error";

  var msg = document.createElement("p");
  msg.textContent = "심층 해석을 불러오지 못했어요.";
  wrap.appendChild(msg);

  var retryBtn = document.createElement("button");
  retryBtn.id = "btn-deep-retry";
  retryBtn.textContent = "다시 시도";
  retryBtn.addEventListener("click", onRetry);
  wrap.appendChild(retryBtn);

  container.appendChild(wrap);
}

function requestDeepReading(drawnArr) {
  if (deepReadingState.loading) return;

  var session = readingSession;
  var btn = document.getElementById("btn-deep-reading");
  var resultEl = document.getElementById("deep-reading-result");
  if (!resultEl) return;

  deepReadingState.loading = true;
  deepReadingState.session = session;
  if (btn) {
    btn.disabled = true;
    btn.textContent = "리딩 중...";
  }
  renderDeepReadingLoading(resultEl);
  pureumSay("카드 읽는 중...");

  var controller = ("AbortController" in window) ? new AbortController() : null;
  var timeoutId = setTimeout(function () {
    if (controller) controller.abort();
  }, TAROT_TIMEOUT_MS);

  var payload = buildTarotPayload(drawnArr);

  // 이 요청이 loading 플래그를 해제해도 되는지: 그사이 새 세션(startReveal)이
  // 시작되어 deepReadingState.session이 바뀌지 않았을 때만 허용한다.
  function releaseLoadingIfOwner() {
    if (deepReadingState.session === session) {
      deepReadingState.loading = false;
    }
  }

  fetch(TAROT_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: controller ? controller.signal : undefined
  }).then(function (res) {
    clearTimeout(timeoutId);
    if (!res.ok) {
      return res.json().catch(function () { return {}; }).then(function () {
        throw new Error("http-error");
      });
    }
    return res.json();
  }).then(function (data) {
    clearTimeout(timeoutId);
    releaseLoadingIfOwner();
    if (session !== readingSession) return; // 재진입 가드: DOM은 건드리지 않음

    if (!data || typeof data.reading !== "string" || !data.reading.trim()) {
      if (btn) btn.hidden = true;
      renderDeepReadingError(resultEl, function () { requestDeepReading(drawnArr); });
      pureumSay("연결이 좋지 않아요. 다시 시도해요.");
      return;
    }

    renderDeepReadingText(resultEl, data.reading);
    pureumSay("리딩 전달 완료");
    if (btn) {
      btn.hidden = false;
      btn.disabled = false;
      btn.textContent = "다시 읽기";
    }
  }).catch(function () {
    clearTimeout(timeoutId);
    releaseLoadingIfOwner();
    if (session !== readingSession) return; // 재진입 가드: DOM은 건드리지 않음

    if (btn) btn.hidden = true;
    renderDeepReadingError(resultEl, function () { requestDeepReading(drawnArr); });
    pureumSay("연결이 좋지 않아요. 다시 시도해요.");
  });
}

function fisherYatesShuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

function initSelectScreen() {
  selectSession++;

  drawn = [];
  shuffledDeck = [];
  selectState.fanned = false;
  selectState.shuffling = false;

  var screenSelect = document.getElementById("screen-select");
  var fanContainer = document.getElementById("fan-container");
  var deckEl = document.getElementById("card-deck");

  if (screenSelect) {
    screenSelect.classList.remove("fan-open", "deck-hidden");
  }
  if (fanContainer) {
    fanContainer.innerHTML = "";
    fanContainer.scrollLeft = 0;
  }
  if (deckEl) {
    deckEl.classList.remove("shuffling");
  }

  document.querySelectorAll("#slot-bar .slot").forEach(function (slot, i) {
    slot.classList.remove("filled");
    var label = slot.querySelector(".slot-label");
    if (label) label.textContent = SPREAD_POSITIONS[i] || "";
    var existingCard = slot.querySelector(".slot-card");
    if (existingCard) existingCard.remove();
  });

  document.querySelectorAll(".card-clone").forEach(function (clone) {
    clone.remove();
  });

  pureumSay("마음속으로 질문을 떠올리고 카드를 섞어요.");

  var btnShuffle = document.getElementById("btn-shuffle");
  if (btnShuffle) {
    btnShuffle.disabled = false;
  }
}

function buildFan() {
  var fanContainer = document.getElementById("fan-container");
  if (!fanContainer) return;
  fanContainer.innerHTML = "";

  var track = document.createElement("div");
  track.id = "fan-track";

  var count = shuffledDeck.length; // 78
  var cardStep = 22; // 간격(px)
  var totalWidth = (count - 1) * cardStep + 64;
  track.style.width = totalWidth + "px";

  var maxAngle = 14; // ±14도
  var mid = (count - 1) / 2;

  shuffledDeck.forEach(function (entry, i) {
    var el = document.createElement("div");
    el.className = "fan-card card-back";
    el.dataset.index = String(i);
    el.style.left = (i * cardStep) + "px";

    var t = (i - mid) / mid; // -1 ~ 1
    var angle = t * maxAngle;
    var arcLift = Math.abs(t) * Math.abs(t) * 18; // 호 곡률(중앙이 더 위로)
    el.style.transform = "rotate(" + angle.toFixed(2) + "deg) translateY(" + (-((18 - arcLift))) + "px)";
    el.dataset.angle = angle.toFixed(2);
    el.dataset.lift = String(-(18 - arcLift));

    el.addEventListener("click", onFanCardTap);

    track.appendChild(el);
  });

  fanContainer.appendChild(track);
  // 중앙으로 스크롤 위치 초기화
  fanContainer.scrollLeft = (totalWidth - fanContainer.clientWidth) / 2;
}

function onFanCardTap(e) {
  var el = e.currentTarget;
  if (el.classList.contains("picked")) return;
  if (drawn.length >= 5) return;

  var index = parseInt(el.dataset.index, 10);
  var entry = shuffledDeck[index];
  var slotIndex = drawn.length;
  var session = selectSession;

  el.classList.add("picked", "raised");
  el.style.pointerEvents = "none";

  var startRect = el.getBoundingClientRect();

  // 살짝 떠오르는 강조 먼저 보여준 뒤 클론 생성(원본은 곧바로 숨김 처리됨)
  var clone = document.createElement("div");
  clone.className = "card-clone card-back";
  clone.style.left = startRect.left + "px";
  clone.style.top = startRect.top + "px";
  clone.style.width = startRect.width + "px";
  clone.style.height = startRect.height + "px";
  clone.style.transform = "translateY(-12px) rotate(" + (el.dataset.angle || 0) + "deg)";
  document.body.appendChild(clone);

  requestAnimationFrame(function () {
    if (session !== selectSession) { clone.remove(); return; }
    setTimeout(function () {
      if (session !== selectSession) { clone.remove(); return; }
      var slotEl = document.querySelector('.slot[data-slot="' + slotIndex + '"]');
      if (!slotEl) {
        clone.remove();
        return;
      }
      var slotRect = slotEl.getBoundingClientRect();

      clone.style.transform = "translate(0, 0) rotate(0deg)";
      clone.style.left = slotRect.left + "px";
      clone.style.top = slotRect.top + "px";
      clone.style.width = slotRect.width + "px";
      clone.style.height = slotRect.height + "px";

      setTimeout(function () {
        if (session !== selectSession) { clone.remove(); return; }
        slotEl.classList.add("filled");
        var slotCard = document.createElement("div");
        slotCard.className = "slot-card card-back";
        slotEl.appendChild(slotCard);
        clone.remove();
      }, 400);
    }, 150);
  });

  drawn.push({
    card: entry.card,
    reversed: entry.reversed,
    position: SPREAD_POSITIONS[slotIndex]
  });

  var remaining = 5 - drawn.length;
  if (remaining > 0) {
    pureumSay(remaining + "장 남았어요");
  } else {
    pureumSay("다 골랐어요. 카드를 펼쳐요.");
    var revealDrawn = drawn;
    setTimeout(function () {
      if (session !== selectSession) return;
      startReveal(revealDrawn);
    }, 500);
  }
}

function initShuffleAndFan() {
  var btnShuffle = document.getElementById("btn-shuffle");
  if (!btnShuffle) return;

  btnShuffle.addEventListener("click", function () {
    if (selectState.shuffling || selectState.fanned) return;
    selectState.shuffling = true;
    btnShuffle.disabled = true;
    var session = selectSession;

    var order = fisherYatesShuffle(TAROT_CARDS);
    shuffledDeck = order.map(function (card) {
      return { card: card, reversed: Math.random() < 0.5 };
    });

    var deckEl = document.getElementById("card-deck");
    if (deckEl) {
      deckEl.classList.add("shuffling");
    }

    setTimeout(function () {
      if (session !== selectSession) return;
      selectState.shuffling = false;
      selectState.fanned = true;

      var screenSelect = document.getElementById("screen-select");
      if (screenSelect) {
        screenSelect.classList.add("deck-hidden", "fan-open");
      }

      buildFan();
      pureumSay("5장 골라요.");
    }, 800);
  });
}

document.addEventListener("DOMContentLoaded", function () {
  showScreen("intro");
  pureumSay("심연의 타로예요. 준비되면 시작해요.");

  var btnStart = document.getElementById("btn-start");
  if (btnStart) {
    btnStart.addEventListener("click", function () {
      var birthInput = document.getElementById("input-birth");
      var situationInput = document.getElementById("input-situation");

      var birthVal = birthInput ? birthInput.value : "";
      var situationVal = situationInput ? situationInput.value.trim() : "";

      state.situation = situationVal;

      if (birthVal) {
        state.birth = birthVal;
        var parts = birthVal.split("-");
        var month = parseInt(parts[1], 10);
        var day = parseInt(parts[2], 10);
        var zodiac = getZodiac(month, day);
        state.zodiac = zodiac ? { name: zodiac.name, element: zodiac.element } : null;
        state.lifePath = getLifePath(birthVal);
      } else {
        state.birth = null;
        state.zodiac = null;
        state.lifePath = null;
      }

      showScreen("select");
      initSelectScreen();

      if (state.birth && state.zodiac && state.lifePath) {
        pureumSay(state.zodiac.name + ", 라이프패스 " + state.lifePath + ". 마음속으로 질문을 떠올리고 카드를 섞어요.");
      }
    });
  }

  initShuffleAndFan();

  var overlay = document.getElementById("card-detail-overlay");
  var closeBtn = document.getElementById("card-detail-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", closeCardDetail);
  }
  if (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeCardDetail();
    });
  }

  var btnDeepReading = document.getElementById("btn-deep-reading");
  if (btnDeepReading) {
    btnDeepReading.addEventListener("click", function () {
      requestDeepReading(drawn);
    });
  }
});
