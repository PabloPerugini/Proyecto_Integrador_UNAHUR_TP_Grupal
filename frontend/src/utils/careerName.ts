const INSTITUTE_HINTS: Array<[RegExp, string]> = [
  [/ciberseguridad|inform|tecnolog|ingenier|agron/i, 'Tecnología e Ingeniería'],
  [/biotecnolog/i, 'Biotecnología'],
  [/enfermer|salud|medicin|obstetric/i, 'Salud Comunitaria'],
  [/educaci|profesorado|docen|pedagog/i, 'Educación'],
];

const STOP_WORDS = new Set([
  'a', 'al', 'de', 'del', 'e', 'el', 'en', 'y', 'la', 'las', 'los', 'o',
  'para', 'por', 'que', 'su', 'un', 'una',
]);

const WORD_FIX: Record<string, string> = {
  agronomica: 'agronómica',
  biotecnologia: 'biotecnología',
  enfermeria: 'enfermería',
  informatica: 'informática',
  ingenieria: 'ingeniería',
  tecnologia: 'tecnología',
};

function titleCase(input: string): string {
  return input
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w) => (STOP_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

export function careerNameFromFilename(filename: string): string {
  const clean = filename
    .replace(/\.[^.]+$/, '')
    .replace(/[_]+/g, ' ')
    .replace(/[-]+/g, ' ')
    .replace(/\bremoved\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const lower = clean.toLowerCase().trim();
  let name: string | null = null;

  let m = lower.match(/\bcarrera\s+denominada\s+(.+?)\s*$/);
  if (m) {
    name = m[1];
  } else {
    m = lower.match(/\bcarrera\s+(.+?)\s*$/);
    if (m) name = m[1];
  }

  if (!name) {
    m = lower.match(/^lic\b(?: en | de )?(.+?)\s*$/);
    if (m) name = `licenciatura en ${m[1]}`;
  }

  if (!name) name = lower.trim();

  name = name
    .replace(/\b(?:exp|rcs|res|propuesta)\b.*$/gi, ' ')
    .replace(/\b\d{2}\/\d{2}\/\d{2,4}\b/g, ' ')
    .replace(/\bplan\s+de\s+estudio\w*\b.*$/gi, ' ')
    .replace(/\b\d{4}\b/g, ' ')
    .replace(/\b\d{1,2}\b/g, ' ')
    .replace(/[^\p{L} ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!name) return 'Carrera sin nombre';

  const fixed = name
    .split(' ')
    .map((w) => WORD_FIX[w] ?? w)
    .join(' ');
  return titleCase(fixed);
}

export function instituteFromCareer(name: string): string {
  const n = name.toLowerCase();
  for (const [re, institute] of INSTITUTE_HINTS) {
    if (re.test(n)) return institute;
  }
  return '';
}