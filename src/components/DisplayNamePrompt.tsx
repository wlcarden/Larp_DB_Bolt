import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserCircle } from 'lucide-react';

interface DisplayNamePromptProps {
  gameId: string;
  onComplete: () => void;
}

export function DisplayNamePrompt({ gameId, onComplete }: DisplayNamePromptProps) {
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    try {
      setSaving(true);
      setError(null);

      // First, add the user as a writer to the game
      const { error: userError } = await supabase
        .from('game_users')
        .insert({
          game_id: gameId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          role: 'writer'
        });

      if (userError) throw userError;

      // Then set their display name
      const { error: displayNameError } = await supabase
        .from('user_display_names')
        .insert({
          game_id: gameId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          display_name: displayName.trim()
        });

      if (displayNameError) throw displayNameError;

      onComplete();
    } catch (error) {
      console.error('Error saving display name:', error);
      setError('Failed to save display name');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
            <UserCircle className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Set Your Display Name
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Choose a display name that will be shown to other users in this game.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="display_name" className="block text-sm font-medium text-gray-700">
              Display Name
            </label>
            <input
              type="text"
              id="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Enter your display name"
              required
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || !displayName.trim()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Display Name'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}