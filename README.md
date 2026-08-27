# GMod Wiki Mirror
<p align="left">
    <a href="https://discord.gg/5JUqZjzmYJ" alt="Discord Invite"><img src="https://img.shields.io/discord/981394195812085770?label=Support&logo=discord&logoColor=white" /></a>
</p>
This project scrapes and mirrors the GMod Wiki. It is fully self-hosted (Docker or bare Node) — no cloud services required.

It also includes a number of enhancements over the original.

### Features
- :dark_sunglasses: **Custom Darkmode** _([Thanks @Be1zebub/@Phoenixf129!](https://github.com/Be1zebub/Small-GLua-Things/blob/master/dark_wiki.js))_
    - Alternatively, this mirror plays nicely with DarkReader!
- :ship: **Self-hosting with Docker** — no cloud dependencies
- :pencil: **Custom pages** _(new!)_
    - Create your own pages/categories with class/function documentation at `/custom`
    - Pages are written in [Facepunch wiki markup](https://wiki.facepunch.com/wiki/) (`<function>`, `<example>`, `<note>`, ...) and/or regular markdown, and render exactly like official pages
    - Stored in PostgreSQL, so they survive official content updates
    - Only custom pages are editable — official pages stay read-only to avoid conflicts with upstream updates
    - No accounts, no auth: everyone can create and edit custom pages
- :racing_car: **Performance enhancements**
    - Significant performance improvements for CSS styling
    - Reduced the total stylesheet size by nearly 90%
    - Noticeable improvements to "Page-to-page" navigation speed
    - Vastly improved navigation performance on Firefox
- :brain: **Optimized memory usage**
    - Caches page content in browser cache rather than Javascript memory
- :mag_right: **Fast searching**
    - Both basic and full-site searching are implemented
    - Search results are not paginated
    - Custom pages are included in search results
- :robot: **Semantic search & MCP**
    - Hybrid keyword + semantic search running fully locally (transformers.js), with a built-in MCP server for AI tools at `/mcp`
- :framed_picture: **Optimized images**
    - Image size reduced by > 40% with only a small loss in quality
- :robot: **Automatic content updates**
    - Rebuild the Docker image (or re-run the build) to pull the latest wiki content; custom pages are untouched
- :hammer_and_wrench: **UI bug fixes**
- **`?format=json` support**
- **`~pagelist` support _(json format only)_**
- **"Copy markdown link" button** _([Thanks TankNut!](https://github.com/TankNut))_
- **Keyboard navigation/highlighting support for the sidebar**
- All external links open in a new tab

### Limitations
Current limitations:
- Official (scraped) pages cannot be edited — only custom pages can _(by design: official pages are overwritten on every update)_
- No change history _(probably won't implement)_
- All images are mirrored into the `.webp` format, which has [somewhat limited browser support](https://caniuse.com/webp)
- The main page script.js is self-hosted and modified (for performance), meaning any useful updates will need to be manually backported

## Self-Hosting

First, be sure you have [Docker installed](https://docs.docker.com/compose/install/).

### With [`docker compose`](https://docs.docker.com/compose/) _(recommended)_

Download the [`docker-compose.yml`](https://github.com/CFC-Servers/gmodwiki/blob/main/docker-compose.yml) file from this repository and put it somewhere on your machine, then run:

```sh
docker compose up -d
```

This starts two containers:
- `gmodwiki_web` — the wiki itself (http://localhost:4321)
- `gmodwiki_db` — PostgreSQL, which stores your custom pages (persisted in the `gmodwiki_pgdata` volume)

You can configure the host/port/database password with a `.env` file next to `docker-compose.yml`:
```env
GMODWIKI_HOST=127.0.0.1
GMODWIKI_PORT=4321
GMODWIKI_DB_PASSWORD=change-me
```

If you want to expose the wiki instance to the world _(not recommended without a reverse proxy like Nginx)_:
- Set `GMODWIKI_HOST=0.0.0.0`
- Forward your chosen port _(`4321` by default)_ in your router/firewall
- Visit your public IP in your browser: `http://<your IP>:<your port>`

### With `docker run` _(without custom pages)_

The wiki works without a database — you just lose the ability to create custom pages:

```sh
docker run --name gmodwiki -p 127.0.0.1:4321:4321 --rm -d ghcr.io/cfc-servers/gmodwiki:latest
```

To enable custom pages, point it at your own PostgreSQL with `-e DATABASE_URL=postgres://user:pass@host:5432/db` (the schema is created automatically).

**Stopping the background container**:
```sh
docker stop --time 1 gmodwiki
```

### Updating wiki content

Official page content is baked into the image at build time. To update it, pull the newest image (published daily) and restart:

```sh
docker compose pull && docker compose up -d
```

Your custom pages live in PostgreSQL and are never touched by content updates.

## Custom pages

Open `/custom` (also linked in the sidebar) to browse and create pages, or `/custom/edit` to open the editor directly.

- Pages support the official [Facepunch wiki markup](https://wiki.facepunch.com/wiki/): `<function>`, `<example>`, `<enumeration>`, `<structure>`, `<note>`, `<warning>`, `<bug>`, `<deprecated>`, `<page>`, `<key>`, ... plus regular markdown (headers, lists, tables, links, fenced ```lua code blocks with syntax highlighting)
- The editor shows a live preview rendered exactly like official pages
- Custom pages can't shadow official addresses, and official pages can't be edited — so updating the mirror from wiki.facepunch.com can never conflict with your content
- Custom pages appear in search and are served to MCP clients via `get_page`

## Use it in your AI assistant (MCP)

Every instance ships its own [MCP](https://modelcontextprotocol.io) server at `http://<host>:<port>/mcp` (streamable HTTP), exposing `search_wiki` and `get_page` tools so assistants can look up GMod functions, hooks, and examples — including your custom pages.

**Claude Code**:
```sh
claude mcp add --transport http gmodwiki http://localhost:4321/mcp
```

<details>
    <summary>:point_up_2: Other clients (Cursor, VS Code, Claude Desktop, …)</summary>

<br>

**Cursor**: `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "gmodwiki": { "url": "http://localhost:4321/mcp", "transport": "streamable-http" }
  }
}
```

**VS Code (Copilot)**: `.vscode/mcp.json` (note: root key is `servers`):
```json
{
  "servers": {
    "gmodwiki": { "type": "http", "url": "http://localhost:4321/mcp" }
  }
}
```

**Claude Desktop / claude.ai**: Settings → Connectors → *Add custom connector* → `http://localhost:4321/mcp`

**Any stdio-only client**: bridge with [`mcp-remote`](https://www.npmjs.com/package/mcp-remote):
```json
{
  "mcpServers": {
    "gmodwiki": { "command": "npx", "args": ["-y", "mcp-remote", "http://localhost:4321/mcp"] }
  }
}
```
</details>

### Teaching your assistant when to use it

Usually you don't have to do anything: the server describes itself via the MCP `instructions` field (see [`semantic/core/tools.ts`](https://github.com/CFC-Servers/gmodwiki/blob/main/semantic/core/tools.ts)), and clients that support it (Claude Code, Claude Desktop, etc.) feed that to the assistant automatically.

Some clients ignore server instructions, though. If your assistant isn't reaching for the tools when it should, add something like this to your project's rules file (`CLAUDE.md`, `AGENTS.md`, Cursor rules, ...):

```markdown
For any Garry's Mod Lua API question (functions, hooks, methods, enums, libraries), use the
gmodwiki MCP tools instead of answering from memory: call `search_wiki` with a natural-language
description of the task, then pass a result's `address` to `get_page` for the full documentation.
```

## Dev

<details>
    <summary>:point_up_2: Instructions/Details</summary>

<br>

Development should be fairly simple:
```
npm i;
npm run build;
npm run astrobuild;
npm run preview;
```

For custom pages you also need PostgreSQL; the easiest way is:
```
docker run --name gmodwiki-pg -p 5432:5432 -e POSTGRES_USER=gmodwiki -e POSTGRES_PASSWORD=gmodwiki -e POSTGRES_DB=gmodwiki -d postgres:16-alpine
```
The app connects to `postgres://gmodwiki:gmodwiki@localhost:5432/gmodwiki` by default; override with `DATABASE_URL`.

### Some dev notes:
- The first `npm run build` will take awhile as it scrapes the main website
    - Set `PAGE_LIMIT=200` to only build a subset of pages for quick local testing
    - Set `SKIP_EMBEDDINGS=1` to skip the semantic-search embedding step (search falls back to keyword-only)
- Those building on windows may need to run the following command to fix issues with `sharp`
```
npm install --force @img/sharp-win32-x64
```
- Once built:
    - All downloaded page content will be cached into `./build/cache/`
    - All downloaded static content will be cached to `./public/`
    - You can remove either of these directories if you need to re-parse the remote content again
</details>
