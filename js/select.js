/*************************************************
 * 変数
 *************************************************/
let startY = 0;
let startX = 0;

let cardList;
let bgImg;
let fade;

let isDragging = false;
let velocityY = 0;
let lastY = 0;
let lastTime = 0;
let momentumTimer = null;

let isStartMode = false;

/*************************************************
 * 画像プリロード
 *************************************************/
let preloadPromise = null;

function preloadAllImages() {
  if (preloadPromise) return preloadPromise;

  const urls = [];
  evtData.forEach(evt => {
    evt.cpt.forEach(cpt => {
      urls.push('../data/' + evt.evtId + '/CPT-' + cpt.cptId + '/sel.png');
    });
  });

  preloadPromise = Promise.all(
    urls.map(url => {
      return new Promise(resolve => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = resolve;
        img.src = url;
      });
    })
  );

  return preloadPromise;
}

/*************************************************
 * カード生成
 *************************************************/
function createCards() {
  evtData.forEach((data, i) => {
    const div = document.createElement("div");
    div.className = "card";

    const inner = document.createElement("div");
    inner.className = "cardInner";

    // 背景画像をCSS変数で渡す
    inner.style.setProperty(
      "--card-bg",
      `url("../data/${data.evtId}/bnr.png")`
    );

    const border = document.createElement("div");
    border.className = "innerBorder";

    const label = document.createElement("div");
    label.className = "label";

    const first = data.evtNm.charAt(0);
    const rest = data.evtNm.slice(1);

    const span = document.createElement("span");
    span.className = "labelFirst";
    span.textContent = first;

    const prefix = data.evtId.substring(0,2);

    if(prefix === "AK"){
      span.style.color = "#FF6699";
    }
    else if(prefix === "SA"){
      span.style.color = "#00BBDD";
    }

    label.appendChild(span);
    label.append(rest);

    inner.appendChild(border);
    inner.appendChild(label);
    div.appendChild(inner);

    div.addEventListener("click", () => {
      if (momentumTimer) {
        cancelAnimationFrame(momentumTimer);
        momentumTimer = null;
      }

      if (evtIdx === i) return;

      evtIdx = i;
      cptIdx = 0;
      updateSelection(true, "left", "event");
    });

    cardList.appendChild(div);
  });
}

/*************************************************
 * チャプターアイコン更新種別
 *************************************************/
function updateChapterIcons(mode = "rebuild") {
  const wrap = document.getElementById("chapterIcons");
  if (!wrap) return;

  const evt = evtData[evtIdx];
  if (!evt || !evt.cpt) return;

  const currentCount = wrap.children.length;
  const nextCount = evt.cpt.length;

  // イベント切替時、または個数が違う場合は作り直し
  if (mode === "rebuild" || currentCount !== nextCount) {
    wrap.innerHTML = "";

    evt.cpt.forEach((cpt, i) => {
      const item = document.createElement("div");
      item.type = "div";
      item.className = "chapterIcon ext-" + cpt.extLv;
      item.dataset.index = i;

      if (i === cptIdx) {
        item.classList.add("active");
      }

      const circle = document.createElement("div");
      circle.className = "chapterCircle";
      circle.textContent = cpt.cptId;

      item.appendChild(circle);

      item.addEventListener("click", (e) => {
        e.stopPropagation();
        if (isStartMode) return;
        if (i === cptIdx) return;

        cptIdx = i;
        updateSelection(true, i > cptIdx ? "left" : "right", "chapter");
      });

      wrap.appendChild(item);
    });

    return;
  }

  // 同一イベント内のチャプター切替時は active だけ差し替え
  const icons = wrap.querySelectorAll(".chapterIcon");
  icons.forEach((icon, i) => {
    icon.classList.toggle("active", i === cptIdx);
  });
}

/*************************************************
 * チャプターアイコン フェードイン
 *************************************************/
function animateChapterIconsIn() {
  const wrap = document.getElementById("chapterIcons");
  if (!wrap) return;

  wrap.classList.remove("icons-enter");
  void wrap.offsetWidth; // 強制リフロー
  wrap.classList.add("icons-enter");
}

