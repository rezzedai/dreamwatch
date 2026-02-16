import * as fs from "fs";
import * as path from "path";
import { spawn, execSync, ChildProcess } from "child_process";
import { SessionState, ReportData } from "./types.js";
import { saveSession, clearSession } from "./session.js";
import { createBranch, slugify, installPrePushHook, removePrePushHook } from "./branch.js";
import { generateReport, saveReport } from "./report.js";
import { formatDuration } from "./budget.js";
import { getDataDir, loadConfig } from "./config.js";

let claudeProcess: ChildProcess | null = null;
let timeoutHandle: NodeJS.Timeout | null = null;
let budgetUsed = 0;

export function startSession(
  task: string,
  options: { budget: number; timeout: number; branch?: string; noPr: boolean }
): void {
  const cwd = process.cwd();
  
  // Verify git repo
  if (!fs.existsSync(path.join(cwd, ".git"))) {
    console.error("ERROR: Not a git repository. Run from inside a git repo.");
    process.exit(1);
  }
  
  // Create branch
  const taskSlug = slugify(task);
  const config = loadConfig();
  const branchName = createBranch(taskSlug, config.branchPrefix, options.branch);
  
  // Install pre-push hook
  installPrePushHook(cwd);
  
  // Save session state
  const session: SessionState = {
    pid: process.pid,
    task,
    branch: branchName,
    budget: options.budget,
    timeout: options.timeout,
    startedAt: new Date().toISOString(),
    cwd,
  };
  saveSession(session);
  
  console.log(`dreamwatch session started`);
  console.log(`Task: ${task}`);
  console.log(`Branch: ${branchName}`);
  console.log(`Budget: $${options.budget.toFixed(2)}`);
  console.log(`Timeout: ${formatDuration(options.timeout)}`);
  console.log(``);
  
  // Set up log file
  const logsDir = path.join(getDataDir(), "logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  const logPath = path.join(logsDir, `${new Date().toISOString().split("T")[0]}.log`);
  const logStream = fs.createWriteStream(logPath, { flags: "a" });
  
  // Spawn Claude Code
  const claudeArgs = ["--print", "--dangerously-skip-permissions", task];
  claudeProcess = spawn("claude", claudeArgs, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
  });
  
  claudeProcess.stdout?.pipe(logStream);
  claudeProcess.stderr?.pipe(logStream);
  
  // Set up wall-clock timeout
  timeoutHandle = setTimeout(() => {
    console.log(`\nTimeout reached (${formatDuration(options.timeout)}). Shutting down gracefully...`);
    gracefulShutdown("TIMEOUT", session, !options.noPr);
  }, options.timeout);
  
  // Monitor for completion
  claudeProcess.on("exit", (code, signal) => {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
    
    logStream.end();
    
    const status = code === 0 ? "COMPLETED" : "ERROR";
    console.log(`\nClaude process exited with code ${code}`);
    gracefulShutdown(status, session, !options.noPr);
  });
  
  claudeProcess.on("error", (err) => {
    console.error(`Failed to start Claude process:`, err);
    logStream.end();
    gracefulShutdown("ERROR", session, !options.noPr);
  });
  
  // Handle process signals
  process.on("SIGINT", () => {
    console.log(`\nReceived SIGINT. Shutting down gracefully...`);
    gracefulShutdown("KILLED", session, !options.noPr);
  });
  
  process.on("SIGTERM", () => {
    console.log(`\nReceived SIGTERM. Shutting down gracefully...`);
    gracefulShutdown("KILLED", session, !options.noPr);
  });
}

function gracefulShutdown(
  reason: "COMPLETED" | "BUDGET_EXCEEDED" | "TIMEOUT" | "KILLED" | "ERROR",
  session: SessionState,
  createPr: boolean
): void {
  console.log(`\nGraceful shutdown initiated (${reason})...`);
  
  // Kill Claude process if running
  if (claudeProcess && !claudeProcess.killed) {
    console.log("Terminating Claude process...");
    claudeProcess.kill("SIGTERM");
    
    setTimeout(() => {
      if (claudeProcess && !claudeProcess.killed) {
        console.log("Force killing Claude process...");
        claudeProcess.kill("SIGKILL");
      }
    }, 10000);
  }
  
  // Commit any uncommitted changes
  try {
    const status = execSync("git status --porcelain", { cwd: session.cwd, encoding: "utf8" });
    if (status.trim()) {
      console.log("Committing uncommitted changes...");
      execSync("git add -A", { cwd: session.cwd });
      execSync(`git commit -m "dreamwatch: auto-commit on ${reason.toLowerCase()}"`, {
        cwd: session.cwd,
        stdio: "inherit",
      });
    }
  } catch (err) {
    console.warn("Failed to commit changes:", err);
  }
  
  // Generate report
  const completedAt = new Date().toISOString();
  const duration = new Date(completedAt).getTime() - new Date(session.startedAt).getTime();
  
  const reportData: ReportData = {
    task: session.task,
    startedAt: session.startedAt,
    completedAt,
    duration: formatDuration(duration),
    budgetUsed,
    budgetLimit: session.budget,
    status: reason,
    summary: [`Session ended: ${reason}`],
  };
  
  const report = generateReport(reportData);
  const reportPath = saveReport(report);
  console.log(`Report saved to: ${reportPath}`);
  
  // Create PR if enabled
  if (createPr) {
    try {
      console.log("Creating pull request...");
      const config = loadConfig();
      const draftFlag = config.prDraft ? "--draft" : "";
      const prUrl = execSync(
        `gh pr create ${draftFlag} --title "dreamwatch: ${session.task}" --body "${report.replace(/"/g, '\\"')}"`,
        { cwd: session.cwd, encoding: "utf8" }
      ).trim();
      
      reportData.prUrl = prUrl;
      console.log(`Pull request created: ${prUrl}`);
      
      // Update report with PR URL
      const updatedReport = generateReport(reportData);
      saveReport(updatedReport);
    } catch (err) {
      console.warn("Failed to create pull request:", err);
    }
  }
  
  // Clean up pre-push hook
  removePrePushHook(session.cwd);
  
  // Clear session
  clearSession();
  
  console.log("Shutdown complete.");
  process.exit(reason === "COMPLETED" ? 0 : 1);
}
