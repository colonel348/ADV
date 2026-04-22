/*************************************************
 * 動画パターン定義（B:黒 / W:白）
 *************************************************/
let videoPtn;

const ptnV1 = [
  { src: "evt1", loop: false, fadeIn: "B", fadeOut: "B" }
];

const ptnL1 = [
  { src: "evt1", loop: true,  fadeIn: "W", fadeOut: "B" }
];

const ptnV2 = [
  { src: "evt1", loop: false, fadeIn: "B", fadeOut: "W" },
  { src: "evt2", loop: true,  fadeIn: "W", fadeOut: "B" }
];

const ptnL2 = [
  { src: "evt1", loop: true,  fadeIn: "W", fadeOut: "B" },
  { src: "evt2", loop: false, fadeIn: "B", fadeOut: "B" }
];

const ptnV3 = [
  { src: "evt1", loop: false, fadeIn: "B", fadeOut: "W" },
  { src: "evt2", loop: true,  fadeIn: "W", fadeOut: "B" },
  { src: "evt3", loop: false, fadeIn: "B", fadeOut: "B" }
];

const ptnL3 = [
  { src: "evt1", loop: true,  fadeIn: "W", fadeOut: "B" },
  { src: "evt2", loop: false, fadeIn: "B", fadeOut: "W" },
  { src: "evt3", loop: true,  fadeIn: "W", fadeOut: "B" }
];

const ptnV4 = [
  { src: "evt1", loop: false, fadeIn: "B", fadeOut: "W" },
  { src: "evt2", loop: true,  fadeIn: "W", fadeOut: "B" },
  { src: "evt3", loop: false, fadeIn: "B", fadeOut: "W" },
  { src: "evt4", loop: true,  fadeIn: "W", fadeOut: "B" }
];

const ptnL4 = [
  { src: "evt1", loop: true,  fadeIn: "W", fadeOut: "B" },
  { src: "evt2", loop: false, fadeIn: "B", fadeOut: "W" },
  { src: "evt3", loop: true,  fadeIn: "W", fadeOut: "B" },
  { src: "evt4", loop: false, fadeIn: "B", fadeOut: "B" }
];

/*************************************************
 * 状態管理
 *************************************************/
let currentIndex = 0;
let loadedCount = 0;
let isReady = false;
let isTransitioning = false;
let firstPlayDone = false;
let timeUpdateHandler = null;

let whiteFadeTimer = null;
const WHITE_HOLD = 800; // 白フェード時のタメ(ms)
const BLACK_HOLD = 200; // 黒フェード時のタメ(ms)

let video, fade, videoWrap;
let loopRAF = null;
const videoCache = [];

let pageStartTime = 0;
const FIRST_PLAY_DELAY = 3000;
let firstVideoStarted = false;

let fadeOutTriggered = false; // ★追加：早期フェード発火管理
const EARLY_FADE_TIME = 0.8;  // ★動画終了何秒前にフェード開始

let longPressTimer = null;
let isLongPressTriggered = false;
const LONG_PRESS_TIME = 1000;

/*************************************************
 * ユーティリティ
 *************************************************/

/** フェード色正規化 */
function normalizeColor(c) {
  if (!c) return "B";
  const v = String(c).toUpperCase();
  return (v === "W" || v === "WHITE") ? "W" : "B";
}

/** iOS判定 */
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** 動画パス生成 */
function buildSrc(name) {
  return `../data/${tgtEvtData.evtId}/CPT-${tgtEvtData.cpt[cptIdx].cptId}/${name}.mp4`;
}

/** 白遅延クリア */
function clearWhiteDelay() {
  if (whiteFadeTimer) {
    clearTimeout(whiteFadeTimer);
    whiteFadeTimer = null;
  }
}

/*************************************************
 * 動画パターン選択
 *************************************************/
function setVideo() {
  if (tgtEvtData.cpt[cptIdx].ptnId == "V1") {
    videoPtn = ptnV1;
  } else if (tgtEvtData.cpt[cptIdx].ptnId == "L1") {
    videoPtn = ptnL1;
  } else if (tgtEvtData.cpt[cptIdx].ptnId == "V2") {
    videoPtn = ptnV2;
  } else if (tgtEvtData.cpt[cptIdx].ptnId == "L2") {
    videoPtn = ptnL2;
  } else if (tgtEvtData.cpt[cptIdx].ptnId == "V3") {
    videoPtn = ptnV3;
  } else if (tgtEvtData.cpt[cptIdx].ptnId == "L3") {
    videoPtn = ptnL3;
  } else if (tgtEvtData.cpt[cptIdx].ptnId == "V4") {
    videoPtn = ptnV4;
  } else if (tgtEvtData.cpt[cptIdx].ptnId == "L4") {
    videoPtn = ptnL4;
  } 
}

