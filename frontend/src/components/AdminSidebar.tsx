import SidebarBase from './SidebarBase';
import type { NavItem } from './SidebarBase';
import { IconUpload, IconEdit } from './icons';

const nav: NavItem[] = [
  { to: '/cargar', label: 'Cargar plan', icon: <IconUpload /> },
  { to: '/admin', label: 'Editar plan', icon: <IconEdit /> },
];

export default function AdminSidebar() {
  return <SidebarBase nav={nav} sectionLabel="Administración" brandTo="/admin" />;
}
