/**
 * Renderer for the Facepunch wiki markup format (https://wiki.facepunch.com/wiki/)
 * plus regular markdown, matching the HTML structure the official wiki emits.
 *
 * Used for user-created ("custom") pages: the official scraped pages already
 * come pre-rendered, so this renderer never touches them.
 */

import { highlightLua } from "./lua.js";

export interface RenderContext {
  /** Whether a wiki page exists at `address` (official or custom). */
  pageExists(address: string): boolean;
}

export interface RenderedPage {
  html: string;
  /** Space-separated tag words, e.g. "function realm-server custom". */
  tags: string;
  /** Plain-text summary for og:description. */
  description: string;
  /** Title from a `<title>` tag in the markup, if present. */
  title?: string;
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

/** Text context: quotes stay literal, matching the official renderer's output. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Attribute context: quotes must be escaped. */
function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/"/g, "&quot;");
}

/** "What is the Dev branch?" -> "whatisthedevbranch" (official slug format) */
function anchorSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function headerHtml(level: number, inner: string, slug: string): string {
  return `<h${level}>${inner}<a class="anchor" href="#${slug}"><i class="mdi mdi-link-variant"></i></a><a name="${slug}" class="anchor_offset"></a></h${level}>\n`;
}

/** Section header used inside function/enum/struct blocks ("Description", "Arguments", ...) */
function sectionHeader(name: string, newlineAfter = true): string {
  const slug = anchorSlug(name);
  return `<h1>${name}<a class="anchor" href="#${slug}"><i class="mdi mdi-link-variant"></i></a><a name="${slug}" class="anchor_offset"></a></h1>${newlineAfter ? "\n" : ""}`;
}

/**
 * Display text for a `<page>` link without explicit text, mirroring the
 * official transforms: Global.print -> print, Structures/X -> "X structure",
 * Enums/X -> "X enum".
 */
function pageDisplayText(address: string): string {
  const clean = address.split("#")[0];
  if (clean.startsWith("Global.")) return clean.slice("Global.".length);
  if (clean.startsWith("Structures/")) return `${clean.slice("Structures/".length)} structure`;
  if (clean.startsWith("Enums/")) return `${clean.slice("Enums/".length)} enum`;
  return clean || address;
}

function pageLink(ctx: RenderContext, address: string, text?: string): string {
  const clean = address.trim();
  const target = clean.split("#")[0];
  const exists = target.length === 0 || ctx.pageExists(target);
  const cls = exists ? "link-page exists" : "link-page missing";
  const display = text !== undefined && text.length > 0 ? text : pageDisplayText(clean);
  return `<a class="${cls}" href="/${escapeAttr(clean)}">${escapeHtml(display)}</a>`;
}

function typeLink(ctx: RenderContext, type: string): string {
  return pageLink(ctx, type.trim());
}

/* ------------------------------------------------------------------ */
/* very small XML-ish tag extraction (regex-based on purpose: the      */
/* markup is not valid XML — code blocks contain raw `<`)              */
/* ------------------------------------------------------------------ */

interface TagMatch {
  full: string;
  attrs: Record<string, string>;
  inner: string;
  index: number;
}

function parseAttrs(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z_][\w-]*)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrString))) attrs[m[1].toLowerCase()] = m[2];
  return attrs;
}

