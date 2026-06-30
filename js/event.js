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

let typingTimer = null;

let isTyping = false;

let fullText = "";

let isTitleShowing = false;
let isAfterTitle = false;

let pendingLoop = false;

const videoCache = {};

let moviePattern = "";

let loopWatchActive = false;

let waitMovie = false;
let waitItem = null;

let currentSrcL = "";

let isAutoMode = false;
let isNextReady = false;

let aTextTimer = null;

let autoTimer = null;

let isFirstLoopPlay = true;

// A動画終了何秒前に次を開始するか
const ACTION_SWITCH_BEFORE = 0.3;
// L動画終了何秒前に次を開始するか
const LOOP_SWITCH_BEFORE = 0.3;
// 次L動画play後
// fade開始まで待つms
const LOOP_FADE_WAIT = 230;
// fade時間
const LOOP_FADE_TIME = 500;
// fade時間
const BLACK_FADE_TIME = 750;

const AFTER_TITLE_NEXT_EVT_TIME = 200;
const AFTER_TITLE_BLACK_FADE_TIME = 200;
// 次段落への時間
const NEXT_EVT_TIME = 500;
// 次メッセージへの時間
const NEXT_TEXT_TIME = 4000;
// タイトル後の時間
const NEXT_TITLE_TIME = 1200;
// 次のメッセージ遅らせ
const NEXT_MSG_DELAY_TIME = 300;

const FIRST_LOOP_WHITE_WAIT = 1500;

/*************************************************
 * JS読込
 *************************************************/
