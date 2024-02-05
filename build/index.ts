import ApiInterface from "./api_interface.js"
import StaticContentHandler from "./static.js"
import SearchManager from "./search.js"

import { setup } from "./setup.js"
import { buildAllPages } from "./pages.js"
import { buildSearchIndex } from "./build_search_index.js"

const baseURL = "https://wiki.facepunch.com"
const api = new ApiInterface(baseURL)
const staticContent = new StaticContentHandler(baseURL, api)
const searchManager = new SearchManager()

async function init() {
    await setup(api, staticContent)
    await buildAllPages(api, staticContent, searchManager)
    // await buildSearchIndex(searchManager)
}

init();
