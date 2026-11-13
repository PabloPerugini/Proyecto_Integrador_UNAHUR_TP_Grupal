import { NavLink, useMatch } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCareerSelection } from '../context/CareerContext';
import SidebarBase from './SidebarBase';
import StudyPlanSidebarSelector from './StudyPlanSidebarSelector';
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
  const { careerId } = useCareerSelection();
  const isAdmin = user?.rol === 'ADMIN';

  const exploreNav: NavItem[] = [
    { to: '/', label: 'Inicio', icon: <IconHome />, end: true },
    {
      to: careerId ? `/grafo/${careerId}` : '/grafo',
      label: 'Correlatividades',
      collapsedLabel: 'Mapa',
      icon: <IconGraph />,
    },
    {
      to: careerId ? `/tablero/${careerId}` : '/tablero',
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
    <SidebarBase nav={exploreNav} sectionLabel="Explorar" brandTo="/" mobileTitle={isGraphRoute ? 'Mapa de correlatividades' : undefined} topContent={<StudyPlanSidebarSelector />}>
      {isAdmin && (
        <>
          <div className="sidebar__section mt-3">Administración</div>
          {renderAdminLinks()}
        </>
      )}

    </SidebarBase>
  );
}
