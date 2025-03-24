/* Used for manage connections and other utilities when sharing files
 * - storage: {
 *     codes: Map(code, {
 *       channels: Set(channel),
 *       files: FileList,
 *     }),
 *     channels: Map(channel, {
 *       code: code,
 *       rtcConnection: RTCConnection,
 *       fileSender(sender): FileSender,
 *       fileReceiver(receiver): FileReceiver,
 *     }),
 * }
 */
export default class TransferStorage {
  constructor() {
    this.clear();
  }

  addCode(code, files) {
    const codes = this._storage.codes;
    codes.set(code, {
      channels: new Set(),
      files,
    });
  }

  addChannel(channel, rtcConnection, code = undefined) {
    const codes = this._storage.codes;
    const channels = this._storage.channels;
    channels.set(channel, { code, rtcConnection });
    if (code) {
      const codeInfo = codes.get(code);
      codeInfo.channels.add(channel);
    }
  }

  addFileSender(channel, fileSender) {
    const channels = this._storage.channels;
    const channelInfo = channels.get(channel);
    channelInfo.fileSender = fileSender;
  }

  addFileReceiver(channel, fileReceiver) {
    const channels = this._storage.channels;
    const channelInfo = channels.get(channel);
    channelInfo.fileReceiver = fileReceiver;
  }

  hasCode(code) {
    const codes = this._storage.codes;
    return codes.has(code);
  }

  hasChannel(channel) {
    const channels = this._storage.channels;
    return channels.has(channel);
  }

  getCodes() {
    const codes = this._storage.codes;
    return codes.keys();
  }

  getTypeFromChannel(channel) {
    const channels = this._storage.channels;
    const channelInfo = channels.get(channel);
    if (channelInfo.code) {
      return "sender";
    } else {
      return "receiver";
    }
  }

  getFiles(code) {
    const codes = this._storage.codes;
    const codeInfo = codes.get(code);
    return codeInfo.files;
  }

  getChannels(code = undefined) {
    if (code) {
      const codes = this._storage.codes;
      const codeInfo = codes.get(code);
      return codeInfo.channels.values();
    } else {
      return this._storage.channels.keys();
    }
  }

  getRtcConnection(channel) {
    const channels = this._storage.channels;
    const channelInfo = channels.get(channel);
    return channelInfo.rtcConnection;
  }

  getFileSender(channel) {
    const channels = this._storage.channels;
    const channelInfo = channels.get(channel);
    return channelInfo.fileSender;
  }

  getFileReceiver(channel) {
    const channels = this._storage.channels;
    const channelInfo = channels.get(channel);
    return channelInfo.fileReceiver;
  }

  deleteCode(code) {
    const codes = this._storage.codes;
    const channels = this._storage.channels;
    const codeInfo = codes.get(code);
    for (const channel of codeInfo.channels) {
      channels.delete(channel);
    }
    codes.delete(code);
  }

  deleteChannel(channel) {
    const codes = this._storage.codes;
    const channels = this._storage.channels;
    const channelInfo = channels.get(channel);
    if (channelInfo.code) {
      const codeInfo = codes.get(channelInfo.code);
      codeInfo.channels.delete(channel);
    }
    channels.delete(channel);
  }

  clear() {
    this._storage = {
      codes: new Map(),
      channels: new Map(),
    };
  }
}
