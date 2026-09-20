import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiService } from '../api';
import { useAuth } from '../hooks/useAuth';
import GradifyLogo from '../components/GradifyLogo';
import FormField from '../components/FormField';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [nickName, setNickName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (nickName.trim().length < 3) {
      return 'El nickname debe tener al menos 3 caracteres.';
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      return 'Ingresá un correo electrónico válido.';
    }
    if (password.length < 4) {
      return 'La contraseña debe tener al menos 4 caracteres.';
    }
    if (password !== confirmPassword) {
      return 'Las contraseñas no coinciden.';
    }
    return '';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await apiService.createUser({
        nickName: nickName.trim(),
        email: email.trim(),
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
          onChange={(e) => setNickName(e.target.value)}
          disabled={disabled}
        />
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={disabled}
        />
        <FormField
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 4 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={disabled}
        />
        <FormField
          label="Repetí la contraseña"
          type="password"
          autoComplete="new-password"
          placeholder="Confirmá tu contraseña"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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