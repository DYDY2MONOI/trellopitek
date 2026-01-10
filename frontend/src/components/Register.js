import { useState } from 'react';
import { setAuthToken, api } from '../services/api';
import './Auth.css';

export default function Register({ onRegister, onSwitchToLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.register(email, password);
      setAuthToken(response.token);
      onRegister?.(response.user, response.token);
    } catch (err) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-form__header">
        <div className="auth-form__logo">EP</div>
        <h2 className="auth-form__title">Create an account</h2>
        <p className="auth-form__subtitle">Get started with Epitrello today</p>
      </div>

      <div className="auth-form__body">
        {error && <div className="auth-form__general-error">{error}</div>}

        <div className="auth-form__field">
          <label className="auth-form__label" htmlFor="register-email">Email</label>
          <input
            id="register-email"
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
          <label className="auth-form__label" htmlFor="register-password">Password</label>
          <input
            id="register-password"
            type="password"
            className="auth-form__input"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        <div className="auth-form__field">
          <label className="auth-form__label" htmlFor="register-confirm">Confirm Password</label>
          <input
            id="register-confirm"
            type="password"
            className="auth-form__input"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        <button
          type="submit"
          className="auth-form__submit"
          disabled={loading}
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </div>

      <div className="auth-form__footer">
        <p>
          Already have an account?{' '}
          <button
            type="button"
            className="auth-form__link"
            onClick={onSwitchToLogin}
          >
            Sign in
          </button>
        </p>
      </div>
    </form>
  );
}
