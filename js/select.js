let cardList;
let bgImg;
let bgFade;
let fade;
let decideBtn;

let screen = "character";
let startX = 0;
let startY = 0;
let isDragging = false;
let suppressCharacterClick = false;
let isDeciding = false;
let screenTransitionTimer = null;
let characterAnimationTimer = null;

let chrList = ["FF", "AK", "SA"];
let chrIdx = 1;
let filteredEvtData = [];

const characterNames = {
  FF: "ホタル",
  AK: "小豆沢こはね",
  SA: "白石杏"
};

const modeIconMap = {
  R: "../img/romance-mode.png",
  S: "../img/serious-mode.png",
  C: "../img/control-mode.png"
};

function readSelectionParams() {
  const params = new URLSearchParams(window.location.search);
  const requestedEvtId = (params.get("evtId") || "").trim();
  const requestedChrId = (params.get("chrId") || "AK").trim();

  autoFlg = params.get("autoFlg") || "0";
  evtId = requestedEvtId;
  chrId = chrList.includes(requestedChrId) ? requestedChrId : "AK";
  cptId = params.get("cptId") || "1";

  const requestedEvent = evtData.find(evt => evt.evtId === requestedEvtId);

  if (requestedEvent) {
    tgtEvtData = requestedEvent;
    chrId = requestedEvent.evtId.substring(0, 2);
    modeKbn = requestedEvent.evtId.charAt(3);
    cptIdx = requestedEvent.cpt.findIndex(cpt => String(cpt.cptId) === String(cptId));
    if (cptIdx < 0) cptIdx = 0;
    screen = "event";
  } else {
    tgtEvtData = null;
    modeKbn = "R";
    cptIdx = 0;
    screen = "character";
  }

  chrIdx = chrList.indexOf(chrId);
}

function preloadImages() {
  const urls = [];

  chrList.forEach(chr => {
    urls.push(getChrSelPath(chr));
  });

  Object.values(modeIconMap).forEach(url => {
    urls.push(url);
  });

  evtData.forEach(evt => {
    urls.push(getBnrPath(evt));
    urls.push(getSelPath(evt, evt.cpt[0]));
  });

  return Promise.all(urls.map(url => new Promise(resolve => {
    const img = new Image();
    img.onload = resolve;
    img.onerror = resolve;
    img.src = url;
  })));
}

function waitForImage(src) {
  return new Promise(resolve => {
    const image = new Image();

    image.onload = async () => {
      try {
        if (image.decode) await image.decode();
      } catch (error) {
      }
      resolve();
    };

    image.onerror = resolve;
    image.src = src;
  });
}

function setScreen(
  nextScreen,
  delayed = false,
  preserveCurrent = false
) {
  const viewport = document.getElementById("viewport");

  clearTimeout(screenTransitionTimer);

  if (delayed) {
    if (!preserveCurrent) {
      viewport.classList.add("screen-leaving");
    }

    screenTransitionTimer = setTimeout(() => {
      screen = nextScreen;
      viewport.dataset.screen = screen;
      showScreenContent(nextScreen, true);

      // 次画面を透明状態で一度描画してから表示し、背景マスクの急な切替を防ぐ
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          viewport.classList.remove("screen-leaving");
        });
      });
    }, 300);

    return;
  }

  screen = nextScreen;
  viewport.dataset.screen = screen;
  showScreenContent(nextScreen);
}

