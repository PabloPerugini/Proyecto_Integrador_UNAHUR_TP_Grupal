import test from 'node:test';
import assert from 'node:assert/strict';
import { faqSearch } from '../src/utils/faqSearch.ts';

const faqs = [
  { id: '1', category: 'Importar plan', question: '¿Cómo importo un plan de estudios?', answer: 'Ve a Cargar plan y subí el PDF.', tags: ['importar', 'pdf', 'plan'], link: '/cargar' },
  { id: '2', category: 'Correlatividades', question: '¿Qué son las correlatividades?', answer: 'Son materias que debés aprobar antes de cursar otras.', tags: ['correlativas', 'materias'], link: '/grafo' },
  { id: '3', category: 'Progreso', question: '¿Cómo guardo mi progreso?', answer: 'Marcá materias como aprobadas en Mi progreso.', tags: ['progreso', 'notas'], link: '/progreso' },
];

test('normaliza mayúsculas y acentos', () => {
  const resultados = faqSearch(faqs, 'importar plan de estudios');
  assert.strictEqual(resultados[0].id, '1');
});

test('busca por tags', () => {
  const resultados = faqSearch(faqs, 'pdf');
  assert.strictEqual(resultados.length, 1);
  assert.strictEqual(resultados[0].id, '1');
});

test('sin resultados devuelve array vacío', () => {
  const resultados = faqSearch(faqs, 'xyz nada que ver');
  assert.deepStrictEqual(resultados, []);
});

test('consulta vacía devuelve todas', () => {
  const resultados = faqSearch(faqs, '');
  assert.strictEqual(resultados.length, 3);
});

test('ignora acentos en la consulta', () => {
  const resultados = faqSearch(faqs, 'correlatividades');
  assert.strictEqual(resultados[0].id, '2');
});
