import * as cheerio from "cheerio"

type Blob = string[]

const shouldIgnore = (word: string): boolean => {
    if (word.length < 4) return true

    if (word[0].match(/[0-9]/)) return true

    if (word.startsWith("act")) return true
    if (word.startsWith("key")) return true
    if (word.startsWith(".")) return true


    if (word.indexOf("└") !== -1) return true
    if (word.indexOf("├") !== -1) return true

    if (word.indexOf("&#") !== -1) return true

    if (word.indexOf(`\\`) !== -1) return true

    if (word.indexOf(">") !== -1) return true
    if (word.indexOf("<") !== -1) return true
    if (word.indexOf("[") !== -1) return true
    if (word.indexOf("]") !== -1) return true
    if (word.indexOf("|") !== -1) return true
    if (word.indexOf("%") !== -1) return true
    if (word.indexOf(":") !== -1) return true
    if (word.indexOf("'") !== -1) return true
    if (word.indexOf(",") !== -1) return true
    if (word.indexOf("/") !== -1) return true
    if (word.indexOf("?") !== -1) return true
    if (word.indexOf("!") !== -1) return true

    if (word.startsWith("0x")) return true
    if (word.startsWith("com/")) return true

    // if it's only numbers or "." ignore
    if (word.match(/^[0-9\.\-xypkb\+;\/\~\*_\$]+$/)) return true

    return false
}


class SearchManager {
    private bodies: { [path: string]: string }
    private index: Map<string, Blob[]>

    constructor() {
        this.bodies = {}
        this.index = new Map<string, Blob[]>()
    }

    getTextFromBody(body: string): string {
      let textContent = ""

      const $ = cheerio.load(body)
      $("script, style").remove()
      $("br").replaceWith("\n")

      function traverse(node: any) {
        node.contents().each((_: number, el: any) => {
          if (el.type === "text") {
            const text = $(el).text()

            if (text.endsWith(".wav")) {
              return
            }

            if (text.endsWith(".mp3")) {
              return
            }

            textContent += text
          } else if(el.type === "tag") {
            const $el = $(el)

            const tagName = el.tagName.toLowerCase()
            if (tagName === "h1") {
              return
            } else if (tagName === "span") {
              // class=numbertag
              return
            } else {
              if (textContent && /p|div|h[2-6]|ul|ol|li|code|td|tr/.test(tagName) && !/^\s/.test($el.text())) {
                textContent += " "
              }

              traverse($el)
            }
          }
        })
      }

      traverse($.root())

      return textContent
    }

    addBlob(path: string, body: string) {
        //console.log("\n----- Body -----\n")
        //console.log(body)
        let b = this.getTextFromBody(body)
        b = b.replace(/This was recently added in version \(\d+\.\d+\.\d+\)\. It might only be available on the/g, "")
        b = b.replace(/Dev Branch/g, "")

        b = b.replace(/\.$/g, "")
        b = b.replace(/\.\s+/g, " ")
        b = b.replace(/&quot;/g, `"`)
        b = b.replace(/"/g, "")
        b = b.replace(/'/g, "")
        b = b.replace(/!/g, "")
        b = b.replace(/\(/g, " ")
        b = b.replace(/\)/g, " ")
        b = b.replace(/{/g, " ")
        b = b.replace(/}/g, " ")

        b = b.replace(/\s\s+/g, " ").trim()

        //console.log("\n----- Text -----\n")
        //console.log(b)
        //console.log("\n\n\n")
        this.bodies[path] = b
    }

    buildIndex(): { [word: string]: Blob[] } {
        Object.entries(this.bodies).forEach(([path, body]) => {
            const lines = body.split('\n')

            lines.forEach((line) => {
                const words = [...new Set(line.split(/\s+/))]

                words.forEach((word, wordIdx) => {
                    const normalizedWord = word.toLowerCase()
                    if (shouldIgnore(normalizedWord)) {
                        return
                    }

                    // context with 8 words before, 8 words after
                    const contextAmount = 8
                    const context = words.slice(Math.max(0, wordIdx - contextAmount), Math.min(words.length, wordIdx + contextAmount)).join(" ")

                    const entry: Blob = [path, context]

                    if (this.index.has(normalizedWord)) {
                        this.index.get(normalizedWord)?.push(entry)
                    } else {
                        this.index.set(normalizedWord, [entry])
                    }
                });
            });
        });

        const obj = Object.fromEntries(this.index)

        return obj
    }
}

export default SearchManager
