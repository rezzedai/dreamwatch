export interface DreamwatchConfig {
  defaultBudget: number;      // USD
  defaultTimeout: string;     // e.g., "4h"
  branchPrefix: string;       // default "dreamwatch"
  autopr: boolean;
  prDraft: boolean;
}

export interface SessionState {
  pid: number;
  task: string;
  branch: string;
  budget: number;
  timeout: number;            // ms
  startedAt: string;          // date string
  cwd: string;
}

export interface ReportData {
  task: string;
  startedAt: string;
  completedAt: string;
  duration: string;
  budgetUsed: number;
  budgetLimit: number;
  status: "COMPLETED" | "BUDGET_EXCEEDED" | "TIMEOUT" | "KILLED" | "ERROR";
  summary: string[];
  prUrl?: string;
}
