import React from "react";
import "./ProgressBar.css";

export default function ProgressBar({ value, max, label = "Progress" }) {
  const precentage = value / max;

  return (
    <div className="progress-bar">
      <div
        className="progress-bar-value"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        style={{ width: `${precentage * 100}%` }}
      ></div>
    </div>
  );
}
