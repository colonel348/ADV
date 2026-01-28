// URLパラメタ
var chrId;
var evtLv;
var evtId;
var evtIdHist;
var evtDataMap;

var lvMap = new Map([
    [1, ['A', '#0b3d91', 30]], 
    [2, ['B', '#6a1b9a', 50]], 
    [3, ['C', '#ab47bc', 70]], 
    [4, ['D', '#d81b60', 90]]]);

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

    if (urlParams.has('evtLv')) {
        evtLv = Number(urlParams.get('evtLv'));
    } else {
        evtLv = 1;
    }

    if (urlParams.has('evtId')) {
        evtId = urlParams.get('evtId');
    } else {
        evtId = "";
    }

    if (urlParams.has('evtIdHist')) {
        evtIdHist = urlParams.get('evtIdHist');
    } else {
        evtIdHist = "";
    }

    // Map設定
    if (chrId == "AK") {
        evtDataMap = evtDataAkMap;

    } else if (chrId == "SA") {
        evtDataMap = evtDataSaMap;

    } else if (chrId == "FF") {
        evtDataMap = evtDataFfMap;
    }

}

//---------------
// 関数遅延実行
//---------------
function sleepSetTimeout(ms, callback) {

    setTimeout(callback, ms);

}