import { runCodexExec, type ExecError } from "../integrations/codex_client.js";
import { toSlackMarkdown } from "../integrations/slack_formatters.js";
import { type SlackContext } from "../integrations/slack_api.js";

const JSON_SCHEMA = `{
  "candidates": [
    { "name": string, "reason": string, "budget_usd": number, "walk_min": number, "vibe": string, "url": string }
  ],
  "final_message": string
}`;

function buildHangoutPrompt(
  slackText: string,
  slackContext: SlackContext | null
) {
  return `
You are a US-based hangout planning assistant.

User request (raw Slack text):
${JSON.stringify(slackText)}

Slack context (JSON, if available):
${JSON.stringify(slackContext || null)}

Rules:
- Output VALID JSON ONLY. No markdown. No prose.
- Follow this JSON schema exactly:
${JSON_SCHEMA}
- Propose exactly 3 candidates.
- If information is missing, make reasonable assumptions instead of asking questions.
- Include a URL for each candidate in "url".
- Prefer US context (neighborhoods, budgets in USD, typical meetup venues like bars, casual restaurants, breweries).
`.trim();
}

function tryParseJson(stdout: string) {
  // If extra lines exist, capture the first JSON object.
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in codex output.");
  }
  const jsonText = stdout.slice(start, end + 1);
  return JSON.parse(jsonText);
}

function parseHangoutText(slackText: string): {
  area: string;
  budget: string;
  people: string;
  time: string;
} {
  const text = (slackText || "").trim();
  const parts = text.split(/\s+/).filter(Boolean);
  const [area, budget, people, time] = parts;
  return {
    area: area || "unspecified",
    budget: budget || "unspecified",
    people: people || "unspecified",
    time: time || "unspecified",
  };
}

export function formatSearchConditions(slackText: string): string {
  const cond = parseHangoutText(slackText);
  return `🔎 Search conditions: Area=${cond.area} / Budget=${cond.budget} USD per person / People=${cond.people} / Start=${cond.time}`;
}

function formatHangoutMessage(plan: {
  candidates: Array<{
    name: string;
    reason: string;
    budget_usd: number;
    walk_min: number;
    vibe: string;
    url?: string;
  }>;
  final_message?: string;
}): string {
  const lines = [];
  lines.push(`🍻 *Hangout picks (3)*`);
  for (const [i, c] of plan.candidates.entries()) {
    const reason = toSlackMarkdown(c.reason || "");
    const urlLine = c.url ? `• <${c.url}|Website>` : "";
    lines.push(
      `*${i + 1}. ${c.name}* ($${c.budget_usd} / ${c.walk_min} min walk / ${
        c.vibe
      })\n• ${reason}${urlLine ? `\n${urlLine}` : ""}`
    );
  }
  if (plan.final_message) {
    lines.push(`\n📣 *Meetup message*\n${toSlackMarkdown(plan.final_message)}`);
  }
  return lines.join("\n");
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

export async function planHangout({
  slackText,
  workdir,
  slackContext,
}: {
  slackText: string;
  workdir: string;
  slackContext: SlackContext | null;
}) {
  const prompt1 = buildHangoutPrompt(slackText, slackContext);

  try {
    const { stdout } = await runCodexExec({ prompt: prompt1, cwd: workdir });
    const plan = tryParseJson(stdout);
    return { ok: true, text: formatHangoutMessage(plan), raw: plan };
  } catch (e1) {
    // Retry once with a stronger JSON-only instruction.
    const prompt2 = `${prompt1}\n\nIMPORTANT: Output JSON ONLY. Do not include any other text.`;
    try {
      const { stdout } = await runCodexExec({ prompt: prompt2, cwd: workdir });
      const plan = tryParseJson(stdout);
      return { ok: true, text: formatHangoutMessage(plan), raw: plan };
    } catch (e2) {
      const hint = diagnoseFailure(e2 as ExecError);
      console.error("planHangout failed", {
        error1: (e1 as ExecError)?.message,
        error2: (e2 as ExecError)?.message,
        stderr: (e2 as ExecError)?.stderr ?? (e1 as ExecError)?.stderr,
        stdout: (e2 as ExecError)?.stdout ?? (e1 as ExecError)?.stdout,
      });
      const debugEnabled =
        process.env.PLANNER_DEBUG === "1" ||
        process.env.PLANNER_DEBUG === "true";
      return {
        ok: false,
        text: debugEnabled
          ? `⚠️ Failed to generate suggestions.\nReason: ${hint}`
          : `⚠️ Failed to generate suggestions. Please shorten the request and try again (e.g. \`/hangout Downtown 40 4 7:30pm\`).\nReason: ${hint}`,
        debug: {
          error1: e1?.message,
          error2: e2?.message,
          stderr: e2?.stderr ?? e1?.stderr,
        },
      };
    }
  }
}
