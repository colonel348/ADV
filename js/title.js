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

            document.getElementById('pic-block').classList.replace("pic-def", "pic-clk");
            clickChr2Proc(e);

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

    // 長押しなら遷移
    if (await isHoldDown(event.target)) {
        document.getElementById('box').style.opacity = 0;
        sleepSetTimeout(300, () => window.location.href = './tmp/branch.html?chrId=' + chrId);
    } else {
        document.getElementById('pic-block').classList.replace("pic-clk", "pic-def");
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