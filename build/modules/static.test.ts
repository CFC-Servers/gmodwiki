import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { convertImage } from "./static.js";

const noise = { type: "gaussian" as const, mean: 128, sigma: 60 };

async function noisyPng(): Promise<Buffer> {
  return await sharp({ create: { width: 96, height: 96, channels: 3, background: "#000", noise } })
    .png()
    .toBuffer();
}

async function tinyAnimatedGif(): Promise<Buffer> {
  const frames = await Promise.all(
    ["#000", "#fff"].map((background) =>
      sharp({ create: { width: 2, height: 2, channels: 3, background } }).png().toBuffer(),
    ),
  );

  return await sharp(frames, { join: { animated: true } }).gif().toBuffer();
}

async function frameCount(data: Buffer): Promise<number> {
  const metadata = await sharp(data, { animated: true }).metadata();
  return metadata.pages ?? 1;
}

describe("convertImage", () => {
  it("converts an image to WebP when the WebP is smaller", async () => {
    const png = await noisyPng();

    const stored = await convertImage(png, "public/wiki/files/Photo.PNG");

    expect(stored.filePath).toBe("public/wiki/files/Photo.webp");
    expect(stored.data.length).toBeLessThan(png.length);
  });

  it("keeps the original file when the WebP would be larger", async () => {
    const gif = await tinyAnimatedGif();

    const stored = await convertImage(gif, "public/wiki/files/tiny.gif");

    expect(stored.filePath).toBe("public/wiki/files/tiny.gif");
    expect(stored.data).toBe(gif);
  });

  it("keeps every frame when it converts an animated image", async () => {
    const frames = await Promise.all(
      [40, 120, 200].map((mean) =>
        sharp({ create: { width: 96, height: 96, channels: 3, background: "#000", noise: { ...noise, mean } } })
          .png()
          .toBuffer(),
      ),
    );
    const gif = await sharp(frames, { join: { animated: true } }).gif().toBuffer();

    const stored = await convertImage(gif, "public/wiki/files/animation.gif");

    expect(stored.filePath).toBe("public/wiki/files/animation.webp");
    expect(await frameCount(stored.data)).toBe(3);
  });

  it("always converts SVG, even when the WebP is larger", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="red"/></svg>');

    const stored = await convertImage(svg, "public/wiki/files/icon.svg");

    expect(stored.filePath).toBe("public/wiki/files/icon.webp");
  });
});
