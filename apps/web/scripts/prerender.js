import puppeteer from "puppeteer";
import { writeFileSync, mkdirSync, existsSync, createReadStream, statSync } from "fs";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Only genuinely public, crawlable routes belong here.
// Do NOT add auth routes (e.g. /login): their beforeLoad always throws a redirect,
// so the snapshot would just be whatever page they bounce to.
const routes = ["/", "/subscribe"];

// The DOM id that src/main.tsx mounts the React tree into.
const MOUNT_ID = "app";

const distPath = resolve(__dirname, "../dist");
const indexPath = join(distPath, "index.html");

// Snapshots live in their own directory and are served only to crawlers (see server.js).
// dist/index.html is deliberately left untouched so a bad snapshot can never blank the SPA.
const prerenderDir = join(distPath, "__prerendered__");

if (!existsSync(indexPath)) {
  console.error("❌ Build output not found. Please run 'vite build' first.");
  process.exit(1);
}

console.log("🚀 Starting pre-rendering...");

// Simple static file server for pre-rendering
function createStaticServer(distPath, port) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      let filePath = join(distPath, req.url === "/" ? "index.html" : req.url);

      // Handle SPA routing - serve index.html for all routes
      if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
        filePath = indexPath;
      }

      // Set proper content type
      const ext = filePath.split(".").pop();
      const contentTypes = {
        html: "text/html",
        js: "application/javascript",
        css: "text/css",
        json: "application/json",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        svg: "image/svg+xml",
        ico: "image/x-icon",
      };
      const contentType = contentTypes[ext] || "application/octet-stream";

      try {
        const stream = createReadStream(filePath);
        res.writeHead(200, { "Content-Type": contentType });
        stream.pipe(res);
      } catch (error) {
        res.writeHead(404);
        res.end("Not Found");
      }
    });

    server.listen(port, () => {
      console.log(`📡 Started local server on port ${port}`);
      resolve(server);
    });
  });
}

function resolveChromePath() {
  try {
    const bundled = puppeteer.executablePath();
    if (existsSync(bundled)) return bundled;
  } catch {
    // fall through to system locations
  }

  const possiblePaths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
  ].filter(Boolean);

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      console.log(`📦 Using system Chrome/Chromium: ${path}`);
      return path;
    }
  }

  console.error("❌ Chrome/Chromium not found!");
  console.error("\nInstall it with one of:");
  console.error("  npx puppeteer browsers install chrome");
  console.error("  OR set PUPPETEER_EXECUTABLE_PATH / CHROME_PATH");
  process.exit(1);
}

async function prerender() {
  const port = 4174; // Use a different port than preview
  const server = await createStaticServer(distPath, port);
  const baseUrl = `http://localhost:${port}`;

  const launchOptions = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: resolveChromePath(),
  };

  let browser;
  try {
    browser = await puppeteer.launch(launchOptions);
  } catch (error) {
    console.error("❌ Failed to launch browser:", error.message);
    process.exit(1);
  }

  try {
    for (const route of routes) {
      console.log(`📄 Pre-rendering route: ${route}`);

      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });

      await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle0" });

      // Wait for the app's render-complete signal, with a bounded fallback.
      await Promise.race([
        page.evaluate(
          () =>
            new Promise((resolve) => {
              const handler = () => {
                document.removeEventListener("render-complete", handler);
                resolve();
              };
              document.addEventListener("render-complete", handler);
              setTimeout(resolve, 2000);
            })
        ),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);

      // Guard against shipping an empty snapshot — writing one of these over
      // index.html is what produced the blank pages that disabled prerendering.
      // MOUNT_ID must match the element main.tsx renders into.
      const rootLength = await page.evaluate(
        (id) => document.getElementById(id)?.innerHTML.trim().length ?? -1,
        MOUNT_ID
      );
      if (rootLength < 0) {
        throw new Error(
          `Route ${route}: mount element #${MOUNT_ID} not found. ` +
            `Has the mount point in src/main.tsx changed?`
        );
      }
      if (rootLength < 200) {
        throw new Error(
          `Route ${route} rendered an essentially empty #${MOUNT_ID} (${rootLength} chars). ` +
            `Refusing to write a blank snapshot.`
        );
      }

      const html = await page.content();
      // Vite emits absolute /assets/... URLs, so only the local origin needs stripping.
      const fixedHtml = html.replaceAll(baseUrl, "");

      const outDir = route === "/" ? prerenderDir : join(prerenderDir, route);
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, "index.html"), fixedHtml);
      console.log(
        `✅ Pre-rendered: ${route} -> __prerendered__${route === "/" ? "" : route}/index.html (${rootLength} chars)`
      );

      await page.close();
    }

    console.log("✨ Pre-rendering complete! (dist/index.html left untouched)");
  } catch (error) {
    console.error("❌ Pre-rendering failed:", error);
    process.exit(1);
  } finally {
    await browser.close();
    server.close();
  }
}

prerender();
