//---------------
// パラメタ設定
//---------------
var evtId;
var evtIdx;
var cptIdx;
var tgtEvtData;

//---------------
// パラメタ設定
//---------------
function setParam() {

    var urlParams = new URLSearchParams(window.location.search);

    if (urlParams.has('evtIdx')) {
        evtIdx = Number(urlParams.get('evtIdx'));
    } else {
        evtIdx = 0;
    }

    if (urlParams.has('cptIdx')) {
        cptIdx = Number(urlParams.get('cptIdx'));
    } else {
        cptIdx = 0;
    }

    if (evtIdx >= evtData.length) {
        evtIdx = evtData.length -1;
    }

    tgtEvtData = evtData[evtIdx];

}

//---------------
// 関数遅延実行
//---------------
function sleepSetTimeout(ms, callback) {

    setTimeout(callback, ms);

}