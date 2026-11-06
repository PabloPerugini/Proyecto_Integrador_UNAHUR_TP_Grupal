import { NavLink, useMatch, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useCareerSelection } from '../context/CareerContext';
import ThemeToggle from './ThemeToggle';
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
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isUsersRoute = useMatch('/admin/users/*') !== null;
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
    <SidebarBase nav={exploreNav} sectionLabel="Explorar" brandTo="/">
      {isAdmin && (
        <>
          <div className="sidebar__section mt-3">Administración</div>
          {renderAdminLinks()}
        </>
      )}

      <div className="sidebar__link sidebar__theme" style={{ cursor: 'default' }}>
        <span className="sidebar__theme-content">
          <ThemeToggle />
          <span className="sidebar__label sidebar__link-label">Modo {theme === 'dark' ? 'oscuro' : 'claro'}</span>
        </span>
      </div>
      <div className="sidebar__section mt-3">{user?.nickName || 'Estudiante'}</div>
      <NavLink
        to="/cuenta"
        aria-label="Mi cuenta"
        className={({ isActive }) =>
          `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
        }
      >
        <span className="sidebar__link-icon"><IconUsers /></span>
        <span className="sidebar__label sidebar__link-label" data-collapsed-label="Cuenta">Mi cuenta</span>
      </NavLink>
      <button
        type="button"
        aria-label="Cerrar sesión"
        className="sidebar__link sidebar__logout border-0 bg-transparent text-start"
        onClick={() => { logout(); navigate('/login'); }}
      >
        <span className="sidebar__link-icon">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 4H4v16h5M9 12h12m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="sidebar__label sidebar__link-label sidebar__logout-label">Cerrar sesión</span>
      </button>
    </SidebarBase>
  );
}
