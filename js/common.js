// URLパラメタ
var chrId;
var evtId;
var selIdx;
var evtMap;
var evtData;

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

    if (urlParams.has('selIdx')) {
        selIdx = Number(urlParams.get('selIdx'));
    } else {
        selIdx = 0;
    }

    // Map設定
    if (chrId == "AK") {
        evtMap = evtAkMap;
    } else if (chrId == "SA") {
        evtMap = evtSaMap;
    } else if (chrId == "FF") {
        evtMap = evtFfMap;
    }

    if (selIdx >= evtMap.length) {
        selIdx = evtMap.length -1;
    }

    evtData = evtMap[selIdx];

}

//---------------
// 関数遅延実行
//---------------
function sleepSetTimeout(ms, callback) {

    setTimeout(callback, ms);

}