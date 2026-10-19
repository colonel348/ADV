(function () {

let cardList, bgImg, bgFade, fade, decideBtn;
let levelSelector, levelValue, selectionTitleArea, selectionTitleText, previewEventName;
let selectVideo1, selectVideo2, selectPreloadVideo, activeSelectVideo, standbySelectVideo;
let screen = "character";
let selectedLevel = 1;
let selectedMode = "";
let initialEvtId = "";
let befEvtId = "";
let previousEventLevel = 0;
let startX = 0;
let startY = 0;
let isDragging = false;
let suppressCharacterClick = false;
let suppressEventCardClick = false;
let isDeciding = false;
let screenTransitionTimer = null;
let characterAnimationTimer = null;
let selectionChangeTimer = null;
let levelSwitchTimer = null;
let selectVideoSequence = 0;
let selectLoopWatching = false;
let eventPlaybackPreloadSequence = 0;
let eventPlaybackPreloadVideos = [];
let eventPlaybackPreloadTimer = null;
let eventCardAnimationTimer = null;
let eventCardCenterTransforms = [];
let eventLevelGaugeAnimationTimer = null;
let eventLevelStatusInitialized = false;
let rankResultPending = false;
let rankResultFrom = "";
let modeHomeTypingTimer = null;
let modeHomeShowTimer = null;
let modeHomeAutoHideTimer = null;
let modeHomeLoadSequence = 0;
const PREVIEW_PLACE_DISPLAY_TIME = 1500;
const PREVIEW_PLACE_FADE_TIME = 350;
const SELECTION_ACTION_SWITCH_BEFORE = 0.16;
const SELECTION_VIDEO_FADE_TIME = 300;
// iOS向けに再生準備と表示開始を分離する。先にデコードを始め、表示は0.25秒前に揃える。
const SELECTION_LOOP_PREPARE_BEFORE = 0.5;
const SELECTION_LOOP_SWITCH_BEFORE = 0.25;
const SELECTION_LOOP_FADE_TIME = 500;
const chrList = ["FF", "AK", "SA"];
let chrIdx = 1;
let filteredEvtData = [];

const characterNames = {
  FF: "ホタル",
  AK: "小豆沢こはね",
  SA: "白石杏"
};

const levelColors = {
  1: "#39c7e8",
  2: "#f3ad25",
  3: "#ef4f78",
  4: "#b443df"
};

const levelEdgeColors = {
  1: "#d9f8ff",
  2: "#fff4ce",
  3: "#ffe0e8",
  4: "#f3ddff"
};

const modeLabels = {
  R: "休息",
  S: "特訓",
  C: "調教"
};

const modeIconPaths = {
  R: "../img/romance-mode.png",
  S: "../img/serious-mode.png",
  C: "../img/control-mode.png"
};

function normalizeLvKbn(value) {
  return String(value || "").toUpperCase().replace(/[^RSC]/g, "").slice(0, 4);
}

function getPreviewLvKbn(evt = null) {
  const current = normalizeLvKbn(lvKbn);
  if (!evt || current.length >= 4) return current;
  const targetLevel = Math.min(4, Math.max(0, Number(evt.evtId.charAt(4)) || 0));
  const addCount = Math.max(0, targetLevel - current.length);
  return (current + evt.evtId.charAt(3).repeat(addCount)).slice(0, 4);
}

function updateEventLevelStatus(evt = null, blinkPending = false) {
  const status = document.getElementById("eventLevelStatus");
  if (!status) return;

  const current = normalizeLvKbn(lvKbn);
  const preview = getPreviewLvKbn(evt);
  const value = document.getElementById("eventLevelStatusValue");
  const segments = status.querySelectorAll(".eventLevelSegments span");
  const pendingGauge = status.querySelector(".eventLevelPendingGauge");
  const nextValue = String(current.length);
  if (value.textContent !== nextValue) {
    value.classList.remove("value-changing");
    value.textContent = nextValue;
    if (eventLevelStatusInitialized) {
      value.offsetWidth;
      value.classList.add("value-changing");
    }
  }
  eventLevelStatusInitialized = true;
  status.setAttribute("aria-label", `ランク${current.length}`);
  segments.forEach((segment, index) => {
    const mode = current.charAt(index);
    if (mode) segment.dataset.mode = mode;
    else delete segment.dataset.mode;
  });

  if (!pendingGauge) return;

  clearTimeout(eventLevelGaugeAnimationTimer);

  const remainingCount = Math.max(0, 4 - current.length);
  const pendingCount = Math.max(0, preview.length - current.length);
  const targetScale = remainingCount ? pendingCount / remainingCount : 0;
  pendingGauge.style.left = `${current.length * 25}%`;
  pendingGauge.style.width = `${remainingCount * 25}%`;

  const pendingMode = preview.charAt(current.length);
  if (pendingCount === 0) {
    // ②→①では色と点滅を残したまま右端から縮め、縮み切ってから隠す。
    pendingGauge.style.transform = "scaleX(0)";
    eventLevelGaugeAnimationTimer = setTimeout(() => {
      if (pendingGauge.style.transform !== "scaleX(0)") return;
      pendingGauge.classList.remove("is-blinking");
      pendingGauge.style.opacity = "0";
      delete pendingGauge.dataset.mode;
    }, 680);
    return;
  }

  pendingGauge.dataset.mode = pendingMode;
  pendingGauge.style.visibility = "visible";
  pendingGauge.style.animation = "";
  pendingGauge.style.opacity = "1";
  pendingGauge.classList.toggle("is-blinking", blinkPending);
  requestAnimationFrame(() => {
    pendingGauge.style.transform = `scaleX(${targetScale})`;
  });
}

function prepareRankResultAnimation() {
  const status = document.getElementById("eventLevelStatus");
  if (!status) return;

  const from = normalizeLvKbn(rankResultFrom);
  const finalValue = normalizeLvKbn(lvKbn);
  const pendingGauge = status.querySelector(".eventLevelPendingGauge");
  const commitGauge = status.querySelector(".eventLevelCommitGauge");
  const value = document.getElementById("eventLevelStatusValue");
  const remainingCount = Math.max(0, 4 - from.length);
  const addedCount = Math.max(0, finalValue.length - from.length);
  const targetScale = remainingCount ? addedCount / remainingCount : 0;
  const mode = finalValue.charAt(from.length);

  status.querySelectorAll(".eventLevelSegments span").forEach((segment, index) => {
    const segmentMode = from.charAt(index);
    if (segmentMode) segment.dataset.mode = segmentMode;
    else delete segment.dataset.mode;
  });
  value.textContent = from.length;
  value.classList.remove("value-changing");
  status.setAttribute("aria-label", `ランク${from.length}`);

  [pendingGauge, commitGauge].forEach(gauge => {
    if (!gauge) return;
    gauge.style.left = `${from.length * 25}%`;
    gauge.style.width = `${remainingCount * 25}%`;
    if (mode) gauge.dataset.mode = mode;
  });
  if (pendingGauge) {
    pendingGauge.style.visibility = "visible";
    pendingGauge.style.animation = "";
    pendingGauge.style.transition = "none";
    pendingGauge.style.transform = `scaleX(${targetScale})`;
    pendingGauge.style.opacity = addedCount ? "1" : "0";
    pendingGauge.classList.toggle("is-blinking", addedCount > 0);
  }
  if (commitGauge) {
    commitGauge.style.transition = "none";
    commitGauge.style.transform = "scaleX(0)";
    commitGauge.style.opacity = "0";
  }
}

function playRankResultAnimation(onComplete) {
  const status = document.getElementById("eventLevelStatus");
  if (!status) return onComplete();

  const from = normalizeLvKbn(rankResultFrom);
  const finalValue = normalizeLvKbn(lvKbn);
  const addedCount = Math.max(0, finalValue.length - from.length);
  const remainingCount = Math.max(0, 4 - from.length);
  const targetScale = remainingCount ? addedCount / remainingCount : 0;
  const pendingGauge = status.querySelector(".eventLevelPendingGauge");
  const commitGauge = status.querySelector(".eventLevelCommitGauge");
  const value = document.getElementById("eventLevelStatusValue");

  if (!addedCount || !commitGauge) {
    onComplete();
    return;
  }

  setTimeout(() => {
    // 予定ゲージは点滅を続け、その上を確定ゲージが左から右へ覆う。
    commitGauge.style.transition = "none";
    commitGauge.style.opacity = "1";
    commitGauge.style.transform = "scaleX(0)";
    commitGauge.offsetWidth;
    commitGauge.style.transition = "transform .65s cubic-bezier(.22, .7, .25, 1)";
    commitGauge.style.transform = `scaleX(${targetScale})`;

    setTimeout(() => {
      const segments = status.querySelectorAll(".eventLevelSegments span");
      // 確定オーバーレイの下を先に完成色へ固定し、外した後の再着色を見せない。
      segments.forEach((segment, index) => {
        segment.style.transition = "none";
        const mode = finalValue.charAt(index);
        if (mode) segment.dataset.mode = mode;
        else delete segment.dataset.mode;
      });
      status.offsetWidth;
      if (pendingGauge) {
        // 点滅解除時に通常opacityへ戻る1フレームを描画させない。
        pendingGauge.style.visibility = "hidden";
        pendingGauge.style.animation = "none";
        pendingGauge.classList.remove("is-blinking");
        pendingGauge.style.opacity = "0";
        pendingGauge.style.transform = "scaleX(0)";
        pendingGauge.style.transition = "";
        delete pendingGauge.dataset.mode;
      }
      commitGauge.style.opacity = "0";
      commitGauge.style.transition = "";
      requestAnimationFrame(() => {
        segments.forEach(segment => { segment.style.transition = ""; });
      });
      value.classList.remove("value-changing");
      value.textContent = finalValue.length;
      status.setAttribute("aria-label", `ランク${finalValue.length}`);
      setTimeout(onComplete, 350);
    }, 650);
  }, 500);
}

function readSelectionParams() {
  const params = new URLSearchParams(location.search);
  const isEventSelectionHost = document.body.dataset.selectionHost === "event";
  const requestedScreen = isEventSelectionHost
    ? ((params.get("screen") || "mode").trim())
    : (params.get("screen") || "").trim();
  const requestedEvtId = (params.get("evtId") || "").trim();
  befEvtId = (params.get("befEvtId") || "").trim();
  const requestedChrId = (params.get("chrId") || "AK").trim();
  const requestedLevel = Number(params.get("level"));
  const requestedEvent = evtData.find(evt => evt.evtId === requestedEvtId);
  const previousEvent = evtData.find(evt => evt.evtId === befEvtId);
  initialEvtId = requestedEvent ? requestedEvent.evtId : "";

  autoFlg = params.get("autoFlg") || "0";
  lvKbn = normalizeLvKbn(params.get("LvKbn"));
  rankResultPending = params.get("rankResult") === "1";
  rankResultFrom = normalizeLvKbn(params.get("rankUpFrom"));
  if (rankResultPending) {
    const cleanUrl = new URL(location.href);
    cleanUrl.searchParams.delete("rankResult");
    cleanUrl.searchParams.delete("rankUpFrom");
    history.replaceState(null, "", cleanUrl.href);
  }
  chrId = chrList.includes(requestedChrId) ? requestedChrId : "AK";
  if (requestedEvent) chrId = requestedEvent.evtId.substring(0, 2);
  else if (previousEvent) chrId = previousEvent.evtId.substring(0, 2);

  if (requestedEvent) {
    selectedLevel = Number(requestedEvent.evtId.charAt(4)) || 1;
    selectedMode = requestedEvent.evtId.charAt(3);
    screen = "event";
  } else if (previousEvent) {
    previousEventLevel = Number(previousEvent.evtId.charAt(4)) || 0;
    screen = isEventSelectionHost ? "mode" : "character";
  } else if (requestedScreen === "mode") {
    // event画面の更新・履歴復元・再訪時は、前回イベントによる絞り込みをせず②へ戻す。
    previousEventLevel = 0;
    screen = "mode";
  }

  evtId = "";
  evtIdx = -1;
  tgtEvtData = null;
  chrIdx = chrList.indexOf(chrId);
}

function getCharacterLoopPath() {
  return getCharacterVideoSequence().loop;
}

function getCharacterVideoSequence() {
  const fileNoByMode = {
    S: "1",
    R: "2",
    C: "3"
  };
  // ①を経由して②へ進む場合は、前イベントのモードを引き継がない。
  const previousMode = screen === "character" ? "" : befEvtId.charAt(3);
  const fileNo = fileNoByMode[previousMode] || "0";
  const basePath = getChrDir(chrId) + "/00.選択/";
  return {
    intro: basePath + fileNo + "1.evt-A.mp4",
    loop: basePath + fileNo + "2.evt-L.mp4"
  };
}

function getEventLoopPath(evt) {
  return getEvtDir(evt) + "/01.evt-L.mp4";
}

function preloadImages() {
  const urls = chrList.map(getChrSelPath).concat(Object.values(modeIconPaths));
  return Promise.all(urls.map(url => new Promise(resolve => {
    const image = new Image();
    image.onload = resolve;
    image.onerror = resolve;
    image.src = url;
  })));
}

function swapBackground(src, direction = "left", animated = true) {
  if (!animated) {
    bgImg.src = src;
    bgImg.style.opacity = 1;
    bgImg.style.transform = "translate(0, -50%)";
    return;
  }

  bgImg.style.opacity = 0;
  setTimeout(() => {
    const offset = direction === "right" ? "60px" : "-60px";
    bgImg.style.transition = "none";
    bgImg.style.transform = `translate(${offset}, -50%)`;
    bgImg.src = src;
    bgImg.offsetHeight;
    bgImg.style.transition = "opacity .4s ease, transform .4s ease";
    requestAnimationFrame(() => {
      bgImg.style.opacity = 1;
      bgImg.style.transform = "translate(0, -50%)";
    });
  }, 160);
}

function showCharacter(animated = false, direction = "left") {
  const stage = document.getElementById("characterStage");
  const nameText = document.getElementById("characterNameText");
  clearTimeout(characterAnimationTimer);

  if (!animated) {
    nameText.textContent = characterNames[chrId];
    nameText.dataset.name = characterNames[chrId];
    swapBackground(getChrSelPath(chrId), direction, false);
    return;
  }

  stage.classList.remove("character-reveal");
  stage.classList.add("character-changing");
  bgImg.style.opacity = 0;
  characterAnimationTimer = setTimeout(() => {
    nameText.textContent = characterNames[chrId];
    nameText.dataset.name = characterNames[chrId];
    swapBackground(getChrSelPath(chrId), direction, true);
    stage.classList.remove("character-changing");
    stage.classList.add("character-reveal");
    setTimeout(() => stage.classList.remove("character-reveal"), 650);
  }, 260);
}

function preloadCharacterLoopVideo() {
  const src = getCharacterLoopPath();

  stopSelectionVideos();

  const sequence = selectVideoSequence;
  const video = selectVideo1;
  activeSelectVideo = selectVideo1;
  standbySelectVideo = selectVideo2;
  prepareSelectionVideo(video, src);
  video.currentTime = 0;
  video.style.display = "block";

  const warmup = () => {
    if (screen !== "character" || sequence !== selectVideoSequence) return;

    video.play().then(() => {
      if (screen !== "character" || sequence !== selectVideoSequence) return;

      const pauseAtFirstFrame = () => {
        if (screen !== "character" || sequence !== selectVideoSequence) return;
        video.pause();
        video.currentTime = 0;
      };

      if (typeof video.requestVideoFrameCallback === "function") {
        video.requestVideoFrameCallback(pauseAtFirstFrame);
      } else {
        requestAnimationFrame(pauseAtFirstFrame);
      }
    }).catch(() => {});
  };

  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    warmup();
  } else {
    video.addEventListener("loadeddata", warmup, { once: true });
  }
}

function animateCharacterCursor(step) {
  const cursor = document.querySelector(step < 0 ? ".characterCursor-left" : ".characterCursor-right");
  if (!cursor) return;
  cursor.classList.remove("cursor-activated");
  cursor.offsetHeight;
  cursor.classList.add("cursor-activated");
  setTimeout(() => {
    cursor.classList.remove("cursor-activated");
    const cursors = document.querySelectorAll(".characterCursor");
    cursors.forEach(item => { item.style.animation = "none"; });
    cursor.offsetHeight;
    requestAnimationFrame(() => cursors.forEach(item => { item.style.animation = ""; }));
  }, 360);
}

function changeCharacter(step) {
  animateCharacterCursor(step);
  chrIdx = (chrIdx + step + chrList.length) % chrList.length;
  chrId = chrList[chrIdx];
  lvKbn = "";
  showCharacter(true, step < 0 ? "right" : "left");
  preloadCharacterLoopVideo();
}

function setScreen(nextScreen, delayed = false, initialReady = null) {
  const viewport = document.getElementById("viewport");
  clearTimeout(screenTransitionTimer);
  const isModeToEvent = delayed && screen === "mode" && nextScreen === "event";
  const isEventToMode = delayed && screen === "event" && nextScreen === "mode";
  const isCharacterToEvent = delayed && screen === "character" && nextScreen === "mode";
  const isEventToCharacter = delayed && screen === "mode" && nextScreen === "character";
  const keepCardsStatic = delayed && (screen === "event" || nextScreen === "event");
  viewport.classList.toggle("character-to-event", isCharacterToEvent);
  viewport.classList.toggle("event-to-character", isEventToCharacter);
  viewport.classList.toggle("event-cards-static", keepCardsStatic);
  const useSafeScreenFade = isCharacterToEvent || isEventToCharacter;
  const fadeOutTime = isCharacterToEvent ? 1300 : (useSafeScreenFade ? 650 : 500);
  const fadeInWait = useSafeScreenFade ? 750 : 500;

  if (isModeToEvent) {
    // ②→①の終了待ち中に再度②へ進んだ場合、旧非表示状態を持ち越さない。
    viewport.classList.remove(
      "event-to-mode",
      "mode-return-preparing",
      "mode-return-visible",
      "event-cards-leaving",
      "returning-to-mode"
    );
    document.getElementById("selectControlArea").classList.remove("show");
    viewport.classList.add("screen-transitioning", "mode-to-event", "mode-buttons-leaving");

    screenTransitionTimer = setTimeout(() => {
      screen = "event";
      viewport.dataset.screen = screen;
      viewport.classList.add("event-revealing");
      showEventSelection(false);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          viewport.classList.add("event-reveal-visible");
          viewport.classList.remove("mode-buttons-leaving");

          screenTransitionTimer = setTimeout(() => {
            viewport.classList.remove(
              "screen-transitioning",
              "mode-to-event",
              "event-revealing",
              "event-reveal-visible",
              "event-cards-static"
            );
          }, 450);
        });
      });
    }, 350);
    return;
  }

  if (isEventToMode) {
    // 同じ選択セッション内ではAとホームメッセージを一度だけ表示する。
    // ②→①では再初期化せず、切替済みのL動画をそのまま維持する。
    const restoreCommonVideo = false;
    viewport.classList.add("screen-transitioning", "event-to-mode");

    screenTransitionTimer = setTimeout(() => {
      screen = "mode";
      viewport.dataset.screen = screen;
      viewport.classList.add("mode-return-preparing");
      showModeSelection(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            viewport.classList.add("mode-return-visible");

            screenTransitionTimer = setTimeout(() => {
              viewport.classList.remove(
                "screen-transitioning",
                "event-to-mode",
                "mode-return-preparing",
                "mode-return-visible",
                "event-cards-static"
              );
            }, 500);
          });
        });
      }, restoreCommonVideo);
    }, 400);
    return;
  }

  const apply = (onReady = null) => {
    screen = nextScreen;
    viewport.dataset.screen = screen;
    if (screen === "character") {
      showCharacter();
      preloadCharacterLoopVideo();
      if (onReady) onReady();
    } else if (screen === "mode") {
      showModeSelection(onReady);
    } else if (screen === "event") {
      showEventSelection(true, onReady);
    }
    requestAnimationFrame(() => viewport.classList.remove("screen-leaving"));
  };

  if (!delayed) {
    viewport.classList.remove(
      "character-to-event",
      "event-to-character",
      "event-cards-static"
    );
    return apply(initialReady);
  }
  viewport.classList.add("screen-transitioning");
  fade.classList.add("show");

  // 完全に黒くなってから画面を入れ替え、その後黒を解除する。
  screenTransitionTimer = setTimeout(() => {
    viewport.classList.add("screen-leaving");
    apply(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          viewport.classList.toggle("mode-black-reveal", isCharacterToEvent);
          fade.classList.remove("show");
          setTimeout(() => {
            viewport.classList.remove(
              "screen-transitioning",
              "character-to-event",
              "event-to-character",
              "event-cards-static",
              "mode-black-reveal"
            );
          }, fadeOutTime);
        });
      });
    });
  }, fadeInWait);
}

