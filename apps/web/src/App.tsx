import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth, useAuth } from './auth/AuthContext';
import { AppHeader } from './components/AppHeader';
import { LibraryPage } from './pages/LibraryPage';
import { SharedTimelinePage } from './pages/SharedTimelinePage';
import { TimelineEditorPage } from './pages/TimelineEditorPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <p className="page spinner-text">Loading...</p>;
  return <Navigate to={user ? '/library' : '/login'} replace />;
}

export function App() {
  return (
    <>
      <AppHeader />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/library"
          element={
            <RequireAuth>
              <LibraryPage />
            </RequireAuth>
          }
        />
        <Route
          path="/timelines/new"
          element={
            <RequireAuth>
              <TimelineEditorPage />
            </RequireAuth>
          }
        />
        <Route
          path="/timelines/:id"
          element={
            <RequireAuth>
              <TimelineEditorPage />
            </RequireAuth>
          }
        />
        <Route path="/s/:token" element={<SharedTimelinePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
