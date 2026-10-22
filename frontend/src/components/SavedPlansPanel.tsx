import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Dropdown, Form, Pagination, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { studyPlansApi, careerName, type StudyPlan } from '../api/studyPlans';
import { useFlashMessage } from '../hooks/useFlashMessage';
import MessageBanner from './MessageBanner';

const PAGE_SIZE = 10;

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function universityName(plan: StudyPlan): string {
  const career = plan.career;
  if (!career || typeof career === 'string') return '';
  const university = career.university;
  if (!university || typeof university === 'string') return '';
  return university.name ?? '';
}

export default function SavedPlansPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const navigate = useNavigate();
  const { msg, flash, flashFromError, clear } = useFlashMessage();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    try {
      const data = await studyPlansApi.getAll();
      setPlans(data);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando planes');
    }
  }, []);

  useEffect(() => {
    let active = true;
    studyPlansApi.getAll().then(p => { if (active) { setPlans(p); setError(''); } }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Error cargando planes'); });
    return () => { active = false; };
  }, [refreshKey]);

  useEffect(() => { setPage(1); }, [search]);

  // Búsqueda en vivo por plan, carrera o universidad.
  const filtered = useMemo(() => {
    const q = normalize(search);
    if (!q) return plans;
    return plans.filter((plan) =>
      normalize([plan.name, careerName(plan), universityName(plan)].join(' ')).includes(q),
    );
  }, [plans, search]);

  // Borrado definitivo del plan: la API elimina en cascada materias,
  // progreso de los inscriptos e importaciones del PDF.
  const handleDelete = async (plan: StudyPlan) => {
    if (deletingId) return;
    const confirmed = window.confirm(
      `¿Eliminar definitivamente "${plan.name}"?\n\n` +
      'Se borran también sus materias, el progreso registrado de los estudiantes ' +
      'y la importación del PDF. Esta acción NO es reversible.',
    );
    if (!confirmed) return;

    setDeletingId(plan._id);
    try {
      const result = await studyPlansApi.deletePlan(plan._id);
      const r = result.removed;
      flash(
        'success',
        `Plan "${plan.name}" eliminado: ${r.subjects} materia(s), ` +
        `${r.enrollments} inscripción(es), ${r.progress} registro(s) de progreso ` +
        `y ${r.imports} importación(es).`,
      );
      await loadPlans();
    } catch (err) {
      // 409: el backend protege planes con inscriptos ajenos.
      flashFromError(err, 'No se pudo eliminar el plan.');
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return <Card className="mb-4">
    <MessageBanner message={msg} onClose={clear} />
    <Card.Header className="d-flex flex-wrap justify-content-between align-items-center gap-2">
      <strong>Planes de estudio guardados</strong>
      <Form.Control
        size="sm"
        type="search"
        style={{ maxWidth: 320 }}
        placeholder="Buscar por plan, carrera o universidad…"
        aria-label="Buscar planes de estudio"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
    </Card.Header>
    <Card.Body>
      {error && <div className="alert alert-warning">{error}</div>}
      {!plans.length && !error && <p className="text-muted mb-0">Todavía no hay planes guardados.</p>}
      {plans.length > 0 && filtered.length === 0 && <p className="text-muted mb-0">Sin resultados para esa búsqueda.</p>}
      {visible.length > 0 && <>
        <Table size="sm" striped hover responsive>
          <thead><tr><th>Plan</th><th>Carrera</th><th>Estado</th><th className="text-end">Acciones</th></tr></thead>
          <tbody>{visible.map(p => <tr key={p._id}>
            <td>{p.name}</td><td>{careerName(p)}</td><td><span className={`badge text-bg-${p.status === 'published' ? 'success' : 'secondary'}`}>{p.status === 'published' ? 'Publicado' : 'Borrador'}</span></td>
            <td className="text-end">
              <Button size="sm" variant="outline-primary" onClick={() => navigate(`/admin/${p._id}`)}>Editar</Button>{' '}
              <Dropdown align="end" className="d-inline-block">
                <Dropdown.Toggle size="sm" variant="outline-secondary" id={`plan-more-${p._id}`} aria-label={`Más acciones para ${p.name}`} disabled={deletingId === p._id}>⋮</Dropdown.Toggle>
                <Dropdown.Menu popperConfig={{ strategy: 'fixed' }}>
                  <Dropdown.Item onClick={() => navigate(`/grafo/${p._id}`)}>Ver grafo</Dropdown.Item>
                  <Dropdown.Item onClick={() => navigate(`/tablero/${p._id}`)}>Ir al tablero</Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item
                    className="text-danger"
                    disabled={Boolean(deletingId)}
                    onClick={() => { void handleDelete(p); }}
                  >
                    {deletingId === p._id ? 'Eliminando…' : 'Eliminar plan…'}
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </td>
          </tr>)}</tbody>
        </Table>

        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <span className="text-muted small">
            {filtered.length} plan(es){search ? ` de ${plans.length}` : ''} · página {current} de {totalPages}
          </span>
          {totalPages > 1 && (
            <Pagination size="sm" className="mb-0">
              <Pagination.Prev disabled={current === 1} onClick={() => setPage(current - 1)} />
              {Array.from({ length: totalPages }, (_, index) => index + 1).map(n => (
                <Pagination.Item key={n} active={n === current} onClick={() => setPage(n)}>{n}</Pagination.Item>
              ))}
              <Pagination.Next disabled={current === totalPages} onClick={() => setPage(current + 1)} />
            </Pagination>
          )}
        </div>
      </>}
    </Card.Body>
  </Card>;
}