function confirmCharacter() {
  if (suppressCharacterClick) return;
  if (document.body.dataset.selectionHost !== "event") {
    if (isDeciding) return;
    isDeciding = true;
    fade.classList.add("show");
    setTimeout(() => {
      location.href = "./event.html?chrId=" + encodeURIComponent(chrId) +
        "&screen=mode&autoFlg=" + encodeURIComponent(autoFlg);
    }, 650);
    return;
  }
  befEvtId = "";
  previousEventLevel = 0;
  selectedMode = "";
  evtIdx = -1;
  tgtEvtData = null;
  setScreen("mode", true);
}

function updateFilteredEvents() {
  filteredEvtData = evtData
    .filter(evt =>
      evt.evtId.substring(0, 2) === chrId &&
      evt.evtId.charAt(3) === selectedMode &&
      Number(evt.evtId.charAt(4)) > previousEventLevel
    )
    .sort((a, b) => Number(a.evtId.charAt(4)) - Number(b.evtId.charAt(4)));
}

function getModeLabel(mode) {
  if (mode === "S" && chrId === "FF") return "開拓";
  return modeLabels[mode] || "";
}

function getHomeMessageText(data) {
  if (!Array.isArray(data)) return "";
  const homeIndex = data.findIndex(item => item?.movId === "home");
  if (homeIndex < 0) return "";

  for (let index = homeIndex + 1; index < data.length; index++) {
    const item = data[index];
    if (item && Object.prototype.hasOwnProperty.call(item, "movId")) break;
    if (item?.msgId === "A" && Object.prototype.hasOwnProperty.call(item, "msgTxt")) {
      return String(item.msgTxt || "");
    }
  }
  return "";
}