function showScreenContent(nextScreen, fromTransition = false) {

  if (nextScreen === "character") {
    showCharacter();
  } else if (nextScreen === "mode") {
    showModeChoices();
  } else {
    showEventSelection(false, fromTransition);
  }
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
    const startOffset =
      direction === "none"
        ? "0px"
        : direction === "right"
          ? "60px"
          : "-60px";
    bgImg.style.transition = "none";
    bgImg.style.transform = `translate(${startOffset}, -50%)`;
    bgImg.offsetHeight;
    bgImg.src = src;
    bgImg.style.transition = "opacity .4s ease, transform .4s ease, filter .4s ease";

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

  // スワイプ直後から現在のキャラクター画像をフェードアウト
  bgImg.style.opacity = 0;

  characterAnimationTimer = setTimeout(() => {
    nameText.textContent = characterNames[chrId];
    nameText.dataset.name = characterNames[chrId];

    const startOffset = direction === "right" ? "60px" : "-60px";
    bgImg.style.transition = "none";
    bgImg.style.transform = `translate(${startOffset}, -50%)`;
    bgImg.src = getChrSelPath(chrId);
    bgImg.offsetHeight;
    bgImg.style.transition = "opacity .4s ease, transform .4s ease, filter .4s ease";

    requestAnimationFrame(() => {
      bgImg.style.opacity = 1;
      bgImg.style.transform = "translate(0, -50%)";
    });

    stage.classList.remove("character-changing");
    stage.classList.add("character-reveal");

    setTimeout(() => {
      stage.classList.remove("character-reveal");
    }, 650);
  }, 260);
}

function changeCharacter(step) {
  animateCharacterCursor(step);
  chrIdx = (chrIdx + step + chrList.length) % chrList.length;
  chrId = chrList[chrIdx];
  showCharacter(true, step < 0 ? "right" : "left");
}

function animateCharacterCursor(step) {
  const cursor = document.querySelector(
    step < 0 ? ".characterCursor-left" : ".characterCursor-right"
  );

  if (!cursor) return;

  cursor.classList.remove("cursor-activated");
  cursor.offsetHeight;
  cursor.classList.add("cursor-activated");

  setTimeout(() => {
    cursor.classList.remove("cursor-activated");

    // 片側だけ位相がずれないよう、左右の通常アニメーションを同時再開
    const cursors = document.querySelectorAll(".characterCursor");
    cursors.forEach(item => {
      item.style.animation = "none";
    });

    cursor.offsetHeight;

    requestAnimationFrame(() => {
      cursors.forEach(item => {
        item.style.animation = "";
      });
    });
  }, 360);
}

function confirmCharacter() {
  if (suppressCharacterClick) return;
  setScreen("mode", true);
}

function showModeChoices(backgroundDirection = "right") {
  const characterImage = getChrSelPath(chrId);
  const modeLabelMap = {
    R: "恋愛モード",
    S: "本気モード",
    C: "調教モード"
  };

  // ③から戻った場合は、選択中キャラクターのタイトル画像へ戻す
  if (bgImg.getAttribute("src") !== characterImage) {
    swapBackground(characterImage, backgroundDirection, true);
  }

  document.querySelectorAll(".modeChoice").forEach(choice => {
    const mode = choice.dataset.mode;
    const image = choice.querySelector(".modeChoiceImage");
    const label = choice.querySelector(".modeChoiceLabel");
    const text = choice.querySelector(".modeChoiceText");
    const availableNumbers = new Set(
      evtData
        .filter(evt =>
          evt.evtId.substring(0, 2) === chrId &&
          evt.evtId.charAt(3) === mode &&
          /^[1-4]$/.test(evt.evtId.charAt(4))
        )
        .map(evt => Number(evt.evtId.charAt(4)))
    );

    let availability = text.querySelector(".modeAvailability");
    if (!availability) {
      availability = document.createElement("span");
      availability.className = "modeAvailability";
      text.appendChild(availability);
    }

    availability.replaceChildren();
    for (let number = 1; number <= 4; number++) {
      const diamond = document.createElement("span");
      diamond.className = "modeAvailabilityDiamond";
      diamond.dataset.level = number;
      diamond.classList.toggle("is-available", availableNumbers.has(number));
      diamond.setAttribute("aria-label", `${number}: ${availableNumbers.has(number) ? "あり" : "なし"}`);
      availability.appendChild(diamond);
    }

    const isEmpty = availableNumbers.size === 0;
    choice.classList.remove("mode-selected", "mode-dimmed", "mode-empty");
    choice.classList.toggle("mode-empty", isEmpty);
    choice.disabled = isEmpty;
    choice.setAttribute("aria-disabled", String(isEmpty));
    label.textContent = modeLabelMap[mode];
    image.style.opacity = 1;
    image.src = modeIconMap[mode];
  });
}

