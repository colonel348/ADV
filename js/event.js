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

let moviePattern = "";

let loopWatchActive = false;

let waitMovie = false;
let waitItem = null;

let currentSrcL = "";

let isAutoMode = false;
let isNextReady = false;

let aTextTimer = null;
let aPlaybackSequence = 0;
let aPlaybackRetryTimer = null;
let aPlaybackRetryCleanup = null;

let autoTimer = null;

let isEventEndDialogOpen = false;
let eventEndDialogTimer = null;
let nextEventAtCompletion = null;

let hasConfiguredWhiteFadePlayed = false;

// A動画終了何秒前に次を開始するか
const ACTION_SWITCH_BEFORE = 0.16;
// 最後ではないAのみ動画は、終了前に黒フェードが完了するよう少し早める
const ACTION_ONLY_FADE_BEFORE = 0.55;
// A→Wと初回A→Lの白フェードは、A停止前に白で覆い切れるよう早めに開始する
const FIRST_LOOP_FADE_SWITCH_BEFORE = 0.60;
// L動画終了何秒前に次を開始するか
const LOOP_SWITCH_BEFORE = 0.25;
// 次L動画play後
// fade開始まで待つms
const LOOP_FADE_WAIT = 230;
// fade時間
const LOOP_FADE_TIME = 500;
// fade時間
const BLACK_FADE_TIME = 750;
// 初回L動画を黒画面から表示する際のフェード時間
const FIRST_LOOP_BLACK_FADE_TIME = 1500;
// 最後のA動画は終了前から黒フェードを開始する
const FINAL_ACTION_FADE_BEFORE = 2;
const FINAL_VIDEO_FADE_TIME = 1500;
// イベント終了時、黒フェード完了後にダイアログ表示まで黒画面を保持する時間
const EVENT_END_DIALOG_WAIT = 1000;

const AFTER_TITLE_NEXT_EVT_TIME = 200;
const AFTER_TITLE_BLACK_FADE_TIME = 200;
// 次段落への時間
const NEXT_EVT_TIME = 500;
// 次メッセージへの時間
const NEXT_TEXT_TIME = 4000;
// メッセージのみの自動送り時間
const NEXT_MSG_TEXT_TIME = 3000;
// Nメッセージ表示後、次へ進むまで追加で待つ時間
const N_NEXT_WAIT_TIME = 800;
// タイトル後の時間
const NEXT_TITLE_TIME = 1200;
// 次のメッセージ遅らせ
const NEXT_MSG_DELAY_TIME = 100;
// A動画開始後、最初のAメッセージを追加で待つ時間
const FIRST_A_MSG_DELAY_TIME = 300;

const FIRST_LOOP_WHITE_WAIT = 1500;

/*************************************************
 * JS読込
 *************************************************/
function loadEvent() {

  return new Promise((resolve, reject) => {

    const script = document.createElement("script");

    script.src = getMsgDataPath(tgtEvtData);

    script.onload = () => {
      resolve(window.msgData);
    };

    script.onerror = reject;

    document.body.appendChild(script);

  });
}

/*************************************************
 * 新動画ファイル名の連番取得
 *************************************************/
function getMovieSequenceNo(targetIndex) {

  let activeMovId = "";
  let sequenceNo = 0;
  let previousVideoType = "";

  for (let index = 0; index <= targetIndex; index++) {
    const item = currentData[index];

    if ("movId" in item) {
      if (item.movId !== activeMovId) {
        activeMovId = item.movId;
        sequenceNo = 0;
      }
      previousVideoType = "";
      continue;
    }

    if (item.msgId === "A" || item.msgId === "L") {
      if (item.msgId !== previousVideoType) {
        sequenceNo++;
      }
      previousVideoType = item.msgId;
    } else {
      previousVideoType = "";
    }
  }

  return sequenceNo;
}

