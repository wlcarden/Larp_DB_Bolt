import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Game, Event } from '../lib/types';
import { ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { toLocalTime, dateTimeLocalToUTC, utcToDateTimeLocal } from '../lib/dates';
import { MODULE_COLORS } from '../lib/colors';

export function CreateModulePage() {
  const { gameId, eventId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [gameResult, eventResult] = await Promise.all([
          supabase.from('games').select('*').eq('id', gameId).single(),
          supabase.from('events').select('*').eq('id', eventId).single()
        ]);

        if (gameResult.error) throw new Error('Failed to load game details');
        if (eventResult.error) throw new Error('Failed to load event details');

        setGame(gameResult.data);
        setEvent(eventResult.data);
      } catch (error) {
        console.error('Error loading data:', error);
        setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [gameId, eventId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!game || !event) return;

    try {
      setSaving(true);
      const formData = new FormData(e.currentTarget);
      
      // Convert local time to UTC for storage
      const startTime = dateTimeLocalToUTC(formData.get('start_time') as string);
      const duration = parseFloat(formData.get('duration') as string);
      const color = (formData.get('color') as ModuleColor) || 'blue';

      // Build properties object based on game's module_properties
      const properties: Record<string, any> = {};
      game.module_properties.forEach(prop => {
        const value = formData.get(`property_${prop.name}`);
        if (value) {
          switch (prop.variableType) {
            case 'number':
              properties[prop.name] = parseFloat(value as string);
              break;
            case 'dateTime':
              properties[prop.name] = dateTimeLocalToUTC(value as string);
              break;
            default:
              properties[prop.name] = value;
          }
        }
      });

      const { data: userData } = await supabase.auth.getUser();
      const moduleData = {
        event_id: eventId,
        author_id: userData.user?.id,
        name: formData.get('name'),
        summary: formData.get('summary'),
        start_time: startTime,
        duration: duration,
        color: color,
        properties: properties
      };

      const { error: saveError } = await supabase
        .from('modules')
        .insert(moduleData);

      if (saveError) throw saveError;

      navigate(`/games/${gameId}/events/${eventId}/modules`);
    } catch (error) {
      console.error('Error saving module:', error);
      setError(error instanceof Error ? error.message : 'Failed to save module');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
      </div>
    );
  }

  if (!game || !event) {
    return (
      <div className="empty-state">Event not found</div>
    );
  }

  // Convert UTC event times to local for display
  const eventStart = toLocalTime(event.start_time);
  const eventEnd = toLocalTime(event.end_time);

  return (
    <div className="page-container">
      <div className="breadcrumb">
        <Link to="/games" className="breadcrumb-item">
          Games
        </Link>
        <ChevronRight className="breadcrumb-separator" />
        <Link to={`/games/${gameId}/events`} className="breadcrumb-item">
          {game.name}
        </Link>
        <ChevronRight className="breadcrumb-separator" />
        <Link to={`/games/${gameId}/events/${eventId}/modules`} className="breadcrumb-item">
          {event.name}
        </Link>
        <ChevronRight className="breadcrumb-separator" />
        <span className="breadcrumb-current">Create Module</span>
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

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Create New Module</h3>
          <p className="card-description">
            Add a new module to {event.name}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="card-body">
          <div className="form-group">
            <div>
              <label htmlFor="name" className="form-label">
                Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                className="form-input"
                placeholder="Module name"
              />
            </div>

            <div>
              <label htmlFor="summary" className="form-label">
                Summary
              </label>
              <textarea
                name="summary"
                id="summary"
                rows={3}
                className="form-textarea"
                placeholder="Brief description of the module..."
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="start_time" className="form-label">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  name="start_time"
                  id="start_time"
                  required
                  className="form-input"
                />
              </div>

              <div>
                <label htmlFor="duration" className="form-label">
                  Duration (hours)
                </label>
                <input
                  type="number"
                  name="duration"
                  id="duration"
                  required
                  min="0.5"
                  step="0.5"
                  className="form-input"
                />
              </div>

              <div>
                <label htmlFor="color" className="form-label">
                  Color
                </label>
                <select
                  name="color"
                  id="color"
                  className="form-input"
                  defaultValue="blue"
                >
                  {MODULE_COLORS.map(color => (
                    <option key={color.id} value={color.id}>
                      {color.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {game.module_properties.length > 0 && (
              <div className="space-y-6">
                <h4 className="text-base font-medium text-gray-900">Additional Properties</h4>
                {game.module_properties.map(property => (
                  <div key={property.name}>
                    <label
                      htmlFor={`property_${property.name}`}
                      className="form-label"
                    >
                      {property.displayName}
                    </label>
                    {property.variableType === 'longString' ? (
                      <textarea
                        name={`property_${property.name}`}
                        id={`property_${property.name}`}
                        rows={3}
                        className="form-textarea"
                      />
                    ) : property.variableType === 'dateTime' ? (
                      <input
                        type="datetime-local"
                        name={`property_${property.name}`}
                        id={`property_${property.name}`}
                        className="form-input"
                      />
                    ) : property.variableType === 'number' ? (
                      <input
                        type="number"
                        name={`property_${property.name}`}
                        id={`property_${property.name}`}
                        className="form-input"
                      />
                    ) : (
                      <input
                        type="text"
                        name={`property_${property.name}`}
                        id={`property_${property.name}`}
                        className="form-input"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate(`/games/${gameId}/events/${eventId}/modules`)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
              >
                {saving ? 'Creating...' : 'Create Module'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}