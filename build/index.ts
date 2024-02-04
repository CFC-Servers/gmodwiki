import ApiInterface from "./api_interface.js"

const baseURL = "https://wiki.facepunch.com"
const api = new ApiInterface(baseURL, 8)

async function getIndex() {
    return await api.get("/gmod")
}

async function init() {
    const index = await getIndex()
}

init();