/** Find all `<tag ...>...</tag>` occurrences (non-nested, non-greedy). */
function findTags(text: string, tag: string): TagMatch[] {
  const re = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)</${tag}>`, "gi");
  const out: TagMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out.push({ full: m[0], attrs: parseAttrs(m[1]), inner: m[2], index: m.index });
  }
  return out;
}

function firstTag(text: string, tag: string): TagMatch | null {
  return findTags(text, tag)[0] ?? null;
}

/* ------------------------------------------------------------------ */
/* realms                                                              */
/* ------------------------------------------------------------------ */

function parseRealms(realmText: string): string[] {
  const t = realmText.toLowerCase();
  const realms: string[] = [];
  if (t.includes("shared") || t.includes("client")) realms.push("client");
  if (t.includes("shared") || t.includes("server")) realms.push("server");
  if (t.includes("menu")) realms.push("menu");
  return realms;
}

function realmClasses(realms: string[]): string {
  return realms.map((r) => `realm-${r}`).join(" ");
}

function realmIcon(realms: string[], noun: string): string {
  const list =
    realms.length > 1
      ? `${realms.slice(0, -1).join(", ")} and ${realms[realms.length - 1]}`
      : realms[0] ?? "unknown";
  return `<a href="/States" class="realm_icon" title="This ${noun} is available in ${list} state(s)">&nbsp;</a>`;
}

/* ------------------------------------------------------------------ */
/* rich text (markdown + inline/block wiki tags)                       */
/* ------------------------------------------------------------------ */

interface RichTextOptions {
  /** Don't wrap the first paragraph in `<p>` (arg/ret/enum descriptions). */
  compact?: boolean;
}

class Placeholders {
  private items: string[] = [];

  add(html: string): string {
    this.items.push(html);
    return `\x00${this.items.length - 1}\x00`;
  }

  restore(text: string): string {
    return text.replace(/\x00(\d+)\x00/g, (_, n) => this.items[Number(n)]);
  }
}

function renderInline(ctx: RenderContext, text: string, ph: Placeholders): string {
  let out = text;

  // Wiki inline tags first (their contents must survive HTML escaping)
  out = out.replace(/<page(\b[^>]*)>([\s\S]*?)<\/page>/gi, (_m, attrString, inner) => {
    const attrs = parseAttrs(attrString);
    return ph.add(pageLink(ctx, inner.trim(), attrs.text));
  });

  out = out.replace(/<key>([^<]*)<\/key>/gi, (_m, key) => {
    const k = key.trim();
    return ph.add(`<span title="${escapeAttr(k)}" class="key key-${anchorSlug(k)}">${escapeHtml(k)}</span>`);
  });

  out = out.replace(/<image\b([^>]*)\/?>/gi, (_m, attrString) => {
    const attrs = parseAttrs(attrString);
    if (!attrs.src) return "";
    return ph.add(`<img src="${escapeAttr(attrs.src)}" alt="${escapeAttr(attrs.alt ?? "")}" loading="lazy">`);
  });

  out = out.replace(/<br\s*\/?>/gi, () => ph.add("<br>"));

  // Tags we render structurally elsewhere or intentionally drop; keep their inner text.
  out = out.replace(/<\/?(?:validate|rendercontext|added|removed_inline|summary)\b[^>]*>/gi, "");

  // Now escape whatever HTML remains — user markup is never trusted as raw HTML.
  out = escapeHtml(out);

  // Inline code (protect before other markdown so `**` inside code survives)
  out = out.replace(/`([^`\n]+)`/g, (_m, code) => ph.add(`<code>${code}</code>`));

  // Images / links (markdown)
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_m, alt, url) =>
    ph.add(`<img src="${escapeAttr(url)}" alt="${escapeAttr(alt)}" loading="lazy">`),
  );

  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_m, label, url, title) => {
    const titleAttr = title ? ` title="${escapeAttr(title)}"` : "";
    if (/^https?:\/\//i.test(url)) {
      return ph.add(`<a target="_blank" href="${escapeAttr(url)}"${titleAttr}>${label}</a>`);
    }
    return ph.add(`<a href="${escapeAttr(url)}"${titleAttr}>${label}</a>`);
  });

  // Bold / italic
  out = out.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?:;]|$)/g, "$1<em>$2</em>");
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, "$1<em>$2</em>");

  // Single newlines inside a paragraph become <br>
  out = out.replace(/\n/g, "<br>\n");

  return out;
}