function stopModeHomeTyping() {
  clearTimeout(modeHomeTypingTimer);
  modeHomeTypingTimer = null;
}

function typeModeHomeMessage(message) {
  const textElement = document.getElementById("modeHomeMessageText");
  if (!textElement) return;

  stopModeHomeTyping();
  textElement.innerHTML = "";
  const characters = Array.from(String(message || ""));
  let index = 0;

  const typeNext = () => {
    if (screen !== "mode" || index >= characters.length) return;
    const character = characters[index++];

    if (character === "　") {
      textElement.appendChild(document.createElement("br"));
    } else {
      textElement.appendChild(document.createTextNode(character));
    }

    const wait = character === "、" ? 40 : (character === "　" ? 60 : 10);
    modeHomeTypingTimer = setTimeout(typeNext, wait);
  };

  typeNext();
}

function setModeHomeMessageWidth(panel, message) {
  const lineLengths = String(message || "")
    .split("　")
    .map(line => Array.from(line).length);
  const longestLine = Math.min(24, Math.max(6, ...lineLengths));
  const widthWithSpacing = longestLine + Math.max(0, longestLine - 1) * 0.02;
  panel.style.setProperty("--mode-home-line-width", `${widthWithSpacing.toFixed(2)}em`);
}

function hideModeHomeMessage() {
  modeHomeLoadSequence++;
  clearTimeout(modeHomeShowTimer);
  modeHomeShowTimer = null;
  clearTimeout(modeHomeAutoHideTimer);
  modeHomeAutoHideTimer = null;
  stopModeHomeTyping();
  document.getElementById("modeHomeMessage")?.classList.remove("show");
}

