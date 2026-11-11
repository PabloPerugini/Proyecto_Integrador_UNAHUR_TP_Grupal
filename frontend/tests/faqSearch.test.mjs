import test from 'node:test';
import assert from 'node:assert/strict';
import { faqSearch, filterFaqsForRole } from '../src/utils/faqSearch.ts';
import { FAQS } from '../src/data/faq.ts';

const faqs = [
  { id: '1', category: 'Importar plan', question: '¿Cómo importo un plan de estudios?', answer: 'Ve a Cargar plan y subí el PDF.', tags: ['importar', 'pdf', 'plan'], link: '/cargar' },
  { id: '2', category: 'Correlatividades', question: '¿Qué son las correlatividades?', answer: 'Son materias que debés aprobar antes de cursar otras.', tags: ['correlativas', 'materias'], link: '/grafo' },
  { id: '3', category: 'Progreso', question: '¿Cómo guardo mi progreso?', answer: 'Marcá materias como aprobadas en Mi progreso.', tags: ['progreso', 'notas'], link: '/progreso' },
];

test('normaliza mayúsculas y tildes al comparar', () => {
  const resultados = faqSearch(faqs, 'COMO importo un PLAN');
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

test('encuentra contenido acentuado con una consulta sin tildes', () => {
  const resultados = faqSearch(faqs, 'que son las correlatividades');
  assert.strictEqual(resultados[0].id, '2');
});

test('una consulta compuesta solo por palabras vacías no devuelve resultados', () => {
  assert.deepStrictEqual(faqSearch(faqs, 'más que para'), []);
});

test('encuentra la respuesta sobre el camino crítico', () => {
  const results = faqSearch(FAQS, 'camino critico');
  assert.equal(results[0].id, 'correlatividades-camino-critico');
});

test('encuentra la respuesta sobre el camino óptimo sin tilde', () => {
  const results = faqSearch(FAQS, 'camino optimo');
  assert.equal(results[0].id, 'correlatividades-camino-optimo');
});

test('las preguntas de USER solo incluyen acciones disponibles para su rol', () => {
  const userFaqs = filterFaqsForRole(FAQS, 'USUARIO');
  const ids = userFaqs.map(faq => faq.id);
  assert.ok(!ids.includes('importar-plan-1'));
  assert.ok(!ids.includes('bajas-1'));
  assert.ok(!ids.includes('admin-1'));
  assert.ok(!ids.includes('admin-2'));
  assert.ok(ids.includes('progreso-2'));
  assert.ok(ids.includes('correlatividades-camino-critico'));
});

test('ADMIN conserva las preguntas exclusivas de administración', () => {
  const adminFaqs = filterFaqsForRole(FAQS, 'ADMIN');
  const results = faqSearch(adminFaqs, 'cómo importo un plan de estudios');
  assert.equal(results[0].id, 'importar-plan-1');
});
