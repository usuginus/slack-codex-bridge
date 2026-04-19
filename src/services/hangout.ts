import { runCodexExec, type ExecError } from "../integrations/codex_client.js";
import { type SlackContext } from "../integrations/slack_api.js";
import { diagnoseFailure } from "./diagnostics.js";

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
- The "reason" and "final_message" fields will be posted directly to Slack.
  Use Slack mrkdwn format: *bold*, _italic_, <https://url|text> for links.
  Do NOT use standard Markdown.
`.trim();
}

function tryParseJson(stdout: string): unknown {
  const start = stdout.indexOf("{");
  if (start === -1) {
    throw new Error("No JSON object found in codex output.");
  }

  // Track brace depth to find the matching closing brace.
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < stdout.length; i++) {
    const ch = stdout[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        return JSON.parse(stdout.slice(start, i + 1));
      }
    }
  }
  throw new Error("No complete JSON object found in codex output.");
}

type HangoutParams = {
  area: string;
  budget: string;
  people: string;
  time: string;
};

function parseHangoutText(slackText: string): HangoutParams {
  const text = (slackText || "").trim();

  // Support named parameters: "area:Downtown budget:40 people:4 time:7:30pm"
  const namedPattern = /(?:area|budget|people|time):/i;
  if (namedPattern.test(text)) {
    const get = (key: string): string => {
      const match = text.match(new RegExp(`${key}:\\s*(\\S+)`, "i"));
      return match?.[1] || "unspecified";
    };
    return {
      area: get("area"),
      budget: get("budget"),
      people: get("people"),
      time: get("time"),
    };
  }

  // Fallback: positional "Area Budget People Time"
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

type HangoutPlan = {
  candidates: Array<{
    name: string;
    reason: string;
    budget_usd: number;
    walk_min: number;
    vibe: string;
    url?: string;
  }>;
  final_message?: string;
};

function formatHangoutMessage(plan: HangoutPlan): string {
  const lines = [];
  lines.push(`🍻 *Hangout picks (3)*`);
  for (const [i, c] of plan.candidates.entries()) {
    const reason = c.reason || "";
    const urlLine = c.url ? `• <${c.url}|Website>` : "";
    lines.push(
      `*${i + 1}. ${c.name}* ($${c.budget_usd} / ${c.walk_min} min walk / ${
        c.vibe
      })\n• ${reason}${urlLine ? `\n${urlLine}` : ""}`
    );
  }
  if (plan.final_message) {
    lines.push(`\n📣 *Meetup message*\n${plan.final_message}`);
  }
  return lines.join("\n");
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
    const plan = tryParseJson(stdout) as HangoutPlan;
    return { ok: true, text: formatHangoutMessage(plan), raw: plan };
  } catch (e1) {
    // Retry once with a stronger JSON-only instruction.
    const prompt2 = `${prompt1}\n\nIMPORTANT: Output JSON ONLY. Do not include any other text.`;
    try {
      const { stdout } = await runCodexExec({ prompt: prompt2, cwd: workdir });
      const plan = tryParseJson(stdout) as HangoutPlan;
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
          error1: (e1 as ExecError)?.message,
          error2: (e2 as ExecError)?.message,
          stderr: (e2 as ExecError)?.stderr ?? (e1 as ExecError)?.stderr,
        },
      };
    }
  }
}
