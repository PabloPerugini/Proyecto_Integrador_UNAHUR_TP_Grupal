import { useMemo, useState } from 'react';
import Accordion from 'react-bootstrap/Accordion';
import Form from 'react-bootstrap/Form';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { FAQS, type FaqCategory } from '../data/faq';
import { faqSearch } from '../utils/faqSearch';

const categories: { value: FaqCategory; label: string }[] = [
  { value: 'importar-plan', label: 'Importar planes' },
  { value: 'correlatividades', label: 'Correlatividades' },
  { value: 'progreso', label: 'Progreso' },
  { value: 'bajas', label: 'Bajas' },
  { value: 'admin', label: 'Administración' },
  { value: 'cuenta', label: 'Cuenta' },
];

const categoryLabels = Object.fromEntries(
  categories.map(({ value, label }) => [value, label]),
) as Record<FaqCategory, string>;

function isFaqCategory(value: string): value is FaqCategory {
  return categories.some(categoryOption => categoryOption.value === value);
}

export default function Faq() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FaqCategory | ''>('');

  const results = useMemo(
    () => faqSearch(FAQS, query).filter(item => !category || item.category === category),
    [query, category],
  );

  return (
    <>
      <PageHeader
        title="Preguntas frecuentes"
        sub="Respuestas rápidas sobre el uso de Gradify."
      />

      <section aria-label="Buscar preguntas frecuentes" className="mb-4">
        <p className="text-muted">
          La búsqueda se realiza localmente en estas preguntas; no usa IA ni envía tu consulta a un servidor.
        </p>
        <div className="row g-3">
          <div className="col-12 col-md-8">
            <Form.Label htmlFor="faq-search">Buscar por pregunta, respuesta o tema</Form.Label>
            <Form.Control
              id="faq-search"
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Ej.: importar un plan, materias disponibles"
            />
          </div>
          <div className="col-12 col-md-4">
            <Form.Label htmlFor="faq-category">Filtrar por categoría</Form.Label>
            <Form.Select
              id="faq-category"
              value={category}
              onChange={event => {
                const value = event.target.value;
                setCategory(isFaqCategory(value) ? value : '');
              }}
            >
              <option value="">Todas las categorías</option>
              {categories.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Form.Select>
          </div>
        </div>
      </section>

      <p className="small text-muted" role="status" aria-live="polite">
        {results.length} {results.length === 1 ? 'respuesta encontrada' : 'respuestas encontradas'}
      </p>

      {results.length > 0 ? (
        <Accordion>
          {results.map(item => (
            <Accordion.Item eventKey={item.id} key={item.id}>
              <Accordion.Header>
                <span className="me-2">{item.question}</span>
                <span className="badge text-bg-light">{categoryLabels[item.category]}</span>
              </Accordion.Header>
              <Accordion.Body>
                <p>{item.answer}</p>
                {item.link && (
                  <Link to={item.link} className="link-primary">
                    Ir a la sección relacionada
                  </Link>
                )}
              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>
      ) : (
        <div className="empty-state" role="status">
          <h2 className="h5">No encontramos respuestas</h2>
          <p className="mb-0">Probá con otras palabras o elegí otra categoría.</p>
        </div>
      )}
    </>
  );
}
