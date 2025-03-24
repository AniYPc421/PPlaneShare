import React from "react";
import "./Header.css";

export default function Header({ openSettings }) {
  return (
    <header>
      <div>
        <img src="./logo.png" alt="PPlaneShare Logo" />
        <h1>PPlaneShare</h1>
      </div>
      <button onClick={openSettings}>Settings</button>
    </header>
  );
}
