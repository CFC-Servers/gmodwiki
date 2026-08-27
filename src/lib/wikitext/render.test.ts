import { describe, it, expect } from "vitest";
import { renderWikitext, renderRichText } from "./render.js";
import { highlightLua } from "./lua.js";

const KNOWN_PAGES = new Set([
  "boolean", "vararg", "function", "string", "number",
  "Global.pcall", "Global.print", "Global.Error", "Global.ErrorNoHalt", "Global.error",
  "GM:OnLuaError", "Player", "Entity",
]);

const ctx = { pageExists: (addr: string) => KNOWN_PAGES.has(addr) };

const PCALL_MARKUP = `<function name="pcall" parent="Global" type="libraryfunc">
	<description>
Calls a function and catches an error that can be thrown while the execution of the call.

<bug issue="2036">This cannot stop errors from hooks called from the engine.</bug>

<bug issue="2498">This does not stop <page>Global.Error</page> and <page>Global.ErrorNoHalt</page> from sending error messages to the server (if called clientside) or calling the <page>GM:OnLuaError</page> hook. The success boolean returned will always return true and thus you will not get the error message returned. <page>Global.error</page> does not exhibit these behaviours.</bug>

	</description>
	<realm>Shared and Menu</realm>
	<args>
		<arg name="func" type="function">Function to be executed and of which the errors should be caught of</arg>
		<arg name="arguments" type="vararg">Arguments to call the function with.</arg>
	</args>
	<rets>
		<ret name="" type="boolean">If the function had no errors occur within it.</ret>
		<ret name="" type="vararg">If an error occurred, this will be a string containing the error message. Otherwise, this will be the return values of the function passed in.</ret>
	</rets>
</function>

<example>
	<description>Catch an error.</description>
	<code>
local succ, err = pcall(function() aisj() end)
print(succ, err)
	</code>
	<output>false attempt to call global 'aisj' (a nil value)</output>

</example>`;

// Exact HTML the official wiki serves for Global.pcall (captured from
// gmodwiki.com/content/global.pcall.json).
const PCALL_EXPECTED = `<div class="function libraryfunc realm-client realm-server realm-menu">
<div class="function_line"><a href="/States" class="realm_icon" title="This function is available in client, server and menu state(s)">&nbsp;</a> <a class="link-page exists" href="/boolean">boolean</a>,  <a class="link-page exists" href="/vararg">vararg</a> pcall( <a class="link-page exists" href="/function">function</a> func,  ... )</div><div class="function_links">
<a target="_blank" href="https://github.com/Facepunch/garrysmod/search?utf8=%E2%9C%93&amp;q=pcall" target="_blank"><i class="mdi mdi-github-box"></i> Search Github</a>
</div>
<h1>Description<a class="anchor" href="#description"><i class="mdi mdi-link-variant"></i></a><a name="description" class="anchor_offset"></a></h1>
<div class="description_section function_description section"><p>Calls a function and catches an error that can be thrown while the execution of the call.</p>
<div class="bug"><div class="inner">This cannot stop errors from hooks called from the engine.<br><br>Issue Tracker: <a target="_blank" href="https://github.com/Facepunch/garrysmod-issues/issues/2036">2036</a></div></div><div class="bug"><div class="inner">This does not stop <a class="link-page exists" href="/Global.Error">Error</a> and <a class="link-page exists" href="/Global.ErrorNoHalt">ErrorNoHalt</a> from sending error messages to the server (if called clientside) or calling the <a class="link-page exists" href="/GM:OnLuaError">GM:OnLuaError</a> hook. The success boolean returned will always return true and thus you will not get the error message returned. <a class="link-page exists" href="/Global.error">error</a> does not exhibit these behaviours.<br><br>Issue Tracker: <a target="_blank" href="https://github.com/Facepunch/garrysmod-issues/issues/2498">2498</a></div></div></div><h1>Arguments<a class="anchor" href="#arguments"><i class="mdi mdi-link-variant"></i></a><a name="arguments" class="anchor_offset"></a></h1>
<div class="function_arguments section"><div><span class="numbertag">1</span> <a class="link-page exists" href="/function">function</a> <span class="name">func</span><div class="numbertagindent">Function to be executed and of which the errors should be caught of</div></div><div><span class="numbertag">2</span> <a class="link-page exists" href="/vararg">vararg</a> <span class="name">arguments</span><div class="numbertagindent">Arguments to call the function with.</div></div></div><h1>Returns<a class="anchor" href="#returns"><i class="mdi mdi-link-variant"></i></a><a name="returns" class="anchor_offset"></a></h1><div class="function_returns section"><div><span class="numbertag">1</span> <a class="link-page exists" href="/boolean">boolean</a> <span class="name"></span><div class="numbertagindent">If the function had no errors occur within it.</div></div><div><span class="numbertag">2</span> <a class="link-page exists" href="/vararg">vararg</a> <span class="name"></span><div class="numbertagindent">If an error occurred, this will be a string containing the error message. Otherwise, this will be the return values of the function passed in.</div></div></div></div><h2>Example<a class="anchor" href="#example"><i class="mdi mdi-link-variant"></i></a><a name="example" class="anchor_offset"></a></h2>
<div class="example"><div class="description"><p>Catch an error.</p>
</div><div class="code"><copy><i class="mdi mdi-content-copy"></i></copy><span class="keyword">local</span> succ, err <span class="operator">=</span> <span class="method"><a href="/Global.pcall">pcall</a></span>(<span class="method">function</span>() <span class="method">aisj</span>() <span class="keyword">end</span>)
<span class="method"><a href="/Global.print">print</a></span>(succ, err)</div><div class="output"><b>Output:</b> false attempt to call global 'aisj' (a nil value)</div></div>`;

