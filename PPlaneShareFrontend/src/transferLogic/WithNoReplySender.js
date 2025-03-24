import { v4 as generateUuid } from "uuid";

export default class WithNoReplySender {
  constructor(send) {
    this._send = send;
    this._handlerMap = new Map();
  }

  _generateHandlerId(handler) {
    let handlerId;
    do {
      handlerId = generateUuid();
    } while (this._handlerMap.has(handlerId));
    this._handlerMap.set(handlerId, handler);
    return handlerId;
  }

  _deleteHandlerId(handlerId) {
    this._handlerMap.delete(handlerId);
  }

  dispatcher = (message) => {
    for (const handler of this._handlerMap.values()) {
      handler(message);
    }
  };

  send = (message) => {
    this._send(JSON.stringify(message));
  };

  listen = (handler) => {
    return this._generateHandlerId(handler);
  };

  unlisten = (handlerId) => {
    this._deleteHandlerId(handlerId);
  };

  get empty() {
    return this._handlerMap.size === 0;
  }

  destroy = () => {
    clearInterval(this._clearTimeoutIntervalId);
  };
}
