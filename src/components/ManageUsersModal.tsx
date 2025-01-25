import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users2 } from 'lucide-react';
import { getUserDisplayNames } from '../lib/users';
import type { GameUser } from '../lib/types';

interface ManageUsersModalProps {
  gameId: string;
  isOpen: boolean;
  onClose: () => void;
  role: 'admin' | 'writer';
  currentUsers: GameUser[];
  onUsersUpdated?: () => void; // New callback prop
}

export function ManageUsersModal({ 
  gameId, 
  isOpen, 
  onClose, 
  role,
  currentUsers,
  onUsersUpdated
}: ManageUsersModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; display_name: string }>>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    async function loadUsers() {
      try {
        setLoading(true);
        setError(null);

        // Get all users from auth
        const { data: users, error } = await supabase.rpc('get_user_metadata', {
          user_ids: [] // Empty array to get all users
        });

        if (error) throw error;

        setAllUsers(users);

        // Set initially selected users
        const initialSelected = currentUsers
          .filter(u => u.role === role)
          .map(u => u.user_id);
        setSelectedUsers(initialSelected);

      } catch (error) {
        console.error('Error loading users:', error);
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, [isOpen, role, currentUsers]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Get current users with this role
      const currentUsersWithRole = currentUsers
        .filter(u => u.role === role)
        .map(u => u.user_id);

      // Determine users to add and remove
      const usersToAdd = selectedUsers.filter(id => !currentUsersWithRole.includes(id));
      const usersToRemove = currentUsersWithRole.filter(id => !selectedUsers.includes(id));

      // Add new users
      if (usersToAdd.length > 0) {
        const { error: addError } = await supabase
          .from('game_users')
          .insert(
            usersToAdd.map(userId => ({
              game_id: gameId,
              user_id: userId,
              role: role
            }))
          );

        if (addError) throw addError;
      }

      // Remove users
      if (usersToRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('game_users')
          .delete()
          .eq('game_id', gameId)
          .eq('role', role)
          .in('user_id', usersToRemove);

        if (removeError) throw removeError;
      }

      // Call the callback to refresh the games list
      onUsersUpdated?.();
      onClose();
    } catch (error) {
      console.error('Error saving users:', error);
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-2xl">
        <div className="flex items-center space-x-4 mb-6">
          <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Users2 className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Manage {role === 'admin' ? 'Administrators' : 'Writers'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {role === 'admin' 
                ? 'Administrators have full control over the game, including managing other users and all game content.'
                : 'Writers can create and manage their own modules within events.'}
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

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <label className="text-sm font-medium text-gray-700">
                  Select Users
                </label>
              </div>
              <div className="p-2 max-h-96 overflow-y-auto">
                {allUsers.map(user => (
                  <label
                    key={user.id}
                    className="flex items-center p-2 hover:bg-gray-50 rounded-md cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers([...selectedUsers, user.id]);
                        } else {
                          setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                        }
                      }}
                    />
                    <span className="ml-3 text-sm text-gray-900">
                      {user.display_name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}