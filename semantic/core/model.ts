import type { PageKind } from "./types.js";

export const MODEL_ID = "@cf/baai/bge-base-en-v1.5";
export const EMBEDDING_DIMS = 768;
// Standard RRF dampening constant (Cormack et al. 2009).
export const RRF_K = 60;
// bge-base-en-v1.5 is an asymmetric retrieval model: documents are embedded as
// passages (no prefix), queries MUST carry this instruction. Both embedder
// adapters apply it so hosted and offline surfaces rank identically.
export const QUERY_PREFIX = "Represent this sentence for searching relevant passages: ";

// Event hooks phrase their docs in user-intent language ("Called when a player
// sends a chat message"), so they out-rank the function you'd actually call for
// an action query. Gently demote them: a clearly-better function wins, but hooks
// stay fully reachable. This is the one knob to tune — raise toward 1 for a
// lighter touch, lower for a stronger preference for functions.
export const HOOK_RANK_PENALTY = 0.9;

/** Score multiplier applied to a result given its {@link PageKind}. */
export function kindWeight(kind?: PageKind): number {
  return kind === "hook" ? HOOK_RANK_PENALTY : 1;
}
