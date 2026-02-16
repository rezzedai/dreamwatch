export function parseDuration(input: string): number {
  const regex = /(\d+)\s*(h|m|s)/g;
  let totalMs = 0;
  let match;
  
  while ((match = regex.exec(input)) !== null) {
    const value = parseInt(match[1], 10);
    const unit = match[2];
    
    switch (unit) {
      case "h":
        totalMs += value * 60 * 60 * 1000;
        break;
      case "m":
        totalMs += value * 60 * 1000;
        break;
      case "s":
        totalMs += value * 1000;
        break;
    }
  }
  
  if (totalMs === 0) {
    throw new Error(`Invalid duration format: ${input}. Use formats like "4h", "30m", "2h30m"`);
  }
  
  return totalMs;
}

export function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((ms % (60 * 1000)) / 1000);
  
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 && hours === 0) parts.push(`${seconds}s`);
  
  return parts.join(" ") || "0s";
}

export function parseBudget(amount: string | number): number {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  
  if (isNaN(value) || value < 0) {
    throw new Error(`Invalid budget amount: ${amount}`);
  }
  
  return value;
}
