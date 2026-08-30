import { create } from "zustand";
import { nanoid } from "nanoid";
import { docSync, PERSON, type SyncMessage } from "./sync";

export type AuthorKind = "human" | "agent";

export interface PersonRef {
  id: string;
  name: string;
  color: string;
}

export interface Block {
  id: string;
  text: string;
  createdBy: AuthorKind;
  /** Present when createdBy === "human" — which tab/person wrote it. */
  author?: PersonRef;
}

export interface PendingBlock {
  id: string;
  text: string;
  afterBlockId: string | null;
  proposedBy: "agent";
  proposedAt: number;
}

export interface Comment {
  id: string;
  blockId: string;
  text: string;
  createdBy: AuthorKind;
  author?: PersonRef;
  createdAt: number;
  resolved: boolean;
}

interface DocState {
  blocks: Block[];
  pendingBlocks: PendingBlock[];
  comments: Comment[];

  /** This tab's own current selection. */
  selectedBlockId: string | null;
  /** Other tabs' selections, keyed by their person id — for presence display only. */
  remoteSelections: Record<string, string | null>;

  selectBlock: (id: string | null) => void;
  editBlock: (id: string, text: string) => void;
  deleteBlock: (id: string) => void;

  addComment: (blockId: string, text: string, createdBy?: AuthorKind) => Comment | null;
  resolveComment: (id: string) => boolean;

  /** Agent proposes new content — lands in pendingBlocks, not blocks, until a human accepts it. */
  proposeBlock: (text: string, afterBlockId?: string | null) => PendingBlock;
  acceptSuggestion: (id: string) => void;
  rejectSuggestion: (id: string) => void;

  /** Internal: apply a mutation that originated from another tab. Never call directly from UI/tools. */
  _applyRemote: (msg: SyncMessage) => void;
}

function insertAt(blocks: Block[], block: Block, afterBlockId?: string | null): Block[] {
  const idx = afterBlockId ? blocks.findIndex((b) => b.id === afterBlockId) : blocks.length - 1;
  const at = idx === -1 ? blocks.length : idx + 1;
  const next = [...blocks];
  next.splice(at, 0, block);
  return next;
}

const initialBlocks: Block[] = [
  { id: "title", text: "Q3 Launch Plan", createdBy: "human", author: PERSON },
  {
    id: "intro",
    text: "We're aiming to ship the redesigned onboarding flow by the end of the quarter. Below is the rough outline — flesh out each section.",
    createdBy: "human",
    author: PERSON,
  },
  { id: "section-1", text: "1. Problem statement", createdBy: "human", author: PERSON },
  { id: "section-2", text: "2. Proposed solution", createdBy: "human", author: PERSON },
  { id: "section-3", text: "3. Rollout plan", createdBy: "human", author: PERSON },
];

