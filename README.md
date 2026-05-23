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
pnpm dev:api -- --seed
```

The integrated API slice implements:

- `POST /v1/changes/:id/acknowledge`
- `POST /v1/changes/:id/snooze`
- `POST /v1/changes/:id/resolve`
- `GET /v1/stream?token=demo_token_acme_corp_2026`
- Slack routing plus typed Action persistence for Slack, Jira, Email, and Calendar routes

Use `Authorization: Bearer demo_token_acme_corp_2026` for local hackathon requests. EventSource clients can use the query token because they cannot send custom headers.

The SSE stream is org-scoped, emits 15-second `:heartbeat` keepalives, uses stable event ids, and supports `Last-Event-ID` replay for retained in-memory events. Malformed replay cursors are treated as missing and do not replay history.

`pnpm dev:api -- --seed` starts the API with `chg_seed_notion_yesterday` so lifecycle curl requests work immediately.
