import "./App.css";
import { useDocumentTools } from "./hooks/useDocumentTools";
import { Toolbar } from "./components/Toolbar";
import { DocumentBody } from "./components/DocumentBody";
import { CommentRail } from "./components/CommentRail";

export default function App() {
  useDocumentTools();

  return (
    <div className="app">
      <Toolbar />
      <main className="app__main">
        <DocumentBody />
        <CommentRail />
      </main>
      <footer className="app__footer">
        Open this page in ChatGPT's in-app browser, or Chrome with{" "}
        <code>chrome://flags/#enable-webmcp-testing</code> enabled, and ask your agent to read, comment on, or
        extend this document.
      </footer>
    </div>
  );
}
