import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import GradifyLogo from '../components/GradifyLogo';
import FormField from '../components/FormField';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [nickName, setNickName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = nickName.trim();
    if (!trimmed || !password) {
      setError('Completá tu nickName y tu contraseña');
      return;
    }
    setError('');
    try {
      await login(trimmed, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-card__brand">
        <GradifyLogo className="auth-card__logo" />
        Gradify
      </div>
      <p className="auth-card__sub">Seguí tu progreso académico de forma visual.</p>

      <h2 className="fs-4 fw-bold text-center mb-3">Iniciar sesión</h2>

      {error && (
        <div className="alert alert-danger py-2 small" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <FormField
          label="NickName"
          autoComplete="username"
          placeholder="Tu nickName"
          value={nickName}
          onChange={(e) => setNickName(e.target.value)}
        />
        <FormField
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          placeholder="Tu contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="btn btn-gradify w-100">
          Ingresar
        </button>
      </form>

      <div className="text-center mt-3 small">
        ¿No tenés cuenta todavía?{' '}
        <Link to="/register" className="fw-bold">
          Registrate acá
        </Link>
      </div>
    </div>
  );
}