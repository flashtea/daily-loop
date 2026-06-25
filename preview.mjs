#!/usr/bin/env node
// Dev-only layout preview. Builds the site, then screenshots a page at desktop
// and mobile widths into preview/ so layout changes can be checked before push.
// Not part of the published site.
//
// Setup (once):  npm install  &&  npx playwright install chromium
// Usage:         node preview.mjs [page]   (page defaults to index.html)
//
// Live Bitcoin charts (TradingView) need network and won't render here — that's
// expected; this is for layout, not the widgets.

import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DOCS = join(ROOT, "docs");
const OUT = join(ROOT, "preview");

const page = process.argv[2] || "index.html";
const viewports = [
  { name: "desktop", width: 1280, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];

async function main() {
  console.log("Building site…");
  execSync("node build.mjs", { cwd: ROOT, stdio: "inherit" });
  mkdirSync(OUT, { recursive: true });

  const url = pathToFileURL(join(DOCS, page)).href;
  const browser = await chromium.launch();
  try {
    for (const vp of viewports) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
      });
      const p = await ctx.newPage();
      await p.goto(url, { waitUntil: "load" });
      // Settle layout; skip waiting on the external chart widgets.
      await p.waitForTimeout(400);
      const file = join(OUT, `${page.replace(/\.html$/, "")}-${vp.name}.png`);
      await p.screenshot({ path: file, fullPage: true });
      await ctx.close();
      console.log(`  ${vp.name.padEnd(7)} → ${file}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
