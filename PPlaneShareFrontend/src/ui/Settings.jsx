import React, { useEffect, useRef, useState } from "react";
import "./Settings.css";

export default function Settings({ existingConfig, closeSelf, modifyConfig }) {
  const configProps = ["serverAddr", "rtcConfig", "replyTimeout"];
  const [config, setConfig] = useState(existingConfig);
  const cancelRef = useRef();

  const stunServer =
    (config.rtcConfig.iceServers &&
      config.rtcConfig.iceServers[0] &&
      config.rtcConfig.iceServers[0].urls) ||
    "";

  function saveConfig() {
    configProps.forEach((prop) => {
      if (config[prop] !== existingConfig[prop]) {
        modifyConfig(prop, config[prop]);
      }
    });
    if (stunServer === "") {
      modifyConfig("rtcConfig", {});
    }
  }

  useEffect(() => {
    cancelRef.current.focus();
  }, []);

  return (
    <div className="settings-container">
      <section className="settings">
        <div className="settings-overflow">
          <div className="settings-field">
            <label htmlFor="settings-server-addr">Server Address:</label>
            <input
              type="text"
              id="settings-server-addr"
              value={config.serverAddr}
              placeholder="ws://IP:Port"
              onChange={(e) => {
                setConfig({
                  ...config,
                  serverAddr: e.target.value,
                });
              }}
            ></input>
          </div>
          <div className="settings-field">
            <label htmlFor="settings-rtc-config">RTC STUN Server:</label>
            <input
              type="text"
              id="settings-rtc-config"
              value={stunServer}
              placeholder="stun:IP:Port"
              onChange={(e) => {
                setConfig({
                  ...config,
                  rtcConfig: {
                    ...config.rtcConfig,
                    iceServers: [
                      {
                        urls: e.target.value,
                      },
                    ],
                  },
                });
              }}
            ></input>
          </div>
          <div className="settings-field">
            <label htmlFor="settings-reply-timeout">Reply Timeout:</label>
            <input
              type="text"
              id="settings-reply-timeout"
              value={config.replyTimeout}
              placeholder="timeout for reply (ms)"
              onChange={(e) => {
                setConfig({
                  ...config,
                  replyTimeout: e.target.value,
                });
              }}
            ></input>
          </div>
          <div className="settings-button-set">
            <button onClick={closeSelf} ref={cancelRef}>
              cancel
            </button>
            <button
              onClick={() => {
                saveConfig();
                closeSelf();
              }}
            >
              apply
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
