import { create } from "zustand";
import { nanoid } from "nanoid";

export type Author = "human" | "agent";

export interface Block {
  id: string;
  text: string;
  createdBy: Author;
}

export interface Comment {
  id: string;
  blockId: string;
  text: string;
  createdBy: Author;
  createdAt: number;
}

interface DocState {
  blocks: Block[];
  comments: Comment[];
  selectedBlockId: string | null;

  selectBlock: (id: string | null) => void;
  editBlock: (id: string, text: string) => void;
  insertBlock: (text: string, afterBlockId?: string | null, createdBy?: Author) => Block;
  deleteBlock: (id: string) => void;
  addComment: (blockId: string, text: string, createdBy?: Author) => Comment;
  resolveComment: (id: string) => void;
}

const initialBlocks: Block[] = [
  { id: nanoid(8), text: "Q3 Launch Plan", createdBy: "human" },
  {
    id: nanoid(8),
    text: "We're aiming to ship the redesigned onboarding flow by the end of the quarter. Below is the rough outline — flesh out each section.",
    createdBy: "human",
  },
  { id: nanoid(8), text: "1. Problem statement", createdBy: "human" },
  { id: nanoid(8), text: "2. Proposed solution", createdBy: "human" },
  { id: nanoid(8), text: "3. Rollout plan", createdBy: "human" },
];

export const useDocStore = create<DocState>((set) => ({
  blocks: initialBlocks,
  comments: [],
  selectedBlockId: initialBlocks[2]?.id ?? null,

  selectBlock: (id) => set({ selectedBlockId: id }),

  editBlock: (id, text) =>
    set((s) => ({
      blocks: s.blocks.map((b) => (b.id === id ? { ...b, text } : b)),
    })),

  insertBlock: (text, afterBlockId, createdBy = "agent") => {
    const block: Block = { id: nanoid(8), text, createdBy };
    set((s) => {
      const idx = afterBlockId ? s.blocks.findIndex((b) => b.id === afterBlockId) : s.blocks.length - 1;
      const insertAt = idx === -1 ? s.blocks.length : idx + 1;
      const blocks = [...s.blocks];
      blocks.splice(insertAt, 0, block);
      return { blocks, selectedBlockId: block.id };
    });
    return block;
  },

  deleteBlock: (id) =>
    set((s) => ({
      blocks: s.blocks.filter((b) => b.id !== id),
      comments: s.comments.filter((c) => c.blockId !== id),
    })),

  addComment: (blockId, text, createdBy = "agent") => {
    const comment: Comment = { id: nanoid(8), blockId, text, createdBy, createdAt: Date.now() };
    set((s) => ({ comments: [...s.comments, comment] }));
    return comment;
  },

  resolveComment: (id) => set((s) => ({ comments: s.comments.filter((c) => c.id !== id) })),
}));

export function getState() {
  return useDocStore.getState();
}
