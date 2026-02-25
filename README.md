# @rezzed.ai/dreamwatch

**Budget-capped overnight execution with git isolation and timeout enforcement for Claude Code.** Queue a task before bed, wake up to a PR and a report.

```bash
npx @rezzed.ai/dreamwatch "refactor auth module to use JWT" --budget 5
```

---

## What It Does

dreamwatch runs a Claude Code task overnight with hard safety rails:

- **Budget cap** — Set a dollar limit. dreamwatch stops when you hit it.
- **Git isolation** — All work goes to a dedicated branch. Never touches main.
- **Wall-clock timeout** — Default 4 hours. No runaway sessions.
- **Morning report** — Structured Markdown report of what was done, decided, and needs review.
- **Auto-PR** — On successful completion, dreamwatch automatically commits all changes and opens a draft PR to main. No manual trigger required (disable with `--no-pr`).

## Install

```bash
npm install -g @rezzed.ai/dreamwatch
# or use directly
npx @rezzed.ai/dreamwatch "your task here"
```

**Requirements:** Node.js 18+, `ANTHROPIC_API_KEY` environment variable set.

## Where to Run

dreamwatch runs **on your local machine** (not a server), polling CacheBash MCP for dream tasks assigned to your programs.

**How it works:**
- Runs as a local process on the machine where you execute the command
- Watches for dream tasks via CacheBash MCP (configured in `.mcp.json` or `~/.claude.json`)
- Executes Claude Code sessions within sandbox constraints
- **Requires machine to stay awake** — disable sleep mode or use caffeinate/similar tools
- **For 24/7 reliability:** Consider running on a cloud server or VPS with CacheBash MCP configured

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

Every run produces a structured report saved to:
- **Local archive:** `~/.dreamwatch/reports/{date}.md`
- **Git branch:** Written to the dream session's working branch (e.g., `dreamwatch/2026-02-15/refactor-auth/REPORT.md`)

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

## Design Constraints

- Budget ceiling is a hard kill, not a soft warning
- Git isolation is mandatory — main/master push is physically blocked
- Wall-clock timeout triggers graceful shutdown, not abrupt termination
- Morning report is generated regardless of completion state
- Process orphaning is actively prevented via PID tracking

## Safety Rails

| Protection | How It Works |
|-----------|-------------|
| Budget cap | Tracks token usage from Anthropic API response headers (`usage.input_tokens`, `usage.output_tokens`), calculates cost using current Claude pricing, and terminates the session when the specified budget is reached. |
| Wall-clock timeout | Process-level timeout. Default 4 hours. Hard limit on execution time. |
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

More tools coming from the @rezzed.ai toolkit. See [rezzed.ai](https://rezzed.ai) for updates.

## License

MIT

---

**Built by:** [RezzedAI](https://rezzed.ai) — Infrastructure for bounded multi-agent systems.
