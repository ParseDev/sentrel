import fs from "fs";
import path from "path";
import { config } from "./config.js";
import type { Agent } from "./types.js";
import { logger } from "./logger.js";

const ROLE_MAP: Record<string, string> = {
  "SDR": "sdr",
  "Content Writer": "content",
  "Content": "content",
  "Finance": "finance",
  "Engineer": "engineering",
  "Engineering": "engineering",
  "QA": "engineering",
  "Support": "common",
};

export function provisionSkills(agent: Agent): void {
  const targetDir = path.join(config.dataDir, "skills");
  const sourceDir = path.join(import.meta.dir, "..", "skills");

  if (!fs.existsSync(sourceDir)) {
    logger.warn("Skills source directory not found, skipping");
    return;
  }

  // Always copy common skills
  copySkillsIfExists(path.join(sourceDir, "common"), targetDir);

  // Copy role-specific skills
  const roleKey = ROLE_MAP[agent.role];
  if (roleKey && roleKey !== "common") {
    copySkillsIfExists(path.join(sourceDir, roleKey), targetDir);
  }

  logger.info(`Skills provisioned for role: ${agent.role}`);
}

function copySkillsIfExists(srcDir: string, targetDir: string): void {
  if (!fs.existsSync(srcDir)) return;

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const src = path.join(srcDir, entry.name);
      const dest = path.join(targetDir, entry.name);
      fs.cpSync(src, dest, { recursive: true, force: true });
    }
  }
}
