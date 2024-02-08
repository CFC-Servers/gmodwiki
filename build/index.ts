import ApiInterface from "./modules/api_interface.js"
import StaticContentHandler from "./modules/static.js"
import SearchManager from "./modules/search.js"

import { setup } from "./setup.js"
import { buildAllPages } from "./modules/pages.js"
import { buildSearchIndex } from "./modules/build_search_index.js"

const baseURL = "https://wiki.facepunch.com"
const api = new ApiInterface(baseURL)
const staticContent = new StaticContentHandler(baseURL, api)
const searchManager = new SearchManager()

async function init() {
    await setup(api, staticContent)
    await buildAllPages(api, staticContent, searchManager)
    await buildSearchIndex(searchManager)
}

init();
