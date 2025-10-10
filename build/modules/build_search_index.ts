import { promises as fs } from "fs";
import type SearchManager from "./search.js";

// Given the search index, builds the search page
export async function buildSearchIndex(searchManager: SearchManager) {
  const index = searchManager.buildIndex();
  const indexValue = JSON.stringify(index);

  await fs.writeFile("public/search_index.json", indexValue);
}