async function showModeHomeMessage() {
  const panel = document.getElementById("modeHomeMessage");
  const textElement = document.getElementById("modeHomeMessageText");
  if (!panel || !textElement || !window.EventMedia?.loadMessageDataFromPath) return;

  const sequence = ++modeHomeLoadSequence;
  clearTimeout(modeHomeShowTimer);
  modeHomeShowTimer = null;
  stopModeHomeTyping();
  textElement.textContent = "";
  panel.style.removeProperty("--mode-home-line-width");
  panel.classList.remove("show");

  let message = "";
  let messageLoaded = false;
  let showDelayElapsed = false;
  let typingStarted = false;

  const revealAndStartTypingWhenReady = () => {
    if (
      typingStarted ||
      !messageLoaded ||
      !showDelayElapsed ||
      screen !== "mode" ||
      sequence !== modeHomeLoadSequence
    ) {
      return;
    }
    setModeHomeMessageWidth(panel, message);
    panel.classList.add("show");
    typingStarted = true;
    typeModeHomeMessage(message);
  };

  modeHomeShowTimer = setTimeout(() => {
    if (screen === "mode" && sequence === modeHomeLoadSequence) {
      showDelayElapsed = true;
      revealAndStartTypingWhenReady();
    }
  }, 300);

  const sourceEventId = String(befEvtId || "");
  const sourceEvent = evtData.find(evt => evt.evtId === sourceEventId);
  const messagePath = sourceEvent
    ? getMsgDataPath(sourceEvent)
    : getSelectionMsgDataPath(chrId);

  try {
    const data = await EventMedia.loadMessageDataFromPath(messagePath);
    message = getHomeMessageText(data);
  } catch (error) {
    message = "";
  }

  if (screen !== "mode" || sequence !== modeHomeLoadSequence) return;
  messageLoaded = true;
  revealAndStartTypingWhenReady();
}

function showModeSelection(onReady = null, restartCommonVideo = true) {
  evtIdx = -1;
  evtId = "";
  tgtEvtData = null;
  document.getElementById("viewport").classList.remove("event-unselected");
  decideBtn.classList.add("disabled");
  if (!rankResultPending) updateEventLevelStatus();
  hideModeHomeMessage();

  document.querySelectorAll(".modeChoice").forEach(button => {
    const mode = button.dataset.mode;
    const hasEvent = evtData.some(evt =>
      evt.evtId.substring(0, 2) === chrId &&
      evt.evtId.charAt(3) === mode &&
      Number(evt.evtId.charAt(4)) > previousEventLevel
    );
    const label = button.querySelector(".modeChoiceLabel");
    if (label) label.textContent = getModeLabel(mode);
    button.classList.toggle("mode-empty", !hasEvent);
    button.disabled = !hasEvent;
    button.setAttribute("aria-disabled", String(!hasEvent));
  });

  bgImg.src = getChrSelPath(chrId);
  bgImg.style.opacity = 0;
  if (restartCommonVideo) {
    playSelectionIntroLoop(getCharacterVideoSequence(), onReady);
  } else if (onReady) {
    onReady();
  }
}

function selectMode(mode) {
  const button = document.querySelector(`.modeChoice[data-mode="${mode}"]`);
  if (!button || button.disabled) return;
  document.getElementById("selectControlArea").classList.remove("show");
  selectedMode = mode;
  initialEvtId = "";
  hideModeHomeMessage();
  setScreen("event", true);
}

function updateLevelSelector() {
  levelValue.textContent = selectedLevel;
  levelSelector.dataset.level = selectedLevel;
  levelSelector.style.setProperty("--level-color", levelColors[selectedLevel]);
  levelSelector.style.setProperty("--level-edge-color", levelEdgeColors[selectedLevel]);
  levelSelector.setAttribute("aria-label", `特訓レベル${selectedLevel}。押すと次のレベル`);
}

function centerUnselectedCards() {
  const sidebar = document.getElementById("sidebar");
  const offset = Math.max(0, (sidebar.clientHeight - cardList.scrollHeight) / 2);
  cardList.style.transition = "none";
  cardList.style.transform = `translateY(${offset}px)`;
  cardList.offsetHeight;
  requestAnimationFrame(() => {
    cardList.style.transition = "";
  });
}

function createCards() {
  const viewport = document.getElementById("viewport");
  cardList.innerHTML = "";
  cardList.classList.toggle("single-card", filteredEvtData.length === 1);
  viewport.classList.add("event-unselected");
  decideBtn.classList.add("disabled");

  if (!filteredEvtData.length) {
    const empty = document.createElement("div");
    empty.id = "emptyEvents";
    empty.textContent = `${getModeLabel(selectedMode)}のイベントはまだありません`;
    cardList.appendChild(empty);
    centerUnselectedCards();
    return;
  }

  filteredEvtData.forEach((data, index) => {
    const card = document.createElement("div");
    card.className = "card";
    const mode = data.evtId.charAt(3);
    const level = Number(data.evtId.charAt(4)) || 1;
    card.dataset.mode = mode;
    card.dataset.level = level;

    const inner = document.createElement("div");
    inner.className = "cardInner";

    const levelArea = document.createElement("div");
    levelArea.className = "eventLevelArea";
    const levelLabel = document.createElement("span");
    levelLabel.className = "eventLevelLabel";
    levelLabel.textContent = `${getModeLabel(mode)}Lv.`;
    levelLabel.dataset.label = levelLabel.textContent;
    const levelNumber = document.createElement("span");
    levelNumber.className = "eventLevelNumber";
    levelNumber.textContent = level;
    levelArea.append(levelLabel, levelNumber);

    const textArea = document.createElement("div");
    textArea.className = "eventTextArea";
    const title = document.createElement("span");
    title.className = "eventTitle";
    title.textContent = String(data.evtNm || "");
    const place = document.createElement("span");
    place.className = "eventPlace";
    place.textContent = String(data.plcNm || "");
    textArea.append(title, place);

    inner.append(levelArea, textArea);
    card.appendChild(inner);
    card.addEventListener("click", event => {
      event.stopPropagation();
      if (suppressEventCardClick) return;
      selectEvent(index);
    });
    cardList.appendChild(card);
  });
  cacheEventCardPositions();
  selectEvent(0, true);
  initialEvtId = "";
}

