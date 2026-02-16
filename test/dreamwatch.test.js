const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");

// Import compiled modules
const { parseDuration, formatDuration, parseBudget } = require("../dist/budget.js");
const { slugify } = require("../dist/branch.js");
const { loadConfig, getDataDir } = require("../dist/config.js");
const { generateReport } = require("../dist/report.js");
const { saveSession, loadSession, clearSession } = require("../dist/session.js");

// Test utilities
function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "dreamwatch-test-"));
}

function cleanupTempDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Duration parsing tests
test("parseDuration - hours", () => {
  assert.equal(parseDuration("4h"), 4 * 60 * 60 * 1000);
});

test("parseDuration - minutes", () => {
  assert.equal(parseDuration("30m"), 30 * 60 * 1000);
});

test("parseDuration - seconds", () => {
  assert.equal(parseDuration("45s"), 45 * 1000);
});

test("parseDuration - mixed", () => {
  assert.equal(parseDuration("2h30m"), (2 * 60 * 60 + 30 * 60) * 1000);
});

test("parseDuration - complex", () => {
  assert.equal(parseDuration("1h15m30s"), (1 * 60 * 60 + 15 * 60 + 30) * 1000);
});

test("parseDuration - invalid format throws", () => {
  assert.throws(() => parseDuration("invalid"), /Invalid duration format/);
});

// Duration formatting tests
test("formatDuration - hours only", () => {
  assert.equal(formatDuration(4 * 60 * 60 * 1000), "4h");
});

test("formatDuration - hours and minutes", () => {
  assert.equal(formatDuration((2 * 60 * 60 + 30 * 60) * 1000), "2h 30m");
});

test("formatDuration - minutes only", () => {
  assert.equal(formatDuration(45 * 60 * 1000), "45m");
});

test("formatDuration - includes seconds only when no hours", () => {
  assert.equal(formatDuration(90 * 1000), "1m 30s");
});

test("formatDuration - zero", () => {
  assert.equal(formatDuration(0), "0s");
});

// Budget parsing tests
test("parseBudget - number", () => {
  assert.equal(parseBudget(10), 10);
});

test("parseBudget - string", () => {
  assert.equal(parseBudget("5.50"), 5.50);
});

test("parseBudget - invalid throws", () => {
  assert.throws(() => parseBudget("invalid"), /Invalid budget amount/);
});

test("parseBudget - negative throws", () => {
  assert.throws(() => parseBudget(-5), /Invalid budget amount/);
});

// Slugify tests
test("slugify - basic", () => {
  assert.equal(slugify("Add dark mode"), "add-dark-mode");
});

test("slugify - special characters", () => {
  assert.equal(slugify("Fix bug #123 & refactor"), "fix-bug-123-refactor");
});

test("slugify - multiple spaces", () => {
  assert.equal(slugify("update   readme   file"), "update-readme-file");
});

test("slugify - truncates long strings", () => {
  const longTask = "a".repeat(100);
  const slug = slugify(longTask);
  assert.equal(slug.length, 50);
});

test("slugify - removes leading/trailing dashes", () => {
  assert.equal(slugify("--test--"), "test");
});

// Config tests
test("loadConfig - returns defaults when no config file", () => {
  const config = loadConfig();
  assert.equal(config.defaultBudget, 5.0);
  assert.equal(config.defaultTimeout, "4h");
  assert.equal(config.branchPrefix, "dreamwatch");
  assert.equal(config.autopr, true);
  assert.equal(config.prDraft, true);
});

test("getDataDir - creates directory", () => {
  const dir = getDataDir();
  assert.ok(fs.existsSync(dir));
  assert.ok(dir.includes(".dreamwatch"));
});

