/*************************************************
 * 変数
 *************************************************/
let startY = 0;
let startX = 0;

let cardList;
let bgImg;
let fade;
let decideBtn;

let isDragging = false;
let velocityY = 0;
let lastY = 0;
let lastTime = 0;
let momentumTimer = null;

let isStartMode = false;
let isCharacterMode = false;
let chrList = ["FF", "AK", "SA"];
let chrIdx = 1; // AK
let filteredEvtData = [];
let preloadPromise = null;
const imageCache = {};

/*************************************************
 * シーズンカラー
 *************************************************/

const ssnData = [

  // ホタル
  { ssnId: "FF-S1", ssnLv: "3"},
  { ssnId: "FF-S2", ssnLv: "2"},
  { ssnId: "FF-S3", ssnLv: "4"},
  { ssnId: "FF-S4", ssnLv: "5"},

  // 小豆沢こはね
  { ssnId: "AK-S1", ssnLv: "1"},
  { ssnId: "AK-S2", ssnLv: "3"},
  { ssnId: "AK-S3", ssnLv: "4"},
  { ssnId: "AK-S4", ssnLv: "5"},

  // 白石杏
  { ssnId: "SA-S1", ssnLv: "3"},
  { ssnId: "SA-S2", ssnLv: "2"},
  { ssnId: "SA-S3", ssnLv: "1"},
  { ssnId: "SA-S4", ssnLv: "5"},

];

/*************************************************
 * 画像プリロード
 *************************************************/
function preloadAllImages() {

  if (preloadPromise) return preloadPromise;

  const urls = [];

  const preloadStage =
    document.getElementById("preloadImageStage");

  evtData.forEach(evt => {
    evt.cpt.forEach(cpt => {

      urls.push('../data/' + evt.evtId + '/bnr.png');

      urls.push('../data/' + evt.evtId + '/CPT-' + cpt.cptId + '/sel.png');

    });
  });

  preloadPromise = Promise.all(

    urls.map(url => {

      return new Promise(resolve => {

        const img = new Image();

        imageCache[url] = img;

        img.onload = async () => {
          try {
            if (img.decode) {
              await img.decode();
            }
          } catch (e) {
          }

          resolve();
        };

        img.onerror = resolve;

        img.src = url;

        img.alt = "";
        img.dataset.preloadSrc = url;

        if (preloadStage) {
          preloadStage.appendChild(img);
        }

      });

    })

  );

  return preloadPromise;
}

/*************************************************
 * カード生成
 *************************************************/
