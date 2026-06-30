export interface RawEntry {
  address: string;
  title: string;
  tags: string;
  markup?: string;
  html: string;
  revisionId?: number;
}

export interface ManifestEntry {
  id: string;        // == address; the Vectorize vector id
  address: string;
  title: string;
  snippet: string;   // short plain-text preview for results
  url: string;       // "/<address>"
  changeKey: string; // revisionId as string, or a content hash fallback
}

export interface Manifest {
  model: string;
  dims: number;
  count: number;
  entries: ManifestEntry[]; // index i corresponds to vector i in embeddings.bin
}

export interface Match {
  id: string;   // address
  score: number;
  metadata?: { title: string; url: string; snippet: string };
}

export interface SearchResult {
  address: string;
  title: string;
  url: string;
  snippet: string;
  score: number;
  source: "keyword" | "semantic" | "both";
}

export interface Embedder {
  embed(text: string): Promise<Float32Array>;
}

export interface VectorStore {
  query(vector: Float32Array, k: number): Promise<Match[]>;
}

export type PageGetter = (
  address: string,
) => Promise<{ title: string; content: string } | null>;
