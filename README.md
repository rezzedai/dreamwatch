# @rezzedai/dreamwatch

**Overnight autonomous execution for Claude Code.** Queue a task before bed, wake up to a PR and a report.

```bash
npx @rezzedai/dreamwatch "refactor auth module to use JWT" --budget 5
```

---

## What It Does

dreamwatch runs a Claude Code task overnight with hard safety rails:

- **Budget cap** — Set a dollar limit. dreamwatch stops when you hit it.
- **Git isolation** — All work goes to a dedicated branch. Never touches main.
- **Wall-clock timeout** — Default 4 hours. No runaway sessions.
- **Morning report** — Structured Markdown report of what was done, decided, and needs review.
- **Auto-PR** — Opens a draft PR on completion.

## Install

```bash
npm install -g @rezzedai/dreamwatch
# or use directly
npx @rezzedai/dreamwatch "your task here"
```

**Requirements:** Node.js 18+, `ANTHROPIC_API_KEY` environment variable set.

## Quick Start

```bash
# Run a task with default settings ($5 budget, 4h timeout)
dreamwatch "add comprehensive test coverage to src/api/"

# Custom budget and timeout
dreamwatch "refactor database queries for performance" --budget 10 --timeout 6h

# Check on a running session
dreamwatch status

# View the last report
dreamwatch report

# Kill a running session
dreamwatch kill
```

## How It Works

```
You run dreamwatch with a task description
  → Creates branch: dreamwatch/{date}/{task-slug}
  → Installs pre-push hook (rejects pushes to main)
  → Launches Claude Code with sandbox constraints
  → Monitors budget and wall-clock time
  → On completion:
    - Commits all changes
    - Opens draft PR
    - Writes morning report
    - Exits cleanly
```

## Morning Report

Every run produces a structured report at `~/.dreamwatch/reports/`:

```markdown
# dreamwatch Report — 2026-02-15

**Task:** Refactor auth module to use JWT
**Duration:** 22:30 → 03:15 (4h 45m)
**Budget:** $3.42 / $5.00
**Status:** COMPLETED

## What Was Done
- Migrated session-based auth to JWT tokens
- Added refresh token rotation
- Updated 12 API endpoints

## What Was Decided
- Used RS256 signing over HS256 for microservice compatibility

## What Needs Review
- Refresh token storage approach

## PR
https://github.com/user/repo/pull/42
```

## Configuration

`~/.dreamwatch/config.json`:

```json
{
  "defaultBudget": 5.00,
  "defaultTimeout": "4h",
  "branchPrefix": "dreamwatch",
  "autopr": true,
  "prDraft": true
}
```

## Safety Rails

| Protection | How It Works |
|-----------|-------------|
| Budget cap | Tracks token usage from API responses. Stops when exceeded. |
| Wall-clock timeout | Process-level timeout. Default 4 hours. |
| Git isolation | Dedicated branch + pre-push hook rejecting main/master. |
| Graceful shutdown | On any hard stop: commit work, write report, exit clean. |

## CLI Reference

| Command | Description |
|---------|-------------|
| `dreamwatch "<task>"` | Start a new overnight session |
| `dreamwatch status` | Check if a session is running |
| `dreamwatch report` | View the most recent report |
| `dreamwatch kill` | Gracefully stop a running session |

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--budget <amount>` | `5.00` | Maximum spend in USD |
| `--timeout <duration>` | `4h` | Maximum wall-clock time |
| `--branch <name>` | auto-generated | Custom branch name |
| `--no-pr` | `false` | Skip auto-PR creation |

## Why Not Just `nohup claude "task" &`?

You could. But you'd get:
- No cost guardrails (surprise $50 bill)
- No git isolation (accidental push to main)
- No structured report (raw terminal output)
- No graceful shutdown (orphaned processes)
- No pre-push safety (commits wherever you left off)

dreamwatch adds the safety rails that make overnight execution production-ready.

## What's Next?

More tools coming from the @rezzedai toolkit. See [rezzed.ai](https://rezzed.ai) for updates.

## License

MIT

---

Built by [Rezzed](https://rezzed.ai) — the AI product studio.
