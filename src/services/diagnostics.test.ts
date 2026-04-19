import { describe, it, expect } from "vitest";
import { diagnoseFailure } from "./diagnostics.js";
import { type ExecError } from "../integrations/codex_client.js";

function makeExecError(message: string, stderr?: string): ExecError {
  const err = new Error(message) as ExecError;
  err.stderr = stderr;
  return err;
}

describe("diagnoseFailure", () => {
  it("detects missing codex CLI", () => {
    const err = makeExecError("spawn codex ENOENT");
    expect(diagnoseFailure(err)).toContain("Codex CLI not found");
  });

  it("detects auth issues", () => {
    const err = makeExecError("error", "not logged in");
    expect(diagnoseFailure(err)).toContain("authentication required");
  });

  it("detects timeout", () => {
    const err = makeExecError("codex exec timed out after 180000ms");
    expect(diagnoseFailure(err)).toContain("timed out");
  });

  it("returns generic message for unknown errors", () => {
    const err = makeExecError("something went wrong");
    expect(diagnoseFailure(err)).toContain("Codex execution failed");
  });
});
