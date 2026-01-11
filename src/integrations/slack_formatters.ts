export function stripBotMention(text: string): string {
  return (text || "").replace(/^<@[^>]+>\s*/, "").trim();
}

function toSlackLinks(text: string): string {
  return (text || "").replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "<$2|$1>");
}

export function stripUrls(text: string): string {
  let out = text || "";
  // Convert markdown links to plain text.
  out = out.replace(/\[([^\]]+)\]\(([^)]*)\)/g, "$1");
  // Remove any dangling markdown link openings like "([site](".
  out = out.replace(/\(\s*\[[^\]]+\]\s*\(?/g, "");
  // Remove empty parentheses left behind.
  out = out.replace(/\(\s*\)/g, "");
  // Remove empty brackets left behind.
  out = out.replace(/\[\s*\]/g, "");
  // Slack-style links: <url|text> or <url>
  out = out.replace(/<[^|>]+\|([^>]+)>/g, "$1");
  out = out.replace(/<https?:\/\/[^>]+>/g, "");
  // Remove raw URLs.
  out = out.replace(/https?:\/\/\S+/g, "");
  // Remove bare domains.
  out = out.replace(/\b[a-z0-9.-]+\.[a-z]{2,}\b/gi, "");
  return out.replace(/\s{2,}/g, " ").trim();
}

export function toSlackMarkdown(text: string): string {
  let out = text || "";
  // Headings: "# Title" -> "*Title*"
  out = out.replace(/^\s{0,3}#{1,6}\s+(.+)$/gm, "*$1*");
  // Bold: "**text**" -> "*text*"
  out = out.replace(/\*\*(.+?)\*\*/g, "*$1*");
  // List bullets: "- item" or "* item" -> "• item"
  out = out.replace(/^\s*[-*]\s+/gm, "• ");
  out = toSlackLinks(out);
  return out.trim();
}
