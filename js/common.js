// URLパラメタ
var chrId;
var evtLv;
var evtId;
var dataMap;

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

    if (urlParams.has('evtLv')) {
        evtLv = urlParams.get('evtLv');
    } else {
        evtLv = "A";
    }

    if (urlParams.has('evtId')) {
        evtId = urlParams.get('evtId');
    } else {
        evtId = "";
    }

    dataMap = getDataMap();

}

//---------------
// 関数遅延実行
//---------------
function sleepSetTimeout(ms, callback) {

    setTimeout(callback, ms);

}

//---------------
// データMap取得
//---------------
function getDataMap() {

    // 対象データ取得
    if (chrId == "AK") {
        return dataAkMap;
    } else if (chrId == "SA") {
        return dataSaMap;
    } else if (chrId == "FF") {
        return dataFfMap;
    } else {
        return new Map();
    }

}