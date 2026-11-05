import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Offcanvas } from 'react-bootstrap';
import ThemeToggle from './ThemeToggle';
import GradifyLogo from './GradifyLogo';
import { IconMenu } from './icons';
import type { ReactNode } from 'react';

export interface NavItem {
  to: string;
  label: string;
  collapsedLabel?: string;
  icon: ReactNode;
  end?: boolean;
}

interface SidebarBaseProps {
  nav: NavItem[];
  sectionLabel: string;
  brandTo: string;
  children?: ReactNode;
}

function GradifyMark() {
  return <GradifyLogo className="sidebar__brand-logo" />;
}

export default function SidebarBase({ nav, sectionLabel, brandTo, children }: SidebarBaseProps) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('gradify-sidebar-collapsed') === 'true'; }
    catch { return false; }
  });

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem('gradify-sidebar-collapsed', String(next)); }
    catch { /* La preferencia funciona aunque el almacenamiento no esté disponible. */ }
  };

  const renderLinks = (onClick?: () => void) =>
    nav.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        aria-label={item.label}
        onClick={onClick}
        className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}
      >
        <span className="sidebar__link-icon">{item.icon}</span>
        <span className="sidebar__label sidebar__link-label" data-collapsed-label={item.collapsedLabel ?? item.label}>{item.label}</span>
      </NavLink>
    ));

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
        <div className="sidebar__header">
        <button
          type="button"
          className="sidebar__collapse"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
          title={collapsed ? 'Expandir menú' : 'Contraer menú'}
          aria-expanded={!collapsed}
          aria-controls="desktop-navigation"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
            <path d="M9 4v16" stroke="currentColor" strokeWidth="1.8" />
            <path d={collapsed ? 'm13 9 3 3-3 3' : 'm16 9-3 3 3 3'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <NavLink to={brandTo} className="sidebar__brand">
          <GradifyMark />
          <span className="sidebar__label">Gradify</span>
        </NavLink>
        </div>

        <nav className="sidebar__nav" id="desktop-navigation" aria-label="Navegación principal">
          <div className="sidebar__section">{sectionLabel}</div>
          {renderLinks()}
          {children}
        </nav>
      </aside>

      {/* Mobile top bar + offcanvas */}
      <div className="m-topbar">
        <button type="button" className="m-topbar__burger" aria-label="Abrir menú" onClick={() => setOpen(true)}>
          <IconMenu />
        </button>
        <NavLink to={brandTo} className="m-topbar__brand">
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
            <NavLink to={brandTo} className="sidebar__brand m-0 p-0" onClick={() => setOpen(false)}>
              <GradifyMark />
              Gradify
            </NavLink>
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex flex-column">
          <nav className="sidebar__nav">
            <div className="sidebar__section">{sectionLabel}</div>
            {renderLinks(() => setOpen(false))}
            {children}
          </nav>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}