function cacheEventCardPositions() {
  const sidebar = document.getElementById("sidebar");
  const sidebarHeight = sidebar.clientHeight;
  eventCardCenterTransforms = Array.from(cardList.querySelectorAll(".card"), card =>
    Math.round(-(card.offsetTop - ((sidebarHeight - card.offsetHeight) / 2)))
  );
}

function selectEvent(index, instant = false) {
  if (evtIdx === index) return;
  evtIdx = index;
  tgtEvtData = filteredEvtData[index];
  evtId = tgtEvtData.evtId;
  updateEventLevelStatus(tgtEvtData, true);
  document.getElementById("viewport").classList.remove("event-unselected");
  decideBtn.classList.remove("disabled");

  const cards = document.querySelectorAll(".card");
  clearTimeout(eventCardAnimationTimer);
  if (!instant) cardList.classList.add("cards-animating");
  if (instant) {
    cardList.style.transition = "none";
    cards.forEach(card => {
      card.style.transition = "none";
      card.querySelector(".cardInner").style.transition = "none";
    });
  }
  cards.forEach((card, i) => card.classList.toggle("active", i === index));
  const activeCard = cards[index];
  if (activeCard) {
    const centerTransform = eventCardCenterTransforms[index];
    if (Number.isFinite(centerTransform)) {
      cardList.style.transform = `translateY(${centerTransform}px)`;
    }
  }

  clearTimeout(eventPlaybackPreloadTimer);
  // カード移動（350ms）と動画の読込・デコードを競合させない。
  const preloadDelay = instant ? 650 : 520;
  const selectedEvent = tgtEvtData;
  eventPlaybackPreloadTimer = setTimeout(() => {
    const preload = () => {
      if (screen !== "event" || tgtEvtData?.evtId !== selectedEvent.evtId) return;
      preloadSelectedEventVideo(selectedEvent);
    };
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(preload, { timeout: 1000 });
    } else {
      preload();
    }
  }, preloadDelay);

  if (instant) {
    cardList.offsetHeight;
    requestAnimationFrame(() => {
      cardList.style.transition = "";
      cards.forEach(card => {
        card.style.transition = "";
        card.querySelector(".cardInner").style.transition = "";
      });
    });
  } else {
    eventCardAnimationTimer = setTimeout(() => {
      cardList.classList.remove("cards-animating");
    }, 380);
  }
}

function showSelectedEventVideo(evt) {
  const viewport = document.getElementById("viewport");
  const selectedEvtId = evt.evtId;
  clearTimeout(selectionChangeTimer);
  viewport.classList.add("screen-transitioning", "event-video-switching");
  bgFade.classList.add("show");

  selectionChangeTimer = setTimeout(() => {
    if (screen !== "event" || tgtEvtData?.evtId !== selectedEvtId) return;

    playSelectionLoop(getEventLoopPath(evt), () => {
      if (screen !== "event" || tgtEvtData?.evtId !== selectedEvtId) return;
      viewport.classList.remove("event-unselected");
      decideBtn.classList.remove("disabled");
      bgFade.classList.remove("show");
      setTimeout(() => {
        viewport.classList.remove("screen-transitioning", "event-video-switching");
      }, 500);
    });
  }, 500);
}

function preloadSelectedEventVideo(evt) {
  const src = getEventLoopPath(evt);
  if (selectPreloadVideo.dataset.src === src) return;
  selectPreloadVideo.pause();
  selectPreloadVideo.dataset.src = src;
  selectPreloadVideo.src = src;
  // 選択中はデコーダーを占有しないようメタデータだけ先読みする。
  selectPreloadVideo.preload = "metadata";
  selectPreloadVideo.load();
  preloadSelectedEventPlayback(evt);
}

function preloadSelectedEventPlayback(evt) {
  const sequence = ++eventPlaybackPreloadSequence;

  EventMedia.loadMessageData(evt).then(data => {
    if (sequence !== eventPlaybackPreloadSequence || tgtEvtData?.evtId !== evt.evtId) return;

    eventPlaybackPreloadVideos.forEach(video => {
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.remove();
    });
    eventPlaybackPreloadVideos = EventMedia.getFirstMovBlockMedia(evt, data).map(src => {
      const video = document.createElement("video");
      video.className = "selectPreloadMovie";
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.src = src;
      video.load();
      document.getElementById("preloadImageStage").appendChild(video);
      return video;
    });
  }).catch(() => {
    // 読み込みに失敗しても、本編側の通常読み込みで再試行できるよう選択操作は止めない。
  });
}

function enterEventPreview() {
  if (!tgtEvtData) return;
  const viewport = document.getElementById("viewport");
  const previewEvtId = tgtEvtData.evtId;
  viewport.classList.remove("preview-controls-visible", "preview-button-visible");
  clearTimeout(selectionChangeTimer);
  decideBtn.classList.add("pressed");
  setTimeout(() => decideBtn.classList.remove("pressed"), 500);
  viewport.classList.add("screen-transitioning");
  fade.classList.add("show");

  selectionChangeTimer = setTimeout(() => {
    screen = "preview";
    viewport.dataset.screen = screen;
    const previewName = String(tgtEvtData.evtNm || "");
    const previewInitial = document.createElement("span");
    const previewRest = document.createElement("span");
    previewInitial.className = "previewEventNameInitial";
    previewRest.className = "previewEventNameRest";
    previewInitial.textContent = previewName.charAt(0);
    previewRest.textContent = previewName.slice(1);
    previewEventName.dataset.mode = tgtEvtData.evtId.charAt(3);
    previewEventName.replaceChildren(previewInitial, previewRest);
    selectionTitleText.textContent = tgtEvtData.plcNm || "";
    selectionTitleText.classList.remove("slide-in");
    selectionTitleText.offsetHeight;
    selectionTitleText.classList.add("slide-in");
    selectionTitleArea.classList.add("show");

    let videoReady = false;
    let placeHidden = false;

    const revealPreview = () => {
      if (
        !videoReady ||
        !placeHidden ||
        screen !== "preview" ||
        tgtEvtData?.evtId !== previewEvtId
      ) {
        return;
      }

      viewport.classList.add("preview-button-visible");
      fade.classList.remove("show");
      setTimeout(() => {
        if (screen === "preview" && tgtEvtData?.evtId === previewEvtId) {
          viewport.classList.add("preview-controls-visible");
        }
      }, 150);
      setTimeout(() => {
        if (screen !== "preview" || tgtEvtData?.evtId !== previewEvtId) return;
        viewport.classList.remove("screen-transitioning");
      }, 500);
    };

    playSelectionLoop(getEventLoopPath(tgtEvtData), () => {
      videoReady = true;
      revealPreview();
    });

    // 黒画面上で場所名を約1.5秒表示し、完全に消えてから映像を見せる。
    setTimeout(() => {
      if (screen !== "preview" || tgtEvtData?.evtId !== previewEvtId) return;
      selectionTitleArea.classList.remove("show");

      setTimeout(() => {
        placeHidden = true;
        revealPreview();
      }, PREVIEW_PLACE_FADE_TIME);
    }, PREVIEW_PLACE_DISPLAY_TIME);
  }, 500);
}