function renderCodeFence(lang: string, code: string, ctx: RenderContext): string {
  const language = (lang || "").trim().toLowerCase();
  const trimmed = code.replace(/^\n+|\s+$/g, "");
  const cls = language ? `code code-${language}` : "code";
  const body =
    language === "lua" || language === ""
      ? highlightLua(trimmed, (addr) => ctx.pageExists(addr))
      : escapeHtml(trimmed);
  return `<div data-generationtime="0" class="${cls}"><copy><i class="mdi mdi-content-copy"></i></copy>${body}</div>`;
}

interface NoticeSpec {
  cls: string;
  prefix?: string;
}

const NOTICE_TAGS: Record<string, NoticeSpec> = {
  note: { cls: "note" },
  warning: { cls: "warning" },
  bug: { cls: "bug" },
  deprecated: {
    cls: "deprecated",
    prefix: "We advise against using this. It may be changed or removed in a future update.",
  },
  removed: { cls: "removed", prefix: "This feature has been removed." },
  internal: {
    cls: "internal",
    prefix: "This is used internally - although you're able to use it you probably shouldn't.",
  },
};

function renderNotice(ctx: RenderContext, tag: string, attrs: Record<string, string>, inner: string): string {
  const spec = NOTICE_TAGS[tag];
  const content = renderRichText(ctx, inner.trim(), { compact: true });

  let body = "";
  if (spec.prefix) {
    body = spec.prefix;
    if (content) body += `<br><br>${content}`;
  } else {
    body = content;
  }

  if (tag === "bug") {
    if (attrs.issue) {
      body += `<br><br>Issue Tracker: <a target="_blank" href="https://github.com/Facepunch/garrysmod-issues/issues/${escapeAttr(attrs.issue)}">${escapeHtml(attrs.issue)}</a>`;
    } else if (attrs.pull) {
      body += `<br><br>Pull Request: <a target="_blank" href="https://github.com/Facepunch/garrysmod/pull/${escapeAttr(attrs.pull)}">${escapeHtml(attrs.pull)}</a>`;
    } else if (attrs.request) {
      body += `<br><br>Request: <a target="_blank" href="https://github.com/Facepunch/garrysmod-requests/issues/${escapeAttr(attrs.request)}">${escapeHtml(attrs.request)}</a>`;
    }
  }

  return `<div class="${spec.cls}"><div class="inner">${body}</div></div>`;
}

/**
 * Render markdown + inline wiki tags to HTML. Handles paragraphs, headers,
 * lists, tables, blockquotes, fenced code and the notice tags.
 */
