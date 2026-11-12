import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AccountMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || user.nickName.slice(0, 1).toUpperCase();

  return (
    <div className="account-menu">
      <button
        type="button"
        className={`account-menu__trigger${open ? ' account-menu__trigger--open' : ''}`}
        aria-label="Abrir menú de cuenta"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        onBlur={(event) => {
          if (!event.currentTarget.parentElement?.contains(event.relatedTarget as Node | null)) setOpen(false);
        }}
      >
        <span className="account-menu__avatar" aria-hidden="true">{initials}</span>
        <svg className="account-menu__chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <div className="account-menu__popover" role="menu" aria-label="Menú de cuenta">
          <NavLink to="/cuenta" role="menuitem" className={({ isActive }) => `account-menu__item${isActive ? ' account-menu__item--active' : ''}`} onClick={() => setOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" /><path d="M5 20a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            Mi cuenta
          </NavLink>
          <div className="account-menu__divider" />
          <button type="button" role="menuitem" className="account-menu__item account-menu__item--logout" onClick={() => { setOpen(false); logout(); navigate('/login'); }}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10 4H5v16h5m-1-8h11m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
