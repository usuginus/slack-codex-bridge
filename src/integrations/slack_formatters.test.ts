import { describe, it, expect } from "vitest";
import { stripBotMention } from "./slack_formatters.js";

describe("stripBotMention", () => {
  it("removes leading bot mention", () => {
    expect(stripBotMention("<@U123ABC> hello")).toBe("hello");
  });

  it("returns empty string for mention-only text", () => {
    expect(stripBotMention("<@U123ABC>")).toBe("");
  });

  it("handles empty input", () => {
    expect(stripBotMention("")).toBe("");
  });

  it("does not remove mid-text mentions", () => {
    expect(stripBotMention("hey <@U123ABC> check this")).toBe(
      "hey <@U123ABC> check this"
    );
  });
});
