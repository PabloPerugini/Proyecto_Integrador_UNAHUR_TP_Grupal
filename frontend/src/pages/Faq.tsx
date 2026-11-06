import { useState, type FormEvent } from 'react';
import Form from 'react-bootstrap/Form';
import { Link } from 'react-router-dom';
import { IconHelp } from '../components/icons';
import { FAQS, type Faq } from '../data/faq';
import { faqSearch } from '../utils/faqSearch';
import './Faq.css';

interface ActiveAnswer {
  query: string;
  answers: Faq[];
}

const suggestedQuestions: { question: Faq; label: string }[] = [
  { question: FAQS[4], label: 'Mi progreso' },
  { question: FAQS[2], label: 'Correlatividades' },
  { question: FAQS[0], label: 'Importar un plan' },
  { question: FAQS[7], label: 'Baja de un plan' },
];

export default function Faq() {
  const [query, setQuery] = useState('');
  const [activeAnswer, setActiveAnswer] = useState<ActiveAnswer | null>(null);

  function ask(question: string, answers?: Faq[]) {
    const trimmed = question.trim();
    if (!trimmed) return;

    setActiveAnswer({
      query: trimmed,
      answers: answers ?? faqSearch(FAQS, trimmed),
    });
    setQuery('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(query);
  }

  function askSuggested(question: Faq) {
    ask(question.question, [question]);
  }

  function renderAnswer(answer: Faq) {
    return (
      <article className="faq-chat__bubble" key={answer.id}>
        <h2>{answer.question}</h2>
        <p>{answer.answer}</p>
        {answer.link && (
          <Link className="faq-chat__link" to={answer.link}>
            Ir a la sección relacionada <span aria-hidden="true">→</span>
          </Link>
        )}
      </article>
    );
  }

  const relatedAnswers = activeAnswer?.answers.slice(1) ?? [];

  return (
    <section className="faq-chat" aria-labelledby="faq-title">
      <header className="faq-chat__header">
        <div>
          <h1 id="faq-title">¿En qué te ayudamos?</h1>
          <p>Encontrá respuestas claras para avanzar con tu carrera.</p>
        </div>
        <span className="faq-chat__local">
          <span className="faq-chat__local-dot" />
          Ayuda local · Sin IA
        </span>
      </header>

      <div className="faq-chat__thread" aria-live="polite" aria-relevant="additions">
        <div className="faq-chat__message faq-chat__message--assistant">
          <span className="faq-chat__avatar" aria-hidden="true"><IconHelp size={20} /></span>
          <div className="faq-chat__bubble">
            ¡Hola! Puedo orientarte con las funciones de Gradify. Elegí un tema o escribí una consulta;
            buscaré entre las respuestas disponibles.
          </div>
        </div>

        <div className="faq-chat__suggestions">
          <p>Consultas frecuentes</p>
          <div className="faq-chat__chips">
            {suggestedQuestions.map(({ question, label }) => (
              <button
                className="faq-chat__chip"
                key={question.id}
                onClick={() => askSuggested(question)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {activeAnswer && (
          <div className="faq-chat__turn">
            <div className="faq-chat__message faq-chat__user">
              <p>{activeAnswer.query}</p>
            </div>
            <div className="faq-chat__message faq-chat__message--assistant">
              <span className="faq-chat__avatar" aria-hidden="true"><IconHelp size={20} /></span>
              {activeAnswer.answers.length > 0 ? (
                <div className="faq-chat__answers">
                  {renderAnswer(activeAnswer.answers[0])}
                  {relatedAnswers.length > 0 && (
                    <details className="faq-chat__related">
                      <summary>Ver respuestas relacionadas ({relatedAnswers.length})</summary>
                      <div className="faq-chat__answers">
                        {relatedAnswers.map(renderAnswer)}
                      </div>
                    </details>
                  )}
                </div>
              ) : (
                <div className="faq-chat__bubble">
                  <h2>No encontré una respuesta exacta</h2>
                  <p>
                    Probá con otras palabras o elegí una de las consultas frecuentes para explorar
                    la ayuda disponible.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="faq-chat__composer">
        <Form className="faq-chat__form" onSubmit={handleSubmit}>
          <Form.Control
            aria-label="Escribí tu consulta"
            autoComplete="off"
            className="faq-chat__input"
            onChange={event => setQuery(event.target.value)}
            placeholder="Escribí tu consulta…"
            type="search"
            value={query}
          />
          <button
            aria-label="Buscar respuesta"
            className="faq-chat__send"
            disabled={!query.trim()}
            type="submit"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M21 3 10.5 13.5M21 3l-6.7 18-3.8-7.5L3 9.7 21 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </Form>
        <p className="faq-chat__privacy">
          Las respuestas se buscan localmente en las FAQ de Gradify; no se envía tu consulta.
        </p>
      </footer>
    </section>
  );
}
