import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import puppeteer from "puppeteer";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "dist/client/og");
const width = 1200;
const height = 630;

async function availablePort(): Promise<number> {
  const listener = createServer();
  await new Promise<void>((accept, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", accept);
  });
  const address = listener.address();
  await new Promise<void>((accept, reject) => {
    listener.close((error) => (error ? reject(error) : accept()));
  });
  if (!address || typeof address === "string") throw new Error("No preview port available.");
  return address.port;
}

function startPreview(port: number) {
  const origin = `http://127.0.0.1:${port}`;
  const server = spawn("bun", ["run", "start", "--host", "127.0.0.1", "--port", String(port)], {
    cwd: root,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
  });
  let ended = false;
  const closed = new Promise<void>((accept) => {
    server.once("close", () => {
      ended = true;
      accept();
    });
  });
  const ready = new Promise<void>((accept, reject) => {
    let logs = "";
    const deadline = setTimeout(
      () => reject(new Error(`OG preview did not start:\n${logs}`)),
      60000,
    );
    const observe = (chunk: Buffer) => {
      logs = `${logs}${chunk.toString()}`.slice(-16000);
      if (logs.includes(origin)) {
        clearTimeout(deadline);
        accept();
      }
    };
    server.stdout.on("data", observe);
    server.stderr.on("data", observe);
    server.once("error", (error) => {
      clearTimeout(deadline);
      reject(error);
    });
    server.once("close", (code) => {
      clearTimeout(deadline);
      reject(new Error(`OG preview exited (${code}):\n${logs}`));
    });
  });
  function terminate(signal: NodeJS.Signals) {
    if (!server.pid || ended) return;
    if (process.platform === "win32") server.kill(signal);
    else process.kill(-server.pid, signal);
  }
  return {
    origin,
    ready,
    async stop() {
      terminate("SIGTERM");
      const deadline = setTimeout(() => terminate("SIGKILL"), 5000);
      await closed;
      clearTimeout(deadline);
    },
  };
}

async function main() {
  const preview = startPreview(await availablePort());
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
  try {
    await preview.ready;
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        // Keep text rasterization stable while retaining the shared WebGL renderer.
        "--disable-gpu-rasterization",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    });
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    let errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("requestfailed", (request) =>
      errors.push(`${request.url()}: ${request.failure()?.errorText}`),
    );
    const routes = ["default", "sessions", "timeline", "about", "404"];
    for (const route of routes) {
      errors = [];
      const routePath = route.split("/").map(encodeURIComponent).join("/");
      const response = await page.goto(`${preview.origin}/og/render/${routePath}`, {
        waitUntil: "load",
      });
      if (response?.status() !== 200) throw new Error(`OG ${route}: HTTP ${response?.status()}`);
      await page.waitForFunction(
        () =>
          document.documentElement.dataset.ogReady === "true" ||
          Boolean(document.documentElement.dataset.ogError),
        { timeout: 30000 },
      );
      const result = await page.evaluate(() => {
        const frame = document.querySelector<HTMLElement>("[data-og-frame]");
        const box = frame?.getBoundingClientRect();
        return {
          error: document.documentElement.dataset.ogError,
          box: box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null,
          slugs: frame?.dataset.ogSessionSlugs,
        };
      });
      if (result.error || errors.length)
        throw new Error(`OG ${route}: ${result.error ?? errors.join("; ")}`);
      if (
        result.box?.x !== 0 ||
        result.box.y !== 0 ||
        result.box.width !== width ||
        result.box.height !== height
      )
        throw new Error(`OG ${route}: expected a ${width}×${height} frame at the origin.`);
      if (route === "default") {
        const slugs: unknown = JSON.parse(result.slugs ?? "null");
        if (
          !Array.isArray(slugs) ||
          slugs.some((slug) => typeof slug !== "string" || !slug || /[/\\]/.test(slug))
        )
          throw new Error("OG renderer returned an invalid published session manifest.");
        routes.push(...slugs.map((slug: string) => `sessions/${slug}`));
      }
      const path = resolve(output, `${route}.png`);
      await mkdir(dirname(path), { recursive: true });
      await page.screenshot({
        path,
        type: "png",
        clip: { x: 0, y: 0, width, height },
        captureBeyondViewport: false,
      });
      console.log(`[og] ${route}.png`);
    }
    console.log(`[og] Generated ${routes.length} share images at ${width}×${height}.`);
  } finally {
    try {
      await browser?.close();
    } finally {
      await preview.stop();
    }
  }
}

await main();
