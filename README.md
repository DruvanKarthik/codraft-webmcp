# Co/Draft — a document humans and agents edit together

A minimal collaborative document editor that exposes its live state directly
to AI agents via [WebMCP](https://github.com/webmachinelearning/webmcp),
instead of making them scrape the DOM or work from screenshots — and that
multiple humans (and their agents) can edit together in real time.

## Why WebMCP fits this use case

Editing a shared doc with an agent today usually means pasting text back and
forth, or an agent-in-a-sidebar that can only "see" the page via screenshots
and guess where to click. Co/Draft instead registers five tools on
`document.modelContext` that read and write the *same* state object the
human's UI renders from. A human can select a paragraph while their agent
independently queries `get_selection`, drafts a comment or a new section, and
calls `add_comment` / `insert_block` — and it shows up live, in place, with a
visible "added by agent" marker. No relay server, no copy-pasting context.

## The tools

| Tool | Type | What it does |
|---|---|---|
| `get_document_state` | read | Returns every block, every pending agent suggestion, and every comment (open or resolved), in order. |
| `get_selection` | read | Returns whichever block the human currently has focused. |
| `insert_block` | write (pending) | Proposes a new text block after a given block id. Lands as a pending suggestion — a human must accept it before it's part of the document. |
| `add_comment` | write | Attaches a comment directly to a specific block id. |
| `resolve_comment` | write | Marks an open comment as resolved. |

All five are registered in [`src/hooks/useDocumentTools.ts`](src/hooks/useDocumentTools.ts)
via the [`usewebmcp`](https://www.npmjs.com/package/usewebmcp) hook, which
wraps the spec's imperative `document.modelContext.registerTool(...)` /
`AbortController` cleanup pattern in a normal React hook.

A natural agent workflow: call `get_document_state` to see current block ids
and open comments → call `get_selection` to see what the human is looking at
→ `add_comment` on that block, or `insert_block` right after it (pending
human approval) → later, `resolve_comment` once feedback has been addressed.

## Multi-user

Open `https://codraft.netlify.app/` (or your own deployed URL) in **two
browser tabs**. Each tab gets its own random person identity (name + color),
generated once per tab and kept in memory only — no login, no storage.

Every mutation — inserting an accepted block, editing text, adding or
resolving a comment, even which block someone has selected — is broadcast
between tabs over a `BroadcastChannel` (see [`src/sync.ts`](src/sync.ts)) and
applied live in the other tab's state. Each message carries the originating
tab's id so a tab never re-applies its own broadcast, which would otherwise
loop forever.

This means two humans (each potentially with their own agent attached via
WebMCP) can work on the same document at once: one person typing while
another's agent reviews and comments, all visible to both immediately.

Note: sync is peer-to-peer between tabs in the *same browser*, not a hosted
backend — open two tabs on the same machine to see it, not two different
computers.

## Trust boundary for agent writes

`insert_block` does not write directly into the document. It creates a
**pending suggestion** (shown with a dashed border and 🤖 icon, plus ✓ Accept
/ ✗ Reject buttons) that only becomes part of the actual document once a
human clicks Accept. This gives agents a way to propose real content changes
without silently mutating shared state that other people are relying on.

`add_comment` and `resolve_comment` remain direct writes — comments are
low-risk, additive, and trivially reversible (undo a resolve, delete a
comment), so they don't need the same checkpoint.

This follows the WebMCP spec's own guidance on scoping what agents can write
and guarding against prompt injection from document content itself (e.g. a
pasted paragraph that tries to instruct an agent to call other tools) — see
the [WebMCP tool security guide](https://github.com/webmachinelearning/webmcp).

## Local development

```bash
npm install
npm run dev
```

This runs on plain Chrome/Safari too during development, because
`src/main.tsx` imports [`@mcp-b/global`](https://www.npmjs.com/package/@mcp-b/global),
a polyfill that provides `document.modelContext` when the browser doesn't
support it natively yet. In a browser with real WebMCP support, the polyfill
is a no-op passthrough.

## Testing the tools

**ChatGPT's in-app browser** supports WebMCP out of the box — open the
deployed URL there and ask it to read or edit the document.

**Google Chrome 149+**: enable `chrome://flags/#enable-webmcp-testing`, open
the deployed URL, then open DevTools console and try:

```js
document.modelContext.getTools() // lists the 5 registered tools
```

or drive it end-to-end with `navigator.modelContextTesting` per the [WebMCP
developer docs](https://developer.chrome.com/docs/ai/webmcp).

## Deploying

This is a static Vite build — deploy the `dist/` folder to Vercel, Netlify,
Cloudflare Pages, or Render:

```bash
npm run build
# then drag/drop `dist/`, or connect the repo to your platform of choice
```

## Project structure

```
src/
  sync.ts                      BroadcastChannel wrapper + per-tab person identity
  store.ts                     shared doc state (blocks, pendingBlocks, comments, selections) — Zustand
  hooks/useDocumentTools.ts    registers the 5 WebMCP tools against the store
  components/
    Toolbar.tsx                WebMCP support indicator, this tab's person, current selection
    DocumentBody.tsx           editable block list, pending-suggestion accept/reject, presence dots
    CommentRail.tsx            live comment thread, open vs. resolved, resolve action
  App.tsx / App.css            layout + styling
```

## Ideas to extend further

- Cross-device sync (a real backend/WebSocket relay instead of same-browser
  `BroadcastChannel`), so two different computers can collaborate, not just
  two tabs.
- `accept_suggestion` / `reject_suggestion` as agent-callable tools too (for
  an agent reviewing another agent's suggestions) rather than human-only UI
  buttons — deliberately left out for now since the whole point of the
  pending-suggestion layer is a human checkpoint.
- Persist document state across reloads (deliberately not done here — this
  project intentionally uses no browser storage, in-memory + BroadcastChannel
  only).