export function renderRichText(ctx: RenderContext, text: string, opts: RichTextOptions = {}): string {
  if (!text || !text.trim()) return "";

  const ph = new Placeholders();
  let src = text.replace(/\r\n/g, "\n");

  // Fenced code blocks (```lang ... ```)
  src = src.replace(/```([^\n`]*)\n([\s\S]*?)```/g, (_m, lang, code) =>
    `\n\n${ph.add(renderCodeFence(lang, code, ctx))}\n\n`,
  );

  // <code>...</code> used as a block in wiki markup
  src = src.replace(/<code(?:\s[^>]*)?>([\s\S]*?)<\/code>/gi, (_m, code) =>
    `\n\n${ph.add(renderCodeFence("lua", code, ctx))}\n\n`,
  );

  // Block-level notice tags
  for (const tag of Object.keys(NOTICE_TAGS)) {
    src = src.replace(new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)</${tag}>`, "gi"), (_m, attrString, inner) =>
      `\n\n${ph.add(renderNotice(ctx, tag, parseAttrs(attrString), inner))}\n\n`,
    );
    // Self-closing variants: <deprecated/>, <internal/>
    src = src.replace(new RegExp(`<${tag}\\b([^>]*)/>`, "gi"), (_m, attrString) =>
      `\n\n${ph.add(renderNotice(ctx, tag, parseAttrs(attrString), ""))}\n\n`,
    );
  }

  const lines = src.split("\n");
  const blocks: string[] = [];
  let paragraph: string[] = [];
  let paragraphCount = 0;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const content = paragraph.join("\n").trim();
    paragraph = [];
    if (!content) return;

    // A block placeholder standing alone is emitted without <p> wrapping
    if (/^(?:\x00\d+\x00\s*)+$/.test(content)) {
      blocks.push(content.replace(/\s+/g, ""));
      return;
    }

    const inline = renderInline(ctx, content, ph);
    if (opts.compact && paragraphCount === 0) {
      blocks.push(inline);
    } else {
      blocks.push(`<p>${inline}</p>\n`);
    }
    paragraphCount++;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Blank line: paragraph boundary
    if (/^\s*$/.test(line)) {
      flushParagraph();
      continue;
    }

    // Headers
    const header = line.match(/^(#{1,6})\s+(.*)$/);
    if (header) {
      flushParagraph();
      const level = header[1].length;
      const inner = renderInline(ctx, header[2].trim(), ph);
      const slug = anchorSlug(header[2].trim());
      blocks.push(headerHtml(level === 1 ? 1 : level, inner, slug));
      continue;
    }

    // Horizontal rule
    if (/^(\* \* \*|\*\*\*|---+)\s*$/.test(line.trim())) {
      flushParagraph();
      blocks.push("<hr>\n");
      continue;
    }

    // Tables
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      flushParagraph();
      const splitRow = (row: string) =>
        row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

      const headers = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      i--;

      let table = "<table><thead><tr>";
      for (const h of headers) table += `<th>${renderInline(ctx, h, ph)}</th>`;
      table += "</tr></thead><tbody>";
      for (const row of rows) {
        table += "<tr>";
        for (const cell of row) table += `<td>${renderInline(ctx, cell, ph)}</td>`;
        table += "</tr>";
      }
      table += "</tbody></table>\n";
      blocks.push(table);
      continue;
    }

    // Blockquotes
    if (/^\s*>/.test(line)) {
      flushParagraph();
      const quote: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      i--;
      blocks.push(`<blockquote><p>${renderInline(ctx, quote.join("\n").trim(), ph)}</p>\n</blockquote>\n`);
      continue;
    }

    // Lists
    if (/^\s*(?:[*+-]|\d+\.)\s+/.test(line)) {
      flushParagraph();

      interface ListItem { indent: number; ordered: boolean; content: string[]; }
      const items: ListItem[] = [];
      let loose = false;
      let sawBlank = false;

      while (i < lines.length) {
        const l = lines[i];
        const m = l.match(/^(\s*)([*+-]|\d+\.)\s+(.*)$/);
        if (m) {
          if (sawBlank) loose = true;
          sawBlank = false;
          items.push({ indent: m[1].length, ordered: /\d/.test(m[2]), content: [m[3]] });
          i++;
        } else if (/^\s*$/.test(l)) {
          sawBlank = true;
          i++;
          if (i < lines.length && !/^\s*(?:[*+-]|\d+\.)\s+/.test(lines[i]) && !/^\s+\S/.test(lines[i])) break;
        } else if (/^\s+\S/.test(l) && items.length > 0) {
          sawBlank = false;
          items[items.length - 1].content.push(l.trim());
          i++;
        } else {
          break;
        }
      }
      i--;

      const renderList = (startIdx: number, indent: number): [string, number] => {
        const ordered = items[startIdx].ordered;
        let html = ordered ? "<ol>\n" : "<ul>\n";
        let idx = startIdx;
        while (idx < items.length && items[idx].indent >= indent) {
          if (items[idx].indent > indent) {
            const [subHtml, nextIdx] = renderList(idx, items[idx].indent);
            html = html.replace(/<\/li>\n$/, `${subHtml}</li>\n`);
            idx = nextIdx;
            continue;
          }
          const content = renderInline(ctx, items[idx].content.join("\n"), ph);
          html += loose ? `<li><p>${content}</p>\n</li>\n` : `<li>${content}</li>\n`;
          idx++;
        }
        html += ordered ? "</ol>\n" : "</ul>\n";
        return [html, idx];
      };

      if (items.length > 0) {
        const [listHtml] = renderList(0, items[0].indent);
        blocks.push(listHtml);
      }
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();

  return ph.restore(blocks.join(""));
}

/* ------------------------------------------------------------------ */
/* function blocks                                                     */
/* ------------------------------------------------------------------ */

interface ArgSpec {
  name: string;
  type: string;
  default?: string;
  desc: string;
}

function parseArgLike(inner: string, tag: string): ArgSpec[] {
  const out: ArgSpec[] = [];
  const re = new RegExp(`<${tag}\\b([^>]*?)(?:/>|>([\\s\\S]*?)</${tag}>)`, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner))) {
    const attrs = parseAttrs(m[1]);
    out.push({
      name: attrs.name ?? "",
      type: attrs.type ?? "any",
      default: attrs.default,
      desc: (m[2] ?? "").trim(),
    });
  }
  return out;
}

