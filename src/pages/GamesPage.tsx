import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Game, System, GameUser } from '../lib/types';
import { Plus, Edit2, Trash2, Users2, UserPlus, X } from 'lucide-react';
import { ManageUsersModal } from '../components/ManageUsersModal';
import { getUserDisplayNames } from '../lib/users';

export function GamesPage() {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [systems, setSystems] = useState<Record<string, System>>({});
  const [gameUsers, setGameUsers] = useState<GameUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAppAdmin, setIsAppAdmin] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableSystems, setAvailableSystems] = useState<System[]>([]);
  const [userDisplayNames, setUserDisplayNames] = useState<Record<string, string>>({});
  const [managingUsers, setManagingUsers] = useState<{
    gameId: string;
    role: 'admin' | 'writer';
  } | null>(null);
  const [moduleProperties, setModuleProperties] = useState<Array<{
    name: string;
    displayName: string;
    variableType: 'shortString' | 'longString' | 'number' | 'dateTime';
  }>>([]); // New state for module properties

  const loadGameData = async () => {
    try {
      // Get current user's ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if user is an app admin
      const { data: adminData, error: adminError } = await supabase
        .from('app_admins')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (adminError && adminError.code !== 'PGRST116') {
        throw adminError;
      }

      setIsAppAdmin(!!adminData);

      // Load systems
      const { data: systemsData, error: systemsError } = await supabase
        .from('systems')
        .select('*')
        .order('name');
      
      if (systemsError) throw systemsError;
      setAvailableSystems(systemsData || []);
      setSystems(Object.fromEntries(systemsData.map(s => [s.id, s])));
      
      // Load games and game users
      const [gamesResult, usersResult] = await Promise.all([
        supabase.from('games').select('*').order('name'),
        supabase.from('game_users').select('*')
      ]);
      
      if (gamesResult.error) throw gamesResult.error;
      if (usersResult.error) throw usersResult.error;

      setGames(gamesResult.data || []);
      setGameUsers(usersResult.data || []);

      // Load user display names
      const userIds = [...new Set(usersResult.data.map(u => u.user_id))];
      const displayNames = await getUserDisplayNames(userIds);
      setUserDisplayNames(displayNames);
    } catch (error) {
      console.error('Error loading games:', error);
      setError('Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGameData();
  }, []);

  useEffect(() => {
    // Initialize module properties when editing a game
    if (editingGame) {
      setModuleProperties(editingGame.module_properties);
    } else {
      setModuleProperties([]); // Reset when creating a new game
    }
  }, [editingGame]);

  const handleSaveGame = async (formData: FormData) => {
    try {
      setError(null);

      const gameData = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        system_id: formData.get('system_id') as string,
        module_properties: moduleProperties
      };

      if (editingGame) {
        const { error } = await supabase
          .from('games')
          .update(gameData)
          .eq('id', editingGame.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('games')
          .insert(gameData)
          .select()
          .single();
        
        if (error) throw error;

        // Add current user as game admin
        const { error: userError } = await supabase
          .from('game_users')
          .insert({
            game_id: data.id,
            user_id: (await supabase.auth.getUser()).data.user?.id,
            role: 'admin'
          });
        
        if (userError) throw userError;
      }

      await loadGameData(); // Refresh all data
      setShowModal(false);
      setEditingGame(null);
      setModuleProperties([]); // Reset module properties
    } catch (error) {
      console.error('Error saving game:', error);
      setError('Failed to save game');
    }
  };

  const handleDeleteGame = async (id: string) => {
    if (!confirm('Are you sure you want to delete this game? This action cannot be undone.')) return;

    try {
      setError(null);
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setGames(games.filter(g => g.id !== id));
    } catch (error) {
      console.error('Error deleting game:', error);
      setError('Failed to delete game');
    }
  };

  const handleAddProperty = () => {
    setModuleProperties([
      ...moduleProperties,
      {
        name: '',
        displayName: '',
        variableType: 'shortString'
      }
    ]);
  };

  const handleUpdateProperty = (index: number, field: string, value: string) => {
    const updatedProperties = [...moduleProperties];
    updatedProperties[index] = {
      ...updatedProperties[index],
      [field]: field === 'name' ? value.replace(/\s+/g, '_').toLowerCase() : value
    };
    setModuleProperties(updatedProperties);
  };

  const handleRemoveProperty = (index: number) => {
    setModuleProperties(moduleProperties.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="breadcrumb">
        <span className="breadcrumb-current">Games</span>
      </div>

      <div className="card">
        <div className="card-header card-header-with-button">
          <div>
            <h3 className="card-title">Games List</h3>
            <p className="card-description">
              Manage your games and their configurations
            </p>
          </div>
          {isAppAdmin && (
            <button
              onClick={() => {
                setEditingGame(null);
                setShowModal(true);
              }}
              className="btn btn-primary btn-with-icon"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Game
            </button>
          )}
        </div>
        <ul className="list">
          {games.map((game) => {
            const admins = gameUsers.filter(u => u.game_id === game.id && u.role === 'admin');
            const writers = gameUsers.filter(u => u.game_id === game.id && u.role === 'writer');
            const system = systems[game.system_id];

            return (
              <li key={game.id} className="list-item">
                <div className="list-item-content">
                  <div className="list-item-main">
                    <div className="list-item-title">
                      <h3 className="list-item-heading">
                        {game.name}
                      </h3>
                      <span className="list-item-badge">
                        {system?.name}
                      </span>
                    </div>
                    <p className="list-item-description">
                      {game.description}
                    </p>
                    <div className="list-item-meta">
                      <div className="list-item-meta-text">
                        <Users2 className="h-4 w-4 mr-1" />
                        {admins.length} admin{admins.length !== 1 ? 's' : ''}, {writers.length} writer{writers.length !== 1 ? 's' : ''}
                      </div>
                      <div className="list-item-meta-text">
                        {game.module_properties.length} module propert{game.module_properties.length !== 1 ? 'ies' : 'y'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    {isAppAdmin && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setManagingUsers({ gameId: game.id, role: 'admin' })}
                          className="btn-icon"
                          title="Manage administrators"
                        >
                          <Users2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setManagingUsers({ gameId: game.id, role: 'writer' })}
                          className="btn-icon"
                          title="Manage writers"
                        >
                          <UserPlus className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => navigate(`/games/${game.id}/events`)}
                      className="btn btn-primary"
                    >
                      View Events
                    </button>
                    {isAppAdmin && (
                      <>
                        <button
                          onClick={() => {
                            setEditingGame(game);
                            setShowModal(true);
                          }}
                          className="btn-icon"
                          title="Edit game"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteGame(game.id)}
                          className="btn-icon"
                          title="Delete game"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
          {games.length === 0 && (
            <li className="empty-state">
              No games found. {isAppAdmin && 'Click the "Create Game" button to create one.'}
            </li>
          )}
        </ul>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">
              {editingGame ? 'Edit Game' : 'Create Game'}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveGame(new FormData(e.currentTarget));
              }}
              className="form-group"
            >
              <div>
                <label htmlFor="name" className="form-label">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  defaultValue={editingGame?.name}
                  className="form-input"
                  placeholder="e.g., Shadowrun Seattle"
                />
              </div>

              <div>
                <label htmlFor="description" className="form-label">
                  Description
                </label>
                <textarea
                  name="description"
                  id="description"
                  rows={3}
                  defaultValue={editingGame?.description}
                  className="form-textarea"
                  placeholder="A brief description of the game..."
                />
              </div>

              <div>
                <label htmlFor="system_id" className="form-label">
                  System
                </label>
                <select
                  name="system_id"
                  id="system_id"
                  required
                  defaultValue={editingGame?.system_id}
                  className="form-input"
                >
                  <option value="">Select a system</option>
                  {availableSystems.map((system) => (
                    <option key={system.id} value={system.id}>
                      {system.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Module Properties</label>
                <div className="space-y-4">
                  {moduleProperties.map((prop, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Property name"
                          value={prop.name}
                          onChange={(e) => handleUpdateProperty(index, 'name', e.target.value)}
                          className="form-input"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Display name"
                          value={prop.displayName}
                          onChange={(e) => handleUpdateProperty(index, 'displayName', e.target.value)}
                          className="form-input"
                        />
                      </div>
                      <div className="w-40">
                        <select
                          value={prop.variableType}
                          onChange={(e) => handleUpdateProperty(index, 'variableType', e.target.value)}
                          className="form-input"
                        >
                          <option value="shortString">Short Text</option>
                          <option value="longString">Long Text</option>
                          <option value="number">Number</option>
                          <option value="dateTime">Date & Time</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveProperty(index)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove property"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddProperty}
                    className="btn btn-secondary btn-with-icon"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Property
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingGame(null);
                    setModuleProperties([]);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {editingGame ? 'Save Changes' : 'Create Game'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {managingUsers && (
        <ManageUsersModal
          gameId={managingUsers.gameId}
          isOpen={true}
          onClose={() => setManagingUsers(null)}
          role={managingUsers.role}
          currentUsers={gameUsers}
          onUsersUpdated={loadGameData} // Add the callback to refresh data
        />
      )}
    </div>
  );
}