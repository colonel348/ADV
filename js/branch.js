var enbFlg = false;
var tgtEvtId = "";

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
    setDefVideo();

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

    var nextRutIdAry = getNextRutId(); 
    for (var i = 0;i < nextRutIdAry.length; i++) {

        // 検索対象
        var nextRutId = nextRutIdAry[i];

        for (const key of evtDataMap.keys()) {

            // 比較対象
            var dataRutId = key.substring(0,1);
            var dataEvtLv = key.substring(1,3);

            // ルートが同じでLVが近いイベントを取得
            if (nextRutId == dataRutId && evtLv < dataEvtLv) {
                btnHtml += '<div id="' + key + '" class="btn btn-def btn-' + nextRutId + '">' + evtDataMap.get(key)[0] + '</div>';
                break;
            }

        }

    }

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
    lvHtml = lvHtml + '      <rect class="lv-fill-rev" x="0" y="0" width="24" height="24" fill="#FFBAE8" clip-path="url(#lvClip)"/>';
    lvHtml = lvHtml + '      <rect class="lv-fill" x="0" y="18" width="24" height="24" fill="#d81b60" clip-path="url(#lvClip)"/>';
    lvHtml = lvHtml + '      <path d="M12 21s-6-4.35-9-8.28C.7 9.9 1.2 5.5 4.6 3.6c2.2-1.2 5.1-.7 6.9 1.1C13.3 2.9 16.2 2.4 18.4 3.6c3.4 1.9 3.9 6.3 1.6 9.12C18 16.6 12 21 12 21z" fill="none" stroke="#888" stroke-width="1"/>';
    lvHtml = lvHtml + '    </svg>';
    lvHtml = lvHtml + '    <div class="lv-label"></div>';
    lvHtml = lvHtml + '</div>';

   document.querySelector('#lv-area').innerHTML = lvHtml;

   // 表示内容更新
   chgLv(evtLv, false);
   chgLv(evtLv, true);

}

//---------------
// LV更新
//---------------
function chgLv(tgtEvtLv, revFlg) {

    var lvWrap = document.getElementById("lv-wrapper");
    var lvLabel = lvWrap.querySelector(".lv-label");
    var lvFill;

    if (revFlg) {
        lvFill = lvWrap.querySelector(".lv-fill-rev");
    } else{
        lvFill = lvWrap.querySelector(".lv-fill");
    }

    // 塗り範囲 (下から上)
    const y = 18 - (18 * (Number(tgtEvtLv) / 10)) + 3;
    lvFill.setAttribute("y", y);

    // テキスト更新
    if (!revFlg) {
        lvLabel.textContent = `${String(Number(tgtEvtLv)*10)}%`;
    }

}

//---------------
// 動画設定（初期）
//---------------
function setDefVideo() {

    // ボタンHTML生成
    var defId = '01';

    for (const key of defDataMap.keys()) {

        // 比較対象
        var dataRutId = key.substring(0,1);
        var dataEvtLv = key.substring(1,3);

        // 同ルートの範囲内から決定
        if (rutId == dataRutId && evtLv <= dataEvtLv) {
            defId = defDataMap.get(key);
            break;
        }

    }

    // 動画再生
    setVideo('Z' + '/' + defId + '/def', 0);

}

//---------------
// 動画設定（イベント）
//---------------
function setEvtVideo(tgtEvtId) {

    // 比較対象
    var tgtRutId = tgtEvtId.substring(0,1);
    var tgtEvtLv = tgtEvtId.substring(1,3);

    // 動画再生
    setVideo(tgtRutId + '/' + tgtEvtLv + '/sel');

}

//---------------
// 動画設定
//---------------
function setVideo(srcPath) {

    const videoEle = document.getElementById("video-area");

    videoEle.src = '../video/' + chrId + '/' + srcPath + '.mp4';
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

                tgtEvtId = e.target.id;

                // 操作不可
                enbFlg = false;
                sleepSetTimeout(600, () => enbFlg = true);

                // ボタン押下
                document.getElementById(tgtEvtId).classList.add("btn-animating");
                sleepSetTimeout(350, () => document.getElementById('btn-area').style.opacity = 0);
                sleepSetTimeout(700, () => document.getElementById('btn-area').style.display = 'none');

                // 表示内容更新
                sleepSetTimeout(100, () => chgLv(tgtEvtId.substring(1,3), true));

                // 動画変更
                document.getElementById('video-area').style.opacity = 0;
                sleepSetTimeout(400, () => setEvtVideo(tgtEvtId));

                // 決定エリア表示
                sleepSetTimeout(800, () => document.getElementById('dec-area').style.opacity = 1);

            } else if (e.target.closest('.dec-area')) {

                if (tgtEvtId != "") {

                    // イベント決定
                    document.getElementById('dec-area').style.opacity = 0;
                    sleepSetTimeout(350, () => document.getElementById('box').style.opacity = 0);
                    sleepSetTimeout(700, () => window.location.href = './event.html?chrId=' + chrId + '&evtId=' + tgtEvtId);

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
    var lvEle = document.getElementById("lv-wrapper");
    lvEle.classList.add("lv-animating");
    sleepSetTimeout(250, () => lvEle.classList.remove("lv-animating"));

    // 次イベント設定
    var numEvtLv;
    if (tgtEvtId != "") {
        // イベント押下後のLV押下
        numEvtLv = Number(tgtEvtId.substring(1,3));
    } else {
        // イベント押下前のLV押下
        numEvtLv = Number(evtLv) + 2;
    }

    rutId = tgtEvtId.substring(0,1);
    evtLv = String(numEvtLv).padStart(2, '0');

    // 長押しなら遷移
    if (await isHoldDown(event.target)) {

        document.getElementById('box').style.opacity = 0;
        sleepSetTimeout(300, () => window.location.href = '../title.html');

    } else {

        // フェードアウト
        document.getElementById('btn-area').style.opacity = 0;
        enbFlg = false;

        // LV変更
        chgLv(evtLv, false);

        if (10 <= Number(evtLv)) {

            // タイトルに戻る
            sleepSetTimeout(200, () => document.getElementById('box').style.opacity = 0);
            sleepSetTimeout(500, () => window.location.href = '../title.html');

        } else {

            // イベント決定エリア非表示
            document.getElementById('dec-area').style.opacity = 0;

            // ボタン再描画
            tgtEvtId = '';
            sleepSetTimeout(300, () => repBtn());

            // 動画描画
            document.getElementById('video-area').style.opacity = 0;
            sleepSetTimeout(400, () => setDefVideo());

            // フェードイン
            sleepSetTimeout(450, () => document.getElementById('btn-area').style.display = 'block');
            sleepSetTimeout(550, () => document.getElementById('btn-area').style.opacity = 1);
            sleepSetTimeout(600, () => enbFlg = true);

        }

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

//---------------
// 次のID取得
//---------------
function getNextRutId() {

    if (rutId == "A") {
        return ["A", "B"];

    } else if (rutId == "B") {
        return ["A", "B", "C"];

    } else if (rutId == "C") {
        return ["B", "C", "D"];

    } else if (rutId == "D") {
        return ["C", "D", "E"];

    } else if (rutId == "E") {
        return ["D", "E"];
    }

}