#!/usr/bin/env node

import { loadSession, isSessionAlive, clearSession } from "./session.js";
import { getLatestReport } from "./report.js";
import { startSession } from "./runner.js";
import { parseDuration, parseBudget, formatDuration } from "./budget.js";
import { loadConfig } from "./config.js";

function printUsage(): void {
  console.log(`
dreamwatch - Overnight autonomous execution for Claude Code

USAGE:
  dreamwatch "<task>"           Start a new overnight session
  dreamwatch status             Check if a session is running
  dreamwatch report             View the most recent report
  dreamwatch kill               Gracefully stop a running session

OPTIONS:
  --budget <amount>             Max spend in USD (default: $5.00)
  --timeout <duration>          Max wall-clock time (default: 4h)
                                Accepts formats: 4h, 30m, 2h30m
  --branch <name>               Custom branch name
  --no-pr                       Skip auto-PR creation

EXAMPLES:
  dreamwatch "refactor auth module"
  dreamwatch "add dark mode" --budget 10 --timeout 6h
  dreamwatch status
  dreamwatch report
  dreamwatch kill
`);
}

function handleStatus(): void {
  const session = loadSession();
  
  if (!session) {
    console.log("No active dreamwatch session.");
    return;
  }
  
  if (!isSessionAlive(session)) {
    console.log("Session found but process is not running (stale session).");
    console.log("Cleaning up...");
    clearSession();
    return;
  }
  
  const elapsed = Date.now() - new Date(session.startedAt).getTime();
  const remaining = session.timeout - elapsed;
  
  console.log(`dreamwatch session running`);
  console.log(`Task: ${session.task}`);
  console.log(`Branch: ${session.branch}`);
  console.log(`Budget: $${session.budget.toFixed(2)}`);
  console.log(`Elapsed: ${formatDuration(elapsed)}`);
  console.log(`Remaining: ${formatDuration(Math.max(0, remaining))}`);
  console.log(`PID: ${session.pid}`);
}

function handleReport(): void {
  const report = getLatestReport();
  
  if (!report) {
    console.log("No reports found.");
    return;
  }
  
  console.log(report);
}

function handleKill(): void {
  const session = loadSession();
  
  if (!session) {
    console.log("No active dreamwatch session.");
    return;
  }
  
  if (!isSessionAlive(session)) {
    console.log("Session found but process is not running (stale session).");
    console.log("Cleaning up...");
    clearSession();
    return;
  }
  
  console.log(`Killing dreamwatch session (PID ${session.pid})...`);
  
  try {
    process.kill(session.pid, "SIGTERM");
    console.log("SIGTERM sent. The process will shut down gracefully.");
  } catch (err) {
    console.error("Failed to kill process:", err);
    process.exit(1);
  }
}

function main(): void {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    printUsage();
    process.exit(1);
  }
  
  const command = args[0];
  
  // Handle subcommands
  if (command === "status") {
    handleStatus();
    return;
  }
  
  if (command === "report") {
    handleReport();
    return;
  }
  
  if (command === "kill") {
    handleKill();
    return;
  }
  
  if (command === "--help" || command === "-h") {
    printUsage();
    return;
  }
  
  // Handle task execution
  const config = loadConfig();
  let task = "";
  let budget = config.defaultBudget;
  let timeout = parseDuration(config.defaultTimeout);
  let branch: string | undefined;
  let noPr = false;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === "--budget") {
      budget = parseBudget(args[++i]);
    } else if (arg === "--timeout") {
      timeout = parseDuration(args[++i]);
    } else if (arg === "--branch") {
      branch = args[++i];
    } else if (arg === "--no-pr") {
      noPr = true;
    } else if (!task) {
      task = arg;
    }
  }
  
  if (!task) {
    console.error("ERROR: Task description required.");
    printUsage();
    process.exit(1);
  }
  
  // Check for existing session
  const existingSession = loadSession();
  if (existingSession && isSessionAlive(existingSession)) {
    console.error("ERROR: A dreamwatch session is already running.");
    console.error(`Use 'dreamwatch kill' to stop it first.`);
    process.exit(1);
  }
  
  // Start session
  startSession(task, { budget, timeout, branch, noPr });
}

main();
