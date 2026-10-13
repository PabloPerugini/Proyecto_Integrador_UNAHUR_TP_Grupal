import { useEffect, useState } from 'react';
import { Button, Table } from 'react-bootstrap';
import { careersApi } from '../api/careers';
import type { Career } from '../types';
import PageHeader from '../components/PageHeader';
import PageLoader from '../components/PageLoader';
import EmptyState from '../components/EmptyState';
import { IconBoard } from '../components/icons';

export default function AdminArchived() {
  const [careers, setCareers] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await careersApi.getAll(undefined, true);
      setCareers((Array.isArray(list) ? list : []).filter((c) => c.isArchived));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las archivadas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const unarchive = async (career: Career) => {
    setWorking(true);
    try {
      await careersApi.update(career._id, { isArchived: false });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo desarchivar');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <PageHeader title="Carreras archivadas" sub="Ocultas para los usuarios. Se pueden restaurar." />

      {loading && <PageLoader text="Cargando archivadas…" />}
      {error && !loading && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && careers.length === 0 && (
        <EmptyState
          icon={<IconBoard size={46} />}
          title="Sin archivadas"
          text="No hay carreras archivadas."
        />
      )}

      {!loading && !error && careers.length > 0 && (
        <Table responsive striped hover size="sm">
          <thead>
            <tr>
              <th>Carrera</th>
              <th className="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {careers.map((c) => (
              <tr key={c._id}>
                <td><strong>{c.name}</strong></td>
                <td className="text-end">
                  <Button
                    size="sm"
                    variant="outline-success"
                    disabled={working}
                    onClick={() => { void unarchive(c); }}
                  >
                    Restaurar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
