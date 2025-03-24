import React from "react";
import "./TransferTab.css";
import sectionList from "./sectionList";

export default function TransferTab({ selected, setSection }) {
  return (
    <section className="transfer-tab">
      {sectionList.map((sectionInfo, index) => {
        return (
          <button
            key={sectionInfo.tabName}
            onClick={(e) => {
              e.preventDefault();
              setSection(index);
            }}
            className={selected === index ? "tab-selected" : ""}
          >
            {sectionInfo.tabName}
          </button>
        );
      })}
    </section>
  );
}
