/*************************************************
 * 状態
 *************************************************/

let currentIndex = 0;

let currentData = null;

let video;
let fade;

let isBusy = false;

let loopMin = 0;

let typingTimer = null;

let isTyping = false;

let fullText = "";

/*************************************************
 * 初期化
 *************************************************/

window.addEventListener("load", () => {

  video = document.getElementById("video");
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

  // 初回だけ1秒待つ
  setTimeout(() => {

    showCurrent();

  }, 1000);

}

/*************************************************
 * 次へ
 *************************************************/

function nextStep() {

  // 動画切替中
  if (isBusy) return;

  // 文字送り中なら全文表示だけ
  if (isTyping) {

    finishTyping();

    return;
  }

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
  if ("msg" in item) {

    changeMessage(
      item.chrNm || "",
      item.msg || ""
    );

    return;
  }

  // 動画
  if ("movId" in item) {

    playMovie(item);

  }

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

  msgEl.innerText = "";

  isTyping = true;

  let index = 0;

  function type() {

    const current =
      fullText.substring(0, index);

    msgEl.innerText = current;

    const char = fullText[index];

    index++;

    if (index <= fullText.length) {

      // 句読点ウェイト
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

      nextIcon.classList.add("show");

    }

  }

  type();

}

/*************************************************
 * 全文表示
 *************************************************/
function finishTyping() {

  clearTimeout(typingTimer);

  document.getElementById("msgBody").innerText =
    fullText;

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

      video.pause();
      video.removeAttribute("src");

      setTimeout(() => {
        isBusy = false;
        nextStep();
      }, 1000);

    });

    return;
  }

  loopMin = Number(item.loopMin || 0);

  const src =
    `../data/${evtId}/CPT-${cptId}/${movId}.mp4`;

  fadeInMovie(src);

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

    video.src = src;

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

function fadeOutVideo(callback) {

  const msgArea =
    document.getElementById("msgArea");

  fade.classList.add("show");

  msgArea.classList.add("msg-hide");

  setTimeout(() => {

    callback();

  }, 600);

}

/*************************************************
 * ループ制御
 *************************************************/

videoLoopWatch();

function videoLoopWatch() {

  requestAnimationFrame(videoLoopWatch);

  if (!video.duration) return;

  if (loopMin <= 0) return;

  if (video.currentTime >= video.duration - 0.05) {

    video.currentTime = loopMin;

    video.play().catch(() => {});

  }

}