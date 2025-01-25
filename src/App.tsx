import { useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/LoginForm';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { GamesPage } from './pages/GamesPage';
import { EventsPage } from './pages/EventsPage';
import { ModulesPage } from './pages/ModulesPage';
import { ModuleDetailPage } from './pages/ModuleDetailPage';
import { CreateModulePage } from './pages/CreateModulePage';
import { SystemsPage } from './pages/SystemsPage';

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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;