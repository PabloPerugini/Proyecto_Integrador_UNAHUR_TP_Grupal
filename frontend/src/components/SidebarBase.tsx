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

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <NavLink to={brandTo} className="sidebar__brand">
          <GradifyMark />
          Gradify
        </NavLink>

        <nav className="sidebar__nav">
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