function selectMode(mode) {
  const viewport = document.getElementById("viewport");
  const selectedChoice = document.querySelector(`.modeChoice[data-mode="${mode}"]`);
  if (!selectedChoice || selectedChoice.disabled) return;

  viewport.classList.add("mode-transitioning");

  document.querySelectorAll(".modeChoice").forEach(choice => {
    const isSelected = choice.dataset.mode === mode;
    choice.classList.toggle("mode-selected", isSelected);
    choice.classList.toggle("mode-dimmed", !isSelected);
  });

  modeKbn = mode;
  evtId = "";
  evtIdx = 0;
  cptIdx = 0;
  updateFilteredEvents(false);
  createCards();

  // ②を300ms保持した後、そのまま黒フェードで覆う
  clearTimeout(screenTransitionTimer);
  screenTransitionTimer = setTimeout(() => {
    bgFade.classList.add("show");

    // ③表示の約0.2秒前から②のボタンを消し始める
    setTimeout(() => {
      viewport.classList.add("mode-buttons-leaving");
    }, 300);

    // 黒画面の裏側で③へ切り替える
    screenTransitionTimer = setTimeout(async () => {
      const eventBackground = getSelPath(
        filteredEvtData[evtIdx],
        filteredEvtData[evtIdx].cpt[cptIdx]
      );

      // 前のキャラ画像が一瞬見えないよう、黒画面の裏で描画準備を待つ
      await waitForImage(eventBackground);

      // 黒画面の裏で左ぼかしを完成状態にしておく
      viewport.classList.add("event-prepared");
      screen = "event";
      viewport.dataset.screen = screen;
      viewport.classList.remove("mode-buttons-leaving");

      showEventSelection(false, false);

      // 初回のイベント背景は横スライドさせず通常位置で表示
      bgImg.style.transition = "none";
      bgImg.style.opacity = 1;
      bgImg.style.transform = "translate(0, -50%)";
      bgImg.offsetHeight;
      bgImg.style.transition = "opacity .5s ease, transform .4s ease, filter .4s ease";

      bgFade.classList.remove("show");

      // 背景とぼかしを先に見せ、カードと決定ボタンを後から表示
      setTimeout(() => {
        viewport.classList.remove("event-prepared");
      }, 100);

      setTimeout(() => {
        viewport.classList.remove("mode-transitioning");
      }, 500);
    }, 500);
  }, 300);
}

function goBackSelection() {
  if (screen === "event") {
    // ③→②は、先にカードを消してから②を表示する
    const viewport = document.getElementById("viewport");
    viewport.classList.add("returning-to-mode", "event-cards-leaving");

    // 戻るボタン押下直後から現在のイベント背景を暗くする
    bgImg.style.transition = "opacity .3s ease";
    bgImg.style.opacity = 0;

    clearTimeout(screenTransitionTimer);
    screenTransitionTimer = setTimeout(async () => {
      const characterBackground = getChrSelPath(chrId);

      // 完全に暗い状態で切り替え先画像の描画準備を待つ
      await waitForImage(characterBackground);

      // キャラ画像を表示する前に、②の暗色・ぼかしを完成状態で配置
      viewport.classList.add("mode-prepared");
      screen = "mode";
      viewport.dataset.screen = screen;

      bgImg.style.transition = "none";
      bgImg.src = characterBackground;
      bgImg.style.transform = "translate(0, -50%)";
      viewport.offsetHeight;
      showModeChoices("none");

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          bgImg.style.transition = "opacity .4s ease";
          bgImg.style.opacity = 1;
          viewport.classList.remove("mode-prepared");
        });
      });

      setTimeout(() => {
        viewport.classList.remove("returning-to-mode", "event-cards-leaving");
      }, 500);
    }, 300);
  } else if (screen === "mode") {
    setScreen("character", true);
  }
}

