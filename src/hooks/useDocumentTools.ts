import { useWebMCP } from "usewebmcp";
import { useDocStore } from "../store";

/**
 * Registers this page's WebMCP tools with document.modelContext.
 *
 * Any agent attached to this tab (ChatGPT's in-app browser, Chrome with
 * WebMCP enabled, etc.) can discover and call these tools directly against
 * the same live state the human sees on screen — no DOM scraping, no
 * screenshots.
 */
export function useDocumentTools() {
  const blocks = useDocStore((s) => s.blocks);
  const comments = useDocStore((s) => s.comments);
  const selectedBlockId = useDocStore((s) => s.selectedBlockId);
  const insertBlock = useDocStore((s) => s.insertBlock);
  const addComment = useDocStore((s) => s.addComment);
  const selectBlock = useDocStore((s) => s.selectBlock);

  // 1. Read tool: give the agent the full, structured document state.
  useWebMCP(
    {
      name: "get_document_state",
      description:
        "Get the full current state of the shared document: every block (id, text, author) in order, and every open comment (id, the block it's attached to, text, author). Call this before inserting content or commenting so you know current block ids.",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                blocks: blocks.map((b) => ({ id: b.id, text: b.text, createdBy: b.createdBy })),
                comments: comments.map((c) => ({
                  id: c.id,
                  blockId: c.blockId,
                  text: c.text,
                  createdBy: c.createdBy,
                })),
              },
              null,
              2
            ),
          },
        ],
      }),
    },
    [blocks, comments]
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

  // 3. Write tool: agent adds new content to the document.
  useWebMCP(
    {
      name: "insert_block",
      description:
        "Insert a new paragraph/block of text into the shared document, placed immediately after the given block id (or at the end if no id is given). Returns the new block's id. The inserted block appears live in the human's editor immediately.",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string", description: "The text content of the new block." },
          afterBlockId: {
            type: "string",
            description: "Id of the block to insert after. Omit to append at the end.",
          },
        },
        required: ["text"],
      } as const,
      execute: async ({ text, afterBlockId }) => {
        const block = insertBlock(text, afterBlockId ?? null, "agent");
        return {
          content: [{ type: "text", text: `Inserted block ${block.id}: "${block.text}"` }],
        };
      },
    },
    [insertBlock]
  );

  // 4. Write tool: agent leaves a comment tied to a specific block.
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
        const exists = blocks.some((b) => b.id === blockId);
        if (!exists) {
          return {
            content: [{ type: "text", text: `No block with id "${blockId}". Call get_document_state first.` }],
            isError: true,
          };
        }
        const comment = addComment(blockId, text, "agent");
        selectBlock(blockId);
        return {
          content: [{ type: "text", text: `Added comment ${comment.id} on block ${blockId}.` }],
        };
      },
    },
    [blocks, addComment, selectBlock]
  );
}