function renderFunction(ctx: RenderContext, attrs: Record<string, string>, inner: string): { html: string; classes: string[] } {
  const name = attrs.name ?? "";
  const parent = attrs.parent ?? "";
  const type = (attrs.type ?? "libraryfunc").toLowerCase();

  const description = firstTag(inner, "description")?.inner ?? "";
  const realmText = firstTag(inner, "realm")?.inner ?? "Shared";
  const argsInner = firstTag(inner, "args")?.inner ?? "";
  const retsInner = firstTag(inner, "rets")?.inner ?? "";

  const args = parseArgLike(argsInner, "arg");
  const rets = parseArgLike(retsInner, "ret");

  const realms = parseRealms(realmText);
  const classes = ["function", type, ...realms.map((r) => `realm-${r}`)];

  // --- signature line -------------------------------------------------
  let line = `${realmIcon(realms, "function")} `;

  if (rets.length > 0) {
    line += rets.map((r) => typeLink(ctx, r.type)).join(",  ") + " ";
  }

  const separator = type === "classfunc" || type === "hook" || type === "panelfunc" ? ":" : ".";
  let qualifiedName = name;
  if (parent && parent !== "Global") {
    line += `<a class="subject" href="/${escapeAttr(parent)}">${escapeHtml(parent)}</a>${separator}${escapeHtml(name)}`;
    qualifiedName = `${parent}${separator}${name}`;
  } else {
    line += escapeHtml(name);
  }

  if (args.length > 0) {
    const argParts = args.map((a) => {
      if (a.type === "vararg") return "...";
      let part = `${typeLink(ctx, a.type)} ${escapeHtml(a.name)}`;
      if (a.default !== undefined) part += ` = ${escapeHtml(a.default)}`;
      return part;
    });
    line += `( ${argParts.join(",  ")} )`;
  } else {
    line += "()";
  }

  let html = `<div class="${classes.join(" ")}">\n`;
  html += `<div class="function_line">${line}</div>`;
  html += `<div class="function_links">\n<a target="_blank" href="https://github.com/Facepunch/garrysmod/search?utf8=%E2%9C%93&amp;q=${encodeURIComponent(qualifiedName).replace(/%3A/g, ":")}" target="_blank"><i class="mdi mdi-github-box"></i> Search Github</a>\n</div>\n`;

  // --- description ----------------------------------------------------
  html += sectionHeader("Description");
  html += `<div class="description_section function_description section">${renderRichText(ctx, description.trim())}</div>`;

  // --- arguments ------------------------------------------------------
  if (args.length > 0) {
    html += sectionHeader("Arguments");
    html += `<div class="function_arguments section">`;
    args.forEach((a, idx) => {
      html += `<div><span class="numbertag">${idx + 1}</span> ${typeLink(ctx, a.type)} <span class="name">${escapeHtml(a.name)}</span>`;
      if (a.default !== undefined) html += `<span class="default"> = ${escapeHtml(a.default)}</span>`;
      html += `<div class="numbertagindent">${renderRichText(ctx, a.desc, { compact: true })}</div></div>`;
    });
    html += `</div>`;
  }

  // --- returns --------------------------------------------------------
  if (rets.length > 0) {
    html += sectionHeader("Returns", false);
    html += `<div class="function_returns section">`;
    rets.forEach((r, idx) => {
      html += `<div><span class="numbertag">${idx + 1}</span> ${typeLink(ctx, r.type)} <span class="name">${escapeHtml(r.name)}</span>`;
      html += `<div class="numbertagindent">${renderRichText(ctx, r.desc, { compact: true })}</div></div>`;
    });
    html += `</div>`;
  }

  html += `</div>`;
  return { html, classes };
}