/*************************************************
 * プリロード
 *************************************************/
function preloadVideos() {
  videoPtn.forEach((item, index) => {
    const v = document.createElement("video");

    v.src = buildSrc(item.src);
    v.preload = "auto";
    v.muted = true;
    v.playsInline = true;

    v.addEventListener("loadeddata", () => {
      loadedCount++;
      if (loadedCount === videoPtn.length) {
        isReady = true;
        playVideo(0);
      }
    });

    v.load();
    videoCache[index] = v;
  });
}

/*************************************************
 * フェード色適用
 *************************************************/
function applyFadeColor(color) {
  if (color === "B") {
    fade.classList.add("black");
  } else {
    fade.classList.remove("black");
  }
}

/*************************************************
 * メイン再生制御
 *************************************************/
function playVideo(index) {
  clearWhiteDelay();

  // ★ 初回動画だけ2.5秒制御
  if (!firstVideoStarted && index === 0) {
    const elapsed = performance.now() - pageStartTime;
    const wait = FIRST_PLAY_DELAY - elapsed;

    if (wait > 0) {
      firstVideoStarted = true;
      setTimeout(() => playVideo(index), wait);
      return;
    }
    firstVideoStarted = true;
  }

  currentIndex = index;
  isTransitioning = false;
  stopSeamlessLoop();

  const data = videoPtn[index];
  const fadeInColor = normalizeColor(data.fadeIn);

  // フェード色を先に確定
  applyFadeColor(fadeInColor);

  if (fadeInColor === "W") {
    // ===== 白フェードイン =====

    // 一度黒で完全遮蔽 → 白へ切替（チラ見防止）
    fade.classList.add("black", "show");

    requestAnimationFrame(() => {
      applyFadeColor("W");

      requestAnimationFrame(() => {
        startVideoCore(index, data, fadeInColor);

        whiteFadeTimer = setTimeout(() => {
          fade.classList.remove("show");

          requestAnimationFrame(() => {
            videoWrap.style.transition = "transform 2s linear";
            videoWrap.style.transform = "scale(1.0)";
          });
        }, WHITE_HOLD);
      });
    });

  } else {
    // ===== 黒フェードイン（遅延なし） =====

    fade.classList.add("show");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {

        startVideoCore(index, data, fadeInColor);

        // 黒タメ
        blackFadeTimer = setTimeout(() => {
          fade.classList.remove("show");
        }, BLACK_HOLD);
      });
    });
  }
}

/*************************************************
 * 実際の動画ロード＆再生
 *************************************************/
function startVideoCore(index, data, fadeInColor) {
  const src = buildSrc(data.src);

  if (timeUpdateHandler) {
    video.removeEventListener("timeupdate", timeUpdateHandler);
    timeUpdateHandler = null;
  }

  // 初回は完全非表示（チラ見防止）
  if (!firstPlayDone) {
    video.style.display = "none";
  }

  video.style.visibility = "hidden";
  video.style.opacity = "0";

  if (video.src !== src) video.src = src;
  video.currentTime = 0.001;

  // ズーム初期値
  videoWrap.style.transition = "none";
  videoWrap.style.transform =
    fadeInColor === "W" ? "scale(1.1)" : "scale(1)";

  // 再生開始
  if (data.loop && isIOS()) {
    startSeamlessLoop(video);
  } else {
    video.loop = data.loop;
    video.play().catch(() => {});
  }

  // 早期フェード監視
  fadeOutTriggered = false;

  if (!data.loop) {
    timeUpdateHandler = function () {
      if (fadeOutTriggered) return;
      if (!video.duration) return;

      const remain = video.duration - video.currentTime;

      if (remain <= EARLY_FADE_TIME) {
        fadeOutTriggered = true;

        video.removeEventListener("timeupdate", timeUpdateHandler);
        timeUpdateHandler = null;

        goNext();
      }
    };

    video.addEventListener("timeupdate", timeUpdateHandler);
  }

  // 最初のフレーム到達後に表示
  const revealOnPlay = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!firstPlayDone) {
          video.style.display = "block";
          firstPlayDone = true;
        }
        video.style.visibility = "visible";
        video.style.opacity = "1";
      });
    });
  };

  video.addEventListener("playing", revealOnPlay, { once: true });

}

/*************************************************
 * iOSシームレスループ
 *************************************************/
function startSeamlessLoop(v) {
  const LOOP_MARGIN = 0.06;

  function checkLoop() {
    if (v.duration && v.currentTime >= v.duration - LOOP_MARGIN) {
      v.currentTime = 0.001;
    }
    loopRAF = v.requestVideoFrameCallback(checkLoop);
  }

  v.currentTime = 0.001;
  v.play().then(() => {
    loopRAF = v.requestVideoFrameCallback(checkLoop);
  }).catch(() => {});
}

