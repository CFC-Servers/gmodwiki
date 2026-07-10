import ApiInterface from "./modules/api_interface.js"
import StaticContentHandler from "./modules/static.js"
import SearchManager from "./modules/search.js"

import { setup } from "./setup.js"
import { buildAllPages } from "./modules/pages.js"
import { buildSearchIndex } from "./modules/build_search_index.js"
import { buildEmbeddings } from "./modules/embeddings.js"
import { WorkersAiEmbedder } from "./modules/workers_ai_embedder.js"

const baseURL = "https://wiki.facepunch.com"
const api = new ApiInterface(baseURL)
const staticContent = new StaticContentHandler(baseURL, api)
const searchManager = new SearchManager()

async function init() {
    await setup(api, staticContent)
    await buildAllPages(api, staticContent, searchManager)
    await buildSearchIndex(searchManager)

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const apiToken = process.env.CLOUDFLARE_AI_API_TOKEN
    if (accountId && apiToken) {
        const embedder = new WorkersAiEmbedder(accountId, apiToken)
        const result = await buildEmbeddings({ cacheDir: "build/cache", outDir: "public", embedder })
        console.log(`embeddings: wrote ${result.total} vectors (${result.embedded} new/changed, ${result.deleted.length} removed)`)
    } else {
        console.log("CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_AI_API_TOKEN not set; skipping embeddings generation")
    }
}

init()
