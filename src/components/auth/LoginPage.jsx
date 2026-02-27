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
      <div className="tw-card tw-card--auth flex flex-col gap-4">
        <div className="tw-card-header">
          <h2 className="text-xl font-semibold text-slate-900">Welcome back</h2>
          <p className="text-sm text-slate-600">Sign in to access your TrackWise dashboard.</p>
        </div>

        <form className="tw-form space-y-2" onSubmit={handleSubmit}>
          <label className="tw-field">
            <span className="text-xs font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="tw-field-input mt-1 w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </label>

          <label className="tw-field">
            <span className="text-xs font-medium text-slate-700">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="tw-field-input mt-1 w-full rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </label>

          {error && (
            <div className="tw-alert tw-alert--error text-xs font-medium">
              {error}
            </div>
          )}

          <button
            className="tw-button tw-button--primary mt-1 w-full justify-center text-sm font-semibold"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Log in'}
          </button>
        </form>

        <div className="tw-auth-switch text-center text-xs text-slate-600">
          <p>
            New to TrackWise?{' '}
            <Link className="tw-link-button text-sky-700 hover:text-sky-900" to="/signup">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default LoginPage;


