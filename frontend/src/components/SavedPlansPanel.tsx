import { useEffect, useState } from 'react';
import { Button, Card, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { studyPlansApi, careerName, type StudyPlan } from '../api/studyPlans';

export default function SavedPlansPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    studyPlansApi.getAll().then(p => { if (active) { setPlans(p); setError(''); } }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Error cargando planes'); });
    return () => { active = false; };
  }, [refreshKey]);
  return <Card className="mb-4"><Card.Header><strong>Planes de estudio guardados</strong></Card.Header><Card.Body>
    {error && <div className="alert alert-warning">{error}</div>}
    {!plans.length && !error && <p className="text-muted mb-0">Todavía no hay planes guardados.</p>}
    {plans.length > 0 && <Table size="sm" striped hover responsive><thead><tr><th>Plan</th><th>Carrera</th><th>Estado</th><th></th></tr></thead><tbody>{plans.map(p => <tr key={p._id}>
      <td>{p.name}</td><td>{careerName(p)}</td><td><span className={`badge text-bg-${p.status === 'published' ? 'success' : 'secondary'}`}>{p.status === 'published' ? 'Publicado' : 'Borrador'}</span></td>
      <td className="text-end"><Button size="sm" variant="outline-primary" onClick={() => navigate(`/admin/${p._id}`)}>Editar</Button>{' '}
        <Button size="sm" variant="outline-secondary" onClick={() => navigate(`/grafo/${p._id}`)}>Grafo</Button>{' '}
        <Button size="sm" variant="outline-secondary" onClick={() => navigate(`/tablero/${p._id}`)}>Tablero</Button></td>
    </tr>)}</tbody></Table>}
  </Card.Body></Card>;
}
