//---------------
// パラメタ設定
//---------------
var evtId;
var chrId;
var evtIdx;
var cptIdx;
var autoFlg;
var modeKbn;
var tgtEvtData;
var debugMovId;

//---------------
// パラメタ設定
//---------------
function setParam() {

    var urlParams = new URLSearchParams(window.location.search);

    if (urlParams.has('cptId')) {
        cptId = String(urlParams.get('cptId'));
    } else {
        cptId = '1';
    }

    if (urlParams.has('chrId')) {
        chrId = String(urlParams.get('chrId'));
    } else {
        chrId = "AK";
    }

    if (urlParams.has('evtId')) {
        evtId = String(urlParams.get('evtId'));
    } else {
        evtId = "AK-NR-B1";
    }

    if (urlParams.has('autoFlg')) {
        autoFlg = String(urlParams.get('autoFlg'));
    } else {
        autoFlg = '0';
    }

    if (urlParams.has('debugMovId')) {
        debugMovId = String(urlParams.get('debugMovId'));
    } else {
        debugMovId = null;
    }

    modeKbn = evtId.substring(3, 4);

    tgtEvtData = evtData.filter(evt => evt.evtId === evtId)[0];

    cptIdx = tgtEvtData.cpt.findIndex(v => v.cptId === cptId);

}

//---------------
// 関数遅延実行
//---------------
function sleepSetTimeout(ms, callback) {

    setTimeout(callback, ms);

}

/*************************************************
 * イベントパス
 *************************************************/
function getEvtDir(evt) {
  const chrMap = {
    FF: "01.ホタル",
    AK: "02.小豆沢こはね",
    SA: "03.白石杏"
  };

  const modeMap = {
    DS: "01.調教",
    SR: "02.本気",
    LV: "03.恋愛"
  };

  const lvMap = {
    A: "1",
    B: "2",
    C: "3",
    D: "4"
  };

  const chr = chrMap[evt.evtId.substring(0, 2)];
  const mode = modeMap[evt.evtId.substring(3, 5)];

  const lv = lvMap[evt.evtId.charAt(6)];
  const no = evt.evtId.charAt(7);

  const titleDir = lv + no + "." + evt.evtNm;

  return "../data/" + chr + "/" + mode + "/" + titleDir;
}

function getBnrPath(evt) {
  return getEvtDir(evt) + "/bnr.png";
}

function getSelPath(evt, cpt) {
  return getEvtDir(evt) + "/CPT-" + cpt.cptId + "/sel.png";
}

function getMsgDataPath(evt, cptId) {
  return getEvtDir(evt) + "/CPT-" + cptId + "/msgData.js";
}

function getMoviePath(evt, cptId, movId, ptn) {
  return getEvtDir(evt) + "/CPT-" + cptId + "/" + movId + "-" + ptn + ".mp4";
}