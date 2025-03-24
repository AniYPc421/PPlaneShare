import React, { useEffect, useState } from "react";
import Header from "./Header";
import TransferSection from "./TransferSection";
import {
  TransferManagerContext,
  TransferExternalNotifierContext,
} from "./transferContext";
import TransferManager from "../transferLogic/TransferManager.js";
import TransferExternalNotifier from "../transferLogic/TransferExternalNotifier.js";
import Notifier from "./widgets/Notifier.jsx";
import Settings from "./Settings.jsx";
import NotifyContext from "./NotifyContext.jsx";

const hostname = window.location.hostname;
const port = window.location.port;
const defaultServerAddr = `ws://${hostname}:${port}`;

const transferExternalNotifier = new TransferExternalNotifier();

const savedConfig = {
  serverAddr: defaultServerAddr,
  rtcConfig: {},
  replyTimeout: 5000,
};

export default function App() {
  const [serverAddr, setServerAddr] = useState(savedConfig.serverAddr);
  const [transferManager, setTransferManager] = useState(null);

  const [notifications, setNotifications] = useState([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  function notify(message) {
    const currentTime = Date.now();

    function removeFromNotifications() {
      setNotifications((notifications) => {
        return notifications.filter((v) => {
          return v.id !== currentTime;
        });
      });
    }

    const timeoutId = setTimeout(removeFromNotifications, 5000);

    setNotifications((notifications) => {
      return [
        ...notifications,
        {
          id: currentTime,
          message,
          removeSelf: function () {
            removeFromNotifications();
            clearTimeout(timeoutId);
          },
        },
      ];
    });
  }

  const modifyConfig = (prop, value) => {
    switch (prop) {
      case "serverAddr": {
        savedConfig.serverAddr = value;
        setServerAddr(value);
        break;
      }
      case "rtcConfig": {
        savedConfig.rtcConfig = value;
        transferManager.setRtcConfig(value);
        break;
      }
      case "replyTimeout": {
        savedConfig.replyTimeout = value;
        transferManager.setReplyTimeout(value);
        break;
      }
      default: {
        notify("unknown setting");
        break;
      }
    }
  };

  useEffect(() => {
    const newTransferManager = new TransferManager(
      serverAddr,
      transferExternalNotifier,
      (e) => {
        notify(e.message);
      },
      {
        rtcConfig: savedConfig.rtcConfig,
        replyTimeout: savedConfig.replyTimeout,
      }
    );
    setTransferManager(newTransferManager);

    return () => {
      newTransferManager.destroy();
    };
  }, [serverAddr]);

  return (
    <TransferManagerContext value={transferManager}>
      <TransferExternalNotifierContext value={transferExternalNotifier}>
        <NotifyContext value={notify}>
          <Header
            openSettings={() => {
              setIsSettingsOpen(true);
            }}
          />
          <TransferSection />
          {isSettingsOpen && (
            <Settings
              existingConfig={savedConfig}
              closeSelf={() => setIsSettingsOpen(false)}
              modifyConfig={modifyConfig}
            />
          )}
        </NotifyContext>
        <Notifier notifications={notifications} />
      </TransferExternalNotifierContext>
    </TransferManagerContext>
  );
}
