import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiService } from '../api';
import { useAuth } from '../hooks/useAuth';
import GradifyLogo from '../components/GradifyLogo';
import FormField from '../components/FormField';
import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  NICKNAME_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  validateEmail,
  validateName,
  validateNickname,
  validatePassword,
  validatePasswordConfirmation,
} from '../utils/userValidation';

type FieldName = 'nickName' | 'firstName' | 'lastName' | 'email' | 'password' | 'confirmPassword';
type FieldErrors = Record<FieldName, string>;

const emptyErrors = (): FieldErrors => ({
  nickName: '',
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
});

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [nickName, setNickName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(emptyErrors);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});

  const validateField = (field: FieldName, value: string, values = { nickName, firstName, lastName, email, password, confirmPassword }) => {
    switch (field) {
      case 'nickName': return validateNickname(value);
      case 'firstName': return validateName(value, 'nombre');
      case 'lastName': return validateName(value, 'apellido');
      case 'email': return validateEmail(value);
      case 'password': return validatePassword(value);
      case 'confirmPassword': return validatePasswordConfirmation(values.password, value);
    }
  };

  const validateAll = () => {
    const values = { nickName, firstName, lastName, email, password, confirmPassword };
    const nextErrors = emptyErrors();
    (Object.keys(nextErrors) as FieldName[]).forEach((field) => {
      nextErrors[field] = validateField(field, values[field], values);
    });
    setFieldErrors(nextErrors);
    setTouched({ nickName: true, firstName: true, lastName: true, email: true, password: true, confirmPassword: true });
    return nextErrors;
  };

  const handleFieldBlur = (field: FieldName, value: string) => {
    const values = { nickName, firstName, lastName, email, password, confirmPassword };
    setTouched((current) => ({ ...current, [field]: true }));
    setFieldErrors((current) => ({ ...current, [field]: validateField(field, value, values) }));
  };

  const handleFieldChange = (field: FieldName, value: string, setter: (nextValue: string) => void) => {
    setter(value);
    if (touched[field]) {
      const values = { nickName, firstName, lastName, email, password, confirmPassword, [field]: value };
      setFieldErrors((current) => ({ ...current, [field]: validateField(field, value, values) }));
      if (field === 'password' && touched.confirmPassword) {
        setFieldErrors((current) => ({ ...current, confirmPassword: validateField('confirmPassword', confirmPassword, values) }));
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const validationErrors = validateAll();
    if (Object.values(validationErrors).some(Boolean)) {
      return;
    }

    setLoading(true);
    try {
      await apiService.createUser({
        nickName: nickName.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      await login(nickName.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el usuario.');
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading;

  return (
    <div className="auth-card">
      <div className="auth-card__brand">
        <GradifyLogo className="auth-card__logo" />
        Gradify
      </div>
      <p className="auth-card__sub">Creá tu cuenta y armá tu plan de estudio.</p>

      <h2 className="fs-4 fw-bold text-center mb-3">Crear cuenta</h2>

      {error && (
        <div className="alert alert-danger py-2 small" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <FormField
          label="NickName"
          autoComplete="username"
          placeholder="Elegí tu nickName"
          value={nickName}
          minLength={NICKNAME_MIN_LENGTH}
          required
          isInvalid={Boolean(touched.nickName && fieldErrors.nickName)}
          error={touched.nickName ? fieldErrors.nickName : ''}
          onBlur={(e) => handleFieldBlur('nickName', e.target.value)}
          onChange={(e) => handleFieldChange('nickName', e.target.value, setNickName)}
          disabled={disabled}
        />
        <FormField
          label="Nombre"
          autoComplete="given-name"
          placeholder="Tu nombre"
          value={firstName}
          minLength={NAME_MIN_LENGTH}
          maxLength={NAME_MAX_LENGTH}
          required
          isInvalid={Boolean(touched.firstName && fieldErrors.firstName)}
          error={touched.firstName ? fieldErrors.firstName : ''}
          onBlur={(e) => handleFieldBlur('firstName', e.target.value)}
          onChange={(e) => handleFieldChange('firstName', e.target.value, setFirstName)}
          disabled={disabled}
        />
        <FormField
          label="Apellido"
          autoComplete="family-name"
          placeholder="Tu apellido"
          value={lastName}
          minLength={NAME_MIN_LENGTH}
          maxLength={NAME_MAX_LENGTH}
          required
          isInvalid={Boolean(touched.lastName && fieldErrors.lastName)}
          error={touched.lastName ? fieldErrors.lastName : ''}
          onBlur={(e) => handleFieldBlur('lastName', e.target.value)}
          onChange={(e) => handleFieldChange('lastName', e.target.value, setLastName)}
          disabled={disabled}
        />
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          value={email}
          maxLength={EMAIL_MAX_LENGTH}
          required
          isInvalid={Boolean(touched.email && fieldErrors.email)}
          error={touched.email ? fieldErrors.email : ''}
          onBlur={(e) => handleFieldBlur('email', e.target.value)}
          onChange={(e) => handleFieldChange('email', e.target.value, setEmail)}
          disabled={disabled}
        />
        <FormField
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 6 caracteres"
          value={password}
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          required
          isInvalid={Boolean(touched.password && fieldErrors.password)}
          error={touched.password ? fieldErrors.password : ''}
          onBlur={(e) => handleFieldBlur('password', e.target.value)}
          onChange={(e) => handleFieldChange('password', e.target.value, setPassword)}
          disabled={disabled}
        />
        <FormField
          label="Repetí la contraseña"
          type="password"
          autoComplete="new-password"
          placeholder="Confirmá tu contraseña"
          value={confirmPassword}
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          required
          isInvalid={Boolean(touched.confirmPassword && fieldErrors.confirmPassword)}
          error={touched.confirmPassword ? fieldErrors.confirmPassword : ''}
          onBlur={(e) => handleFieldBlur('confirmPassword', e.target.value)}
          onChange={(e) => handleFieldChange('confirmPassword', e.target.value, setConfirmPassword)}
          disabled={disabled}
        />
        <button type="submit" className="btn btn-gradify w-100" disabled={disabled}>
          {loading ? 'Creando cuenta...' : 'Registrarme'}
        </button>
      </form>

      <div className="text-center mt-3 small">
        ¿Ya tenés cuenta?{' '}
        <Link to="/login" className="fw-bold">
          Iniciá sesión acá
        </Link>
      </div>
    </div>
  );
}