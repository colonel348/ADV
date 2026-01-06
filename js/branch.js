var enbFlg = false;

//---------------
// 初期処理
//---------------
window.addEventListener('load', function() {

    // URLパラメタ設定
    setParam();

    // ボタン描画
    repBtn();

    // LV描画
    repLv();

    // 動画描画
    setVideo(evtLv + '0');

    // フェードイン
    fadeIn();

    // タッチイベント
    touchEvent();

});

//---------------
// ボタン描画
//---------------
function repBtn() {

    // ボタンHTML生成
    var btnHtml = '';
    dataMap.forEach((value, key) => {

        if (evtLv == key.substring(0,1)) {
            btnHtml += '<div id="' + key + '" class="btn btn-def btn-' + evtLv + '" style="border-color: ' + lvMap.get(evtLv)[1] + '; background-color: ' + lvMap.get(evtLv)[1] + '">' + value[0] + '</div>';
        }

    });

    document.querySelector('#btn-area').innerHTML = btnHtml;

}

//---------------
// LV描画
//---------------
function repLv() {

    var lvHtml = "";

    lvHtml = lvHtml + '<div class="lv-wrapper" id="lv-wrapper">';
    lvHtml = lvHtml + '    <svg class="lv-svg" id="lv-svg" viewBox="0 0 24 24">';
    lvHtml = lvHtml + '      <defs><clipPath id="lvClip">';
    lvHtml = lvHtml + '          <path d="M12 21s-6-4.35-9-8.28C.7 9.9 1.2 5.5 4.6 3.6c2.2-1.2 5.1-.7 6.9 1.1C13.3 2.9 16.2 2.4 18.4 3.6c3.4 1.9 3.9 6.3 1.6 9.12C18 16.6 12 21 12 21z"/>';
    lvHtml = lvHtml + '      </clipPath></defs>';
    lvHtml = lvHtml + '      <rect class="lv-fill-back" x="0" y="0" width="24" height="24" fill="#222222" clip-path="url(#lvClip)"/>';
    lvHtml = lvHtml + '      <rect class="lv-fill" x="0" y="18" width="24" height="24" fill="#0b3d91" clip-path="url(#lvClip)"/>';
    lvHtml = lvHtml + '      <path d="M12 21s-6-4.35-9-8.28C.7 9.9 1.2 5.5 4.6 3.6c2.2-1.2 5.1-.7 6.9 1.1C13.3 2.9 16.2 2.4 18.4 3.6c3.4 1.9 3.9 6.3 1.6 9.12C18 16.6 12 21 12 21z" fill="none" stroke="#888" stroke-width="1"/>';
    lvHtml = lvHtml + '    </svg>';
    lvHtml = lvHtml + '    <div class="lv-label">Lv1</div>';
    lvHtml = lvHtml + '</div>';

   document.querySelector('#lv-area').innerHTML = lvHtml;

   // 表示内容更新
   chgLv();

}

//---------------
// LV更新
//---------------
function chgLv() {

    var lvArea = document.getElementById("lv-area");
    var lvWrap = document.getElementById("lv-wrapper");
    var lvFill = lvWrap.querySelector(".lv-fill");
    var lvLabel = lvWrap.querySelector(".lv-label");

    var evtLvNum = lvMap.get(evtLv);

    // 背景色
    lvFill.setAttribute("fill", lvMap.get(evtLv)[1]);

    // 塗り範囲 (下から上)
    const percent = lvMap.get(evtLv)[2];
    const y = 24 - (24 * percent / 100);
    lvFill.setAttribute("y", y);

    // テキスト更新
    lvLabel.textContent = `Lv${lvMap.get(evtLv)[0]}`;

    // クラス更新
    lvWrap.className = `lv lv-wrapper lv${lvMap.get(evtLv)[0]}`;

}

