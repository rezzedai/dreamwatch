import * as fs from "fs";
import * as path from "path";
import { SessionState } from "./types.js";
import { getDataDir } from "./config.js";

function getSessionPath(): string {
  return path.join(getDataDir(), "session.json");
}

export function saveSession(session: SessionState): void {
  const sessionPath = getSessionPath();
  fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2), "utf8");
}

export function loadSession(): SessionState | null {
  const sessionPath = getSessionPath();
  
  if (!fs.existsSync(sessionPath)) {
    return null;
  }
  
  try {
    const data = fs.readFileSync(sessionPath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.warn(`Failed to load session from ${sessionPath}:`, err);
    return null;
  }
}

export function clearSession(): void {
  const sessionPath = getSessionPath();
  
  if (fs.existsSync(sessionPath)) {
    fs.unlinkSync(sessionPath);
  }
}

export function isSessionAlive(session: SessionState): boolean {
  try {
    // Send signal 0 to check if process exists without killing it
    process.kill(session.pid, 0);
    return true;
  } catch (err) {
    return false;
  }
}
