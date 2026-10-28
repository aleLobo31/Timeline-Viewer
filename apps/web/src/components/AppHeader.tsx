import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useLogout } from '../auth/AuthContext';

export function AppHeader() {
  const { user } = useAuth();
  const logout = useLogout();
  const navigate = useNavigate();

  return (
    <header className="app-header">
      {user ? (
        <Link to="/library" className="brand">
          Timeline Viewer
        </Link>
      ) : (
        <span className="brand">Timeline Viewer</span>
      )}
      {user && (
        <div className="header-actions">
          <span className="header-user">{user.name}</span>
          <button
            className="btn btn-ghost"
            onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/login') })}
          >
            Log out
          </button>
        </div>
      )}
    </header>
  );
}
