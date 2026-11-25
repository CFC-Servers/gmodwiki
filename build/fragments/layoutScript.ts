import { platform } from "@platform";

const logo = "/garry/822e60dc-c931-43e4-800f-cbe010b3d4cc.webp";

const layoutOrigin = platform.publicOrigin(Astro.request, Astro.url);
const ogLogo = `${layoutOrigin}${logo}`;
const fullUrl = `${layoutOrigin}${Astro.url.pathname}`;