// Session tests
test("saveSession and loadSession", () => {
  const tempDir = createTempDir();
  const originalGetDataDir = getDataDir;
  
  // Mock getDataDir to use temp directory
  const mockGetDataDir = () => tempDir;
  Object.defineProperty(require("../dist/config.js"), "getDataDir", {
    value: mockGetDataDir,
    writable: true,
  });
  
  const session = {
    pid: process.pid,
    task: "Test task",
    branch: "test-branch",
    budget: 5.0,
    timeout: 14400000,
    startedAt: new Date().toISOString(),
    cwd: process.cwd(),
  };
  
  saveSession(session);
  const loaded = loadSession();
  
  assert.deepEqual(loaded, session);
  
  // Restore
  Object.defineProperty(require("../dist/config.js"), "getDataDir", {
    value: originalGetDataDir,
    writable: true,
  });
  cleanupTempDir(tempDir);
});

test("clearSession removes session file", () => {
  const tempDir = createTempDir();
  const originalGetDataDir = getDataDir;
  
  const mockGetDataDir = () => tempDir;
  Object.defineProperty(require("../dist/config.js"), "getDataDir", {
    value: mockGetDataDir,
    writable: true,
  });
  
  const session = {
    pid: process.pid,
    task: "Test task",
    branch: "test-branch",
    budget: 5.0,
    timeout: 14400000,
    startedAt: new Date().toISOString(),
    cwd: process.cwd(),
  };
  
  saveSession(session);
  assert.ok(loadSession() !== null);
  
  clearSession();
  assert.equal(loadSession(), null);
  
  Object.defineProperty(require("../dist/config.js"), "getDataDir", {
    value: originalGetDataDir,
    writable: true,
  });
  cleanupTempDir(tempDir);
});

test("loadSession - returns null when no file", () => {
  const tempDir = createTempDir();
  const originalGetDataDir = getDataDir;
  
  const mockGetDataDir = () => tempDir;
  Object.defineProperty(require("../dist/config.js"), "getDataDir", {
    value: mockGetDataDir,
    writable: true,
  });
  
  assert.equal(loadSession(), null);
  
  Object.defineProperty(require("../dist/config.js"), "getDataDir", {
    value: originalGetDataDir,
    writable: true,
  });
  cleanupTempDir(tempDir);
});

// Report generation tests
test("generateReport - basic structure", () => {
  const data = {
    task: "Test task",
    startedAt: "2026-02-16T00:00:00Z",
    completedAt: "2026-02-16T04:00:00Z",
    duration: "4h",
    budgetUsed: 3.50,
    budgetLimit: 5.0,
    status: "COMPLETED",
    summary: ["Task completed successfully", "Files modified: 5"],
  };
  
  const report = generateReport(data);
  
  assert.ok(report.includes("# dreamwatch Report"));
  assert.ok(report.includes("Test task"));
  assert.ok(report.includes("COMPLETED"));
  assert.ok(report.includes("$3.50 / $5.00"));
  assert.ok(report.includes("Task completed successfully"));
  assert.ok(report.includes("Files modified: 5"));
});

test("generateReport - includes PR URL when present", () => {
  const data = {
    task: "Test task",
    startedAt: "2026-02-16T00:00:00Z",
    completedAt: "2026-02-16T04:00:00Z",
    duration: "4h",
    budgetUsed: 3.50,
    budgetLimit: 5.0,
    status: "COMPLETED",
    summary: [],
    prUrl: "https://github.com/org/repo/pull/123",
  };
  
  const report = generateReport(data);
  
  assert.ok(report.includes("**Pull Request:** https://github.com/org/repo/pull/123"));
});

test("generateReport - handles different statuses", () => {
  const statuses = ["COMPLETED", "BUDGET_EXCEEDED", "TIMEOUT", "KILLED", "ERROR"];
  
  statuses.forEach(status => {
    const data = {
      task: "Test task",
      startedAt: "2026-02-16T00:00:00Z",
      completedAt: "2026-02-16T04:00:00Z",
      duration: "4h",
      budgetUsed: 3.50,
      budgetLimit: 5.0,
      status: status,
      summary: [],
    };
    
    const report = generateReport(data);
    assert.ok(report.includes(status));
  });
});
