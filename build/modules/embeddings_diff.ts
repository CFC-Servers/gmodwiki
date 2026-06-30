import type { Manifest, RawEntry } from "../../semantic/core/types.js";
import { buildEmbedText } from "../../semantic/core/embed-text.js";

function stableHash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return "h:" + (h >>> 0).toString(16);
}

export function changeKeyFor(entry: RawEntry): string {
  if (entry.revisionId !== undefined && entry.revisionId !== null) {
    return String(entry.revisionId);
  }
  return stableHash(buildEmbedText(entry));
}

export function diffManifest(
  prev: Manifest | null,
  entries: RawEntry[],
): { toEmbed: RawEntry[]; toDelete: string[]; unchanged: string[] } {
  if (!prev) {
    return { toEmbed: [...entries], toDelete: [], unchanged: [] };
  }
  const prevByAddress = new Map(prev.entries.map((e) => [e.address, e]));
  const newAddresses = new Set(entries.map((e) => e.address));

  const toEmbed: RawEntry[] = [];
  const unchanged: string[] = [];
  for (const entry of entries) {
    const prior = prevByAddress.get(entry.address);
    if (prior && prior.changeKey === changeKeyFor(entry)) {
      unchanged.push(entry.address);
    } else {
      toEmbed.push(entry);
    }
  }
  const toDelete = prev.entries
    .map((e) => e.address)
    .filter((address) => !newAddresses.has(address));

  return { toEmbed, toDelete, unchanged };
}
