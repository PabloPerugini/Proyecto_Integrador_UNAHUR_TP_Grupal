
import { useEffect, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

import {
  studyPlansApi,
  type StudyPlan,
  type PlanSubject,
  type IntermediateView,
  type UserStudyPlan,
} from '../api/studyPlans';
import { careersApi } from '../api/careers';
import { academicUnitsApi } from '../api/academicUnits';
import type { AcademicUnit, Career } from '../types';

import { useCareerSelection } from '../context/CareerContext';
import { useAuth } from '../hooks/useAuth';

import PageHeader from '../components/PageHeader';
import PageLoader from '../components/PageLoader';
import EmptyState from '../components/EmptyState';

import { IconCap, IconBoard } from '../components/icons';
import { instituteSurface, instituteToken, type InstituteSurface } from '../utils/instituteColors';

function unitNameOfCareer(career: Career): string | null {
  const unit = career.academicUnit;
  if (unit && typeof unit === 'object') return unit.name ?? null;
  return null;
}

function unitColorOfCareer(career: Career): string | null {
  const unit = career.academicUnit;
  if (unit && typeof unit === 'object') return unit.color ?? null;
  return null;
}

function unitNameOfPlanCareer(plan: StudyPlan): string | null {
  const career = plan.career;
  if (!career || typeof career === 'string') return null;
  const unit = career.academicUnit;
  if (unit && typeof unit === 'object') return unit.name ?? null;
  return null;
}

function unitColorOfPlanCareer(plan: StudyPlan): string | null {
  const career = plan.career;
  if (!career || typeof career === 'string') return null;
  const unit = career.academicUnit;
  if (unit && typeof unit === 'object') return unit.color ?? null;
  return null;
}

function careerCoverSurface(career: Career | null): InstituteSurface {
  return instituteSurface(
    career ? unitNameOfCareer(career) : null,
    career ? career.color || unitColorOfCareer(career) : null,
  );
}

interface PlanEntry {
  plan: StudyPlan;

  // null indica que falló la consulta de materias.
  subjects: PlanSubject[] | null;
}

type Step = 'mine' | 'units' | 'careers' | 'plans';

// =========================================
// TARJETA DE PLAN (carga perezosa de avance)
// =========================================

function PlanCard({
  entry,
  careerName,
  career,
  enrollmentId,
  onEnroll,
  onOpen,
  onRemove,
}: {
  entry: PlanEntry;
  careerName: string;
  career: Career | null;
  enrollmentId: string | null;
  onEnroll: (planId: string) => void;
  onOpen: (planId: string, path: string) => void;
  onRemove?: (planId: string) => void;
}) {
  const { plan, subjects } = entry;
  const published = plan.status === 'published';
  const coverSurface = careerCoverSurface(career);
  const tecSurface = instituteSurface(
    career ? unitNameOfCareer(career) : null,
    career ? career.color || unitColorOfCareer(career) : null,
    'soft',
  );

  const [inter, setInter] = useState<IntermediateView | null | undefined>(undefined);
  const [working, setWorking] = useState(false);

  const loadIntermediate = async () => {
    if (inter !== undefined || !plan.intermediateTitle) return;
    try {
      setInter(await studyPlansApi.getIntermediate(plan._id));
    } catch {
      setInter(null);
    }
  };

  const intermediateCount = subjects?.filter((s) => s.intermediate).length ?? 0;

  return (
    <article className="career-card">
      {/* PORTADA */}

      <div
        className="career-card__cover"
        style={coverSurface}
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
          {published ? 'Publicado' : 'Borrador'}
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
          {careerName}
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

          {plan.intermediateTitle && (
            <span className="chip" title="Incluye título intermedio" style={{ ...tecSurface, border: 'none' }}>
              🎓 {plan.intermediateTitle}
            </span>
          )}
        </div>

        {/* TÍTULO INTERMEDIO */}

        {plan.intermediateTitle && (
          <details className="mt-3" onToggle={(e) => { if ((e.target as HTMLDetailsElement).open) void loadIntermediate(); }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
              Título intermedio: {plan.intermediateTitle}
              {intermediateCount > 0 ? ` (${intermediateCount})` : ''}
            </summary>

            {inter === undefined && (
              <p className="text-muted small mt-2">Cargando título intermedio…</p>
            )}

            {inter === null && (
              <p className="text-warning small mt-2">
                No se pudo consultar el título intermedio.
              </p>
            )}

            {inter && (
              <div className="mt-2" style={{ maxHeight: 280, overflowY: 'auto' }}>
                {inter.total === 0 ? (
                  <p className="text-muted small mt-2">
                    El título intermedio todavía no tiene materias marcadas.
                  </p>
                ) : (
                <>
                <p className="small mb-1">
                  {inter.total} materias
                  {' · '}
                  {inter.closed ? 'correlativas cerradas ✅' : 'revisar correlativas ⚠️'}
                </p>

                {!inter.closed && (
                  <p className="text-warning small">
                    Algunas materias piden correlativas fuera del título intermedio.
                  </p>
                )}

                <ul className="list-group list-group-flush">
                  {inter.subjects.map((s) => (
                    <li key={s.code} className="list-group-item px-0">
                      <div>
                        <span className="badge bg-secondary me-1">T</span>
                        <strong>{s.name}</strong>
                      </div>

                      <small className="text-muted">
                        {s.code}
                        {s.year ? ` · Año ${s.year}` : ''}
                        {s.requires.length > 0 && ` · Requiere: ${s.requires.join(', ')}`}
                      </small>
                    </li>
                  ))}
                </ul>
                </>
                )}
              </div>
            )}
          </details>
        )}

        {/* El detalle de materias, el avance y qué se puede cursar
            viven en Mi progreso y en el grafo. */}

        {subjects === null && (
          <p className="text-warning small mt-3">
            No se pudo consultar el contenido de este plan.
          </p>
        )}
      </div>

      <div className="career-card__actions d-flex flex-wrap gap-2">
        <Button size="sm" variant="primary" onClick={() => onOpen(plan._id, 'grafo')}>Grafo</Button>
        <Button size="sm" variant="outline-primary" onClick={() => onOpen(plan._id, 'tablero')}>Tablero</Button>
        {enrollmentId ? (
          <>
            <Button size="sm" variant="outline-secondary" onClick={() => onOpen(plan._id, 'progreso')}>Mi progreso</Button>
            {onRemove && (
              <Button size="sm" variant="outline-danger" onClick={() => onRemove(plan._id)}>
                Quitar plan
              </Button>
            )}
          </>
        ) : (
          <Button
            size="sm"
            variant="outline-success"
            disabled={working}
            onClick={async () => { setWorking(true); try { await onEnroll(plan._id); } finally { setWorking(false); } }}
          >
            {working ? 'Inscribiendo…' : 'Inscribirme'}
          </Button>
        )}
      </div>
    </article>
  );
}

function EnrolledPlanCard({
  entry,
  careerName,
  careerColor,
  onOpen,
  onRemove,
}: {
  entry: PlanEntry;
  careerName: string;
  careerColor: string;
  onOpen: (planId: string, path: string) => void;
  onRemove?: (planId: string) => void;
}) {
  const { plan, subjects } = entry;
  const subjectCount = subjects === null ? null : subjects.length;
  const showCareer = Boolean(
    careerName && careerName !== 'Carrera asociada' && careerName !== plan.name,
  );

  return (
    <article className="plan-row" style={{ borderLeftColor: careerColor }}>
      <div
        className="plan-row__icon"
        style={{
          color: careerColor,
          background: `color-mix(in srgb, ${careerColor} 13%, transparent)`,
        }}
        aria-hidden="true"
      >
        <IconCap />
      </div>

      <div className="plan-row__main">
        <div className="plan-row__heading">
          <h3>{plan.name}</h3>
          <span className="plan-row__badge">
            <span className="plan-row__dot" /> Inscripto
          </span>
        </div>

        <div className="plan-row__meta">
          {showCareer && <span>{careerName}</span>}
          {subjectCount !== null && <span>{subjectCount} materias</span>}
          {(plan.durationYears ?? 0) > 0 && <span>{plan.durationYears} años</span>}
        </div>

        {plan.intermediateTitle && (
          <span className="chip chip--success plan-row__tec" title={`Incluye ${plan.intermediateTitle}`}>
            🎓 Título intermedio
          </span>
        )}
      </div>

      <div className="plan-row__actions">
        <Button size="sm" variant="primary" onClick={() => onOpen(plan._id, 'grafo')}>Grafo</Button>
        <Button size="sm" variant="outline-primary" onClick={() => onOpen(plan._id, 'tablero')}>Tablero</Button>
        <Button size="sm" variant="outline-secondary" onClick={() => onOpen(plan._id, 'progreso')}>Mi progreso</Button>
        {onRemove && (
          <Button
            size="sm"
            variant="outline-danger"
            title="Quitar este plan de mi cuenta"
            onClick={() => onRemove(plan._id)}
          >
            Quitar plan
          </Button>
        )}
      </div>
    </article>
  );
}

function planCareerName(plan: StudyPlan): string {
  if (plan.career && typeof plan.career === 'object') {
    return plan.career.name || 'Carrera asociada';
  }
  return 'Carrera asociada';
}

function planCareerColor(plan: StudyPlan): string {
  if (plan.career && typeof plan.career === 'object') {
    return instituteToken(
      unitNameOfPlanCareer(plan),
      plan.career.color || unitColorOfPlanCareer(plan),
    );
  }
  return instituteToken(null);
}

// =========================================
// HOME: MIS INSCRIPCIONES → INSTITUTO → CARRERAS → PLANES
// =========================================

export default function Home() {
  const navigate = useNavigate();
  const { careerId, setCareerId, notifyEnrollmentsChanged } = useCareerSelection();
  const { user } = useAuth();
  const isAdmin = user?.rol === 'ADMIN';

  const [step, setStep] = useState<Step>('units');
  const [units, setUnits] = useState<AcademicUnit[]>([]);
  const [careers, setCareers] = useState<Career[]>([]);
  const [entries, setEntries] = useState<PlanEntry[]>([]);
  const [enrollments, setEnrollments] = useState<UserStudyPlan[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<AcademicUnit | null>(null);
  const [selectedCareer, setSelectedCareer] = useState<Career | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const openMine = async (enrolls: UserStudyPlan[]) => {
    setLoading(true);
    setError(null);
    try {
      const pairs = await Promise.all(
        enrolls.map(async (e) => {
          const sp = e.studyPlan;
          const plan =
            sp && typeof sp === 'object'
              ? sp
              : await studyPlansApi.getById(typeof sp === 'string' ? sp : '');
          const s = await studyPlansApi
            .getSubjects(plan._id)
            .catch((): null => null);
          const subjects: PlanSubject[] | null = Array.isArray(s) ? s : null;
          return { plan, subjects };
        }),
      );
      setEntries(pairs);
      setSelectedUnit(null);
      setSelectedCareer(null);
      setStep('mine');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar tus inscripciones');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  // Inicio: institutos + inscripciones. Si hay inscripciones,
  // se aterriza en "Mis inscripciones" (mi carrera recordada).
  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [list, mine] = await Promise.all([
          academicUnitsApi.getAll(true),
          studyPlansApi.getMine(),
        ]);
        if (!active) return;
        setUnits(Array.isArray(list) ? list : []);
        const enrolls = Array.isArray(mine) ? mine : [];
        setEnrollments(enrolls);
        setError(null);

        if (enrolls.length > 0) {
          await openMine(enrolls);
          return;
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los institutos');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => { active = false; };
  }, []);

  const openUnit = async (unit: AcademicUnit) => {
    setSelectedUnit(unit);
    setSelectedCareer(null);
    setStep('careers');
    setLoading(true);
    setError(null);

    try {
      // Un solo fetch de planes: se agrupan por carrera en cliente.
      const [careerList, plans] = await Promise.all([
        careersApi.getAll(unit._id),
        studyPlansApi.getAll(),
      ]);

      const withPlans = new Set(
        plans
          .filter((p) => p.status === 'published' || isAdmin)
          .map((p) => (typeof p.career === 'string' ? p.career : p.career?._id)),
      );

      setCareers(
        (Array.isArray(careerList) ? careerList : []).filter(
          (c) => isAdmin || withPlans.has(c._id),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las carreras');
      setCareers([]);
    } finally {
      setLoading(false);
    }
  };

  const openCareer = async (career: Career) => {
    setSelectedCareer(career);
    setStep('plans');
    setLoading(true);
    setError(null);

    try {
      const [plans, mine] = await Promise.all([
        studyPlansApi.getAll(career._id),
        studyPlansApi.getMine(),
      ]);

      const visible = plans.filter((p) => p.status === 'published' || isAdmin);
      setEnrollments(Array.isArray(mine) ? mine : []);

      const results = await Promise.allSettled(
        visible.map((plan) => studyPlansApi.getSubjects(plan._id)),
      );

      setEntries(
        visible.map((plan, index) => {
          const result = results[index];
          return {
            plan,
            subjects:
              result.status === 'fulfilled' && Array.isArray(result.value)
                ? result.value
                : null,
          };
        }),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los planes');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const enrollmentIdFor = (planId: string): string | null => {
    const found = enrollments.find((e) => {
      const sp = e.studyPlan;
      const id = typeof sp === 'string' ? sp : sp?._id;
      return id === planId;
    });
    return found ? found._id : null;
  };

  const handleEnroll = async (planId: string) => {
    await studyPlansApi.enroll(planId);
    notifyEnrollmentsChanged();
    const mine = await studyPlansApi.getMine();
    setEnrollments(Array.isArray(mine) ? mine : []);
  };

  const handleRemove = async (planId: string) => {
    const entry = entries.find((e) => e.plan._id === planId);
    const name = entry?.plan.name ?? 'este plan';
    if (!window.confirm(
      `¿Quitar "${name}" de tus planes?\n\n` +
      'Si ya tiene materias registradas, tu avance queda guardado y podés volver a inscribirte cuando quieras.',
    )) return;

    setActionError(null);
    try {
      await studyPlansApi.remove(planId);
      notifyEnrollmentsChanged();
      if (careerId === planId) setCareerId(null);
      const mine = await studyPlansApi.getMine();
      const enrolls = Array.isArray(mine) ? mine : [];
      setEnrollments(enrolls);

      if (step === 'mine') {
        if (enrolls.length === 0) {
          setEntries([]);
          setSelectedUnit(null);
          setSelectedCareer(null);
          setStep('units');
        } else {
          await openMine(enrolls);
        }
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo quitar el plan');
    }
  };

  const handleOpen = (planId: string, path: string) => {
    setCareerId(planId);
    navigate(path === 'progreso' ? '/progreso' : `/${path}/${planId}`);
  };

  const filteredCareers = careers.filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Mis planes de estudio"
        sub="Elegí tu instituto, tu carrera y organizá tu recorrido académico."
      />

      {/* MIGAS */}

      <div className="home-tabs">
        {enrollments.length > 0 && (
          <Button
            size="sm"
            variant={step === 'mine' ? 'primary' : 'outline-primary'}
            onClick={() => { void openMine(enrollments); }}
          >
            Mis inscripciones ({enrollments.length})
          </Button>
        )}

        <Button
          size="sm"
          variant={step === 'units' ? 'primary' : 'outline-primary'}
          onClick={() => setStep('units')}
        >
          Institutos
        </Button>

        {selectedUnit && (
          <Button
            size="sm"
            variant={step === 'careers' ? 'primary' : 'outline-primary'}
            onClick={() => { void openUnit(selectedUnit); }}
          >
            {selectedUnit.name}
          </Button>
        )}

        {selectedCareer && step === 'plans' && (
          <Button size="sm" variant="primary" disabled>
            {selectedCareer.name}
          </Button>
        )}

        <span className="flex-grow-1" />

        {isAdmin && (
          <Button className="btn-gradify" onClick={() => navigate('/cargar')}>
            + Cargar nuevo plan
          </Button>
        )}
      </div>

      {loading && <PageLoader text="Cargando…" />}

      {!loading && error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {!loading && actionError && (
        <div className="alert alert-warning alert-dismissible d-flex align-items-start gap-2" role="alert">
          <span className="flex-grow-1">{actionError}</span>
          <button
            type="button"
            className="btn-close"
            aria-label="Cerrar"
            onClick={() => setActionError(null)}
          />
        </div>
      )}

      {/* PASO 1: INSTITUTOS */}

      {!loading && !error && step === 'units' && (
        units.length === 0 ? (
          <EmptyState
            icon={<IconCap size={46} />}
            title="Todavía no hay institutos"
            text="Volvé pronto."
          />
        ) : (
          <div className="career-grid">
            {units.map((unit) => (
              <article key={unit._id} className="career-card">
                <div
                  className="career-card__cover"
                  style={instituteSurface(unit.name, unit.color)}
                >
                  <span className="career-card__cover-icon"><IconCap /></span>
                  <span className="career-card__cover-title">{unit.name}</span>
                </div>

                <div className="career-card__body">
                  <div className="chips">
                    <span className="chip">
                      {(unit.careerCount ?? 0) === 1
                        ? '1 carrera'
                        : `${unit.careerCount ?? 0} carreras`}
                    </span>
                  </div>
                </div>

                <div className="career-card__actions d-flex flex-wrap gap-2">
                  <Button size="sm" variant="primary" onClick={() => { void openUnit(unit); }}>
                    Ver carreras
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )
      )}

      {/* PASO 2: CARRERAS */}

      {!loading && !error && step === 'careers' && selectedUnit && (
        <>
          <Form.Control
            className="mb-3"
            placeholder="Buscar carrera…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {filteredCareers.length === 0 ? (
            <EmptyState
              icon={<IconBoard size={46} />}
              title={search ? 'Sin resultados para esa búsqueda' : 'Este instituto todavía no tiene carreras con planes publicados'}
              text={search ? 'Probá con otro nombre.' : (isAdmin ? 'Cargá un plan para habilitar carreras acá.' : 'Volvé pronto.')}
            />
          ) : (
            <div className="career-grid">
              {filteredCareers.map((career) => (
                <article key={career._id} className="career-card">
                  <div
                    className="career-card__cover"
                    style={careerCoverSurface(career)}
                  >
                    <span className="career-card__cover-icon"><IconBoard /></span>
                    <span className="career-card__cover-title">{career.name}</span>
                  </div>

                  {((career.continuesIn ?? []).length > 0 ||
                    career.careerType === 'Tecnicatura') && (
                    <div className="career-card__body">
                      <div className="chips">
                        {career.careerType === 'Tecnicatura' && (
                          <span className="chip" title="Carrera de pregrado: otorga el título de técnico/a">
                            🎓 Tecnicatura
                          </span>
                        )}

                        {(career.continuesIn ?? []).length > 0 && (
                          <span className="chip" title="Articulación oficial: el trayecto continúa">
                            ➡️ Continúa en {(career.continuesIn ?? [])
                              .map((c) => (typeof c === 'string' ? c : c.name))
                              .join(' · ')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="career-card__actions d-flex flex-wrap gap-2">
                    <Button size="sm" variant="primary" onClick={() => { void openCareer(career); }}>
                      Ver planes
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {/* MIS INSCRIPCIONES */}

      {!loading && !error && step === 'mine' && (
        entries.length === 0 ? (
          <EmptyState
            icon={<IconCap size={46} />}
            title="Todavía no tenés un plan inscripto"
            text="Explorá los institutos y anotate en una carrera para empezar."
            action={
              <Button className="btn-gradify" onClick={() => setStep('units')}>
                Explorar institutos
              </Button>
            }
          />
        ) : (
          <div className="plan-list">
            {entries.map((entry) => (
              <EnrolledPlanCard
                key={entry.plan._id}
                entry={entry}
                careerName={planCareerName(entry.plan)}
                careerColor={planCareerColor(entry.plan)}
                onOpen={handleOpen}
                onRemove={handleRemove}
              />
            ))}

            <button type="button" className="plan-add" onClick={() => setStep('units')}>
              <span className="plan-add__plus" aria-hidden="true">+</span>
              <span className="plan-add__copy">
                <strong>Sumar otra carrera</strong>
                <span>Explorá los institutos y anotate en otro plan.</span>
              </span>
              <span className="plan-add__cta">Explorar institutos →</span>
            </button>
          </div>
        )
      )}

      {/* PASO 3: PLANES */}

      {!loading && !error && step === 'plans' && (
        entries.length === 0 ? (
          <EmptyState
            icon={<IconCap size={46} />}
            title="Todavía no hay planes disponibles"
            text={isAdmin ? 'Cargá un PDF, revisá las materias y guardá el plan para verlo acá.' : 'Todavía no hay planes publicados. Volvé pronto.'}
            action={
              isAdmin ? (
                <Button className="btn-gradify" onClick={() => navigate('/cargar')}>
                  Cargar mi primer plan
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="career-grid">
            {entries.map((entry) => (
              <PlanCard
                key={entry.plan._id}
                entry={entry}
                careerName={selectedCareer?.name ?? 'Carrera asociada'}
                career={selectedCareer}
                enrollmentId={enrollmentIdFor(entry.plan._id)}
                onEnroll={handleEnroll}
                onOpen={handleOpen}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}
