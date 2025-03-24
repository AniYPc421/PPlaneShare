import WithReplySender from "./WithReplySender";
import WithNoReplySender from "./WithNoReplySender";

export default class WsConnection {
  constructor(serverAddr, withReplyChecker, serverCloseCallback, replyTimeout) {
    this._serverAddr = serverAddr;
    this._ws = undefined;
    this._withReplySender = undefined;
    this._withNoReplySender = undefined;
    this._withReplyChecker = withReplyChecker;
    this._serverCloseCallback = () => {
      this.close();
      serverCloseCallback();
    };
    this._replyTimeout = replyTimeout;
    this._connectionTimeout = undefined;
  }

  _messageDispatcher = (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      return;
    }
    if (this._withReplyChecker(message)) {
      this._withReplySender.dispatcher(message);
    } else {
      this._withNoReplySender.dispatcher(message);
    }
  };

  close = () => {
    const ws = this._ws;
    if (ws === undefined) {
      return;
    }
    delete this._ws;
    if (this._connectionTimeout) {
      clearTimeout(this._connectionTimeout.timeoutId);
      this._connectionTimeout.abort();
      this._connectionTimeout = undefined;
      return;
    }
    ws.removeEventListener("message", this._messageDispatcher);
    ws.removeEventListener("close", this._serverCloseCallback);
    this._withReplySender.destroy();
    this._withNoReplySender.destroy();
    ws.close();
    // console.log("disconnected");
  };

  _checkOrEstablishConnection() {
    return new Promise((resolve, reject) => {
      let ws = this._ws;
      if (!ws) {
        ws = new WebSocket(this._serverAddr);
        this._ws = ws;
        function removeEventListeners() {
          ws.removeEventListener("open", openEvent);
          ws.removeEventListener("close", errorEvent);
        }
        const openEvent = () => {
          removeEventListeners();
          clearTimeout(this._connectionTimeout.timeoutId);
          this._connectionTimeout = undefined;
          this._withReplySender = new WithReplySender(
            (m) => ws.send(m),
            this._replyTimeout
          );
          this._withNoReplySender = new WithNoReplySender((m) => ws.send(m));
          ws.addEventListener("message", this._messageDispatcher);
          ws.addEventListener("close", this._serverCloseCallback);
          // console.log("connection established");
          resolve(ws);
        };
        const errorEvent = () => {
          removeEventListeners();
          clearTimeout(this._connectionTimeout.timeoutId);
          this._connectionTimeout = undefined;
          delete this._ws;
          reject(new Error("failed to connect to server!"));
        };
        ws.addEventListener("open", openEvent);
        ws.addEventListener("close", errorEvent);
        this._connectionTimeout = {
          timeoutId: setTimeout(() => {
            if (ws.readyState !== WebSocket.OPEN) {
              removeEventListeners();
              delete this._ws;
              reject(new Error("connection timeout"));
            }
          }, this._replyTimeout),
          abort: () => reject(new Error("connection aborted")),
        };
      } else {
        if (ws.readyState !== WebSocket.OPEN) {
          reject(new Error("Previous request is still under handling!"));
        }
        resolve(ws);
      }
    });
  }

  closeIfIdle() {
    const ws = this._ws;
    if (ws === undefined) {
      return;
    }
    if (this._withReplySender.empty && this._withNoReplySender.empty) {
      this.close();
    }
  }

  send = async (message, continueConnection = false) => {
    await this._checkOrEstablishConnection();
    let reply;
    if (this._withReplyChecker(message)) {
      try {
        reply = await this._withReplySender.send(message);
      } catch (e) {
        this.closeIfIdle();
        throw e;
      }
    } else {
      this._withNoReplySender.send(message);
    }
    if (!continueConnection) {
      this.closeIfIdle();
    }
    return reply;
  };

  listen = async (messageHandler) => {
    await this._checkOrEstablishConnection();
    return this._withNoReplySender.listen(messageHandler);
  };

  unlisten = (handlerId, continueConnection = false) => {
    this._withNoReplySender.unlisten(handlerId);
    if (!continueConnection) {
      this.closeIfIdle();
    }
  };

  setReplyTimeout(time) {
    this._replyTimeout = time;
    if (this._withReplySender) {
      this._withReplySender.setTimeout(time);
    }
  }

  get isOpen() {
    return this._ws !== undefined;
  }
}
