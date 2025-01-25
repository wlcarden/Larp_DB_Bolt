import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Box, Flag, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getUserDisplayNames } from '../lib/users';
import { DisplayNameModal } from './DisplayNameModal';

export function Layout() {
  const { user, signOut, currentGameId } = useAuth();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [showDisplayNameModal, setShowDisplayNameModal] = useState(false);

  useEffect(() => {
    async function loadDisplayName() {
      if (!user) return;
      
      const displayNames = await getUserDisplayNames([user.id]);
      setDisplayName(displayNames[user.id] || user.email);
    }

    loadDisplayName();
  }, [user]);

  const handleDisplayNameUpdate = () => {
    if (user) {
      getUserDisplayNames([user.id]).then(names => {
        setDisplayName(names[user.id] || user.email);
      });
    }
  };

  return (
    <div className="min-h-screen bg-parchment-texture bg-cover bg-fixed">
      <nav className="bg-parchment-100/90 backdrop-blur-sm shadow-parchment border-b border-parchment-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <span className="text-2xl font-script text-ink">LARP Nexus</span>
              <div className="hidden md:flex space-x-4">
                <NavLink
                  to="/systems"
                  className={({ isActive }) =>
                    `inline-flex items-center px-3 py-2 text-sm font-medieval ${
                      isActive
                        ? 'text-ink border-b-2 border-ink'
                        : 'text-ink-light hover:text-ink hover:border-b-2 hover:border-parchment-400'
                    }`
                  }
                >
                  <Box className="h-4 w-4 mr-2" />
                  Systems
                </NavLink>
                <NavLink
                  to="/games"
                  className={({ isActive }) =>
                    `inline-flex items-center px-3 py-2 text-sm font-medieval ${
                      isActive
                        ? 'text-ink border-b-2 border-ink'
                        : 'text-ink-light hover:text-ink hover:border-b-2 hover:border-parchment-400'
                    }`
                  }
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Games
                </NavLink>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowDisplayNameModal(true)}
                className="inline-flex items-center text-sm font-medieval text-ink-light hover:text-ink transition-colors duration-200"
              >
                <User className="h-4 w-4 mr-2" />
                {displayName}
              </button>
              <button
                onClick={() => signOut()}
                className="inline-flex items-center px-3 py-2 border border-parchment-300 text-sm font-medieval rounded-md text-ink bg-parchment-50 hover:bg-parchment-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ink"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      {showDisplayNameModal && currentGameId && (
        <DisplayNameModal
          gameId={currentGameId}
          onComplete={() => {
            setShowDisplayNameModal(false);
            handleDisplayNameUpdate();
          }}
          onCancel={() => setShowDisplayNameModal(false)}
        />
      )}
    </div>
  );
}