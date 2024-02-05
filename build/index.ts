import ApiInterface from "./api_interface.js"
import StaticContentHandler from "./static.js"

import { setup } from "./setup.js"
import { buildAllPages } from "./pages.js"

const baseURL = "https://wiki.facepunch.com"
const api = new ApiInterface(baseURL, 8)
const staticContent = new StaticContentHandler(baseURL, "./public", api)

async function init() {
    await setup(api)
    await buildAllPages(api, staticContent)
}

init();
