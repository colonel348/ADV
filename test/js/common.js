// URLパラメタ
var chrId;
var evtId;
var selMap;
var evtData = {};

//---------------
// パラメタ設定
//---------------
function setParam() {

    var urlParams = new URLSearchParams(window.location.search);

    if (urlParams.has('chrId')) {
        chrId = urlParams.get('chrId');
    } else {
        chrId = "";
    }

    if (urlParams.has('evtId')) {
        evtId = urlParams.get('evtId');
    } else {
        evtId = "";
    }

    // Map設定
    if (chrId == "AK") {
        selMap = selAkMap;

    } else if (chrId == "SA") {
        selMap = selSaMap;

    } else if (chrId == "FF") {
        selMap = selFfMap;
    }

}

//---------------
// 選択肢設定
//---------------
function setChoice(evtId, brcId, selId, selMsg){

  if (!evtData[evtId]) {
    evtData[evtId] = { branches:{} };
  }

  if (!evtData[evtId].branches[brcId]) {
    evtData[evtId].branches[brcId] = [];
  }

  evtData[evtId].branches[brcId].push({
    selId,
    selMsg
  });
}

//---------------
// 関数遅延実行
//---------------
function sleepSetTimeout(ms, callback) {

    setTimeout(callback, ms);

}