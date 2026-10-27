// Extracción cruda de texto de PDFs
// Carga pdfjs-dist y devuelve páginas/ítems con coordenadas. Es la base de los tres parsers.

let pdfjsPromise = null;

const getPdfjs = () => {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  }
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

async function extractLines(data) {
  const rawPages = await getRawItems(data);
  const pages = [];
  for (const page of rawPages) {
    const lineMap = new Map();
    for (const it of page.items) {
      const key = Math.round(it.y);
      if (!lineMap.has(key)) lineMap.set(key, []);
      lineMap.get(key).push(it);
    }

    const lines = [];
    for (const [y, arr] of lineMap) {
      arr.sort((a, b) => a.x - b.x);
      lines.push({ y, text: arr.map((v) => v.t).join(" ").trim() });
    }
    lines.sort((a, b) => b.y - a.y);
    pages.push({ num: page.num, lines });
  }
  return pages;
}


module.exports = { getRawItems, extractLines };
