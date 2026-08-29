import { useWebMCP } from "usewebmcp";
import { useDocStore } from "../store";

/**
 * Registers this page's WebMCP tools with document.modelContext.
 *
 * Any agent attached to this tab (ChatGPT's in-app browser, Chrome with
 * WebMCP enabled, etc.) can discover and call these tools directly against
 * the same live state the human sees on screen — no DOM scraping, no
 * screenshots.
 *
 * `insert_block` does NOT write directly into the document. It creates a
 * pending suggestion that a human must accept (via the ✓/✗ controls in the
 * UI) before it becomes part of the shared document — a trust boundary for
 * agent writes that mutate actual content. `add_comment` stays a direct
 * write since comments are low-risk, additive, and easy to resolve or ignore.
 */
export function useDocumentTools() {
  const blocks = useDocStore((s) => s.blocks);
  const pendingBlocks = useDocStore((s) => s.pendingBlocks);
  const comments = useDocStore((s) => s.comments);
  const selectedBlockId = useDocStore((s) => s.selectedBlockId);
  const proposeBlock = useDocStore((s) => s.proposeBlock);
  const addComment = useDocStore((s) => s.addComment);
  const resolveComment = useDocStore((s) => s.resolveComment);
  const selectBlock = useDocStore((s) => s.selectBlock);

  // 1. Read tool: give the agent the full, structured document state.
  useWebMCP(
    {
      name: "get_document_state",
      description:
        "Get the full current state of the shared document: every block (id, text, author) in order, every pending agent-proposed block awaiting human approval, and every comment (id, the block it's attached to, text, author, resolved status). Call this before proposing content or commenting so you know current block ids.",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                blocks: blocks.map((b) => ({
                  id: b.id,
                  text: b.text,
                  createdBy: b.createdBy,
                  authorName: b.author?.name,
                })),
                pendingBlocks: pendingBlocks.map((p) => ({
                  id: p.id,
                  text: p.text,
                  afterBlockId: p.afterBlockId,
                  status: "awaiting human approval",
                })),
                comments: comments.map((c) => ({
                  id: c.id,
                  blockId: c.blockId,
                  text: c.text,
                  createdBy: c.createdBy,
                  authorName: c.author?.name,
                  resolved: c.resolved,
                })),
              },
              null,
              2
            ),
          },
        ],
      }),
    },
    [blocks, pendingBlocks, comments]
  );

  // 2. Read tool: what has the human actually got selected right now?
  useWebMCP(
    {
      name: "get_selection",
      description:
        "Get the block the human currently has selected/focused in the document, if any. Use this to understand what the human is working on before commenting or editing nearby.",
      inputSchema: { type: "object", properties: {} },
      execute: async () => {
        const block = blocks.find((b) => b.id === selectedBlockId) ?? null;
        return {
          content: [
            {
              type: "text",
              text: block
                ? JSON.stringify({ selectedBlockId: block.id, text: block.text })
                : JSON.stringify({ selectedBlockId: null }),
            },
          ],
        };
      },
    },
    [blocks, selectedBlockId]
  );

  // 3. Write tool: agent proposes new content. This creates a pending
  // suggestion that a human must accept before it appears in the document.
  useWebMCP(
    {
      name: "insert_block",
      description:
        "Propose a new paragraph/block of text to insert into the shared document, placed immediately after the given block id (or at the end if no id is given). This creates a pending suggestion that a human must accept before it appears in the document — it does not write directly. Returns the pending suggestion's id.",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "The text content of the proposed block." },
          afterBlockId: {
            type: "string",
            description: "Id of the block to insert after. Omit to append at the end.",
          },
        },
        required: ["text"],
      } as const,
      execute: async ({ text, afterBlockId }) => {
        const pending = proposeBlock(text, afterBlockId ?? null);
        return {
          content: [
            {
              type: "text",
              text: `Proposed block ${pending.id}: "${pending.text}". Awaiting human approval before it appears in the document.`,
            },
          ],
        };
      },
    },
    [proposeBlock]
  );

  // 4. Write tool: agent leaves a comment tied to a specific block. Direct write.
  useWebMCP(
    {
      name: "add_comment",
      description:
        "Add a review comment attached to a specific block id in the shared document. Use get_document_state or get_selection first to find the right block id. The comment appears live in the human's comment rail immediately.",
      inputSchema: {
        type: "object",
        properties: {
          blockId: { type: "string", description: "Id of the block to comment on." },
          text: { type: "string", description: "The comment text." },
        },
        required: ["blockId", "text"],
      } as const,
      execute: async ({ blockId, text }) => {
        const comment = addComment(blockId, text, "agent");
        if (!comment) {
          return {
            content: [{ type: "text", text: `No block with id "${blockId}". Call get_document_state first.` }],
            isError: true,
          };
        }
        selectBlock(blockId);
        return {
          content: [{ type: "text", text: `Added comment ${comment.id} on block ${blockId}.` }],
        };
      },
    },
    [addComment, selectBlock]
  );

  // 5. Write tool: agent marks its own (or any open) comment as resolved
  // once its feedback has been addressed.
  useWebMCP(
    {
      name: "resolve_comment",
      description:
        "Mark an open comment as resolved once its feedback has been addressed. Use get_document_state first to find the comment id.",
      inputSchema: {
        type: "object",
        properties: {
          commentId: { type: "string", description: "Id of the comment to resolve." },
        },
        required: ["commentId"],
      } as const,
      execute: async ({ commentId }) => {
        const ok = resolveComment(commentId);
        if (!ok) {
          return {
            content: [{ type: "text", text: `No comment with id "${commentId}". Call get_document_state first.` }],
            isError: true,
          };
        }
        return { content: [{ type: "text", text: `Resolved comment ${commentId}.` }] };
      },
    },
    [resolveComment]
  );
}
