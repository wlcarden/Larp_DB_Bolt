import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Event, Game } from '../lib/types';
import { Clock, Plus, ChevronRight, Users, Edit2, Trash2, Calendar } from 'lucide-react';
import { format, parseISO, isAfter, addMonths, startOfMonth, isSameDay, startOfDay, endOfDay, isWithinInterval, isBefore } from 'date-fns';
import { Calendar as CalendarWidget } from '../components/Calendar';
import { toLocalTime } from '../lib/dates';
import { getUserDisplayNames } from '../lib/users';
import { useAuth } from '../contexts/AuthContext';

export function EventsPage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { setCurrentGameId } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    async function loadEvents() {
      try {
        if (!gameId) {
          navigate('/games', { replace: true });
          return;
        }

        const [gameResult, eventsResult, appAdminResult, gameUserResult] = await Promise.all([
          supabase.from('games').select('*').eq('id', gameId).single(),
          supabase.from('events').select('*').eq('game_id', gameId).order('start_time'),
          supabase.from('app_admins').select('*').eq('user_id', (await supabase.auth.getUser()).data.user?.id),
          supabase.from('game_users').select('*').eq('game_id', gameId).eq('user_id', (await supabase.auth.getUser()).data.user?.id).eq('role', 'admin')
        ]);

        if (gameResult.error) {
          // If game not found, navigate back to games list
          navigate('/games', { replace: true });
          return;
        }
        if (eventsResult.error) throw eventsResult.error;
        
        setGame(gameResult.data);
        setEvents(eventsResult.data || []);
        setIsAdmin(appAdminResult.data?.length > 0 || gameUserResult.data?.length > 0);
      } catch (error) {
        console.error('Error loading events:', error);
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, [gameId, navigate]);

  const handleSaveEvent = async (formData: FormData) => {
    try {
      setError(null);
      
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const startTimeLocal = formData.get('start_time') as string;
      const endTimeLocal = formData.get('end_time') as string;

      const startTime = new Date(startTimeLocal).toISOString();
      const endTime = new Date(endTimeLocal).toISOString();

      const eventData = {
        game_id: gameId,
        name,
        description,
        start_time: startTime,
        end_time: endTime
      };

      if (editingEvent) {
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEvent.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('events')
          .insert(eventData);

        if (error) throw error;
      }

      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('game_id', gameId)
        .order('start_time');

      setEvents(data || []);
      setShowModal(false);
      setEditingEvent(null);
    } catch (error) {
      console.error('Error saving event:', error);
      setError('Failed to save event');
    }
  };

  const handleDeleteEvent = async (event: Event) => {
    if (!confirm('Are you sure you want to delete this event? This will also delete all modules associated with this event.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id);

      if (error) throw error;

      setEvents(events.filter(e => e.id !== event.id));
    } catch (error) {
      console.error('Error deleting event:', error);
      setError('Failed to delete event');
    }
  };

  const handleDayClick = (date: Date) => {
    const eventsOnDay = events.filter(event => {
      const eventStart = parseISO(event.start_time);
      const eventEnd = parseISO(event.end_time);
      return isWithinInterval(startOfDay(date), { start: startOfDay(eventStart), end: endOfDay(eventEnd) }) ||
             isWithinInterval(endOfDay(date), { start: startOfDay(eventStart), end: endOfDay(eventEnd) }) ||
             isWithinInterval(eventStart, { start: startOfDay(date), end: endOfDay(date) });
    });

    if (eventsOnDay.length > 0) {
      navigate(`/games/${gameId}/events/${eventsOnDay[0].id}/modules`);
    } else if (isAdmin) {
      setEditingEvent(null);
      setShowModal(true);
      const form = document.querySelector('form');
      if (form) {
        const startInput = form.querySelector<HTMLInputElement>('[name="start_time"]');
        if (startInput) {
          startInput.value = format(date, "yyyy-MM-dd'T'HH:mm");
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="empty-state">Game not found</div>
    );
  }

  const now = new Date();
  const ongoingEvents = events.filter(event => {
    const start = parseISO(event.start_time);
    const end = parseISO(event.end_time);
    return isBefore(start, now) && isAfter(end, now);
  });

  const upcomingEvents = events.filter(event => isAfter(parseISO(event.start_time), now));
  const pastEvents = events.filter(event => {
    const end = parseISO(event.end_time);
    return isBefore(end, now);
  });

  const currentMonth = startOfMonth(new Date());
  const nextMonth = addMonths(currentMonth, 1);

  const renderEventCard = (event: Event, status: 'ongoing' | 'upcoming' | 'past') => {
    const start = parseISO(event.start_time);
    const end = parseISO(event.end_time);
    const badgeClass = {
      ongoing: 'bg-green-100 text-green-800',
      upcoming: 'bg-blue-100 text-blue-800',
      past: 'bg-gray-100 text-gray-800'
    }[status];

    return (
      <div key={event.id} className="bg-parchment-100/90 backdrop-blur-sm rounded-lg shadow-parchment border border-parchment-300 overflow-hidden hover:shadow-lg transition-shadow duration-200">
        <div className="p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <h3 className="text-xl font-script text-ink">{event.name}</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medieval font-medium capitalize ${badgeClass}`}>
                  {status}
                </span>
              </div>
              <p className="mt-2 text-sm font-medieval text-ink-light">{event.description}</p>
              <div className="mt-4 flex items-center space-x-6 text-sm font-medieval text-ink-light">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1.5 text-ink-light" />
                  <span>{format(start, 'MMM d, yyyy h:mm a')} - {format(end, 'h:mm a')}</span>
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1.5 text-ink-light" />
                  <span>0 modules</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {isAdmin && (
                <>
                  <button
                    onClick={() => {
                      setEditingEvent(event);
                      setShowModal(true);
                    }}
                    className="btn-icon"
                    title="Edit event"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(event)}
                    className="btn-icon-danger"
                    title="Delete event"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </>
              )}
              <button
                onClick={() => navigate(`/games/${gameId}/events/${event.id}/modules`)}
                className="btn btn-primary"
              >
                View Modules
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className="breadcrumb">
        <Link to="/games" className="breadcrumb-item">Games</Link>
        <ChevronRight className="breadcrumb-separator" />
        <span className="breadcrumb-current">{game.name}</span>
      </div>

      <div className="card">
        <div className="px-6 py-5 border-b border-parchment-300 bg-parchment-200/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-5">
              <div className="h-12 w-12 bg-parchment-300 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-ink" />
              </div>
              <div>
                <h1 className="text-2xl font-script text-ink">{game.name}</h1>
                <p className="mt-1 text-sm font-medieval text-ink-light">{game.description}</p>
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={() => {
                  setEditingEvent(null);
                  setShowModal(true);
                }}
                className="btn btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CalendarWidget
              events={events}
              month={currentMonth}
              onDayClick={handleDayClick}
            />
            <CalendarWidget
              events={events}
              month={nextMonth}
              onDayClick={handleDayClick}
            />
          </div>
        </div>
      </div>

      {ongoingEvents.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-script text-ink">Ongoing Events</h2>
          <div className="space-y-4">
            {ongoingEvents.map(event => renderEventCard(event, 'ongoing'))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-script text-ink">Upcoming Events</h2>
        <div className="space-y-4">
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map(event => renderEventCard(event, 'upcoming'))
          ) : (
            <p className="text-sm font-medieval text-ink-light bg-parchment-100/90 rounded-lg p-4 border border-parchment-300">
              No upcoming events scheduled
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-script text-ink">Past Events</h2>
        <div className="space-y-4">
          {pastEvents.length > 0 ? (
            pastEvents.map(event => renderEventCard(event, 'past'))
          ) : (
            <p className="text-sm font-medieval text-ink-light bg-parchment-100/90 rounded-lg p-4 border border-parchment-300">
              No past events
            </p>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">
              {editingEvent ? 'Edit Event' : 'Create Event'}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveEvent(new FormData(e.currentTarget));
              }}
              className="form-group"
            >
              <div>
                <label htmlFor="name" className="form-label">Name</label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  defaultValue={editingEvent?.name}
                  className="form-input"
                  placeholder="e.g., Summer Campaign Kickoff"
                />
              </div>

              <div>
                <label htmlFor="description" className="form-label">Description</label>
                <textarea
                  name="description"
                  id="description"
                  rows={3}
                  defaultValue={editingEvent?.description}
                  className="form-textarea"
                  placeholder="A brief description of the event..."
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="start_time" className="form-label">Start Time</label>
                  <input
                    type="datetime-local"
                    name="start_time"
                    id="start_time"
                    required
                    defaultValue={editingEvent ? format(parseISO(editingEvent.start_time), "yyyy-MM-dd'T'HH:mm") : undefined}
                    className="form-input"
                  />
                </div>

                <div>
                  <label htmlFor="end_time" className="form-label">End Time</label>
                  <input
                    type="datetime-local"
                    name="end_time"
                    id="end_time"
                    required
                    defaultValue={editingEvent ? format(parseISO(editingEvent.end_time), "yyyy-MM-dd'T'HH:mm") : undefined}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingEvent(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {editingEvent ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}