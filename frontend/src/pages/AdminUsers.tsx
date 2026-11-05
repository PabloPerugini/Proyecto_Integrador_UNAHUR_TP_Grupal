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
        <>
        <div className="admin-users__cards d-md-none">
          {users.map((u) => (
            <article className="admin-user-card" key={u._id} aria-label={u.nickName}>
              <div className="admin-user-card__header">
                <strong>{u.nickName}</strong>
                <span className={`admin-user-card__role${u.rol === 'ADMIN' ? ' admin-user-card__role--admin' : ''}`}>
                  {u.rol ?? 'USUARIO'}
                </span>
              </div>
              <dl className="admin-user-card__details">
                <dt>Correo electrónico</dt>
                <dd>{u.email}</dd>
              </dl>
              <div className="admin-user-card__actions">
                <Button
                  size="sm"
                  variant={u.rol === 'ADMIN' ? 'outline-secondary' : 'outline-primary'}
                  disabled={working}
                  onClick={() => { void changeRol(u.nickName, u.rol === 'ADMIN' ? 'USUARIO' : 'ADMIN'); }}
                >
                  {u.rol === 'ADMIN' ? 'Quitar admin' : 'Hacer admin'}
                </Button>
                <Button size="sm" variant="outline-danger" disabled={working} onClick={() => { void remove(u.nickName); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
                  </svg>
                  Eliminar
                </Button>
              </div>
            </article>
          ))}
        </div>
        <div className="admin-users-table d-none d-md-block">
        <Table responsive hover size="sm">
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
                <td><span className={`admin-user-card__role${u.rol === 'ADMIN' ? ' admin-user-card__role--admin' : ''}`}>{u.rol ?? 'USUARIO'}</span></td>
                <td className="text-end admin-users-table__actions">
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
        </div>
        </>
      )}
    </div>
  );
}
