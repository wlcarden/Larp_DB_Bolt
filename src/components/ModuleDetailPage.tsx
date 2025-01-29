import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Module, Game, Event, ModuleProperty, ModuleColor } from '../lib/types';
import { ChevronRight, Clock, User, CalendarDays, Printer, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { toLocalTime, dateTimeLocalToUTC, utcToDateTimeLocal, formatDateTime } from '../lib/dates';
import { MODULE_COLORS } from '../lib/colors';
import { useAuth } from '../contexts/AuthContext';
import { ModuleStatusBadge } from '../components/ModuleStatusBadge';
import { ModuleApprovalModal } from '../components/ModuleApprovalModal';
import { ModuleSubmitModal } from '../components/ModuleSubmitModal';
import '../styles/print.css';

function PrintableModule({ 
  module, 
  game, 
  event, 
  authorName 
}: { 
  module: Module; 
  game: Game; 
  event: Event; 
  authorName: string;
}) {
  const statusClasses = {
    approved: 'approved',
    submitted: 'submitted',
    returned: 'returned',
    in_progress: 'in-progress'
  };

  const statusLabels = {
    approved: 'Approved',
    submitted: 'Pending Review',
    returned: 'Returned for Changes',
    in_progress: 'In Progress'
  };

  return (
    <article className="print-preview">
      <header className="print-title">
        <h1>{module.name}</h1>
        <div className="author">By {authorName}</div>
        <div className={`print-status ${statusClasses[module.approval_status]}`}>
          {statusLabels[module.approval_status]}
        </div>
      </header>

      <div className="print-details">
        <div>
          <dt>Event</dt>
          <dd>{event.name}</dd>
          <dt>Start Time</dt>
          <dd>{format(toLocalTime(module.start_time), 'PPpp')}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{module.duration} hours</dd>
          <dt>Game System</dt>
          <dd>{game.name}</dd>
        </div>
      </div>

      <section className="print-section">
        <h2>Summary</h2>
        <p>{module.summary || 'No summary provided.'}</p>
      </section>

      {game.module_properties.map(property => (
        <section key={property.name} className="print-section">
          <h2>{property.displayName}</h2>
          <p>
            {property.variableType === 'dateTime'
              ? formatDateTime(toLocalTime(module.properties[property.name]), 'PPpp')
              : module.properties[property.name] || 'Not specified'}
          </p>
        </section>
      ))}

      {module.approval_comment && (
        <section className="print-comments avoid-break">
          <h3>{module.approval_status === 'approved' ? 'Approval' : 'Review'} Comments</h3>
          <p>{module.approval_comment}</p>
        </section>
      )}
    </article>
  );
}

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
  const [isGameAdmin, setIsGameAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState<string>('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isCurrentUserAuthor, setIsCurrentUserAuthor] = useState(false);
  const [editForm, setEditForm] = useState<{
    name: string;
    start_time: string;
    duration: number;
    summary: string;
    color: ModuleColor;
    properties: Record<string, any>;
  } | null>(null);
  const [isPrintView, setIsPrintView] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gameId) {
      setCurrentGameId(gameId);
    }
    return () => setCurrentGameId(null);
  }, [gameId, setCurrentGameId]);

  useEffect(() => {
    if (module) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setIsCurrentUserAuthor(module.author_id === user.id);
        }
      });
    }
  }, [module]);

  const loadModule = async () => {
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
      const isAdmin = appAdminResult.data?.length > 0 || userRole === 'admin';
      
      setModule(module);
      setGame(game);
      setEvent(eventResult.data);
      setIsGameAdmin(isAdmin);
      setCanEdit(
        isAdmin ||
        (userRole === 'writer' && 
         module.author_id === (await supabase.auth.getUser()).data.user?.id &&
         ['in_progress', 'returned'].includes(module.approval_status))
      );

      // Initialize edit form
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
              return [key, utcToDateTimeLocal(value as string)];
            }
            return [key, value];
          })
        )
      });

      // Get author display name
      if (module.author_id) {
        const { data: userData } = await supabase.rpc('get_user_metadata', {
          user_ids: [module.author_id]
        });
        if (userData?.[0]) {
          setAuthorName(userData[0].display_name);
        }
      }

    } catch (error) {
      console.error('Error loading module:', error);
      setError('Failed to load module');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModule();
  }, [gameId, eventId, moduleId]);

  const handleSaveModule = async () => {
    if (!module || !editForm) return;

    try {
      setError(null);

      // Convert local times to UTC for storage
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
              return [key, dateTimeLocalToUTC(value as string)];
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

      await loadModule();
    } catch (error) {
      console.error('Error updating module:', error);
      setError('Failed to save module');
    }
  };

  const handlePrint = () => {
    if (!module || !game || !event) return;
    window.print();
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
      </div>
    );
  }

  if (!module || !game || !event || !editForm) {
    return (
      <div className="empty-state">Module not found</div>
    );
  }

  if (isPrintView) {
    return (
      <PrintableModule
        module={module}
        game={game}
        event={event}
        authorName={authorName}
      />
    );
  }

  return (
    <div className="page-container">
      <div className="breadcrumb no-print">
        <Link to="/games" className="breadcrumb-item">Games</Link>
        <ChevronRight className="breadcrumb-separator" />
        <Link to={`/games/${gameId}/events`} className="breadcrumb-item">{game.name}</Link>
        <ChevronRight className="breadcrumb-separator" />
        <Link to={`/games/${gameId}/events/${eventId}/modules`} className="breadcrumb-item">{event.name}</Link>
        <ChevronRight className="breadcrumb-separator" />
        <span className="breadcrumb-current">{module.name}</span>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative no-print" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="card" ref={printRef}>
        <div className="card-header no-print">
          <div className="relative">
            <div className="absolute right-0 top-0 flex items-center space-x-4">
              <button
                onClick={() => setIsPrintView(!isPrintView)}
                className="btn btn-secondary btn-with-icon"
                title="Toggle print preview"
              >
                <Printer className="h-4 w-4 mr-2" />
                {isPrintView ? 'Exit Preview' : 'Preview'}
              </button>
              <button
                onClick={handlePrint}
                className="btn btn-secondary btn-with-icon"
                title="Print module details"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </button>
              {module.approval_status === 'submitted' && isGameAdmin && (
                <button
                  onClick={() => setShowApprovalModal(true)}
                  className="btn btn-primary btn-with-icon"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Review Module
                </button>
              )}
              {['in_progress', 'returned'].includes(module.approval_status) && 
               isCurrentUserAuthor && (
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="btn btn-primary btn-with-icon"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit for Approval
                </button>
              )}
            </div>
            <div className="text-center space-y-4">
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="text-4xl font-script text-ink text-center bg-transparent border-b border-parchment-300 focus:border-ink focus:ring-0 w-full"
                />
              ) : (
                <h1 className="text-4xl font-script text-ink">{module.name}</h1>
              )}
              <div className="flex items-center justify-center space-x-4">
                <div className="flex items-center text-ink-light space-x-2">
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medieval italic">By {authorName}</span>
                </div>
                <ModuleStatusBadge status={module.approval_status} />
              </div>
              {module.approval_status === 'approved' && module.approval_comment && (
                <div className="flex items-start space-x-2 bg-green-50 text-green-800 p-4 rounded-md">
                  <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medieval font-medium">Approved</p>
                    <p className="mt-1 text-sm font-medieval">{module.approval_comment}</p>
                  </div>
                </div>
              )}
              {module.approval_status === 'returned' && module.approval_comment && (
                <div className="flex items-start space-x-2 bg-red-50 text-red-800 p-4 rounded-md">
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medieval font-medium">Returned for Changes</p>
                    <p className="mt-1 text-sm font-medieval">{module.approval_comment}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <PrintableModule
          module={module}
          game={game}
          event={event}
          authorName={authorName}
        />

        {/* Action Buttons */}
        {canEdit && (
          <div className="mt-8 flex justify-center space-x-4 no-print">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveModule}
                  className="btn btn-primary"
                >
                  Save Changes
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-primary"
              >
                Edit Module
              </button>
            )}
          </div>
        )}
      </div>

      {showApprovalModal && (
        <ModuleApprovalModal
          module={module}
          onClose={() => setShowApprovalModal(false)}
          onUpdate={loadModule}
        />
      )}

      {showSubmitModal && (
        <ModuleSubmitModal
          module={module}
          onClose={() => setShowSubmitModal(false)}
          onUpdate={loadModule}
        />
      )}
    </div>
  );
}