# GMod Wiki Mirror
<p align="left">
    <a href="https://discord.gg/5JUqZjzmYJ" alt="Discord Invite"><img src="https://img.shields.io/discord/981394195812085770?label=Support&logo=discord&logoColor=white" /></a>
</p>
This project scrapes and mirrors the GMod Wiki.

It also includes a number of enhancments over the original.

You may use the [public site](https://gmodwiki.com), or even [host your own](https://github.com/CFC-Servers/gmodwiki?tab=readme-ov-file#self-hosting) for super fast offline access!

### Features
- :dark_sunglasses: **Custom Darkmode** _([Thanks @Be1zebub/@Phoenixf129!](https://github.com/Be1zebub/Small-GLua-Things/blob/master/dark_wiki.js))_
    - Alternatively, this mirror plays nicely with DarkReader!
- :ship: **Self-hosting with Docker**
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
- :framed_picture: **Optimized images**
    - Image size reduced by > 40% with only a small loss in quality
- :cloud: **Hosted entirely on The Cloud**
    - Very reliable! Should almost never go down
- :robot: **Automatic content updates**
    - Page content is [automatically updated](https://github.com/CFC-Servers/gmodwiki/blob/main/.github/workflows/update.yml) twice a day
- :hammer_and_wrench: **UI bug fixes**
- **`?format=json` support**
- **`~pagelist` support _(json format only)_**
- **`/gmod/` redirect support**
  - _This means you can safely redirect all gmod links from `wiki.facepunch.com` to `gmodwiki.com`_
- **"Copy markdown link" button** _([Thanks TankNut!](https://github.com/TankNut))_
- **Keyboard navigation support for the sidebar**

### Limitations
Current limitations:
- No Editing _(will not implement)_
- No change history _(probably won't implement)_
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
_Useful if you want to leave the site running at all times_

<details>
    <summary>:point_up_2: Instructions</summary>

<br>

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
    
</details>


### Hosting your own public instance
_If you want to run another global instance for redundancy / host your own version_

<details>
    <summary>:point_up_2: Instructions</summary>

<br>

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

### Now, set up the redirect rules:
Navigate to Cache Rules:

![image](https://github.com/CFC-Servers/gmodwiki/assets/7936439/fc89fe0f-57fd-4e34-ac0d-bd7b1ddddfca)

**`?format=json` redirect**

_⚠️ Be sure to replace `gmodwiki.com` with your domain!_

![image](https://github.com/CFC-Servers/gmodwiki/assets/7936439/3329e11f-eed0-487e-8901-906fee2f8039)

**`/gmod/` redirect**

_⚠️ This needs to be the second rule in the rules list!_

![image](https://github.com/CFC-Servers/gmodwiki/assets/7936439/b64b92a2-028d-498e-8040-a117fe2ee3b6)

Now, wait about 30 seconds, and then try:
- Visiting: `https://<YOUR DOMAIN>/Player_Animations?format=json` and verify that you're redirected to: `https://<YOUR DOMAIN>/content/Player_Animations.json`
- Visiting: `https://<YOUR DOMAIN>/gmod/Player_Animations` and verify that you're redirected to: `https://<YOUR DOMAIN>/Player_Animations`

### Then, you'll need to set up your caching rules:
![image](https://github.com/CFC-Servers/gmodwiki/assets/7936439/9854e77b-6f3d-4932-adaa-896bffcbbafa)

**Search Caching Rule** (needs to be first in the rule list):
![image](https://github.com/CFC-Servers/gmodwiki/assets/7936439/70f2d777-7e35-4a86-9429-4f5556cdfb5b)
![image](https://github.com/CFC-Servers/gmodwiki/assets/7936439/61b58cfb-205f-41a3-9634-84b654d20318)


**Primary Caching Rule:**
- Edge Cache: 3 days
- Brower Cache: 1 day

_⚠️ Be sure to replace `gmodwiki.com` with your domain!_

![image](https://github.com/CFC-Servers/gmodwiki/assets/7936439/0dd7cbac-d3e8-486c-9549-344b8f453f27)
![image](https://github.com/CFC-Servers/gmodwiki/assets/7936439/34b267ae-5036-45e1-91a1-b948702a89e2)
![image](https://github.com/CFC-Servers/gmodwiki/assets/7936439/e8133bac-c12a-4bbe-a7bf-fff30d1e2850)
</details>

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

### Some dev notes:
- The first `npm run build` will take awhile as it scrapes the main website
- Once built:
    - All downloaded page content will be cached into `./build/cache/`
    - All downloaded static content will be cached to `./public/`
    - You can remove either of these directories if you need to re-parse the remote content again
- By default, `npm run astrobuild` will build the site for **self hosting**, not **cloud hosting**. If you need to test the cloud environment, you can run `export BUILD_ENV=production` before running the build/preview commands
</details>