export const useDocStore = create<DocState>((set, get) => ({
  blocks: initialBlocks,
  pendingBlocks: [],
  comments: [],
  selectedBlockId: initialBlocks[2]?.id ?? null,
  remoteSelections: {},

  selectBlock: (id) => {
    set({ selectedBlockId: id });
    docSync.send("selectBlock", { personId: PERSON.id, blockId: id });
  },

  editBlock: (id, text) => {
    set((s) => ({ blocks: s.blocks.map((b) => (b.id === id ? { ...b, text } : b)) }));
    docSync.send("editBlock", { id, text });
  },

  deleteBlock: (id) => {
    set((s) => ({
      blocks: s.blocks.filter((b) => b.id !== id),
      comments: s.comments.filter((c) => c.blockId !== id),
    }));
    docSync.send("deleteBlock", { id });
  },

  addComment: (blockId, text, createdBy = "agent") => {
    const exists = get().blocks.some((b) => b.id === blockId);
    if (!exists) return null;
    const comment: Comment = {
      id: nanoid(8),
      blockId,
      text,
      createdBy,
      author: createdBy === "human" ? PERSON : undefined,
      createdAt: Date.now(),
      resolved: false,
    };
    set((s) => ({ comments: [...s.comments, comment] }));
    docSync.send("addComment", comment);
    return comment;
  },

  resolveComment: (id) => {
    const exists = get().comments.some((c) => c.id === id);
    if (!exists) return false;
    set((s) => ({ comments: s.comments.map((c) => (c.id === id ? { ...c, resolved: true } : c)) }));
    docSync.send("resolveComment", { id });
    return true;
  },

  proposeBlock: (text, afterBlockId = null) => {
    const pending: PendingBlock = {
      id: nanoid(8),
      text,
      afterBlockId: afterBlockId ?? null,
      proposedBy: "agent",
      proposedAt: Date.now(),
    };
    set((s) => ({ pendingBlocks: [...s.pendingBlocks, pending] }));
    docSync.send("proposeBlock", pending);
    return pending;
  },

  acceptSuggestion: (id) => {
    const pending = get().pendingBlocks.find((p) => p.id === id);
    if (!pending) return;
    const block: Block = { id: pending.id, text: pending.text, createdBy: "agent" };
    set((s) => ({
      blocks: insertAt(s.blocks, block, pending.afterBlockId),
      pendingBlocks: s.pendingBlocks.filter((p) => p.id !== id),
    }));
    docSync.send("acceptSuggestion", { id });
  },

  rejectSuggestion: (id) => {
    set((s) => ({ pendingBlocks: s.pendingBlocks.filter((p) => p.id !== id) }));
    docSync.send("rejectSuggestion", { id });
  },

  _applyRemote: (msg) => {
    switch (msg.type) {
      case "selectBlock": {
        const { personId, blockId } = msg.payload as { personId: string; blockId: string | null };
        set((s) => ({ remoteSelections: { ...s.remoteSelections, [personId]: blockId } }));
        break;
      }
      case "editBlock": {
        const { id, text } = msg.payload as { id: string; text: string };
        set((s) => ({ blocks: s.blocks.map((b) => (b.id === id ? { ...b, text } : b)) }));
        break;
      }
      case "deleteBlock": {
        const { id } = msg.payload as { id: string };
        set((s) => ({
          blocks: s.blocks.filter((b) => b.id !== id),
          comments: s.comments.filter((c) => c.blockId !== id),
        }));
        break;
      }
      case "addComment": {
        const comment = msg.payload as Comment;
        set((s) => (s.comments.some((c) => c.id === comment.id) ? s : { comments: [...s.comments, comment] }));
        break;
      }
      case "resolveComment": {
        const { id } = msg.payload as { id: string };
        set((s) => ({ comments: s.comments.map((c) => (c.id === id ? { ...c, resolved: true } : c)) }));
        break;
      }
      case "proposeBlock": {
        const pending = msg.payload as PendingBlock;
        set((s) =>
          s.pendingBlocks.some((p) => p.id === pending.id) ? s : { pendingBlocks: [...s.pendingBlocks, pending] }
        );
        break;
      }
      case "acceptSuggestion": {
        const { id } = msg.payload as { id: string };
        const pending = get().pendingBlocks.find((p) => p.id === id);
        if (!pending) break;
        const block: Block = { id: pending.id, text: pending.text, createdBy: "agent" };
        set((s) => ({
          blocks: insertAt(s.blocks, block, pending.afterBlockId),
          pendingBlocks: s.pendingBlocks.filter((p) => p.id !== id),
        }));
        break;
      }
      case "rejectSuggestion": {
        const { id } = msg.payload as { id: string };
        set((s) => ({ pendingBlocks: s.pendingBlocks.filter((p) => p.id !== id) }));
        break;
      }
    }
  },
}));

// Wire the sync layer to the store once, at module load.
docSync.subscribe((msg) => useDocStore.getState()._applyRemote(msg));

// Debug hooks — lets us inspect live state from the browser console while
// diagnosing cross-tab sync. Harmless to leave in for a hackathon project.
if (typeof window !== "undefined") {
  (window as unknown as { __docStore: typeof useDocStore }).__docStore = useDocStore;
  (window as unknown as { __docSync: typeof docSync }).__docSync = docSync;
}

export function getState() {
  return useDocStore.getState();
}
