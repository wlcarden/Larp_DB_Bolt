import { Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO, isSameDay } from 'date-fns';
import type { Event } from '../lib/types';

type CalendarProps = {
  events: Event[];
  month: Date;
  onDayClick?: (date: Date) => void;
};

export function Calendar({ events, month, onDayClick }: CalendarProps) {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const days = eachDayOfInterval({ start, end });

  // Check if a day has any events
  const getDayEvents = (day: Date) => {
    return events.filter(event => {
      const eventStart = parseISO(event.start_time);
      const eventEnd = parseISO(event.end_time);
      return isSameDay(day, eventStart) || isSameDay(day, eventEnd) ||
             (day > eventStart && day < eventEnd);
    });
  };

  // Calculate tooltip position based on day's position in the grid
  const getTooltipPosition = (dayIndex: number) => {
    const column = (dayIndex + start.getDay()) % 7;
    const showOnRight = column < 4; // Show on right for first 3 columns, left for last 4

    return {
      top: '50%',
      transform: 'translateY(-50%)',
      ...(showOnRight
        ? { left: '100%', marginLeft: '0.5rem' }
        : { right: '100%', marginRight: '0.5rem' }
      )
    };
  };

  return (
    <div className="bg-parchment-100/90 backdrop-blur-sm rounded-lg shadow-parchment border border-parchment-300">
      <div className="px-6 py-4 border-b border-parchment-300 bg-parchment-200/50">
        <div className="flex items-center">
          <CalendarIcon className="h-5 w-5 text-ink-light" />
          <h2 className="ml-2 text-lg font-script text-ink">
            {format(month, 'MMMM yyyy')}
          </h2>
        </div>
      </div>
      <div className="p-6 overflow-visible">
        <div className="grid grid-cols-7 gap-px">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-medieval font-semibold text-ink-light py-2">
              {day}
            </div>
          ))}
          {Array.from({ length: start.getDay() }).map((_, i) => (
            <div key={`empty-start-${i}`} className="bg-parchment-200/50 h-14" />
          ))}
          {days.map((day, index) => {
            const dayEvents = getDayEvents(day);
            const isTodays = isToday(day);
            const hasEvents = dayEvents.length > 0;

            return (
              <div
                key={day.toISOString()}
                onClick={() => onDayClick?.(day)}
                className={`
                  group relative h-14 border border-parchment-300 -mt-px -ml-px transition-colors duration-200
                  ${hasEvents 
                    ? 'bg-orange-200 hover:bg-orange-300 cursor-pointer' 
                    : 'bg-parchment-50 hover:bg-parchment-100 cursor-pointer'
                  }
                `}
              >
                <div className={`
                  relative px-2 py-1 font-medieval h-full
                  ${isTodays ? 'font-bold text-ink' : hasEvents ? 'text-ink' : 'text-ink-light'}
                `}>
                  {format(day, 'd')}
                  
                  {/* Current day indicator */}
                  {isTodays && (
                    <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
                  )}

                  {/* Hover tooltip */}
                  {hasEvents && (
                    <div 
                      className="absolute z-50 hidden group-hover:block"
                      style={getTooltipPosition(index)}
                    >
                      <div className="bg-ink text-parchment-50 text-xs rounded py-1 px-2 whitespace-nowrap shadow-lg">
                        {dayEvents.map(event => (
                          <div key={event.id} className="py-0.5">
                            {event.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {Array.from({ length: (6 * 7) - days.length - start.getDay() }).map((_, i) => (
            <div key={`empty-end-${i}`} className="bg-parchment-200/50 h-14" />
          ))}
        </div>
      </div>
    </div>
  );
}