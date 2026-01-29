import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

// Only OWNER can trigger system updates
const ALLOWED_ROLES = ["OWNER", "SUPER_ADMIN"];

// Update log file path
const UPDATE_LOG_PATH = process.env.UPDATE_LOG_PATH || "/var/log/qrdine-update.log";

// Project root directory (configurable via env)
const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();

interface UpdateStep {
  name: string;
  command: string;
  optional?: boolean;
}

// Update steps for Raspberry Pi deployment
const UPDATE_STEPS: UpdateStep[] = [
  {
    name: "Fetch latest changes",
    command: "git fetch origin",
  },
  {
    name: "Pull latest code",
    command: "git pull origin main",
  },
  {
    name: "Install dependencies",
    command: "pnpm install --frozen-lockfile",
  },
  {
    name: "Generate Prisma client",
    command: "pnpm --filter @qr-dine/database db:generate",
  },
  {
    name: "Build application",
    command: "pnpm --filter web build",
  },
  {
    name: "Run database migrations",
    command: "pnpm --filter @qr-dine/database db:migrate:prod",
    optional: true,
  },
];

// POST - Trigger system update
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const logs: string[] = [];

  const log = (message: string) => {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}`;
    logs.push(logLine);
    console.log(logLine);
  };

  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only owners can trigger updates
    if (!ALLOWED_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "Only system administrators can trigger updates" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { restartService = false, skipBuild = false } = body;

    log(`Update initiated by ${session.email} (${session.role})`);
    log(`Project root: ${PROJECT_ROOT}`);
    log(`Options: restartService=${restartService}, skipBuild=${skipBuild}`);

    // Check if we're in a git repository
    try {
      await execAsync("git status", { cwd: PROJECT_ROOT });
    } catch {
      return NextResponse.json(
        { error: "Not a git repository or git not available" },
        { status: 400 }
      );
    }

    // Check current branch and commit
    const { stdout: currentBranch } = await execAsync("git branch --show-current", {
      cwd: PROJECT_ROOT,
    });
    const { stdout: currentCommit } = await execAsync("git rev-parse --short HEAD", {
      cwd: PROJECT_ROOT,
    });

    log(`Current branch: ${currentBranch.trim()}`);
    log(`Current commit: ${currentCommit.trim()}`);

    const results: { step: string; success: boolean; output?: string; error?: string }[] = [];

    // Execute update steps
    for (const step of UPDATE_STEPS) {
      // Skip build step if requested
      if (skipBuild && step.name.toLowerCase().includes("build")) {
        log(`Skipping: ${step.name}`);
        continue;
      }

      log(`Executing: ${step.name}`);

      try {
        const { stdout, stderr } = await execAsync(step.command, {
          cwd: PROJECT_ROOT,
          timeout: 300000, // 5 minute timeout per step
          env: { ...process.env, CI: "true" },
        });

        const output = stdout + (stderr ? `\nSTDERR: ${stderr}` : "");
        log(`Success: ${step.name}`);

        results.push({
          step: step.name,
          success: true,
          output: output.slice(0, 500), // Limit output size
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Failed: ${step.name} - ${errorMessage}`);

        results.push({
          step: step.name,
          success: false,
          error: errorMessage.slice(0, 500),
        });

        // Stop on non-optional step failure
        if (!step.optional) {
          log("Update aborted due to critical step failure");
          break;
        }
      }
    }

    // Get new commit after pull
    const { stdout: newCommit } = await execAsync("git rev-parse --short HEAD", {
      cwd: PROJECT_ROOT,
    });

    // Restart service if requested (using PM2 or systemctl)
    if (restartService) {
      log("Attempting to restart service...");

      // Try PM2 first
      try {
        await execAsync("pm2 restart qrdine", { cwd: PROJECT_ROOT });
        log("Service restarted via PM2");
        results.push({ step: "Restart service (PM2)", success: true });
      } catch {
        // Try systemctl if PM2 fails
        try {
          await execAsync("sudo systemctl restart qrdine", { cwd: PROJECT_ROOT });
          log("Service restarted via systemctl");
          results.push({ step: "Restart service (systemctl)", success: true });
        } catch (restartError) {
          const errorMsg = restartError instanceof Error ? restartError.message : String(restartError);
          log(`Service restart failed: ${errorMsg}`);
          results.push({
            step: "Restart service",
            success: false,
            error: "Could not restart service. Manual restart may be required.",
          });
        }
      }
    }

    const duration = Date.now() - startTime;
    const allSuccess = results.every((r) => r.success);

    log(`Update completed in ${duration}ms. Success: ${allSuccess}`);

    // Write log to file
    try {
      const logDir = path.dirname(UPDATE_LOG_PATH);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      fs.appendFileSync(UPDATE_LOG_PATH, logs.join("\n") + "\n---\n");
    } catch {
      // Ignore log file errors
    }

    return NextResponse.json({
      success: allSuccess,
      message: allSuccess ? "Update completed successfully" : "Update completed with errors",
      previousCommit: currentCommit.trim(),
      currentCommit: newCommit.trim(),
      branch: currentBranch.trim(),
      duration: `${duration}ms`,
      steps: results,
      logs: logs.slice(-20), // Last 20 log lines
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Update failed: ${errorMessage}`);

    return NextResponse.json(
      {
        error: "Update failed",
        message: errorMessage,
        logs,
      },
      { status: 500 }
    );
  }
}

// GET - Check update status and git info
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ALLOWED_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "Only system administrators can view system status" },
        { status: 403 }
      );
    }

    // Get git status
    const { stdout: branch } = await execAsync("git branch --show-current", {
      cwd: PROJECT_ROOT,
    });
    const { stdout: commit } = await execAsync("git rev-parse --short HEAD", {
      cwd: PROJECT_ROOT,
    });
    const { stdout: commitDate } = await execAsync('git log -1 --format="%ci"', {
      cwd: PROJECT_ROOT,
    });
    const { stdout: commitMessage } = await execAsync('git log -1 --format="%s"', {
      cwd: PROJECT_ROOT,
    });

    // Check if there are updates available
    await execAsync("git fetch origin", { cwd: PROJECT_ROOT });
    const { stdout: behind } = await execAsync(
      "git rev-list --count HEAD..origin/main",
      { cwd: PROJECT_ROOT }
    );

    // Get system info (for Raspberry Pi)
    let systemInfo = {};
    try {
      const { stdout: hostname } = await execAsync("hostname");
      const { stdout: uptime } = await execAsync("uptime -p");
      const { stdout: memory } = await execAsync("free -h | grep Mem | awk '{print $3\"/\"$2}'");
      const { stdout: disk } = await execAsync("df -h / | tail -1 | awk '{print $3\"/\"$2\" (\"$5\" used)\"}'");

      systemInfo = {
        hostname: hostname.trim(),
        uptime: uptime.trim(),
        memory: memory.trim(),
        disk: disk.trim(),
      };
    } catch {
      // System info not available (probably not Linux)
    }

    return NextResponse.json({
      git: {
        branch: branch.trim(),
        commit: commit.trim(),
        commitDate: commitDate.trim(),
        commitMessage: commitMessage.trim(),
        updatesAvailable: parseInt(behind.trim()) > 0,
        commitsBehind: parseInt(behind.trim()),
      },
      system: systemInfo,
      projectRoot: PROJECT_ROOT,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to get system status", message: errorMessage },
      { status: 500 }
    );
  }
}
