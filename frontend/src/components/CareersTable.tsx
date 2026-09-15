import type { ReactNode } from 'react';
import { Table } from 'react-bootstrap';
import type { Career } from '../types';
import { getCareerColor } from '../utils/careerColor';
import ColorDot from './ColorDot';

interface CareersTableProps {
  careers: Career[];
  selectedId?: string | null;
  onSelect?: (career: Career) => void;
  actions?: (career: Career) => ReactNode;
  emptyText?: ReactNode;
}

export default function CareersTable({ careers, selectedId, onSelect, actions, emptyText }: CareersTableProps) {
  if (careers.length === 0) {
    return emptyText ? <>{emptyText}</> : <p className="text-muted mb-0">Todavía no hay planes cargados.</p>;
  }
  return (
    <Table size="sm" striped hover responsive>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Instituto</th>
          <th>Materias</th>
          <th>Estado</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {careers.map((c) => (
          <tr
            key={c._id}
            className={c._id === selectedId ? 'table-primary' : ''}
            style={{ cursor: onSelect ? 'pointer' : 'default', borderLeft: `4px solid ${getCareerColor(c)}` }}
            onClick={onSelect ? () => onSelect(c) : undefined}
          >
            <td>
              <ColorDot color={getCareerColor(c)} className="me-2" />
              {c.name}
            </td>
            <td className="text-muted small">{c.institute || '—'}</td>
            <td>{c.subjectCount ?? 0}</td>
            <td>
              <span className={`badge text-bg-${c.status === 'published' ? 'success' : 'secondary'}`}>{c.status}</span>
            </td>
            <td onClick={(e) => e.stopPropagation()} className="text-end">
              {actions ? actions(c) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}