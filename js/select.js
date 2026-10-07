(function () {

let cardList, bgImg, bgFade, fade, decideBtn;
let levelSelector, levelValue, selectionTitleArea, selectionTitleText;
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
const PREVIEW_PLACE_DISPLAY_TIME = 1500;
const PREVIEW_PLACE_FADE_TIME = 350;
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
  const nextValue = String(preview.length);
  if (value.textContent !== nextValue) {
    value.classList.remove("value-changing");
    value.offsetWidth;
    value.textContent = nextValue;
    value.classList.add("value-changing");
  }
  status.setAttribute("aria-label", `レベル${preview.length}`);
  segments.forEach((segment, index) => {
    const mode = preview.charAt(index);
    if (mode) segment.dataset.mode = mode;
    else delete segment.dataset.mode;
    segment.classList.remove("pending");
  });

  if (blinkPending && preview.length > current.length) {
    // 追加済み区画も含めて同一フレームで再開し、点滅の位相を揃える。
    status.offsetWidth;
    segments.forEach((segment, index) => {
      if (index >= current.length && index < preview.length) {
        segment.classList.add("pending");
      }
    });
  }
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
  chrId = chrList.includes(requestedChrId) ? requestedChrId : "AK";
  if (requestedEvent) chrId = requestedEvent.evtId.substring(0, 2);
  else if (previousEvent) chrId = previousEvent.evtId.substring(0, 2);

  if (requestedEvent) {
    selectedLevel = Number(requestedEvent.evtId.charAt(4)) || 1;
    selectedMode = requestedEvent.evtId.charAt(3);
    screen = "event";
  } else if (previousEvent) {
    previousEventLevel = Number(previousEvent.evtId.charAt(4)) || 0;
    const hasNextEvent = evtData.some(evt =>
      evt.evtId.substring(0, 2) === chrId &&
      Number(evt.evtId.charAt(4)) > previousEventLevel
    );
    if (!hasNextEvent && isEventSelectionHost) {
      location.replace("./select.html?chrId=" + encodeURIComponent(chrId));
      screen = "character";
    } else {
      screen = hasNextEvent ? "mode" : "character";
    }
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
  const loopFileByMode = {
    R: "11.evt-L.mp4",
    S: "12.evt-L.mp4",
    C: "13.evt-L.mp4"
  };
  // ①を経由して②へ進む場合は、前イベントのモードを引き継がない。
  const previousMode = screen === "character" ? "" : befEvtId.charAt(3);
  const loopFile = loopFileByMode[previousMode] || "01.evt-L.mp4";
  return getChrDir(chrId) + "/00.選択/" + loopFile;
}

function getEventLoopPath(evt) {
  return getEvtDir(evt) + "/02.evt-L.mp4";
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

function setScreen(nextScreen, delayed = false) {
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
    // ③では選択後も共通動画を維持するため、②へ戻る際の動画切替は不要。
    const restoreCommonVideo = false;
    viewport.classList.add("screen-transitioning", "event-to-mode");
    if (restoreCommonVideo) bgFade.classList.add("show");

    screenTransitionTimer = setTimeout(() => {
      screen = "mode";
      viewport.dataset.screen = screen;
      viewport.classList.add("mode-return-preparing");
      showModeSelection(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            viewport.classList.add("mode-return-visible");
            if (restoreCommonVideo) bgFade.classList.remove("show");

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
    }, restoreCommonVideo ? 500 : 400);
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
    return apply();
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
    }, 500);
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

function showModeSelection(onReady = null, restartCommonVideo = true) {
  evtIdx = -1;
  evtId = "";
  tgtEvtData = null;
  document.getElementById("viewport").classList.remove("event-unselected");
  decideBtn.classList.add("disabled");
  updateEventLevelStatus();

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
    playSelectionLoop(getCharacterLoopPath(), onReady);
  } else if (onReady) {
    onReady();
  }
}

function selectMode(mode) {
  const button = document.querySelector(`.modeChoice[data-mode="${mode}"]`);
  if (!button || button.disabled) return;
  document.getElementById("selectControlArea").classList.remove("show");
  lvKbn = "";
  selectedMode = mode;
  initialEvtId = "";
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
  const preloadDelay = instant ? 650 : 320;
  const selectedEvent = tgtEvtData;
  eventPlaybackPreloadTimer = setTimeout(() => {
    if (screen !== "event" || tgtEvtData?.evtId !== selectedEvent.evtId) return;
    preloadSelectedEventVideo(selectedEvent);
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
  selectPreloadVideo.preload = "auto";
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
      video.preload = "auto";
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
  clearTimeout(selectionChangeTimer);
  decideBtn.classList.add("pressed");
  setTimeout(() => decideBtn.classList.remove("pressed"), 500);
  viewport.classList.add("screen-transitioning");
  fade.classList.add("show");

  selectionChangeTimer = setTimeout(() => {
    screen = "preview";
    viewport.dataset.screen = screen;
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

      fade.classList.remove("show");
      setTimeout(() => viewport.classList.remove("screen-transitioning"), 500);
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
  viewport.classList.add("screen-transitioning");
  fade.classList.add("show");

  clearTimeout(selectionChangeTimer);
  selectionChangeTimer = setTimeout(() => {
    screen = "event";
    viewport.dataset.screen = screen;
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
  video.dataset.src = src;
  video.src = src;
  video.preload = "auto";
  video.load();
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
      first.classList.add("show");
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
    if (activeSelectVideo.duration - activeSelectVideo.currentTime <= .25) {
      switchSelectionLoop(src, sequence);
      return;
    }
    requestAnimationFrame(watch);
  };
  watch();
}

function switchSelectionLoop(src, sequence) {
  const current = activeSelectVideo;
  const next = standbySelectVideo;
  next.currentTime = 0;
  next.style.display = "block";
  current.classList.remove("front");
  next.classList.add("front");
  next.play().then(() => {
    if (sequence !== selectVideoSequence) return;
    next.classList.add("show");
    setTimeout(() => {
      if (sequence !== selectVideoSequence) return;
      current.classList.remove("show", "front");
      current.pause();
      current.currentTime = 0;
      current.style.display = "none";
      activeSelectVideo = next;
      standbySelectVideo = current;
      selectLoopWatching = false;
      watchSelectionLoop(src, sequence);
    }, 300);
  }).catch(() => {});
}

function stopSelectionVideos() {
  selectLoopWatching = false;
  selectVideoSequence++;
  [selectVideo1, selectVideo2].forEach(video => {
    video.pause();
    video.classList.remove("show", "front");
    video.style.display = "none";
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
  document.body.classList.add("event-start-leaving");
  decideBtn.classList.add("pressed", "disabled");
  setTimeout(() => fade.classList.add("show"), 120);
  setTimeout(() => {
    stopSelectionVideos();
    eventPlaybackPreloadVideos.forEach(video => video.pause());
    window.startEmbeddedEventPlayback(tgtEvtData.evtId, autoFlg, getPreviewLvKbn(tgtEvtData));
  }, 780);
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
  viewport.addEventListener("click", event => {
    if (screen !== "preview" || event.target.closest("#backBtn")) return;
    goToEvent();
  });
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
  selectPreloadVideo = document.getElementById("selectPreloadVideo");
  readSelectionParams();
  bindInteractions();
  setScreen(screen);
  preloadImages().then(() => { document.getElementById("viewport").style.opacity = 1; });
});

})();
