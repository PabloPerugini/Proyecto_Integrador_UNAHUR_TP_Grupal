const { pipeline } = require("@xenova/transformers");
const MODEL = process.env.EMBEDDINGS_MODEL || "Xenova/all-MiniLM-L6-v2";
const MIN_SIMILARITY = Number(process.env.EMBEDDINGS_MIN_SIMILARITY ?? 0.8);

let extractor = null;
let loading = null;

async function getExtractor() {
  if (extractor) return extractor;
  if (!loading) {
    loading = pipeline("feature-extraction", MODEL)
      .then((pipe) => {
        extractor = pipe;
        return extractor;
      })
      .finally(() => {
        loading = null;
      });
  }
  return loading;
}

function cosine(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

async function embedTexts(texts) {
  const pipe = await getExtractor();
  const output = await pipe(texts, { pooling: "mean", normalize: true });
  return output.tolist();
}

module.exports = { embedTexts, cosine, MIN_SIMILARITY };