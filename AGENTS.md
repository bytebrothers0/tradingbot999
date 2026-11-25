<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## TickPulse architecture
- Keep each of the five workspace views in its own TanStack file route with the persistent terminal shell at the root, so navigation preserves shared controls.
- Use Zustand for simulated bot/account/risk state and Lightweight Charts for interactive browser charts; never label simulated data as live MT5 data.
- Keep one assistant conversation in browser storage and all model calls in a streaming TanStack server route; no app authentication or private financial data is provided by this demo.
- MT5 access goes only through the local Python bridge in helper/ (127.0.0.1, pairing code, live orders blocked unless --allow-live); the hosted app never talks to brokers directly. Re-zip helper/ into public/tickpulse-bridge.zip after editing it.
