import { runCodexExec, type ExecError } from "../integrations/codex_client.js";
import { type SlackContext } from "../integrations/slack_api.js";
import { diagnoseFailure } from "./diagnostics.js";

function buildMentionPrompt(
  slackText: string,
  slackContext: SlackContext | null
) {
  return `
You are a helpful assistant responding in a Slack channel.
Respond naturally in the user's language. Be concise and friendly.
Assume a US context unless the user specifies otherwise.

User message:
${JSON.stringify(slackText)}

Slack context (JSON, if available):
${JSON.stringify(slackContext || null)}

Rules:
- Your response will be posted directly to Slack. Use Slack mrkdwn format:
  - Bold: *text*
  - Italic: _text_
  - Code: \`code\` or \`\`\`code block\`\`\`
  - Links: <https://url|display text>
  - Lists: use bullet character "•"
- Do NOT use standard Markdown (no **bold**, no [link](url), no # headings).
- URLs are allowed if relevant.
`.trim();
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
    const text = (stdout || "").trim();
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
