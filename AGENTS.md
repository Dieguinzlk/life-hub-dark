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
- AI assistant: /api/chat streams Groq through the OpenAI chat adapter; secrets are read inside handleChat, tools have no execute, and browser actions require explicit confirmation — preserves server-only credentials and on-device data.
- Home-only derived metrics and immutable habit toggling live in src/lib/home-metrics.ts; persist through the existing update function to keep backup data compatible.
- The /metas route reuses the finance goal view and storage; keep workouts available and settings accessible from the Home header to avoid duplicate modules.
- Validate backups atomically before replacing local data; currentAmount is the canonical accumulated goal balance, with no inferred contribution history or schema migration.
- Debt payments use the pure src/lib/debt-payment.ts operation inside update to validate against the same current state that receives the expense, preventing stale-balance inconsistencies.
- Business calculations and virtual sale agenda live in src/lib/business.ts; all records stay in the optional business field of JSON v1 — avoids duplicating linked sales or mixing personal expenses.
- Access tiers (owner/VIP/free) live in the database: owner in user_roles (bootstrapped once by the server when the verified email matches the OWNER_EMAIL secret), VIP in vip_grants changed only through set_vip, AI quota enforced by consume_chat_quota inside /api/chat — clients can never grant themselves privileges.
