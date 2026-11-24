const purgeBatchSize = 30;

export type PurgeBatch = (urls: string[]) => Promise<void>;

export async function purgeInBatches(
  urls: string[],
  purgeBatch: PurgeBatch,
): Promise<void> {
  let failedBatches = 0;

  for (let i = 0; i < urls.length; i += purgeBatchSize) {
    const batch = urls.slice(i, i + purgeBatchSize);
    console.log(`Purging URLs from ${i} to ${i + batch.length - 1}:`, batch);

    try {
      await purgeBatch(batch);
      console.log(`Purged ${batch.length} URLs successfully.`);
    } catch (error) {
      console.error("Error purging URLs:", error);
      failedBatches++;
    }
  }

  if (failedBatches > 0) {
    throw new Error(`Failed to purge ${failedBatches} batches of URLs`);
  }
}
