/*************************************************
 * 設定
 *************************************************/
const videoList = [
  { src: "evt1", loop: false },
  { src: "evt2", loop: true }, // ← iOS疑似ループ対象
  { src: "evt3", loop: false }
];

let currentIndex = 0;
let loadedCount = 0;
let isReady = false;

let video;
let fade;
let videoWrap;

let loopRAF = null;
const videoCache = [];

/*************************************************
 * iOS判定
 *************************************************/
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/*************************************************
 * 全動画プリロード（完全版）
 *************************************************/
function preloadVideos() {
  videoList.forEach((item, index) => {
    const v = document.createElement("video");

    v.src = '../media/' + chrId + '/' + evtId + '/' + item.src + '.mp4';
    v.preload = "auto";
    v.muted = true;
    v.playsInline = true;
    v.loop = false; // ★重要：ネイティブループ禁止

    v.addEventListener("loadeddata", () => {
      loadedCount++;

      if (loadedCount === videoList.length) {
        isReady = true;
        playVideo(0);
      }
    });

    v.load();
    videoCache[index] = v;
  });
}

/*************************************************
 * 動画再生（iOS安定版）
 *************************************************/
function playVideo(index) {
  currentIndex = index;
  const data = videoList[index];

  // 既存ループ停止
  stopSeamlessLoop();

  const src = '../media/' + chrId + '/' + evtId + '/' + data.src + '.mp4';

  // src変更時のガタつき防止
  if (video.src !== src) {
    video.src = src;
  }

  video.currentTime = 0;

  // ズームリセット
  videoWrap.style.transform = "scale(1)";
  videoWrap.style.transition = "none";

  // ===== 2本目（iOSループ特別処理） =====
  if (index === 1 && isIOS()) {
    startSeamlessLoop(video);
    startZoomIOS();
  } else {
    video.loop = data.loop;
    video.play().catch(()=>{});
  }
}

/*************************************************
 * iOS専用：シームレスループ（最重要）
 *************************************************/
function startSeamlessLoop(v) {
  const LOOP_MARGIN = 0.06;

  function checkLoop(now, metadata) {
    if (v.duration && v.currentTime >= v.duration - LOOP_MARGIN) {
      v.currentTime = 0.001; // ← 0にしないのが超重要
    }
    loopRAF = v.requestVideoFrameCallback(checkLoop);
  }

  v.currentTime = 0.001;

  v.play().then(() => {
    loopRAF = v.requestVideoFrameCallback(checkLoop);
  }).catch(()=>{});
}

function stopSeamlessLoop() {
  if (loopRAF) {
    try {
      video.cancelVideoFrameCallback(loopRAF);
    } catch(e){}
    loopRAF = null;
  }
}

/*************************************************
 * iOSズーム（wrapperに適用）
 *************************************************/
function startZoomIOS() {
  setTimeout(() => {
    videoWrap.style.transform = "scale(1.1)";

    setTimeout(() => {
      videoWrap.style.transition = "transform 2s linear";
      videoWrap.style.transform = "scale(1.0)";
    }, 50);
  }, 700);
}

/*************************************************
 * フェード → 次へ
 *************************************************/
function goNext() {
  if (!isReady) return;

  if (currentIndex === 0) {
    fade.classList.remove("black");
    doFade(() => playVideo(1));

  } else if (currentIndex === 1) {
    fade.classList.add("black");
    doFade(() => playVideo(2));

  } else {
    fade.classList.add("black");
    doFade(() => {
      window.location.href =
        "./select.html?chrId=" + chrId + "&selIdx=" + selIdx;
    });
  }
}

/*************************************************
 * フェード処理
 *************************************************/
function doFade(callback) {
  fade.classList.add("show");

  setTimeout(() => {
    callback();

    if (currentIndex === 1) {
      setTimeout(() => fade.classList.remove("show"), 700);
    } else {
      setTimeout(() => fade.classList.remove("show"), 50);
    }
  }, 600);
}

/*************************************************
 * タップ操作
 *************************************************/
function tapAction() {
  video.addEventListener("click", goNext);

  video.addEventListener("ended", () => {
    if (currentIndex === 1) return; // ループ中は無視
    goNext();
  });
}

/*************************************************
 * 起動
 *************************************************/
window.addEventListener("load", () => {
  video = document.getElementById("video");
  fade = document.getElementById("fade");
  videoWrap = document.getElementById("videoWrap");

  setParam();        // ← 既存関数
  preloadVideos();   // ← 全事前読込
  tapAction();
});
