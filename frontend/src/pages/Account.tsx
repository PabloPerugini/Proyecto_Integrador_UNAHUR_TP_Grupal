import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from 'react-bootstrap';
import { useAuth } from '../hooks/useAuth';
import { usersApi } from '../api/users';
import PageHeader from '../components/PageHeader';
import FormField from '../components/FormField';
import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validateEmail,
  validateName,
  validatePassword,
  validatePasswordConfirmation,
} from '../utils/userValidation';

type FieldName = 'firstName' | 'lastName' | 'email' | 'newPassword' | 'confirmPassword';
type FieldErrors = Record<FieldName, string>;

const emptyErrors = (): FieldErrors => ({
  firstName: '',
  lastName: '',
  email: '',
  newPassword: '',
  confirmPassword: '',
});

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(emptyErrors);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setEmail(user.email);
  }, [user]);

  const validateField = (field: FieldName, value: string, values = { firstName, lastName, email, newPassword, confirmPassword }) => {
    switch (field) {
      case 'firstName':
        return validateName(value, 'nombre');
      case 'lastName':
        return validateName(value, 'apellido');
      case 'email':
        return validateEmail(value);
      case 'newPassword':
        return validatePassword(value, true).replace('La contraseña', 'La nueva contraseña');
      case 'confirmPassword':
        if (!values.newPassword && !value) return '';
        return validatePasswordConfirmation(values.newPassword, value)
          .replace('Repetí la contraseña', 'Repetí la nueva contraseña')
          .replace('Las contraseñas no coinciden', 'Las contraseñas nuevas no coinciden');
    }
  };

  const validateAll = () => {
    const values = { firstName, lastName, email, newPassword, confirmPassword };
    const nextErrors = emptyErrors();
    (Object.keys(nextErrors) as FieldName[]).forEach((field) => {
      nextErrors[field] = validateField(field, values[field], values);
    });
    setFieldErrors(nextErrors);
    setTouched({ firstName: true, lastName: true, email: true, newPassword: true, confirmPassword: true });
    return nextErrors;
  };

  const handleFieldBlur = (field: FieldName, value: string) => {
    const values = { firstName, lastName, email, newPassword, confirmPassword };
    setTouched((current) => ({ ...current, [field]: true }));
    setFieldErrors((current) => ({ ...current, [field]: validateField(field, value, values) }));
  };

  const handleFieldChange = (field: FieldName, value: string, setter: (nextValue: string) => void) => {
    setter(value);
    if (touched[field]) {
      const values = { firstName, lastName, email, newPassword, confirmPassword, [field]: value };
      setFieldErrors((current) => ({ ...current, [field]: validateField(field, value, values) }));
      if (field === 'newPassword' && touched.confirmPassword) {
        setFieldErrors((current) => ({ ...current, confirmPassword: validateField('confirmPassword', confirmPassword, values) }));
      }
    }
  };

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

    const validationErrors = validateAll();
    if (Object.values(validationErrors).some(Boolean)) {
      return;
    }

    setSaving(true);
    try {
      await usersApi.updateUser(user.nickName, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        ...(newPassword ? { password: newPassword } : {}),
      });
      await refresh();
      setNewPassword('');
      setConfirmPassword('');
      setFieldErrors(emptyErrors());
      setTouched({});
      setMessage('Datos actualizados correctamente.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar.');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = user && (
    firstName.trim() !== user.firstName ||
    lastName.trim() !== user.lastName ||
    email.trim().toLowerCase() !== user.email.toLowerCase() ||
    newPassword.length > 0
  );

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
            maxLength={NAME_MAX_LENGTH}
            minLength={NAME_MIN_LENGTH}
            required
            isInvalid={Boolean(touched.firstName && fieldErrors.firstName)}
            error={touched.firstName ? fieldErrors.firstName : ''}
            onBlur={(e) => handleFieldBlur('firstName', e.target.value)}
            onChange={(e) => handleFieldChange('firstName', e.target.value, setFirstName)}
            disabled={saving}
          />
          <FormField
            label="Apellido"
            autoComplete="family-name"
            value={lastName}
            maxLength={NAME_MAX_LENGTH}
            minLength={NAME_MIN_LENGTH}
            required
            isInvalid={Boolean(touched.lastName && fieldErrors.lastName)}
            error={touched.lastName ? fieldErrors.lastName : ''}
            onBlur={(e) => handleFieldBlur('lastName', e.target.value)}
            onChange={(e) => handleFieldChange('lastName', e.target.value, setLastName)}
            disabled={saving}
          />
          <FormField
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            maxLength={EMAIL_MAX_LENGTH}
            required
            isInvalid={Boolean(touched.email && fieldErrors.email)}
            error={touched.email ? fieldErrors.email : ''}
            onBlur={(e) => handleFieldBlur('email', e.target.value)}
            onChange={(e) => handleFieldChange('email', e.target.value, setEmail)}
            disabled={saving}
          />
          <FormField
            label="Nueva contraseña (opcional)"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 6 caracteres"
            value={newPassword}
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            isInvalid={Boolean(touched.newPassword && fieldErrors.newPassword)}
            error={touched.newPassword ? fieldErrors.newPassword : ''}
            onBlur={(e) => handleFieldBlur('newPassword', e.target.value)}
            onChange={(e) => handleFieldChange('newPassword', e.target.value, setNewPassword)}
            disabled={saving}
          />
          <FormField
            label="Repetí la nueva contraseña"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            isInvalid={Boolean(touched.confirmPassword && fieldErrors.confirmPassword)}
            error={touched.confirmPassword ? fieldErrors.confirmPassword : ''}
            onBlur={(e) => handleFieldBlur('confirmPassword', e.target.value)}
            onChange={(e) => handleFieldChange('confirmPassword', e.target.value, setConfirmPassword)}
            disabled={saving}
          />
          <Button type="submit" className="btn-gradify w-100" disabled={saving || !hasChanges}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </form>
      </div>
    </div>
  );
}
