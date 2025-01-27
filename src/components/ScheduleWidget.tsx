import React from 'react';
import { format, addHours, eachDayOfInterval, isWithinInterval, isBefore, isAfter, startOfDay, endOfDay, areIntervalsOverlapping, differenceInMinutes } from 'date-fns';
import type { Module, ModuleColor } from '../lib/types';
import { MODULE_COLORS } from '../lib/colors';
import { toLocalTime } from '../lib/dates';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Printer } from 'lucide-react';

type ScheduleWidgetProps = {
  startDate: Date;
  endDate: Date;
  modules?: Module[];
  onModuleClick?: (moduleId: string) => void;
  bufferHours?: number;
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

export function ScheduleWidget({ 
  startDate, 
  endDate, 
  modules = [], 
  onModuleClick,
  bufferHours = 2 
}: ScheduleWidgetProps) {
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({});
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

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Get the schedule element's content
    const scheduleContent = scheduleRef.current;
    if (!scheduleContent) return;

    // Create print-friendly styles
    const printStyles = `
      <style>
        @media print {
          @page {
            size: landscape;
            margin: 1cm;
          }
          
          body { 
            margin: 0;
            padding: 20px;
            font-family: 'Crimson Text', serif;
            color: #2D3748;
          }

          h1 {
            font-family: 'MedievalSharp', cursive;
            text-align: center;
            margin-bottom: 20px;
            color: #2D3748;
          }

          .schedule-grid {
            display: grid;
            grid-template-columns: 5rem repeat(${days.length}, minmax(150px, 1fr));
            min-width: 800px;
            background: #FDF6E3;
            border: 1px solid #F7E2C3;
            page-break-inside: avoid;
          }

          .schedule-header-cell {
            padding: 12px;
            font-weight: bold;
            text-align: center;
            border: 1px solid #F7E2C3;
            background: #FAECD3;
          }

          .schedule-time-column {
            padding: 8px;
            text-align: right;
            border: 1px solid #F7E2C3;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            background: #FDF6E3;
          }

          .schedule-cell {
            position: relative;
            border: 1px solid #F7E2C3;
            height: 48px;
            background: #FFFBF2;
          }

          .schedule-cell-outside {
            background: #FAECD3;
            opacity: 0.75;
          }

          .schedule-event {
            position: absolute;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 12px;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }

          /* Color classes for print */
          .print-color-blue { background: #EBF8FF; color: #2C5282; }
          .print-color-green { background: #F0FFF4; color: #276749; }
          .print-color-purple { background: #FAF5FF; color: #553C9A; }
          .print-color-orange { background: #FFFAF0; color: #9C4221; }
          .print-color-pink { background: #FFF5F7; color: #97266D; }
          .print-color-cyan { background: #E6FFFA; color: #234E52; }

          /* Dotted border for submitted modules */
          .schedule-event-submitted {
            border: 2px dashed currentColor;
            background: transparent !important;
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
          <title>Schedule - ${format(startDate, 'PPP')} to ${format(endDate, 'PPP')}</title>
          ${printStyles}
        </head>
        <body>
          <h1>Schedule: ${format(startDate, 'PPP')} to ${format(endDate, 'PPP')}</h1>
          ${scheduleContent.outerHTML.replace(/bg-\w+-\d+/g, '').replace(
            /(blue|green|purple|orange|pink|cyan)-\d+/g, 
            (match) => `print-color-${match.split('-')[0]}`
          )}
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

  // Add buffer hours before and after
  const displayStart = new Date(startDate);
  displayStart.setHours(displayStart.getHours() - bufferHours);
  const displayEnd = new Date(endDate);
  displayEnd.setHours(displayEnd.getHours() + bufferHours);

  const getModuleBlocks = (day: Date): ModuleBlock[] => {
    const dayModules = modules
      .filter(module => ['submitted', 'approved'].includes(module.approval_status))
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
      <button
        onClick={handlePrint}
        className="absolute -top-12 right-0 btn btn-secondary btn-with-icon"
        title="Print schedule"
      >
        <Printer className="h-4 w-4 mr-2" />
        Print
      </button>
      <div ref={scheduleRef} className="schedule-grid" style={{ '--day-count': days.length } as React.CSSProperties}>
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

              return (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  className={`schedule-cell ${isOutside ? 'schedule-cell-outside' : ''}`}
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
                      const isSubmitted = block.approval_status === 'submitted';

                      return (
                        <div
                          key={block.id}
                          className={`
                            schedule-event
                            ${isSubmitted ? 'border-2 border-dashed bg-transparent' : colorConfig.bgClass}
                            ${colorConfig.textClass}
                            ${colorConfig.hoverClass}
                            flex flex-col items-center justify-center
                          `}
                          onClick={() => onModuleClick?.(block.id)}
                          style={{
                            position: 'absolute',
                            top: `${((block.gridRowStart - 1) % 4) * 25}%`,
                            height: `${block.gridRowSpan * 25}%`,
                            left: `${block.column * columnWidth}%`,
                            width: `${columnWidth}%`,
                            padding: '0 2px'
                          }}
                          title={`${block.name} (${format(block.start, 'HH:mm')} - ${format(block.end, 'HH:mm')})`}
                        >
                          <div className="font-bold leading-tight">{block.name}</div>
                          <div className="italic text-[0.65rem] leading-tight opacity-75">{block.authorName}</div>
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}