function updateFilteredEvents(keepRequestedEvent = true) {
  filteredEvtData = evtData.filter(evt =>
    evt.evtId.startsWith(chrId) && evt.evtId.charAt(3) === modeKbn
  );

  const requestedIndex = keepRequestedEvent
    ? filteredEvtData.findIndex(evt => evt.evtId === evtId)
    : -1;

  evtIdx = requestedIndex >= 0 ? requestedIndex : 0;
  tgtEvtData = filteredEvtData[evtIdx] || null;
}

function createCards() {
  cardList.innerHTML = "";

  if (!filteredEvtData.length) {
    const empty = document.createElement("div");
    empty.id = "emptyEvents";
    empty.textContent = "このモードのイベントはまだありません";
    cardList.appendChild(empty);
    decideBtn.classList.add("disabled");
    return;
  }

  decideBtn.classList.remove("disabled");

  filteredEvtData.forEach((data, index) => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.mode = data.evtId.charAt(3);

    const inner = document.createElement("div");
    inner.className = "cardInner";
    inner.style.setProperty("--card-bg", `url("${getBnrPath(data)}")`);

    const border = document.createElement("div");
    border.className = "innerBorder";

    const level = data.evtId.charAt(4);
    const svgNamespace = "http://www.w3.org/2000/svg";
    const levelBadge = document.createElementNS(svgNamespace, "svg");
    levelBadge.classList.add("levelBadgeSvg");
    levelBadge.dataset.level = level;
    levelBadge.setAttribute("viewBox", "0 0 42 18");
    levelBadge.setAttribute("aria-label", `Lv${level}`);

    const levelBadgeShape = document.createElementNS(svgNamespace, "path");
    levelBadgeShape.classList.add("levelBadgeShape");
    levelBadgeShape.setAttribute(
      "d",
      "M5 0 H42 L38.5 12.5 Q37.5 18 32 18 H0 V5 Q0 0 5 0 Z"
    );

    const levelBadgeText = document.createElementNS(svgNamespace, "text");
    levelBadgeText.classList.add("levelBadgeText");
    levelBadgeText.setAttribute("x", "20");
    levelBadgeText.setAttribute("y", "13");
    levelBadgeText.setAttribute("text-anchor", "middle");

    const levelBadgePrefix = document.createElementNS(svgNamespace, "tspan");
    levelBadgePrefix.classList.add("levelBadgePrefix");
    levelBadgePrefix.textContent = "Lv.";

    const levelBadgeValue = document.createElementNS(svgNamespace, "tspan");
    levelBadgeValue.classList.add("levelBadgeValue");
    levelBadgeValue.textContent = String.fromCharCode(0xFF10 + Number(level));

    levelBadgeText.append(levelBadgePrefix, levelBadgeValue);
    levelBadge.append(levelBadgeShape, levelBadgeText);

    const label = document.createElement("div");
    label.className = "label";
    const labelText = document.createElement("span");
    labelText.className = "labelText";
    const eventName = String(data.evtNm || "");
    const initial = document.createElement("span");
    initial.className = "labelInitial";
    initial.textContent = eventName.charAt(0);
    labelText.append(initial, document.createTextNode(eventName.slice(1)));
    label.appendChild(labelText);

    inner.append(label, border, levelBadge);
    card.appendChild(inner);

    card.addEventListener("click", event => {
      event.stopPropagation();
      if (evtIdx === index) return;
      evtIdx = index;
      cptIdx = 0;
      updateEventSelection(true, "left");
    });

    cardList.appendChild(card);
  });
}

