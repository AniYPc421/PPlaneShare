import TransferStorage from "./TransferStorage";
import RTCConnection from "./RTCConnection";
import WsConnection from "./WsConnection";
import FileSender from "./FileSender";
import { v4 as generateUuid } from "uuid";
import FileReceiver from "./FileReceiver";

/* actions:
 * - allocate: allocate a new code for files, needs reply
 * - delete: delete a code, needs reply to check if errors occurred
 * - download: download a file, needs reply to check if it cannot be downloaded
 * - connect: denote someone wants to download files, no reply
 * - offer: ice offer, no reply
 * - answer: ice answer, no reply
 * - iceCandidate: ice candidate, no reply
 * - complete: receiver notes that files have been downloaded, no reply
 * - cancel: one side terminates the sharing process, no reply
 */

const replyChecker = function (message) {
  return ["allocate", "delete", "download"].includes(message.action);
};

function generateChannelId() {
  return generateUuid();
}

export default class TransferManager {
  constructor(
    serverAddr,
    transferExternalNotifier,
    errorHandler,
    config = {
      rtcConfig: {},
      replyTimeout: undefined,
    }
  ) {
    this._wsConnection = new WsConnection(
      serverAddr,
      replyChecker,
      () => {
        errorHandler(new Error("server closed the connection!"));
        this.destroy();
      },
      config.replyTimeout
    );
    this._transferExternalNotifier = transferExternalNotifier;
    this._errorHandler = errorHandler;
    this._rtcConfig = config.rtcConfig ? config.rtcConfig : {};
    this._listener = undefined;
    this._storage = new TransferStorage();
  }