/*************************************************
 * 選択更新
 *************************************************/
function updateSelection(animated = true, slideDir = "left", changeType = "event") {
  const cards = document.querySelectorAll(".card");

  cards.forEach((c, i) => {
    c.classList.toggle("active", i === evtIdx);
  });

  const sidebar = document.getElementById("sidebar");
  const activeCard = cards[evtIdx];

  if (activeCard) {
    const sidebarHeight = sidebar.clientHeight;
    const activeTop = activeCard.offsetTop;
    const activeHeight = activeCard.offsetHeight;

    const offset = activeTop - ((sidebarHeight - activeHeight) / 2);
    cardList.style.transform = `translateY(${-offset}px)`;
  }

  // ===== 背景更新 =====
  tgtEvtData = evtData[evtIdx];
  const nextUrl = '../data/' + tgtEvtData.evtId + '/CPT-' + tgtEvtData.cpt[cptIdx].cptId + '/sel.png';

  if (animated) {
    bgImg.style.opacity = 0;

    setTimeout(() => {
      bgImg.style.transition = "none";

      // スライド方向ごとの開始位置
      // slideDir === "left"  : 右から入って左へ動く
      // slideDir === "right" : 左から入って右へ動く
      const startX = slideDir === "right" ? "60px" : "-60px";

      bgImg.style.transform = `translate(${startX}, -50%)`;

      // 強制リフロー
      bgImg.offsetHeight;

      // 画像差し替え
      bgImg.src = nextUrl;

      // transition を戻す
      bgImg.style.transition = "transform .4s ease, opacity .4s ease, filter .45s ease";

      requestAnimationFrame(() => {
        bgImg.style.opacity = 1;
        bgImg.style.transform = "translate(0px, -50%)";
      });
    }, 180);

  } else {
    bgImg.src = nextUrl;
    bgImg.style.opacity = 1;
    bgImg.style.transform = "translate(0px, -50%)";
  }

  if (changeType === "event") {
    updateChapterIcons("rebuild");
    animateChapterIconsIn();
  } else {
    updateChapterIcons("switch");
  }
}

/*************************************************
 * モード
 *************************************************/
function applyMode() {
  const viewport = document.getElementById("viewport");
  const startOverlay = document.getElementById("startOverlay");
  const sidebar = document.getElementById("sidebar");

  if (isStartMode) {
    viewport.classList.add("start-mode");
  } else {
    viewport.classList.remove("start-mode");
    // 通常へ戻るときサイドバーを左からスライドイン
    sidebar.classList.add("force-hidden");
    requestAnimationFrame(() => {
      sidebar.classList.remove("force-hidden");
    });
  }
}

let isDeciding = false;

/*************************************************
 * 次のイベント
 *************************************************/
function goToEvent() {
  if (isDeciding) return;
  isDeciding = true;

  const decideBtn = document.getElementById("decideBtn");
  if (decideBtn) decideBtn.classList.add("pressed", "disabled");

  // 少し待ってからフェード開始
  setTimeout(() => {
    fade.classList.add("show");
  }, 120);

  // 画面遷移
  setTimeout(() => {
    location.href = './event.html?&evtIdx=' + evtIdx + '&cptIdx=' + cptIdx;
  }, 520);
}

/*************************************************
 * タッチ処理
 *************************************************/
