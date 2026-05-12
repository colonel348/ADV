//---------------
// パラメタ設定
//---------------
var evtId;
var chrId;
var evtIdx;
var cptIdx;
var tgtEvtData;

//---------------
// パラメタ設定
//---------------
function setParam() {

    var urlParams = new URLSearchParams(window.location.search);

    if (urlParams.has('cptId')) {
        cptId = Number(urlParams.get('cptId'));
    } else {
        cptIdx = 1;
    }

    if (urlParams.has('chrId')) {
        chrId = String(urlParams.get('chrId'));
    } else {
        chrId = "AK";
    }

    if (urlParams.has('evtId')) {
        evtId = String(urlParams.get('evtId'));
    } else {
        evtId = "AK-P2-C1";
    }

    tgtEvtData = evtData.filter(evt => evt.evtId === evtId)[0];

}

//---------------
// 関数遅延実行
//---------------
function sleepSetTimeout(ms, callback) {

    setTimeout(callback, ms);

}