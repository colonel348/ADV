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

let moviePattern = "Z";

let loopWatchActive = false;

let currentSrcL = "";

// A動画終了何秒前に次を開始するか
const ACTION_SWITCH_BEFORE = 0.30;
// L動画終了何秒前に次を開始するか
const LOOP_SWITCH_BEFORE = 0.20;
// 次L動画play後
// fade開始まで待つms
const LOOP_FADE_WAIT = 110;
// fade時間
const LOOP_FADE_TIME = 500;
// fade時間
const BLACK_FADE_TIME = 600;

/*************************************************
 * 動画プリロード
 *************************************************/
function preloadMovies() {

  currentData.msgInfo.forEach(item => {

    // 動画なし
    if (
      !item.movId ||
      item.movId === "plg" ||
      item.movId === "spc" ||
      item.movId === "elg"
    ) {
      return;
    }

    // movIdごとの
    // パターン取得
    const pattern =
      detectMoviePattern(
        currentData.msgInfo.indexOf(item)
      );

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

    // --------------------
    // Zのみ
    // --------------------

    else if (pattern === "Z") {

      sources = [

        `../data/${evtId}/CPT-${cptId}/${item.movId}-A.mp4`,

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

  document.body.addEventListener("click", nextStep);

});

/*************************************************
 * 開始
 *************************************************/

function init() {

  setParam();

  currentData = msgData.find(v => v.evtId === evtId && v.cptId === cptId);

  if (!currentData) {
    alert("データなし");
    return;
  }

  // 動画事前読込
  preloadMovies();

  // 初回だけ1秒待つ
  setTimeout(() => {

    showCurrent();

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

  // 現在メッセージを即fade-out
  document
    .getElementById("chrName")
    .classList.add("msg-fade");

  document
    .getElementById("msgBody")
    .classList.add("msg-fade");

  document
    .getElementById("nextIcon")
    .classList.remove("show");

  document
    .getElementById("nextIcon")
    .classList.add("msg-fade");

  // 現在行
  const currentItem =
    currentData.msgInfo[currentIndex];

  // --------------------
  // Lメッセージ待機中
  // --------------------

  if (
    currentItem &&
    currentItem.tmgId === "L" &&
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

      document
        .getElementById("nextIcon")
        .classList.remove("show");

      return;

    }

  }

  currentIndex++;

  const item =
    currentData.msgInfo[currentIndex];

  // Lテキスト
  if (
    item &&
    item.tmgId === "L" &&
    pendingLoop
  ) {

    startLoopDoubleBuffer(currentSrcL);

    pendingLoop = false;

    setTimeout(() => {

      fade.classList.remove("show");

      currentVideo = activeLoopVideo;

      showCurrent();

    }, BLACK_FADE_TIME);

    return;

  }

  if (currentIndex >= currentData.msgInfo.length) {
    
    const nextCpt = getNextCpt();

    // 画面遷移
    setTimeout(() => {
      location.href = './select.html?chrId=' + chrId + '&evtId=' + nextCpt.evtId + '&cptId=' + nextCpt.cptId;
    }, 520);

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
 * 現在行表示
 *************************************************/

function showCurrent() {

  const item = currentData.msgInfo[currentIndex];

  // メッセージ
  if ("msgTxt" in item) {

    const tmgId =
      item.tmgId || "Z";

    // --------------------
    // Lメッセージ待機
    // --------------------

    if (
      tmgId === "L" &&
      currentVideo === videoA
    ) {

      pendingLoop = true;

      return;

    }

    changeMessage(
      item.chrNm || "",
      item.msgTxt || ""
    );

    return;

  }

  // 動画系
  if ("movId" in item) {

    // プロローグタイトル
    if (item.movId === "plg") {

      showTitle(item.title || "");

      return;

    }

    // エピローグ暗転
    if (
      item.movId === "elg" ||
      item.movId === "spc"
    ) {

      fadeOutVideo(() => {

        // 少し待機
        setTimeout(() => {

          isBusy = false;

          nextStep();

        }, 500);

      }, false);

      return;

    }

    // movId単位で
    // パターン解析
    moviePattern =
      detectMoviePattern(currentIndex);

    // 通常動画
    playMovie(item);

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
  fade.classList.add("show");

  requestAnimationFrame(() => {

    area.classList.add("show");

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

  const nextIcon =
    document.getElementById("nextIcon");

  // 前テキストを即消す
  chrEl.innerText = "";
  msgBody.innerText = "";

  nextIcon.classList.remove("show");

  chrEl.classList.remove("msg-fade");
  msgBody.classList.remove("msg-fade");
  nextIcon.classList.remove("msg-fade");

  // 一瞬待ってから表示開始
  requestAnimationFrame(() => {

const msgArea =
  document.getElementById("msgArea");

  // class初期化
  chrEl.className = "";
  msgBody.className = "";
  msgArea.className = "";

  // --------------------
  // キャラ別
  // --------------------

  if (chrNm.includes("こはね")) {

    chrEl.classList.add("name-kohane");
    msgBody.classList.add("name-kohane");

  }

  else if (chrNm.includes("杏")) {

    chrEl.classList.add("name-an");
    msgBody.classList.add("name-an");

  }

  else if (chrNm.includes("彰人")) {

    chrEl.classList.add("name-akito");
    msgBody.classList.add("name-akito");

  }

  else if (chrNm.includes("冬弥")) {

    chrEl.classList.add("name-toya");
    msgBody.classList.add("name-toya");

  }

  // デフォルト
  else {

    chrEl.classList.add("name-default");
    msgBody.classList.add("name-default");

  }

    chrEl.innerText = chrNm;

    startTyping(msg);

  });

}

/*************************************************
 * メッセージ送り
 *************************************************/
function startTyping(text) {

  clearTimeout(typingTimer);

  const msgEl =
    document.getElementById("msgBody");

  const nextIcon =
    document.getElementById("nextIcon");

  nextIcon.classList.remove("show");

  fullText = text;

  msgEl.innerHTML = "";

  isTyping = true;

  let index = 0;

  function type() {

    const char = fullText[index];

    // 1文字span生成
    const span =
      document.createElement("span");

    span.className = "char";

    span.innerText = char;

    msgEl.appendChild(span);

    index++;

    if (index < fullText.length) {

      let wait = 10;

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

      // ♪表示
      requestAnimationFrame(() => {

        nextIcon.classList.add("show");

      });

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

  document
    .getElementById("nextIcon")
    .classList.add("show");

  isTyping = false;

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

        nextStep();

      }, 300);

    }, false);

    return;

  }

  // --------------------
  // Sのみ
  // --------------------

  if (moviePattern === "S") {

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

    fade.classList.add("show");

    startLoopDoubleBuffer(srcL);

    currentVideo = activeLoopVideo;

    setTimeout(() => {

      fade.classList.remove("show");

      isBusy = false;

      nextStep();

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

          // 現在非表示
          current.classList.remove("show");

          current.pause();

          current.style.display = "none";

          // 現在を背面へ
          current.classList.remove("front");

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

  fade.classList.add("show");

  setTimeout(() => {

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

          fade.classList.remove("show");

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
          currentItem &&
          currentItem.tmgId === "A"
        ) {

          pendingLoop = true;

          fade.classList.add("show");

          setTimeout(() => {

            videoA.classList.remove("show");

            videoA.pause();

            videoA.style.display = "none";

            videoA.currentTime = 0;

          }, 1000);

          return;

        }

        // --------------------
        // Aのみ
        // --------------------

        if (moviePattern === "A") {

          // 次行確認
          const nextItem =
            currentData.msgInfo[currentIndex + 1];

          // --------------------
          // 最後A終了済み
          // --------------------

          fade.classList.add("show");

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

          }, 250);

          return;

        }

        // --------------------
        // 通常L切替
        // --------------------

        startLoopDoubleBuffer(srcL);

        currentVideo = activeLoopVideo;
        
        if (pendingLoop) {

          pendingLoop = false;

          requestAnimationFrame(() => {

          showCurrent();

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

      nextStep();

    }, 300);

  }, 600);

}

/*************************************************
 * フェードイン再生
 *************************************************/
function fadeInMovie(src) {

  const chrEl =
    document.getElementById("chrName");

  const msgBody =
    document.getElementById("msgBody");

  const nextIcon =
    document.getElementById("nextIcon");

  // メッセージフェードアウト
  chrEl.classList.add("msg-fade");
  msgBody.classList.add("msg-fade");
  nextIcon.classList.remove("show");
  nextIcon.classList.add("msg-fade");

  // 動画フェード
  fade.classList.add("show");

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

      nextIcon.classList.remove("show");

      // 次メッセージへ
      setTimeout(() => {

        // 動画フェード解除
        fade.classList.remove("show");

        isBusy = false;

        nextStep();

        // 次メッセージ表示時にフェード復帰
        requestAnimationFrame(() => {

          chrEl.classList.remove("msg-fade");
          msgBody.classList.remove("msg-fade");
          nextIcon.classList.remove("msg-fade");

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

  const nextIcon =
    document.getElementById("nextIcon");

  // --------------------
  // メッセージfade-out
  // --------------------

  if (hideMessage) {

    chrEl.classList.add("msg-fade");
    msgBody.classList.add("msg-fade");

    nextIcon.classList.remove("show");
    nextIcon.classList.add("msg-fade");

  }

  // --------------------
  // 動画fade-out
  // --------------------

  // 黒fade
  fade.classList.add("show");

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

/*************************************************
 * movIdブロックの
 * 動画パターン取得
 *************************************************/
function detectMoviePattern(startIndex) {

  const tmgSet = new Set();

  for (
    let i = startIndex + 1;
    i < currentData.msgInfo.length;
    i++
  ) {

    const item =
      currentData.msgInfo[i];

    // 次movIdで終了
    if ("movId" in item) {
      break;
    }

    // tmg収集
    if (item.tmgId) {

      tmgSet.add(item.tmgId);

    }

  }

  const patterns =
    [...tmgSet];

  // --------------------
  // A→L
  // --------------------

  if (
    patterns.includes("A") &&
    patterns.includes("L")
  ) {

    return "AL";

  }

  // --------------------
  // Aのみ
  // --------------------

  if (
    patterns.length === 1 &&
    patterns[0] === "A"
  ) {

    return "A";

  }

  // --------------------
  // Lのみ
  // --------------------

  if (
    patterns.length === 1 &&
    patterns[0] === "L"
  ) {

    return "L";

  }

  // --------------------
  // Sのみ
  // --------------------

  if (
    patterns.length === 1 &&
    patterns[0] === "S"
  ) {

    return "S";

  }

  // --------------------
  // Zのみ
  // --------------------

  return "Z";

}