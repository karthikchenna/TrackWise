import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import logo from '../assets/Logo.png';

function Header({ user }) {
  return (
    <header className="tw-header">
      <div>
        <Link to={user ? '/dashboard' : '/login'} className="tw-brand-link">
          <div className="tw-brand">
            <div className="tw-logo-wrap" aria-hidden="true">
              <img className="tw-logo" src={logo} alt="" />
            </div>
            <div className="tw-brand-text">
              <h1 className="tw-title">TrackWise</h1>
              <p className="tw-subtitle">Smart, simple expense tracking in your browser.</p>
            </div>
          </div>
        </Link>
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


