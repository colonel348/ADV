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

    // イベントLVIDを取得
    var evtLvId = lvMap.get(evtLv)[0];
    // 未選択存在フラグ
    var notSelFlg = false;

    for (const key of evtDataMap.keys()) {

        // ボタンクラス
        var classNm = "";
        // 比較対象
        var candEvtLvId = key.substring(0,1);

        // ルートが同じでLVが近いイベントを取得
        if (evtLvId == candEvtLvId) {

            if (evtIdHist.indexOf(key) > -1) {
                classNm = "btn-old";
            } else {
                notSelFlg = true;
            }

            btnHtml += '<div id="' + key + '" class="btn btn-' + evtLvId + ' ' + classNm + '"><span class="btn-title">' + evtDataMap.get(key)[0] + '</span></div>';
        }

    }

    // 全て選択していればLVアップ
    if (!notSelFlg && evtLv < 4) {
        evtLv += 1;
        repBtn();
    } else {
        document.querySelector('#btn-area').innerHTML = btnHtml;
    }


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
    lvHtml = lvHtml + '      <rect class="lv-fill" x="0" y="18" width="24" height="24" fill="#d81b60" clip-path="url(#lvClip)"/>';
    lvHtml = lvHtml + '      <path d="M12 21s-6-4.35-9-8.28C.7 9.9 1.2 5.5 4.6 3.6c2.2-1.2 5.1-.7 6.9 1.1C13.3 2.9 16.2 2.4 18.4 3.6c3.4 1.9 3.9 6.3 1.6 9.12C18 16.6 12 21 12 21z" fill="none" stroke="#888" stroke-width="1"/>';
    lvHtml = lvHtml + '    </svg>';
    lvHtml = lvHtml + '    <div class="lv-label"></div>';
    lvHtml = lvHtml + '</div>';

   document.querySelector('#lv-area').innerHTML = lvHtml;

   // 表示内容更新
   chgLv();

}

//---------------
// LV更新
//---------------
function chgLv() {

    var lvWrap = document.getElementById("lv-wrapper");
    var lvLabel = lvWrap.querySelector(".lv-label");
    var lvFill = lvWrap.querySelector(".lv-fill");

    // 塗り範囲 (下から上)
    const y = 18 - (18 * (evtLv) / 4) + 3;
    lvFill.setAttribute("y", y);

    // テキスト更新
    lvLabel.textContent = `Lv.${String(evtLv)}`;

}

//---------------
// 動画設定（初期）
//---------------
function setDefVideo() {

    // ボタンHTML生成
    var defId = 'Z0';

    // イベントからの戻りなら編集
    if (evtIdHist != "") {
        defId = 'Z' + evtLv;
    }

    // 動画再生
    setVideo('Z' + '/' + defId + '/def');

}

//---------------
// 動画設定（イベント）
//---------------
function setEvtVideo() {

    // 比較対象
    var tgtEvtLvId = tgtEvtId.substring(0,1);

    // 動画再生
    setVideo(tgtEvtLvId + '/' + tgtEvtId + '/sel');

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
                sleepSetTimeout(900, () => document.getElementById('btn-area').style.display = "none");

                // レベル非表示
                sleepSetTimeout(350, () => document.getElementById('lv-area').style.opacity = 0);
                sleepSetTimeout(750, () => document.getElementById('lv-area').style.display = "none");

                // 動画変更
                document.getElementById('video-area').style.opacity = 0;
                sleepSetTimeout(500, () => setEvtVideo());

                // 決定エリア表示
                sleepSetTimeout(800, () => document.getElementById('dec-area').style.opacity = 1);

            } else if (e.target.closest('.dec-tap-area')) {

                if (tgtEvtId != "") {

                    // イベント決定
                    document.getElementById('dec-area').style.opacity = 0;
                    sleepSetTimeout(350, () => document.getElementById('box').style.opacity = 0);
                    sleepSetTimeout(700, () => window.location.href = './event.html?chrId=' + chrId + '&evtId=' + tgtEvtId + '&evtLv=' + evtLv + '&evtIdHist=' + evtIdHist);

                }

            } else if (e.target.closest('.dec-cancel-str')) {

                if (tgtEvtId != "") {

                    // 選択前に戻る
                    tgtEvtId = "";
                    document.getElementById('dec-area').style.opacity = 0;

                    // レベル非表示
                    sleepSetTimeout(600, () => document.getElementById('lv-area').style.display = "flex");
                    sleepSetTimeout(750, () => document.getElementById('lv-area').style.opacity = 1);

                    // 動画変更
                    document.getElementById('video-area').style.opacity = 0;
                    sleepSetTimeout(500, () => setDefVideo());

                    sleepSetTimeout(600, () => document.getElementById('btn-area').style.display = "flex");
                    sleepSetTimeout(750, () => document.getElementById('btn-area').style.opacity = 1);

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

    // LVアップ
    evtLv = evtLv + 1;

    // フェードアウト
    sleepSetTimeout(350, () => document.getElementById('btn-area').style.opacity = 0);

    // 長押しなら遷移
    if (await isHoldDown(event.target)) {

        document.getElementById('box').style.opacity = 0;
        sleepSetTimeout(300, () => window.location.href = '../title.html');

    } else {

        enbFlg = false;

        if (4 < evtLv) {

            // タイトルに戻る
            sleepSetTimeout(200, () => document.getElementById('box').style.opacity = 0);
            sleepSetTimeout(500, () => window.location.href = '../title.html');

        } else {

            // LV変更
            chgLv();

            // イベント決定エリア非表示
            document.getElementById('dec-area').style.opacity = 0;

            // ボタン再描画
            sleepSetTimeout(650, () => repBtn());

            // フェードイン
            sleepSetTimeout(700, () => document.getElementById('btn-area').style.opacity = 1);
            sleepSetTimeout(800, () => enbFlg = true);

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
