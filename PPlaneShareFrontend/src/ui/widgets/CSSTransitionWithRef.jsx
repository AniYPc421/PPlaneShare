import { cloneElement, useRef } from "react";
import { CSSTransition } from "react-transition-group";

export default function CSSTransitionWithRef({ children, ...restProps }) {
  const ref = useRef();

  const setRef = (value) => {
    ref.current = value;
  };

  return (
    <CSSTransition nodeRef={ref} {...restProps}>
      {cloneElement(children, { ref: setRef })}
    </CSSTransition>
  );
}
