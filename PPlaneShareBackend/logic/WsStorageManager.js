import debugCreator from "../general/debugCreator.js";

/* Storage Specification
 * {
 *   // allocated codes
 *   codes: Map(code, {
 *     // channels belong to this code
 *     // used when user delete the code
 *     channels: Set(channel),
 *   }),
 *   // all available channels
 *   channels: Map(channel, {
 *     // used if this channel belongs to a code
 *     code,
 *   })
 * }
 */

const debug = debugCreator("WsStorageManager");

class _WsStorageManager {
  constructor() {
    this._storage = {
      codes: new Map(),
      channels: new Map(),
    };
  }

  addCode(code) {
    const codeInfo = {
      channels: new Set(),
    };
    this._storage.codes.set(code, codeInfo);
  }

  addChannel(channel, code = undefined) {
    const channelInfo = { code };
    this._storage.channels.set(channel, channelInfo);
    if (code) {
      const codeInfo = this._storage.codes.get(code);
      codeInfo.channels.add(channel);
    }
  }

  hasCode(code) {
    return this._storage.codes.has(code);
  }

  hasChannel(channel) {
    return this._storage.channels.has(channel);
  }

  getCodes() {
    return this._storage.codes.keys();
  }

  getChannels(code = undefined) {
    if (code) {
      const codeInfo = this._storage.codes.get(code);
      return codeInfo.channels.values();
    } else {
      return this._storage.channels.keys();
    }
  }

  deleteCode(code) {
    const codeInfo = this._storage.codes.get(code);
    for (const channel of codeInfo.channels.values()) {
      this._storage.channels.delete(channel);
    }
    this._storage.codes.delete(code);
  }

  deleteChannel(channel) {
    const channelInfo = this._storage.channels.get(channel);
    const code = channelInfo.code;
    if (code) {
      const codeInfo = this._storage.codes.get(code);
      codeInfo.channels.delete(channel);
    }
    this._storage.channels.delete(channel);
  }
}

export default class WsStorageManager {
  constructor() {
    this._wsStorages = new Map();
  }

  _add(ws) {
    const wsStorages = this._wsStorages;
    const storage = new _WsStorageManager();
    wsStorages.set(ws, storage);
    debug(
      "added storage for %s:%s",
      ws._socket.remoteAddress,
      ws._socket.remotePort
    );
    return storage;
  }

  get(ws) {
    const wsStorages = this._wsStorages;
    let wsStorage = wsStorages.get(ws);
    if (!wsStorage) {
      wsStorage = this._add(ws);
    }
    return wsStorage;
  }

  delete(ws) {
    const wsStorages = this._wsStorages;
    wsStorages.delete(ws);
    debug(
      "deleted storage for %s:%s",
      ws._socket.remoteAddress,
      ws._socket.remotePort
    );
  }
}
