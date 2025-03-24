import UserError from "../general/UserError.js";
import { CodeManager } from "../logic/CodeManager.js";
import { ChannelManager } from "../logic/ChannelManager.js";
import WsStorageManager from "../logic/WsStorageManager.js";
import debugCreator from "../general/debugCreator.js";

const debugHandler = debugCreator("handler");
const debugErrHandler = debugCreator("errHandler");

const wsStorageManager = new WsStorageManager();

const codeManager = new CodeManager();
const channelManager = new ChannelManager();

class NotOwnCodeError extends UserError {
  constructor(code, options) {
    super(`Code ${code} is not owned by you!`, options);
  }
}

class DownloadSelfCodeError extends UserError {
  constructor(code, options) {
    super(`No need to download since code ${code} is owned by you!`, options);
  }
}

function _getSocketAddress(ws) {
  const ipAddress = ws._socket.remoteAddress;
  const port = ws._socket.remotePort;
  return `${ipAddress}:${port}`;
}

export function handler(ws, m) {
  let message;
  try {
    message = JSON.parse(m);
    // eslint-disable-next-line no-unused-vars
  } catch (e) {
    return;
  }
  try {
    _handler(ws, message);
  } catch (e) {
    if (e instanceof UserError) {
      _errHandler(e, ws, message);
    } else {
      throw e;
    }
  }
}

export function closeHandler(ws) {
  const wsStorage = wsStorageManager.get(ws);
  for (const code of wsStorage.getCodes()) {
    codeManager.delete(code);
  }
  for (const channel of wsStorage.getChannels()) {
    const anotherWs = channelManager.get(channel, ws);
    const anotherStorage = wsStorageManager.get(anotherWs);
    anotherStorage.deleteChannel(channel);
    channelManager.delete(channel);
  }
  wsStorageManager.delete(ws);
}

function _handler(ws, message) {
  debugHandler(
    "received message from %s, with message %O",
    _getSocketAddress(ws),
    message
  );
  const action = message.action;
  const wsStorage = wsStorageManager.get(ws);
  switch (action) {
    case "allocate": {
      const code = codeManager.add(ws);
      wsStorage.addCode(code);
      const reply = JSON.stringify({ ...message, code });
      ws.send(reply);
      break;
    }
    case "delete": {
      const code = message.code;
      if (!wsStorage.hasCode(code)) {
        throw new NotOwnCodeError();
      }
      codeManager.delete(code);
      for (const channel of wsStorage.getChannels(code)) {
        const receiverWs = channelManager.get(channel, ws);
        const receiverStorage = wsStorageManager.get(receiverWs);
        receiverStorage.deleteChannel(channel);
        channelManager.delete(channel);
      }
      wsStorage.deleteCode(code);
      const reply = JSON.stringify({ ...message });
      ws.send(reply);
      break;
    }
    case "download": {
      const code = message.code;
      const channelId = message.channelId;
      const senderWs = codeManager.get(code);
      if (senderWs === ws) {
        throw new DownloadSelfCodeError(code);
      }
      channelManager.add(channelId, senderWs, ws);

      const senderStorage = wsStorageManager.get(senderWs);
      senderStorage.addChannel(channelId, code);
      wsStorage.addChannel(channelId);

      const receiverReply = JSON.stringify(message);
      ws.send(receiverReply);
      const senderReply = JSON.stringify({
        action: "connect",
        channelId,
        code,
      });
      senderWs.send(senderReply);
      break;
    }
    case "cancel":
    case "complete": {
      const channelId = message.channelId;
      const senderWs = channelManager.get(channelId, ws);
      const senderWsStorage = wsStorageManager.get(senderWs);

      channelManager.delete(channelId);
      senderWsStorage.deleteChannel(channelId);
      wsStorage.deleteChannel(channelId);

      senderWs.send(JSON.stringify(message));
      break;
    }
    default: {
      const channelId = message.channelId;
      const sendTo = channelManager.get(channelId, ws);
      sendTo.send(JSON.stringify(message));
    }
  }
}

function _errHandler(e, ws, message) {
  const errInfo = e.message;
  debugErrHandler(
    "error occurred when handling message sent from %s, with error message: %s",
    _getSocketAddress(ws),
    errInfo
  );
  const reply = {
    ...message,
    error: errInfo,
  };
  ws.send(JSON.stringify(reply));
}
