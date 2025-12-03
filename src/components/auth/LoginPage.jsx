import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;

      // On success, go to dashboard
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="tw-main tw-main--center">
      <div className="tw-card tw-card--auth">
        <div className="tw-card-header">
          <h2>Welcome back</h2>
          <p>Sign in to access your TrackWise dashboard.</p>
        </div>

        <form className="tw-form" onSubmit={handleSubmit}>
          <label className="tw-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label className="tw-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>

          {error && <div className="tw-alert tw-alert--error">{error}</div>}

          <button className="tw-button tw-button--primary" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Log in'}
          </button>
        </form>

        <div className="tw-auth-switch">
          <p>
            New to TrackWise?{' '}
            <Link className="tw-link-button" to="/signup">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default LoginPage;