function loadEvent() {

  return new Promise((resolve, reject) => {

    const script = document.createElement("script");

    script.src = getMsgDataPath(tgtEvtData, cptId);

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

  currentData.forEach(item => {

    // 動画なし
    if (
      !item.movId ||
      item.movPtn === "N"
    ) {
      return;
    }

    // movIdごとの
    // パターン取得
    const pattern =  getMoviePattern(currentData.indexOf(item));

    let sources = [];

    // --------------------
    // A→L
    // --------------------

    if (pattern === "AL") {

      if (hasSplitA(currentData.indexOf(item))) {

        sources = [
          getMoviePath(tgtEvtData, cptId, item.movId, "A1"),
          getMoviePath(tgtEvtData, cptId, item.movId, "A2"),
          getMoviePath(tgtEvtData, cptId, item.movId, "L")
        ];

      } else {

        sources = [
          getMoviePath(tgtEvtData, cptId, item.movId, "A"),
          getMoviePath(tgtEvtData, cptId, item.movId, "L")
        ];

      }

    }

    // --------------------
    // Aのみ
    // --------------------

    else if (pattern === "A") {

      if (hasSplitA(currentData.indexOf(item))) {

        sources = [
          getMoviePath(tgtEvtData, cptId, item.movId, "A1"),
          getMoviePath(tgtEvtData, cptId, item.movId, "A2")
        ];

      } else {

        sources = [
          getMoviePath(tgtEvtData, cptId, item.movId, "A")
        ];

      }

    }

    // --------------------
    // Lのみ
    // --------------------

    else if (pattern === "L") {

      sources = [
        getMoviePath(tgtEvtData, cptId, item.movId, "L")
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

      // 押下待ち以外は無効
      if (!isNextReady) {
        return;
      }

      isNextReady = false;

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

      refreshNextIcon();

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

  currentData = await loadEvent();

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

  // デバッグ開始位置
  if (debugMovId) {

    const movIndex =
      findMovIndex(debugMovId);

    if (movIndex >= 0) {

      currentIndex = movIndex;

      // evt1以外からデバッグ開始時は
      // 初回L演出をスキップ
      if (debugMovId !== "evt1") {

        isFirstLoopPlay = false;

      }

    }

  }

  // デバッグ開始
  if (debugMovId) {

    showCurrent();

  }

  // 通常開始
  else {

    // 初回だけ1秒待つ
    setTimeout(() => {

      showTitle(tgtEvtData.cpt[cptIdx].plcNm);

    }, 500);

  }

}

/*************************************************
 * 次へ
 *************************************************/

function nextStep() {

  clearTimeout(autoTimer);
  autoTimer = null;

  clearATextTimer();

  // 非表示状態なら
  if (
    msgArea.classList.contains(
      "msg-hidden"
    )
  ) {

    msgArea.style.opacity = 0;
    
    setTimeout(() => {

      msgArea.classList.remove("msg-hidden");

      setTimeout(() => {

        msgArea.style.opacity = 1;

      }, 400);

    }, 400);

    // style初期化
    requestAnimationFrame(() => {

      msgArea.style.transform = "";

    });

  }

  // タイトル表示中
  if (isTitleShowing) {

    isTitleShowing = false;

    const area =
      document.getElementById("titleArea");

    area.classList.remove("show");

    showCurrent();

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
    currentData[currentIndex];

  if (!isAutoMode || !currentItem.movId) {

    fadeOutCurrentMessage();
  
  }


  // --------------------
  // A動画終了待機中
  // --------------------

  if (
    ["L", "B", "W", "N"].includes(currentItem.msgId) &&
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
      currentData[currentIndex + 1];

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
    currentData[currentIndex];

  // Lテキスト
  if (
    item &&
    item.msgId === "L" &&
    pendingLoop
  ) {

    if (isFirstLoopPlay) {

      isFirstLoopPlay = false;

      startFirstLoopDoubleBuffer(currentSrcL);

      pendingLoop = false;

      setTimeout(() => {

        currentVideo = activeLoopVideo;

        showCurrent();

      }, FIRST_LOOP_WHITE_WAIT + BLACK_FADE_TIME);

    } else {

      startLoopDoubleBuffer(currentSrcL);

      pendingLoop = false;

      setTimeout(() => {

        setFade(false);

        currentVideo = activeLoopVideo;

        showCurrent();

      }, BLACK_FADE_TIME);

    }

    return;

  } else if (
    item &&
    (item.msgId === "W" || item.msgId === "B"|| item.msgId === "N") &&
    pendingLoop
  ) {

    setTimeout(() => {

      setFade(true, item.msgId);

      currentVideo = activeLoopVideo;

      showCurrent();

    }, BLACK_FADE_TIME);

    return;

  }

  if (currentIndex >= currentData.length) {

    // 画面遷移
    moveSelect();

    return;

  }

  showCurrent();

}

/*************************************************
 * movId位置取得
 *************************************************/
function findMovIndex(movId) {

  return currentData.findIndex(
    item =>
      item.movId === movId
  );

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
    currentEvt.evtId.substring(0, 5);

  const nextPrefix =
    nextEvt.evtId.substring(0, 5);

  // 別キャラや別モードなら
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
 * next icon表示
 *************************************************/
function refreshNextIcon() {

  const nextIcon =
    document.getElementById("nextIcon");

  nextIcon.classList.remove(
    "show",
    "auto"
  );

  isNextReady = false;

  if (moviePattern === "A" &&
      currentVideo === videoA) {

    nextIcon.innerText = "";

    return;
  }


  // 自動進行メッセージ
  if (!isWaitMessage()) {

    nextIcon.innerText = "";

    return;

  }

  if (chrId === "FF") {

    // HR版
    nextIcon.innerHTML = "";

  } else {

    // PS版
    nextIcon.innerHTML = "♪";

  }

  if (!isTyping) {

    isNextReady = true;

    nextIcon.classList.add("show");

  }

}

/*************************************************
 * クリック待ち判定
 *************************************************/
function isWaitMessage() {

  // 現在行
  const currentItem =
    currentData[currentIndex];

  // 次行
  const nextItem =
    currentData[currentIndex + 1];

  // 最終メッセージ
  if (!nextItem) {
    return currentItem && currentItem.msgId === "L";
  }
  // 次が動画
  if ("movId" in nextItem) {
      return true;
  }

  return false;

}

function clearATextTimer() {
  clearTimeout(aTextTimer);
  aTextTimer = null;
}

function isLongAVideo() {
  return videoA && videoA.duration >= 6;
}

function getAStageInfo() {
  const currentItem = currentData[currentIndex];
  if (!currentItem || currentItem.msgId !== "A") return null;
  if (currentVideo !== videoA) return null;

  const prevItem = currentData[currentIndex - 1];
  const nextItem = currentData[currentIndex + 1];

  return {
    isFirstA: !(prevItem && prevItem.msgId === "A"),
    hasNextA: !!(nextItem && nextItem.msgId === "A"),
    isLongA: isLongAVideo()
  };
}

function fadeOutCurrentMessage() {
  document.getElementById("chrName").classList.add("msg-fade");
  document.getElementById("msgBody").classList.add("msg-fade");
  document.getElementById("nextIcon").classList.remove("show");
  document.getElementById("nextIcon").classList.add("msg-fade");
}

/*************************************************
 * AUTO進行
 *************************************************/
function startAutoNext() {

  clearTimeout(autoTimer);
  clearATextTimer();

  const currentItem =
    currentData[currentIndex];

  // --------------------
  // Aメッセージだけ別制御
  // --------------------
  if (
    currentItem &&
    currentItem.msgId === "A" &&
    currentVideo === videoA
  ) {

    const aInfo = getAStageInfo();
    if (!aInfo) return;

    // 5秒Aは何もしない
    if (!aInfo.isLongA) {
      return;
    }

    // 2個目のAは動画終了までそのまま
    if (!aInfo.isFirstA) {
      return;
    }

    aTextTimer = setTimeout(() => {

      const nowItem =
        currentData[currentIndex];

      // 途中で場面が変わっていたら何もしない
      if (
        !nowItem ||
        nowItem.msgId !== "A" ||
        currentVideo !== videoA
      ) {
        return;
      }

      // 2個目のAがあるなら次のAへ
      if (aInfo.hasNextA) {
        currentIndex++;
        showCurrent();
        return;
      }

      // 1個だけなら非表示にする
      fadeOutCurrentMessage();

    }, NEXT_TEXT_TIME);

    return;
  }

  // --------------------
  // 停止メッセージなら
  // AUTO時のみ進行
  // --------------------
  if (isWaitMessage()) {

    if (isAutoMode) {

      autoTimer = setTimeout(() => {
        nextStep();
      }, NEXT_TEXT_TIME);

      return;
    }

    autoTimer = setTimeout(() => {
      refreshNextIcon();
    }, NEXT_TEXT_TIME);

    return;
  }

  const waitTime =
    isAfterTitle
      ? NEXT_TITLE_TIME
      : NEXT_TEXT_TIME;

  autoTimer = setTimeout(() => {
    nextStep();
  }, waitTime);
}

/*************************************************
 * select遷移
 *************************************************/
function moveSelect() {

  setFade(true);

  document.getElementById("msgArea").style.opacity = 0;

  const nextCpt = getNextCpt();

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
 * movPtn取得
 *************************************************/
function getMoviePattern(startIndex) {

  let hasA = false;
  let hasL = false;
  let hasN = false;

  // 次行から確認
  for (
    let i = startIndex + 1;
    i < currentData.length;
    i++
  ) {

    const item =
      currentData[i];

    // 次movIdで終了
    if ("movId" in item) {
      break;
    }

    // msg以外無視
    if (!item.msgId) {
      continue;
    }

    // --------------------
    // A
    // --------------------

    if (item.msgId === "A") {

      hasA = true;

    }

    // --------------------
    // L
    // --------------------

    else if (item.msgId === "L") {

      hasL = true;

    }

    // --------------------
    // N
    // --------------------

    else if (item.msgId === "N") {

      hasN = true;

    }

  }

  // --------------------
  // 判定
  // --------------------

  if (hasA && hasL) {
    return "AL";
  }

  if (hasA) {
    return "A";
  }

  if (hasL) {
    return "L";
  }

  return "N";

}

/*************************************************
 * 動画A判定
 *************************************************/
function hasSplitA(startIndex) {

  let foundA = false;
  let foundFadeAfterA = false;

  for (let i = startIndex + 1; i < currentData.length; i++) {

    const item = currentData[i];

    if ("movId" in item) break;

    if (item.msgId === "A") {

      if (foundFadeAfterA) {
        return true;
      }

      foundA = true;
    }

    if (
      foundA &&
      (item.msgId === "B" || item.msgId === "W"|| item.msgId === "N")
    ) {
      foundFadeAfterA = true;
    }

  }

  return false;
}

function getAFileType(startIndex, msgIndex) {

  if (!hasSplitA(startIndex)) {
    return "A";
  }

  let aNo = 1;
  let foundA = false;
  let foundFadeAfterA = false;

  for (let i = startIndex + 1; i <= msgIndex; i++) {

    const item = currentData[i];

    if (item.msgId === "A") {

      if (foundFadeAfterA) {
        aNo++;
        foundFadeAfterA = false;
      }

      foundA = true;

      if (i === msgIndex) {
        return "A" + aNo;
      }

    }

    if (
      foundA &&
      (item.msgId === "B" || item.msgId === "W"|| item.msgId === "N")
    ) {
      foundFadeAfterA = true;
    }

  }

  return "A1";
}

function findNextAIndex(startIndex) {

  for (let i = startIndex + 1; i < currentData.length; i++) {

    const item = currentData[i];

    if ("movId" in item) break;

    if (item.msgId === "A") {
      return i;
    }

  }

  return -1;
}

function getCurrentMovItemIndex(index) {

  for (let i = index; i >= 0; i--) {

    if ("movId" in currentData[i]) {
      return i;
    }

  }

  return -1;
}

/*************************************************
 * 現在行表示
 *************************************************/
function showCurrent() {

  let delayMessage = false;

  const item = currentData[currentIndex];

  // メッセージ
  if ("msgTxt" in item) {

    const msgId = item.msgId;

    // --------------------
    // Lメッセージ待機
    // --------------------

    if (
      (msgId === "L" || msgId === "W" || msgId === "B" || msgId === "N") &&
      currentVideo === videoA
    ) {

      pendingLoop = true;

      return;

    }

    // --------------------
    // フェードイン
    // --------------------

    if (msgId === "B" || msgId === "W" || msgId === "N") {

      setFade(true, msgId);

    } else {

      // 動画表示待ちなら表示
      if (waitMovie) {

        if (
          msgId === "A" ||
          msgId === "L"
        ) {

          const isFirstLoopOnly =
            msgId === "L" &&
            moviePattern === "L" &&
            isFirstLoopPlay;

          delayMessage = true;

          playMovie(waitItem, currentIndex);

          if (isFirstLoopOnly) {
            return;
          }

        }

      }

    }

    const chrNm =
      item.chrNm ||
      (
        chrId === "FF" ? "ホタル" :
        chrId === "AK" ? "こはね" :
        chrId === "SA" ? "杏" :
        ""
      );

    setTimeout(() => {

      changeMessage(
        chrNm,
        item.msgTxt || ""
      );

    }, delayMessage ? NEXT_MSG_DELAY_TIME + BLACK_FADE_TIME : 0);

    return;

  }

  // 動画系
  if ("movId" in item) {

    // フェード
    setFade(true);

    const evtWaitTime =
      isAfterTitle
        ? AFTER_TITLE_NEXT_EVT_TIME
        : NEXT_EVT_TIME;

    const fadeWaitTime =
      isAfterTitle
        ? AFTER_TITLE_BLACK_FADE_TIME
        : BLACK_FADE_TIME;

    isAfterTitle = false;

    // 次段落
    setTimeout(() => {

      // movId単位で
      // パターン解析
      moviePattern = getMoviePattern(currentIndex);

      const nextItem = currentData[currentIndex + 1];
      const nextMsgId = nextItem.msgId;

      // 次がフェードなら動画再生しない
      if (nextMsgId === "N" || nextMsgId === "B" || nextMsgId === "W") {

        waitMovie = true;
        waitItem = item;

        // 次メッセージ
        setTimeout(() => {

          nextStep();

        }, fadeWaitTime);

      } else {

        waitMovie = false;
        waitItem = null;

        // 通常動画
        playMovie(item);

      }

    }, evtWaitTime);

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

    isAfterTitle = true;

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

  const nextIcon =
    document.getElementById("nextIcon");

  const msgArea =
    document.getElementById("msgArea");

  // 前テキストを即消す
  chrEl.innerText = "";
  msgBody.innerText = "";

  nextIcon.classList.remove("show");
  chrEl.classList.remove("msg-fade");
  msgBody.classList.remove("msg-fade");
  nextIcon.classList.remove("msg-fade");

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

  const nextIcon =
    document.getElementById("nextIcon");

  nextIcon.classList.remove("show");

  fullText = text;

  msgEl.innerHTML = "";

  isTyping = true;

  // --------------------
  // 先に全文生成
  // --------------------

  const spans = [];

  let inNote = false;
  let isLineStart = true;

  for (const char of fullText) {

    // （ 開始
    if (char === "（") {
      inNote = true;
    }

    // スぺースなら改行
    if (char === "　") {

      const br =
        document.createElement("br");

      msgEl.appendChild(br);
      spans.push(br);

      // プロセカ側で、括弧内の改行なら字下げ
      if (
        chrId !== "FF" &&
        inNote
      ) {

        const indentSpan =
          document.createElement("span");

        indentSpan.className = "char noteChar";
        indentSpan.style.opacity = 0;
        indentSpan.innerText = "　";

        msgEl.appendChild(indentSpan);
        spans.push(indentSpan);

      }

      continue;

    }

    const span =
      document.createElement("span");

    // 通常 or 注釈
    span.className =
      inNote ? "char noteChar" : "char";

    span.style.opacity = 0;

    span.innerText = char;

    msgEl.appendChild(span);

    spans.push(span);

    // ） 終了
    if (char === "）") {
      inNote = false;
    }

  }

  let index = 0;

  function type() {

    if (
      spans[index].tagName !== "BR"
    ) {
      spans[index].style.opacity = 1;
    }

    index++;

    if (index < spans.length) {

      let wait = 10;

      const char =
        fullText[index - 1];

      if (char === "、") {
        wait = 40;
      }

      if (char === "　") {
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

    if (char === "　") {

      msgEl.appendChild(
        document.createElement("br")
      );

      // プロセカ側で、括弧内の改行なら字下げ
      if (
        chrId !== "FF" &&
        inNote
      ) {

        const indentSpan =
          document.createElement("span");

        indentSpan.className = "char noteChar";
        indentSpan.style.opacity = 1;
        indentSpan.style.transform = "translateY(0)";
        indentSpan.innerText = "　";

        msgEl.appendChild(indentSpan);

      }

      continue;

    } else {

      span.innerText = char;

    }

    msgEl.appendChild(span);

  }

  isTyping = false;

  refreshNextIcon();

  startAutoNext();

}

/*************************************************
 * 動画再生
 *************************************************/
function playMovie(item, aMsgIndex = null) {

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

  const movStartIndex =
    getCurrentMovItemIndex(currentIndex);

  const targetAIndex =
    aMsgIndex !== null
      ? aMsgIndex
      : findNextAIndex(movStartIndex);

  const aFileType =
    targetAIndex >= 0
      ? getAFileType(movStartIndex, targetAIndex)
      : "A";

  const srcA =
    getMoviePath(tgtEvtData, cptId, movId, aFileType);

  const srcL =
    getMoviePath(tgtEvtData, cptId, movId, "L");

  currentSrcL = srcL;

  // Lのみ
  if (moviePattern === "L") {

    if (isFirstLoopPlay) {

      isFirstLoopPlay = false;

      startFirstLoopDoubleBuffer(srcL);

      setTimeout(() => {

        isBusy = false;

        if (waitMovie) {
          waitMovie = false;
          showCurrent();
        } else {
          nextStep();
        }

      }, FIRST_LOOP_WHITE_WAIT + BLACK_FADE_TIME+ 750);

    } else {

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

    }

    return;

  }

  // 通常
  playSeamlessMovie(srcA, srcL);

}

/*************************************************
 * L動画初回ダブルバッファループ
 *************************************************/
function startFirstLoopDoubleBuffer(srcL) {

  setFade(true, "W");

  setTimeout(() => {

    startLoopDoubleBuffer(srcL, true);

    currentVideo = activeLoopVideo;

    const waitShow = () => {

      if (activeLoopVideo.classList.contains("show")) {

        setFade(false);
        return;

      }

      requestAnimationFrame(waitShow);

    };

    waitShow();

  }, FIRST_LOOP_WHITE_WAIT);

}

/*************************************************
 * L動画ダブルバッファループ
 *************************************************/
function startLoopDoubleBuffer(srcL, firstEffect = false) {

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

  if (firstEffect) {

    activeLoopVideo.style.transition = "none";
    activeLoopVideo.style.transform = "scale(1.1)";
    activeLoopVideo.style.filter = "blur(8px)";

  } else {

    activeLoopVideo.style.transition = "";
    activeLoopVideo.style.transform = "";
    activeLoopVideo.style.filter = "";

  }

  requestAnimationFrame(() => {

    activeLoopVideo.play()
      .catch(() => {});

    activeLoopVideo.classList.add("show");

    if (firstEffect) {

      requestAnimationFrame(() => {

        activeLoopVideo.style.transition =
          "transform 2.0s ease, filter 2.0s ease";

        activeLoopVideo.style.transform = "scale(1)";
        activeLoopVideo.style.filter = "blur(0px)";

      });

    }

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

      // 次行
      const nextItem =
        currentData[currentIndex + 1];

      // --------------------
      // A→Lパターン
      // --------------------

      if (moviePattern === "AL") {

        if (["B", "W", "N"].includes(nextItem.msgId)) {

          const afterFadeItem =
            currentData[currentIndex + 2];

          if (
            afterFadeItem &&
            afterFadeItem.msgId === "A"
          ) {

            setFade(true, nextItem.msgId);

            pendingLoop = false;
            waitMovie = true;

            const movStartIndex =
              getCurrentMovItemIndex(currentIndex);

            waitItem = currentData[movStartIndex];

            setTimeout(() => {

              videoA.classList.remove("show");

              videoA.pause();

              videoA.style.display = "none";

              currentVideo = null;

              isBusy = false;

              ++currentIndex;

              showCurrent();

            }, BLACK_FADE_TIME);

            return;

          } else {

            setFade(true, nextItem.msgId);

            pendingLoop = true;

            setTimeout(() => {

              videoA.classList.remove("show");

              videoA.pause();

              videoA.style.display = "none";

              currentVideo = null;

              isBusy = false;

              ++currentIndex;

              showCurrent();

            }, BLACK_FADE_TIME);

            return;

          }

        } else {

          if (isFirstLoopPlay) {

            document.getElementById("msgArea").style.opacity = 0;

            isFirstLoopPlay = false;

            startFirstLoopDoubleBuffer(srcL);

            currentVideo = activeLoopVideo;

            pendingLoop = false;

            requestAnimationFrame(() => {

              // 次メッセージ
              setTimeout(() => {

                ++currentIndex;

                showCurrent();

              }, FIRST_LOOP_WHITE_WAIT + BLACK_FADE_TIME + 750);

            });

          } else {

            startLoopDoubleBuffer(srcL);

            currentVideo = activeLoopVideo;

            pendingLoop = false;

            requestAnimationFrame(() => {

              // 次メッセージ
              setTimeout(() => {

                ++currentIndex;

                showCurrent();

              }, BLACK_FADE_TIME);

            });

          }

          return;

        }

      }

      // --------------------
      // Aのみ
      // --------------------

      if (moviePattern === "A") {

        if (["B", "W", "N"].includes(nextItem.msgId)) {

          const afterFadeItem =
            currentData[currentIndex + 2];

          if (
            afterFadeItem &&
            afterFadeItem.msgId === "A"
          ) {

            setFade(true, nextItem.msgId);

            pendingLoop = false;
            waitMovie = true;

            const movStartIndex =
              getCurrentMovItemIndex(currentIndex);

            waitItem = currentData[movStartIndex];

            setTimeout(() => {

              videoA.classList.remove("show");

              videoA.pause();

              videoA.style.display = "none";

              currentVideo = null;

              isBusy = false;

              ++currentIndex;

              showCurrent();

            }, BLACK_FADE_TIME);

            return;

          } else {

            setFade(true, nextItem.msgId);

            pendingLoop = false;

            setTimeout(() => {

              videoA.classList.remove("show");

              videoA.pause();

              videoA.style.display = "none";

              currentVideo = null;

              isBusy = false;

              ++currentIndex;

              showCurrent();

            }, BLACK_FADE_TIME);

            return;

          }

        } else {

          setFade(true);

          setTimeout(() => {

            videoA.classList.remove("show");

            videoA.pause();

            videoA.style.display = "none";

            currentVideo = null;

            isBusy = false;

            refreshNextIcon();

          }, BLACK_FADE_TIME);

          return;

        }

      }

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

      setTimeout(() => {

        nextStep();

      }, NEXT_MSG_DELAY_TIME);

    }

  }, BLACK_FADE_TIME);

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
  setFade(true);

  setTimeout(() => {

    if (currentVideo) {

      currentVideo.pause();
      
      currentVideo.classList.remove("show");

      currentVideo.style.display = "none";

    }

    callback();

  }, BLACK_FADE_TIME);

}