/* ------------------------------------------------------------------ */
/* example blocks                                                      */
/* ------------------------------------------------------------------ */

function renderExample(ctx: RenderContext, inner: string, index: number): string {
  const description = firstTag(inner, "description")?.inner ?? "";
  const code = firstTag(inner, "code")?.inner ?? "";
  const output = firstTag(inner, "output")?.inner ?? "";

  const slug = index === 0 ? "example" : `example${index + 1}`;
  let html = `<h2>Example<a class="anchor" href="#${slug}"><i class="mdi mdi-link-variant"></i></a><a name="${slug}" class="anchor_offset"></a></h2>\n`;
  html += `<div class="example">`;
  html += `<div class="description">${renderRichText(ctx, description.trim())}</div>`;

  if (code.trim()) {
    const trimmed = code.replace(/^\n+|\s+$/g, "");
    html += `<div class="code"><copy><i class="mdi mdi-content-copy"></i></copy>${highlightLua(trimmed, (addr) => ctx.pageExists(addr))}</div>`;
  }

  if (output.trim()) {
    html += `<div class="output"><b>Output:</b> ${renderRichText(ctx, output.trim(), { compact: true })}</div>`;
  }

  html += `</div>`;
  return html;
}

/* ------------------------------------------------------------------ */
/* enumeration blocks                                                  */
/* ------------------------------------------------------------------ */

function renderEnumeration(ctx: RenderContext, inner: string): { html: string; classes: string[] } {
  const description = firstTag(inner, "description")?.inner ?? "";
  const itemsInner = firstTag(inner, "items")?.inner ?? inner;
  const realmText = firstTag(inner, "realm")?.inner ?? "Shared";
  const realms = parseRealms(realmText);

  let html = `<div class="enum">`;
  html += sectionHeader("Description");
  html += `<div class="function_description">${renderRichText(ctx, description.trim())}</div>\n`;
  html += sectionHeader("Values");
  html += `<table><tbody>`;

  const re = /<item\b([^>]*?)(?:\/>|>([\s\S]*?)<\/item>)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(itemsInner))) {
    const attrs = parseAttrs(m[1]);
    const key = attrs.key ?? "";
    const value = attrs.value ?? "";
    const desc = (m[2] ?? "").trim();
    html += `<tr><td><a name="${escapeAttr(key)}" class="anchor_offset"></a><a href="#${escapeAttr(key)}">${escapeHtml(key)}</a></td><td>${escapeHtml(value)}</td><td>${renderRichText(ctx, desc, { compact: true })}</td></tr>`;
  }

  html += `</tbody></table></div>`;
  return { html, classes: ["enum", ...realms.map((r) => `realm-${r}`)] };
}

/* ------------------------------------------------------------------ */
/* structure blocks                                                    */
/* ------------------------------------------------------------------ */

