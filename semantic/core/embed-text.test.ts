import { describe, it, expect } from "vitest";
import { extractPlainText, buildEmbedText, buildSnippet, kindFor } from "./embed-text.js";
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

  it("extracts typed args from markup and strips warning URLs", () => {
    const withMarkup: RawEntry = {
      ...entry,
      markup: `<function name="Say" parent="Player" type="classfunc">
        <description>Forces the player to say something.
          <warning>Max 126 chars. [Source](https://github.com/x/y/client.cpp#L84)</warning>
        </description>
        <realm>Server</realm>
        <args>
          <arg name="text" type="string">The text to say.</arg>
          <arg name="teamOnly" type="boolean" default="false">Team only.</arg>
        </args>
      </function>`,
    };

    const t = buildEmbedText(withMarkup);

    expect(t).toContain("text (string): The text to say.");
    expect(t).toContain("teamOnly (boolean): Team only.");
    expect(t).toContain("Server");
    expect(t).not.toContain("github.com"); // URL stripped
    expect(t).toContain("Source"); // link label kept
  });

  it("falls back to HTML when markup has no <function>", () => {
    const cat: RawEntry = { ...entry, markup: "<cat>2D Rendering</cat>" };
    expect(buildEmbedText(cat)).toContain("Forces the player to say");
  });
});

describe("kindFor", () => {
  const k = (markup?: string) => kindFor({ ...entry, markup });

  it("classifies callable functions", () => {
    expect(k(`<function type="classfunc"></function>`)).toBe("function");
    expect(k(`<function type="libraryfunc"></function>`)).toBe("function");
    expect(k(`<function type="panelfunc"></function>`)).toBe("function");
  });

  it("classifies hooks", () => {
    expect(k(`<function type="hook"></function>`)).toBe("hook");
    expect(k(`<function type="panelhook"></function>`)).toBe("hook");
  });

  it("treats enums/categories and markup-less pages as other", () => {
    expect(k(`<enum></enum>`)).toBe("other");
    expect(k(`<cat>2D Rendering</cat>`)).toBe("other");
    expect(k(undefined)).toBe("other");
  });
});

describe("buildSnippet", () => {
  it("returns a short plain preview", () => {
    const s = buildSnippet(entry, 40);

    expect(s.length).toBeLessThanOrEqual(43); // 40 + possible "..."
    expect(s).toContain("Forces the player");
  });

  it("uses the markup description, omitting signature/Search Github/Description", () => {
    const withMarkup: RawEntry = {
      ...entry,
      html: "<div>Entity:TakeDamage( number damageAmount ) Search Github Description Applies damage.</div>",
      markup: `<function name="TakeDamage" parent="Entity" type="classfunc">
        <description>Applies the specified amount of damage to the entity.</description>
        <realm>Shared</realm>
      </function>`,
    };

    const s = buildSnippet(withMarkup);

    expect(s).toBe("Applies the specified amount of damage to the entity.");
    expect(s).not.toContain("Search Github");
    expect(s).not.toContain("Description");
  });
});
