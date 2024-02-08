# GMod Wiki Mirror

This project scrapes and mirrors the GMod Wiki.

It also includes a number of enhancments over the original.

You may use the [public site](https://gmodwiki.com), or even [host your own](https://github.com/CFC-Servers/gmodwiki?tab=readme-ov-file#self-hosting) for super fast offline access!

### Features
- :dark_sunglasses: **Custom Darkmode support** _([Thanks Be1zebub!](https://github.com/Be1zebub/Small-GLua-Things/blob/master/dark_wiki.js))_
    - Alternatively, this mirror plays nicely with DarkReader!
- :ship: **Self-hosting support with Docker**
- :racing_car: **Loading and in-browser performance enhancements over the original**
    - Significant performance improvements for CSS styling
    - Reduced the total stylesheet size by 80+%
    - Noticeable improvements to "Page-to-page" navigation speed
    - Vastly improved navigation performance on Firefox
- :brain: **Memory usage improvements**
    - Caches page content in browser cache rather than Javascript memory
- :mag_right: **Fast searching **
    - Both basic and full-site searching are implemented
    - Search results are not paginated
- :framed_picture: **All images are mirrored and optimized**
    - Image size reduced by > 40% with only a small loss in quality
- :cloud:**Hosted entirely on the cloud**
    - Very reliable, it should only go down if Cloudflare has a major outage
- robot: **Automatic content updates every three days**
    - All page content is pulled from the live site automatically
- **`?format=json` support**
- **`~pagelist` support _(json format only)_**
- **"Copy markdown link" button** _([Thanks TankNut!](https://github.com/TankNut))_

### Limitations
Current limitations:
- No Editing _(will not implement)_
- No change history _(probably won't implement)_
- Copy button _(on textareas)_ is temporary nonfunctional
- All images are mirrored into the `.webp` format, which has [somewhat limited browser support](https://caniuse.com/webp)
- The main page script.js is self-hosted and modified (for performance), meaning any useful updates will need to be manually backported

## Self-Hosting
[A docker image](https://github.com/CFC-Servers/gmodwiki/pkgs/container/gmodwiki) is provided to support self-hosting use cases.

The image is about 160mb, making it reasonably portable and quick to download 👍

### Running the Docker image

First, be sure you have [Docker installed](https://docs.docker.com/compose/install/).

#### With `docker run`
**Run the wiki in the background**:
```
docker run --name gmodwiki -p 127.0.0.1:4321:4321 --rm -d ghcr.io/cfc-servers/gmodwiki:latest
```

Then visit `http://localhost:4321` in your browser.

**Stopping the background container**:
```
docker stop --time 1 gmodwiki
```

#### With [`docker compose`](https://docs.docker.com/compose/)
Download the [`docker-compose.yml`](https://github.com/CFC-Servers/gmodwiki/blob/main/docker-compose.yml) file from this repository and put it somewhere on your machine.

Then, simply `docker compose up` _(or `docker-compose up` for older `docker` engines)_.

<br>

You can easily configure the Host and Port when using docker compose.

First, create a `.env` file in the same directory as the `docker-compose.yml`, in the format of:
```env
GMODWIKI_HOST=127.0.0.1
GMODWIKI_PORT=4321
```

Then you can change the Host or Port in that file, and then run `docker compose up` again.


If you want to expose the wiki instance to the world _(not recommended without a reverse proxy like Nginx, and especially not without Cloudflare)_:
- Set `GMODWIKI_HOST=0.0.0.0`
- Forward your chosen port _(`4321` by default)_ in your router/firewall
- Visit your public IP in your browser: `http://<your IP>:<your port>`


### Hosting your own public instance
This mirror is made to run on Cloudflare. Deploying is really easy, simply clone the project and run:
```sh
npm i;
npm run build;
npm run pages:deploy;
```

Follow the auth/setup prompts from `wrangler`.

Then:
- Visit your Cloudflare dashboard
- Select "Workers and Pages" from the sidebar
- Click on your `gmodwiki` instance
- Verify that it deployed correctly and that you can visit the latest `.pages.dev` site listed on the page

If you have your own domain:
- Go to the "Custom Domains" tab and click "Set up a custom domain" to connect your own domain

Now, set up the special `?format=json` redirect rule:
- Click on "Websites" in the sidebar
- Find your website, click on it
- Expand the "Rules" section in the sidebar
- Go to "Redirect rules"
- "Create a new Rule"
    - Name it "Json Format" or similar (doesn't matter)
    - "Custom filter expression"
    - "When incoming requests match...":
        - Field: "URI Query String"
        - Operator: "equals"
        - Value: `format=json`
    - "Then":
        - Type: "Dynamic"
        - Expression: `concat("https://<YOUR DOMAIN>/content", http.request.uri.path, ".json")`
        - Status Code: 301
    - Click "Deploy"
    - Wait about 30 seconds, and then try visiting: `https://<YOUR DOMAIN>/Player_Animations?format=json` and verify that you're redirected to: `https://<YOUR DOMAIN>/content/Player_Animations.json`

## Dev
Development should be fairly simple:
```
npm i;
npm run build;
npm run astrobuild;
npm run preview;
```

### Some dev notes:
- The first `npm run build` will take awhile as it scrapes the main website
- Once built:
    - All downloaded page content will be cached into `./build/cache/`
    - All downloaded static content will be cached to `./public/`
    - You can remove either of these directories if you need to re-parse the remote content again
- By default, `npm run astrobuild` will build the site for **self hosting**, not **cloud hosting**. If you need to test the cloud environment, you can run `export BUILD_ENV=production` before running the build/preview commands
