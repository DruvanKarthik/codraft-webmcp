import { useEffect, useRef } from "react";
import { useDocStore } from "../store";
import { PERSON } from "../sync";

export function DocumentBody() {
  const blocks = useDocStore((s) => s.blocks);
  const pendingBlocks = useDocStore((s) => s.pendingBlocks);
  const selectedBlockId = useDocStore((s) => s.selectedBlockId);
  const remoteSelections = useDocStore((s) => s.remoteSelections);
  const selectBlock = useDocStore((s) => s.selectBlock);
  const editBlock = useDocStore((s) => s.editBlock);
  const comments = useDocStore((s) => s.comments);
  const acceptSuggestion = useDocStore((s) => s.acceptSuggestion);
  const rejectSuggestion = useDocStore((s) => s.rejectSuggestion);

  // Which remote person(s), if any, currently have a given block selected.
  const remoteSelectorsFor = (blockId: string) =>
    Object.entries(remoteSelections).filter(([, selected]) => selected === blockId);

  return (
    <div className="doc-body">
      {blocks.map((block, i) => {
        const isTitle = i === 0;
        const isSelected = block.id === selectedBlockId;
        const commentCount = comments.filter((c) => c.blockId === block.id && !c.resolved).length;
        const remoteSelectors = remoteSelectorsFor(block.id);
        const isAgent = block.createdBy === "agent";
        const authorColor = block.author?.color ?? PERSON.color;

        return (
          <div key={block.id}>
            <div
              className={`block-row ${isSelected ? "block-row--selected" : ""} ${
                isAgent ? "block-row--agent" : ""
              }`}
              style={!isAgent && isSelected ? { borderLeftColor: authorColor } : undefined}
              onClick={() => selectBlock(block.id)}
            >
              <div className="block-gutter">
                {isAgent && (
                  <span className="agent-badge" title="Added by agent">
                    🤖
                  </span>
                )}
                {commentCount > 0 && <span className="comment-badge">{commentCount}</span>}
              </div>
              <div className="block-main">
                {!isTitle && block.createdBy === "human" && block.author && (
                  <span className="author-tag" style={{ color: block.author.color }}>
                    {block.author.name}
                  </span>
                )}
                {isAgent && <span className="author-tag author-tag--agent">Agent</span>}
                <EditableBlockText
                  text={block.text}
                  className={isTitle ? "block-title" : "block-text"}
                  onFocus={() => selectBlock(block.id)}
                  onCommit={(text) => editBlock(block.id, text)}
                />
                {remoteSelectors.length > 0 && (
                  <div className="presence-row">
                    {remoteSelectors.map(([personId]) => (
                      <span key={personId} className="presence-dot" title="Someone else is viewing this block" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {pendingBlocks
              .filter((p) => p.afterBlockId === block.id)
              .map((p) => (
                <PendingRow key={p.id} text={p.text} onAccept={() => acceptSuggestion(p.id)} onReject={() => rejectSuggestion(p.id)} />
              ))}
          </div>
        );
      })}

      {pendingBlocks
        .filter((p) => !p.afterBlockId || !blocks.some((b) => b.id === p.afterBlockId))
        .map((p) => (
          <PendingRow key={p.id} text={p.text} onAccept={() => acceptSuggestion(p.id)} onReject={() => rejectSuggestion(p.id)} />
        ))}
    </div>
  );
}

/**
 * A contentEditable div whose text is kept in sync with an external string
 * (`text`) that can change from sources other than local typing — e.g. a
 * BroadcastChannel update from another tab, or an agent's edit.
 *
 * React does not reliably re-render a contentEditable element's DOM content
 * when its children prop changes, because the browser (not React) owns that
 * subtree once it's editable. So instead of relying on React's diffing, we
 * imperatively set `element.textContent` in an effect whenever `text`
 * changes — but only when the element isn't currently focused, so we never
 * clobber a human who is actively typing in it.
 */
/** Convert a contentEditable element's DOM structure (nested <div>/<br> per line) into a plain string with real newlines, since `textContent` alone collapses all lines together. */
function readMultilineText(el: HTMLElement): string {
  const html = el.innerHTML
    .replace(/<div><br\s*\/?><\/div>/gi, "\n")
    .replace(/<\/div>\s*<div>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?div>/gi, "")
    .replace(/&nbsp;/gi, " ");
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent ?? "").replace(/\u00a0/g, " ");
}

function EditableBlockText({
  text,
  className,
  onFocus,
  onCommit,
}: {
  text: string;
  className: string;
  onFocus: () => void;
  onCommit: (text: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return; // don't clobber active local edits
    if (el.textContent !== text) {
      // Render each line as its own text node separated by <br>, so multi-line
      // text displays correctly and re-editing produces consistent line breaks.
      el.innerHTML = "";
      text.split("\n").forEach((line, i) => {
        if (i > 0) el.appendChild(document.createElement("br"));
        el.appendChild(document.createTextNode(line));
      });
    }
  }, [text]);

  return (
    <div
      ref={ref}
      className={className}
      contentEditable
      suppressContentEditableWarning
      onFocus={onFocus}
      onBlur={(e) => onCommit(readMultilineText(e.currentTarget))}
    />
  );
}

function PendingRow({ text, onAccept, onReject }: { text: string; onAccept: () => void; onReject: () => void }) {
  return (
    <div className="pending-row">
      <div className="block-gutter">
        <span className="agent-badge" title="Proposed by agent, awaiting approval">
          🤖
        </span>
      </div>
      <div className="pending-row__body">
        <span className="author-tag author-tag--agent">Agent suggestion</span>
        <p className="pending-row__text">{text}</p>
        <div className="pending-row__actions">
          <button className="pending-row__accept" onClick={onAccept}>
            ✓ Accept
          </button>
          <button className="pending-row__reject" onClick={onReject}>
            ✗ Reject
          </button>
        </div>
      </div>
    </div>
  );
}
