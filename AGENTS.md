<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- App data lives in localStorage via src/lib/store.ts (single JSON blob, versioned) — user wants on-device storage with JSON backup/restore, no backend.
- AI assistant: server route /api/chat (src/lib/ai.server.ts) streams Gemini using createGoogleGenerativeAI with GEMINI_API_KEY read inside handleChat; tools have no server execute and the browser confirms each action before applying it via src/lib/ai-actions.ts — keeps credentials server-only, data on-device, and every change user-approved.
