import { useState } from "react";
import { useDocStore } from "../store";
import { PERSON } from "../sync";
import { exportMarkdown, exportPdf } from "../export";

function checkWebMCPSupport(): boolean {
  return typeof document !== "undefined" && "modelContext" in document;
}

export function Toolbar() {
  const [supported] = useState<boolean>(checkWebMCPSupport);
  const [exportOpen, setExportOpen] = useState(false);
  const selectedBlockId = useDocStore((s) => s.selectedBlockId);
  const blocks = useDocStore((s) => s.blocks);
  const comments = useDocStore((s) => s.comments);

  return (
    <header className="toolbar">
      <div className="toolbar__brand">
        <span className="toolbar__mark">◐</span>
        <span>Co/Draft</span>
      </div>
      <div className="toolbar__status">
        <span className={`status-dot ${supported ? "status-dot--on" : "status-dot--off"}`} />
        {supported ? "5 tools registered on document.modelContext" : "WebMCP not detected in this browser"}
      </div>
      <div className="toolbar__person">
        You are <span style={{ color: PERSON.color, fontWeight: 600 }}>{PERSON.name}</span> in this tab
      </div>
      <div className="toolbar__selection">
        {selectedBlockId ? (
          <span>
            Selected block: <code>{selectedBlockId}</code>
          </span>
        ) : (
          <span>No block selected</span>
        )}
      </div>
      <div className="toolbar__export">
        <button className="export-button" onClick={() => setExportOpen((v) => !v)}>
          Export ▾
        </button>
        {exportOpen && (
          <div className="export-menu" onMouseLeave={() => setExportOpen(false)}>
            <button
              onClick={() => {
                exportMarkdown(blocks, comments);
                setExportOpen(false);
              }}
            >
              Export as Markdown (.md)
            </button>
            <button
              onClick={() => {
                exportPdf(blocks, comments);
                setExportOpen(false);
              }}
            >
              Export as PDF
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
