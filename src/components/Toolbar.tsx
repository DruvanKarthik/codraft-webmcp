import { useEffect, useState } from "react";
import { useDocStore } from "../store";

export function Toolbar() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const selectedBlockId = useDocStore((s) => s.selectedBlockId);

  useEffect(() => {
    const available = typeof document !== "undefined" && "modelContext" in document;
    setSupported(available);
  }, []);

  return (
    <header className="toolbar">
      <div className="toolbar__brand">
        <span className="toolbar__mark">◐</span>
        <span>Co/Draft</span>
      </div>
      <div className="toolbar__status">
        <span className={`status-dot ${supported ? "status-dot--on" : "status-dot--off"}`} />
        {supported === null
          ? "Checking WebMCP support…"
          : supported
          ? "4 tools registered on document.modelContext"
          : "WebMCP not detected in this browser"}
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
    </header>
  );
}
