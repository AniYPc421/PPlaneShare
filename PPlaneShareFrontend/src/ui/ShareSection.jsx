import React, { useEffect, useRef, useContext, useState } from "react";
import "./ShareSection.css";
import {
  TransferManagerContext,
  TransferExternalNotifierContext,
} from "./transferContext";
import getReadableSizeFromBytes from "../utils/readableSize";
import LoadingMask from "./widgets/LoadingMask";
import NotifyContext from "./NotifyContext";

function unpackShareInfo(shareInfo) {
  return [...shareInfo].map(([code, codeInfo]) => {
    return [
      code,
      {
        ...codeInfo,
        channels: [...codeInfo.channels],
      },
    ];
  });
}

function ShareListItemFileDetail({ fileName, fileBytes }) {
  const fileSize = getReadableSizeFromBytes(fileBytes);
  return (
    <div className="share-file-detail">
      <p>{fileName}</p>
      <p>{fileSize}</p>
    </div>
  );
}

function ShareListItem({ code, codeInfo, removeSelf }) {
  const transferManager = useContext(TransferManagerContext);
  const transferExternalNotifier = useContext(TransferExternalNotifierContext);
  const notify = useContext(NotifyContext);

  function deleteCode() {
    transferManager.delete(code);
    transferExternalNotifier.deleteShareCode(code);
    removeSelf();
  }

  function copyCode() {
    navigator.clipboard
      .writeText(code)
      .then(() => notify("copied!"))
      .catch((e) => notify(`failed to copy code: ${e.message}`));
  }

  for (const [index, channelPair] of codeInfo.channels.entries()) {
    const channelInfo = channelPair[1];
    if (channelInfo.status !== "transfering") {
      codeInfo.channels.splice(index, 1);
    }
  }

  const connectionCount = codeInfo.channels.length;

  const originFiles = codeInfo.files;
  const files = [];
  for (let index = 0; index < originFiles.length; index = index + 1) {
    files.push({
      fileName: originFiles[index].name,
      fileBytes: originFiles[index].size,
    });
  }

  return (
    <div className="share-list-item" onClick={copyCode}>
      <div className="share-list-item-header">
        <h3>{code}</h3>
        <p>
          {connectionCount} peer{connectionCount <= 1 ? "" : "s"}
        </p>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            deleteCode();
          }}
        >
          delete
        </button>
      </div>
      <ul>
        {files.map(({ fileName, fileBytes }, index) => {
          return (
            <li key={`${code}_${index}`}>
              <ShareListItemFileDetail
                fileName={fileName}
                fileBytes={fileBytes}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ShareList() {
  const transferExternalNotifier = useContext(TransferExternalNotifierContext);
  const [shareList, setShareList] = useState([]);

  useEffect(() => {
    const updateShareList = () => {
      const originalShareList = transferExternalNotifier.share;
      const unpackedShareInfo = unpackShareInfo(originalShareList);
      setShareList(unpackedShareInfo);
    };

    updateShareList();

    const intervalId = setInterval(updateShareList, 500);

    return () => {
      clearInterval(intervalId);
    };
  }, [transferExternalNotifier]);

  return (
    <section className="share-list">
      <h2>Share List</h2>
      {!shareList.length ? (
        <p>There are currently no sharing files.</p>
      ) : (
        <ul>
          {shareList.map(([code, codeInfo], index) => {
            return (
              <li key={code}>
                <ShareListItem
                  code={code}
                  codeInfo={codeInfo}
                  removeSelf={() => {
                    setShareList(
                      shareList.filter((_, compIndex) => {
                        return index !== compIndex;
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

function ShareSelector() {
  const inputRef = useRef();
  const transferManager = useContext(TransferManagerContext);

  const [dragOver, setDragOver] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  function allocateCode(files) {
    setIsRequesting(true);
    transferManager.allocate(files).then(() => {
      setIsRequesting(false);
    });
  }

  function selectFile() {
    const files = inputRef.current.files;
    if (files.length !== 0) {
      allocateCode(files);
    }
  }

  return (
    <section className="share-selector">
      <LoadingMask mask={isRequesting} />
      <div className="share-selector-padding">
        <div
          className="share-selector-drag-section"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          onDragEnd={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            allocateCode(e.dataTransfer.files);
          }}
        >
          <div
            className={`drag-prompt` + (dragOver ? " drag-over" : "")}
            aria-hidden="true"
          >
            Drag Here
          </div>
          <p>Drag here</p>
          <p>&nbsp;or&nbsp;</p>
          <label
            htmlFor="file-selector"
            tabIndex="0"
            onKeyDown={(e) => {
              if (["Enter", " "].includes(e.key)) {
                e.preventDefault();
                e.target.click();
              }
            }}
          >
            select a file
          </label>
          <input
            type="file"
            id="file-selector"
            ref={inputRef}
            onChange={selectFile}
            disabled={isRequesting}
            multiple
          />
        </div>
      </div>
    </section>
  );
}

export default function ShareSection() {
  return (
    <section className="share-section">
      <ShareSelector />
      <ShareList />
    </section>
  );
}
