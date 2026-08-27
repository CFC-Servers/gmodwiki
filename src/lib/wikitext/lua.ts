/**
 * Lua syntax highlighter that reproduces the span/link structure the official
 * Facepunch wiki renderer emits inside `<div class="code">` blocks:
 *
 *   - keywords        -> <span class="keyword">local</span>
 *   - `=`-style ops   -> <span class="operator">=</span>
 *   - calls           -> <span class="method">aisj</span>
 *   - known globals   -> <span class="method"><a href="/Global.print">print</a></span>
 *   - strings         -> <span class="string">"x86-64"</span>
 *   - comments        -> <span class="comment">-- hi</span>
 *   - numbers         -> <span class="number">42</span>
 */

const KEYWORDS = new Set([
  "and", "break", "do", "else", "elseif", "end", "false", "for", "function",
  "goto", "if", "in", "local", "nil", "not", "or", "repeat", "return", "then",
  "true", "until", "while",
]);

const OPERATORS = new Set([
  "==", "~=", "<=", ">=", "..", "=", "+", "-", "*", "/", "%", "^", "#", "<", ">",
]);

// Text context only — the official renderer leaves quotes unescaped in code.
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const TOKEN_RE = new RegExp(
  [
    /--\[(=*)\[[\s\S]*?\]\1\]/.source, // long comment
    /--[^\n]*/.source, // line comment
    /\[(=*)\[[\s\S]*?\]\2\]/.source, // long string
    /"(?:\\.|[^"\\\n])*"/.source, // double-quoted string
    /'(?:\\.|[^'\\\n])*'/.source, // single-quoted string
    /0[xX][0-9a-fA-F]+|\d+\.?\d*(?:[eE][-+]?\d+)?/.source, // number
    /[A-Za-z_][A-Za-z0-9_]*/.source, // identifier
    /==|~=|<=|>=|\.\./.source, // multi-char operators
    /[\s\S]/.source, // anything else, one char at a time
  ].join("|"),
  "g",
);

export function highlightLua(
  code: string,
  pageExists: (address: string) => boolean = () => false,
): string {
  const tokens = code.match(TOKEN_RE) ?? [];
  const out: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    if (tok.startsWith("--")) {
      out.push(`<span class="comment">${escapeHtml(tok)}</span>`);
      continue;
    }

    if (/^["'\[]/.test(tok) && (tok.length > 1 || tok === '"' || tok === "'")) {
      if (/^"(?:\\.|[^"\\\n])*"$|^'(?:\\.|[^'\\\n])*'$|^\[(=*)\[[\s\S]*?\]\1\]$/.test(tok)) {
        out.push(`<span class="string">${escapeHtml(tok)}</span>`);
        continue;
      }
    }

    if (/^(?:0[xX][0-9a-fA-F]+|\d)/.test(tok)) {
      out.push(`<span class="number">${escapeHtml(tok)}</span>`);
      continue;
    }

    if (/^[A-Za-z_]/.test(tok)) {
      // Look ahead: does a `(` (or string/table call) follow this identifier?
      let j = i + 1;
      while (j < tokens.length && /^\s+$/.test(tokens[j])) j++;
      const isCall = j < tokens.length && tokens[j] === "(";

      // Look back: member access (`.` / `:`) means this is not a global.
      let k = i - 1;
      while (k >= 0 && /^\s+$/.test(tokens[k])) k--;
      const isMember = k >= 0 && (tokens[k] === "." || tokens[k] === ":");

      if (KEYWORDS.has(tok)) {
        // The official renderer marks `function(` as a method, other keywords stay keywords.
        if (tok === "function" && isCall) {
          out.push(`<span class="method">${tok}</span>`);
        } else {
          out.push(`<span class="keyword">${tok}</span>`);
        }
      } else if (isCall) {
        if (!isMember && pageExists(`Global.${tok}`)) {
          out.push(`<span class="method"><a href="/Global.${tok}">${tok}</a></span>`);
        } else {
          out.push(`<span class="method">${escapeHtml(tok)}</span>`);
        }
      } else {
        out.push(escapeHtml(tok));
      }
      continue;
    }

    if (OPERATORS.has(tok)) {
      out.push(`<span class="operator">${escapeHtml(tok)}</span>`);
      continue;
    }

    out.push(escapeHtml(tok));
  }

  return out.join("");
}
