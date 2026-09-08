//---------------
// パラメタ設定
//---------------
var evtId;
var chrId;
var evtIdx;
var autoFlg;
var modeKbn;
var tgtEvtData;
var debugMovId;

//---------------
// パラメタ設定
//---------------
function setParam() {

    var urlParams = new URLSearchParams(window.location.search);

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

    tgtEvtData = evtData.find(evt => evt.evtId === evtId);

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
    FF: "11.ホタル",
    AK: "12.小豆沢こはね",
    SA: "13.白石杏"
  };

  const modeMap = {
    R: { prefix: "1", name: "恋愛" },
    S: { prefix: "2", name: "本気" },
    C: { prefix: "3", name: "調教" }
  };

  const chr = chrMap[evt.evtId.substring(0, 2)];
  const mode = modeMap[evt.evtId.charAt(3)];
  const episode = evt.evtId.charAt(4);
  const eventDir =
    mode.prefix + episode + "." + mode.name + "-EPS" + episode;

  return "../data/" + chr + "/" + eventDir;
}

function getChrDir(chrId) {
  const chrMap = {
    FF: "11.ホタル",
    AK: "12.小豆沢こはね",
    SA: "13.白石杏"
  };

  return "../data/" + chrMap[chrId];
}

function getChrSelPath(chrId) {
  return getChrDir(chrId) + "/00.選択/sel.png";
}

function getBnrPath(evt) {
  return getEvtDir(evt) + "/02.sel-B.png";
}

function getSelPath(evt) {
  return getEvtDir(evt) + "/01.sel-M.png";
}

function getMsgDataPath(evt) {
  return getEvtDir(evt) + "/31.msgDat.js";
}

function getMoviePath(evt, movId, sequenceNo, ptn) {
  const movNo = String(movId || "").charAt(3);
  return getEvtDir(evt) + "/" + movNo + sequenceNo + ".evt-" + ptn + ".mp4";
}
