import React, { useState, useEffect, useRef, useContext } from "react";
import { flushSync } from "react-dom";
import "./ReceiveSection.css";
import {
  TransferManagerContext,
  TransferExternalNotifierContext,
} from "./transferContext";
import ProgressBar from "./widgets/ProgressBar";
import getReadableSizeFromBytes from "../utils/readableSize";
import LoadingMask from "./widgets/LoadingMask";
import NotifyContext from "./NotifyContext";

function unpackReceiveInfo(receiveInfo) {
  return [...receiveInfo];
}

function ReceiveListItemFileDetail({ fileName, fileBytes, receiveBytes }) {
  const getSize = (bytes) => getReadableSizeFromBytes(bytes);
  const [fileSize, receiveSize] = [fileBytes, receiveBytes].map(getSize);
  return (
    <div className="receive-file-detail">
      <div className="receive-file-des">
        <p>{fileName}</p>
        <p>
          {receiveSize} / {fileSize}
        </p>
      </div>
      <ProgressBar value={receiveBytes} max={fileBytes} />
    </div>
  );
}

function ReceiveListItem({ channel, channelInfo, removeSelf }) {
  const transferManager = useContext(TransferManagerContext);
  const transferExternalNotifier = useContext(TransferExternalNotifierContext);
  const notify = useContext(NotifyContext);

  const { code, status, fileDescription, receiveProgress } = channelInfo;

  function deleteItem(channel) {
    if (status === "transfering") {
      transferManager.cancel(channel);
    }
    transferExternalNotifier.deleteReceiveChannel(channel);
    removeSelf();
  }

  function copyCode() {
    navigator.clipboard
      .writeText(code)
      .then(() => notify("copied!"))
      .catch((e) => notify(`failed to copy code: ${e.message}`));
  }

  // To-do: add querying file list prompt

  return (
    <div className="receive-list-item" onClick={copyCode}>
      <div className="receive-list-item-header">
        <h3>{code}</h3>
        <p>{status}</p>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            deleteItem(channel);
          }}
        >
          delete
        </button>
      </div>
      {!fileDescription ? (
        <p>Getting Infos...</p>
      ) : (
        <ul>
          {fileDescription.map((des, index) => {
            const { fileName, fileBytes } = des;
            return (
              <li key={`${channel}_${index}`}>
                <ReceiveListItemFileDetail
                  fileName={fileName}
                  fileBytes={fileBytes}
                  receiveBytes={receiveProgress[index]}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ReceiveList() {
  const transferExternalNotifier = useContext(TransferExternalNotifierContext);
  const [receiveList, setReceiveList] = useState([]);

  useEffect(() => {
    const updateReceiveList = () => {
      const originalReceiveList = transferExternalNotifier.receive;
      const unpackedReceiveInfo = unpackReceiveInfo(originalReceiveList);
      setReceiveList(unpackedReceiveInfo);
    };

    updateReceiveList();

    const intervalId = setInterval(updateReceiveList, 500);

    return () => {
      clearInterval(intervalId);
    };
  }, [transferExternalNotifier]);

  return (
    <section className="receive-list">
      <h2>Receive List</h2>
      {!receiveList.length ? (
        <p>There are currently no receiving files.</p>
      ) : (
        <ul>
          {receiveList.map(([channel, channelInfo], index) => {
            return (
              <li key={channel}>
                <ReceiveListItem
                  channel={channel}
                  channelInfo={channelInfo}
                  removeSelf={() => {
                    setReceiveList(
                      receiveList.filter((_, compIndex) => {
                        return compIndex !== index;
                      })
                    );
                  }}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ReceiveSelector() {
  const codeLength = 6;
  const [inputCode, setInputCode] = useState(new Array(codeLength).fill(""));
  const downloadAnchor = useRef();
  const transferManager = useContext(TransferManagerContext);
  const transferExternalNotifier = useContext(TransferExternalNotifierContext);

  const inputCodeRefs = new Array(codeLength).fill(0).map(() => useRef());

  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    inputCodeRefs[0].current.focus();
  }, [isRequesting]);

  // To-do: add loading mask when waiting for server response
  function downloadCode(code) {
    setIsRequesting(true);
    transferManager
      .download(code, (channel, fileIndex, fileBlob) => {
        const receive = transferExternalNotifier.receive;
        const channelInfo = receive.get(channel);
        const { fileName } = channelInfo.fileDescription[fileIndex];
        const downloadElement = downloadAnchor.current;
        const url = URL.createObjectURL(fileBlob);
        downloadElement.href = url;
        downloadElement.download = fileName;
        downloadElement.click();
        URL.revokeObjectURL(url);
      })
      .then(() => {
        setIsRequesting(false);
      });
  }

  function inputCodeKeyDownHandler(e, index) {
    switch (e.key) {
      case "Backspace": {
        if (e.target.value === "" && index > 0) {
          /* two situations: (if (index-1) has char determines)
           * 1. x x _ _ _ _
           *      ^ *
           *    at * press backscape, delete the char at ^
           *    and move to ^
           * 2. x _ _ _ _ _
           *      ^ *
           *    at * press backscape, move to ^
           */

          let findIndex = index - 1;

          if (inputCode[findIndex] === "") {
            for (
              findIndex = findIndex - 1;
              findIndex >= 0;
              findIndex = findIndex - 1
            ) {
              if (inputCode[findIndex] !== "") {
                break;
              }
            }
            findIndex = findIndex + 1;
          }

          inputCodeRefs[findIndex].current.focus();
        }
        break;
      }
      case "ArrowLeft":
      case "ArrowUp": {
        inputCodeRefs[(codeLength + index - 1) % codeLength].current.focus();
        break;
      }
      case "ArrowRight":
      case "ArrowDown": {
        inputCodeRefs[(index + 1) % codeLength].current.focus();
        break;
      }
      case "Enter": {
        if (inputCode.findIndex((v) => !v) === -1) {
          downloadCode(inputCode.join(""));
          setInputCode(new Array(codeLength).fill(""));
        }
        break;
      }
    }
  }

  function inputCodeInputHandler(e, index) {
    let inputData = e.nativeEvent.data;

    if (inputData === null) {
      const newInputCode = [...inputCode];
      newInputCode[index] = "";
      setInputCode(newInputCode);
      return;
    }

    if (inputData === " ") {
      inputCodeRefs[(index + 1) % codeLength].current.focus();
      return;
    }

    inputData = inputData.trim();
    const formatChecker = new RegExp(`^\\d{1,${codeLength}}$`);
    if (!formatChecker.test(inputData)) {
      return;
    }

    const newInputCode = [...inputCode];
    for (const inputChar of inputData) {
      if (index >= codeLength) {
        break;
      }
      newInputCode[index] = inputChar;
      index = index + 1;
    }

    setInputCode(newInputCode);

    if (index !== codeLength) {
      inputCodeRefs[index].current.focus();
    } else {
      const focusIndex = newInputCode.findIndex((v) => !v);
      if (focusIndex === -1) {
        downloadCode(newInputCode.join(""));
        setInputCode(new Array(codeLength).fill(""));
      } else {
        inputCodeRefs[focusIndex].current.focus();
      }
    }
  }

  function inputCodeFocusHandler(e) {
    setTimeout(() => {
      const length = e.target.value.length;
      e.target.setSelectionRange(length, length);
    }, 0);
  }

  return (
    <section className="receive-selector">
      <LoadingMask mask={isRequesting} />
      <div className="receive-selector-padding">
        <div className="receive-prompt">Enter Code</div>
        <div className="code-field">
          {new Array(codeLength).fill(0).map((_, index) => {
            return (
              <div className="code-input" key={index}>
                <input
                  type="text"
                  name={`Code ${index + 1}`}
                  inputMode="numeric"
                  ref={inputCodeRefs[index]}
                  value={inputCode[index]}
                  onKeyDown={(e) => inputCodeKeyDownHandler(e, index)}
                  onInput={(e) => inputCodeInputHandler(e, index)}
                  onFocus={inputCodeFocusHandler}
                  disabled={isRequesting}
                />
                <div className={inputCode[index] ? "input-filled" : ""}></div>
              </div>
            );
          })}
        </div>
      </div>
      <a style={{ display: "none" }} ref={downloadAnchor}></a>
    </section>
  );
}

export default function ReceiveSection() {
  return (
    <section className="receive-section">
      <ReceiveSelector />
      <ReceiveList />
    </section>
  );
}
