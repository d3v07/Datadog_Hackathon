# Redline Datadog Hackathon

Backend handoff for the Redline hackathon build.

Start here:

- `handoff/index.html`
- `handoff/Product Decisions.html`
- `handoff/API.html`
- `handoff/Data Model.html`
- `handoff/Runbook.html`

Do not commit real API keys or local `.env` files. Use `.env.example` for documented variable names only.

## Development

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm dev:api
```

The SSE slice implements `GET /v1/stream?token=demo_token_acme_corp_2026` with org-scoped delivery, 15-second `:heartbeat` keepalives, stable event ids, and `Last-Event-ID` replay for retained in-memory events. Malformed replay cursors are treated as missing and do not replay history.
