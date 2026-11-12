import { useEffect, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { careerName, studyPlansApi, type StudyPlan } from '../api/studyPlans';
import { useCareerSelection } from '../context/CareerContext';
import { useAuth } from '../hooks/useAuth';

export default function StudyPlanSidebarSelector() {
  const { careerId, setCareerId } = useCareerSelection();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [subjectCount, setSubjectCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    studyPlansApi.getAll()
      .then((items) => { if (active) setPlans(items); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'No se pudieron cargar los planes.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const selected = plans.find((plan) => plan._id === careerId);
    if (!selected) { setSubjectCount(null); return; }
    studyPlansApi.getSubjects(selected._id)
      .then((subjects) => { if (active) setSubjectCount(subjects.length); })
      .catch(() => { if (active) setSubjectCount(null); });
    return () => { active = false; };
  }, [careerId, plans]);

  useEffect(() => {
    if (!plans.length) {
      if (careerId) setCareerId(null);
      return;
    }
    if (!plans.some((plan) => plan._id === careerId)) setCareerId(plans[0]._id);
  }, [plans, careerId, setCareerId]);

  const selectPlan = (id: string) => {
    if (!id) return;
    setCareerId(id);
    setOpen(false);
    if (location.pathname.startsWith('/admin')) navigate(`/admin/${id}`);
    else if (location.pathname.startsWith('/grafo')) navigate(`/grafo/${id}`);
    else if (location.pathname.startsWith('/tablero')) navigate(`/tablero/${id}`);
  };

  return (
    <div className="sidebar-plan-picker">
      <div className="sidebar-plan-picker__label">Plan de estudios</div>
      {loading ? (
        <div className="sidebar-plan-picker__status"><Spinner size="sm" animation="border" /> Cargando planes</div>
      ) : error ? (
        <div className="sidebar-plan-picker__status sidebar-plan-picker__status--error" title={error}>Error al cargar planes</div>
      ) : plans.length ? (
        <>
          <div
            className="sidebar-plan-picker__select-wrap"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
            }}
            onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}
          >
            <button
              type="button"
              className="sidebar-plan-picker__trigger"
              aria-label={`Plan seleccionado: ${plans.find((plan) => plan._id === careerId)?.name ?? 'Seleccionar plan'}`}
              aria-haspopup="listbox"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              {(() => {
                const selected = plans.find((plan) => plan._id === careerId) ?? plans[0];
                return <span className="sidebar-plan-picker__value" title={`${careerName(selected)} — ${selected.name}`}>
                  <span className="sidebar-plan-picker__career">{careerName(selected)}</span>
                  <span className="sidebar-plan-picker__plan">{selected.name}</span>
                </span>;
              })()}
              <svg className={`sidebar-plan-picker__chevron${open ? ' sidebar-plan-picker__chevron--open' : ''}`} viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            {open && <div className="sidebar-plan-picker__options" role="listbox" aria-label="Planes de estudio">
              {plans.map((plan) => <button
                key={plan._id}
                type="button"
                role="option"
                aria-selected={plan._id === careerId}
                className={`sidebar-plan-picker__option${plan._id === careerId ? ' sidebar-plan-picker__option--selected' : ''}`}
                title={`${careerName(plan)} — ${plan.name}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectPlan(plan._id)}
              >
                <span className="sidebar-plan-picker__career">{careerName(plan)}</span>
                <span className="sidebar-plan-picker__plan">{plan.name}</span>
              </button>)}
            </div>}
          </div>
          <div className="sidebar-plan-picker__count">{subjectCount === null ? ' ' : `${subjectCount} ${subjectCount === 1 ? 'materia' : 'materias'}`}</div>
        </>
      ) : (
        <div className="sidebar-plan-picker__empty">
          <span>No hay planes</span>
          {user?.rol === 'ADMIN' && <button type="button" onClick={() => navigate('/cargar')}>Cargar plan</button>}
        </div>
      )}
    </div>
  );
}
