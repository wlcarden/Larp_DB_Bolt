import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Event, Game, Module } from '../lib/types';
import { Clock, Plus, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { ScheduleWidget } from '../components/ScheduleWidget';
import { toLocalTime } from '../lib/dates';
import { getUserDisplayNames } from '../lib/users';
import { useAuth } from '../contexts/AuthContext';

export function ModulesPage() {
  const { gameId, eventId } = useParams();
  const navigate = useNavigate();
  const { setCurrentGameId } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canCreateModule, setCanCreateModule] = useState(false);
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({});
  const [showSchedule, setShowSchedule] = useState(false);

  useEffect(() => {
    if (gameId) {
      setCurrentGameId(gameId);
    }
    return () => setCurrentGameId(null);
  }, [gameId, setCurrentGameId]);

  useEffect(() => {
    async function loadModules() {
      if (!gameId || !eventId) {
        setError('Invalid game or event ID');
        setLoading(false);
        return;
      }

      try {
        const [gameResult, eventResult, modulesResult, appAdminResult, gameUserResult] = await Promise.all([
          supabase.from('games').select('*').eq('id', gameId).single(),
          supabase.from('events').select('*').eq('id', eventId).single(),
          supabase.from('modules').select('*').eq('event_id', eventId).order('start_time'),
          supabase.from('app_admins').select('*').eq('user_id', (await supabase.auth.getUser()).data.user?.id),
          supabase.from('game_users')
            .select('*')
            .eq('game_id', gameId)
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        ]);

        if (gameResult.error) throw new Error('Failed to load game details');
        if (eventResult.error) throw new Error('Failed to load event details');
        if (modulesResult.error) throw new Error('Failed to load modules');
        
        const modules = modulesResult.data || [];
        setGame(gameResult.data);
        setEvent(eventResult.data);
        setModules(modules);
        setCanCreateModule(
          appAdminResult.data?.length > 0 || 
          gameUserResult.data?.some(u => ['admin', 'writer'].includes(u.role))
        );

        // Load author display names
        const authorIds = [...new Set(modules.map(m => m.author_id))].filter(Boolean);
        const displayNames = await getUserDisplayNames(authorIds);
        setAuthorNames(displayNames);
      } catch (error) {
        console.error('Error loading modules:', error);
        setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }

    loadModules();
  }, [gameId, eventId]);

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

  // Convert UTC times to local for display
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
        <span className="breadcrumb-current">{event.name}</span>
      </div>

      <div className="card">
        <button
          onClick={() => setShowSchedule(!showSchedule)}
          className="w-full card-header hover:bg-parchment-200/50 transition-colors duration-200"
        >
          <div className="flex flex-col items-center">
            <h3 className="card-title mb-2">Schedule</h3>
            <p className="card-description text-center">
              {format(eventStart, 'PPP')} - {format(eventEnd, 'PPP')}
            </p>
            <div className="mt-2">
              {showSchedule ? (
                <ChevronUp className="h-5 w-5 text-ink-light" />
              ) : (
                <ChevronDown className="h-5 w-5 text-ink-light" />
              )}
            </div>
          </div>
        </button>
        {showSchedule && (
          <div className="card-body">
            <div className="relative pt-12">
              <ScheduleWidget
                startDate={eventStart}
                endDate={eventEnd}
                modules={modules}
                onModuleClick={(moduleId) => 
                  canCreateModule && navigate(`/games/${gameId}/events/${eventId}/modules/${moduleId}`)
                }
                bufferHours={2}
              />
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header card-header-with-button">
          <div>
            <h3 className="card-title">Modules</h3>
          </div>
          {canCreateModule && (
            <button
              onClick={() => navigate(`/games/${gameId}/events/${eventId}/modules/new`)}
              className="btn btn-primary btn-with-icon"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Module
            </button>
          )}
        </div>
        <div className="table-container">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell w-48 min-w-[12rem]">Name</th>
                <th className="table-header-cell w-36">Author</th>
                <th className="table-header-cell w-44">Start Time</th>
                <th className="table-header-cell w-24 text-center">Duration</th>
                <th className="table-header-cell">Summary</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {modules.map(module => {
                const moduleStart = toLocalTime(module.start_time);
                return (
                  <tr
                    key={module.id}
                    onClick={() => canCreateModule && navigate(`/games/${gameId}/events/${eventId}/modules/${module.id}`)}
                    className={`table-row ${canCreateModule ? 'cursor-pointer hover:bg-parchment-100' : ''}`}
                  >
                    <td className="table-cell font-medium text-ink border-r border-parchment-200">
                      {module.name}
                    </td>
                    <td className="table-cell text-ink-light border-r border-parchment-200">
                      {authorNames[module.author_id] || 'Unknown'}
                    </td>
                    <td className="table-cell text-ink-light border-r border-parchment-200">
                      {format(moduleStart, 'PPp')}
                    </td>
                    <td className="table-cell text-ink-light text-center border-r border-parchment-200">
                      {module.duration}h
                    </td>
                    <td className="table-cell text-ink-light">
                      <div className="line-clamp-1">{module.summary}</div>
                    </td>
                  </tr>
                );
              })}
              {modules.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No modules scheduled
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}