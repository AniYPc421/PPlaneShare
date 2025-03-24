export default class FileSender {
  constructor(dataChannel) {
    this._dataChannel = dataChannel;
    this._checkChannelOpen();
    dataChannel.binaryType = "arraybuffer";
    this._stopSend = false;
  }

  _checkChannelOpen() {
    if (this._dataChannel.readyState !== "open") {
      throw new Error("data channel is not open!");
    }
  }

  send(files, { progressCallback = function () {}, chunkSize = 16384 } = {}) {
    this._checkChannelOpen();
    const dataChannel = this._dataChannel;
    const fileReader = new FileReader();
    let fileIndex = 0;
    let offset = 0;
    return new Promise((resolve, reject) => {
      function closeListeners() {
        fileReader.removeEventListener("error", errorHandler);
        fileReader.removeEventListener("abort", errorHandler);
        fileReader.removeEventListener("load", loadHandler);
        dataChannel.removeEventListener("close", closeHandler);
        dataChannel.removeEventListener("bufferedamountlow", sendMoreBytes);
      }

      const sendMoreBytes = () => {
        dataChannel.removeEventListener("bufferedamountlow", sendMoreBytes);
        readSlice();
      };

      const readSlice = () => {
        const file = files[fileIndex];
        if (this._stopSend) {
          closeListeners();
          resolve(false);
        }
        if (
          dataChannel.bufferedAmount > dataChannel.bufferedAmountLowThreshold
        ) {
          dataChannel.addEventListener("bufferedamountlow", sendMoreBytes);
          return;
        }
        const slice = file.slice(offset, offset + chunkSize);
        fileReader.readAsArrayBuffer(slice);
      };

      const errorHandler = () => {
        closeListeners();
        if (this._stopSend) {
          resolve(false);
        } else {
          const fileName = files[fileIndex].name;
          reject(new Error(`failed to read file ${fileName}`));
        }
      };

      const closeHandler = () => {
        closeListeners();
        if (this._stopSend) {
          resolve(false);
        } else {
          reject(new Error("datachannel get closed!"));
        }
      };

      const loadHandler = (e) => {
        const data = e.target.result;
        if (dataChannel.readyState !== "open") {
          return;
        }
        dataChannel.send(data);
        offset += data.byteLength;
        const file = files[fileIndex];
        progressCallback(fileIndex, offset);
        if (offset === file.size) {
          offset = 0;
          fileIndex = fileIndex + 1;
          if (fileIndex === files.length) {
            closeListeners();
            resolve(true);
            return;
          }
        }
        readSlice();
      };

      fileReader.addEventListener("error", errorHandler);
      fileReader.addEventListener("abort", errorHandler);
      fileReader.addEventListener("load", loadHandler);
      dataChannel.addEventListener("close", closeHandler);

      readSlice();
    });
  }

  close() {
    this._stopSend = true;
  }
}
