import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Module, Game, Event, ModuleProperty, ModuleColor } from '../lib/types';
import { ChevronRight, Clock, User, CalendarDays, Printer } from 'lucide-react';
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
  const [authorName, setAuthorName] = useState<string>('');
  const [editForm, setEditForm] = useState<{
    name: string;
    start_time: string;
    duration: number;
    summary: string;
    color: ModuleColor;
    properties: Record<string, any>;
  } | null>(null);
  const moduleRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !module || !game || !event) return;

    // Get the module content
    const moduleContent = moduleRef.current;
    if (!moduleContent) return;

    // Create print-friendly styles
    const printStyles = `
      <style>
        @media print {
          @page {
            margin: 2cm;
          }
          
          body { 
            margin: 0;
            padding: 20px;
            font-family: 'Crimson Text', serif;
            color: #2D3748;
            background: #FFFBF2;
          }

          h1, h2 {
            font-family: 'MedievalSharp', cursive;
            text-align: center;
            color: #2D3748;
            margin-bottom: 1rem;
          }

          h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
          }

          h2 {
            font-size: 1.8rem;
            margin-top: 2rem;
          }

          .author {
            text-align: center;
            font-style: italic;
            color: #4A5568;
            margin-bottom: 2rem;
          }

          .details-table {
            width: 100%;
            max-width: 600px;
            margin: 2rem auto;
            border-collapse: collapse;
          }

          .details-table td {
            padding: 0.75rem;
            text-align: center;
            border: 1px solid #F7E2C3;
          }

          .details-table td:first-child {
            font-weight: 600;
            background: #FAECD3;
            width: 40%;
          }

          .content-section {
            margin: 2rem 0;
            padding: 1.5rem;
            background: #FDF6E3;
            border: 1px solid #F7E2C3;
            border-radius: 0.5rem;
          }

          .content-section p {
            margin: 0;
            line-height: 1.6;
          }

          .content-section p:first-letter {
            font-size: 2rem;
            font-family: 'MedievalSharp', cursive;
            float: left;
            margin-right: 0.5rem;
            line-height: 1;
          }

          .page-break {
            page-break-before: always;
          }

          .no-print {
            display: none;
          }
        }
      </style>
      <link href="https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&family=MedievalSharp&display=swap" rel="stylesheet">
    `;

    // Create the print document
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${module.name} - Module Details</title>
          ${printStyles}
        </head>
        <body>
          <div>
            <h1>${module.name}</h1>
            <div class="author">By ${authorName}</div>

            <table class="details-table">
              <tr>
                <td>Start Time</td>
                <td>${format(toLocalTime(module.start_time), 'PPpp')}</td>
              </tr>
              <tr>
                <td>Duration</td>
                <td>${module.duration} hours</td>
              </tr>
            </table>

            <h2>Summary</h2>
            <div class="content-section">
              <p>${module.summary || 'No summary provided.'}</p>
            </div>

            ${game.module_properties.map(property => `
              <h2>${property.displayName}</h2>
              <div class="content-section">
                <p>${
                  property.variableType === 'dateTime'
                    ? formatDateTime(toLocalTime(module.properties[property.name]), 'PPpp')
                    : module.properties[property.name] || 'Not specified'
                }</p>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    // Wait for fonts to load before printing
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.onafterprint = () => printWindow.close();
      }, 1000);
    };
  };

  useEffect(() => {
    if (gameId) {
      setCurrentGameId(gameId);
    }
    return () => setCurrentGameId(null);
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
    }

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

  const moduleStart = toLocalTime(module.start_time);
  const colorConfig = MODULE_COLORS.find(c => c.id === (module.color || 'blue')) || MODULE_COLORS[0];

  return (
    <div className="page-container">
      <div className="breadcrumb">
        <Link to="/games" className="breadcrumb-item">Games</Link>
        <ChevronRight className="breadcrumb-separator" />
        <Link to={`/games/${gameId}/events`} className="breadcrumb-item">{game.name}</Link>
        <ChevronRight className="breadcrumb-separator" />
        <Link to={`/games/${gameId}/events/${eventId}/modules`} className="breadcrumb-item">{event.name}</Link>
        <ChevronRight className="breadcrumb-separator" />
        <span className="breadcrumb-current">{module.name}</span>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="card" ref={moduleRef}>
        <div className="card-header">
          <div className="relative">
            <button
              onClick={handlePrint}
              className="absolute right-0 top-0 btn btn-secondary btn-with-icon"
              title="Print module details"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </button>
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
              <div className="flex items-center justify-center text-ink-light space-x-2">
                <User className="h-4 w-4" />
                <span className="text-sm font-medieval italic">By {authorName}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card-body">
          {/* Module Details Table */}
          <div className="max-w-2xl mx-auto mb-8">
            <table className="w-full">
              <tbody className="divide-y divide-parchment-300">
                <tr>
                  <td className="py-3 text-center font-medieval text-ink-light">
                    <div className="flex items-center justify-center space-x-2">
                      <CalendarDays className="h-4 w-4" />
                      <span>Start Time</span>
                    </div>
                  </td>
                  <td className="py-3 text-center font-medieval text-ink">
                    {isEditing ? (
                      <input
                        type="datetime-local"
                        value={editForm.start_time}
                        onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                        className="form-input text-center"
                      />
                    ) : (
                      format(moduleStart, 'PPpp')
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 text-center font-medieval text-ink-light">
                    <div className="flex items-center justify-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>Duration</span>
                    </div>
                  </td>
                  <td className="py-3 text-center font-medieval text-ink">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editForm.duration}
                        onChange={(e) => setEditForm({ ...editForm, duration: parseFloat(e.target.value) })}
                        min="0.5"
                        step="0.5"
                        className="form-input text-center"
                      />
                    ) : (
                      `${module.duration} hours`
                    )}
                  </td>
                </tr>
                {isEditing && (
                  <tr>
                    <td className="py-3 text-center font-medieval text-ink-light">
                      <span>Color</span>
                    </td>
                    <td className="py-3 text-center">
                      <select
                        value={editForm.color}
                        onChange={(e) => setEditForm({ ...editForm, color: e.target.value as ModuleColor })}
                        className="form-input text-center"
                      >
                        {MODULE_COLORS.map(color => (
                          <option key={color.id} value={color.id}>
                            {color.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary Section */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-script text-ink text-center mb-4">Summary</h2>
              <div className="bg-parchment-50 rounded-lg p-6 shadow-inner border border-parchment-300">
                {isEditing ? (
                  <textarea
                    value={editForm.summary}
                    onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                    rows={4}
                    className="form-textarea w-full"
                  />
                ) : (
                  <p className="font-medieval text-ink first-letter:text-3xl first-letter:font-script first-letter:mr-1 first-letter:float-left first-letter:leading-none">
                    {module.summary || 'No summary provided.'}
                  </p>
                )}
              </div>
            </div>

            {/* Module Properties */}
            {game.module_properties.map((property) => (
              <div key={property.name}>
                <h2 className="text-2xl font-script text-ink text-center mb-4">
                  {property.displayName}
                </h2>
                <div className="bg-parchment-50 rounded-lg p-6 shadow-inner border border-parchment-300">
                  {isEditing ? (
                    property.variableType === 'dateTime' ? (
                      <input
                        type="datetime-local"
                        value={editForm.properties[property.name] || ''}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          properties: {
                            ...editForm.properties,
                            [property.name]: e.target.value
                          }
                        })}
                        className="form-input w-full"
                      />
                    ) : property.variableType === 'longString' ? (
                      <textarea
                        value={editForm.properties[property.name] || ''}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          properties: {
                            ...editForm.properties,
                            [property.name]: e.target.value
                          }
                        })}
                        rows={4}
                        className="form-textarea w-full"
                      />
                    ) : (
                      <input
                        type={property.variableType === 'number' ? 'number' : 'text'}
                        value={editForm.properties[property.name] || ''}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          properties: {
                            ...editForm.properties,
                            [property.name]: e.target.value
                          }
                        })}
                        className="form-input w-full"
                      />
                    )
                  ) : (
                    <p className="font-medieval text-ink first-letter:text-3xl first-letter:font-script first-letter:mr-1 first-letter:float-left first-letter:leading-none">
                      {property.variableType === 'dateTime'
                        ? formatDateTime(toLocalTime(module.properties[property.name]), 'PPpp')
                        : module.properties[property.name] || 'Not specified'}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          {canEdit && (
            <div className="mt-8 flex justify-center space-x-4">
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
      </div>
    </div>
  );
}