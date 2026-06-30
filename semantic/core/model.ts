export const MODEL_ID = "@cf/baai/bge-base-en-v1.5";
export const EMBEDDING_DIMS = 768;
// Standard RRF dampening constant (Cormack et al. 2009).
export const RRF_K = 60;
// bge-base-en-v1.5 is an asymmetric retrieval model: documents are embedded as
// passages (no prefix), queries MUST carry this instruction. Both embedder
// adapters apply it so hosted and offline surfaces rank identically.
export const QUERY_PREFIX = "Represent this sentence for searching relevant passages: ";
