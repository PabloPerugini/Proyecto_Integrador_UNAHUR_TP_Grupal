import { useEffect, useState } from 'react';
import { Button, Table } from 'react-bootstrap';
import { usersApi } from '../api/users';
import type { User } from '../types';
import PageHeader from '../components/PageHeader';
import PageLoader from '../components/PageLoader';

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await usersApi.getAll();
      setUsers(Array.isArray(list) ? list : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const changeRol = async (nickName: string, rol: 'ADMIN' | 'USUARIO') => {
    setWorking(true);
    try {
      await usersApi.updateUser(nickName, { rol });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el rol');
    } finally {
      setWorking(false);
    }
  };

  const remove = async (nickName: string) => {
    if (!window.confirm(`¿Eliminar al usuario ${nickName}?`)) return;
    setWorking(true);
    try {
      await usersApi.deleteUser(nickName);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <PageHeader title="Usuarios" sub="Roles y cuentas registradas." />

      {loading && <PageLoader text="Cargando usuarios…" />}
      {error && !loading && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && (
        <Table responsive striped hover size="sm">
          <thead>
            <tr>
              <th>NickName</th>
              <th>Email</th>
              <th>Rol</th>
              <th className="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td><strong>{u.nickName}</strong></td>
                <td>{u.email}</td>
                <td>{u.rol ?? 'USUARIO'}</td>
                <td className="text-end">
                  {(u.rol ?? 'USUARIO') === 'USUARIO' ? (
                    <Button
                      size="sm"
                      variant="outline-primary"
                      disabled={working}
                      onClick={() => { void changeRol(u.nickName, 'ADMIN'); }}
                    >
                      Hacer admin
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      disabled={working}
                      onClick={() => { void changeRol(u.nickName, 'USUARIO'); }}
                    >
                      Quitar admin
                    </Button>
                  )}{' '}
                  <Button
                    size="sm"
                    variant="outline-danger"
                    disabled={working}
                    onClick={() => { void remove(u.nickName); }}
                  >
                    Eliminar
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
