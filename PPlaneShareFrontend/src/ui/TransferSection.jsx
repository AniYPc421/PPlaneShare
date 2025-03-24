import React, { useState } from "react";
import TransferTab from "./TransferTab";
import sectionList from "./sectionList";
import "./TransferSection.css";

export default function TransferSection() {
  const [section, setSection] = useState(0);
  return (
    <main>
      <div>
        <TransferTab selected={section} setSection={setSection} />
        {sectionList[section].jsxComponent}
      </div>
    </main>
  );
}
