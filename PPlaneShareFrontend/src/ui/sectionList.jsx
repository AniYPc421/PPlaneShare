import React from "react";
import ShareSection from "./ShareSection";
import ReceiveSection from "./ReceiveSection";

const sectionList = [
  { tabName: "Share", jsxComponent: <ShareSection /> },
  { tabName: "Receive", jsxComponent: <ReceiveSection /> },
];

export default sectionList;
