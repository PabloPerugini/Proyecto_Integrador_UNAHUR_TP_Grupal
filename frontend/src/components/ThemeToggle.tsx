import { useTheme } from '../hooks/useTheme';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'}
      title={dark ? 'Modo claro' : 'Modo oscuro'}
    >
      <span className={`theme-toggle__track ${dark ? 'theme-toggle__track--dark' : ''}`}>
        <svg className="theme-toggle__icon theme-toggle__icon--sun" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/>
          <line x1="12" y1="2"  x2="12" y2="5"  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="2"  y1="12" x2="5"  y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="19" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="4.22"  y1="4.22"  x2="6.34"  y2="6.34"  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="4.22"  y1="19.78" x2="6.34"  y2="17.66" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="17.66" y1="6.34"  x2="19.78" y2="4.22"  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <svg className="theme-toggle__icon theme-toggle__icon--moon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className={`theme-toggle__thumb ${dark ? 'theme-toggle__thumb--dark' : ''}`} />
      </span>
    </button>
  );
}