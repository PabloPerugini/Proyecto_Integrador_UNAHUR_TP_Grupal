const fs = require("fs");
const path = require("path");
let pdfjsPromise = null;
const getPdfjs = () => {
  if (!pdfjsPromise) pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  return pdfjsPromise;
};
async function getRawItems(data) {
  const { getDocument } = await getPdfjs();
  const doc = await getDocument({ data: new Uint8Array(data), useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    const items = [];
    for (const it of tc.items) if ("str" in it && it.str.trim()) {
      const tr = it.transform;
      items.push({ x: Math.round(tr[4] * 10) / 10, y: Math.round(tr[5] * 10) / 10, t: it.str.replace(/\s+/g, " ").trim() });
    }
    pages.push({ num: i, items });
  }
  return pages;
}
function groupRows(page) {
  const rowMap = new Map();
  for (const it of page.items) { const key = Math.round(it.y); if (!rowMap.has(key)) rowMap.set(key, []); rowMap.get(key).push(it); }
  const rows = [];
  for (const [y, arr] of rowMap) { arr.sort((a, b) => a.x - b.x); rows.push({ y, items: arr }); }
  rows.sort((a, b) => b.y - a.y);
  return rows;
}
const FILE = "C:\\Users\\pablo\\OneDrive\\Desktop\\Licenciatura informatica\\PDF de Carrera\\varios";
(async () => {
  const file = process.argv[2];
  const pages = process.argv.slice(3).map(Number);
  const buf = fs.readFileSync(path.join(FILE, file));
  const rawPages = await getRawItems(buf);
  for (const page of rawPages) {
    if (!pages.includes(page.num)) continue;
    console.log(`\n===== PAGE ${page.num} =====`);
    for (const row of groupRows(page)) {
      const text = row.items.map((i) => i.t).join(" ").replace(/\s+/g, " ").trim();
      const shorts = row.items.map((i) => i.t).join("·");
      console.log(`y=${row.y} | ${shorts}`);
    }
  }
})().catch((e) => { console.error(e); process.exit(1); });