  async _listenForMessages() {
    if (this._listener) {
      return;
    }
    const wsConnection = this._wsConnection;
    const storage = this._storage;
    const transferExternalNotifier = this._transferExternalNotifier;
    const errorHandler = this._errorHandler;
    const rtcConfig = this._rtcConfig;
    this._listener = await this._wsConnection.listen(async (message) => {
      const action = message.action;
      const channelId = message.channelId;
      switch (action) {
        case "connect": {
          const code = message.code;
          if (!storage.hasCode(code)) {
            return;
          }
          if (storage.hasChannel(channelId)) {
            return;
          }
          const files = storage.getFiles(code);
          const send = (type, message) => {
            const modifiedMessage = {
              action: type,
              channelId,
              [type]: message,
            };
            if (type === "offer") {
              modifiedMessage.fileDescription = [];
              for (
                let fileIndex = 0;
                fileIndex < files.length;
                fileIndex = fileIndex + 1
              ) {
                const file = files[fileIndex];
                modifiedMessage.fileDescription.push({
                  fileName: file.name,
                  fileBytes: file.size,
                });
              }
            }
            wsConnection.send(modifiedMessage);
          };
          const rtcCloseCallback = () => {
            storage.deleteChannel(channelId);
            rtcConnection.close();
            this._unlistenWhenIdle();
            transferExternalNotifier.setShareAborted(channelId);
            errorHandler(
              new Error(
                `downloader closed connection to download files with code ${code}!`
              )
            );
          };
          let rtcConnection;
          try {
            rtcConnection = new RTCConnection(
              "sender",
              send,
              rtcCloseCallback,
              rtcConfig
            );
          } catch (e) {
            await wsConnection.send({
              action: "cancel",
              channelId,
            });
            this._unlistenWhenIdle();
            errorHandler(e);
            return;
          }
          await rtcConnection.setup(async (dataChannel) => {
            const fileSender = new FileSender(dataChannel);
            storage.addFileSender(channelId, fileSender);
            try {
              const sendComplete = await fileSender.send(files, {
                progressCallback: (fileIndex, sendBytes) => {
                  transferExternalNotifier.setShareProgress(
                    channelId,
                    fileIndex,
                    sendBytes
                  );
                },
              });
              if (sendComplete) {
                transferExternalNotifier.setShareComplete(channelId);
              }
            } catch (e) {
              storage.deleteChannel(channelId);
              rtcConnection.close();
              this._unlistenWhenIdle();
              errorHandler(e);
              transferExternalNotifier.setShareAborted(channelId);
            }
          });
          storage.addChannel(channelId, rtcConnection, code);
          transferExternalNotifier.addShareChannel(code, channelId);
          return;
        }
        case "offer": {
          if (!storage.hasChannel(channelId)) {
            return;
          }
          const offer = message.offer;
          const rtcConnection = storage.getRtcConnection(channelId);
          const fileDescription = message.fileDescription;
          if (fileDescription === undefined || fileDescription.length === 0) {
            rtcConnection.close();
            storage.deleteChannel(channelId);
            errorHandler(
              new Error("sender does not tell me information about files!")
            );
          }
          for (const { fileName, fileBytes } of fileDescription) {
            if (fileName === undefined || fileBytes === undefined) {
              rtcConnection.close();
              storage.deleteChannel(channelId);
              errorHandler(
                new Error("sender does not tell me information about files!")
              );
            }
          }
          transferExternalNotifier.setReceiveFileDescription(
            channelId,
            fileDescription
          );
          const fileReceiver = storage.getFileReceiver(channelId);
          fileReceiver.fileDescription = fileDescription;

          const completeSend = async () => {
            transferExternalNotifier.setReceiveComplete(channelId);
            await wsConnection.send({
              action: "complete",
              channelId,
            });
            rtcConnection.close();
            storage.deleteChannel(channelId);
            this._unlistenWhenIdle();
          };

          if (fileReceiver.complete) {
            completeSend();
          } else {
            rtcConnection.setup((data) => {
              fileReceiver.receive(data, {
                progressCallback: (fileIndex, receivedBytes) => {
                  transferExternalNotifier.setReceiveProgress(
                    channelId,
                    fileIndex,
                    receivedBytes
                  );
                },
              });
              if (fileReceiver.complete) {
                completeSend();
              }
            });
            rtcConnection.setAnotherSDP(offer);
          }

          return;
        }
        case "answer": {
          if (!storage.hasChannel(channelId)) {
            return;
          }
          const rtcConnection = storage.getRtcConnection(channelId);
          const answer = message.answer;
          rtcConnection.setAnotherSDP(answer);
          return;
        }
        case "iceCandidate": {
          if (!storage.hasChannel(channelId)) {
            return;
          }
          const rtcConnection = storage.getRtcConnection(channelId);
          const iceCandidate = message.iceCandidate;
          rtcConnection.addIceCandidate(iceCandidate);
          return;
        }
        case "cancel":
        case "complete": {
          if (!storage.hasChannel(channelId)) {
            return;
          }

          const type = storage.getTypeFromChannel(channelId);
          const isSender = type === "sender";

          if (isSender) {
            const fileSender = storage.getFileSender(channelId);
            if (fileSender) {
              fileSender.close();
            }
          }

          storage.getRtcConnection(channelId).close();
          storage.deleteChannel(channelId);
          this._unlistenWhenIdle();

          if (action === "cancel") {
            if (isSender) {
              transferExternalNotifier.setShareAborted(channelId);
            } else {
              transferExternalNotifier.setReceiveAborted(channelId);
            }
            errorHandler(
              new Error(
                "file sharing procress was cancelled by the other side!"
              )
            );
          } else {
            if (isSender) {
              transferExternalNotifier.setShareComplete(channelId);
            } else {
              transferExternalNotifier.setReceiveComplete(channelId);
            }
          }
          return;
        }
      }
    });
  }

  _unlistenWhenIdle() {
    const wsConnection = this._wsConnection;
    if (!wsConnection.isOpen) {
      return;
    }
    const listener = this._listener;
    const storage = this._storage;
    if (storage.getCodes().next().done && storage.getChannels().next().done) {
      wsConnection.unlisten(listener);
      this._listener = undefined;
    }
    wsConnection.closeIfIdle();
  }

