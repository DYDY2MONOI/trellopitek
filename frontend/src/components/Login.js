import { useState } from 'react';
import { setAuthToken, api } from '../services/api';
import './Auth.css';

export default function Login({ onLogin, onSwitchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.login(email, password);
      setAuthToken(response.token);
      onLogin?.(response.user, response.token);
    } catch (err) {
      setError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-form__header">
        <div className="auth-form__logo">EP</div>
        <h2 className="auth-form__title">Welcome back</h2>
        <p className="auth-form__subtitle">Sign in to your Epitrello account</p>
      </div>

      <div className="auth-form__body">
        {error && <div className="auth-form__general-error">{error}</div>}

        <div className="auth-form__field">
          <label className="auth-form__label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            className="auth-form__input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div className="auth-form__field">
          <label className="auth-form__label" htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            className="auth-form__input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <button
          type="submit"
          className="auth-form__submit"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </div>

      <div className="auth-form__footer">
        <p>
          Don't have an account?{' '}
          <button
            type="button"
            className="auth-form__link"
            onClick={onSwitchToRegister}
          >
            Sign up
          </button>
        </p>
      </div>
    </form>
  );
}
