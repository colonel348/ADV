//---------------
// 初期処理
//---------------
window.addEventListener('load', function() {

    // URLパラメタ設定
    setParam();

    // フェードイン
    fadeIn();

    // タッチイベント
    touchEvent();

});

//---------------
// フェードイン
//---------------
function fadeIn() {

    sleepSetTimeout(500, () => document.getElementById('box').style.opacity = 1);

}

//---------------
// タッチイベント
//---------------
function touchEvent() {

    var btnList = document.getElementsByClassName("chr");

    for(var i = 0; i < btnList.length; i++) {
   
        btnList[i].addEventListener('touchstart', function(e) {

            e.target.classList.add("animating");
            clickChr1Proc(e);
            sleepSetTimeout(400, () => e.target.classList.remove("animating"));

        })

    }

    var picList = document.getElementsByClassName("disp-area");

    for(var i = 0; i < picList.length; i++) {
   
        picList[i].addEventListener('touchstart', function(e) {

            document.getElementById("pic-area").classList.add("animating");
            clickChr2Proc(e);
            sleepSetTimeout(400, () => document.getElementById("pic-area").classList.remove("animating"));

        })

    }

}

//---------------
// キャラ選択処理
//---------------
async function clickChr1Proc(event) {
    
    var picArea = document.getElementById('pic-area');

    if (chrId == "") {

        chrId = event.target.id;
        picArea.style.opacity = 1;
        document.getElementById('box').classList.add("chr-back-" + chrId);
        sleepSetTimeout(200, () => repPic());

    } else {

        picArea.style.opacity = 0;
        document.getElementById('box').classList.remove("chr-back-" + chrId);

        chrId = event.target.id;
        document.getElementById('box').classList.add("chr-back-" + chrId);
        sleepSetTimeout(400, () => picArea.style.opacity = 1);
        sleepSetTimeout(400, () => repPic());

    }

}


//---------------
// 画像描画
//---------------
function repPic() {

    // 画像HTML生成
    var picPath = './pic/' + chrId + '/title.png';
    var picHtml = '<div class="pic-block pic-def" id="pic-block"><img id="pic' + chrId + '" class="pic" src="./' + picPath + '"/></div>';

    document.querySelector('#pic-area').innerHTML = picHtml;

}

//---------------
// キャラ確定処理
//---------------
async function clickChr2Proc(event) {

    if (chrId != "") {

        sleepSetTimeout(300, () => document.getElementById('box').style.opacity = 0);
        sleepSetTimeout(600, () => window.location.href = './tmp/select.html?chrId=' + chrId);

    }

}