#!/usr/bin/env node
// Refreshes data/btc-weekly.json: weekly Bitcoin closes in USD, used by
// build.mjs to draw the price / 200-week-moving-average chart.
// Run before `node build.mjs`. Needs network; if every source fails the
// existing file is kept and the build still works with older data.
//
// Sources, in order: blockchain.com (daily market price since 2009),
// Kraken (weekly OHLC since 2013). Both are free and keyless.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, "data", "btc-weekly.json");
const DAY = 86400;
const WEEK = 7 * DAY;

const isoDay = (sec) => new Date(sec * 1000).toISOString().slice(0, 10);

// Bucket daily points into calendar weeks (Monday 00:00 UTC) and keep the last
// price of each bucket as that week's close. Epoch day 0 was a Thursday, so
// shift by 3 days to make buckets start on Monday.
function weeklyFromDaily(points) {
  const byWeek = new Map();
  for (const [sec, price] of points) {
    if (!(price > 0)) continue;
    const bucket = Math.floor((sec + 3 * DAY) / WEEK);
    const prev = byWeek.get(bucket);
    if (!prev || sec >= prev[0]) byWeek.set(bucket, [sec, price]);
  }
  return [...byWeek.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([bucket, [, price]]) => [isoDay(bucket * WEEK - 3 * DAY), Math.round(price * 100) / 100]);
}

async function fromBlockchain() {
  const r = await fetch(
    "https://api.blockchain.info/charts/market-price?timespan=all&format=json&sampled=false",
    { signal: AbortSignal.timeout(30000) },
  );
  if (!r.ok) throw new Error(`blockchain.com ${r.status}`);
  const d = await r.json();
  const points = d.values.map((v) => [v.x, v.y]);
  if (points.length < 1000) throw new Error("blockchain.com: too few points");
  return { source: "blockchain.com", weeks: weeklyFromDaily(points), asOf: isoDay(points[points.length - 1][0]) };
}

async function fromKraken() {
  const r = await fetch("https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=10080", {
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw new Error(`kraken ${r.status}`);
  const d = await r.json();
  const key = Object.keys(d.result || {}).find((k) => k !== "last");
  if (!key) throw new Error("kraken: no data");
  const weeks = d.result[key].map((row) => [isoDay(row[0]), Math.round(Number(row[4]) * 100) / 100]);
  if (weeks.length < 300) throw new Error("kraken: too few rows");
  return { source: "Kraken", weeks, asOf: weeks[weeks.length - 1][0] };
}

async function main() {
  let data = null;
  for (const fn of [fromBlockchain, fromKraken]) {
    try {
      data = await fn();
      break;
    } catch (err) {
      console.error(`  ${fn.name}: ${err.message}`);
    }
  }
  if (!data) {
    try {
      const old = JSON.parse(readFileSync(OUT, "utf8"));
      console.log(`All sources failed; keeping ${OUT} (as of ${old.asOf}).`);
      return;
    } catch {
      console.error("All sources failed and no cached data exists.");
      process.exit(1);
    }
  }
  const last = data.weeks[data.weeks.length - 1];
  const out = {
    source: data.source,
    asOf: data.asOf || last[0],
    fetched: new Date().toISOString().slice(0, 10),
    weeks: data.weeks,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out));
  console.log(
    `Wrote ${data.weeks.length} weekly closes from ${data.source} (${data.weeks[0][0]} → ${last[0]}, last ${last[1]}).`,
  );
}

main();