//---------------
// 動画設定
//---------------
function setVideo(tgtEvtId) {

    const videoEle = document.getElementById("video-area");

    videoEle.src = '../video/' + chrId + '/' + tgtEvtId + '/sel.mp4';
    videoEle.load();
    videoEle.play(); 

    document.getElementById('video-area').style.opacity = 1;

}

//---------------
// フェードイン
//---------------
function fadeIn() {

    // 描画対象がなければタイトルへ
    sleepSetTimeout(400, () => document.getElementById('box').style.opacity = 1);
    sleepSetTimeout(800, () => enbFlg = true);

}

//---------------
// タッチイベント
//---------------
function touchEvent() {

    document.addEventListener('touchstart', function(e) {

        // 表示後一定時間経過で操作可能
        if (enbFlg) {

            if(e.target.closest('.btn')) {

                var tgtEvtId = e.target.id;

                if (evtId == tgtEvtId) {

                    // ボタン押下
                    document.getElementById(evtId).classList.add("btn-animating");

                    // 画面遷移
                    sleepSetTimeout(350, () => document.getElementById('box').style.opacity = 0);
                    sleepSetTimeout(700, () => window.location.href = './event.html?chrId=' + chrId + '&evtId=' + evtId + '&evtLv=' + evtLv);

                } else {

                    // ボタンレイアウト変更
                    if (evtId != "") {
                        document.getElementById(evtId).classList.replace("btn-sel", "btn-def");
                        document.getElementById(evtId).style = "border-color: " + lvMap.get(evtLv)[1] + "; background-color: " + lvMap.get(evtLv)[1];
                    }
                    document.getElementById(tgtEvtId).classList.replace("btn-def", "btn-sel");
                    document.getElementById(tgtEvtId).style = "border-color: " + lvMap.get(evtLv)[1] + "; color: " + lvMap.get(evtLv)[1];

                    // イベントID変更
                    evtId = tgtEvtId;

                    // 動画変更
                    document.getElementById('video-area').style.opacity = 0;
                    sleepSetTimeout(400, () => setVideo(evtId));

                }

            } else if (e.target.closest('.lv-wrapper')) {

                // LV押下処理
                clickLvProc(e);

            }

        }

    });

}

//---------------
// LV押下処理
//---------------
async function clickLvProc(event) {

    // 押下アニメーション
    var lvSvg = document.getElementById("lv-svg");
    lvSvg.classList.add("lv-animating");
    sleepSetTimeout(250, () => lvSvg.classList.remove("lv-animating"));

    // 長押しなら遷移
    if (await isHoldDown(event.target)) {

        document.getElementById('box').style.opacity = 0;
        sleepSetTimeout(300, () => window.location.href = '../title.html');

    } else {

        // フェードアウト
        document.getElementById('btn-area').style.opacity = 0;
        enbFlg = false;

        // 次イベント設定
        evtLv = lvMap.get(evtLv)[3];
        chgLv();

        // ボタン再描画
        evtId = '';
        sleepSetTimeout(300, () => repBtn());

        // フェードイン
        sleepSetTimeout(450, () => document.getElementById('btn-area').style.opacity = 1);
        sleepSetTimeout(600, () => enbFlg = true);

    }

}

//---------------
// ロングタップ判定
//---------------
function isHoldDown(targetElement, thresholdMsec = 400) {
    return new Promise((resolve) => {

    const timerId = setTimeout(() => {
      resolve(true);
      removeListener();
    }, thresholdMsec);

    const touchendHandler = () => {
      resolve(false);
      removeListener();
    };

    const contextHandler = (event) => {
      event.preventDefault();
    }

    const beforeTargetStyle = targetElement.style.userSelect;

    const removeListener = () => {
      clearTimeout(timerId);
      targetElement.removeEventListener('touchend', touchendHandler);
      targetElement.removeEventListener('contextmenu', contextHandler);
      targetElement.style.userSelect = beforeTargetStyle;
    };

    targetElement.addEventListener('touchend', touchendHandler);
    targetElement.removeEventListener('contextmenu', contextHandler);
    targetElement.style.userSelect = 'none';
  });
}
