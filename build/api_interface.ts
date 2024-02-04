import ky from "ky"
import path from "path"
import chalk from "chalk"
import { promises as fs } from "fs"
import Bottleneck from "bottleneck"

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

    constructor(baseUrl: string, maxRequests: number) {
        this.baseUrl = baseUrl;

        this.limiter = new Bottleneck({
            maxConcurrent: maxRequests,
            minTime: 2000
        });
    }

    async _get(endpoint: string): Promise<any> {
        const url = `${this.baseUrl}${endpoint}`
        console.log(chalk.blue("GET"), url)
        return this.limiter.schedule(() => ky.get(`${this.baseUrl}${endpoint}`))
    }

    async get(endpoint: string): Promise<any> {
        const cachePath = `build/cache/${endpoint}.html`

        if (await fileExists(cachePath)) {
            console.log(chalk.yellow("Using cached index for"), endpoint)
            const contents = await fs.readFile(cachePath)
            return contents.toString()
        }

        const response = await this._get(endpoint)
        const contents = await response.text() 

        const dir = path.dirname(cachePath)
        await fs.mkdir(dir, { recursive: true })
        await fs.writeFile(cachePath, contents)

        return contents
    }

    async getJSON(endpoint: string): Promise<any> {
        const cachePath = `build/cache/${endpoint}.json`

        if (await fileExists(cachePath)) {
            console.log(chalk.yellow("Using cached index for"), endpoint)
            const contents = await fs.readFile(cachePath)
            return JSON.parse(contents.toString())
        }

        const response = await this._get(endpoint)
        const text = await response.text()

        const dir = path.dirname(cachePath)
        await fs.mkdir(dir, { recursive: true })
        await fs.writeFile(cachePath, text)

        return await response.json()
    }
}

export default ApiInterface;

