import { useDocStore } from "../store";

export function DocumentBody() {
  const blocks = useDocStore((s) => s.blocks);
  const selectedBlockId = useDocStore((s) => s.selectedBlockId);
  const selectBlock = useDocStore((s) => s.selectBlock);
  const editBlock = useDocStore((s) => s.editBlock);
  const comments = useDocStore((s) => s.comments);

  return (
    <div className="doc-body">
      {blocks.map((block, i) => {
        const isTitle = i === 0;
        const isSelected = block.id === selectedBlockId;
        const commentCount = comments.filter((c) => c.blockId === block.id).length;

        return (
          <div
            key={block.id}
            className={`block-row ${isSelected ? "block-row--selected" : ""} ${
              block.createdBy === "agent" ? "block-row--agent" : ""
            }`}
            onClick={() => selectBlock(block.id)}
          >
            <div className="block-gutter">
              {block.createdBy === "agent" && <span className="agent-dot" title="Added by agent" />}
              {commentCount > 0 && <span className="comment-badge">{commentCount}</span>}
            </div>
            <div
              className={isTitle ? "block-title" : "block-text"}
              contentEditable
              suppressContentEditableWarning
              onFocus={() => selectBlock(block.id)}
              onBlur={(e) => editBlock(block.id, e.currentTarget.textContent ?? "")}
            >
              {block.text}
            </div>
          </div>
        );
      })}
    </div>
  );
}
