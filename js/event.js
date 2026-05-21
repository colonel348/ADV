/*************************************************
 * 状態
 *************************************************/

let currentIndex = 0;

let currentData = null;

let videoA;
let videoL1;
let videoL2;

let activeLoopVideo = null;
let standbyLoopVideo = null;

let currentVideo = null;

let fade;

let isBusy = false;

let loopMin = 0;

let typingTimer = null;

let isTyping = false;

let fullText = "";

let isTitleShowing = false;

let pendingLoop = false;

const videoCache = {};

let moviePattern = "";

let loopWatchActive = false;

let waitMovie = false;
let waitItem = null;

let currentSrcL = "";

let isAutoMode = false;

let autoTimer = null;

let isSwipeMove = false;

// A動画終了何秒前に次を開始するか
const ACTION_SWITCH_BEFORE = 0.30;
// L動画終了何秒前に次を開始するか
const LOOP_SWITCH_BEFORE = 0.30;
// 次L動画play後
// fade開始まで待つms
const LOOP_FADE_WAIT = 230;
// fade時間
const LOOP_FADE_TIME = 500;
// fade時間
const BLACK_FADE_TIME = 500;

// 次段落への時間
const NEXT_EVT_TIME = 500;
// 次メッセージへの時間
const NEXT_TEXT_TIME = 4000;

// 長押しauto
const AUTO_PRESS_TIME = 1000;
// 長押し選択画面
const SELECT_PRESS_TIME = 12000;

/*************************************************
 * JS読込
 *************************************************/
function loadEvent() {

  return new Promise((resolve, reject) => {

    const script = document.createElement("script");

    script.src = `../data/${evtId}/msgData.js`;

    script.onload = () => {
      resolve(window.msgData);
    };

    script.onerror = reject;

    document.body.appendChild(script);

  });
}

/*************************************************
 * 動画プリロード
 *************************************************/
function preloadMovies() {

  currentData.msgInfo.forEach(item => {

    // 動画なし
    if (
      !item.movId ||
      item.movPtn === "N"
    ) {
      return;
    }

    // movIdごとの
    // パターン取得
    const pattern = item.movPtn;

    let sources = [];

    // --------------------
    // A→L
    // --------------------

    if (pattern === "AL") {

      sources = [

        `../data/${evtId}/CPT-${cptId}/${item.movId}-A.mp4`,

        `../data/${evtId}/CPT-${cptId}/${item.movId}-L.mp4`

      ];

    }

    // --------------------
    // Aのみ
    // --------------------

    else if (pattern === "A") {

      sources = [

        `../data/${evtId}/CPT-${cptId}/${item.movId}-A.mp4`

      ];

    }

    // --------------------
    // Lのみ
    // --------------------

    else if (pattern === "L") {

      sources = [

        `../data/${evtId}/CPT-${cptId}/${item.movId}-L.mp4`

      ];

    }

    sources.forEach(src => {

      // 重複防止
      if (videoCache[src]) return;

      const v =
        document.createElement("video");

      v.src = src;

      v.preload = "auto";

      v.muted = true;

      v.playsInline = true;

      v.setAttribute(
        "webkit-playsinline",
        "true"
      );

      // preload開始
      v.load();

      // キャッシュ保存
      videoCache[src] = v;

      // iOS向けwarmup
      const warmup = () => {

        v.play()
          .then(() => {

            v.pause();

            v.currentTime = 0;

          })
          .catch(() => {});

      };

      if (v.readyState >= 1) {

        warmup();

      } else {

        v.addEventListener(
          "loadedmetadata",
          warmup,
          { once: true }
        );

      }

    });

  });

}

/*************************************************
 * 初期化
 *************************************************/

