export default class FileReceiver {
  constructor(downloadCallback) {
    this._downloadCallback = downloadCallback;
  }

  _stepEmptyFiles() {
    const fileDescription = this._fileDescription;
    const downloadCallback = this._downloadCallback;
    while (this._fileIndex < fileDescription.length) {
      if (fileDescription[this._fileIndex].fileBytes != 0) {
        break;
      }
      const emptyFile = new Blob([]);
      downloadCallback(this._fileIndex, emptyFile);
      this._fileIndex = this._fileIndex + 1;
    }
  }

  set fileDescription(newfileDescription) {
    this._receiveBuffer = [];
    this._receivedBytes = 0;
    this._fileIndex = 0;
    this._fileDescription = newfileDescription;
    this._stepEmptyFiles();
  }

  get fileDescription() {
    return this._fileDescription;
  }

  get complete() {
    if (!this._fileDescription) {
      return false;
    }
    return this._fileIndex === this._fileDescription.length;
  }

  receive(data, { progressCallback = function () {} } = {}) {
    const fileDescription = this._fileDescription;
    const downloadCallback = this._downloadCallback;
    this._receiveBuffer.push(data);
    this._receivedBytes = this._receivedBytes + data.byteLength;
    let fileBytes = fileDescription[this._fileIndex].fileBytes;
    while (this._receivedBytes >= fileBytes) {
      const file = new Blob(this._receiveBuffer.slice(0, fileBytes));
      this._receiveBuffer = this._receiveBuffer.slice(fileBytes);
      progressCallback(this._fileIndex, fileBytes);
      downloadCallback(this._fileIndex, file);
      this._fileIndex = this._fileIndex + 1;
      this._receivedBytes = this._receivedBytes - fileBytes;
      if (this._fileIndex === fileDescription.length) {
        return;
      }
      fileBytes = fileDescription[this._fileIndex].fileBytes;
    }
    progressCallback(this._fileIndex, this._receivedBytes);
  }

  getProgress(fileIndex) {
    const fileDescription = this._fileDescription;
    const currentFileIndex = this._fileIndex;
    if (
      !fileDescription ||
      fileIndex < 0 ||
      fileIndex >= fileDescription.length
    ) {
      return;
    }
    if (fileIndex < currentFileIndex) {
      return fileDescription[fileIndex].fileBytes;
    } else if (fileIndex === currentFileIndex) {
      return this._receivedBytes;
    } else {
      return 0;
    }
  }
}