function touchAction() {

  const swipeArea = document.getElementById("viewport");

  let dragStartIndex = 0;
  let moved = false;

  // タッチ開始
  swipeArea.addEventListener("touchstart", e => {
  
    // ボタンやカードタップは除外
    if (e.target.closest("#decideBtn") || e.target.closest(".card")) return;

    isDragging = true;
    startY = e.touches[0].clientY;
    startX = e.touches[0].clientX;
    lastY = startY;
    lastTime = performance.now();
    velocityY = 0;

    if (momentumTimer) {
      cancelAnimationFrame(momentumTimer);
      momentumTimer = null;
    }
  }, {
    passive: true
  });


  // タッチ移動
  swipeArea.addEventListener("touchmove", e => {
    if (!isDragging) return;

    const y = e.touches[0].clientY;
    const now = performance.now();

    const dy = y - lastY;
    const dt = now - lastTime;

    if (dt > 0) {
      velocityY = dy / dt;
    }

    lastY = y;
    lastTime = now;
  }, {
    passive: true
  });

  // タッチ終了
  swipeArea.addEventListener("touchend", e => {
    if (isStartMode) return;
    if (!isDragging) return;
    isDragging = false;

    const dy = e.changedTouches[0].clientY - startY;
    const dx = e.changedTouches[0].clientX - startX;
    
    // 通常スワイプ
    const evt = evtData[evtIdx];

    // ===== 横スワイプ（cpt切替） =====
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {

      // 右→左（次のcpt）
      if (dx < 0) {
        if (cptIdx < evt.cpt.length - 1) {
          cptIdx++;
          updateSelection(true, "left", "chapter");
        }
      }
      // 左→右（前のcpt）
      else {
        if (cptIdx > 0) {
          cptIdx--;
          updateSelection(true, "right", "chapter");
        }
      }

      return;
    }

    // ===== 縦スワイプ（evt切替） =====
    if (Math.abs(dy) > 40) {

      if (dy > 0 && evtIdx > 0) {
        evtIdx--;
        cptIdx = 0;
        updateSelection(true, "left", "event");
      }
      else if (dy < 0 && evtIdx < evtData.length - 1) {
        evtIdx++;
        cptIdx = 0;
        updateSelection(true, "left", "event");
      }

      return;
    }

    // ===== 慣性 =====
    const speed = velocityY;
    if (Math.abs(speed) > 0.4) {
      startMomentum(speed);
    }

  }, {
    passive: true
  });

  // 決定ボタン
  const decideBtn = document.getElementById("decideBtn");
  decideBtn.addEventListener("click", goToEvent);

  // TAP TO STARTの画面タップ
  const startOverlay = document.getElementById("startOverlay");
  startOverlay.addEventListener("click", () => {
    if (!isStartMode) return;
    goToEvent();
  });

  document.getElementById("backBtn").addEventListener("click", (e) => {
    // startOverlayのclickへ伝播して遷移しないように
    e.stopPropagation();

    if (isStartMode) {
      // start → 通常へ
      isStartMode = false;
      updateSelection(false);
      applyMode();
      return;
    }

  });
}

/*************************************************
 * 慣性スクロール
 *************************************************/
function startMomentum(initialVelocity) {
  let v = initialVelocity;
  const friction = 0.94; // ← 少し強め減衰
  const minVelocity = 0.03; // ← 停止しやすく

  function step() {
    v *= friction;

    if (Math.abs(v) < minVelocity) {
      momentumTimer = null;
      return;
    }

    // 1フレームで複数枚飛ばないよう制御
    if (v > 0) {
      if (evtIdx > 0) {
        evtIdx--;
        updateSelection();
      }
    } else {
      if (evtIdx < evtData.length - 1) {
        evtIdx++;
        updateSelection();
      }
    }

    momentumTimer = requestAnimationFrame(step);
  }

  momentumTimer = requestAnimationFrame(step);
}

/*************************************************
 * 初期化
 *************************************************/
window.addEventListener('load', function() {

  cardList = document.getElementById("cardList");
  bgImg = document.getElementById("bgImg");
  fade = document.getElementById("fade");

  // パラメタ取得
  setParam();

  if (cptIdx >= 1) {
    isStartMode = true;
    
    const chapterText = document.getElementById("chapterText");
    if (chapterText) {
      chapterText.textContent = "Chapter " + tgtEvtData.cpt[cptIdx].cptId;
    }

  } else {
    isStartMode = false;
  }
  
  // カード生成
  createCards();
  // 押下イベント
  touchAction();

  // 画像読込後に画面表示
  preloadAllImages().then(() => {
    updateSelection(false, "left", "event");
    applyMode(); // ★追加
    sleepSetTimeout(500, () => document.getElementById('viewport').style.opacity = 1);
  });

});