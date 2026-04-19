export function stripBotMention(text: string): string {
  return (text || "").replace(/^<@[^>]+>\s*/, "").trim();
}