describe("renderWikitext", () => {
  it("renders the pcall example exactly like the official wiki", () => {
    const result = renderWikitext(PCALL_MARKUP, ctx);
    expect(result.html).toBe(PCALL_EXPECTED);
  });

  it("collects realm/type tags", () => {
    const result = renderWikitext(PCALL_MARKUP, ctx);
    for (const tag of ["custom", "function", "libraryfunc", "realm-client", "realm-server", "realm-menu", "example"]) {
      expect(result.tags.split(" ")).toContain(tag);
    }
  });

  it("builds a plain-text description", () => {
    const result = renderWikitext(PCALL_MARKUP, ctx);
    expect(result.description).toContain("Calls a function and catches an error");
    expect(result.description).not.toContain("<");
  });

  it("renders class functions with subject links and defaults", () => {
    const markup = `<function name="Say" parent="Player" type="classfunc">
	<description>Forces the player to say something.</description>
	<realm>Server</realm>
	<args>
		<arg name="text" type="string">The text.</arg>
		<arg name="teamOnly" type="boolean" default="false">Team only?</arg>
	</args>
</function>`;
    const { html } = renderWikitext(markup, ctx);
    expect(html).toContain(`<div class="function classfunc realm-server">`);
    expect(html).toContain(`<a class="subject" href="/Player">Player</a>:Say( <a class="link-page exists" href="/string">string</a> text,  <a class="link-page exists" href="/boolean">boolean</a> teamOnly = false )`);
    expect(html).toContain(`title="This function is available in server state(s)"`);
    expect(html).toContain(`<span class="name">teamOnly</span><span class="default"> = false</span>`);
    expect(html).toContain(`q=Player:Say`);
  });

  it("renders enumerations as value tables", () => {
    const markup = `<enumeration>
<description>Test enum.</description>
<items>
<item key="USE_OFF" value="0">Off</item>
<item key="USE_ON" value="1"></item>
</items>
</enumeration>`;
    const { html, tags } = renderWikitext(markup, ctx);
    expect(html).toContain(`<div class="enum">`);
    expect(html).toContain(`<tr><td><a name="USE_OFF" class="anchor_offset"></a><a href="#USE_OFF">USE_OFF</a></td><td>0</td><td>Off</td></tr>`);
    expect(tags).toContain("enum");
  });

  it("renders structures with members", () => {
    const markup = `<structure>
<description>A struct.</description>
<fields>
<field name="Damage" type="number" default="1">The damage dealt.</field>
</fields>
</structure>`;
    const { html } = renderWikitext(markup, ctx);
    expect(html).toContain(`<div class="struct">`);
    expect(html).toContain(`<a name="Damage" class="anchor_offset"></a><a class="link-page exists" href="/number">number</a><a class="struct_anchor_link" href="#Damage"> <strong>Damage</strong></a>`);
    expect(html).toContain(`<p><strong>Default:</strong> <code>1</code></p>`);
  });

  it("escapes raw HTML in markup", () => {
    const { html } = renderWikitext(`Hello <script>alert(1)</script> world`, ctx);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("renderRichText", () => {
  it("renders markdown headers with official anchor slugs", () => {
    const html = renderRichText(ctx, "## What is the Dev branch?");
    expect(html).toBe(
      `<h2>What is the Dev branch?<a class="anchor" href="#whatisthedevbranch"><i class="mdi mdi-link-variant"></i></a><a name="whatisthedevbranch" class="anchor_offset"></a></h2>\n`,
    );
  });

  it("renders note and warning boxes", () => {
    expect(renderRichText(ctx, "<note>Be careful.</note>")).toBe(
      `<div class="note"><div class="inner">Be careful.</div></div>`,
    );
    expect(renderRichText(ctx, "<warning>Danger!</warning>")).toBe(
      `<div class="warning"><div class="inner">Danger!</div></div>`,
    );
  });

  it("renders deprecated with the standard notice", () => {
    const html = renderRichText(ctx, "<deprecated>Use x instead.</deprecated>");
    expect(html).toContain(`<div class="deprecated"><div class="inner">We advise against using this.`);
    expect(html).toContain("Use x instead.");
  });

  it("renders fenced lua code with highlighting", () => {
    const html = renderRichText(ctx, "```lua\nlocal x = 1\n```");
    expect(html).toBe(
      `<div data-generationtime="0" class="code code-lua"><copy><i class="mdi mdi-content-copy"></i></copy><span class="keyword">local</span> x <span class="operator">=</span> <span class="number">1</span></div>`,
    );
  });

  it("renders lists, links, bold and inline code", () => {
    const html = renderRichText(ctx, "* one **bold**\n* two `code`\n* [ext](https://example.com)");
    expect(html).toContain("<ul>\n<li>one <strong>bold</strong></li>\n");
    expect(html).toContain("<li>two <code>code</code></li>");
    expect(html).toContain(`<a target="_blank" href="https://example.com">ext</a>`);
  });

  it("renders markdown tables", () => {
    const html = renderRichText(ctx, "| A | B |\n|---|---|\n| 1 | 2 |");
    expect(html).toBe("<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>\n");
  });

  it("renders page links with existence classes", () => {
    expect(renderRichText(ctx, "<page>Global.print</page>", { compact: true })).toBe(
      `<a class="link-page exists" href="/Global.print">print</a>`,
    );
    expect(renderRichText(ctx, "<page>NoSuchPage</page>", { compact: true })).toBe(
      `<a class="link-page missing" href="/NoSuchPage">NoSuchPage</a>`,
    );
    expect(renderRichText(ctx, `<page text="custom label">Global.print</page>`, { compact: true })).toBe(
      `<a class="link-page exists" href="/Global.print">custom label</a>`,
    );
  });
});

describe("highlightLua", () => {
  it("highlights strings, comments and operators", () => {
    const html = highlightLua(`-- comment\nif BRANCH ~= "x86-64" then end`);
    expect(html).toContain(`<span class="comment">-- comment</span>`);
    expect(html).toContain(`<span class="keyword">if</span>`);
    expect(html).toContain(`<span class="operator">~=</span>`);
    expect(html).toContain(`<span class="string">"x86-64"</span>`);
  });

  it("escapes HTML inside code", () => {
    const html = highlightLua(`if a < b and c > d then end`);
    expect(html).toContain("&lt;");
    expect(html).toContain("&gt;");
    expect(html).not.toContain("<b ");
  });

  it("links known globals in calls", () => {
    const html = highlightLua("print(1)", (addr) => addr === "Global.print");
    expect(html).toBe(`<span class="method"><a href="/Global.print">print</a></span>(<span class="number">1</span>)`);
  });
});
