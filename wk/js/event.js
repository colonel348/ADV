/*************************************************
 * 状態
 *************************************************/

let currentIndex = 0;

let currentData = null;

let videoA;
let videoL;

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

/*************************************************
 * 動画プリロード
 *************************************************/
function preloadMovies() {

  const evtId = currentData.evtId;

  const cptId = "1";

  currentData.msgInfo.forEach(item => {

    // 動画なし
    if (
      !item.movId ||
      item.movId === "plg" ||
      item.movId === "elg"
    ) {
      return;
    }

    // A/L両方
    const sources = [

      `../data/${evtId}/CPT-${cptId}/${item.movId}-A.mp4`,

      `../data/${evtId}/CPT-${cptId}/${item.movId}-L.mp4`

    ];

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
  videoL = document.getElementById("videoL");
  fade = document.getElementById("fade");

  init();

  document.body.addEventListener("click", nextStep);

});

/*************************************************
 * 開始
 *************************************************/

function init() {

  const params = new URLSearchParams(location.search);

  const evtId = params.get("evtId");

  currentData = msgData.find(v => v.evtId === evtId);

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

  currentIndex++;

  if (currentIndex >= currentData.msgInfo.length) {
    console.log("終了");
    return;
  }

  showCurrent();

}

/*************************************************
 * 現在行表示
 *************************************************/

function showCurrent() {

  const item = currentData.msgInfo[currentIndex];

  // メッセージ
  if ("msgTxt" in item) {

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
    if (item.movId === "elg") {

      fadeOutVideo(() => {

        setTimeout(() => {

          isBusy = false;

          nextStep();

        }, 300);

      }, false);

      return;

    }

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

      let wait = 35;

      if (char === "、") {
        wait = 120;
      }

      if (char === "。") {
        wait = 250;
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

  const evtId = currentData.evtId;

  const cptId = "1";

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

  const srcA =
    `../data/${evtId}/CPT-${cptId}/${movId}-A.mp4`;

  const srcL =
    `../data/${evtId}/CPT-${cptId}/${movId}-L.mp4`;

  playSeamlessMovie(srcA, srcL);

}

/*************************************************
 * 動画シームレス再生
 *************************************************/
function playSeamlessMovie(srcA, srcL) {

  fade.classList.add("show");

  setTimeout(() => {

    videoA.classList.remove("show");
    videoL.classList.remove("show");

    videoA.style.display = "none";
    videoL.style.display = "none";

    // 停止
    videoA.pause();
    videoL.pause();

    // ソース設定
    videoA.src = srcA;
    videoL.src = srcL;

    videoA.currentTime = 0;
    videoL.currentTime = 0;

    videoA.loop = false;
    videoL.loop = true;

    // preload
    videoA.load();
    videoL.load();

    // --------------------
    // A表示
    // --------------------

    videoA.style.display = "block";

    requestAnimationFrame(() => {

      videoA.classList.add("show");

      currentVideo = videoA;

      videoA.play().then(() => {

        fade.classList.remove("show");

        // 前動画をfade-out
        if (currentVideo &&
            currentVideo !== videoA) {

          currentVideo.classList.remove("show");

          setTimeout(() => {

            currentVideo.pause();

            currentVideo.style.display = "none";

          }, 250);

        }

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
      if (remain <= 0.15) {

        // 二重防止
        if (videoL.classList.contains("show")) {
          return;
        }

        // --------------------
        // Lを先に描画可能状態へ
        // --------------------

        videoL.style.display = "block";

        videoL.currentTime = 0;

        requestAnimationFrame(() => {

          // 先に表示
          videoL.classList.add("show");

          // 再生開始
          videoL.play().then(() => {

            // 次フレームでA消す
            requestAnimationFrame(() => {

              setTimeout(() => {

                videoA.pause();

                videoA.classList.remove("show");
                videoA.style.display = "none";

              }, 250);

            });

          });

        });

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

      // 動画フェード解除
      fade.classList.remove("show");

      // テキストクリア
      chrEl.innerText = "";
      msgBody.innerText = "";

      nextIcon.classList.remove("show");

      // 次メッセージへ
      setTimeout(() => {

        isBusy = false;

        nextStep();

        // 次メッセージ表示時にフェード復帰
        requestAnimationFrame(() => {

          chrEl.classList.remove("msg-fade");
          msgBody.classList.remove("msg-fade");
          nextIcon.classList.remove("msg-fade");

        });

      }, 300);

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

  if (currentVideo) {

    currentVideo.classList.remove("show");

  }

  // 黒fade
  fade.classList.add("show");

  setTimeout(() => {

    if (currentVideo) {

      currentVideo.pause();

      currentVideo.style.display = "none";

    }

    callback();

  }, 250);

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