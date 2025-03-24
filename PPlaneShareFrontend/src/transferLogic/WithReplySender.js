import { v4 as generateUuid } from "uuid";
import MessageTimer from "./MessageTimer";

export default class WithReplySender {
  constructor(send, timeout = 5000) {
    this._send = send;
    this._messageMap = new Map();
    this._timeout = timeout;
    this._clearTimeoutIntervalId = setInterval(
      () => this._clearTimeoutMessage(),
      timeout
    );
  }

  _generateMessageId(messageCallback, errorCallback) {
    let messageId;
    do {
      messageId = generateUuid();
    } while (this._messageMap.has(messageId));
    const messageTimer = new MessageTimer(this._timeout);
    this._messageMap.set(messageId, {
      messageTimer,
      messageCallback,
      errorCallback,
    });
    return messageId;
  }

  _deleteMessageId(messageId) {
    this._messageMap.delete(messageId);
  }

  _clearTimeoutMessage() {
    for (const [messageId, { messageTimer, errorCallback }] of this
      ._messageMap) {
      if (messageTimer.validateTime()) {
        this._deleteMessageId(messageId);
        errorCallback(new Error("request timeout"));
      } else {
        break;
      }
    }
  }

  dispatcher = (message) => {
    const messageId = message.messageId;
    const messageInfo = this._messageMap.get(messageId);
    if (!messageInfo) {
      throw new Error("unknown request reply from server");
    }
    this._deleteMessageId(messageId);
    delete message.messageId;
    messageInfo.messageCallback(message);
  };

  send = async (message) => {
    return new Promise((resolve, reject) => {
      const messageId = this._generateMessageId(
        (message) => resolve(message),
        (error) => reject(error)
      );
      try {
        this._send(
          JSON.stringify({
            messageId,
            ...message,
          })
        );
      } catch (e) {
        this._deleteMessageId(messageId);
        reject(e);
      }
    });
  };

  get empty() {
    return this._messageMap.size === 0;
  }

  setTimeout(time) {
    this._timeout = time;
  }

  destroy = () => {
    clearInterval(this._clearTimeoutIntervalId);
    for (const { errorCallback } of this._messageMap.values()) {
      errorCallback(new Error("connection closed"));
    }
  };
}
