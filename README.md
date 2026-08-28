# Co/Draft — a document humans and agents edit together

A minimal collaborative document editor that exposes its live state directly
to AI agents via [WebMCP](https://github.com/webmachinelearning/webmcp),
instead of making them scrape the DOM or work from screenshots.

## Why WebMCP fits this use case

Editing a shared doc with an agent today usually means pasting text back and
forth, or an agent-in-a-sidebar that can only "see" the page via screenshots
and guess where to click. Co/Draft instead registers four tools on
`document.modelContext` that read and write the *same* state object the
human's UI renders from. A human can select a paragraph while their agent
independently queries `get_selection`, drafts a comment or a new section, and
calls `add_comment` / `insert_block` — and it shows up live, in place, with a
visible "added by agent" marker. No relay server, no copy-pasting context.

## The tools

| Tool | Type | What it does |
|---|---|---|
| `get_document_state` | read | Returns every block (id, text, author) and every open comment, in order. |
| `get_selection` | read | Returns whichever block the human currently has focused/selected. |
| `insert_block` | write | Inserts a new text block after a given block id (or at the end). |
| `add_comment` | write | Attaches a comment to a specific block id. |

All four are registered in [`src/hooks/useDocumentTools.ts`](src/hooks/useDocumentTools.ts)
via the [`usewebmcp`](https://www.npmjs.com/package/usewebmcp) hook, which
wraps the spec's imperative `document.modelContext.registerTool(...)` /
`AbortController` cleanup pattern in a normal React hook.

A natural agent workflow: call `get_document_state` to see current block ids
→ call `get_selection` to see what the human is looking at → `add_comment` on
that block, or `insert_block` right after it.

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
document.modelContext.getTools() // lists the 4 registered tools
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
  store.ts                     shared doc state (blocks, comments, selection) — Zustand
  hooks/useDocumentTools.ts    registers the 4 WebMCP tools against the store
  components/
    Toolbar.tsx                WebMCP support indicator + current selection
    DocumentBody.tsx           editable block list, click to select
    CommentRail.tsx            live comment thread, resolve action
  App.tsx / App.css            layout + styling
```

## Security note

`insert_block` and `add_comment` are write tools with no confirmation step —
appropriate for a hackathon demo, but a production version should follow the
[WebMCP tool security guidance](https://github.com/webmachinelearning/webmcp)
on scoping what agents can write and guarding against prompt injection from
document content itself (e.g. a pasted paragraph that tries to instruct the
agent to call other tools).

## Ideas to extend before the deadline

- A second human tab (or `BroadcastChannel`/WebSocket sync) so two people —
  and their agents — edit the same doc live.
- A `resolve_comment` tool so the agent can close out its own feedback loop.
- An `accept_suggestion` / `reject_suggestion` pattern instead of direct
  writes, for a softer trust boundary.
