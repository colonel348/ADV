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
        evtId = "AK-R1";
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
    R: { prefix: "1", name: "恋愛" },
    S: { prefix: "2", name: "恋愛" },
    C: { prefix: "3", name: "調教" }
  };

  const chr = chrMap[evt.evtId.substring(0, 2)];
  const mode = modeMap[evt.evtId.charAt(3)];
  const episode = evt.evtId.charAt(4);
  const eventDir =
    mode.prefix + episode + "." + mode.name + "-EPS" + episode;

  return "../data/" + chr + "/" + eventDir;
}

function getCptDir(evt, cptId) {
  const cptNo = String(cptId);
  const folderNo = cptNo.padStart(2, "0");

  return getEvtDir(evt) + "/" + folderNo + ".CPT" + cptNo;
}

function getChrDir(chrId) {
  const chrMap = {
    FF: "01.ホタル",
    AK: "02.小豆沢こはね",
    SA: "03.白石杏"
  };

  return "../data/" + chrMap[chrId];
}

function getChrSelPath(chrId) {
  return getChrDir(chrId) + "/00.選択/sel.png";
}

function getModeSelPath(chrId, mode) {
  const fileMap = {
    R: "rm-sel.png",
    S: "sr-sel.png",
    C: "ct-sel.png"
  };

  return getChrDir(chrId) + "/00.選択/" + fileMap[mode];
}

function getBnrPath(evt) {
  return getEvtDir(evt) + "/00.タイトル/bnr.png";
}

function getSelPath(evt, cpt) {
  return getEvtDir(evt) + "/00.タイトル/sel.png";
}

function getMsgDataPath(evt, cptId) {
  return getCptDir(evt, cptId) + "/msgData.js";
}

function getMoviePath(evt, cptId, movId, ptn) {
  return getCptDir(evt, cptId) + "/" + movId + "-" + ptn + ".mp4";
}