function findNextVideoMessageIndex(startIndex, msgId) {

  for (let index = startIndex + 1; index < currentData.length; index++) {
    const item = currentData[index];
    if ("movId" in item) break;
    if (item.msgId === msgId) return index;
  }

  return -1;
}

function getMovieSrc(msgIndex, ptn) {

  if (msgIndex < 0) return "";

  const movIndex = getCurrentMovItemIndex(msgIndex);
  const movId = movIndex >= 0 ? currentData[movIndex].movId : "";

  return getMoviePath(
    tgtEvtData,
    movId,
    getMovieSequenceNo(msgIndex),
    ptn
  );
}

/*************************************************
 * 初期化
 *************************************************/

/*************************************************
 * L動画の事前準備
 *************************************************/
function prepareLoopVideos(srcL) {
  const video = activeLoopVideo;

  if (video.dataset.loopSrc === srcL) return;

  video.pause();
  video.dataset.loopSrc = srcL;
  video.src = srcL;
  video.preload = "auto";
  video.load();
}

/*************************************************
 * 待機用L動画の先読み
 *************************************************/
function prepareStandbyLoopVideo(srcL) {
  const video = standbyLoopVideo;

  if (video.dataset.loopSrc === srcL) return;

  video.pause();
  video.dataset.loopSrc = srcL;
  video.src = srcL;
  video.preload = "auto";
  video.load();
}

/*************************************************
 * 初回段落のL動画先読み
 *************************************************/
function preloadInitialLoopVideo() {
  // デバッグ開始位置を含む、最初に再生する段落を取得
  const movIndex = currentData[currentIndex]?.movId
    ? currentIndex
    : currentData.findIndex(item => "movId" in item);

  if (movIndex < 0) return;

  const pattern = getMoviePattern(movIndex);

  if (pattern === "AL" || pattern === "L") {
    const targetLIndex = findNextVideoMessageIndex(movIndex, "L");

    if (targetLIndex < 0) return;

    // 初回表示前に実表示用L動画の読み込みを開始
    prepareLoopVideos(
      getMovieSrc(targetLIndex, "L")
    );
  }
}

/*************************************************
 * iOS向けL動画デコーダのウォームアップ
 *************************************************/
function warmupLoopVideo(video) {
  const warmup = () => {
    if (video.dataset.loopWarmed === "1") return;

    video.dataset.loopWarmed = "1";
    video.style.display = "block";

    video.play()
      .then(() => {
        const pauseAtFirstFrame = () => {
          // すでに本再生に切り替わった場合は止めない。
          if (!video.classList.contains("show")) {
            video.pause();
            video.currentTime = 0;
          }
        };

        if (typeof video.requestVideoFrameCallback === "function") {
          video.requestVideoFrameCallback(pauseAtFirstFrame);
        } else {
          requestAnimationFrame(pauseAtFirstFrame);
        }
      })
      .catch(() => {
        delete video.dataset.loopWarmed;
      });
  };

  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    warmup();
  } else {
    video.addEventListener("loadeddata", warmup, { once: true });
  }
}

