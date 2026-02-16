import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

export function slugify(task: string): string {
  return task
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export function createBranch(taskSlug: string, prefix: string, customName?: string): string {
  const date = new Date().toISOString().split("T")[0];
  const branchName = customName || `${prefix}/${date}/${taskSlug}`;
  
  // Create the branch
  execSync(`git checkout -b "${branchName}"`, { stdio: "inherit" });
  
  return branchName;
}

export function installPrePushHook(cwd: string): void {
  const hooksDir = path.join(cwd, ".git", "hooks");
  const hookPath = path.join(hooksDir, "pre-push");
  
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }
  
  const hookContent = `#!/bin/sh
# dreamwatch pre-push hook: reject pushes to main/master

while read local_ref local_sha remote_ref remote_sha
do
  if [ "$remote_ref" = "refs/heads/main" ] || [ "$remote_ref" = "refs/heads/master" ]; then
    echo "ERROR: dreamwatch blocks direct pushes to main/master"
    echo "This is a dreamwatch safety rail. Push to a feature branch instead."
    exit 1
  fi
done

exit 0
`;
  
  fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
}

export function removePrePushHook(cwd: string): void {
  const hookPath = path.join(cwd, ".git", "hooks", "pre-push");
  
  if (fs.existsSync(hookPath)) {
    const content = fs.readFileSync(hookPath, "utf8");
    // Only remove if it's our hook
    if (content.includes("dreamwatch pre-push hook")) {
      fs.unlinkSync(hookPath);
    }
  }
}
