interface Blob {
    path: string;
    line: number;
    index: number;
    body: string;
}

const shouldIgnore = (word: string): boolean => {
    if (word.length < 4) return true

    if (word.startsWith("act")) return true
    if (word.startsWith("key")) return true

    if (word.indexOf(">") !== -1) return true
    if (word.indexOf("<") !== -1) return true
    if (word.indexOf("div") !== -1) return true

    if (word.indexOf("└") !== -1) return true
    if (word.indexOf("├") !== -1) return true

    if (word.indexOf("&#") !== -1) return true

    if (word.indexOf(`\\`) !== -1) return true

    if (word.indexOf("{") !== -1) return true
    if (word.indexOf("[") !== -1) return true
    if (word.indexOf("]") !== -1) return true
    if (word.indexOf("|") !== -1) return true
    if (word.indexOf("%") !== -1) return true
    if (word.indexOf(":") !== -1) return true
    if (word.indexOf("'") !== -1) return true
    if (word.indexOf(".") !== -1) return true
    if (word.indexOf("/") !== -1) return true
    if (word.indexOf("?") !== -1) return true
    if (word.indexOf("!") !== -1) return true

    if (word.startsWith("0x")) return true
    if (word.startsWith("com/")) return true

    // if it's only numbers or "." ignore
    if (word.match(/^[0-9\.\-xypkb\+;\/\~\*_]+$/)) return true

    return false
}


class SearchManager {
    private bodies: { [path: string]: string }
    private index: Map<string, Blob[]>

    constructor() {
        this.bodies = {}
        this.index = new Map<string, Blob[]>()
    }

    addBlob(path: string, body: string) {
        let b = body.replace(/&quot;/g, `"`)
        b = b.replace(/"/g, "")
        b = b.replace(/'/g, "")
        b = b.replace(/&amp;/g, "&")
        b = b.replace(/&lt;/g, "<")
        b = b.replace(/&gt;/g, ">")
        b = b.replace(/=/g, " ")
        b = b.replace(/\)/g, " ")
        b = b.replace(/\(/g, " ")
        b = b.replace(/,/g, " ")
        this.bodies[path] = b
    }

    buildIndex(): { [word: string]: Blob[] } {
        Object.entries(this.bodies).forEach(([path, body]) => {
            const lines = body.split('\n')

            lines.forEach((line, lineIdx) => {
                const words = line.split(/\s+/)

                words.forEach((word, wordIdx) => {
                    const normalizedWord = word.toLowerCase()
                    if (shouldIgnore(normalizedWord)) {
                        return
                    }

                    // context with 10 words before, 10 words after
                    const context = line.slice(Math.max(0, wordIdx - 60), Math.min(line.length, wordIdx + 80))
                    const newIndex = context.indexOf(word)
                    const entry: Blob = { path: path, line: lineIdx, index: newIndex, body: context }

                    if (this.index.has(normalizedWord)) {
                        this.index.get(normalizedWord)?.push(entry)
                    } else {
                        this.index.set(normalizedWord, [entry])
                    }
                });
            });
        });

        const obj =  Object.fromEntries(this.index)
        console.log(JSON.stringify(Object.keys(obj)))

        return obj
    }
}

export default SearchManager