function updateEventSelection(
  animated = true,
  direction = "left",
  backgroundAnimated = animated
) {
  if (!filteredEvtData.length) return;

  tgtEvtData = filteredEvtData[evtIdx];
  evtId = tgtEvtData.evtId;

  const cards = document.querySelectorAll(".card");
  cards.forEach((card, index) => card.classList.toggle("active", index === evtIdx));

  const activeCard = cards[evtIdx];
  if (activeCard) {
    const offset = activeCard.offsetTop - ((document.getElementById("sidebar").clientHeight - activeCard.offsetHeight) / 2);

    if (!animated) {
      cardList.style.transition = "none";
    }

    cardList.style.transform = `translateY(${-offset}px)`;

    if (!animated) {
      cardList.offsetHeight;
      cardList.style.transition = "";
    }
  }

  swapBackground(
    getSelPath(tgtEvtData, tgtEvtData.cpt[cptIdx]),
    direction,
    backgroundAnimated
  );
}

function showEventSelection(animated = true, backgroundAnimated = animated) {
  updateDecideButton();
  updateEventSelection(animated, "left", backgroundAnimated);
}

function updateDecideButton() {
  decideBtn.classList.toggle("decideBtn-hs", chrId === "FF");
  decideBtn.classList.toggle("decideBtn-ps", chrId !== "FF");
}

function goToEvent() {
  if (isDeciding || !tgtEvtData) return;
  isDeciding = true;
  decideBtn.classList.add("pressed", "disabled");

  // ボタンを発光させてから画面を暗転
  setTimeout(() => {
    fade.classList.add("show");
  }, 120);

  setTimeout(() => {
    const targetCpt = tgtEvtData.cpt[0];
    location.href = "./event.html?chrId=" + chrId +
      "&evtId=" + tgtEvtData.evtId +
      "&cptId=" + targetCpt.cptId +
      "&autoFlg=" + autoFlg +
      "&debugMovId=";
  }, 520);
}

function handleSwipe(dx, dy) {
  if (screen === "character") {
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      changeCharacter(dx < 0 ? 1 : -1);
      suppressCharacterClick = true;
      setTimeout(() => { suppressCharacterClick = false; }, 350);
    }
    return;
  }

  if (screen !== "event" || !tgtEvtData) return;

  if (Math.abs(dy) > 40) {
    if (dy > 0 && evtIdx > 0) {
      evtIdx--;
      cptIdx = 0;
      updateEventSelection(true, "right");
    } else if (dy < 0 && evtIdx < filteredEvtData.length - 1) {
      evtIdx++;
      cptIdx = 0;
      updateEventSelection(true, "left");
    }
  }
}

function bindInteractions() {
  const viewport = document.getElementById("viewport");

  viewport.addEventListener("touchstart", event => {
    if (event.target.closest("button") || event.target.closest(".card")) return;
    isDragging = true;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
  }, { passive: true });

  viewport.addEventListener("touchend", event => {
    if (!isDragging) return;
    isDragging = false;
    handleSwipe(
      event.changedTouches[0].clientX - startX,
      event.changedTouches[0].clientY - startY
    );
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

  document.querySelectorAll(".modeChoice").forEach(choice => {
    const image = choice.querySelector(".modeChoiceImage");
    image.addEventListener("error", () => { image.style.opacity = 0; });
    choice.addEventListener("click", () => selectMode(choice.dataset.mode));
  });

  decideBtn.addEventListener("click", goToEvent);
}

window.addEventListener("load", () => {
  cardList = document.getElementById("cardList");
  bgImg = document.getElementById("bgImg");
  bgFade = document.getElementById("bgFade");
  fade = document.getElementById("fade");
  decideBtn = document.getElementById("decideBtn");

  readSelectionParams();
  updateFilteredEvents(true);
  createCards();
  bindInteractions();

  const viewport = document.getElementById("viewport");
  if (screen === "event") {
    viewport.classList.add("initial-event-ready");
  }

  setScreen(screen);

  preloadImages().then(() => {
    viewport.style.opacity = 1;

    if (viewport.classList.contains("initial-event-ready")) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          viewport.classList.remove("initial-event-ready");
        });
      });
    }
  });
});
