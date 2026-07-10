// Flat binary format for the embedding matrix:
// uint32 magic | uint32 dims | uint32 count (all LE), then count * dims float32s.

const MAGIC = 0x474d5745; // "GMWE"
const HEADER_BYTES = 12;

export function encodeEmbeddings(vectors: Float32Array[], dims: number): Uint8Array {
  const count = vectors.length;
  const buf = new ArrayBuffer(HEADER_BYTES + count * dims * 4);

  const view = new DataView(buf);
  view.setUint32(0, MAGIC, true);
  view.setUint32(4, dims, true);
  view.setUint32(8, count, true);

  const floats = new Float32Array(buf, HEADER_BYTES);
  for (let i = 0; i < count; i++) {
    if (vectors[i].length !== dims) {
      throw new Error(`vector ${i} has length ${vectors[i].length}, expected ${dims}`);
    }
    floats.set(vectors[i], i * dims);
  }

  return new Uint8Array(buf);
}

export function decodeEmbeddings(buf: Uint8Array): {
  dims: number;
  count: number;
  vectors: Float32Array[];
} {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (view.getUint32(0, true) !== MAGIC) throw new Error("bad embeddings magic");

  const dims = view.getUint32(4, true);
  const count = view.getUint32(8, true);

  const vectors: Float32Array[] = [];
  for (let i = 0; i < count; i++) {
    const start = buf.byteOffset + HEADER_BYTES + i * dims * 4;
    vectors.push(new Float32Array(buf.buffer.slice(start, start + dims * 4)));
  }

  return { dims, count, vectors };
}
