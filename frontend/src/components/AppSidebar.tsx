import { NavLink, useNavigate } from 'react-router-dom';
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
} from './icons';

// Shell único por rol: mismas vistas base para todos,
// sección Administración solo si rol==='ADMIN'.
// Los guards de ruta (ProtectedRoute/AdminRoute) siguen separados.
export default function AppSidebar() {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { careerId } = useCareerSelection();
  const isAdmin = user?.rol === 'ADMIN';

  const exploreNav: NavItem[] = [
    { to: '/', label: 'Inicio', icon: <IconHome />, end: true },
    {
      to: careerId ? `/grafo/${careerId}` : '/grafo',
      label: 'Correlatividades',
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
      icon: <IconChart />,
    },
  ];

  const adminNav: NavItem[] = [
    { to: '/cargar', label: 'Cargar plan', icon: <IconUpload /> },
    { to: '/admin', label: 'Editar plan', icon: <IconEdit /> },
    { to: '/admin/users', label: 'Usuarios', icon: <IconUsers /> },
    { to: '/admin/archivadas', label: 'Archivadas', icon: <IconBoard /> },
  ];

  const renderAdminLinks = (onClick?: () => void) =>
    adminNav.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={onClick}
        className={({ isActive }) =>
          `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
        }
      >
        <span className="sidebar__link-icon">{item.icon}</span>
        {item.label}
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

      <div className="sidebar__section mt-3">Preferencias</div>
      <div className="sidebar__link" style={{ cursor: 'default' }}>
        <span className="sidebar__link-icon" />
        <span className="d-flex align-items-center">
          Modo {theme === 'dark' ? 'oscuro' : 'claro'} <ThemeToggle />
        </span>
      </div>
      <div className="sidebar__section mt-3">{user?.nickName || 'Estudiante'}</div>
      <NavLink
        to="/cuenta"
        className={({ isActive }) =>
          `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
        }
      >
        Mi cuenta
      </NavLink>
      <button
        type="button"
        className="sidebar__link border-0 bg-transparent text-start"
        onClick={() => { logout(); navigate('/login'); }}
      >
        Cerrar sesión
      </button>
    </SidebarBase>
  );
}
