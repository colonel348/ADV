/*************************************************
 * 変数
 *************************************************/
let startY = 0;

let cardList;
let bgImg;
let fade;

let isDragging = false;
let velocityY = 0;
let lastY = 0;
let lastTime = 0;
let momentumTimer = null;

/*************************************************
 * 画像プリロード
 *************************************************/
let preloadPromise = null;

function preloadAllImages() {
  if (preloadPromise) return preloadPromise;

  const urls = evtMap.map(evt =>
    '../media/' + chrId + '/' + evt.id + '/sel.png'
  );

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
  evtMap.forEach((evt, i) => {
    const div = document.createElement("div");
    div.className = "card";
    div.textContent = evt.name;

    // タップでそのカードへジャンプ
    div.addEventListener("click", () => {
      // 慣性停止
      if (momentumTimer) {
        cancelAnimationFrame(momentumTimer);
        momentumTimer = null;
      }

      // すでに選択中なら何もしない
      if (selIdx === i) return;

      selIdx = i;
      updateSelection(true);
    });

    cardList.appendChild(div);
  });
}

/*************************************************
 * 選択更新
 *************************************************/function updateSelection(animated = true) {
  const cards = document.querySelectorAll(".card");

  cards.forEach((c, i) => {
    c.classList.toggle("active", i === selIdx);
  });

  // ===== 実寸取得 =====
  const cardHeight = cards[0]?.offsetHeight + 28 || 90;
  const sidebarHeight = document.getElementById("sidebar").clientHeight;

  // ===== 左中央基準 =====
  const visibleOffset = (sidebarHeight / 2) - (cardHeight / 2);
  const offset = selIdx * cardHeight - visibleOffset;

  cardList.style.transform = `translateY(${-offset}px)`;

  // ===== 背景更新 =====
  evtData = evtMap[selIdx];
  const nextUrl = '../media/' + chrId + '/' + evtData.id + '/sel.png';

if (animated) {
  // ① フェードアウト（その場）
  bgImg.style.opacity = 0;

  setTimeout(() => {
    // ② 一度右外へ配置
    bgImg.style.transition = "none";
    bgImg.style.transform = "translate(-60px, -50%)";

    // ★ 強制リフロー（超重要）
    bgImg.offsetHeight;

    // ③ 画像差し替え
    bgImg.src = nextUrl;

    // ④ transition を戻す
    bgImg.style.transition = "transform .4s ease, opacity .4s ease";

    // ⑤ 右→左スライドイン
    requestAnimationFrame(() => {
      bgImg.style.opacity = 1;
      bgImg.style.transform = "translate(-20px, -50%)";
    });

  }, 180);

} else {
  bgImg.src = nextUrl;
  bgImg.style.opacity = 1;
  bgImg.style.transform = "translate(-20px, -50%)";
}
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

    // 通常スワイプ
    if (Math.abs(dy) > 40) {
      if (dy > 0 && selIdx > 0) {
        selIdx--;
        updateSelection();
      } else if (dy < 0 && selIdx < evtMap.length - 1) {
        selIdx++;
        updateSelection();
      }
      return;
    }

    // 慣性
    const speed = velocityY;
    if (Math.abs(speed) > 0.4) {
      startMomentum(speed);
    }
  }, {
    passive: true
  });

  // 決定ボタン
  const decideBtn = document.getElementById("decideBtn");
  let isDeciding = false;

  decideBtn.addEventListener("click", () => {
    if (isDeciding) return; // 二重押し防止
    isDeciding = true;

    evtData = evtMap[selIdx];

    // 押下アニメ
    decideBtn.classList.add("pressed", "disabled");

    // 少し待ってからフェード開始
    setTimeout(() => {
      fade.classList.add("show");
    }, 120);

    // 画面遷移
    setTimeout(() => {
      location.href = './event.html?chrId=' + chrId + '&selIdx=' + selIdx;
    }, 520);
  });

  // 戻るボタン
  document.getElementById("backBtn").addEventListener("click", () => {
    fade.classList.add("show");

    sleepSetTimeout(500, () => location.href = "../title.html");

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
      if (selIdx > 0) {
        selIdx--;
        updateSelection();
      }
    } else {
      if (selIdx < evtMap.length - 1) {
        selIdx++;
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
  // カード生成
  createCards();
  // 押下イベント
  touchAction();

  // 画像読込後に画面表示
  preloadAllImages().then(() => {
    updateSelection(false);
    sleepSetTimeout(500, () => document.getElementById('viewport').style.opacity = 1);
  });

});