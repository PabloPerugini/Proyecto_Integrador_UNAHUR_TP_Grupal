import { useMemo } from 'react';
import type { SubjectStatus } from '../types';
import { STATUS_LABEL } from '../utils/status';
import { tintStatusSvg } from '../utils/graphHighlight';
import aprobadaIcon from '../assets/subject-status/aprobada.svg?raw';
import regularIcon from '../assets/subject-status/regular.svg?raw';
import cursandoIcon from '../assets/subject-status/cursando.svg?raw';
import bloqueadaIcon from '../assets/subject-status/bloqueada.svg?raw';
import disponibleIcon from '../assets/subject-status/disponible.svg?raw';
import './SubjectStatusIcon.css';

const STATUS_ICONS: Record<SubjectStatus, string> = {
  Aprobada: aprobadaIcon,
  Regular: regularIcon,
  Cursando: cursandoIcon,
  Disponible: disponibleIcon,
  Bloqueada: bloqueadaIcon,
};

const STATUS_ICON_COLORS: Record<SubjectStatus, string> = {
  Aprobada: 'var(--map-status-approved-icon)',
  Regular: 'var(--map-status-regular-icon)',
  Cursando: 'var(--map-status-in-progress-icon)',
  Disponible: 'var(--map-status-available-icon)',
  Bloqueada: 'var(--map-status-locked-icon)',
};

interface SubjectStatusIconProps {
  status: SubjectStatus;
  className?: string;
  highlightColor?: string;
  showTooltip?: boolean;
}

export default function SubjectStatusIcon({ status, className, highlightColor, showTooltip = true }: SubjectStatusIconProps) {
  const label = STATUS_LABEL[status] ?? STATUS_LABEL.Bloqueada;
  const svg = STATUS_ICONS[status] ?? STATUS_ICONS.Bloqueada;
  // Solo se inserta SVG de los archivos locales importados, nunca contenido del usuario.
  // currentColor permite cambiar la paleta con CSS; quitar los IDs evita duplicarlos.
  const icon = useMemo(() => tintStatusSvg(svg, 'currentColor')
    .replace(/\s+id\s*=\s*(["']).*?\1/gi, ''), [svg]);

  return (
    <span
      className={`subject-status-icon${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={label}
      title={showTooltip ? label : undefined}
      style={{ color: highlightColor ?? STATUS_ICON_COLORS[status] ?? STATUS_ICON_COLORS.Bloqueada }}
      draggable={false}
      dangerouslySetInnerHTML={{ __html: icon }}
    />
  );
}
