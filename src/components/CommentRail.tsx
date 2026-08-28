import { useDocStore } from "../store";

export function CommentRail() {
  const comments = useDocStore((s) => s.comments);
  const blocks = useDocStore((s) => s.blocks);
  const resolveComment = useDocStore((s) => s.resolveComment);
  const selectBlock = useDocStore((s) => s.selectBlock);

  return (
    <aside className="comment-rail">
      <div className="comment-rail__header">Comments</div>
      {comments.length === 0 && (
        <p className="comment-rail__empty">
          No comments yet. Ask your agent to review a section and leave feedback with <code>add_comment</code>.
        </p>
      )}
      <ul className="comment-rail__list">
        {comments
          .slice()
          .reverse()
          .map((c) => {
            const block = blocks.find((b) => b.id === c.blockId);
            return (
              <li key={c.id} className="comment-card" onClick={() => selectBlock(c.blockId)}>
                <div className="comment-card__meta">
                  <span className={`author-pill author-pill--${c.createdBy}`}>
                    {c.createdBy === "agent" ? "Agent" : "You"}
                  </span>
                  <span className="comment-card__ref">on “{(block?.text ?? "").slice(0, 28) || "deleted block"}…”</span>
                </div>
                <p className="comment-card__text">{c.text}</p>
                <button
                  className="comment-card__resolve"
                  onClick={(e) => {
                    e.stopPropagation();
                    resolveComment(c.id);
                  }}
                >
                  Resolve
                </button>
              </li>
            );
          })}
      </ul>
    </aside>
  );
}
