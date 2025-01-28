import { useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/LoginForm';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { GamesPage } from './pages/GamesPage';
import { EventsPage } from './pages/EventsPage';
import { ModulesPage } from './pages/ModulesPage';
import { ModuleDetailPage } from './pages/ModuleDetailPage';
import { CreateModulePage } from './pages/CreateModulePage';
import { SystemsPage } from './pages/SystemsPage';
import { useEffect } from 'react';

// Error boundary component for handling route errors
function RouteErrorBoundary() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Get the current path segments
    const segments = location.pathname.split('/').filter(Boolean);
    
    // Try to navigate up one level at a time until we find a valid route
    const tryNavigate = async (path: string) => {
      try {
        // Try to navigate to the path
        navigate(path, { replace: true });
      } catch {
        // If navigation fails and we're not at root, try going up one level
        if (path !== '/') {
          const parentPath = path.split('/').slice(0, -1).join('/') || '/';
          await tryNavigate(parentPath);
        }
      }
    };

    // Start with current path minus last segment
    if (segments.length > 0) {
      const initialPath = '/' + segments.slice(0, -1).join('/');
      tryNavigate(initialPath);
    } else {
      // If we're already at root level, just go to root
      navigate('/', { replace: true });
    }
  }, [location, navigate]);

  return null;
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/games" replace />} />
          <Route path="systems" element={<SystemsPage />} />
          <Route path="games" element={<GamesPage />} />
          <Route path="games/:gameId/events" element={<EventsPage />} />
          <Route path="games/:gameId/events/:eventId/modules" element={<ModulesPage />} />
          <Route path="games/:gameId/events/:eventId/modules/new" element={<CreateModulePage />} />
          <Route path="games/:gameId/events/:eventId/modules/:moduleId" element={<ModuleDetailPage />} />
          
          {/* Error boundary route that catches all unmatched paths */}
          <Route path="*" element={<RouteErrorBoundary />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;