function createCards() {
  filteredEvtData.forEach((data, i) => {
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

//    const seasonTag = document.createElement("div");
//    seasonTag.className = "seasonTag";
//
//    // evtId の5文字目 → シーズン番号
//    const seasonNo = data.evtId.charAt(4);
//
//    seasonTag.textContent = "シーズン" + seasonNo;
//
//    /* ===== シーズンLv取得 ===== */
//    const ssn = ssnData.find(ssn =>
//      data.evtId.startsWith(ssn.ssnId)
//    );
//
//    seasonTag.classList.add(`ssnLv-${ssn.ssnLv}`);

    const label = document.createElement("div");
    label.className = "label";

    const first = data.evtNm.charAt(0);
    const rest = data.evtNm.slice(1);

    const span = document.createElement("span");
    span.className = "labelFirst";
    span.textContent = first;

    const modeType = data.evtId.charAt(3);

    if (modeType === "N") {
      span.style.color = "#ffd84a";
    }
    else if (modeType === "D") {
      span.style.color = "#82A4FF";
    }
    else if (modeType === "L") {
      span.style.color = "#ff7ab8";
    }

    label.appendChild(span);
    label.append(rest);

    const diamondWrap = document.createElement("div");
    diamondWrap.className = "cardChapterIcons";

    data.cpt.forEach((cpt, cIdx) => {

      const diamond = document.createElement("div");

      diamond.className =
        "chapterDiamond ext-" + cpt.extLv;

      // 現在選択中だけ光らせる
      if (i === evtIdx && cIdx === cptIdx) {
        diamond.classList.add("active");
      }

      diamondWrap.appendChild(diamond);

    });

//    inner.appendChild(seasonTag);

    inner.appendChild(diamondWrap);

    inner.appendChild(border);
    inner.appendChild(label);

    div.appendChild(inner);

    div.addEventListener("click", () => {
      if (momentumTimer) {
        cancelAnimationFrame(momentumTimer);
        momentumTimer = null;
      }

      if (isCharacterMode) {
        isCharacterMode = false;
        applyCharacterMode();
        requestAnimationFrame(updateCharHighlight);
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
  tgtEvtData = filteredEvtData[evtIdx];
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
  
  // カード再描画で◇のactive更新
  const diamonds = document.querySelectorAll(".chapterDiamond");

  diamonds.forEach(d => {
    d.classList.remove("active");
  });

  if (activeCard) {
    const currentDiamonds =
      activeCard.querySelectorAll(".chapterDiamond");

    if (currentDiamonds[cptIdx]) {
      currentDiamonds[cptIdx].classList.add("active");
    }
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
    decideBtn.classList.add("decideBtn-fade-out");

    /* blur開始を一旦止める */
    sidebar.classList.add("delay-blur");

    requestAnimationFrame(() => {

      /* 先にカードだけ出す */
      sidebar.classList.remove("force-hidden");

      /* 少し遅れてblur解放 */
      setTimeout(() => {
        sidebar.classList.remove("delay-blur");
        decideBtn.classList.remove("decideBtn-fade-out");
      }, 450);

    });
  }
}

let isDeciding = false;

function applyCharacterMode() {
  const viewport = document.getElementById("viewport");

  if (isCharacterMode) {
    viewport.classList.add("character-mode");
  } else {
    viewport.classList.remove("character-mode");
  }
}
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
    location.href = './event.html?chrId=' + chrId + '&evtId=' + tgtEvtData.evtId + '&cptId=' + tgtEvtData.cpt[cptIdx].cptId + '&autoFlg=' + autoFlg + '&debugMovId=';
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
    if (!isDragging) return;
    isDragging = false;

    const dy = e.changedTouches[0].clientY - startY;
    const dx = e.changedTouches[0].clientX - startX;

    // ===== 横スワイプ（cpt切替） =====
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {

      // 右→左（次のcpt）
      if (dx < 0) {

        if (cptIdx < tgtEvtData.cpt.length - 1) {
          cptIdx++;
          updateSelection(true, "left", "chapter");
        }

      }

      // 左→右（前のcpt）
      else {

        // ===== start mode解除 =====
        if (isStartMode) {

          isStartMode = false;

          updateSelection(false);

          applyMode();

          return;
        }

        if (cptIdx > 0) {

          cptIdx--;
          updateSelection(true, "right", "chapter");
        }
      }

      return;
    }

    // ===== 縦スワイプ（evt切替） =====
    if (Math.abs(dy) > 40) {

      if (isCharacterMode) {

        if (Math.abs(dy) > 40) {

          if (dy > 0) {
            changeCharacter(-1);
          } else {
            changeCharacter(1);
          }

        }

        return;
      }else{

        if (dy > 0 && evtIdx > 0) {
          evtIdx--;
          cptIdx = 0;
          updateSelection(true, "left", "event");
        }
        else if (dy < 0 && evtIdx < filteredEvtData.length - 1) {
          evtIdx++;
          cptIdx = 0;
          updateSelection(true, "left", "event");
        }
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

  const charModeToggle =
    document.getElementById("charModeToggle");

  charModeToggle.addEventListener("click", e => {

    e.stopPropagation();

    isCharacterMode = !isCharacterMode;

    applyCharacterMode();

    if (isCharacterMode) {
      requestAnimationFrame(updateCharHighlight);
    }

  });

  document.querySelectorAll(".charItem").forEach((el, i) => {

    el.addEventListener("click", e => {
      e.stopPropagation();

      if (i === chrIdx) return;

      const diff = i - chrIdx;

      changeCharacter(diff);
    });

  });

  const modeSelector = document.getElementById("modeSelector");

  modeSelector.addEventListener("click", e => {
    e.stopPropagation();

    if (modeKbn === "L") {
      modeKbn = "N";
    } else if (modeKbn === "N") {
      modeKbn = "D";
    } else {
      modeKbn = "L";
    }

    updateModeSelector();

    cardList.classList.add("card-fade-out");

    setTimeout(() => {

      updateFilteredEvents();

      evtIdx = 0;
      cptIdx = 0;

      cardList.innerHTML = "";
      createCards();

      updateSelection(true, "left", "event");

      cardList.classList.remove("card-fade-out");

      requestAnimationFrame(() => {
        cardList.classList.add("card-fade-in-active");

        setTimeout(() => {
          cardList.classList.remove("card-fade-in-active");
        }, 250);
      });

    }, 200);
  });

}

/*************************************************
 * ハイライト
 *************************************************/
function updateCharHighlight() {

  const selector = document.getElementById("characterSelector");
  const highlight = document.getElementById("charHighlight");
  const active = document.querySelector(".charItem.active");

  if (!selector || !highlight || !active) return;

  const parentRect = selector.getBoundingClientRect();
  const rect = active.getBoundingClientRect();

  // ★ 中央位置を計算
  const centerY = rect.top + rect.height / 2;

  // ★ highlightの高さの半分を引く
  const highlightHalf = highlight.offsetHeight / 2;

  const top = centerY - parentRect.top - highlightHalf;

  highlight.style.top = top + "px";

  // 色
  const chr = active.dataset.chr;

  if (chr === "AK") highlight.style.backgroundColor = "#ff6699";
  if (chr === "SA") highlight.style.backgroundColor = "#00bbdd";
  if (chr === "FF") highlight.style.backgroundColor = "#00cc66";
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
 * モード選択
 *************************************************/
function updateModeSelector() {
  const modeSelector = document.getElementById("modeSelector");
  const modeText = document.getElementById("modeText");
  const modeIcon = document.getElementById("modeIcon");

  modeSelector.classList.remove(
    "normMode",
    "discMode",
    "loveMode",
    "mode-changing"
  );

  if (modeKbn === "N") {
    modeSelector.classList.add("normMode");
    modeText.textContent = "通常モード";
    modeIcon.src = "../img/normMode.png";
  } else if (modeKbn === "D") {
    modeSelector.classList.add("discMode");
    modeText.textContent = "調教モード";
    modeIcon.src = "../img/discMode.png";
  } else {
    modeSelector.classList.add("loveMode");
    modeText.textContent = "恋愛モード";
    modeIcon.src = "../img/loveMode.png";
  }

  requestAnimationFrame(() => {
    modeSelector.classList.add("mode-changing");

    setTimeout(() => {
      modeSelector.classList.remove("mode-changing");
    }, 220);
  });
}

/*************************************************
 * イベントフィルター
 *************************************************/
function updateFilteredEvents() {

  filteredEvtData = evtData.filter(evt =>
    evt.evtId.startsWith(chrId) &&
    evt.evtId.charAt(3) === modeKbn
  );

  const index = filteredEvtData.findIndex(evt =>
    evt.evtId === evtId
  );

  if (index !== -1) {
    evtIdx = index;
  } else {
    evtIdx = 0;
  }
}

/*************************************************
 * キャラクター変更
 *************************************************/
function changeCharacter(dir) {

  if (chrIdx + dir < 0 || chrIdx + dir > 2) {
    return;
  }

  chrIdx += dir;

  chrId = chrList[chrIdx];

  // active更新
  document.querySelectorAll(".charItem").forEach((el, i) => {
    el.classList.toggle("active", i === chrIdx);
  });

  updateCharHighlight();

  /* ===== フェードアウト ===== */
  cardList.classList.add("card-fade-out");
  decideBtn.classList.add("decideBtn-fade-out");

  setTimeout(() => {

    /* ===== 中身更新（今まで通り） ===== */
    updateFilteredEvents();
    updateDecideButton();

    cardList.innerHTML = "";
    createCards();

    evtIdx = 0;
    cptIdx = 0;

    updateSelection(true, "left", "event");

    /* ===== フェードイン準備 ===== */
    cardList.classList.remove("card-fade-out");
    decideBtn.classList.remove("decideBtn-fade-out");

    requestAnimationFrame(() => {

      /* ===== フェードイン実行 ===== */
      cardList.classList.add("card-fade-in-active");
      decideBtn.classList.add("decideBtn-fade-in-active");

      setTimeout(() => {
        cardList.classList.remove("card-fade-in-active");
        decideBtn.classList.remove("decideBtn-fade-in-active");
      }, 250);

    });

  }, 200);
}

/*************************************************
 * 初期値設定
 *************************************************/
function initCharacterActive() {

  const items = document.querySelectorAll(".charItem");

  items.forEach(el => {
    const chr = el.dataset.chr;
    el.classList.toggle("active", chr === chrId);
  });
  
  chrIdx = chrList.findIndex(chr => chr === chrId);
}

/*************************************************
 * ボタン変更
 *************************************************/
function updateDecideButton() {

  decideBtn.classList.remove(
    "decideBtn-hs",
    "decideBtn-ps"
  );

  if (chrId === "FF") {
    decideBtn.classList.add("decideBtn-hs");
  } else {
    decideBtn.classList.add("decideBtn-ps");
  }

}

/*************************************************
 * 初期化
 *************************************************/
window.addEventListener('load', function() {

  cardList = document.getElementById("cardList");
  bgImg = document.getElementById("bgImg");
  fade = document.getElementById("fade");
  decideBtn = document.getElementById("decideBtn");

  // パラメタ取得
  setParam();

  updateDecideButton();
  updateModeSelector();

  if (cptIdx >= 1) {
    isStartMode = true;
    
    const chapterText = document.getElementById("chapterText");
    if (chapterText) {
      chapterText.textContent = "Chapter " + tgtEvtData.cpt[cptIdx].cptId;
    }

/* ===== startMode色同期 ===== */
const chapterBadge =
  document.getElementById("chapterBadge");

  const extLv =
    tgtEvtData.cpt[cptIdx].extLv;

  // 既存ext-*削除
  chapterBadge.classList.remove(
    "ext-A",
    "ext-B",
    "ext-C",
    "ext-D",
    "ext-E"
  );

  // 新しいext追加
  chapterBadge.classList.add(`ext-${extLv}`);

  } else {
    isStartMode = false;
  }
  
  // 初期キャラ選択
  initCharacterActive();
  // フィルター生成
  updateFilteredEvents();
  // ハイライト
  updateCharHighlight();
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