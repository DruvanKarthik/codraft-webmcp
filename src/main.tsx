import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Polyfills document.modelContext when the browser doesn't natively support
// WebMCP yet (e.g. plain Chrome/Safari during local dev). Chrome 149+ with
// the WebMCP flag enabled, and ChatGPT's in-app browser, provide this
// natively and this import becomes a no-op passthrough.
import "@mcp-b/global";

import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
