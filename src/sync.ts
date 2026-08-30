import { nanoid } from "nanoid";

const CHANNEL_NAME = "codraft-doc-sync";

/** Stable id for this browser tab, generated once, kept in memory only. */
export const TAB_ID = nanoid(10);

const PERSON_NAMES = ["Maren", "Idris", "Sana", "Kofi", "Yuki", "Elin", "Rafael", "Priya"];
const PERSON_COLORS = ["#2f5d50", "#a8562f", "#3d5a80", "#7b4b94", "#916d3c", "#4c6b52"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** This tab's human identity — generated once per tab, in memory only (no storage). */
export const PERSON = {
  id: TAB_ID,
  name: pick(PERSON_NAMES),
  color: pick(PERSON_COLORS),
};

export interface SyncMessage<T = unknown> {
  originTabId: string;
  type: string;
  payload: T;
}

type Listener = (msg: SyncMessage) => void;

class DocSync {
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<Listener>();

  constructor() {
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.addEventListener("message", (event: MessageEvent<SyncMessage>) => {
        const msg = event.data;
        // Ignore our own broadcasts to avoid infinite loops.
        if (!msg || msg.originTabId === TAB_ID) return;
        this.listeners.forEach((listener) => listener(msg));
      });
    } else {
      // eslint-disable-next-line no-console
      console.warn("[docSync] BroadcastChannel is not available in this browser — sync disabled.");
    }
  }

  /** Broadcast a mutation to other tabs. Safe no-op if BroadcastChannel is unsupported. */
  send<T>(type: string, payload: T) {
    this.channel?.postMessage({ originTabId: TAB_ID, type, payload } satisfies SyncMessage<T>);
  }

  /** Subscribe to mutations broadcast by other tabs. Returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const docSync = new DocSync();
