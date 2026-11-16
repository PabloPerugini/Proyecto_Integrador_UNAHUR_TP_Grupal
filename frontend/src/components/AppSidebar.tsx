import { useEffect, useState } from 'react';
import Form from 'react-bootstrap/Form';
import { NavLink, useLocation, useMatch, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCareerSelection } from '../context/CareerContext';
import { studyPlansApi, careerName, type StudyPlan } from '../api/studyPlans';
import SidebarBase from './SidebarBase';
import type { NavItem } from './SidebarBase';
import {
  IconHome,
  IconChart,
  IconGraph,
  IconBoard,
  IconUpload,
  IconEdit,
  IconUsers,
  IconHelp,
} from './icons';

// Shell único por rol: mismas vistas base para todos,
// sección Administración solo si rol==='ADMIN'.
// Los guards de ruta (ProtectedRoute/AdminRoute) siguen separados.
export default function AppSidebar() {
  const { user } = useAuth();
  const isUsersRoute = useMatch('/admin/users/*') !== null;
  const isGraphRoute = useMatch('/grafo/*') !== null;
  const { careerId, setCareerId, enrollmentRevision } = useCareerSelection();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.rol === 'ADMIN';
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [planRequest, setPlanRequest] = useState(0);
  const planRoute = pathname.match(/^\/(grafo|tablero)(?:\/([^/]+))?\/?$/);
  const activePlanId = planRoute?.[2] ?? careerId ?? '';

  useEffect(() => {
    let active = true;
    setPlansLoading(true);
    setPlansError(null);
    studyPlansApi.getMine()
      .then(async enrollments => {
        const enrolledPlans = await Promise.all(enrollments.map(enrollment => {
          const plan = enrollment.studyPlan;
          return typeof plan === 'string' ? studyPlansApi.getById(plan) : plan;
        }));
        if (active) setPlans(enrolledPlans.filter((plan): plan is StudyPlan => plan !== null));
      })
      .catch(error => {
        if (active) setPlansError(error instanceof Error ? error.message : 'Error cargando planes de estudio');
      })
      .finally(() => { if (active) setPlansLoading(false); });
    return () => { active = false; };
  }, [enrollmentRevision, planRequest]);

  const selectPlan = (planId: string) => {
    if (!planId) return;
    setCareerId(planId);
    if (planRoute?.[1]) navigate(`/${planRoute[1]}/${planId}`);
  };
  const selectedOptionId = plans.some(plan => plan._id === activePlanId) ? activePlanId : '';

  const planSelector = (
    <div className="sidebar__plan-picker">
      <label>
        <span>Plan de estudios</span>
        <Form.Select
          aria-label="Plan de estudios para explorar"
          className="sidebar__plan-select"
          disabled={plansLoading || plansError !== null || plans.length === 0}
          onChange={event => selectPlan(event.target.value)}
          value={plansLoading ? activePlanId : selectedOptionId}
        >
          {plansLoading ? (
            <option value={activePlanId}>Cargando planes…</option>
          ) : (
            <>
              <option disabled value="">Elegí una carrera desde Inicio…</option>
              {plans.map(plan => (
                <option key={plan._id} value={plan._id}>{plan.name} — {careerName(plan)}</option>
              ))}
            </>
          )}
        </Form.Select>
      </label>
      {!plansLoading && plansError && (
        <div className="sidebar__plan-message" role="alert">
          <p>{plansError}</p>
          <button type="button" className="sidebar__plan-retry" onClick={() => setPlanRequest(request => request + 1)}>
            Reintentar
          </button>
        </div>
      )}
      {!plansLoading && !plansError && plans.length === 0 && (
        <p className="sidebar__plan-message" role="status">Elegí una carrera en Inicio para verla acá.</p>
      )}
    </div>
  );

  const exploreNav: NavItem[] = [
    { to: '/', label: 'Inicio', icon: <IconHome />, end: true },
    {
      to: activePlanId ? `/grafo/${activePlanId}` : '/grafo',
      label: 'Correlatividades',
      collapsedLabel: 'Mapa',
      icon: <IconGraph />,
    },
    {
      to: activePlanId ? `/tablero/${activePlanId}` : '/tablero',
      label: 'Tablero',
      icon: <IconBoard />,
    },
    {
      to: '/progreso',
      label: 'Mi progreso',
      collapsedLabel: 'Progreso',
      icon: <IconChart />,
    },
    { to: '/faq', label: 'Preguntas frecuentes', collapsedLabel: 'Ayuda', icon: <IconHelp /> },
  ];

  const adminNav: NavItem[] = [
    { to: '/cargar', label: 'Cargar plan', icon: <IconUpload /> },
    { to: '/admin', label: 'Editar plan', icon: <IconEdit />, end: isUsersRoute },
    { to: '/admin/users', label: 'Usuarios', icon: <IconUsers /> },
  ];

  const renderAdminLinks = (onClick?: () => void) =>
    adminNav.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        aria-label={item.label}
        onClick={onClick}
        className={({ isActive }) =>
          `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
        }
      >
        <span className="sidebar__link-icon">{item.icon}</span>
        <span className="sidebar__label sidebar__link-label" data-collapsed-label={item.label}>{item.label}</span>
      </NavLink>
    ));

  return (
    <SidebarBase
      nav={exploreNav}
      sectionLabel="Explorar"
      sectionContent={planSelector}
      brandTo="/"
      mobileTitle={isGraphRoute ? 'Mapa de correlatividades' : undefined}
    >
      {isAdmin && (
        <>
          <div className="sidebar__section mt-3">Administración</div>
          {renderAdminLinks()}
        </>
      )}

    </SidebarBase>
  );
}
