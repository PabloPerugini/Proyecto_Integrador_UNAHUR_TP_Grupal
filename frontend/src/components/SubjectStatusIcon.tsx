import { useMemo } from 'react';
import type { SubjectStatus } from '../types';
import { STATUS_LABEL } from '../utils/status';
import { tintStatusSvg } from '../utils/graphHighlight';
import aprobadaIcon from '../assets/subject-status/aprobada.svg?raw';
import regularIcon from '../assets/subject-status/regular.svg?raw';
import cursandoIcon from '../assets/subject-status/cursando.svg?raw';
import bloqueadaIcon from '../assets/subject-status/bloqueada.svg?raw';
import disponibleIcon from '../assets/subject-status/disponible.svg?raw';

const STATUS_ICONS: Record<SubjectStatus, string> = {
  Aprobada: aprobadaIcon,
  Regular: regularIcon,
  Cursando: cursandoIcon,
  Disponible: disponibleIcon,
  Bloqueada: bloqueadaIcon,
};

interface SubjectStatusIconProps {
  status: SubjectStatus;
  className?: string;
  highlightColor?: string;
}

export default function SubjectStatusIcon({ status, className, highlightColor }: SubjectStatusIconProps) {
  const label = STATUS_LABEL[status] ?? STATUS_LABEL.Bloqueada;
  const svg = STATUS_ICONS[status] ?? STATUS_ICONS.Bloqueada;
  const icon = useMemo(() => `data:image/svg+xml,${encodeURIComponent(
    highlightColor ? tintStatusSvg(svg, highlightColor) : svg,
  )}`, [svg, highlightColor]);

  return (
    <img
      className={className}
      src={icon}
      alt={label}
      title={label}
      width={24}
      height={24}
      draggable={false}
    />
  );
}
