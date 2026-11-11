import type { Faq, FaqRole } from '../data/faq';

export function filterFaqsForRole(faqs: Faq[], role: FaqRole): Faq[] {
  return faqs.filter(faq => !faq.roles || faq.roles.includes(role));
}

const STOP_WORDS = new Set([
  'a', 'al', 'algo', 'ante', 'antes', 'como', 'con', 'contra', 'cual',
  'cuando', 'cuanto', 'de', 'del', 'desde', 'donde', 'el', 'ella', 'ellas',
  'ellos', 'en', 'entre', 'esa', 'esas', 'ese', 'esos', 'esta', 'estas',
  'este', 'estos', 'hacia', 'hasta', 'las', 'los',   'mas', 'me', 'mi',
  'mientras', 'muy', 'nada', 'no', 'nos', 'o', 'otra', 'otras', 'otro', 'otros',
  'para', 'pero', 'por', 'porque',   'que', 'quien', 'quienes', 'se',
  'si',   'sin', 'sobre', 'su', 'sus', 'tal', 'tambien', 'tanto', 'te',
  'tu', 'tus', 'un', 'una', 'unas', 'uno', 'unos', 'ver', 'y', 'ya', 'yo',
]);

/**
 * Normaliza un texto: minúsculas, sin acentos, sin espacios extra.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokeniza un texto normalizado en palabras.
 */
function tokens(text: string): string[] {
  return normalize(text).split(' ').filter(Boolean);
}

/**
 * Busca preguntas frecuentes por texto, tags y categoría.
 * Devuelve todas si la consulta está vacía, ordenadas por relevancia
 * (más coincidencias de palabras primero).
 */
export function faqSearch(faqs: Faq[], query: string): Faq[] {
  const queryTokens = [...new Set(tokens(query).filter((token) => !STOP_WORDS.has(token)))];

  if (queryTokens.length === 0) {
    return query.trim() === '' ? [...faqs] : [];
  }

  const scored = faqs
    .map((faq) => {
      const haystackWords = new Set(tokens(
        `${faq.question} ${faq.answer} ${faq.tags.join(' ')} ${faq.category}`,
      ));
      const matches = queryTokens.filter((t) => haystackWords.has(t)).length;
      return { faq, matches };
    })
    .filter(({ matches }) => matches > 0)
    .sort((a, b) => b.matches - a.matches);

  return scored.map(({ faq }) => faq);
}
