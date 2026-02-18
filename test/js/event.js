//=========================
// 変数
//=========================
let selVideoEle;
let brcVideoEle;
let choicesEle;

const END_URL = "end.html";

//=========================
// 初期処理
//=========================
function preloadAll() {
    const list = [];
    const branches = evtData[evtId].branches;

    for (const [brcId, choices] of Object.entries(branches)) {

        list.push('brc' + brcId);

        for (const choice of choices) {
            list.push('sel' + choice.selId);
        }
    }


    return Promise.all(list.map(src => {
        return new Promise(res => {
            const v = document.createElement("video");
            v.src = '../video/' + chrId + '/' + evtId + '/' + src + '.mp4';
            v.preload = "auto";
            v.muted = true;
            v.playsInline = true;
            v.oncanplaythrough = res;
        });
    }));
}

/* ===== 動画 ===== */

function play(el, src, loop = false) {
    el.src = '../video/' + chrId + '/' + evtId + '/' + src + '.mp4';;
    el.loop = loop;
    el.load();
    el.play().catch(() => {});
}

function fadeTo(src, loop = false, onEnd = null) {
    play(brcVideoEle, src, loop);
    brcVideoEle.classList.add("active");
    selVideoEle.classList.remove("active");
    brcVideoEle.onended = onEnd;
    [selVideoEle, brcVideoEle] = [brcVideoEle, selVideoEle];
}

/* ===== 選択肢 ===== */

function showChoices(brcId) {
    choicesEle.innerHTML = "";

    const list = getChoices(brcId);

    list.forEach(row => {
        const b = document.createElement("button");
        b.className = "choiceBtn";
        b.textContent = row.selMsg;
        b.onclick = () => playFlow("sel" + row.selId);
        choicesEle.appendChild(b);
    });

    requestAnimationFrame(() => choicesEle.classList.add("show"));
}

function getChoices(route) {
    return evtData[evtId]?.branches?.[route] || [];
}

function hideChoices() {
    choicesEle.classList.remove("show");
    setTimeout(() => choicesEle.innerHTML = "", 400);
}

/* ===== フロー ===== */

function playFlow(route) {
    hideChoices();
    const f = evtData[route];

    fadeTo(route, false, () => {
        var brcId = route.substring(3, 4);
        if (brcId == 'E') {
            fadeTo(location.href = END_URL);
        } else {
            fadeTo('brc' + brcId, true);
            showChoices(brcId);
        }
    });
}

//=========================
// 初期処理
//=========================
window.addEventListener('load', function() {

    // オブジェクト取得
    selVideoEle = document.getElementById("selVideo");
    brcVideoEle = document.getElementById("brcVideo");
    choicesEle = document.getElementById("choices");

    // パラメタ取得
    setParam();

    // 動画読込
    preloadAll();
    selVideoEle.classList.add("active");
    playFlow("sel" + "A1");

});