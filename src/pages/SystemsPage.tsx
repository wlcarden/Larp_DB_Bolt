import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { System } from '../lib/types';
import { Plus, Edit2, Trash2, ExternalLink } from 'lucide-react';

export function SystemsPage() {
  const [systems, setSystems] = useState<System[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAppAdmin, setIsAppAdmin] = useState(false);
  const [editingSystem, setEditingSystem] = useState<System | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSystems() {
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

        if (adminError && adminError.code !== 'PGRST116') { // PGRST116 is "not found"
          throw adminError;
        }

        setIsAppAdmin(!!adminData);
        
        // Load systems
        const { data: systemsData, error: systemsError } = await supabase
          .from('systems')
          .select('*')
          .order('name');
        
        if (systemsError) throw systemsError;
        setSystems(systemsData || []);
      } catch (error) {
        console.error('Error loading systems:', error);
        setError('Failed to load systems');
      } finally {
        setLoading(false);
      }
    }

    loadSystems();
  }, []);

  const handleSaveSystem = async (system: Partial<System>) => {
    try {
      setError(null);
      if (editingSystem) {
        const { error } = await supabase
          .from('systems')
          .update(system)
          .eq('id', editingSystem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('systems')
          .insert(system);
        if (error) throw error;
      }

      // Refresh systems list
      const { data } = await supabase.from('systems').select('*').order('name');
      setSystems(data || []);
      setShowModal(false);
      setEditingSystem(null);
    } catch (error) {
      console.error('Error saving system:', error);
      setError('Failed to save system');
    }
  };

  const handleDeleteSystem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this system? This action cannot be undone.')) return;

    try {
      setError(null);
      const { error } = await supabase
        .from('systems')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setSystems(systems.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting system:', error);
      setError('Failed to delete system');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center text-sm">
        <span className="text-gray-900 font-medium">Game Systems</span>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Systems List</h3>
            <p className="mt-1 text-sm text-gray-500">
              Manage game systems and their configurations
            </p>
          </div>
          {isAppAdmin && (
            <button
              onClick={() => {
                setEditingSystem(null);
                setShowModal(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add System
            </button>
          )}
        </div>
        <ul className="divide-y divide-gray-200">
          {systems.map((system) => (
            <li key={system.id}>
              <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {system.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {system.description}
                    </p>
                    {system.authors && (
                      <p className="mt-1 text-sm text-gray-500">
                        By: {system.authors}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    {system.url && (
                      <a
                        href={system.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-gray-500"
                        title="Visit system website"
                      >
                        <ExternalLink className="h-5 w-5" />
                      </a>
                    )}
                    {isAppAdmin && (
                      <>
                        <button
                          onClick={() => {
                            setEditingSystem(system);
                            setShowModal(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit system"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSystem(system.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete system"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
          {systems.length === 0 && (
            <li>
              <div className="px-4 py-8 text-center text-gray-500">
                No systems found. {isAppAdmin && 'Click the "Add System" button to create one.'}
              </div>
            </li>
          )}
        </ul>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingSystem ? 'Edit System' : 'Add System'}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleSaveSystem({
                  name: formData.get('name') as string,
                  description: formData.get('description') as string,
                  authors: formData.get('authors') as string,
                  url: formData.get('url') as string,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  defaultValue={editingSystem?.name}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="e.g., Dungeons & Dragons 5E"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  name="description"
                  id="description"
                  rows={3}
                  defaultValue={editingSystem?.description}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="A brief description of the game system..."
                />
              </div>
              <div>
                <label htmlFor="authors" className="block text-sm font-medium text-gray-700">
                  Authors
                </label>
                <input
                  type="text"
                  name="authors"
                  id="authors"
                  defaultValue={editingSystem?.authors}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="e.g., Wizards of the Coast"
                />
              </div>
              <div>
                <label htmlFor="url" className="block text-sm font-medium text-gray-700">
                  URL
                </label>
                <input
                  type="url"
                  name="url"
                  id="url"
                  defaultValue={editingSystem?.url}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="https://..."
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingSystem(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {editingSystem ? 'Save Changes' : 'Create System'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}