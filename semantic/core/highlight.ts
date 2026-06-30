export function highlightTerms(
  snippet: string,
  query: string,
): { text: string; match: boolean }[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9_:.-]/gi, ""))
    .filter((t) => t.length >= 2);

  if (terms.length === 0) return [{ text: snippet, match: false }];

  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");

  const runs: { text: string; match: boolean }[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(snippet)) !== null) {
    if (m.index > lastIndex) {
      runs.push({ text: snippet.slice(lastIndex, m.index), match: false });
    }
    runs.push({ text: m[0], match: true });
    lastIndex = m.index + m[0].length;
    if (m.index === re.lastIndex) re.lastIndex++; // guard against zero-length matches
  }
  if (lastIndex < snippet.length) {
    runs.push({ text: snippet.slice(lastIndex), match: false });
  }
  if (runs.length === 0) return [{ text: snippet, match: false }];
  return runs;
}
