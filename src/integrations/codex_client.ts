import { spawn } from "node:child_process";

export type ExecResult = {
  stdout: string;
  stderr: string;
};

export type ExecError = Error & {
  stdout?: string;
  stderr?: string;
};

export async function runCodexExec({
  prompt,
  cwd,
  timeoutMs = 180000,
}: {
  prompt: string;
  cwd: string;
  timeoutMs?: number;
}): Promise<ExecResult> {
  return await new Promise<ExecResult>((resolve, reject) => {
    const args = ["exec", "--skip-git-repo-check"];
    const webSearch = process.env.CODEX_WEB_SEARCH;
    if (webSearch === "0" || webSearch === "false") {
      args.push("-c", "features.web_search_request=false");
    }
    if (process.env.CODEX_MODEL) {
      args.push("-c", `model="${process.env.CODEX_MODEL}"`);
    }
    if (process.env.CODEX_REASONING_EFFORT) {
      args.push("-c", `reasoning.effort="${process.env.CODEX_REASONING_EFFORT}"`);
    }
    args.push(prompt);
    const child = spawn("codex", args, {
      cwd,
      env: {
        ...process.env,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => (stdout += d.toString("utf-8")));
    child.stderr.on("data", (d) => (stderr += d.toString("utf-8")));

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`codex exec timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        const e: ExecError = new Error(
          `Codex command failed with exit code: ${code}`
        );
        e.stdout = stdout;
        e.stderr = stderr;
        reject(e);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}
