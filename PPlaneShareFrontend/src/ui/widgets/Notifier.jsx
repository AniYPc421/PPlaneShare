import React from "react";
import "./Notifier.css";

function Notification({ message, removeSelf }) {
  return (
    <div className="notifier-notification">
      <button
        onClick={(e) => {
          e.preventDefault();
          removeSelf();
        }}
      >
        x
      </button>
      {message}
    </div>
  );
}

export default function Notifier({ notifications }) {
  return (
    <div className="notifier-container">
      {notifications.length > 0 && (
        <ul>
          {notifications.map((notification) => {
            return (
              <li key={notification.id}>
                <Notification
                  message={notification.message}
                  removeSelf={notification.removeSelf}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
