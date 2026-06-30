import { promises as fs } from "fs";
import path from "path";
import { diffManifest, changeKeyFor } from "./embeddings_diff.js";
import { encodeEmbeddings, decodeEmbeddings } from "../../semantic/core/binary.js";
import { buildEmbedText, buildSnippet, kindFor } from "../../semantic/core/embed-text.js";
import { EMBEDDING_DIMS, MODEL_ID } from "../../semantic/core/model.js";
import type { Manifest, ManifestEntry, RawEntry } from "../../semantic/core/types.js";

export async function loadRawEntries(cacheDir: string): Promise<RawEntry[]> {
  const gmod = path.join(cacheDir, "gmod");
  const files = await fs.readdir(gmod);
  const entries: RawEntry[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const raw = await fs.readFile(path.join(gmod, file), "utf8");
    let obj: any;
    try {
      obj = JSON.parse(raw);
    } catch {
      console.warn(`skipping unparseable ${file}`);
      continue;
    }
    if (!obj.address || !obj.html) continue;
    entries.push({
      address: obj.address,
      title: obj.title ?? obj.address,
      tags: obj.tags ?? "",
      markup: obj.markup,
      html: obj.html,
      revisionId: obj.revisionId,
    });
  }
  return entries;
}

async function loadPrev(outDir: string): Promise<{ manifest: Manifest; vecById: Map<string, Float32Array> } | null> {
  try {
    const manifest: Manifest = JSON.parse(await fs.readFile(path.join(outDir, "embeddings_manifest.json"), "utf8"));
    const bin = await fs.readFile(path.join(outDir, "embeddings.bin"));
    const { vectors } = decodeEmbeddings(new Uint8Array(bin));
    const vecById = new Map<string, Float32Array>();
    manifest.entries.forEach((e, i) => vecById.set(e.id, vectors[i]));
    return { manifest, vecById };
  } catch {
    return null;
  }
}

export function mergeManifest(
  prev: Manifest | null,
  entries: RawEntry[],
  newVecById: Map<string, Float32Array>,
  prevVecById: Map<string, Float32Array>,
): { manifest: Manifest; vectors: Float32Array[] } {
  const manifestEntries: ManifestEntry[] = [];
  const vectors: Float32Array[] = [];

  for (const entry of entries) {
    const vector = newVecById.get(entry.address) ?? prevVecById.get(entry.address);
    if (!vector) continue; // should not happen; unchanged entries keep prior vector
    manifestEntries.push({
      id: entry.address,
      address: entry.address,
      title: entry.title,
      snippet: buildSnippet(entry),
      url: "/" + entry.address,
      kind: kindFor(entry),
      changeKey: changeKeyFor(entry),
    });
    vectors.push(vector);
  }

  return {
    manifest: { model: MODEL_ID, dims: EMBEDDING_DIMS, count: manifestEntries.length, entries: manifestEntries },
    vectors,
  };
}

export async function buildEmbeddings(opts: {
  cacheDir: string;
  outDir: string;
  embedder: { embedBatch(texts: string[]): Promise<Float32Array[]> };
}): Promise<{ embedded: number; deleted: string[]; total: number }> {
  const entries = await loadRawEntries(opts.cacheDir);
  const prev = await loadPrev(opts.outDir);
  const diff = diffManifest(prev?.manifest ?? null, entries);

  console.log(`embeddings: ${diff.toEmbed.length} to embed, ${diff.unchanged.length} unchanged, ${diff.toDelete.length} removed`);

  const newVecById = new Map<string, Float32Array>();
  if (diff.toEmbed.length > 0) {
    const texts = diff.toEmbed.map(buildEmbedText);
    const vectors = await opts.embedder.embedBatch(texts);
    diff.toEmbed.forEach((e, i) => newVecById.set(e.address, vectors[i]));
  }

  const { manifest, vectors } = mergeManifest(
    prev?.manifest ?? null,
    entries,
    newVecById,
    prev?.vecById ?? new Map(),
  );

  await fs.mkdir(opts.outDir, { recursive: true });
  await fs.writeFile(path.join(opts.outDir, "embeddings.bin"), encodeEmbeddings(vectors, EMBEDDING_DIMS));
  await fs.writeFile(path.join(opts.outDir, "embeddings_manifest.json"), JSON.stringify(manifest));

  return { embedded: diff.toEmbed.length, deleted: diff.toDelete, total: manifest.count };
}