window.addEventListener("load", () => {

  videoA = document.getElementById("videoA");
  videoL1 = document.getElementById("videoL1");
  videoL2 = document.getElementById("videoL2");

  activeLoopVideo = videoL1;
  standbyLoopVideo = videoL2;
  
  fade = document.getElementById("fade");

  init();

  // --------------------
  // click
  // --------------------
  document.body.addEventListener(
    "click",
    () => {

      nextStep();

    }
  );

  const autoBtn =
    document.getElementById("autoBtn");

  const skipBtn =
    document.getElementById("skipBtn");

  autoBtn.addEventListener(
    "click",
    e => {

      e.stopPropagation();

      isAutoMode = !isAutoMode;

      autoFlg = isAutoMode ? "1" : "0";

      autoBtn.classList.toggle(
        "active",
        isAutoMode
      );

      startAutoNext();

    }
  );

  skipBtn.addEventListener(
    "click",
    e => {

      e.stopPropagation();

      moveSelect();

    }
  );

  // --------------------
  // メッセージ表示切替
  // --------------------

  let touchStartY = 0;
  let touchStartX = 0;

  const controlArea =
    document.getElementById(
      "controlArea"
    );

  let menuVisible = false;

  document.body.addEventListener(
    "touchstart",
    e => {

      touchStartY =
        e.touches[0].clientY;

      touchStartX =
        e.touches[0].clientX;

    },
    {
      passive: true
    }
  );

  document.body.addEventListener(
    "touchend",
    e => {

      const dy =
        e.changedTouches[0].clientY
        - touchStartY;

      const dx =
        e.changedTouches[0].clientX
        - touchStartX;

      const msgArea =
        document.getElementById(
          "msgArea"
        );

      // --------------------
      // 上 → 下
      // --------------------

      if (dy > 80) {

        msgArea.classList.add(
          "msg-hidden"
        );

      }

      // --------------------
      // 下 → 上
      // --------------------

      else if (dy < -80) {

        msgArea.classList.remove(
          "msg-hidden"
        );

      }

      // --------------------
      // 右 → 左
      // --------------------

      else if (
        dx < -80 &&
        Math.abs(dx) > Math.abs(dy)
      ) {

        menuVisible = true;

        controlArea.classList.add("show");

      }

      // --------------------
      // 左 → 右
      // --------------------

      else if (
        dx > 80 &&
        Math.abs(dx) > Math.abs(dy)
      ) {

        menuVisible = false;

        controlArea.classList.remove("show");

      }

    },
    {
      passive: true
    }
  );

});

/*************************************************
 * 開始
 *************************************************/

async function init() {

  setParam();

  const msgData = await loadEvent();

  currentData = msgData.find(v => v.cptId === cptId);

  if (!currentData) {
    alert("データなし");
    return;
  }

  const chrName =
    document.getElementById("chrName");

  const msgArea =
    document.getElementById("msgArea");

  // 崩壊スターレイル
  if (chrId === "FF") {

    chrName.classList.add(
      "chrName-hs"
    );

    msgArea.classList.add(
      "msgArea-hs"
    );

  }

  // プロジェクトセカイ
  else {

    chrName.classList.add(
      "chrName-ps"
    );

    msgArea.classList.add(
      "msgArea-ps"
    );

  }

  // AUTO初期状態
  isAutoMode = autoFlg === "1";

  if (isAutoMode) {
    document.getElementById("autoBtn").classList.add("active");
  }

  // 動画事前読込
  preloadMovies();

  // 初回だけ1秒待つ
  setTimeout(() => {

    showTitle(currentData.title);

  }, 1000);

}

/*************************************************
 * 次へ
 *************************************************/

