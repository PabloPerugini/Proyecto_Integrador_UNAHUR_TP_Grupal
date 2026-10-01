#!/usr/bin/env node
/*
 * Inspector de filas de un PDF de plan (diagnóstico del parser).
 * Uso: node scripts/inspect-pdf.js <ruta-pdf> [aguja] [--page N]
 * Ej:  node scripts/inspect-pdf.js "../files/UNAHUR-Oferta-Academica/Instituto de Tecnología e Ingeniería/lic-informatica-2026.pdf" "TOTAL" --page 3
 */
const fs = require("fs");
const path = require("path");

let pdfjsPromise = null;
const getPdfjs = () => {
  if (!pdfjsPromise) pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjsPromise;
};

async function getRawItems(data) {
  const { getDocument } = await getPdfjs();
  const doc = await getDocument({
    data: new Uint8Array(data),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    const items = [];
    for (const it of tc.items) {
      if ("str" in it && it.str.trim()) {
        const tr = it.transform;
        items.push({
          x: Math.round(tr[4] * 10) / 10,
          y: Math.round(tr[5] * 10) / 10,
          t: it.str.replace(/\s+/g, " ").trim(),
        });
      }
    }
    pages.push({ num: i, items });
  }
  if (doc.destroy) {
    try {
      await doc.destroy();
    } catch {
      /* noop */
    }
  }
  return pages;
}

function groupRows(page) {
  const rowMap = new Map();
  for (const it of page.items) {
    const key = Math.round(it.y);
    if (!rowMap.has(key)) rowMap.set(key, []);
    rowMap.get(key).push(it);
  }
  const rows = [];
  for (const [y, arr] of rowMap) {
    arr.sort((a, b) => a.x - b.x);
    rows.push({ y, items: arr });
  }
  rows.sort((a, b) => b.y - a.y);
  return rows;
}

(async () => {
  const args = process.argv.slice(2);
  const pageIdx = args.indexOf("--page");
  const pageArg = pageIdx !== -1 ? parseInt(args[pageIdx + 1], 10) : null;
  const positional = args.filter(
    (a, i) => !a.startsWith("--") && !(pageIdx !== -1 && i === pageIdx + 1),
  );
  const pdfPath = positional[0];
  const needle = positional[1];
  if (!pdfPath) {
    console.error("uso: node scripts/inspect-pdf.js <ruta-pdf> [aguja] [--page N]");
    process.exit(1);
  }
  const abs = path.isAbsolute(pdfPath) ? pdfPath : path.join(process.cwd(), pdfPath);
  const buf = fs.readFileSync(abs);
  const rawPages = await getRawItems(buf);
  console.log(`páginas: ${rawPages.length}`);
  for (const page of rawPages) {
    if (pageArg && page.num !== pageArg) continue;
    const rows = groupRows(page);
    for (const row of rows) {
      const text = row.items.map((i) => i.t).join(" ").trim();
      if (needle && !text.toLowerCase().includes(needle.toLowerCase())) continue;
      const items = row.items.map((i) => `(${i.x},${Math.round(i.y)})${JSON.stringify(i.t)}`).join(" ");
      console.log(`P${page.num} y=${row.y}: ${text}`);
      console.log(`      ${items}`);
    }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
