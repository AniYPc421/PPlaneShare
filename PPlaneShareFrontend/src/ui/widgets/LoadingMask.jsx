import React from "react";
import "./LoadingMask.css";
import "./fadeAnimation.css";
import CSSTransitionWithRef from "./CSSTransitionWithRef";

export default function LoadingMask({ mask }) {
  return (
    <CSSTransitionWithRef
      in={mask}
      timeout={300}
      classNames="fade"
      unmountOnExit
    >
      <div className={`loading-mask`}>
        <div></div>
      </div>
    </CSSTransitionWithRef>
  );
}
