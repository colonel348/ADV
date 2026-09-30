let cardList, bgImg, bgFade, fade, decideBtn;
let levelSelector, levelValue, selectionTitleArea, selectionTitleText;
let selectVideo1, selectVideo2, selectPreloadVideo, activeSelectVideo, standbySelectVideo;
let screen = "character";
let selectedLevel = 1;
let startX = 0;
let startY = 0;
let isDragging = false;
let suppressCharacterClick = false;
let isDeciding = false;
let screenTransitionTimer = null;
let characterAnimationTimer = null;
let selectionChangeTimer = null;
let levelSwitchTimer = null;
let selectVideoSequence = 0;
let selectLoopWatching = false;
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
  R: "魅惑",
  S: "鍛錬",
  C: "羞恥"
};

const modeIconPaths = {
  R: "../img/romance-mode.png",
  S: "../img/serious-mode.png",
  C: "../img/shame-mode-v10.png"
};

function readSelectionParams() {
  const params = new URLSearchParams(location.search);
  const requestedEvtId = (params.get("evtId") || "").trim();
  const requestedChrId = (params.get("chrId") || "AK").trim();
  const requestedLevel = Number(params.get("level"));
  const requestedEvent = evtData.find(evt => evt.evtId === requestedEvtId);

  autoFlg = params.get("autoFlg") || "0";
  chrId = chrList.includes(requestedChrId) ? requestedChrId : "AK";
  if (requestedEvent) chrId = requestedEvent.evtId.substring(0, 2);

  if (Number.isInteger(requestedLevel) && requestedLevel >= 1 && requestedLevel <= 4) {
    selectedLevel = requestedLevel;
    screen = "event";
  } else if (requestedEvent) {
    selectedLevel = Number(requestedEvent.evtId.charAt(4)) || 1;
    screen = "event";
  }

  evtId = "";
  evtIdx = -1;
  tgtEvtData = null;
  chrIdx = chrList.indexOf(chrId);
}

function getCharacterLoopPath() {
  return getChrDir(chrId) + "/00.選択/01.evt-L.mp4";
}

function getEventLoopPath(evt) {
  return getEvtDir(evt) + "/02.evt-L.mp4";
}

function preloadImages() {
  const urls = chrList.map(getChrSelPath).concat(Object.values(modeIconPaths));
  evtData.forEach(evt => urls.push(getBnrPath(evt)));
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
  showCharacter(true, step < 0 ? "right" : "left");
  preloadCharacterLoopVideo();
}

function setScreen(nextScreen, delayed = false) {
  const viewport = document.getElementById("viewport");
  clearTimeout(screenTransitionTimer);
  const isCharacterToEvent = delayed && screen === "character" && nextScreen === "event";
  viewport.classList.toggle("character-to-event", isCharacterToEvent);

  const apply = (onReady = null) => {
    screen = nextScreen;
    viewport.dataset.screen = screen;
    if (screen === "character") {
      showCharacter();
      preloadCharacterLoopVideo();
      if (onReady) onReady();
    } else {
      showEventSelection(true, onReady);
    }
    requestAnimationFrame(() => viewport.classList.remove("screen-leaving"));
  };

  if (!delayed) {
    viewport.classList.remove("character-to-event");
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
          fade.classList.remove("show");
          setTimeout(() => {
            viewport.classList.remove("screen-transitioning", "character-to-event");
          }, 500);
        });
      });
    });
  }, 500);
}

function confirmCharacter() {
  if (suppressCharacterClick) return;
  selectedLevel = 1;
  evtIdx = -1;
  tgtEvtData = null;
  setScreen("event", true);
}

function updateFilteredEvents() {
  const order = { R: 0, S: 1, C: 2 };
  filteredEvtData = evtData
    .filter(evt => evt.evtId.substring(0, 2) === chrId && Number(evt.evtId.charAt(4)) === selectedLevel)
    .sort((a, b) => (order[a.evtId.charAt(3)] ?? 9) - (order[b.evtId.charAt(3)] ?? 9));
}

function updateLevelSelector() {
  levelValue.textContent = selectedLevel;
  levelSelector.dataset.level = selectedLevel;
  levelSelector.style.setProperty("--level-color", levelColors[selectedLevel]);
  levelSelector.style.setProperty("--level-edge-color", levelEdgeColors[selectedLevel]);
  levelSelector.setAttribute("aria-label", `特訓レベル${selectedLevel}。押すと次のレベル`);
}

function centerUnselectedCards() {
  requestAnimationFrame(() => {
    const sidebar = document.getElementById("sidebar");
    const offset = Math.max(0, (sidebar.clientHeight - cardList.scrollHeight) / 2);
    cardList.style.transform = `translateY(${offset}px)`;
  });
}

