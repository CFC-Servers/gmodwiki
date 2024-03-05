import ky from "ky"
import path from "path"
import chalk from "chalk"
import { promises as fs } from "fs"
import Bottleneck from "bottleneck"
import type { KyResponse } from "ky"

async function fileExists(path: string) {
    try {
        await fs.access(path)
        return true
    } catch {
        return false
    }
}

class ApiInterface {
    private baseUrl: string;
    private limiter: Bottleneck;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;

        this.limiter = new Bottleneck({
            maxConcurrent: 8,
            minTime: 10
        });
    }

    async _get(url: string): Promise<KyResponse> {
        return this.limiter.schedule(() => {
            console.log(chalk.blue("GET"), url)
            return ky.get(url)
        })
    }

    async getRaw(endpoint: string): Promise<Buffer> {
        const response = await this._get(`${this.baseUrl}${endpoint}`)
        const buff = await response.arrayBuffer()
        return Buffer.from(buff)
    }
    
    async getRawFull(url: string): Promise<Buffer> {
        const response = await this._get(url)
        const buff = await response.arrayBuffer()
        return Buffer.from(buff)
    }

    async get(endpoint: string): Promise<string> {
        const cachePath = `build/cache/${endpoint}.html`

        if (await fileExists(cachePath)) {
            const contents = await fs.readFile(cachePath)
            return contents.toString()
        }

        const response = await this._get(`${this.baseUrl}${endpoint}`)
        const contents = await response.text() 

        const dir = path.dirname(cachePath)
        await fs.mkdir(dir, { recursive: true })
        await fs.writeFile(cachePath, contents)

        return contents
    }

    async getJSON(endpoint: string): Promise<any> {
        const cacheEndpoint = endpoint === "" ? "index" : endpoint
        const cachePath = `build/cache/${cacheEndpoint}.json`

        if (await fileExists(cachePath)) {
            const contents = await fs.readFile(cachePath)
            try {
                return JSON.parse(contents.toString())
            } catch (e) {
                console.error("Failed to parse JSON", e, `endpoint: '${cacheEndpoint}'`)
                throw e
            }
        }

        const response = await this._get(`${this.baseUrl}${endpoint}?format=json`)
        const text = await response.text()

        const dir = path.dirname(cachePath)
        await fs.mkdir(dir, { recursive: true })
        await fs.writeFile(cachePath, text)

        try {
            return JSON.parse(text)
        } catch (e) {
            console.error("Failed to parse JSON", e, `endpoint: '${endpoint}'`)
            console.error(text)
            throw e
        }
    }
}

export default ApiInterface;

