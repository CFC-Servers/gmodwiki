/**
 * Knowledge about which wiki pages exist.
 *
 * Official pages come from the scraped `~pagelist.json` (served statically);
 * custom pages come from Postgres. The combined set powers `link-page
 * exists/missing` classes and code links in the wikitext renderer.
 */

import { listCustomPages } from "./db.js";

interface PagelistEntry {
  address: string;
}

let officialSetPromise: Promise<Set<string>> | null = null;

async function loadOfficialSet(origin: string): Promise<Set<string>> {
  const set = new Set<string>();
  try {
    const res = await fetch(`${origin}/~pagelist.json`);
    if (res.ok) {
      const entries = (await res.json()) as PagelistEntry[];
      for (const entry of entries) {
        if (entry.address) set.add(entry.address.toLowerCase());
      }
    }
  } catch (e) {
    console.warn("could not load ~pagelist.json:", e);
  }
  return set;
}

/** Lowercased addresses of every official (scraped) page. Cached per process. */
export function getOfficialPageSet(origin: string): Promise<Set<string>> {
  if (!officialSetPromise) {
    officialSetPromise = loadOfficialSet(origin).then((set) => {
      // An empty set means the pagelist was unavailable; retry next time.
      if (set.size === 0) officialSetPromise = null;
      return set;
    });
  }
  return officialSetPromise;
}

/** Lowercased addresses of every custom page. Fresh on every call (cheap query). */
export async function getCustomPageSet(): Promise<Set<string>> {
  try {
    const pages = await listCustomPages();
    return new Set(pages.map((p) => p.address.toLowerCase()));
  } catch {
    return new Set();
  }
}

/** Build a sync existence predicate over official + custom pages. */
export async function buildPageExists(origin: string): Promise<(address: string) => boolean> {
  const [official, custom] = await Promise.all([getOfficialPageSet(origin), getCustomPageSet()]);
  return (address: string) => {
    const key = address.toLowerCase();
    return official.has(key) || custom.has(key);
  };
}
