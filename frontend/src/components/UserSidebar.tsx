import { useTheme } from '../hooks/useTheme';
import { useCareerSelection } from '../context/CareerContext';
import ThemeToggle from './ThemeToggle';
import SidebarBase from './SidebarBase';
import type { NavItem } from './SidebarBase';
import { IconHome, IconChart, IconGraph, IconBoard } from './icons';

export default function UserSidebar() {
  const { theme } = useTheme();
  const { careerId } = useCareerSelection();

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
  ];

  return (
    <SidebarBase nav={nav} sectionLabel="Explorar" brandTo="/">
      <div className="sidebar__section mt-3">Preferencias</div>
      <div className="sidebar__link" style={{ cursor: 'default' }}>
        <span className="sidebar__link-icon" />
        <span className="d-flex align-items-center">
          Modo {theme === 'dark' ? 'oscuro' : 'claro'} <ThemeToggle />
        </span>
      </div>
    </SidebarBase>
  );
}
