export function keywordRank(
  index: Record<string, string[][]>,
  query: string,
  limit: number,
): { id: string; snippet: string }[] {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
  const hits = new Map<string, { count: number; snippet: string }>();

  for (const term of terms) {
    const entries = index[term];
    if (!entries) continue;
    for (const [path, context] of entries) {
      const existing = hits.get(path);
      if (existing) existing.count += 1;
      else hits.set(path, { count: 1, snippet: context });
    }
  }

  return [...hits.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([id, v]) => ({ id, snippet: v.snippet }));
}
