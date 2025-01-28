import React from 'react';
import { format, addHours, eachDayOfInterval, isWithinInterval, isBefore, isAfter, startOfDay, endOfDay, areIntervalsOverlapping, differenceInMinutes, parseISO } from 'date-fns';
import type { Module, ModuleColor } from '../lib/types';
import { MODULE_COLORS } from '../lib/colors';
import { toLocalTime, dateTimeLocalToUTC, utcToDateTimeLocal } from '../lib/dates';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Printer, Move } from 'lucide-react';

type ScheduleWidgetProps = {
  startDate: Date;
  endDate: Date;
  modules?: Module[];
  onModuleClick?: (moduleId: string) => void;
  bufferHours?: number;
  event?: { name: string } | null;
  isAdmin?: boolean;
};

interface ModuleBlock {
  id: string;
  name: string;
  authorName: string;
  start: Date;
  end: Date;
  color: ModuleColor;
  gridRowStart: number;
  gridRowSpan: number;
  column: number;
  columnCount: number;
  approval_status: 'in_progress' | 'submitted' | 'approved' | 'returned';
}

interface ModuleProps {
  block: ModuleBlock;
  colorConfig: any;
  columnWidth: number;
  isEditMode: boolean;
  onModuleClick?: (id: string) => void;
  onEditClick: (id: string) => void;
}

function Module({ block, colorConfig, columnWidth, isEditMode, onModuleClick, onEditClick }: ModuleProps) {
  const moduleRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isEditMode) {
      onEditClick(block.id);
    } else if (!isEditMode) {
      onModuleClick?.(block.id);
    }
  };

  const style: React.CSSProperties = {
    position: 'absolute',
    top: `${((block.gridRowStart - 1) % 4) * 25}%`,
    height: `${block.gridRowSpan * 25}%`,
    left: `${block.column * columnWidth}%`,
    width: `${columnWidth}%`,
    padding: '0 2px',
    zIndex: 10,
    border: `2px ${block.approval_status === 'submitted' ? 'dashed' : 'solid'} currentColor`,
    boxSizing: 'border-box',
    cursor: isEditMode ? 'pointer' : 'default',
    userSelect: 'none',
    touchAction: 'none',
    opacity: ['in_progress', 'returned'].includes(block.approval_status) ? 0.5 : 1,
  };

  return (
    <div
      ref={moduleRef}
      className={`
        schedule-event
        ${colorConfig.bgClass}
        ${colorConfig.textClass}
        ${colorConfig.hoverClass}
        flex flex-col items-center justify-center
        ${block.approval_status === 'submitted' ? 'schedule-event-submitted' : ''}
        ${block.approval_status === 'approved' ? 'schedule-event-approved' : ''}
      `}
      style={style}
      onClick={handleClick}
      title={`${block.name} (${format(block.start, 'HH:mm')} - ${format(block.end, 'HH:mm')})`}
    >
      <div className="font-bold leading-tight">{block.name}</div>
      <div className="italic text-[0.65rem] leading-tight opacity-75 schedule-event-author">{block.authorName}</div>
      {isEditMode && (
        <Move className="absolute top-0.5 right-0.5 h-3 w-3 opacity-50" />
      )}
    </div>
  );
}

