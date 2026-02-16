import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { DreamwatchConfig } from "./types.js";

const DEFAULT_CONFIG: DreamwatchConfig = {
  defaultBudget: 5.0,
  defaultTimeout: "4h",
  branchPrefix: "dreamwatch",
  autopr: true,
  prDraft: true,
};

export function getDataDir(): string {
  const dataDir = path.join(os.homedir(), ".dreamwatch");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

export function loadConfig(): DreamwatchConfig {
  const configPath = path.join(getDataDir(), "config.json");
  
  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }
  
  try {
    const configData = fs.readFileSync(configPath, "utf8");
    const userConfig = JSON.parse(configData);
    return { ...DEFAULT_CONFIG, ...userConfig };
  } catch (err) {
    console.warn(`Failed to load config from ${configPath}, using defaults:`, err);
    return { ...DEFAULT_CONFIG };
  }
}