function nextStep() {

  // タイトル表示中
  if (isTitleShowing) {

    isTitleShowing = false;

    const area =
      document.getElementById("titleArea");

    area.classList.remove("show");

    setTimeout(() => {

      currentIndex++;

      showCurrent();

    }, 300);

    return;

  }

  // 動画切替中
  if (isBusy) return;

  // 文字送り中なら全文表示だけ
  if (isTyping) {

    finishTyping();

    return;
  }

  // 現在行
  const currentItem =
    currentData.msgInfo[currentIndex];

  if (!isAutoMode || !currentItem.movId) {

    // 現在メッセージを即fade-out
    document
      .getElementById("chrName")
      .classList.add("msg-fade");

    document
      .getElementById("msgBody")
      .classList.add("msg-fade");

  }


  // --------------------
  // A動画終了待機中
  // --------------------

  if (
    ["L", "B", "W"].includes(currentItem.msgId) &&
    currentVideo === videoA
  ) {

    return;

  }

  // --------------------
  // Aのみ最後待機
  // --------------------

  if (
    moviePattern === "A" &&
    currentVideo === videoA
  ) {

    // 次行確認
    const nextItem =
      currentData.msgInfo[currentIndex + 1];

    // 次がmovIdなら
    // 現在が最後A
    if (
      nextItem &&
      "movId" in nextItem
    ) {

      // メッセージ消す
      document
        .getElementById("chrName")
        .innerText = "";

      document
        .getElementById("msgBody")
        .innerHTML = "";

      return;

    }

  }

  currentIndex++;

  const item =
    currentData.msgInfo[currentIndex];

  // Lテキスト
  if (
    item &&
    item.msgId === "L" &&
    pendingLoop
  ) {

    startLoopDoubleBuffer(currentSrcL);

    pendingLoop = false;

    setTimeout(() => {

      setFade(false);

      currentVideo = activeLoopVideo;

      showCurrent();

    }, BLACK_FADE_TIME);

    return;

  } else if (
    item &&
    (item.msgId === "W" || item.msgId === "B") &&
    pendingLoop
  ) {

    setTimeout(() => {

      setFade(true, item.msgId);

      currentVideo = activeLoopVideo;

      showCurrent();

    }, BLACK_FADE_TIME);

    return;

  }

  if (currentIndex >= currentData.msgInfo.length) {

    const nextCpt = getNextCpt();

    // 画面遷移
    setTimeout(() => {
      location.href = './select.html?chrId=' + chrId + '&evtId=' + nextCpt.evtId + '&cptId=' + nextCpt.cptId + '&autoFlg=' + autoFlg;
    }, BLACK_FADE_TIME);

  }

  showCurrent();

}

/*************************************************
 * 次のチャプター取得
 *************************************************/
 function getNextCpt() {

  // 現在evtのindex
  const evtIndex =
    evtData.findIndex(
      v => v.evtId === evtId
    );

  // 見つからない
  if (evtIndex === -1) {
    return null;
  }

  const currentEvt =
    evtData[evtIndex];

  // --------------------
  // 同evt内の次cpt
  // --------------------

  const nextCpt =
    currentEvt.cpt.find(
      v => Number(v.cptId) === Number(cptId) + 1
    );

  // 次cpt存在
  if (nextCpt) {

    return {
      evtId: currentEvt.evtId,
      cptId: nextCpt.cptId
    };

  }

  // 現evt先頭cpt
  const firstCurrentCptId =
    currentEvt.cpt[0].cptId;

  // --------------------
  // 次evt確認
  // --------------------

  const nextEvt =
    evtData[evtIndex + 1];

  // 次evtなし
  if (!nextEvt) {

    return {
      evtId: currentEvt.evtId,
      cptId: firstCurrentCptId
    };

  }

  // 先頭2文字比較
  const currentPrefix =
    currentEvt.evtId.substring(0, 2);

  const nextPrefix =
    nextEvt.evtId.substring(0, 2);

  // 別キャラなら
  // 現evt先頭へ戻る
  if (currentPrefix !== nextPrefix) {

    return {
      evtId: currentEvt.evtId,
      cptId: firstCurrentCptId
    };

  }

  // 次evt先頭cpt
  return {
    evtId: nextEvt.evtId,
    cptId: nextEvt.cpt[0].cptId
  };

}

/*************************************************
 * AUTO進行
 *************************************************/
function startAutoNext() {

  clearTimeout(autoTimer);

  if (!isAutoMode) {
    return;
  }

  autoTimer = setTimeout(() => {

    nextStep();

  }, NEXT_TEXT_TIME);

}

/*************************************************
 * select遷移
 *************************************************/
