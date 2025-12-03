import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password) {
      setError('Please fill in name, email and password.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) throw signUpError;

      const user = data?.user;
      if (user) {
        const { error: profileError } = await supabase.from('profiles').insert([
          {
            id: user.id,
            name,
          },
        ]);
        if (profileError) {
          // Not fatal for signup – log to console and continue
          /* eslint-disable no-console */
          console.error('Failed to create profile', profileError);
          /* eslint-enable no-console */
        }
      }

      // After successful signup, redirect to login page
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message || 'Something went wrong while creating your account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="tw-main tw-main--center">
      <div className="tw-card tw-card--auth">
        <div className="tw-card-header">
          <h2>Create your account</h2>
          <p>Sign up to start tracking your income and expenses.</p>
        </div>

        <form className="tw-form" onSubmit={handleSubmit}>
          <label className="tw-field">
            <span>Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
          </label>

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
              autoComplete="new-password"
            />
          </label>

          {error && <div className="tw-alert tw-alert--error">{error}</div>}

          <button className="tw-button tw-button--primary" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <div className="tw-auth-switch">
          <p>
            Already have an account?{' '}
            <Link className="tw-link-button" to="/login">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default SignupPage;


