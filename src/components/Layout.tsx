import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, TowerControl as GameController, Box } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getUserDisplayNames } from '../lib/users';

export function Layout() {
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    async function loadDisplayName() {
      if (!user) return;
      
      const displayNames = await getUserDisplayNames([user.id]);
      setDisplayName(displayNames[user.id] || user.email);
    }

    loadDisplayName();
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <span className="text-xl font-semibold text-gray-800">Game Manager</span>
              <div className="hidden md:flex space-x-4">
                <NavLink
                  to="/systems"
                  className={({ isActive }) =>
                    `inline-flex items-center px-3 py-2 text-sm font-medium ${
                      isActive
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
                    }`
                  }
                >
                  <Box className="h-4 w-4 mr-2" />
                  Systems
                </NavLink>
                <NavLink
                  to="/games"
                  className={({ isActive }) =>
                    `inline-flex items-center px-3 py-2 text-sm font-medium ${
                      isActive
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
                    }`
                  }
                >
                  <GameController className="h-4 w-4 mr-2" />
                  Games
                </NavLink>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{displayName}</span>
              <button
                onClick={() => signOut()}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
    </div>
  );
}