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
                <div
                  className={isTitle ? "block-title" : "block-text"}
                  contentEditable
                  suppressContentEditableWarning
                  onFocus={() => selectBlock(block.id)}
                  onBlur={(e) => editBlock(block.id, e.currentTarget.textContent ?? "")}
                >
                  {block.text}
                </div>
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
