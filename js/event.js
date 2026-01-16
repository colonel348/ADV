//---------------
// 初期処理
//---------------
window.addEventListener('load', function() {

    // URLパラメタ設定
    setParam();

    // タイトル表示
    dispTitle();

    // 動画描画
    setVideo();

    // フェードイン
    fadeIn();

});

//---------------
// タイトル表示
//---------------
function dispTitle() {

    // タイトル描画
    document.querySelector('#title-txt').innerHTML = evtDataAkMap.get(evtId)[1];

    sleepSetTimeout(400, () => document.getElementById('title').classList.add('is-animated'));
    sleepSetTimeout(1000, () => document.getElementById('title-txt').style.opacity = 1);
    sleepSetTimeout(2500, () => document.getElementById('title-txt').style.opacity = 0);

}

//---------------
// 動画設定
//---------------
function setVideo() {

    const videoEle = document.getElementById("video-area");

    videoEle.src = '../video/' + chrId + '/' + rutId + '/' + evtLv + '/evt.mp4';
    videoEle.load();
    sleepSetTimeout(1000, () => videoEle.play());

    videoEle.addEventListener('ended', () => {

        document.getElementById('box').style.opacity = 0;

        if (evtLv != '10') {

            // 次のイベント
            sleepSetTimeout(1000, () => window.location.href = './branch.html?chrId=' + chrId + '&evtId=' + evtId);

        } else {

            // 最後のイベントなのでタイトル
            sleepSetTimeout(1000, () => window.location.href = '../title.html');

        }
    
    });

}

//---------------
// フェードイン
//---------------
function fadeIn() {

    sleepSetTimeout(1200, () => document.getElementById('box').style.opacity = 1);

}