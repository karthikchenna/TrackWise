import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function Header({ user }) {
  return (
    <header className="tw-header">
      <div>
        <Link to={user ? '/dashboard' : '/login'} className="tw-brand-link">
          <h1 className="tw-title">TrackWise</h1>
        </Link>
        <p className="tw-subtitle">Smart, simple expense tracking in your browser.</p>
      </div>
      {user && (
        <div className="tw-header-user">
          <span className="tw-user-email">{user.email}</span>
          <button
            className="tw-button tw-button--ghost"
            onClick={() => supabase.auth.signOut()}
          >
            Log out
          </button>
        </div>
      )}
    </header>
  );
}

export default Header;