export function ScheduleWidget({ 
  startDate, 
  endDate, 
  modules = [], 
  onModuleClick,
  bufferHours = 2,
  event,
  isAdmin = false
}: ScheduleWidgetProps) {
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingModule, setEditingModule] = useState<{id: string, startTime: string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scheduleRef = useRef<HTMLDivElement>(null);
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  useEffect(() => {
    const authorIds = [...new Set(modules.map(m => m.author_id))].filter(Boolean);
    if (authorIds.length === 0) return;

    async function fetchAuthors() {
      try {
        const { data: users, error } = await supabase.rpc('get_user_metadata', {
          user_ids: authorIds
        });

        if (error) throw error;

        if (users) {
          setAuthorNames(
            Object.fromEntries(
              users.map((user: { id: string, display_name: string }) => [user.id, user.display_name || 'Unknown'])
            )
          );
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    }

    fetchAuthors();
  }, [modules]);

  useEffect(() => {
    if (!isEditMode) {
      setEditingModule(null);
    }
  }, [isEditMode]);

  const handleEditClick = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (module) {
      setEditingModule({
        id: moduleId,
        startTime: utcToDateTimeLocal(module.start_time)
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingModule) return;

    try {
      const newStartTime = parseISO(editingModule.startTime);
      
      // Validate the new time is within event bounds
      if (newStartTime < startDate || newStartTime > endDate) {
        setError('Module must be scheduled within event hours');
        return;
      }

      const { error: updateError } = await supabase
        .from('modules')
        .update({
          start_time: dateTimeLocalToUTC(editingModule.startTime)
        })
        .eq('id', editingModule.id);

      if (updateError) throw updateError;

      // Fetch updated modules list
      const { data: updatedModules, error: fetchError } = await supabase
        .from('modules')
        .select('*')
        .eq('event_id', modules[0]?.event_id);

      if (fetchError) throw fetchError;
      
      // Update the modules prop through the parent component
      if (onModuleClick) {
        // Use onModuleClick as a trigger to refresh the parent
        onModuleClick(editingModule.id);
      }
      
      setEditingModule(null);
      setError(null);
    } catch (err) {
      console.error('Error updating module time:', err);
      setError('Failed to update module time');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const scheduleContent = scheduleRef.current;
    if (!scheduleContent) return;

    // Create a title that includes the date range
    const dateRangeTitle = `${event?.name ? `${event.name} - ` : ''}Schedule: ${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${dateRangeTitle}</title>
          <link href="https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&family=MedievalSharp&display=swap" rel="stylesheet">
          <style>
            @page {
              size: landscape;
              margin: 1cm;
            }
            
            body {
              margin: 0;
              padding: 20px;
              font-family: 'Crimson Text', serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .schedule-print-title {
              font-family: 'MedievalSharp', cursive;
              text-align: center;
              color: #2D3748;
              margin-bottom: 20px;
              font-size: 24px;
            }

            .schedule-grid {
              display: grid;
              grid-template-columns: 5rem repeat(${days.length}, minmax(150px, 1fr));
              width: 100%;
              background: #FDF6E3;
              border: 1px solid #F7E2C3;
              line-height: 1;
            }

            .schedule-header-cell {
              padding: 4px;
              font-weight: bold;
              text-align: center;
              border: 1px solid #F7E2C3;
              background: #FAECD3;
              font-size: 12px;
            }

            .schedule-time-column {
              padding: 2px 4px;
              text-align: right;
              border: 1px solid #F7E2C3;
              height: 16px;
              display: flex;
              align-items: center;
              justify-content: flex-end;
              background: #FDF6E3;
              font-size: 10px;
            }

            .schedule-cell {
              position: relative;
              border: 1px solid #F7E2C3;
              height: 16px;
              background: #FFFBF2;
              padding: 0;
            }

            .schedule-cell-outside {
              background: #FAECD3;
              opacity: 0.75;
            }

            .schedule-event {
              position: absolute;
              border-radius: 2px;
              padding: 1px 4px;
              font-size: 9px;
              overflow: hidden;
              white-space: nowrap;
              text-overflow: ellipsis;
              box-shadow: none;
              box-sizing: border-box;
              line-height: 1.2;
            }

            .schedule-event-author {
              font-size: 7px;
              opacity: 0.75;
              display: block;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            /* Color classes */
            .bg-blue-100 { background: #EBF8FF; color: #2C5282; border: 1px solid #4299E1; }
            .bg-green-100 { background: #F0FFF4; color: #276749; border: 1px solid #48BB78; }
            .bg-purple-100 { background: #FAF5FF; color: #553C9A; border: 1px solid #9F7AEA; }
            .bg-orange-100 { background: #FFFAF0; color: #9C4221; border: 1px solid #ED8936; }
            .bg-pink-100 { background: #FFF5F7; color: #97266D; border: 1px solid #ED64A6; }
            .bg-cyan-100 { background: #E6FFFA; color: #234E52; border: 1px solid #38B2AC; }

            .schedule-event-submitted { border-style: dashed !important; }
            .schedule-event-approved { border-style: solid !important; }
          </style>
        </head>
        <body>
          <h1 class="schedule-print-title">${dateRangeTitle}</h1>
          ${scheduleContent.outerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.onafterprint = () => printWindow.close();
      }, 1000);
    };
  };

  const getModuleBlocks = (day: Date): ModuleBlock[] => {
    const dayModules = modules
      .map(module => {
        const moduleStart = toLocalTime(module.start_time);
        const moduleEnd = addHours(moduleStart, module.duration);
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);

        const startsInDay = isWithinInterval(moduleStart, { start: dayStart, end: dayEnd });
        const spansDay = isBefore(moduleStart, dayStart) && isAfter(moduleEnd, dayEnd);
        const endsInDay = !spansDay && isWithinInterval(moduleEnd, { start: dayStart, end: dayEnd });

        const blockStart = isBefore(moduleStart, dayStart) ? dayStart : moduleStart;
        const blockEnd = isAfter(moduleEnd, dayEnd) ? dayEnd : moduleEnd;

        const durationInMinutes = differenceInMinutes(blockEnd, blockStart);
        
        if ((startsInDay || spansDay || endsInDay) && durationInMinutes > 0) {
          const gridRowStart = blockStart.getHours() * 4 + Math.floor(blockStart.getMinutes() / 15) + 1;
          const durationInQuarters = durationInMinutes / 15;

          return {
            id: module.id,
            name: module.name,
            authorName: authorNames[module.author_id] || 'Unknown',
            start: moduleStart,
            end: moduleEnd,
            color: module.color || 'blue',
            gridRowStart,
            gridRowSpan: Math.max(1, Math.round(durationInQuarters)),
            column: 0,
            columnCount: 1,
            approval_status: module.approval_status
          };
        }

        return null;
      })
      .filter((block): block is ModuleBlock => block !== null);

    dayModules.sort((a, b) => {
      const startDiff = a.start.getTime() - b.start.getTime();
      if (startDiff === 0) {
        return b.gridRowSpan - a.gridRowSpan;
      }
      return startDiff;
    });

    const groups: ModuleBlock[][] = [];
    dayModules.forEach(block => {
      const overlappingGroup = groups.find(group =>
        group.some(existingBlock =>
          areIntervalsOverlapping(
            { start: block.start, end: block.end },
            { start: existingBlock.start, end: existingBlock.end }
          )
        )
      );

      if (overlappingGroup) {
        overlappingGroup.push(block);
      } else {
        groups.push([block]);
      }
    });

    groups.forEach(group => {
      const columnCount = group.length;
      group.forEach((block, index) => {
        block.column = index;
        block.columnCount = columnCount;
      });
    });

    return dayModules;
  };

  const isOutsideEventHours = (day: Date, hour: number): boolean => {
    const cellDate = new Date(day);
    cellDate.setHours(hour, 0, 0, 0);
    return isBefore(cellDate, startDate) || isAfter(cellDate, endDate);
  };

  return (
    <div className="relative">
      <div className="absolute -top-12 right-0 flex items-center space-x-4">
        {isAdmin && (
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`btn ${isEditMode ? 'btn-primary' : 'btn-secondary'} btn-with-icon`}
            title={isEditMode ? 'Exit edit mode' : 'Enter edit mode'}
          >
            <Move className="h-4 w-4 mr-2" />
            {isEditMode ? 'Exit Edit Mode' : 'Edit Schedule'}
          </button>
        )}
        <button
          onClick={handlePrint}
          className="btn btn-secondary btn-with-icon"
          title="Print schedule"
        >
          <Printer className="h-4 w-4 mr-2" />
          Print
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-100 border border-red-400 p-4">
          <div className="text-sm font-medieval text-red-800">{error}</div>
        </div>
      )}

      {isEditMode && (
        <div className="mb-4 bg-parchment-100 rounded-md p-4 border border-parchment-300">
          <p className="text-sm font-medieval text-ink-light">
            Click on a module to edit its scheduled time.
          </p>
        </div>
      )}

      <div 
        ref={scheduleRef} 
        className="schedule-grid" 
        style={{ 
          '--day-count': days.length,
          userSelect: isEditMode ? 'none' : 'text',
        } as React.CSSProperties}
      >
        <div className="schedule-header-cell" />
        {days.map(day => (
          <div key={day.toISOString()} className="schedule-header-cell">
            {format(day, 'MMM d')}
          </div>
        ))}

        {Array.from({ length: 24 }, (_, hour) => (
          <React.Fragment key={hour}>
            <div className="schedule-time-column">
              {format(new Date().setHours(hour, 0, 0, 0), 'HH:mm')}
            </div>

            {days.map(day => {
              const blocks = getModuleBlocks(day);
              const isOutside = isOutsideEventHours(day, hour);
              const cellId = `${day.toISOString()}-${hour}`;

              return (
                <div
                  key={cellId}
                  data-cell-id={cellId}
                  className={`schedule-cell ${isOutside ? 'schedule-cell-outside' : ''} ${isEditMode ? 'cursor-copy' : ''}`}
                  style={{
                    display: 'grid',
                    gridTemplateRows: 'repeat(4, 1fr)',
                    position: 'relative'
                  }}
                >
                  {blocks
                    .filter(block => block.gridRowStart >= hour * 4 + 1 && 
                                   block.gridRowStart < (hour + 1) * 4 + 1)
                    .map(block => {
                      const colorConfig = MODULE_COLORS.find(c => c.id === block.color) || MODULE_COLORS[0];
                      const columnWidth = 100 / block.columnCount;

                      return (
                        <Module
                          key={block.id}
                          block={block}
                          colorConfig={colorConfig}
                          columnWidth={columnWidth}
                          isEditMode={isEditMode}
                          onModuleClick={onModuleClick}
                          onEditClick={handleEditClick}
                        />
                      );
                    })}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Edit Time Modal */}
      {editingModule && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <h2 className="modal-title">Edit Module Time</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="start_time" className="form-label">Start Time</label>
                <input
                  type="datetime-local"
                  id="start_time"
                  value={editingModule.startTime}
                  onChange={(e) => setEditingModule({ ...editingModule, startTime: e.target.value })}
                  className="form-input"
                  min={startDate.toISOString().slice(0, 16)}
                  max={endDate.toISOString().slice(0, 16)}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingModule(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="btn btn-primary"
                >
                  Apply Change
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}