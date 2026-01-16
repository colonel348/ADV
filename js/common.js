// URLパラメタ
var chrId;
var rutId;
var evtLv;
var evtId;
var evtDataMap;
var selDataMap;

var lvMap = new Map([
    ['A', ['1', '#0b3d91', 30, 'B']], 
    ['B', ['2', '#6a1b9a', 50, 'C']], 
    ['C', ['3', '#ab47bc', 70, 'D']], 
    ['D', ['4', '#d81b60', 90, 'A']]]);

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
        evtId = "C00";
    }

    rutId = evtId.substring(0,1);
    evtLv = evtId.substring(1,3);

    // Map設定
    if (chrId == "AK") {
        evtDataMap = evtDataAkMap;
        defDataMap = defDataAkMap;

    } else if (chrId == "SA") {
        evtDataMap = evtDataSaMap;
        defDataMap = defDataSaMap;

    } else if (chrId == "FF") {
        evtDataMap = evtDataFfMap;
        defDataMap = defDataFfMap;
    }

}

//---------------
// 関数遅延実行
//---------------
function sleepSetTimeout(ms, callback) {

    setTimeout(callback, ms);

}