window.addEventListener("load", () => {

  videoA = document.getElementById("videoA");
  videoL1 = document.getElementById("videoL1");
  videoL2 = document.getElementById("videoL2");

  activeLoopVideo = videoL1;
  standbyLoopVideo = videoL2;
  
  fade = document.getElementById("fade");

  bindEventEndDialog();

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

  const titleBtn =
    document.getElementById("titleBtn");
  const skipBtn =
    document.getElementById("skipBtn");
  const nextBtn =
    document.getElementById("nextBtn");

  titleBtn.addEventListener(
    "click",
    e => {

      e.stopPropagation();
      moveTitle();

    }
  );

  skipBtn.addEventListener(
    "click",
    e => {

      e.stopPropagation();
      moveSkip();

    }
  );

  nextBtn.addEventListener(
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

  // 動画事前読込
  // 全段落分の非表示videoを生成する事前読込は、iOS Safariでは
  // デコーダ競合を起こしやすいため行わない。L動画はA再生開始時に
  // 実表示用video要素へ限定して準備する。

  // デバッグ開始位置
  if (debugMovId) {

    const movIndex =
      findMovIndex(debugMovId);

    if (movIndex >= 0) {

      currentIndex = movIndex;

      // 出現順指定で途中のブロックへ移動した場合、スキップした範囲の
      // 白フェードを再実行しない。
      const fadeMovNo = String(tgtEvtData?.fadeEvt || "");
      hasConfiguredWhiteFadePlayed = Boolean(fadeMovNo) &&
        currentData
          .slice(0, movIndex)
          .some(item =>
            item.movId &&
            String(item.movId).charAt(3) === fadeMovNo
          );

    }

  }

  preloadInitialLoopVideo();

  // デバッグ開始
  if (debugMovId) {

    showCurrent();

  }

  // 通常開始
  else {

    // 初回だけ1秒待つ
    setTimeout(() => {

      showTitle(tgtEvtData.plcNm || "");

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

  const isFinalLoopClick =
    currentItem?.msgId === "L" &&
    currentVideo !== videoA &&
    currentIndex === currentData.length - 1;

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

    const movItemIndex =
      getCurrentMovItemIndex(currentIndex);

    const movId =
      movItemIndex >= 0
        ? currentData[movItemIndex].movId
        : "";

    const isFirstMovIdBlock =
      isFirstBlockAfterMovIdChange(movItemIndex);

    if (
      isFirstMovIdBlock ||
      shouldUseFirstLoopWhiteFade(movId)
    ) {

      const useWhiteFade =
        startInitialLoopVideo(currentSrcL, movId);

      pendingLoop = false;

      setTimeout(() => {

        if (!useWhiteFade && moviePattern === "L" && isFirstMovIdBlock) {
          hideFirstLoopBlackFade();
        } else if (!useWhiteFade) {
          setFade(false);
        }

        currentVideo = activeLoopVideo;

        showCurrent();

      }, useWhiteFade
        ? FIRST_LOOP_WHITE_WAIT + BLACK_FADE_TIME
        : BLACK_FADE_TIME);

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

    if (isFinalLoopClick) {
      startFinalVideoBlackFade(currentVideo);
      return;
    }

    // 画面遷移
    moveSelect();

    return;

  }

  showCurrent();

}

/*************************************************
 * movId位置取得
 * evt2     : evt2の1つ目
 * evt2-2   : evt2の2つ目
 *************************************************/
function findMovIndex(debugMovValue) {

  const value = String(debugMovValue || "");
  const occurrenceMatch = value.match(/^(.*)-([1-9]\d*)$/);
  const movId = occurrenceMatch
    ? occurrenceMatch[1]
    : value;
  const targetOccurrence = occurrenceMatch
    ? Number(occurrenceMatch[2])
    : 1;

  let occurrence = 0;

  return currentData.findIndex(item => {

    if (item.movId !== movId) {
      return false;
    }

    occurrence++;
    return occurrence === targetOccurrence;

  });

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

  // L動画ループ上の最後のLメッセージだけクリック待ちにする。
  if (
    !currentItem ||
    currentItem.msgId !== "L" ||
    currentVideo === videoA
  ) {
    return false;
  }

  return !nextItem || "movId" in nextItem;

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

    const aTotal =
      countContinuousA(
        currentIndex - getContinuousAIndex(currentIndex) + 1
      );

    const aIndex =
      getContinuousAIndex(currentIndex);

    const aTextTime =
      getATextTime(aTotal);

    // 次のAがあるなら進める
    if (aIndex < aTotal) {

      aTextTimer = setTimeout(() => {

        const nowItem =
          currentData[currentIndex];

        if (
          !nowItem ||
          nowItem.msgId !== "A" ||
          currentVideo !== videoA
        ) {
          return;
        }

        currentIndex++;
        showCurrent();

      }, aTextTime);

      return;

    }

    // 最後のAメッセージはA動画が切り替わるまで表示し続ける。
    return;
  }

  // --------------------
  // 停止メッセージなら
  // AUTO時のみ進行
  // --------------------
  if (isWaitMessage()) {

    if (isAutoMode) {

      const currentItem =
        currentData[currentIndex];

      const waitTime = getMessageWaitTime(currentItem);

      autoTimer = setTimeout(() => {
        nextStep();
      }, waitTime);

      return;
    }

    autoTimer = setTimeout(() => {
      refreshNextIcon();
    }, NEXT_TEXT_TIME);

    return;
  }

  let waitTime =
    isAfterTitle
      ? NEXT_TITLE_TIME
      : getMessageWaitTime(currentItem);

  autoTimer = setTimeout(() => {
    nextStep();
  }, waitTime);

}

/*************************************************
 * 待ち時間
 *************************************************/
function getMessageWaitTime(item) {

  if (item && item.msgId === "N") {
    return NEXT_MSG_TEXT_TIME + N_NEXT_WAIT_TIME;
  }

  if (
    item &&
    ["B", "W"].includes(item.msgId)
  ) {
    return NEXT_MSG_TEXT_TIME;
  }

  return NEXT_TEXT_TIME;

}

/*************************************************
 * A動画カウント
 *************************************************/
function countContinuousA(index) {

  let count = 0;

  for (let i = index; i < currentData.length; i++) {

    const item = currentData[i];

    if (!item || item.msgId !== "A") {
      break;
    }

    count++;

  }

  return count;
}

function getATextTime(aTotal) {

  if (aTotal === 2) {
    return 4300;
  }

  if (aTotal >= 3) {
    return 4600;
  }

  return NEXT_TEXT_TIME;
}

function getContinuousAIndex(index) {

  let count = 0;

  for (let i = index; i >= 0; i--) {

    const item = currentData[i];

    if (!item || item.msgId !== "A") {
      break;
    }

    count++;

  }

  return count;
}

/*************************************************
 * イベント終了ダイアログ
 *************************************************/
function getNextEventAtCompletion() {

  const currentPrefix = evtId.substring(0, 4);
  const currentLevelText = evtId.charAt(4);
  const currentLevel = Number(currentLevelText);

  if (!currentPrefix || !/^[1-4]$/.test(currentLevelText)) {
    return null;
  }

  return evtData
    .filter(data =>
      data.evtId.substring(0, 4) === currentPrefix &&
      /^[1-4]$/.test(data.evtId.charAt(4)) &&
      Number(data.evtId.charAt(4)) > currentLevel
    )
    .sort((a, b) =>
      Number(a.evtId.charAt(4)) - Number(b.evtId.charAt(4))
    )[0] || null;

}

function showEventEndDialog(delay = 0) {

  if (isEventEndDialogOpen) return;

  isEventEndDialogOpen = true;
  isNextReady = false;
  clearTimeout(autoTimer);
  clearATextTimer();

  const dialog = document.getElementById("eventEndDialog");
  const message = document.getElementById("eventEndDialogMessage");
  const nextButton = document.getElementById("eventEndNextBtn");
  const controlArea = document.getElementById("controlArea");

  nextEventAtCompletion = getNextEventAtCompletion();

  message.textContent = nextEventAtCompletion
    ? "次のイベントに進みますか？"
    : "タイトルに戻りますか？";

  nextButton.textContent = nextEventAtCompletion ? "進む" : "戻る";
  controlArea.classList.remove("show");
  document.getElementById("msgArea").style.opacity = 0;

  // 動画を黒フェードで完全に隠してからダイアログを表示する。
  setFade(true, "B");

  clearTimeout(eventEndDialogTimer);
  eventEndDialogTimer = setTimeout(() => {

    if (currentVideo) {
      currentVideo.pause();
    }

    dialog.classList.remove("is-leaving");
    dialog.classList.add("show");
    dialog.setAttribute("aria-hidden", "false");

  }, Math.max(
    delay,
    BLACK_FADE_TIME + EVENT_END_DIALOG_WAIT
  ));

}

function moveFromEventEndDialog(targetEvent) {

  const dialog = document.getElementById("eventEndDialog");
  dialog.classList.add("is-leaving");

  setTimeout(() => {

    if (!targetEvent) {
      location.href = './select.html?chrId=' + encodeURIComponent(chrId);
      return;
    }

    location.href =
      './select.html?chrId=' + encodeURIComponent(chrId) +
      '&evtId=' + encodeURIComponent(targetEvent.evtId) +
      '&autoFlg=' + encodeURIComponent(autoFlg);

  }, 800);

}

function bindEventEndDialog() {

  const cancelButton = document.getElementById("eventEndCancelBtn");
  const nextButton = document.getElementById("eventEndNextBtn");

  cancelButton.addEventListener("click", event => {
    event.stopPropagation();
    moveFromEventEndDialog(
      evtData.find(data => data.evtId === evtId) || tgtEvtData
    );
  });

  nextButton.addEventListener("click", event => {
    event.stopPropagation();
    moveFromEventEndDialog(nextEventAtCompletion);
  });

}

/*************************************************
 * select遷移
 *************************************************/
function moveSelect(
  transitionTime = BLACK_FADE_TIME
) {

  showEventEndDialog(transitionTime);

}

/*************************************************
 * タイトルへ戻る
 *************************************************/
function moveTitle() {

  setFade(true);
  document.getElementById("msgArea").style.opacity = 0;

  setTimeout(() => {
    location.href = './select.html?chrId=' + chrId;
  }, BLACK_FADE_TIME);

}

/*************************************************
 * 現在のイベントをスキップして選択画面へ戻る
 *************************************************/
function moveSkip() {

  setFade(true);
  document.getElementById("msgArea").style.opacity = 0;

  const nextEvent = getNextEventAtCompletion() || tgtEvtData;

  setTimeout(() => {
    location.href = './select.html?chrId=' + chrId + '&evtId=' + nextEvent.evtId + '&autoFlg=' + autoFlg;
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
 * 初回L動画の白フェード判定
 *************************************************/
function shouldUseFirstLoopWhiteFade(movId) {

  return (
    !hasConfiguredWhiteFadePlayed &&
    String(tgtEvtData?.fadeEvt || "") ===
    String(movId || "").charAt(3)
  );

}

function startInitialLoopVideo(srcL, movId) {

  const useWhiteFade =
    shouldUseFirstLoopWhiteFade(movId);

  if (useWhiteFade) {
    hasConfiguredWhiteFadePlayed = true;
    startFirstLoopDoubleBuffer(srcL);
  } else {
    startLoopDoubleBuffer(srcL);
  }

  return useWhiteFade;

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

// movIdが別の値へ切り替わった直後の最初のブロックかを判定する。
// 同じmovIdが連続する後続ブロックは初回として扱わない。
function isFirstBlockAfterMovIdChange(movItemIndex) {

  if (
    movItemIndex < 0 ||
    !currentData[movItemIndex] ||
    !("movId" in currentData[movItemIndex])
  ) {
    return false;
  }

  const movId = currentData[movItemIndex].movId;

  for (let i = movItemIndex - 1; i >= 0; i--) {

    if ("movId" in currentData[i]) {
      return currentData[i].movId !== movId;
    }

  }

  return true;
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

          const movItemIndex =
            getCurrentMovItemIndex(currentIndex);

          const isFirstLoopOnly =
            msgId === "L" &&
            moviePattern === "L" &&
            (
              isFirstBlockAfterMovIdChange(movItemIndex) ||
              shouldUseFirstLoopWhiteFade(waitItem?.movId)
            );

          delayMessage = true;

          playMovie(waitItem, currentIndex);

          // Aメッセージは、A動画のフレームが実際に表示されたことを
          // 確認した後にshowCurrentを再実行して表示する。
          if (msgId === "A" || isFirstLoopOnly) {
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

  // 空メッセージでは文字要素が生成されないため、そのまま次の表示へ進める
  if (spans.length === 0) {
    isTyping = false;
    startAutoNext();
    return;
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

  const isFirstMovIdBlock =
    isFirstBlockAfterMovIdChange(movStartIndex);

  const targetAIndex =
    aMsgIndex !== null
      ? aMsgIndex
      : findNextAIndex(movStartIndex);

  const targetLIndex =
    findNextVideoMessageIndex(movStartIndex, "L");

  const srcA = getMovieSrc(targetAIndex, "A");
  const srcL = getMovieSrc(targetLIndex, "L");

  currentSrcL = srcL;

  // Lのみ
  if (moviePattern === "L") {

    if (
      isFirstMovIdBlock ||
      shouldUseFirstLoopWhiteFade(movId)
    ) {

      prepareLoopVideos(srcL);

      const useWhiteFade =
        startInitialLoopVideo(srcL, movId);

      setTimeout(() => {

        if (!useWhiteFade) {
          hideFirstLoopBlackFade();
        }

        isBusy = false;

        if (waitMovie) {
          waitMovie = false;
          showCurrent();
        } else {
          nextStep();
        }

      }, useWhiteFade
        ? FIRST_LOOP_WHITE_WAIT + BLACK_FADE_TIME + 750
        : BLACK_FADE_TIME);

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
  playSeamlessMovie(srcA, srcL, movId);

}

/*************************************************
 * L動画初回ダブルバッファループ
 *************************************************/
function startFirstLoopDoubleBuffer(srcL) {

  setFade(true, "W");

  setTimeout(() => {

    // 白で隠れている間にAを消す
    videoA.classList.remove("show");
    videoA.pause();
    videoA.style.display = "none";

    startLoopDoubleBuffer(srcL, true);

    currentVideo = activeLoopVideo;

    const waitShow = () => {

      if (activeLoopVideo.classList.contains("show")) {

        // show直後ではなく、少し描画を待ってから白フェード解除
        setTimeout(() => {

          setFade(false);

        }, 200);

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

  // A再生開始時に読み込んだ実表示用のL動画をそのまま使う。
  // ここでsrc設定とload()をやり直すと、iOS Safariではデコード待ちが発生する。
  prepareLoopVideos(srcL);

  activeLoopVideo.currentTime = 0;
  standbyLoopVideo.currentTime = 0;

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
      .then(() => {
        activeLoopVideo.classList.add("show");

        if (firstEffect) {
          requestAnimationFrame(() => {
            activeLoopVideo.style.transition =
              "transform 2.0s ease, filter 2.0s ease";
            activeLoopVideo.style.transform = "scale(1)";
            activeLoopVideo.style.filter = "blur(0px)";
          });
        }
      })
      .catch(() => {});

  });

  setTimeout(() => {

    videoA.classList.remove("show");

  }, 2000);

  setTimeout(() => {
    prepareStandbyLoopVideo(srcL);
  }, 300);

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
 * A動画再生（読込待ち・一時的なplay失敗時は再試行）
 *************************************************/
function startActionVideoPlayback(playbackSequence) {

  if (aPlaybackRetryCleanup) {
    aPlaybackRetryCleanup();
  }

  let playPending = false;
  let playbackStarted = false;
  let retryCount = 0;

  const cleanup = () => {
    clearTimeout(aPlaybackRetryTimer);
    aPlaybackRetryTimer = null;
    videoA.removeEventListener("loadeddata", retryWhenReady);
    videoA.removeEventListener("canplay", retryWhenReady);
    if (aPlaybackRetryCleanup === cleanup) {
      aPlaybackRetryCleanup = null;
    }
  };

  const attemptPlay = () => {

    if (
      playbackStarted ||
      playPending ||
      playbackSequence !== aPlaybackSequence ||
      currentVideo !== videoA
    ) {
      if (playbackSequence !== aPlaybackSequence) cleanup();
      return;
    }

    playPending = true;

    const playPromise = videoA.play();

    if (!playPromise || typeof playPromise.then !== "function") {
      playPending = false;
      return;
    }

    playPromise
      .then(() => {
        playbackStarted = true;
        playPending = false;
        cleanup();
      })
      .catch(() => {
        playPending = false;

        if (playbackSequence !== aPlaybackSequence) {
          cleanup();
          return;
        }

        retryCount++;
        if (retryCount > 15) return;

        clearTimeout(aPlaybackRetryTimer);
        aPlaybackRetryTimer = setTimeout(attemptPlay, 200);
      });
  };

  function retryWhenReady() {
    retryCount = 0;
    attemptPlay();
  }

  videoA.addEventListener("loadeddata", retryWhenReady);
  videoA.addEventListener("canplay", retryWhenReady);
  aPlaybackRetryCleanup = cleanup;
  attemptPlay();

}

function hideFirstLoopBlackFade() {

  fade.classList.add("first-loop-black-fade");
  void fade.offsetWidth;
  setFade(false);

  setTimeout(() => {
    fade.classList.remove("first-loop-black-fade");
  }, FIRST_LOOP_BLACK_FADE_TIME);

}

function startFinalVideoBlackFade(targetVideo) {

  fade.classList.add("final-video-black-fade");
  void fade.offsetWidth;
  setFade(true, "B");

  setTimeout(() => {

    if (targetVideo) {
      targetVideo.pause();
    }

    currentVideo = null;
    isBusy = false;
    fade.classList.remove("final-video-black-fade");

  }, FINAL_VIDEO_FADE_TIME);

  moveSelect(
    FINAL_VIDEO_FADE_TIME + EVENT_END_DIALOG_WAIT
  );

}

/*************************************************
 * 動画シームレス再生
 *************************************************/
function playSeamlessMovie(srcA, srcL, movId) {

  const playbackSequence = ++aPlaybackSequence;

  const actionMovItemIndex =
    getCurrentMovItemIndex(currentIndex);

  const isFinalActionVideo =
    moviePattern === "A" &&
    currentData[currentData.length - 1]?.msgId === "A" &&
    !currentData.slice(actionMovItemIndex + 1).some(item =>
      "movId" in item
    );

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

  // A→Lでは、Aの再生中に実表示用L動画のネットワーク取得と
  // 最初のフレームのデコードを済ませておく。
  if (moviePattern === "AL") {
    prepareLoopVideos(srcL);
  }

  // ソース設定
  videoA.src = srcA;
  videoA.currentTime = 0;

  // preload
  videoA.load();

  // playingだけではSafariで映像フレームの描画前に通知される場合がある。
  // 実際のフレーム描画（非対応環境ではcurrentTimeの進行）を確認してから
  // 黒フェード解除と最初のメッセージ表示を開始する。
  videoA.addEventListener("playing", () => {

    let playbackConfirmed = false;

    const onPlaybackConfirmed = () => {

      if (playbackConfirmed) return;

      if (
        playbackSequence !== aPlaybackSequence ||
        currentVideo !== videoA
      ) {
        return;
      }

      playbackConfirmed = true;

      setTimeout(() => {

        if (
          playbackSequence !== aPlaybackSequence ||
          currentVideo !== videoA
        ) {
          return;
        }

        setFade(false);

        setTimeout(() => {

          if (
            playbackSequence !== aPlaybackSequence ||
            currentVideo !== videoA
          ) {
            return;
          }

          isBusy = false;

          if (waitMovie) {
            waitMovie = false;
            showCurrent();
          } else {
            nextStep();
          }

        }, FIRST_A_MSG_DELAY_TIME);

      }, BLACK_FADE_TIME);

    };

    if (typeof videoA.requestVideoFrameCallback === "function") {

      videoA.requestVideoFrameCallback(() => {
        onPlaybackConfirmed();
      });

      return;
    }

    const waitForCurrentTime = () => {

      if (
        playbackSequence !== aPlaybackSequence ||
        currentVideo !== videoA
      ) {
        return;
      }

      if (
        !videoA.paused &&
        videoA.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        videoA.currentTime > 0.03
      ) {
        onPlaybackConfirmed();
        return;
      }

      requestAnimationFrame(waitForCurrentTime);

    };

    waitForCurrentTime();

  }, { once: true });

  // --------------------
  // A表示
  // --------------------

  videoA.style.display = "block";

  requestAnimationFrame(() => {

    videoA.classList.add("show");

    currentVideo = videoA;

    startActionVideoPlayback(playbackSequence);

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

    const nextItem =
      currentData[currentIndex + 1];

    const useEarlyWhiteFade =
      nextItem &&
      (
        nextItem.msgId === "W" ||
        (
          moviePattern === "AL" &&
          shouldUseFirstLoopWhiteFade(movId) &&
          !["B", "W", "N"].includes(nextItem.msgId)
        )
      );

    const switchBefore = useEarlyWhiteFade
      ? FIRST_LOOP_FADE_SWITCH_BEFORE
      : isFinalActionVideo
        ? FINAL_ACTION_FADE_BEFORE
        : moviePattern === "A"
          ? ACTION_ONLY_FADE_BEFORE
          : ACTION_SWITCH_BEFORE;

    // 終了直前
    if (remain <= switchBefore) {

      // イベント末尾のA動画は、停止フレームが見える前に
      // 終了2秒前から1.5秒かけて黒で覆う。
      if (isFinalActionVideo) {

        currentIndex = currentData.length;
        clearATextTimer();
        startFinalVideoBlackFade(videoA);

        return;
      }

      // 最後のAメッセージでイベント終了
      if (!nextItem) {

        currentIndex = currentData.length;

        // 黒フェード完了後に動画を停止し、
        // 黒画面を少し保持してから遷移
        setTimeout(() => {

          videoA.pause();

          currentVideo = null;
          isBusy = false;

        }, BLACK_FADE_TIME);

        moveSelect(
          BLACK_FADE_TIME + NEXT_EVT_TIME
        );

        return;

      }

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

          const movStartIndex =
            getCurrentMovItemIndex(currentIndex);

          if (
            isFirstBlockAfterMovIdChange(movStartIndex) ||
            shouldUseFirstLoopWhiteFade(movId)
          ) {

            const useWhiteFade =
              shouldUseFirstLoopWhiteFade(movId);

            if (useWhiteFade) {
              document.getElementById("msgArea").style.opacity = 0;
            }

            startInitialLoopVideo(srcL, movId);

            currentVideo = activeLoopVideo;

            pendingLoop = false;

            requestAnimationFrame(() => {

              // 次メッセージ
              setTimeout(() => {

                ++currentIndex;

                showCurrent();

              }, useWhiteFade
                ? FIRST_LOOP_WHITE_WAIT + BLACK_FADE_TIME + 750
                : BLACK_FADE_TIME);

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

            // 動画終了時点で未表示の連続Aメッセージがあっても、
            // クリック待ちにはせず次の動画またはイベント終了へ進む。
            while (
              currentData[currentIndex + 1]?.msgId === "A"
            ) {
              currentIndex++;
            }

            nextStep();

          }, BLACK_FADE_TIME);

          return;

        }

      }

    }

    requestAnimationFrame(watch);

  };

  watch();

  // 次メッセージ
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
