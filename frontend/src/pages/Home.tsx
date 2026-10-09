
import { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

import {
  studyPlansApi,
  type StudyPlan,
  type PlanSubject,
} from '../api/studyPlans';

import { useCareers } from '../hooks/useCareers';
import { useCareerSelection } from '../context/CareerContext';

import PageHeader from '../components/PageHeader';
import PageLoader from '../components/PageLoader';
import EmptyState from '../components/EmptyState';

import { IconCap, IconBoard } from '../components/icons';

interface PlanEntry {
  plan: StudyPlan;

  // null indica que falló la consulta de materias.
  subjects: PlanSubject[] | null;
}

const fmt = new Intl.NumberFormat('es-AR');

// Nombre de la materia, considerando
// que Subject puede venir populado o como ID.
function subjectName(item: PlanSubject): string {
  if (
    item.subject &&
    typeof item.subject === 'object'
  ) {
    return item.subject.name || item.code || 'Materia sin nombre';
  }

  return item.code || 'Materia sin nombre';
}

export default function Home() {
  const navigate = useNavigate();
  const { setCareerId } = useCareerSelection();

  const { careers } = useCareers();

  const [entries, setEntries] = useState<PlanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // =========================================
  // CONSULTAR PLANES Y MATERIAS
  // =========================================

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const plans = await studyPlansApi.getAll();

        if (!Array.isArray(plans)) {
          throw new Error(
            'El backend no devolvió una lista de planes.'
          );
        }

        // Consultar las materias de cada plan.
        // allSettled permite seguir mostrando
        // los otros planes si uno falla.
        const results = await Promise.allSettled(
          plans.map((plan) =>
            studyPlansApi.getSubjects(plan._id)
          )
        );

        if (!active) return;

        const loadedEntries: PlanEntry[] =
          plans.map((plan, index) => {
            const result = results[index];

            return {
              plan,
              subjects:
                result.status === 'fulfilled' &&
                Array.isArray(result.value)
                  ? result.value
                  : null,
            };
          });

        setEntries(loadedEntries);
        setError(null);
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : 'No se pudieron cargar los planes'
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  // =========================================
  // OBTENER NOMBRE Y COLOR DE LA CARRERA
  // =========================================

  const getCareerInfo = (plan: StudyPlan) => {
    const careerId =
      typeof plan.career === 'string'
        ? plan.career
        : plan.career?._id;

    // Buscar la carrera en el catálogo.
    const existingCareer = careers.find(
      (career) => career._id === careerId
    );

    const populatedCareer =
      typeof plan.career === 'object'
        ? plan.career
        : null;

    return {
      name:
        populatedCareer?.name ||
        existingCareer?.name ||
        'Carrera asociada',

      color:
        populatedCareer?.color ||
        existingCareer?.color ||
        '#6841df',
    };
  };

  // =========================================
  // ESTADÍSTICAS
  // =========================================

  const totalPlans = entries.length;

  const totalSubjects = entries.reduce(
    (total, entry) =>
      total + (entry.subjects?.length ?? 0),
    0
  );

  const publishedPlans = entries.filter(
    (entry) => entry.plan.status === 'published'
  ).length;

  const failedSubjectLoads = entries.filter(
    (entry) => entry.subjects === null
  ).length;

  // =========================================
  // INTERFAZ
  // =========================================

  return (
    <div>
      <PageHeader
        title="Mis planes de estudio"
        sub="Explorá tus planes, revisá sus materias y organizá tu recorrido académico."
      />

      <div className="d-flex justify-content-end mb-4">
        <Button
          className="btn-gradify"
          onClick={() => navigate('/cargar')}
        >
          + Cargar nuevo plan
        </Button>
      </div>

      {loading && (
        <PageLoader text="Cargando planes de estudio…" />
      )}

      {!loading && error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {!loading &&
        !error &&
        entries.length === 0 && (
          <EmptyState
            icon={<IconCap size={46} />}
            title="Todavía no hay planes disponibles"
            text="Cargá un PDF, revisá las materias y guardá el plan para verlo acá."
            action={
              <Button
                className="btn-gradify"
                onClick={() => navigate('/cargar')}
              >
                Cargar mi primer plan
              </Button>
            }
          />
        )}

      {!loading &&
        !error &&
        entries.length > 0 && (
          <>
            {/* ESTADÍSTICAS */}

            <div className="mini-stats mb-4">
              <div className="mini-stat">
                <span className="mini-stat__icon">
                  <IconCap />
                </span>

                <div>
                  <div className="mini-stat__value">
                    {fmt.format(totalPlans)}
                  </div>

                  <div className="mini-stat__label">
                    planes disponibles
                  </div>
                </div>
              </div>

              <div className="mini-stat">
                <span className="mini-stat__icon">
                  <IconBoard />
                </span>

                <div>
                  <div className="mini-stat__value">
                    {fmt.format(totalSubjects)}
                  </div>

                  <div className="mini-stat__label">
                    materias en los planes
                  </div>
                </div>
              </div>

              <div className="mini-stat">
                <span className="mini-stat__icon">
                  <IconCap />
                </span>

                <div>
                  <div className="mini-stat__value">
                    {fmt.format(publishedPlans)}
                  </div>

                  <div className="mini-stat__label">
                    planes publicados
                  </div>
                </div>
              </div>
            </div>

            {failedSubjectLoads > 0 && (
              <div className="alert alert-warning">
                No se pudieron consultar las materias
                de {failedSubjectLoads} plan(es).
                Los otros planes siguen disponibles.
              </div>
            )}

            {/* PLANES GUARDADOS */}

            <div className="career-grid">
              {entries.map(({ plan, subjects }) => {
                const career = getCareerInfo(plan);

                const published =
                  plan.status === 'published';

                return (
                  <article
                    key={plan._id}
                    className="career-card"
                  >
                    {/* PORTADA */}

                    <div
                      className="career-card__cover"
                      style={{
                        background:
                          `linear-gradient(135deg, ${career.color} 0%, color-mix(in srgb, ${career.color} 52%, #0b0f14) 100%)`,
                      }}
                    >
                      <span
                        className={
                          `career-card__cover-badge${
                            published
                              ? ' career-card__cover-badge--published'
                              : ''
                          }`
                        }
                      >
                        {published
                          ? 'Publicado'
                          : 'Borrador'}
                      </span>

                      <span className="career-card__cover-icon">
                        <IconCap />
                      </span>

                      <span className="career-card__cover-title">
                        {plan.name}
                      </span>
                    </div>

                    {/* INFORMACIÓN */}

                    <div className="career-card__body">
                      <p className="career-card__institute">
                        {career.name}
                      </p>

                      <div className="chips">
                        <span className="chip">
                          {subjects === null
                            ? 'Materias no disponibles'
                            : `${subjects.length} materias`}
                        </span>

                        {(plan.durationYears ?? 0) > 0 && (
                          <span className="chip">
                            {plan.durationYears} años
                          </span>
                        )}

                        {(plan.creditsFinal ?? 0) > 0 && (
                          <span className="chip">
                            {plan.creditsFinal} créditos
                          </span>
                        )}
                      </div>

                      {/* MATERIAS REALES DEL PLAN */}

                      {subjects !== null && (
                        <details className="mt-3">
                          <summary
                            style={{
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            Ver materias (
                            {subjects.length})
                          </summary>

                          {subjects.length === 0 ? (
                            <p className="text-muted small mt-2">
                              Este plan todavía no
                              tiene materias cargadas.
                            </p>
                          ) : (
                            <div
                              className="mt-2"
                              style={{
                                maxHeight: 280,
                                overflowY: 'auto',
                              }}
                            >
                              <ul className="list-group list-group-flush">
                                {subjects.map((item) => (
                                  <li
                                    key={item._id}
                                    className="list-group-item px-0"
                                  >
                                    <div>
                                      <strong>
                                        {subjectName(item)}
                                      </strong>
                                    </div>

                                    <small className="text-muted">
                                      {item.code && (
                                        <>
                                          {item.code}
                                          {' · '}
                                        </>
                                      )}

                                      {item.year
                                        ? `Año ${item.year}`
                                        : 'Año sin definir'}

                                      {item.period
                                        ? ` · Período ${item.period}`
                                        : ''}
                                    </small>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </details>
                      )}

                      {subjects === null && (
                        <p className="text-warning small mt-3">
                          No se pudo consultar el
                          contenido de este plan.
                        </p>
                      )}
                    </div>

                    <div className="career-card__actions d-flex flex-wrap gap-2">
                      <Button size="sm" variant="primary" onClick={() => { setCareerId(plan._id); navigate(`/grafo/${plan._id}`); }}>Grafo</Button>
                      <Button size="sm" variant="outline-primary" onClick={() => { setCareerId(plan._id); navigate(`/tablero/${plan._id}`); }}>Tablero</Button>
                      <Button size="sm" variant="outline-secondary" onClick={() => { setCareerId(plan._id); navigate('/progreso'); }}>Mi progreso</Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
    </div>
  );
}