function moveSelect() {

  setFade(true);

  setTimeout(() => {

    document.getElementById("msgArea").style.opacity = 0;
    document.getElementById("controlArea").style.opacity = 0;

  }, 300);

  const nextCpt = getNextCpt();

  // 画面遷移
  setTimeout(() => {
    location.href = './select.html?chrId=' + chrId + '&evtId=' + nextCpt.evtId + '&cptId=' + nextCpt.cptId + '&autoFlg=' + autoFlg;
  }, BLACK_FADE_TIME);

}

/*************************************************
 * fade制御
 *************************************************/
function setFade(show, color = null) {

  // --------------------
  // 色変更
  // --------------------

  if (color !== null) {

    fade.classList.toggle(
      "fade-white",
      color === "W"
    );

  }

  // --------------------
  // 表示
  // --------------------

  if (show) {

    fade.classList.add("show");

    return;

  }

  // --------------------
  // 非表示
  // --------------------

  if (fade.classList.contains("show")) {

    fade.classList.remove("show");

    // fade-out後に黒へ戻す
    setTimeout(() => {

        fade.classList.remove("fade-white");

    }, BLACK_FADE_TIME);
  
  }

}

/*************************************************
 * 現在行表示
 *************************************************/
function showCurrent() {

  const item = currentData.msgInfo[currentIndex];

  // メッセージ
  if ("msgTxt" in item) {

    const msgId = item.msgId;

    // --------------------
    // Lメッセージ待機
    // --------------------

    if (
      (msgId === "L" || msgId === "W" || msgId === "B") &&
      currentVideo === videoA
    ) {

      pendingLoop = true;

      return;

    }

    // --------------------
    // フェードイン
    // --------------------

    if (msgId === "B" || msgId === "W") {

      setFade(true, msgId);

    } else {

      // 動画表示待ちなら表示
      if (waitMovie) {

        playMovie(waitItem);

      }

    }

    changeMessage(
      item.chrNm || "",
      item.msgTxt || ""
    );

    return;

  }

  // 動画系
  if ("movId" in item) {

    // フェード
    setFade(true);

    // 次段落
    setTimeout(() => {

      // エピローグ暗転
      if (item.movId === "elg") {

        fadeOutVideo(() => {

          // 少し待機
          setTimeout(() => {

            isBusy = false;

            nextStep();

          }, BLACK_FADE_TIME);

        }, false);

        return;

      }

      // movId単位で
      // パターン解析
      moviePattern = item.movPtn;

      const nextItem = currentData.msgInfo[currentIndex + 1];
      const nextMsgId = nextItem.msgId;

      // 次がフェードなら動画再生しない
      if (nextMsgId === "B" || nextMsgId === "W") {

        waitMovie = true;
        waitItem = item;

        // 次メッセージ
        setTimeout(() => {

          nextStep();

        }, BLACK_FADE_TIME);

      } else {

        waitMovie = false;
        waitItem = null;

        // 通常動画
        playMovie(item);

      }

    }, NEXT_EVT_TIME);

  }

}

/*************************************************
 * タイトル表示
 *************************************************/
function showTitle(title) {

  isTitleShowing = true;

  const area =
    document.getElementById("titleArea");

  const text =
    document.getElementById("titleText");

  text.innerText = title;

  // animation再発火
  text.classList.remove("slide-in");

  // 強制reflow
  void text.offsetWidth;

  // 再付与
  text.classList.add("slide-in");

  // 暗転
  setFade(true);

  requestAnimationFrame(() => {

    area.classList.add("show");

    startAutoNext()

  });

}

/*************************************************
 * メッセージ変更
 *************************************************/
function changeMessage(chrNm, msg) {

  const chrEl =
    document.getElementById("chrName");

  const msgBody =
    document.getElementById("msgBody");

  const msgArea =
    document.getElementById("msgArea");

  // 前テキストを即消す
  chrEl.innerText = "";
  msgBody.innerText = "";

  chrEl.classList.remove("msg-fade");
  msgBody.classList.remove("msg-fade");

  // 一瞬待ってから表示開始
  requestAnimationFrame(() => {

    msgArea.style.opacity = 1;

    chrEl.innerText = chrNm;

    startTyping(msg);

  });

}

