# Deploy to Vercel from a non-interactive shell

When `vercel link` or `vercel deploy --yes` returns:

```json
{
  "status": "action_required",
  "reason": "missing_scope",
  "message": "Provide --scope or --team explicitly. No default is applied in non-interactive mode.",
  "choices": [{ "id": "team_XXXXXXXX", "name": "my-team-slug" }]
}
```

…and the suggested `--scope my-team-slug` returns the same gate, use the env-var path below.

## Setup

```bash
TEAM_ID=team_XXXXXXXX    # the "id" from the gate JSON, NOT the slug
PROJECT=my-project-name
```

## One-time (creates project + first deploy)

```bash
# 1. Create the project explicitly
VERCEL_ORG_ID=$TEAM_ID vercel projects add $PROJECT

# 2. Grab the real project id (prj_…)
PROJECT_ID=$(VERCEL_ORG_ID=$TEAM_ID vercel project inspect $PROJECT 2>&1 \
  | awk '/^[[:space:]]+ID/ {print $2}')
echo "$PROJECT_ID"   # prj_XXXX

# 3. Deploy — BOTH env vars set is the key
cd path/to/app
VERCEL_ORG_ID=$TEAM_ID \
VERCEL_PROJECT_ID=$PROJECT_ID \
vercel deploy --prod --yes
```

The first deploy writes `.vercel/project.json` with the two IDs.

## Subsequent deploys

From the same directory:

```bash
vercel deploy --prod
```

No env vars needed — `.vercel/project.json` is read automatically.

## Traps

- `--scope my-team-slug` → triggers the gate.
- `--scope team_XXXX` (the id) → passes the wrapper, then complains it also needs `VERCEL_PROJECT_ID`. The env-var path is cleaner.
- Setting your personal account as scope returns `You cannot set your Personal Account as the scope.` — use the hobby/personal-workspace `team_*` id from the gate's `choices[0].id` instead.
- `vercel.json` with `buildCommand: null` + `outputDirectory: public` can still trigger framework auto-detection if the dashboard project config overrides `vercel.json`. To force static-only:
  - Set **Framework Preset → Other** in the project settings, or
  - `vercel project rm <project>` and recreate.

## Why the env-var path works

`--scope` is a CLI flag that the new non-interactive gate happens to ignore in many resolution paths. `VERCEL_ORG_ID` + `VERCEL_PROJECT_ID` short-circuit the resolution at a lower level — vercel never needs to "pick a scope" because both targets are already pinned.
