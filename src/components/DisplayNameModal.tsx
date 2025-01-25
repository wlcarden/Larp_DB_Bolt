import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserCircle } from 'lucide-react';

interface DisplayNameModalProps {
  gameId: string;
  onComplete: () => void;
  onCancel: () => void;
}

export function DisplayNameModal({ gameId, onComplete, onCancel }: DisplayNameModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing display name when modal opens
  useEffect(() => {
    async function loadDisplayName() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('user_display_names')
          .select('display_name')
          .eq('game_id', gameId)
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
          throw error;
        }

        if (data) {
          setDisplayName(data.display_name);
        }
      } catch (error) {
        console.error('Error loading display name:', error);
      }
    }

    loadDisplayName();
  }, [gameId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    try {
      setSaving(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Use upsert operation with on_conflict clause
      const { error: upsertError } = await supabase
        .from('user_display_names')
        .upsert(
          {
            game_id: gameId,
            user_id: user.id,
            display_name: displayName.trim()
          },
          {
            onConflict: 'user_id,game_id',
            ignoreDuplicates: false
          }
        );

      if (upsertError) throw upsertError;

      onComplete();
    } catch (error) {
      console.error('Error saving display name:', error);
      setError('Failed to save display name');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md">
        <div className="flex items-center space-x-4 mb-6">
          <div className="h-12 w-12 bg-parchment-300 rounded-lg flex items-center justify-center">
            <UserCircle className="h-6 w-6 text-ink" />
          </div>
          <div>
            <h2 className="text-xl font-script text-ink">
              Set Display Name
            </h2>
            <p className="mt-1 text-sm font-medieval text-ink-light">
              Choose a display name that will be shown to other users in this game.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-100 border border-red-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medieval text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="display_name" className="block text-sm font-medieval font-medium text-ink">
              Display Name
            </label>
            <input
              type="text"
              id="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 block w-full rounded-md border-parchment-300 shadow-sm focus:border-ink focus:ring-ink text-ink font-medieval"
              placeholder="Enter your display name"
              required
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !displayName.trim()}
              className="btn btn-primary"
            >
              {saving ? 'Saving...' : 'Save Display Name'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}