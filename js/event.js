/*************************************************
 * 設定
 *************************************************/
const videoList = [
  { src: "evt1", loop: false },
  { src: "evt2", loop: true },
  { src: "evt3", loop: false }
];

let currentIndex = 0;
let loadedCount = 0;
let isReady = false;

let video;
let fade;

/*************************************************
 * 全動画プリロード
 *************************************************/
function preloadVideos() {
  videoList.forEach((item, index) => {
    const v = document.createElement("video");

    v.src = '../media/' + chrId + '/' + evtId + '/' + item.src + '.mp4';
    v.preload = "auto";
    v.muted = true;
    v.playsInline = true;

    // 読み込み完了
    v.addEventListener("loadeddata", () => {
      loadedCount++;

      // 全部読み込んだら開始
      if (loadedCount === videoList.length) {
        isReady = true;
        playVideo(0);
      }
    });

    // iOS対策でload開始
    v.load();
  });
}

/*************************************************
 * 動画再生
 *************************************************/
function playVideo(index) {
  currentIndex = index;
  const data = videoList[index];

  video.src = '../media/' + chrId + '/' + evtId + '/' + data.src + '.mp4';
  video.loop = data.loop;
  video.currentTime = 0;

  // scaleリセット
  video.style.transform = "scale(1)";
  video.style.transition = "none";

  // evt02ズーム演出
  if (index === 1) {
    setTimeout(() => {
      video.play();
      video.style.transform = "scale(1.1)";
      setTimeout(() => {
        video.style.transition = "transform 2s";
        video.style.transform = "scale(1.0)";
      }, 50);
    }, 700);
  } else {
    video.play();
  }
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
      window.location.href = "./select.html?chrId=" + chrId + "&selIdx=" + selIdx;
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
      setTimeout(() => {
        fade.classList.remove("show");
      }, 700);
    } else {
      setTimeout(() => {
        fade.classList.remove("show");
      }, 50);
    }

  }, 600);
}

/*************************************************
 * タップ操作
 *************************************************/
function tapAction() {
  video.addEventListener("click", goNext);

  video.addEventListener("ended", () => {
    if (currentIndex === 1) return; // evt02はループ
    goNext();
  });
}

/*************************************************
 * 起動
 *************************************************/
window.addEventListener('load', function() {

  video = document.getElementById("video");
  fade = document.getElementById("fade");

  // パラメタ取得
  setParam();
  // 動画読込
  preloadVideos();
  // タップ操作
  tapAction();
});