function returnToEventSelection() {
  const viewport = document.getElementById("viewport");
  viewport.classList.remove("preview-controls-visible", "preview-button-visible");
  viewport.classList.add("screen-transitioning");
  fade.classList.add("show");

  clearTimeout(selectionChangeTimer);
  selectionChangeTimer = setTimeout(() => {
    screen = "event";
    viewport.dataset.screen = screen;
    previewEventName.replaceChildren();
    delete previewEventName.dataset.mode;
    selectionTitleArea.classList.remove("show");
    playSelectionLoop(getCharacterLoopPath(), () => {
      fade.classList.remove("show");
      setTimeout(() => viewport.classList.remove("screen-transitioning"), 500);
    });
  }, 500);
}

function showPlaceAndEventVideo(evt) {
  // 旧呼び出しとの互換用。場所名と動画切替は③への遷移時だけ行う。
  if (!evt) return;
  selectionTitleText.textContent = evt.plcNm || "";
}

function prepareSelectionVideo(video, src) {
  if (video.dataset.src === src) return;
  video.pause();
  delete video.dataset.loopWarmed;
  video.dataset.src = src;
  video.src = src;
  video.preload = "auto";
  video.load();
}

function showSelectionVideoImmediately(video) {
  // Chromeではopacity遷移の終了時にvideoレイヤーが再合成され、
  // object-fitの丸め位置が数px変わることがある。初回表示は外側の
  // 黒フェードで隠れるため、動画自身は遷移させずに表示する。
  video.style.transitionDuration = "0ms";
  video.classList.add("show");
  requestAnimationFrame(() => requestAnimationFrame(() => {
    video.style.transitionDuration = "";
  }));
}

function playSelectionIntroLoop(paths, onReady = null) {
  const sequence = ++selectVideoSequence;
  selectLoopWatching = false;
  const introVideo = activeSelectVideo;
  const loopVideo = standbySelectVideo;

  [introVideo, loopVideo].forEach(video => {
    video.pause();
    video.classList.remove("show", "front");
    video.style.display = "none";
    video.style.transitionDuration = "";
  });

  prepareSelectionVideo(introVideo, paths.intro);
  prepareSelectionVideo(loopVideo, paths.loop);
  introVideo.currentTime = 0;
  loopVideo.currentTime = 0;
  introVideo.style.display = "block";
  introVideo.classList.add("front");

  let readyNotified = false;
  let loopStarted = false;
  const notifyReady = () => {
    if (readyNotified) return;
    readyNotified = true;
    if (onReady) onReady();
  };

  const notifyReadyAfterFirstFrame = () => {
    if (typeof introVideo.requestVideoFrameCallback === "function") {
      introVideo.requestVideoFrameCallback(() => {
        if (sequence === selectVideoSequence) notifyReady();
      });
    } else {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (sequence === selectVideoSequence) notifyReady();
      }));
    }
  };

  const startLoop = () => {
    if (loopStarted || sequence !== selectVideoSequence) return;
    loopStarted = true;
    loopVideo.currentTime = 0;
    loopVideo.style.display = "block";
    introVideo.classList.remove("front");
    loopVideo.classList.add("front");

    const revealLoop = () => {
      if (sequence !== selectVideoSequence) return;
      loopVideo.classList.add("show");
      activeSelectVideo = loopVideo;
      standbySelectVideo = introVideo;
      notifyReady();

      // LをAの上へフェード表示し、切替が完了してからAを片付ける。
      setTimeout(() => {
        if (sequence !== selectVideoSequence) return;
        introVideo.classList.remove("show", "front");
        introVideo.pause();
        introVideo.style.display = "none";
        prepareSelectionVideo(standbySelectVideo, paths.loop);
        standbySelectVideo.currentTime = 0;
        watchSelectionLoop(paths.loop, sequence);
      }, SELECTION_VIDEO_FADE_TIME);
    };

    loopVideo.play().then(() => {
      // play()解決直後ではなく、L動画の最初のフレームが描画可能になってからAを隠す。
      if (typeof loopVideo.requestVideoFrameCallback === "function") {
        loopVideo.requestVideoFrameCallback(revealLoop);
      } else {
        requestAnimationFrame(() => requestAnimationFrame(revealLoop));
      }
    }).catch(() => {
      loopStarted = false;
      setTimeout(startLoop, 200);
    });
  };

  const startIntro = () => {
    if (sequence !== selectVideoSequence) return;
    introVideo.play().then(() => {
      if (sequence !== selectVideoSequence) return;
      showSelectionVideoImmediately(introVideo);
      showModeHomeMessage();
      clearTimeout(modeHomeAutoHideTimer);
      modeHomeAutoHideTimer = setTimeout(() => {
        if (sequence === selectVideoSequence) hideModeHomeMessage();
      }, 4500);
      notifyReadyAfterFirstFrame();

      const watchIntroEnd = () => {
        if (sequence !== selectVideoSequence || loopStarted) return;
        if (
          introVideo.duration &&
          introVideo.duration - introVideo.currentTime <= SELECTION_ACTION_SWITCH_BEFORE
        ) {
          startLoop();
          return;
        }
        requestAnimationFrame(watchIntroEnd);
      };
      requestAnimationFrame(watchIntroEnd);
    }).catch(() => setTimeout(startIntro, 200));
  };

  introVideo.addEventListener("ended", startLoop, { once: true });
  introVideo.addEventListener("error", startLoop, { once: true });
  if (introVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) startIntro();
  else introVideo.addEventListener("canplay", startIntro, { once: true });
}

function playSelectionLoop(src, onReady = null) {
  const sequence = ++selectVideoSequence;
  selectLoopWatching = false;
  const first = activeSelectVideo;
  const second = standbySelectVideo;
  [first, second].forEach(video => {
    video.pause();
    video.classList.remove("show", "front");
    video.style.display = "none";
    video.style.transitionDuration = "";
  });
  prepareSelectionVideo(first, src);
  prepareSelectionVideo(second, src);
  first.currentTime = 0;
  second.currentTime = 0;
  first.style.display = "block";
  first.classList.add("front");

  let playPending = false;
  let retryCount = 0;
  let readyNotified = false;

  const notifyReady = () => {
    if (readyNotified) return;
    readyNotified = true;
    if (onReady) onReady();
  };

  const notifyReadyAfterFirstFrame = () => {
    if (typeof first.requestVideoFrameCallback === "function") {
      first.requestVideoFrameCallback(() => {
        if (sequence === selectVideoSequence) notifyReady();
      });
      return;
    }

    // requestVideoFrameCallback非対応環境では、play成功後に2描画待ってから公開する。
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (sequence === selectVideoSequence) notifyReady();
      });
    });
  };

  const start = () => {
    if (sequence !== selectVideoSequence || playPending) return;
    playPending = true;
    first.play().then(() => {
      playPending = false;
      if (sequence !== selectVideoSequence) return;
      showSelectionVideoImmediately(first);
      notifyReadyAfterFirstFrame();
      watchSelectionLoop(src, sequence);
    }).catch(() => {
      playPending = false;
      if (sequence !== selectVideoSequence || retryCount >= 12) return;
      retryCount++;
      setTimeout(start, 200);
    });
  };

  first.addEventListener("error", () => {
    if (sequence !== selectVideoSequence) return;
    notifyReady();
    bgFade.classList.remove("show");
  }, { once: true });

  if (first.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) start();
  else first.addEventListener("canplay", start, { once: true });
}

