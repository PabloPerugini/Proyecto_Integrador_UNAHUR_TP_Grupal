import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Offcanvas } from 'react-bootstrap';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useCareerSelection } from '../context/CareerContext';
import ThemeToggle from './ThemeToggle';
import GradifyLogo from './GradifyLogo';
import {
  IconHome,
  IconUpload,
  IconEdit,
  IconChart,
  IconGraph,
  IconBoard,
  IconLogout,
  IconMenu,
} from './icons';
import type { ReactNode } from 'react';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

function GradifyMark() {
  return <GradifyLogo className="sidebar__brand-logo" />;
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const { careerId } = useCareerSelection();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const nav: NavItem[] = [
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
    {
      to: '/cargar',
      label: 'Cargar plan',
      icon: <IconUpload />,
    },
    {
      to: '/admin',
      label: 'Editar plan',
      icon: <IconEdit />,
    },
  ];

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/login');
  };

  const initial = (user?.nickName ?? '?').charAt(0).toUpperCase();

  const renderLinks = (onClick?: () => void) =>
    nav.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={onClick}
        className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}
      >
        <span className="sidebar__link-icon">{item.icon}</span>
        {item.label}
      </NavLink>
    ));

  const renderUser = (onClick?: () => void) => (
    <>
      <div className="sidebar__user">
        <span className="sidebar__avatar">{initial}</span>
        <span className="sidebar__user-name">{user?.nickName}</span>
      </div>
      <button
        type="button"
        className="sidebar__logout"
        title="Cerrar sesión"
        aria-label="Cerrar sesión"
        onClick={onClick}
      >
        <IconLogout />
      </button>
    </>
  );

  const renderPrefs = () => (
    <>
      <div className="sidebar__section mt-3">Preferencias</div>
      <div className="sidebar__link" style={{ cursor: 'default' }}>
        <span className="sidebar__link-icon" />
        <span className="d-flex align-items-center">
          Modo {theme === 'dark' ? 'oscuro' : 'claro'} <ThemeToggle />
        </span>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <NavLink to="/" className="sidebar__brand">
          <GradifyMark />
          Gradify
        </NavLink>

        <nav className="sidebar__nav">
          <div className="sidebar__section">Explorar</div>
          {renderLinks()}
          {renderPrefs()}
        </nav>

        <div className="sidebar__foot">
          {renderUser(handleLogout)}
        </div>
      </aside>

      {/* Mobile top bar + offcanvas */}
      <div className="m-topbar">
        <button type="button" className="m-topbar__burger" aria-label="Abrir menú" onClick={() => setOpen(true)}>
          <IconMenu />
        </button>
        <NavLink to="/" className="m-topbar__brand">
          <GradifyMark />
          Gradify
        </NavLink>
        <span className="ms-auto">
          <ThemeToggle />
        </span>
      </div>

      <Offcanvas show={open} onHide={() => setOpen(false)} placement="start" scroll={false} backdrop>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>
            <NavLink to="/" className="sidebar__brand m-0 p-0" onClick={() => setOpen(false)}>
              <GradifyMark />
              Gradify
            </NavLink>
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex flex-column">
          <nav className="sidebar__nav">
            <div className="sidebar__section">Explorar</div>
            {renderLinks(() => setOpen(false))}
            {renderPrefs()}
          </nav>
          <div className="sidebar__foot">
            {renderUser(handleLogout)}
          </div>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}