/*************************************************
 * メッセージ送り
 *************************************************/
function startTyping(text) {

  clearTimeout(typingTimer);
  clearTimeout(autoTimer);

  const msgEl =
    document.getElementById("msgBody");

  fullText = text;

  msgEl.innerHTML = "";

  isTyping = true;

  // --------------------
  // 先に全文生成
  // --------------------

  const spans = [];

  for (const char of fullText) {

    const span =
      document.createElement("span");

    span.className = "char";

    span.style.opacity = 0;

    span.innerText = char;

    msgEl.appendChild(span);

    spans.push(span);

  }

  let index = 0;

  function type() {

    spans[index].style.opacity = 1;

    index++;

    if (index < spans.length) {

      let wait = 10;

      const char =
        fullText[index - 1];

      if (char === "、") {
        wait = 40;
      }

      if (char === "。") {
        wait = 60;
      }

      typingTimer =
        setTimeout(type, wait);

    } else {

      isTyping = false;

      startAutoNext();

    }

  }

  type();

}

/*************************************************
 * 全文表示
 *************************************************/
function finishTyping() {

  clearTimeout(typingTimer);

  const msgEl =
    document.getElementById("msgBody");

  msgEl.innerHTML = "";

  for (const char of fullText) {

    const span =
      document.createElement("span");

    span.className = "char";

    span.style.opacity = 1;

    span.style.transform = "translateY(0)";

    span.innerText = char;

    msgEl.appendChild(span);

  }

  isTyping = false;
  
  startAutoNext();

}

/*************************************************
 * 動画再生
 *************************************************/
function playMovie(item) {

  isBusy = true;

  const movId = item.movId;

  // 動画なし
  if (!movId) {

    fadeOutVideo(() => {

      if (currentVideo) {

        currentVideo.pause();

      }

      setTimeout(() => {

        isBusy = false;

        nextStep()

      }, 300);

    }, false);

    return;

  }

  // --------------------
  // 動画無し
  // --------------------

  if (moviePattern === "N") {

    fadeOutVideo(() => {

      currentVideo = null;

      isBusy = false;

      nextStep();

    }, false);

    return;

  }

  const srcA =
    `../data/${evtId}/CPT-${cptId}/${movId}-A.mp4`;

  const srcL =
    `../data/${evtId}/CPT-${cptId}/${movId}-L.mp4`;

  currentSrcL = srcL;

  // Lのみ
  if (moviePattern === "L") {

    startLoopDoubleBuffer(srcL);

    currentVideo = activeLoopVideo;

    setTimeout(() => {

      setFade(false);

      isBusy = false;

      if (waitMovie) {

        waitMovie = false;
      
      } else {

        nextStep();

      }

    }, BLACK_FADE_TIME);

    return;

  }

  // 通常
  playSeamlessMovie(srcA, srcL);

}

/*************************************************
 * L動画ダブルバッファループ
 *************************************************/
function startLoopDoubleBuffer(srcL) {

  // 初回
  activeLoopVideo.src = srcL;
  activeLoopVideo.currentTime = 0;
  activeLoopVideo.load();

  standbyLoopVideo.src = srcL;
  standbyLoopVideo.currentTime = 0;
  standbyLoopVideo.load();

  videoL1.classList.remove("show");
  videoL2.classList.remove("show");

  videoL1.pause();
  videoL2.pause();

  videoL1.style.display = "none";
  videoL2.style.display = "none";

  // activeだけ復帰
  activeLoopVideo.style.display = "block";
  activeLoopVideo.classList.add("front");

  requestAnimationFrame(() => {

    activeLoopVideo.play()
    .catch(() => {});

    setTimeout(() => {

      activeLoopVideo.classList.add("show");

    }, 300);

  });

  setTimeout(() => {

    videoA.classList.remove("show");

  }, 2000);

  // 次待機
  standbyLoopVideo.src = srcL;
  standbyLoopVideo.load();

  standbyLoopVideo.play()
  .then(() => {

    requestAnimationFrame(() => {

      standbyLoopVideo.pause();

      standbyLoopVideo.currentTime = 0;

    });

  })
  .catch(() => {});

  watchLoopSeamless(srcL);

}

