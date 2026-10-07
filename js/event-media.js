(function (global) {
  "use strict";

  const messageCache = new Map();
  let loadQueue = Promise.resolve();

  function cloneMessageData(data) {
    if (!Array.isArray(data)) return data;
    return data.map(item => ({ ...item }));
  }

  function loadMessageScript(evt) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = getMsgDataPath(evt);
      script.async = true;
      script.onload = () => {
        const data = cloneMessageData(global.msgData);
        script.remove();
        resolve(data);
      };
      script.onerror = () => {
        script.remove();
        reject(new Error("Failed to load event message data: " + script.src));
      };
      document.body.appendChild(script);
    });
  }

  function loadEventMessageData(evt) {
    if (!evt?.evtId) return Promise.resolve(null);
    if (messageCache.has(evt.evtId)) return messageCache.get(evt.evtId);

    // msgDat.jsはwindow.msgDataへ代入する形式なので、複数イベントの同時読込を直列化する。
    const request = loadQueue
      .catch(() => {})
      .then(() => loadMessageScript(evt));
    loadQueue = request;
    messageCache.set(evt.evtId, request);
    request.catch(() => messageCache.delete(evt.evtId));
    return request;
  }

  function getFirstMovBlockMedia(evt, data) {
    if (!Array.isArray(data)) return [];

    const movIndex = data.findIndex(item => item && Object.prototype.hasOwnProperty.call(item, "movId"));
    if (movIndex < 0) return [];

    const movId = data[movIndex].movId;
    const urls = [];
    let sequenceNo = 0;
    let previousVideoType = "";

    for (let index = movIndex + 1; index < data.length; index++) {
      const item = data[index];
      if (!item || Object.prototype.hasOwnProperty.call(item, "movId")) break;

      if (item.msgId === "A" || item.msgId === "L") {
        if (item.msgId !== previousVideoType) sequenceNo++;
        const src = getMoviePath(evt, movId, sequenceNo, item.msgId);
        if (!urls.includes(src)) urls.push(src);
        previousVideoType = item.msgId;
      } else {
        previousVideoType = "";
      }
    }

    return urls;
  }

  global.EventMedia = {
    loadMessageData: loadEventMessageData,
    getFirstMovBlockMedia
  };
})(window);
