/**
 * Coarse page category used to nudge ranking. Action queries ("damage a
 * player") almost always want the `function` you call, not the `hook` that
 * fires — so hooks get a gentle rank penalty (see `kindWeight`).
 */
export type PageKind = "function" | "hook" | "other";

/**
 * A wiki page as loaded from the build cache, before embedding. The raw inputs
 * to {@link Manifest} generation.
 */
export interface RawEntry {
  /** Page address, e.g. `Player:Say`. Doubles as the Vectorize vector id. */
  address: string;
  /** Human-readable title; often equal to {@link RawEntry.address}. */
  title: string;
  /** Space-separated tag words, e.g. `function method realm-server`. */
  tags: string;
  /** Facepunch wiki source markup (XML-ish). Absent for some category pages. */
  markup?: string;
  /** Rendered HTML of the page body. */
  html: string;
  /** Wiki revision id; used as the change key for incremental rebuilds. */
  revisionId?: number;
}

/**
 * One row of {@link Manifest}. Carries everything needed to render a search
 * result without touching the page content, plus the key used to decide whether
 * a page needs re-embedding.
 */
export interface ManifestEntry {
  /** Equals {@link ManifestEntry.address}; the Vectorize vector id. */
  id: string;
  address: string;
  title: string;
  /** Short plain-text preview shown under a result. */
  snippet: string;
  /** Site-relative URL, `"/<address>"`. */
  url: string;
  /** Coarse page category, used for type-aware rank nudging. */
  kind: PageKind;
  /** revisionId (version-prefixed), or a content hash when no revisionId. Equal keys ⇒ unchanged. */
  changeKey: string;
}

/**
 * The sidecar index for `embeddings.bin`. Entry `i` describes the vector stored
 * at row `i` of the binary — the two are kept in lockstep.
 */
export interface Manifest {
  /** Embedding model id, e.g. `@cf/baai/bge-base-en-v1.5`. */
  model: string;
  /** Vector dimensionality (768 for bge-base). */
  dims: number;
  /** Number of entries/vectors. */
  count: number;
  /** Entry `i` corresponds to vector `i` in `embeddings.bin`. */
  entries: ManifestEntry[];
}

/** A single nearest-neighbour hit returned by a {@link VectorStore}. */
export interface Match {
  /** The page address. */
  id: string;
  /** Similarity score (cosine); higher is closer. */
  score: number;
  /** Result metadata when the store carries it (e.g. Vectorize); else undefined. */
  metadata?: { title: string; url: string; snippet: string; kind?: PageKind };
}

/** A ranked result surfaced to a user or assistant. */
export interface SearchResult {
  address: string;
  title: string;
  url: string;
  snippet: string;
  /** Coarse page category (function/hook/other), when known. */
  kind?: PageKind;
  /** Fused relevance score. */
  score: number;
  /** Which retriever(s) produced this: keyword-only, semantic-only, or both. */
  source: "keyword" | "semantic" | "both";
}

/** Turns query text into a normalized embedding vector. */
export interface Embedder {
  embed(text: string): Promise<Float32Array>;
}

/** Nearest-neighbour search over stored embeddings. */
export interface VectorStore {
  /** Return the top-`k` matches for `vector`. */
  query(vector: Float32Array, k: number): Promise<Match[]>;
}

/**
 * Fetches a page's title and LLM-ready body text by address, or `null` if the
 * page does not exist. Backed by the local content dir or the live site.
 */
export type PageGetter = (
  address: string,
) => Promise<{ title: string; content: string } | null>;
