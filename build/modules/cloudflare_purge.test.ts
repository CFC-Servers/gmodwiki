import { describe, expect, it, vi } from "vitest";
import { purgeInBatches } from "./cloudflare_purge.js";

function urlList(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `https://gmodwiki.com/page-${index}`);
}

describe("purgeInBatches", () => {
  it("purges the URLs in batches of 30", async () => {
    const purgeBatch = vi.fn(async (_batch: string[]) => {});

    await purgeInBatches(urlList(65), purgeBatch);

    const batchSizes = purgeBatch.mock.calls.map(([batch]) => batch.length);
    expect(batchSizes).toEqual([30, 30, 5]);
  });

  it("attempts every batch and then fails when any batch failed", async () => {
    const purgeBatch = vi.fn(async (batch: string[]) => {
      if (batch.includes("https://gmodwiki.com/page-0")) throw new Error("rate limited");
    });

    await expect(purgeInBatches(urlList(65), purgeBatch)).rejects.toThrow("Failed to purge 1 batches");
    expect(purgeBatch).toHaveBeenCalledTimes(3);
  });
});
