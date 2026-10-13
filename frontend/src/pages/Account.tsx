import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from 'react-bootstrap';
import { useAuth } from '../hooks/useAuth';
import { usersApi } from '../api/users';
import PageHeader from '../components/PageHeader';
import FormField from '../components/FormField';

export default function Account() {
  const { user, refresh } = useAuth();

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <div>
        <PageHeader title="Mi cuenta" sub="Tu perfil de Gradify." />
        <div className="alert alert-warning">Tenés que iniciar sesión.</div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!firstName.trim() || !lastName.trim()) {
      setError('Completá nombre y apellido.');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }

    setSaving(true);
    try {
      await usersApi.updateUser(user.nickName, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        ...(newPassword ? { password: newPassword } : {}),
      });
      await refresh();
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Datos actualizados correctamente.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Mi cuenta" sub="Tu perfil de Gradify." />

      <div className="auth-card" style={{ margin: 0 }}>
        <p className="small text-muted">
          NickName: <strong>{user.nickName}</strong>
          {' · '}Rol: <strong>{user.rol ?? 'USUARIO'}</strong>
        </p>

        {error && (
          <div className="alert alert-danger py-2 small" role="alert">
            {error}
          </div>
        )}

        {message && (
          <div className="alert alert-success py-2 small" role="alert">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <FormField
            label="Nombre"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={saving}
          />
          <FormField
            label="Apellido"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={saving}
          />
          <FormField
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={saving}
          />
          <FormField
            label="Nueva contraseña (opcional)"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 6 caracteres"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={saving}
          />
          <FormField
            label="Repetí la nueva contraseña"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={saving}
          />
          <Button type="submit" className="btn-gradify w-100" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </form>
      </div>
    </div>
  );
}