function stopSeamlessLoop() {
  if (loopRAF) {
    try { video.cancelVideoFrameCallback(loopRAF); } catch (e) {}
    loopRAF = null;
  }
}

/*************************************************
 * 次動画へ
 *************************************************/
function goNext() {
  if (!isReady || isTransitioning) return;

  isTransitioning = true;

  const data = videoPtn[currentIndex];
  const fadeOutColor = normalizeColor(data.fadeOut);
  const nextIndex = currentIndex + 1;

  applyFadeColor(fadeOutColor);
  fade.classList.add("show");

  const FADE_TIME = 600; // CSSと一致させる

  setTimeout(() => {
    // 最後なら遷移
    if (nextIndex >= videoPtn.length) {

      // ① 同一evt内で次のcptがあるか？
      const hasNextCpt = tgtEvtData?.cpt && (cptIdx + 1) < tgtEvtData.cpt.length;

      if (hasNextCpt) {
        // cptIdx = cptIdx+1, evtIdx(=evtIdx)は据え置き
        window.location.href = `./select.html?chrId=${chrId}&evtId=${evtId}&cptIdx=${cptIdx + 1}`;
        return;
      }

      //// ② 次のevtがあるか？
      //const hasNextEvt = (evtIdx + 1) < evtData.length;

      //if (hasNextEvt) {
      //  // evtIdx=evtIdx+1, cptIdxは未設定（=パラメータを付けない）
      //  window.location.href = `./select.html?chrId=${chrId}&evtId=${evtIdx + 1}`;
      //   return;
      //}

      // ③ 次のevtも無い → evtIdxは据え置き、cptIdxは未設定
      window.location.href = `./select.html?chrId=${chrId}&evtId=${evtId}`;
      return;

    }

    // 白のみ追加タメ
    if (fadeOutColor === "W") {
      setTimeout(() => playVideo(nextIndex), WHITE_HOLD);
    } else {
      playVideo(nextIndex);
    }
  }, FADE_TIME);
}

/*************************************************
 * ユーザー操作
 *************************************************/
function tapAction() {
  video.addEventListener("click", goNext);

  // -------------------
  // 長押し開始
  // -------------------
  function startLongPress() {
    if (isTransitioning || isLongPressTriggered) return;
    longPressTimer = setTimeout(() => {
      forceExit();
    }, LONG_PRESS_TIME);
  }

  function cancelLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  // iOS / Android
  video.addEventListener("touchstart", startLongPress, { passive:true });
  video.addEventListener("touchend", cancelLongPress);
  video.addEventListener("touchcancel", cancelLongPress);

  video.addEventListener("ended", () => {
    if (videoPtn[currentIndex].loop) return;
    if (isTransitioning) return;
    if (fadeOutTriggered) return; // ★追加（超重要）

    goNext();
  });
}

/*************************************************
 * タイトル表示
 *************************************************/
function dispTitle() {

  // タイトル描画
  document.querySelector('#title-txt').innerHTML = tgtEvtData.cpt[cptIdx].plcNm;

  setTimeout(() => {
    document.getElementById('title').classList.add('is-animated');
    setTimeout(() => {
      document.getElementById('title-txt').style.opacity = 1;
      setTimeout(() => {
        document.getElementById('title-txt').style.opacity = 0;
        setTimeout(() => {
          document.getElementById('title').classList.remove('is-animated');
        }, 500);
      }, 1500);
    }, 600);
  }, 400);

}

/*************************************************
 * タイトル表示
 *************************************************/
function forceExit() {

  if (isLongPressTriggered) return;

  isLongPressTriggered = true;

  // 他の遷移と競合しないように止める
  isTransitioning = true;

  clearWhiteDelay();
  stopSeamlessLoop();

  if (timeUpdateHandler) {
    video.removeEventListener("timeupdate", timeUpdateHandler);
    timeUpdateHandler = null;
  }

  // 黒フェード
  applyFadeColor("B");
  fade.classList.add("show");

  // フェード後遷移
  setTimeout(() => {

    // 好きな遷移先に変更可
    window.location.href = "./select.html";

  }, 600); // goNextのFADE_TIMEと合わせる
}

/*************************************************
 * 初期化
 *************************************************/
window.addEventListener("load", () => {
  video = document.getElementById("video");
  fade = document.getElementById("fade");
  videoWrap = document.getElementById("videoWrap");

  setParam();
  setVideo();
  dispTitle();
  preloadVideos();
  tapAction();
});
