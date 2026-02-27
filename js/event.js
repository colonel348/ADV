/*************************************************
 * 動画パターン定義（B:黒 / W:白）
 *************************************************/
let videoPtn;

const videoPtn1 = [
  { src: "evt1", loop: false, fadeIn: "B", fadeOut: "W" },
  { src: "evt2", loop: true,  fadeIn: "W", fadeOut: "B" },
  { src: "evt3", loop: false, fadeIn: "B", fadeOut: "B" }
];

const videoPtn2 = [
  { src: "evt1", loop: true,  fadeIn: "W", fadeOut: "B" },
  { src: "evt2", loop: false, fadeIn: "B", fadeOut: "B" },
  { src: "evt3", loop: true,  fadeIn: "B", fadeOut: "B" }
];

const videoPtn9 = [
  { src: "evt2", loop: false, fadeIn: "B", fadeOut: "B" }
];

/*************************************************
 * 状態管理
 *************************************************/
let currentIndex = 0;
let loadedCount = 0;
let isReady = false;
let isTransitioning = false;
let firstPlayDone = false;

let whiteFadeTimer = null;
const WHITE_HOLD = 800; // 白フェード時のタメ(ms)

let video, fade, videoWrap;
let loopRAF = null;
const videoCache = [];

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
  return `../media/${chrId}/${evtData.id}/${name}.mp4`;
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
  if (evtData.ptn == "1") {
    videoPtn = videoPtn1;
  } else if (evtData.ptn == "2") {
    videoPtn = videoPtn2;
  } else {
    videoPtn = videoPtn9;
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

        // 白タメ
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
    startVideoCore(index, data, fadeInColor);

    requestAnimationFrame(() => {
      fade.classList.remove("show");
    });
  }
}

/*************************************************
 * 実際の動画ロード＆再生
 *************************************************/
function startVideoCore(index, data, fadeInColor) {
  const src = buildSrc(data.src);

  // 初回は完全非表示（チラ見防止）
  if (!firstPlayDone) {
    video.style.display = "none";
  }

  video.style.visibility = "hidden";
  video.style.opacity = "0";

  if (video.src !== src) video.src = src;
  video.currentTime = 0;

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

  // 最初のフレーム到達後に表示
  const reveal = () => {
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

  if (video.readyState >= 2) {
    reveal();
  } else {
    video.addEventListener("loadeddata", reveal, { once: true });
  }
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

    if (nextIndex >= videoPtn.length) {
      window.location.href =
        `./select.html?chrId=${chrId}&selIdx=${selIdx}`;
      return;
    }

    // ★★★★★ ここ追加（iOS対策）
    if (isIOS()) {
      // 先に軽く play を許可させる
      video.muted = true;
      video.play().catch(()=>{});
      video.pause();
    }

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

  video.addEventListener("ended", () => {
    if (videoPtn[currentIndex].loop) return;
    if (isTransitioning) return;
    goNext();
  });
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
  preloadVideos();
  tapAction();
});
