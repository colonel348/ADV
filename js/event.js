/*************************************************
 * 設定
 *************************************************/
const videoList = [
  { id: "video0", src: "evt1", loop: false },
  { id: "video1", src: "evt2", loop: true },
  { id: "video2", src: "evt3", loop: false }
];

let currentIndex = 0;
let isReady = false;

let videos = [];
let fade;

/*************************************************
 * 全動画プリロード（安定版）
 *************************************************/
function preloadVideos() {
  let readyCount = 0;

  videoList.forEach((item, index) => {
    const v = document.getElementById(item.id);

    v.src = '../media/' + chrId + '/' + evtId + '/' + item.src + '.mp4';
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.loop = item.loop;

    // 表示OFF
    v.style.display = "none";

    v.addEventListener("canplaythrough", () => {
      readyCount++;
      if (readyCount === videoList.length) {
        isReady = true;
        playVideo(0);
      }
    });

    videos.push(v);
    v.load();
  });
}

/*************************************************
 * 動画再生（超安定）
 *************************************************/
function playVideo(index) {
  currentIndex = index;

  videos.forEach(v => {
    v.pause();
    v.style.display = "none";
  });

  const v = videos[index];
  v.style.display = "block";

  // evt02ズーム演出
  if (index === 1) {
    v.style.transform = "scale(1)";
    v.style.transition = "none";

    setTimeout(() => {
      v.play();

      v.style.transform = "scale(1.1)";
      setTimeout(() => {
        v.style.transition = "transform 2s linear";
        v.style.transform = "scale(1.0)";
      }, 50);
    }, 700);
  } else {
    v.play();
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

    setTimeout(() => {
      fade.classList.remove("show");
    }, currentIndex === 1 ? 700 : 50);

  }, 600);
}

/*************************************************
 * タップ操作（安定版）
 *************************************************/
function tapAction() {
  videos.forEach((v, index) => {
    v.addEventListener("click", goNext);

    v.addEventListener("ended", () => {
      if (index === 1) return; // ループ動画は無視
      goNext();
    });
  });
}

/*************************************************
 * 起動
 *************************************************/
window.addEventListener("load", function () {
  fade = document.getElementById("fade");

  setParam();
  preloadVideos();

  // preload後にvideosが入るので少し遅延
  setTimeout(tapAction, 100);
});
