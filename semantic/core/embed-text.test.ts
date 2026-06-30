import { describe, it, expect } from "vitest";
import { extractPlainText, buildEmbedText, buildSnippet } from "./embed-text.js";
import type { RawEntry } from "./types.js";

const entry: RawEntry = {
  address: "Player:Say",
  title: "Player:Say",
  tags: "function method member realm-server",
  html: "<div><h1>Description</h1><p>Forces the player to say whatever the first argument is.</p><script>ignore()</script></div>",
  revisionId: 565243,
};

describe("extractPlainText", () => {
  it("strips tags and scripts", () => {
    const t = extractPlainText(entry.html);
    expect(t).toContain("Forces the player to say");
    expect(t).not.toContain("ignore()");
    expect(t).not.toContain("<");
  });
});

describe("buildEmbedText", () => {
  it("leads with the title and tag words, then the body", () => {
    const t = buildEmbedText(entry);
    expect(t.startsWith("Player:Say")).toBe(true);
    expect(t).toContain("function");
    expect(t).toContain("Forces the player to say");
  });

  it("truncates to <= 1800 chars", () => {
    const big: RawEntry = { ...entry, html: "<p>" + "word ".repeat(2000) + "</p>" };
    expect(buildEmbedText(big).length).toBeLessThanOrEqual(1800);
  });
});

describe("buildSnippet", () => {
  it("returns a short plain preview", () => {
    const s = buildSnippet(entry, 40);
    expect(s.length).toBeLessThanOrEqual(43); // 40 + possible "..."
    expect(s).toContain("Forces the player");
  });
});
