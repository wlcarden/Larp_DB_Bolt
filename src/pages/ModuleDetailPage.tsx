import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Module, Game, Event, ModuleProperty, ModuleColor } from '../lib/types';
import { ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { toLocalTime, dateTimeLocalToUTC, utcToDateTimeLocal, formatDateTime } from '../lib/dates';
import { MODULE_COLORS } from '../lib/colors';
import { useAuth } from '../contexts/AuthContext';

export function ModuleDetailPage() {
  const { gameId, eventId, moduleId } = useParams();
  const navigate = useNavigate();
  const { setCurrentGameId } = useAuth();
  const [module, setModule] = useState<Module | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    start_time: string;
    duration: number;
    summary: string;
    color: ModuleColor;
    properties: Record<string, any>;
  } | null>(null);

  useEffect(() => {
    // Set current game ID for display name check
    if (gameId) {
      setCurrentGameId(gameId);
    }

    return () => {
      setCurrentGameId(null);
    };
  }, [gameId, setCurrentGameId]);

  useEffect(() => {
    async function loadModule() {
      try {
        const [moduleResult, gameResult, eventResult, appAdminResult, gameUserResult] = await Promise.all([
          supabase.from('modules').select('*').eq('id', moduleId).single(),
          supabase.from('games').select('*').eq('id', gameId).single(),
          supabase.from('events').select('*').eq('id', eventId).single(),
          supabase.from('app_admins').select('*').eq('user_id', (await supabase.auth.getUser()).data.user?.id),
          supabase.from('game_users')
            .select('*')
            .eq('game_id', gameId)
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        ]);

        if (moduleResult.error) throw moduleResult.error;
        if (gameResult.error) throw gameResult.error;
        if (eventResult.error) throw eventResult.error;

        const module = moduleResult.data;
        const game = gameResult.data;
        const userRole = gameUserResult.data?.[0]?.role;
        
        setModule(module);
        setGame(game);
        setEvent(eventResult.data);
        setCanEdit(
          appAdminResult.data?.length > 0 ||
          userRole === 'admin' || 
          (userRole === 'writer' && module.author_id === (await supabase.auth.getUser()).data.user?.id)
        );

        // Initialize edit form with local time values
        setEditForm({
          name: module.name,
          start_time: utcToDateTimeLocal(module.start_time),
          duration: module.duration,
          summary: module.summary || '',
          color: module.color || 'blue',
          properties: Object.fromEntries(
            Object.entries(module.properties).map(([key, value]) => {
              const property = game.module_properties.find(p => p.name === key);
              if (property?.variableType === 'dateTime') {
                return [key, utcToDateTimeLocal(value)];
              }
              return [key, value];
            })
          )
        });
      } catch (error) {
        console.error('Error loading module:', error);
        setError('Failed to load module');
      } finally {
        setLoading(false);
      }
    }

    loadModule();
  }, [gameId, eventId, moduleId]);

  const handleSaveModule = async () => {
    if (!module || !editForm) return;

    try {
      setError(null);

      // Convert local times to UTC only when saving
      const updatedModule = {
        ...module,
        name: editForm.name,
        start_time: dateTimeLocalToUTC(editForm.start_time),
        duration: editForm.duration,
        summary: editForm.summary,
        color: editForm.color,
        properties: Object.fromEntries(
          Object.entries(editForm.properties).map(([key, value]) => {
            const property = game?.module_properties.find(p => p.name === key);
            if (property?.variableType === 'dateTime') {
              return [key, dateTimeLocalToUTC(value)];
            }
            return [key, value];
          })
        )
      };

      const { error: saveError } = await supabase
        .from('modules')
        .update(updatedModule)
        .eq('id', module.id);
      
      if (saveError) throw saveError;
      setIsEditing(false);

      // Reload the module to get the updated data
      const { data: updatedModuleData, error: reloadError } = await supabase
        .from('modules')
        .select('*')
        .eq('id', module.id)
        .single();

      if (reloadError) throw reloadError;
      setModule(updatedModuleData);
    } catch (error) {
      console.error('Error updating module:', error);
      setError('Failed to save module');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!module || !game || !event || !editForm) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Module not found</p>
      </div>
    );
  }

  const renderPropertyValue = (property: ModuleProperty, value: any) => {
    switch (property.variableType) {
      case 'dateTime':
        return format(toLocalTime(value), 'PPpp');
      case 'number':
        return value.toString();
      default:
        return value;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center text-sm">
        <Link 
          to="/games" 
          className="text-gray-500 hover:text-gray-700"
        >
          Games
        </Link>
        <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />
        <Link 
          to={`/games/${gameId}/events`}
          className="text-gray-500 hover:text-gray-700"
        >
          {game?.name}
        </Link>
        <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />
        <Link 
          to={`/games/${gameId}/events/${eventId}/modules`}
          className="text-gray-500 hover:text-gray-700"
        >
          {event?.name}
        </Link>
        <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />
        <span className="text-gray-900 font-medium">
          {module?.name}
        </span>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
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

      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          {isEditing ? (
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="text-2xl font-semibold text-gray-900 bg-white border-b border-gray-300 focus:border-indigo-500 focus:ring-0 w-full"
            />
          ) : (
            <h1 className="text-2xl font-semibold text-gray-900">{module.name}</h1>
          )}
          <p className="mt-2 text-sm text-gray-700">
            {formatDateTime(toLocalTime(module.start_time), 'PPpp')} ({module.duration} hours)
          </p>
        </div>
        {canEdit && !isEditing && (
          <div className="space-x-4">
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Edit Module
            </button>
          </div>
        )}
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6 space-y-6">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  value={editForm.start_time}
                  onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Duration (hours)
                </label>
                <input
                  type="number"
                  value={editForm.duration}
                  onChange={(e) => setEditForm({ ...editForm, duration: parseFloat(e.target.value) })}
                  min="0.5"
                  step="0.5"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Summary
                </label>
                <textarea
                  value={editForm.summary}
                  onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Color
                </label>
                {isEditing ? (
                  <select
                    value={editForm.color}
                    onChange={(e) => setEditForm({ ...editForm, color: e.target.value as ModuleColor })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    {MODULE_COLORS.map(color => (
                      <option key={color.id} value={color.id}>
                        {color.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className={`mt-1 inline-block px-3 py-1 rounded-full ${
                    (MODULE_COLORS.find(c => c.id === (module.color || 'blue')) || MODULE_COLORS[0]).bgClass
                  } ${
                    (MODULE_COLORS.find(c => c.id === (module.color || 'blue')) || MODULE_COLORS[0]).textClass
                  }`}>
                    {(MODULE_COLORS.find(c => c.id === (module.color || 'blue')) || MODULE_COLORS[0]).name}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-medium text-gray-900">Summary</h3>
              <p className="mt-2 text-gray-500">{module.summary}</p>
            </div>
          )}

          <div>
            <h3 className="text-lg font-medium text-gray-900">Properties</h3>
            <div className="mt-4 space-y-4">
              {game.module_properties.map((property) => (
                <div key={property.name}>
                  <label className="block text-sm font-medium text-gray-700">
                    {property.displayName}
                  </label>
                  <div className="mt-1">
                    {isEditing ? (
                      property.variableType === 'dateTime' ? (
                        <input
                          type="datetime-local"
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          value={editForm.properties[property.name] || ''}
                          onChange={(e) => {
                            setEditForm({
                              ...editForm,
                              properties: {
                                ...editForm.properties,
                                [property.name]: e.target.value
                              }
                            });
                          }}
                        />
                      ) : (
                        <input
                          type={property.variableType === 'number' ? 'number' : 'text'}
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          value={editForm.properties[property.name] || ''}
                          onChange={(e) => {
                            setEditForm({
                              ...editForm,
                              properties: {
                                ...editForm.properties,
                                [property.name]: e.target.value
                              }
                            });
                          }}
                        />
                      )
                    ) : (
                      <div className="text-gray-900">
                        {property.variableType === 'dateTime' 
                          ? formatDateTime(toLocalTime(module.properties[property.name]), 'PPpp')
                          : renderPropertyValue(property, module.properties[property.name])}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-4">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveModule}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}