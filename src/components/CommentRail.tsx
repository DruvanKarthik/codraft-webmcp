import { useDocStore } from "../store";

export function CommentRail() {
  const comments = useDocStore((s) => s.comments);
  const blocks = useDocStore((s) => s.blocks);
  const resolveComment = useDocStore((s) => s.resolveComment);
  const selectBlock = useDocStore((s) => s.selectBlock);

  const open = comments.filter((c) => !c.resolved);
  const resolved = comments.filter((c) => c.resolved);

  return (
    <aside className="comment-rail">
      <div className="comment-rail__header">Comments</div>
      {comments.length === 0 && (
        <p className="comment-rail__empty">
          No comments yet. Ask your agent to review a section and leave feedback with <code>add_comment</code>.
        </p>
      )}
      <ul className="comment-rail__list">
        {open
          .slice()
          .reverse()
          .map((c) => {
            const block = blocks.find((b) => b.id === c.blockId);
            return (
              <li
                key={c.id}
                className={`comment-card ${c.createdBy === "agent" ? "comment-card--agent" : ""}`}
                onClick={() => selectBlock(c.blockId)}
              >
                <div className="comment-card__meta">
                  <span
                    className={`author-pill author-pill--${c.createdBy}`}
                    style={c.createdBy === "human" && c.author ? { background: c.author.color, color: "#fff" } : undefined}
                  >
                    {c.createdBy === "agent" ? "🤖 Agent" : c.author?.name ?? "You"}
                  </span>
                  <span className="comment-card__ref">on "{(block?.text ?? "").slice(0, 28) || "deleted block"}…"</span>
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

      {resolved.length > 0 && (
        <>
          <div className="comment-rail__header comment-rail__header--resolved">Resolved</div>
          <ul className="comment-rail__list">
            {resolved
              .slice()
              .reverse()
              .map((c) => (
                <li key={c.id} className="comment-card comment-card--resolved">
                  <div className="comment-card__meta">
                    <span className={`author-pill author-pill--${c.createdBy}`}>
                      {c.createdBy === "agent" ? "🤖 Agent" : c.author?.name ?? "You"}
                    </span>
                  </div>
                  <p className="comment-card__text">{c.text}</p>
                </li>
              ))}
          </ul>
        </>
      )}
    </aside>
  );
}