  async allocate(files) {
    const wsConnection = this._wsConnection;
    const storage = this._storage;
    const transferExternalNotifier = this._transferExternalNotifier;
    const errorHandler = this._errorHandler;
    if (files.length === 0) {
      errorHandler(new Error("files cannot be empty!"));
    }
    let reply;
    try {
      reply = await wsConnection.send({ action: "allocate" }, true);
    } catch (e) {
      errorHandler(e);
      return { result: false };
    }
    const { code, error: allocateError } = reply;
    if (allocateError) {
      wsConnection.closeIfIdle();
      return;
    }
    try {
      await this._listenForMessages();
    } catch (e) {
      errorHandler(e);
      return { result: false };
    }
    storage.addCode(code, files);
    transferExternalNotifier.addShareCode(code, files);
    return { result: true, code };
  }

  async delete(code) {
    const wsConnection = this._wsConnection;
    const storage = this._storage;
    const errorHandler = this._errorHandler;
    if (!storage.hasCode(code)) {
      errorHandler(new Error(`not owning code ${code}!`));
      return { result: false };
    }
    for (const channel of storage.getChannels(code)) {
      const rtcConnection = storage.getRtcConnection(channel);
      const fileSender = storage.getFileSender(channel);
      if (fileSender) {
        fileSender.close();
      }
      rtcConnection.close();
      wsConnection.send({
        action: "cancel",
        channelId: channel,
      });
    }
    const { error: deleteError } = await wsConnection.send({
      action: "delete",
      code,
    });
    if (deleteError) {
      errorHandler(new Error(deleteError));
      return { result: false };
    }
    storage.deleteCode(code);
    this._unlistenWhenIdle();
    return { result: true };
  }

  /* downloadCallback:
   * - fileIndex, fileBlob
   */
  async download(code, downloadCallback) {
    const wsConnection = this._wsConnection;
    const storage = this._storage;
    const rtcConfig = this._rtcConfig;
    const transferExternalNotifier = this._transferExternalNotifier;
    const errorHandler = this._errorHandler;
    const channelId = generateChannelId();

    const send = (type, message) => {
      wsConnection.send({
        action: type,
        channelId,
        [type]: message,
      });
    };
    const rtcCloseCallback = () => {
      storage.deleteChannel(channelId);
      rtcConnection.close();
      this._unlistenWhenIdle();
      transferExternalNotifier.setReceiveAborted(channelId);
      errorHandler(new Error(`code ${code} owner closed connection!`));
    };
    let rtcConnection;
    try {
      rtcConnection = new RTCConnection(
        "receiver",
        send,
        rtcCloseCallback,
        rtcConfig
      );
    } catch (e) {
      errorHandler(e);
      return;
    }
    storage.addChannel(channelId, rtcConnection);
    const fileReceiver = new FileReceiver((fileIndex, fileBlob) => {
      downloadCallback(channelId, fileIndex, fileBlob);
    });
    try {
      await this._listenForMessages();
    } catch (e) {
      errorHandler(e);
      this._unlistenWhenIdle();
      return { result: false };
    }

    const { error: downloadError } = await wsConnection.send({
      action: "download",
      channelId,
      code,
    });
    if (downloadError) {
      errorHandler(new Error(downloadError));
      storage.deleteChannel(channelId);
      rtcConnection.close();
      this._unlistenWhenIdle();
      return { result: false };
    }
    storage.addFileReceiver(channelId, fileReceiver);
    transferExternalNotifier.addReceiveChannel(channelId, code);
    return { result: true, channelId };
  }

  async cancel(channelId) {
    const wsConnection = this._wsConnection;
    const storage = this._storage;
    const errorHandler = this._errorHandler;
    if (!storage.hasChannel(channelId)) {
      errorHandler(new Error(`now owning channel ${channelId}!`));
      return { result: false };
    }

    const fileSender = storage.getFileSender(channelId);
    if (fileSender) {
      fileSender.close();
    }
    await wsConnection.send({
      action: "cancel",
      channelId,
    });
    storage.getRtcConnection(channelId).close();
    storage.deleteChannel(channelId);
    this._unlistenWhenIdle();

    return { result: true };
  }

  destroy() {
    this._wsConnection.close();
    this._storage.clear();
    this._transferExternalNotifier.clear();
    this._listener = undefined;
  }

  setRtcConfig(rtcConfig) {
    this._rtcConfig = rtcConfig;
  }

  setReplyTimeout(time) {
    this._wsConnection.setReplyTimeout(time);
  }
}
