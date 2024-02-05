import ApiInterface from "./api_interface.js"
import { setup } from "./setup.js"
import { buildAllPages } from "./pages.js"

const baseURL = "https://wiki.facepunch.com"
const api = new ApiInterface(baseURL, 8)

async function init() {
    await setup(api)
    await buildAllPages(api)
}

init();
