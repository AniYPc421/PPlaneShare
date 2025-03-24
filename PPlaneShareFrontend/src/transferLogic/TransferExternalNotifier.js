/* Used to store transfer file information for further display
 * progress may be refered to shared/receivedBytes
 * - storage: {
 *     share: Map(code, {
 *       files: FileList,
 *       channels: Map(channel, {
 *         status: "transfering" or "complete" or "aborted",
 *         shareProgress: [shareProgress]
 *       }),
 *     ),
 *     receive: Map(channel, {
 *       code: code,
 *       status: "transfering" or "complete" or "aborted",
 *       fileDescription: [{ fileName, fileBytes }],
 *       receiveProgress: [receiveProgress],
 *     }),
 *     _quickShareCodeLookup: Map(channel, code),
 *   }
 */
export default class TransferExternalNotifier {
  constructor() {
    this.clear();
  }

  /* Called by TransferManager Start */

  addShareCode(code, files) {
    const storage = this._storage;
    storage.share.set(code, {
      files,
      channels: new Map(),
    });
  }

  addShareChannel(code, channel) {
    const storage = this._storage;
    const codeInfo = storage.share.get(code);
    const files = codeInfo.files;
    const shareProgress = new Array(files.length).fill(0);
    codeInfo.channels.set(channel, {
      status: "transfering",
      shareProgress,
    });
    storage._quickShareCodeLookup.set(channel, code);
  }

  _getShareChannelInfo(channel) {
    const storage = this._storage;
    const code = storage._quickShareCodeLookup.get(channel);
    const codeInfo = storage.share.get(code);
    const channelInfo = codeInfo.channels.get(channel);
    return channelInfo;
  }

  setShareProgress(channel, fileIndex, progress) {
    const channelInfo = this._getShareChannelInfo(channel);
    channelInfo.shareProgress[fileIndex] = progress;
  }

  setShareComplete(channel) {
    const channelInfo = this._getShareChannelInfo(channel);
    if (channelInfo.status !== "transfering") {
      return;
    }
    channelInfo.status = "complete";
  }

  setShareAborted(channel) {
    const channelInfo = this._getShareChannelInfo(channel);
    if (channelInfo.status !== "transfering") {
      return;
    }
    channelInfo.status = "aborted";
  }

  addReceiveChannel(channel, code) {
    const storage = this._storage;
    storage.receive.set(channel, {
      code,
      status: "transfering",
    });
  }

  setReceiveFileDescription(channel, fileDescription) {
    const storage = this._storage;
    const channelInfo = storage.receive.get(channel);
    channelInfo.fileDescription = fileDescription;
    channelInfo.receiveProgress = new Array(fileDescription.length).fill(0);
  }

  setReceiveProgress(channel, fileIndex, progress) {
    const storage = this._storage;
    const channelInfo = storage.receive.get(channel);
    channelInfo.receiveProgress[fileIndex] = progress;
  }

  setReceiveComplete(channel) {
    const storage = this._storage;
    const channelInfo = storage.receive.get(channel);
    if (channelInfo.status !== "transfering") {
      return;
    }
    channelInfo.status = "complete";
  }

  setReceiveAborted(channel) {
    const storage = this._storage;
    const channelInfo = storage.receive.get(channel);
    if (channelInfo.status !== "transfering") {
      return;
    }
    channelInfo.status = "aborted";
  }

  clear() {
    this._storage = {
      share: new Map(),
      receive: new Map(),
      _quickShareCodeLookup: new Map(),
    };
  }

  /* Called by TransferManager End */

  /* Called by Frontend Start */

  get share() {
    return this._storage.share;
  }

  get receive() {
    return this._storage.receive;
  }

  deleteShareCode(code) {
    const storage = this._storage;
    storage.share.delete(code);
  }

  deleteShareChannel(channel) {
    const storage = this._storage;
    const code = storage._quickShareCodeLookup.get(channel);
    const codeInfo = storage.share.get(code);
    codeInfo.channels.delete(channel);
    storage._quickShareCodeLookup.delete(channel);
  }

  deleteReceiveChannel(channel) {
    const storage = this._storage;
    storage.receive.delete(channel);
  }

  /* Called by Frontend End */
}
