var enbFlg = false;
var tgtEvtId = "";

var videoDefEle;
var videoSelEle;
var videoEvtEle;

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

    // 全ての動画の設定
    videoDefEle = document.getElementById("video-area-def");
    videoSelEle = document.getElementById("video-area-sel");
    videoEvtEle = document.getElementById("video-area-evt");

    // ボタンHTML生成
    var defId = 'Z0';

    videoDefEle.src = '../video/' + chrId + '/Z/Z1/def.mp4';
    videoDefEle.load();
    videoDefEle.play();

    videoDefEle.style.display = "flex";
    videoDefEle.style.opacity = 1;

}

//---------------
// 動画設定（選択）
//---------------
function setSelVideo() {

    // 比較対象
    var tgtEvtLvId = tgtEvtId.substring(0,1);

    // 動画再生
    setVideo(tgtEvtLvId + '/' + tgtEvtId + '/sel');

}

//---------------
// 動画設定
//---------------
function setVideo(srcPath) {

    videoDefEle.currentTime = 0;

}


//---------------
// 動画停止
//---------------
function stopVideo(srcPath) {

    // 動画停止
    videoDefEle.stop();
    videoSelEle.stop();
    videoEvtEle.stop();

    // 動画リセット
    videoDefEle.currentTime = 0;
    videoSelEle.currentTime = 0;
    videoEvtEle.currentTime = 0;

}

//---------------
// フェードイン
//---------------
function fadeIn() {

    sleepSetTimeout(400, () => document.getElementById('box').style.opacity = 1);
    sleepSetTimeout(800, () => document.getElementById('btn-area').classList.add('area-show'));
    sleepSetTimeout(800, () => document.getElementById('lv-area').classList.add('area-show'));
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
                var tgtEvtLvId = tgtEvtId.substring(0,1);

                // 操作不可
                enbFlg = false;

                // ボタン押下
                e.target.classList.add("btn-animating");
                sleepSetTimeout(600, () => e.target.classList.remove("btn-animating"));
                sleepSetTimeout(400, () => document.getElementById('btn-area').classList.remove('area-show'));
                sleepSetTimeout(1400, () => document.getElementById('btn-area').style.display = "none");

                // レベル非表示
                sleepSetTimeout(400, () => document.getElementById('lv-area').classList.remove('area-show'));
                sleepSetTimeout(1400, () => document.getElementById('lv-area').style.display = "none");

                // 初期動画非表示
                sleepSetTimeout(400, () => videoDefEle.style.opacity = 0);
                sleepSetTimeout(1400, () => videoDefEle.style.display = "none");
                sleepSetTimeout(1400, () => videoDefEle.pause());
                sleepSetTimeout(1400, () => videoDefEle.currentTime = 0);

                // タイトル表示
                sleepSetTimeout(1000, () => dispTitle());

                // 選択動画表示
                videoSelEle.src = '../video/' + chrId + '/' + tgtEvtLvId + '/' + tgtEvtId + '/sel' + '.mp4';
                videoSelEle.load();
                sleepSetTimeout(2000, () => videoSelEle.style.display = "flex");
                sleepSetTimeout(2000, () => videoSelEle.style.opacity = 1);
                sleepSetTimeout(2500, () => videoSelEle.play());

                // イベント動画読込
                videoEvtEle.src = '../video/' + chrId + '/' + tgtEvtLvId + '/' + tgtEvtId + '/evt' + '.mp4';
                sleepSetTimeout(2000, videoEvtEle.load());

                // 動画終了時にボタン表示
                videoSelEle.addEventListener('ended', () => {

                    // 選択動画非表示
                    videoSelEle.style.opacity = 0;
                    videoSelEle.style.display = "none";
                    videoSelEle.pause();
                    videoSelEle.currentTime = 0;

                    // 決定エリア表示
                    sleepSetTimeout(100, () => document.getElementById('dec-area').style.display = "flex");
                    sleepSetTimeout(200, () => document.getElementById('dec-area').classList.add('area-show'));
                    sleepSetTimeout(500, () => enbFlg = true);

                });

            } else if (e.target.closest('.btn-act')) {

                // ボタン押下
                e.target.classList.add("btn-animating");
                sleepSetTimeout(600, () => e.target.classList.remove("btn-animating"));

                // 確認エリア非表示
                sleepSetTimeout(500, () => document.getElementById('dec-area').classList.remove('area-show'));
                sleepSetTimeout(2000, () => document.getElementById('dec-area').style.display = "none");

                // イベント動画表示
                sleepSetTimeout(600, () => videoEvtEle.style.display = "flex");
                sleepSetTimeout(600, () => videoEvtEle.style.opacity = 1);
                sleepSetTimeout(2000, () => videoEvtEle.play());

                // 動画終了時に再表示
                videoEvtEle.addEventListener('ended', () => {

                    sleepSetTimeout(1000, () => window.location.href = './event.html?chrId=' + chrId + '&evtLv=' + evtLv + '&evtId=' + tgtEvtId + '&evtIdHist=' + evtIdHist + tgtEvtId + ',');

                });

            } else if (e.target.closest('.btn-can')) {

                tgtEvtId = "";

                // 操作不可
                enbFlg = false;
                sleepSetTimeout(800, () => enbFlg = true);

                // ボタン押下
                e.target.classList.add("btn-animating");
                sleepSetTimeout(600, () => e.target.classList.remove("btn-animating"));

                // 確認エリア非表示
                sleepSetTimeout(500, () => document.getElementById('dec-area').classList.remove('area-show'));
                sleepSetTimeout(2000, () => document.getElementById('dec-area').style.display = "none");

                // 選択動画非表示
                sleepSetTimeout(300, () => videoSelEle.pause());
                sleepSetTimeout(300, () => videoSelEle.currentTime = 0);

                // 初期動画表示
                sleepSetTimeout(200, () => videoDefEle.style.display = "flex");
                sleepSetTimeout(200, () => videoDefEle.play());
                sleepSetTimeout(1000, () => videoDefEle.style.opacity = 1);

                // ボタンエリア表示
                sleepSetTimeout(900, () => document.getElementById('btn-area').style.display = "flex");
                sleepSetTimeout(1400, () => document.getElementById('btn-area').classList.add('area-show'));

                // レベル表示
                sleepSetTimeout(900, () => document.getElementById('lv-area').style.display = "flex");
                sleepSetTimeout(1400, () => document.getElementById('lv-area').classList.add('area-show'));


            } else if (e.target.closest('.lv-wrapper')) {

                // LV押下処理
                clickLvProc(e);

            }

        }

    });

}

//---------------
// タイトル表示
//---------------
function dispTitle() {

    // タイトル描画
    document.querySelector('#title-txt').innerHTML = evtDataMap.get(tgtEvtId)[1];

    sleepSetTimeout(400, () => document.getElementById('title').classList.add('is-animated'));
    sleepSetTimeout(1000, () => document.getElementById('title-txt').style.opacity = 1);
    sleepSetTimeout(2500, () => document.getElementById('title-txt').style.opacity = 0);
    sleepSetTimeout(3000, () => document.getElementById('title').classList.remove('is-animated'));

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
    sleepSetTimeout(350, () => document.getElementById('btn-area').classList.remove('area-show'));

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
            sleepSetTimeout(700, () => document.getElementById('btn-area').classList.add('area-show'));
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
