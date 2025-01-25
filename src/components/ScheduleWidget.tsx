import React from 'react';
import { format, addHours, eachDayOfInterval, isWithinInterval, isBefore, isAfter, startOfDay, endOfDay, areIntervalsOverlapping, differenceInMinutes } from 'date-fns';
import type { Module, ModuleColor } from '../lib/types';
import { MODULE_COLORS } from '../lib/colors';
import { toLocalTime } from '../lib/dates';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type ScheduleWidgetProps = {
  startDate: Date;
  endDate: Date;
  modules: Module[];
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
}

export function ScheduleWidget({ 
  startDate, 
  endDate, 
  modules, 
  onModuleClick,
  bufferHours = 2 
}: ScheduleWidgetProps) {
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({});
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  useEffect(() => {
    // Fetch author display names from auth.users
    const authorIds = [...new Set(modules.map(m => m.author_id))].filter(Boolean);
    if (authorIds.length === 0) return;

    async function fetchAuthors() {
      const { data: users, error } = await supabase.rpc('get_user_metadata', {
        user_ids: authorIds
      });

      if (users) {
        setAuthorNames(
          Object.fromEntries(
            users.map((user: { id: string, display_name: string }) => [user.id, user.display_name || 'Unknown'])
          )
        );
      } else if (error) {
        console.error('Error fetching user data:', error);
      }
    }

    fetchAuthors();
  }, [modules]);

  // Add buffer hours before and after
  const displayStart = new Date(startDate);
  displayStart.setHours(displayStart.getHours() - bufferHours);
  const displayEnd = new Date(endDate);
  displayEnd.setHours(displayEnd.getHours() + bufferHours);

  // Calculate module blocks for proper grid positioning
  const getModuleBlocks = (day: Date): ModuleBlock[] => {
    const dayModules = modules
      .map(module => {
        // Convert UTC times to local
        const moduleStart = toLocalTime(module.start_time);
        const moduleEnd = addHours(moduleStart, module.duration);
        
        // Get the start and end of the current day
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);

        // Check if module belongs in this day
        const startsInDay = isWithinInterval(moduleStart, { start: dayStart, end: dayEnd });
        const spansDay = isBefore(moduleStart, dayStart) && isAfter(moduleEnd, dayEnd);
        const endsInDay = !spansDay && isWithinInterval(moduleEnd, { start: dayStart, end: dayEnd });

        // Calculate the effective start and end times for this day's block
        const blockStart = isBefore(moduleStart, dayStart) ? dayStart : moduleStart;
        const blockEnd = isAfter(moduleEnd, dayEnd) ? dayEnd : moduleEnd;

        // Only create a block if there's at least one minute of duration
        const durationInMinutes = differenceInMinutes(blockEnd, blockStart);
        
        if ((startsInDay || spansDay || endsInDay) && durationInMinutes > 0) {
          // Calculate grid positioning
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
            columnCount: 1
          };
        }

        return null;
      })
      .filter((block): block is ModuleBlock => block !== null);

    // Sort blocks by start time and duration
    dayModules.sort((a, b) => {
      const startDiff = a.start.getTime() - b.start.getTime();
      if (startDiff === 0) {
        return b.gridRowSpan - a.gridRowSpan; // Longer events first
      }
      return startDiff;
    });

    // Group overlapping blocks
    const groups: ModuleBlock[][] = [];
    dayModules.forEach(block => {
      // Find a group where this block overlaps with any existing block
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

    // Assign columns within each group
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
    
    // Check if the cell's date and time is before the event start or after the event end
    return isBefore(cellDate, startDate) || isAfter(cellDate, endDate);
  };

  return (
    <div className="schedule-grid" style={{ '--day-count': days.length } as React.CSSProperties}>
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
                  gridTemplateRows: 'repeat(4, 1fr)', // 15-minute intervals
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
                      <div
                        key={block.id}
                        className={`schedule-event ${colorConfig.bgClass} ${colorConfig.textClass} ${colorConfig.hoverClass} flex flex-col items-center justify-center`}
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
  );
}