/*************************************************
 * L動画シームレス監視
 *************************************************/
function watchLoopSeamless(srcL) {

  if (loopWatchActive) {
    return;
  }

  loopWatchActive = true;

  const watch = () => {

    if (!activeLoopVideo.duration) {

      requestAnimationFrame(watch);

      return;

    }

    const remain =
      activeLoopVideo.duration -
      activeLoopVideo.currentTime;

    // 終了直前
    if (remain <= LOOP_SWITCH_BEFORE) {

      switchLoopVideo(srcL);

      return;

    }

    requestAnimationFrame(watch);

  };

  watch();

}

/*************************************************
 * L動画切替
 *************************************************/
function switchLoopVideo(srcL) {

  const current = activeLoopVideo;
  const next = standbyLoopVideo;

  next.pause();
  next.currentTime = 0;

  next.style.display = "block";

  // 次動画を前面へ
  next.classList.add("front");

  // 現在動画を背面へ
  current.classList.remove("front");

  // --------------------
  // ① 先にplay
  // --------------------

  next.play()
    .then(() => {

      // --------------------
      // ② Safari decode待機
      // --------------------

      // 次を前面
      next.classList.add("front");

      setTimeout(() => {

        loopWatchActive = false;

        // 次表示
        next.classList.add("show");

        setTimeout(() => {

          current.play()
          .then(() => {

            requestAnimationFrame(() => {

              // 現在非表示
              current.classList.remove("show");

              current.pause();

              current.currentTime = 0;

              current.style.display = "none";

              // 現在を背面へ
              current.classList.remove("front");

            });

          })
          .catch(() => {});

        }, LOOP_FADE_TIME);

        // swap
        activeLoopVideo = next;
        currentVideo = activeLoopVideo;
        standbyLoopVideo = current;

        watchLoopSeamless(srcL);

      }, LOOP_FADE_WAIT);

    })
    .catch(() => {});
}

/*************************************************
 * 動画シームレス再生
 *************************************************/
function playSeamlessMovie(srcA, srcL) {

  videoA.classList.remove("show");
  videoL1.classList.remove("show");
  videoL2.classList.remove("show");

  videoA.style.display = "none";
  videoL1.style.display = "none";
  videoL2.style.display = "none";

  // 停止
  videoA.pause();
  videoL1.pause();
  videoL2.pause();

  videoA.classList.remove("show");
  videoA.style.display = "none";

  // ソース設定
  videoA.src = srcA;

  videoA.currentTime = 0;

  // preload
  videoA.load();
  videoL1.load();
  videoL2.load();

  // --------------------
  // A表示
  // --------------------

  videoA.style.display = "block";

  requestAnimationFrame(() => {

    videoA.classList.add("show");

    currentVideo = videoA;

    videoA.play().then(() => {

      setTimeout(() => {

        setFade(false);

      }, BLACK_FADE_TIME);

    });

  });

  // --------------------
  // A終了監視
  // --------------------

  const watch = () => {

    if (!videoA.duration) {

      requestAnimationFrame(watch);

      return;

    }

    const remain =
      videoA.duration - videoA.currentTime;

    // 終了直前
    if (remain <= ACTION_SWITCH_BEFORE) {

      // 現在行
      const currentItem =
        currentData.msgInfo[currentIndex];

      // --------------------
      // A→Lパターン
      // --------------------

      if (
        moviePattern === "AL" &&
        currentItem.msgId != "L"
      ) {

        if (currentItem.msgId === "A") {

          pendingLoop = true;

          setFade(true);

          setTimeout(() => {

            videoA.classList.remove("show");

            videoA.pause();

            videoA.style.display = "none";

            videoA.currentTime = 0;

          }, 600);

          return;

        } else if (currentItem.msgId === "W") {

          setFade(true, "W");

          pendingLoop = true;

          setTimeout(() => {

            videoA.classList.remove("show");

            videoA.pause();

            videoA.style.display = "none";

            currentVideo = null;

            isBusy = false;

            showCurrent();

          }, 600);

          return;

        }

      }

      // --------------------
      // Aのみ
      // --------------------

      if (moviePattern === "A") {

        if (["B", "W"].includes(currentItem.msgId)) {

          setFade(true, currentItem.msgId);

          pendingLoop = false;

          setTimeout(() => {

            videoA.classList.remove("show");

            videoA.pause();

            videoA.style.display = "none";

            currentVideo = null;

            isBusy = false;

            showCurrent();

          }, 600);

          return;

        } else {

          // --------------------
          // 最後A終了済み
          // --------------------

          // 次行確認
          const nextItem =
            currentData.msgInfo[currentIndex + 1];

          setFade(true);

          setTimeout(() => {

            videoA.classList.remove("show");

            videoA.pause();

            videoA.style.display = "none";

            currentVideo = null;

            isBusy = false;

            if (
              nextItem &&
              !("movId" in nextItem)
            ) {

              return;

            }

            currentIndex++;

            showCurrent();

          }, 600);

          return;

        }

      }

      // --------------------
      // 通常L切替
      // --------------------

      startLoopDoubleBuffer(srcL);

      currentVideo = activeLoopVideo;
      
      if (pendingLoop) {

        pendingLoop = false;

        requestAnimationFrame(() => {

          // 次メッセージ
          setTimeout(() => {

            showCurrent();

          }, 600);

        });

      }

      return;

    }

    requestAnimationFrame(watch);

  };

  watch();

  // 次メッセージ
  setTimeout(() => {

    isBusy = false;

    if (waitMovie) {

      waitMovie = false;
    
    } else {

      nextStep();

    }

  }, BLACK_FADE_TIME);

}

