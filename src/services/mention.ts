import { runCodexExec, type ExecError } from "../integrations/codex_client.js";
import { toSlackMarkdown } from "../integrations/slack_formatters.js";
import { type SlackContext } from "../integrations/slack_api.js";

function buildMentionPrompt(
  slackText: string,
  slackContext: SlackContext | null
) {
  return `
You are a helpful assistant responding in a Slack channel.
Respond naturally in English to the user's mention. Be concise and friendly.
Assume a US context unless the user specifies otherwise.

User message:
${JSON.stringify(slackText)}

Slack context (JSON, if available):
${JSON.stringify(slackContext || null)}

Rules:
- URLs are allowed if relevant.
`.trim();
}

function formatMentionReply(text: string): string {
  let out = toSlackMarkdown(text);
  // Remove empty parentheses left behind by link stripping.
  out = out.replace(/\s*\(\s*\)\s*/g, " ");
  // Ensure numbered lists start on a new line.
  out = out.replace(/\s(\d+)\)/g, "\n$1)");
  // Ensure bullet points start on a new line.
  out = out.replace(/\s•/g, "\n•");
  // Collapse excessive newlines.
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}

function diagnoseFailure(err: ExecError) {
  const msg = `${err?.message ?? ""}\n${err?.stderr ?? ""}`.toLowerCase();
  if (msg.includes("enoent") || msg.includes("spawn codex")) {
    return "Codex CLI not found. Make sure `codex` is installed and on PATH.";
  }
  if (
    msg.includes("login") ||
    msg.includes("not logged in") ||
    msg.includes("auth")
  ) {
    return "Codex CLI authentication required. Run `codex login` and try again.";
  }
  if (msg.includes("timed out")) {
    return "Codex timed out. Shorten the request or increase the timeout.";
  }
  return "Codex execution failed. Check server stderr for details.";
}

export async function respondMention({
  slackText,
  workdir,
  slackContext,
}: {
  slackText: string;
  workdir: string;
  slackContext: SlackContext | null;
}) {
  const prompt = buildMentionPrompt(slackText, slackContext);
  try {
    const { stdout } = await runCodexExec({ prompt, cwd: workdir });
    const text = formatMentionReply((stdout || "").trim());
    if (!text) {
      throw new Error("Empty response from codex.");
    }
    return { ok: true, text };
  } catch (e) {
    const hint = diagnoseFailure(e as ExecError);
    console.error("respondMention failed", {
      error: (e as ExecError)?.message,
      stderr: (e as ExecError)?.stderr,
      stdout: (e as ExecError)?.stdout,
    });
    return {
      ok: false,
      text: `⚠️ Failed to generate a reply. Reason: ${hint}`,
      debug: {
        error: (e as ExecError)?.message,
        stderr: (e as ExecError)?.stderr,
      },
    };
  }
}
