declare module "@platform" {
  export const platform: import("./types").Platform;
}

declare namespace Cloudflare {
  interface Env {
    AI: Ai;
    VECTORIZE: VectorizeIndex;
    ASSETS: Fetcher;
  }
}