function createCards() {
  cardList.innerHTML = "";
  decideBtn.classList.add("disabled");

  if (!filteredEvtData.length) {
    const empty = document.createElement("div");
    empty.id = "emptyEvents";
    empty.textContent = `特訓Lv${selectedLevel}のイベントはまだありません`;
    cardList.appendChild(empty);
    centerUnselectedCards();
    return;
  }

  filteredEvtData.forEach((data, index) => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.mode = data.evtId.charAt(3);
    const inner = document.createElement("div");
    inner.className = "cardInner";
    inner.style.setProperty("--card-bg", `url("${getBnrPath(data)}")`);
    const border = document.createElement("div");
    border.className = "innerBorder";
    const modeBadge = document.createElement("div");
    modeBadge.className = "cardModeBadge";
    const mode = data.evtId.charAt(3);
    const modeIconFrame = document.createElement("span");
    modeIconFrame.className = "cardModeIconFrame";
    const modeIcon = document.createElement("img");
    modeIcon.className = "cardModeIcon";
    modeIcon.src = modeIconPaths[mode] || "";
    modeIcon.alt = "";
    modeIconFrame.appendChild(modeIcon);
    const modeText = document.createElement("span");
    modeText.textContent = modeLabels[mode] || "";
    modeBadge.append(modeIconFrame, modeText);
    const label = document.createElement("div");
    label.className = "label";
    const labelText = document.createElement("span");
    labelText.className = "labelText";
    const name = String(data.evtNm || "");
    const initial = document.createElement("span");
    initial.className = "labelInitial";
    initial.textContent = name.charAt(0);
    labelText.append(initial, document.createTextNode(name.slice(1)));
    label.appendChild(labelText);
    inner.append(label, border, modeBadge);
    card.appendChild(inner);
    card.addEventListener("click", event => {
      event.stopPropagation();
      selectEvent(index);
    });
    cardList.appendChild(card);
  });
  selectEvent(0, true);
}

function selectEvent(index, instant = false) {
  if (evtIdx === index) return;
  evtIdx = index;
  tgtEvtData = filteredEvtData[index];
  evtId = tgtEvtData.evtId;
  decideBtn.classList.remove("disabled");

  const cards = document.querySelectorAll(".card");
  cards.forEach((card, i) => card.classList.toggle("active", i === index));
  const activeCard = cards[index];
  if (activeCard) {
    const sidebar = document.getElementById("sidebar");
    const offset = activeCard.offsetTop - ((sidebar.clientHeight - activeCard.offsetHeight) / 2);

    if (instant) {
      cardList.style.transition = "none";
    }

    cardList.style.transform = `translateY(${-offset}px)`;

    if (instant) {
      cardList.offsetHeight;
      cardList.style.transition = "";
    }
  }
  preloadSelectedEventVideo(tgtEvtData);
}

function preloadSelectedEventVideo(evt) {
  const src = getEventLoopPath(evt);
  if (selectPreloadVideo.dataset.src === src) return;
  selectPreloadVideo.pause();
  selectPreloadVideo.dataset.src = src;
  selectPreloadVideo.src = src;
  selectPreloadVideo.preload = "auto";
  selectPreloadVideo.load();
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

  const start = () => {
    if (sequence !== selectVideoSequence || playPending) return;
    playPending = true;
    first.play().then(() => {
      playPending = false;
      if (sequence !== selectVideoSequence) return;
      first.classList.add("show");
      notifyReady();
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
  updateLevelSelector();
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
    setScreen("character", true);
  }
}

function updateDecideButton() {
  decideBtn.classList.toggle("decideBtn-hs", chrId === "FF");
  decideBtn.classList.toggle("decideBtn-ps", chrId !== "FF");
}

function goToEvent() {
  if (isDeciding || !tgtEvtData) return;
  isDeciding = true;
  decideBtn.classList.add("pressed", "disabled");
  setTimeout(() => fade.classList.add("show"), 120);
  setTimeout(() => {
    location.href = "./event.html?chrId=" + chrId + "&evtId=" + tgtEvtData.evtId +
      "&autoFlg=" + autoFlg + "&debugMovId=";
  }, 520);
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
  viewport.addEventListener("click", event => {
    if (screen !== "preview" || event.target.closest("#backBtn")) return;
    goToEvent();
  });
  viewport.addEventListener("touchstart", event => {
    if (event.target.closest("button") || event.target.closest(".card")) return;
    isDragging = true;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
  }, { passive: true });
  viewport.addEventListener("touchend", event => {
    if (!isDragging) return;
    isDragging = false;
    const dx = event.changedTouches[0].clientX - startX;
    const dy = event.changedTouches[0].clientY - startY;
    if (screen === "character" && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
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
  document.getElementById("backBtn").addEventListener("click", event => {
    event.stopPropagation();
    goBackSelection();
  });
  levelSelector.addEventListener("click", event => {
    event.stopPropagation();
    changeLevel();
  });
  decideBtn.addEventListener("click", handleDecision);
}

window.addEventListener("load", () => {
  cardList = document.getElementById("cardList");
  bgImg = document.getElementById("bgImg");
  bgFade = document.getElementById("bgFade");
  fade = document.getElementById("fade");
  decideBtn = document.getElementById("decideBtn");
  levelSelector = document.getElementById("levelSelector");
  levelValue = document.getElementById("levelValue");
  selectionTitleArea = document.getElementById("selectionTitleArea");
  selectionTitleText = document.getElementById("selectionTitleText");
  selectVideo1 = document.getElementById("selectVideo1");
  selectVideo2 = document.getElementById("selectVideo2");
  selectPreloadVideo = document.getElementById("selectPreloadVideo");
  activeSelectVideo = selectVideo1;
  standbySelectVideo = selectVideo2;
  readSelectionParams();
  bindInteractions();
  setScreen(screen);
  preloadImages().then(() => { document.getElementById("viewport").style.opacity = 1; });
});
