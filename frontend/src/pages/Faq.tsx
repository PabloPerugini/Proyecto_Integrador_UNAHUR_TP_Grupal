import { useEffect, useRef, useState, type FormEvent } from 'react';
import Form from 'react-bootstrap/Form';
import { Link } from 'react-router-dom';
import { IconHelp } from '../components/icons';
import { FAQS, type Faq } from '../data/faq';
import { faqSearch } from '../utils/faqSearch';
import './Faq.css';

interface ConversationTurn {
  id: number;
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
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [nextId, setNextId] = useState(0);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [turns]);

  function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;

    setTurns(current => [
      ...current,
      { id: nextId, query: trimmed, answers: faqSearch(FAQS, trimmed) },
    ]);
    setNextId(id => id + 1);
    setQuery('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(query);
  }

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
                onClick={() => ask(question.question)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {turns.map(turn => (
          <div className="faq-chat__turn" key={turn.id}>
            <div className="faq-chat__message faq-chat__user">
              <p>{turn.query}</p>
            </div>

            {turn.answers.length > 0 ? (
              <div className="faq-chat__message faq-chat__message--assistant">
                <span className="faq-chat__avatar" aria-hidden="true"><IconHelp size={20} /></span>
                <div className="faq-chat__answers">
                  {turn.answers.map(answer => (
                    <article className="faq-chat__bubble" key={answer.id}>
                      <h2>{answer.question}</h2>
                      <p>{answer.answer}</p>
                      {answer.link && (
                        <Link className="faq-chat__link" to={answer.link}>
                          Ir a la sección relacionada <span aria-hidden="true">→</span>
                        </Link>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <div className="faq-chat__message faq-chat__message--assistant">
                <span className="faq-chat__avatar" aria-hidden="true"><IconHelp size={20} /></span>
                <div className="faq-chat__bubble">
                  <h2>No encontré una respuesta exacta</h2>
                  <p>
                    Probá con otras palabras o elegí una de las consultas frecuentes para explorar
                    la ayuda disponible.
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={threadEndRef} />
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