function watchSelectionLoop(src, sequence) {
  selectLoopWatching = true;
  const watch = () => {
    if (!selectLoopWatching || sequence !== selectVideoSequence) return;
    if (!activeSelectVideo.duration) return requestAnimationFrame(watch);
    if (
      activeSelectVideo.duration - activeSelectVideo.currentTime <=
      SELECTION_LOOP_PREPARE_BEFORE
    ) {
      switchSelectionLoop(src, sequence);
      return;
    }
    requestAnimationFrame(watch);
  };
  watch();
}

function warmupSelectionLoopVideo(video, sequence) {
  const warmup = () => {
    if (sequence !== selectVideoSequence || video.dataset.loopWarmed === "1") return;
    video.dataset.loopWarmed = "1";
    const previousDisplay = video.style.display;
    video.style.display = "block";

    video.play().then(() => {
      const pauseAtFirstFrame = () => {
        if (sequence !== selectVideoSequence || video.classList.contains("show")) return;
        video.pause();
        video.currentTime = 0;
        video.style.display = previousDisplay;
      };
      if (typeof video.requestVideoFrameCallback === "function") {
        video.requestVideoFrameCallback(pauseAtFirstFrame);
      } else {
        requestAnimationFrame(() => requestAnimationFrame(pauseAtFirstFrame));
      }
    }).catch(() => {
      delete video.dataset.loopWarmed;
      video.style.display = previousDisplay;
    });
  };

  if (video.seeking) video.addEventListener("seeked", warmup, { once: true });
  else if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) warmup();
  else video.addEventListener("loadeddata", warmup, { once: true });
}

function switchSelectionLoop(src, sequence) {
  const current = activeSelectVideo;
  const next = standbySelectVideo;
  let revealed = false;
  let restartRequested = false;
  let retryCount = 0;
  next.currentTime = 0;
  next.style.display = "block";
  next.style.transitionDuration = `${SELECTION_LOOP_FADE_TIME}ms`;
  current.classList.remove("front");
  next.classList.add("front");

  const showNext = () => {
    if (revealed || sequence !== selectVideoSequence) return;
    revealed = true;
    next.classList.add("show");
    setTimeout(() => {
      if (sequence !== selectVideoSequence) return;
      current.classList.remove("show", "front");
      current.pause();
      current.currentTime = 0;
      current.style.display = "none";
      delete current.dataset.loopWarmed;
      warmupSelectionLoopVideo(current, sequence);
      activeSelectVideo = next;
      standbySelectVideo = current;
      next.style.transitionDuration = "";
      selectLoopWatching = false;
      watchSelectionLoop(src, sequence);
    }, SELECTION_LOOP_FADE_TIME);
  };

  const restartAtLoopHead = () => {
    if (restartRequested || revealed || sequence !== selectVideoSequence) return;
    restartRequested = true;
    next.currentTime = 0;
    const waitForRestartedFrame = () => {
      if (typeof next.requestVideoFrameCallback === "function") {
        next.requestVideoFrameCallback(showNext);
      } else {
        requestAnimationFrame(() => requestAnimationFrame(showNext));
      }
    };
    if (next.seeking) next.addEventListener("seeked", waitForRestartedFrame, { once: true });
    else waitForRestartedFrame();
  };

  const revealNextFrame = () => {
    if (revealed || sequence !== selectVideoSequence) return;
    const remain = current.duration - current.currentTime;
    if (remain > SELECTION_LOOP_SWITCH_BEFORE) {
      requestAnimationFrame(revealNextFrame);
      return;
    }
    restartAtLoopHead();
  };

  const attemptPlay = () => {
    if (revealed || sequence !== selectVideoSequence) return;
    next.play().then(() => {
      if (sequence !== selectVideoSequence) {
        next.pause();
        return;
      }
      if (typeof next.requestVideoFrameCallback === "function") {
        next.requestVideoFrameCallback(revealNextFrame);
      } else {
        requestAnimationFrame(() => requestAnimationFrame(revealNextFrame));
      }
    }).catch(() => {
      if (sequence !== selectVideoSequence || retryCount >= 10) return;
      retryCount++;
      setTimeout(attemptPlay, 100);
    });
  };

  attemptPlay();
}

function stopSelectionVideos() {
  selectLoopWatching = false;
  selectVideoSequence++;
  [selectVideo1, selectVideo2].forEach(video => {
    video.pause();
    video.classList.remove("show", "front");
    video.style.display = "none";
    video.style.transitionDuration = "";
  });
}

function showEventSelection(restartCommonVideo = true, onVideoReady = null) {
  evtIdx = -1;
  evtId = "";
  tgtEvtData = null;
  updateFilteredEvents();
  updateDecideButton();
  createCards();
  bgImg.src = getChrSelPath(chrId);
  // 選択動画が遅れても①のキャラクター画像を見せず、黒背景を維持する。
  bgImg.style.opacity = 0;
  if (restartCommonVideo) {
    playSelectionLoop(getCharacterLoopPath(), onVideoReady);
  } else if (onVideoReady) {
    onVideoReady();
  }
}

function changeLevel() {
  if (cardList.classList.contains("cards-switching")) return;

  clearTimeout(levelSwitchTimer);
  cardList.classList.add("cards-switching");

  levelSwitchTimer = setTimeout(() => {
    selectedLevel = selectedLevel >= 4 ? 1 : selectedLevel + 1;
    showEventSelection(false);

    // 非表示中にカードと選択位置を確定してから表示する。
    cardList.offsetHeight;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => cardList.classList.remove("cards-switching"));
    });
  }, 220);
}

function goBackSelection() {
  if (screen === "preview") {
    returnToEventSelection();
  } else if (screen === "event") {
    setScreen("mode", true);
  } else if (screen === "mode") {
    setScreen("character", true);
  }
}

function updateDecideButton() {
  decideBtn.classList.toggle("decideBtn-hs", chrId === "FF");
  decideBtn.classList.toggle("decideBtn-ps", chrId !== "FF");
}

function goToEvent() {
  if (isDeciding || !tgtEvtData) return;
  if (
    document.body.dataset.selectionHost !== "event" ||
    typeof window.startEmbeddedEventPlayback !== "function"
  ) {
    return;
  }

  isDeciding = true;
  const viewport = document.getElementById("viewport");
  viewport.classList.add("preview-starting");
  document.body.classList.add("preview-starting");
  decideBtn.classList.add("pressed", "disabled");
  // ボタン発光、青い拡散光、白、黒の順に独立したレイヤーでつなぐ。
  setTimeout(() => {
    document.body.classList.add("event-start-leaving");
    document.body.classList.add("event-rank-hidden");
    fade.classList.add("show");
  }, 2300);
  setTimeout(() => {
    document.body.classList.add("preview-black-transition");
  }, 2500);
  setTimeout(() => {
    stopSelectionVideos();
    eventPlaybackPreloadVideos.forEach(video => video.pause());
    window.startEmbeddedEventPlayback(
      tgtEvtData.evtId,
      autoFlg,
      getPreviewLvKbn(tgtEvtData),
      normalizeLvKbn(lvKbn)
    );
    document.body.classList.remove("preview-starting", "preview-black-transition");
  }, 3450);
}

