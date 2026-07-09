import { promises as fs } from "fs";

import { decodeEmbeddings } from "../../semantic/core/binary.js";
import type { Manifest } from "../../semantic/core/types.js";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
const apiToken = process.env.CLOUDFLARE_AI_API_TOKEN!;
const INDEX = "gmodwiki-embeddings";

if (!accountId || !apiToken) {
  console.error("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_API_TOKEN are required");
  process.exit(1);
}

const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/v2/indexes/${INDEX}`;

async function upsertAll() {
  const manifest: Manifest = JSON.parse(await fs.readFile("public/embeddings_manifest.json", "utf8"));
  const { vectors } = decodeEmbeddings(new Uint8Array(await fs.readFile("public/embeddings.bin")));

  // Vectorize's upsert endpoint takes NDJSON: one vector object per line.
  const lines = manifest.entries.map((e, i) =>
    JSON.stringify({
      id: e.id,
      values: Array.from(vectors[i]),
      metadata: { title: e.title, url: e.url, snippet: e.snippet, kind: e.kind },
    }),
  );

  // Batch to keep request bodies reasonable.
  const BATCH = 1000;

  for (let i = 0; i < lines.length; i += BATCH) {
    const body = lines.slice(i, i + BATCH).join("\n");

    const res = await fetch(`${base}/upsert`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/x-ndjson" },
      body,
    });
    if (!res.ok) throw new Error(`upsert failed: ${res.status} ${await res.text()}`);

    console.log(`upserted ${Math.min(i + BATCH, lines.length)}/${lines.length}`);
  }
}

async function deleteRemoved() {
  let ids: string[] = [];

  try {
    const deleted: string[] = JSON.parse(await fs.readFile("deleted_files.json", "utf8"));
    ids = deleted
      .map((p) => p.replace("./build/cache/gmod/", "").replace(".json", ""))
      .filter(Boolean);
  } catch {
    return;
  }

  if (ids.length === 0) return;

  const res = await fetch(`${base}/delete_by_ids`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });

  if (!res.ok) console.warn(`delete_by_ids failed: ${res.status} ${await res.text()}`);
  else console.log(`requested deletion of ${ids.length} ids`);
}

(async () => {
  await deleteRemoved();
  await upsertAll();
  console.log("vectorize sync complete");
})();