/*************************************************
 * フェードイン再生
 *************************************************/
function fadeInMovie(src) {

  const chrEl =
    document.getElementById("chrName");

  const msgBody =
    document.getElementById("msgBody");

  // メッセージフェードアウト
  chrEl.classList.add("msg-fade");
  msgBody.classList.add("msg-fade");

  // 動画フェード
  setFade(true);

  setTimeout(() => {

    const cachedVideo = videoCache[src];

    if (cachedVideo) {
      video.src = cachedVideo.src;
    } else {
      video.src = src;
    }

    video.currentTime = 0;

    video.play().catch(() => {});

    video.onloadeddata = () => {

      // テキストクリア
      chrEl.innerText = "";
      msgBody.innerText = "";

      // 次メッセージへ
      setTimeout(() => {

        // 動画フェード解除
        setFade(false);

        isBusy = false;

        nextStep();

        // 次メッセージ表示時にフェード復帰
        requestAnimationFrame(() => {

          chrEl.classList.remove("msg-fade");
          msgBody.classList.remove("msg-fade");

        });

      }, BLACK_FADE_TIME);

    };

  }, 600);

}

/*************************************************
 * フェードアウト
 *************************************************/
function fadeOutVideo(callback, hideMessage = true) {

  const chrEl =
    document.getElementById("chrName");

  const msgBody =
    document.getElementById("msgBody");

  // --------------------
  // メッセージfade-out
  // --------------------

  if (hideMessage) {

    chrEl.classList.add("msg-fade");
    msgBody.classList.add("msg-fade");

  }

  // --------------------
  // 動画fade-out
  // --------------------

  // 黒fade
  setFade(true);

  setTimeout(() => {

    if (currentVideo) {

      currentVideo.pause();
      
      currentVideo.classList.remove("show");

      currentVideo.style.display = "none";

    }

    callback();

  }, 500);

}

/*************************************************
 * ループ制御
 *************************************************/

function videoLoopWatch() {

  requestAnimationFrame(videoLoopWatch);

  if (!video || !video.duration) return;

  if (loopMin <= 0) return;

  if (video.currentTime >= video.duration - 0.05) {

    video.currentTime = loopMin;

    video.play().catch(() => {});

  }

}