function handleDecision() {
  if (screen === "event") {
    enterEventPreview();
  } else if (screen === "preview") {
    goToEvent();
  }
}

function bindInteractions() {
  const viewport = document.getElementById("viewport");
  const selectControlArea = document.getElementById("selectControlArea");
  viewport.addEventListener("touchstart", event => {
    if (event.target.closest("button") || (screen !== "event" && event.target.closest(".card"))) return;
    isDragging = true;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
  }, { passive: true });
  viewport.addEventListener("touchend", event => {
    if (!isDragging) return;
    isDragging = false;
    const dx = event.changedTouches[0].clientX - startX;
    const dy = event.changedTouches[0].clientY - startY;
    if (screen === "mode" && Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy)) {
      selectControlArea.classList.toggle("show", dx < 0);
    } else if (screen === "event" && Math.abs(dy) > 45 && Math.abs(dy) > Math.abs(dx)) {
      const nextIndex = Math.max(
        0,
        Math.min(filteredEvtData.length - 1, evtIdx + (dy < 0 ? 1 : -1))
      );
      if (nextIndex !== evtIdx) selectEvent(nextIndex);
      suppressEventCardClick = true;
      setTimeout(() => { suppressEventCardClick = false; }, 400);
    } else if (screen === "character" && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      changeCharacter(dx < 0 ? 1 : -1);
      suppressCharacterClick = true;
      setTimeout(() => { suppressCharacterClick = false; }, 350);
    }
  }, { passive: true });
  document.getElementById("characterStage").addEventListener("click", confirmCharacter);
  document.querySelectorAll(".characterCursor").forEach(cursor => {
    cursor.addEventListener("click", event => {
      event.stopPropagation();
      changeCharacter(Number(cursor.dataset.step));
    });
  });
  document.querySelectorAll(".modeChoice").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();
      selectMode(button.dataset.mode);
    });
  });
  document.getElementById("backBtn").addEventListener("click", event => {
    event.stopPropagation();
    goBackSelection();
  });
  document.getElementById("previewTapPrompt").addEventListener("click", event => {
    event.stopPropagation();
    if (screen === "preview") goToEvent();
  });
  document.getElementById("selectTitleBtn").addEventListener("click", event => {
    event.stopPropagation();
    selectControlArea.classList.remove("show");
    if (document.body.dataset.selectionHost === "event") {
      location.href = "./select.html?chrId=" + encodeURIComponent(chrId);
      return;
    }
    setScreen("character", true);
  });
  decideBtn.addEventListener("click", handleDecision);
}

function hasPendingEventPlaybackEntry() {
  if (document.body.dataset.selectionHost !== "event") return false;

  const params = new URLSearchParams(location.search);
  return Boolean((params.get("debugMovId") || "").trim());
}

function bindCharacterSelectionInteractions() {
  const viewport = document.getElementById("viewport");
  viewport.addEventListener("touchstart", event => {
    isDragging = true;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
  }, { passive: true });
  viewport.addEventListener("touchend", event => {
    if (!isDragging) return;
    isDragging = false;
    const dx = event.changedTouches[0].clientX - startX;
    const dy = event.changedTouches[0].clientY - startY;
    if (Math.abs(dx) <= 40 || Math.abs(dx) <= Math.abs(dy)) return;
    changeCharacter(dx < 0 ? 1 : -1);
    suppressCharacterClick = true;
    setTimeout(() => { suppressCharacterClick = false; }, 350);
  }, { passive: true });

  document.getElementById("characterStage").addEventListener("click", confirmCharacter);
  document.querySelectorAll(".characterCursor").forEach(cursor => {
    cursor.addEventListener("click", event => {
      event.stopPropagation();
      changeCharacter(Number(cursor.dataset.step));
    });
  });
}

function initializeCharacterSelection() {
  const params = new URLSearchParams(location.search);
  const requestedChrId = (params.get("chrId") || "AK").trim();
  chrId = chrList.includes(requestedChrId) ? requestedChrId : "AK";
  chrIdx = chrList.indexOf(chrId);
  autoFlg = params.get("autoFlg") || "0";
  lvKbn = normalizeLvKbn(params.get("LvKbn"));
  screen = "character";

  const viewport = document.getElementById("viewport");
  viewport.dataset.screen = screen;
  bindCharacterSelectionInteractions();
  showCharacter();
  preloadCharacterLoopVideo();

  Promise.all(chrList.map(id => new Promise(resolve => {
    const image = new Image();
    image.onload = resolve;
    image.onerror = resolve;
    image.src = getChrSelPath(id);
  }))).then(() => { viewport.style.opacity = 1; });
}

window.addEventListener("load", () => {
  // 同じevent.htmlで本編を開始する場合、背後の選択動画を起動して帯域を競合させない。
  if (hasPendingEventPlaybackEntry()) return;

  bgImg = document.getElementById("bgImg");
  bgFade = document.getElementById("bgFade");
  fade = document.getElementById("selectionFade");
  selectVideo1 = document.getElementById("selectVideo1");
  selectVideo2 = document.getElementById("selectVideo2");
  activeSelectVideo = selectVideo1;
  standbySelectVideo = selectVideo2;

  if (document.body.dataset.selectionHost !== "event") {
    initializeCharacterSelection();
    return;
  }

  cardList = document.getElementById("cardList");
  decideBtn = document.getElementById("decideBtn");
  levelSelector = document.getElementById("levelSelector");
  levelValue = document.getElementById("levelValue");
  selectionTitleArea = document.getElementById("selectionTitleArea");
  selectionTitleText = document.getElementById("selectionTitleText");
  previewEventName = document.getElementById("previewEventName");
  selectPreloadVideo = document.getElementById("selectPreloadVideo");
  readSelectionParams();
  bindInteractions();
  let initialVideoReadyResolve;
  const initialVideoReady = new Promise(resolve => {
    initialVideoReadyResolve = resolve;
  });
  let initialVideoReadyDone = false;
  const notifyInitialVideoReady = () => {
    if (initialVideoReadyDone) return;
    initialVideoReadyDone = true;
    initialVideoReadyResolve();
  };
  setScreen(screen, false, notifyInitialVideoReady);
  if (rankResultPending) prepareRankResultAnimation();
  const preloadPromise = preloadImages();
  const initialDisplayReady = Promise.all([preloadPromise, initialVideoReady]);
  const viewport = document.getElementById("viewport");
  if (rankResultPending) {
    // ランク演出は画像読込を待たず、ページ遷移直後の黒画面上で開始する。
    document.body.classList.add("event-rank-result");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.body.classList.remove("event-rank-initializing");
        playRankResultAnimation(() => {
          rankResultPending = false;
          initialDisplayReady.then(() => {
            viewport.style.opacity = 1;
            document.body.classList.remove("event-rank-result");
          });
        });
      });
    });
  } else {
    initialDisplayReady.then(() => {
      viewport.style.opacity = 1;
      requestAnimationFrame(() => {
        document.body.classList.remove("event-rank-initializing");
      });
    });
  }
});

})();