function renderStructure(ctx: RenderContext, inner: string): { html: string; classes: string[] } {
  const description = firstTag(inner, "description")?.inner ?? "";
  const fieldsInner = firstTag(inner, "fields")?.inner ?? inner;
  const realmText = firstTag(inner, "realm")?.inner ?? "Shared";
  const realms = parseRealms(realmText);

  let html = `<div class="struct">\n`;
  html += sectionHeader("Description");
  html += `<div class="struct_description section">${renderRichText(ctx, description.trim())}</div>`;
  html += sectionHeader("Members");
  html += `<div class="section">`;

  const re = /<field\b([^>]*?)(?:\/>|>([\s\S]*?)<\/field>)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fieldsInner))) {
    const attrs = parseAttrs(m[1]);
    const name = attrs.name ?? "";
    const type = attrs.type ?? "any";
    const desc = (m[2] ?? "").trim();

    html += `<div class="member"><a name="${escapeAttr(name)}" class="anchor_offset"></a>${typeLink(ctx, type)}<a class="struct_anchor_link" href="#${escapeAttr(name)}"> <strong>${escapeHtml(name)}</strong></a>`;
    html += `<div class="description numbertagindent">${renderRichText(ctx, desc, { compact: true })}`;
    if (attrs.default !== undefined) {
      html += `<p><strong>Default:</strong> <code>${escapeHtml(attrs.default)}</code></p>\n`;
    }
    html += `</div></div>`;
  }

  html += `</div></div>`;
  return { html, classes: ["struct", ...realms.map((r) => `realm-${r}`)] };
}

/* ------------------------------------------------------------------ */
/* top level                                                           */
/* ------------------------------------------------------------------ */

const BLOCK_TAGS = ["function", "enumeration", "structure", "example", "panel", "type"];

export function renderWikitext(markup: string, ctx: RenderContext): RenderedPage {
  let src = (markup ?? "").replace(/\r\n/g, "\n");
  const tagSet = new Set<string>(["custom"]);

  // <title> overrides the page title
  const titleTag = firstTag(src, "title");
  const title = titleTag ? titleTag.inner.trim() : undefined;
  if (titleTag) src = src.replace(titleTag.full, "");

  // <cat> assigns wiki categories; not used for custom pages
  src = src.replace(/<cat>[\s\S]*?<\/cat>/gi, "");

  // Find top-level blocks in document order
  const blockRe = new RegExp(`<(${BLOCK_TAGS.join("|")})\\b([^>]*)>([\\s\\S]*?)</\\1>`, "gi");

  let html = "";
  let lastIndex = 0;
  let exampleIndex = 0;
  let m: RegExpExecArray | null;

  const renderTextSegment = (segment: string) => {
    if (segment.trim()) html += renderRichText(ctx, segment);
  };

  while ((m = blockRe.exec(src))) {
    renderTextSegment(src.slice(lastIndex, m.index));
    lastIndex = m.index + m[0].length;

    const tag = m[1].toLowerCase();
    const attrs = parseAttrs(m[2]);
    const inner = m[3];

    if (tag === "function") {
      const fn = renderFunction(ctx, attrs, inner);
      html += fn.html;
      fn.classes.forEach((c) => tagSet.add(c));
    } else if (tag === "example") {
      html += renderExample(ctx, inner, exampleIndex);
      exampleIndex++;
      tagSet.add("example");
    } else if (tag === "enumeration") {
      const en = renderEnumeration(ctx, inner);
      html += en.html;
      en.classes.forEach((c) => tagSet.add(c));
    } else if (tag === "structure") {
      const st = renderStructure(ctx, inner);
      html += st.html;
      st.classes.forEach((c) => tagSet.add(c));
    } else {
      // panel/type and anything unrecognized: render inner as rich text
      renderTextSegment(inner);
    }
  }

  renderTextSegment(src.slice(lastIndex));

  // og:description prefers the first <description> block (like the official
  // wiki) so the signature line doesn't leak into the summary.
  const descTag = firstTag(src, "description");
  const description = buildPlainDescription(
    descTag ? renderRichText(ctx, descTag.inner.trim()) : html,
  );

  return { html, tags: [...tagSet].join(" "), description, title };
}

/** First ~250 chars of visible text, for the og:description meta tag. */
function buildPlainDescription(html: string): string {
  const text = html
    .replace(/<div class="code[\s\S]*?<\/div>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= 254) return text;
  const cut = text.lastIndexOf(" ", 251);
  return text.slice(0, cut > 0 ? cut : 251) + "...";
}
