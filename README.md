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
```

This branch implements the Slack routing and typed Action persistence slice. Slack routes render Block Kit and post through `SLACK_WEBHOOK_URL`; Jira, Email, and Calendar routes persist typed Action rows without external calls.
