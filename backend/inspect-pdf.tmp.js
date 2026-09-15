const fs = require("fs");
const path = require("path");
const {
  parseOfficialPlan,
  parseCorrelativas,
} = require(path.join(
  "C:\\Users\\pablo\\OneDrive\\Desktop\\Licenciatura informatica\\Cursos ACA\\ACA Proyecto integrador Programación - Informática\\Projecto_UNAHUR_TP_Grupal\\backend\\src\\services\\pdfParser.service.js",
));

// We peek at private funcs by re-implementing the raw extraction.
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

const FILE =
  "C:\\Users\\pablo\\OneDrive\\Desktop\\Licenciatura informatica\\PDF de Carrera\\varios";

(async () => {
  const query = process.argv[2];
  const file = process.argv[3];
  const filter = process.argv[4];
  if (!query || !file) {
    console.error("usage: node inspect-pdf.js <plan|corr> <path> <needle>");
    process.exit(1);
  }
  const buf = fs.readFileSync(path.join(FILE, file));
  const rawPages = await getRawItems(buf);
  for (const page of rawPages) {
    const rows = groupRows(page);
    for (const row of rows) {
      const text = row.items.map((i) => i.t).join(" ").trim();
      if (filter && text.toLowerCase().includes(filter.toLowerCase())) {
        const items = row.items
          .map((i) => `(${i.x},${Math.round(i.y)})${JSON.stringify(i.t)}`)
          .join(" ");
        console.log(`P${page.num} y=${row.y}: ${text}`);
        console.log(`      ${items}`);
      }
    }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});