import { Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO, isSameDay, isWithinInterval, endOfDay, startOfDay } from 'date-fns';
import type { Event } from '../lib/types';

type EventCalendarProps = {
  events: Event[];
  month: Date;
  onDayClick?: (date: Date) => void;
};

export function EventCalendar({ events, month, onDayClick }: EventCalendarProps) {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const days = eachDayOfInterval({ start, end });

  // Check if a day has any events or falls within event durations
  const getDayEventInfo = (day: Date) => {
    const dayEvents = events.filter(event => {
      const eventStart = parseISO(event.start_time);
      const eventEnd = parseISO(event.end_time);
      
      // Check if any part of the day falls within the event duration
      // Use startOfDay and endOfDay to ensure we catch any event that overlaps with the day
      return isWithinInterval(startOfDay(day), { start: startOfDay(eventStart), end: endOfDay(eventEnd) }) ||
             isWithinInterval(endOfDay(day), { start: startOfDay(eventStart), end: endOfDay(eventEnd) }) ||
             isWithinInterval(eventStart, { start: startOfDay(day), end: endOfDay(day) });
    });

    const startingEvents = events.filter(event => 
      isSameDay(parseISO(event.start_time), day)
    );

    return {
      hasEvents: dayEvents.length > 0,
      isEventStart: startingEvents.length > 0,
      events: dayEvents,
      startingEvents
    };
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center">
          <CalendarIcon className="h-5 w-5 text-gray-400" />
          <h2 className="ml-2 text-lg font-medium text-gray-900">
            {format(month, 'MMMM yyyy')}
          </h2>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-7 gap-px">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
          {Array.from({ length: start.getDay() }).map((_, i) => (
            <div key={`empty-start-${i}`} className="bg-gray-50 h-14" />
          ))}
          {days.map(day => {
            const { hasEvents, isEventStart, events: dayEvents, startingEvents } = getDayEventInfo(day);
            const isTodays = isToday(day);

            return (
              <div
                key={day.toISOString()}
                onClick={() => onDayClick?.(day)}
                className={`
                  group relative h-14 border -mt-px -ml-px transition-colors duration-200
                  ${hasEvents 
                    ? 'bg-indigo-50 hover:bg-indigo-100 cursor-pointer border-indigo-200' 
                    : 'bg-white hover:bg-gray-50 cursor-pointer border-gray-100'
                  }
                  ${isTodays ? 'font-semibold' : ''}
                `}
              >
                <div className={`
                  px-2 py-1
                  ${isTodays ? 'text-indigo-600' : hasEvents ? 'text-indigo-900' : 'text-gray-700'}
                `}>
                  {format(day, 'd')}
                  
                  {/* Event indicators */}
                  {hasEvents && (
                    <div className="absolute inset-0 flex items-end justify-center pb-1">
                      <div className="flex -space-x-1">
                        {isEventStart && startingEvents.slice(0, 3).map(event => (
                          <div
                            key={event.id}
                            className="h-1.5 w-1.5 rounded-full bg-indigo-600"
                            title={event.name}
                          />
                        ))}
                        {isEventStart && startingEvents.length > 3 && (
                          <div className="h-1.5 w-1.5 rounded-full bg-indigo-300" />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Hover tooltip */}
                  {hasEvents && (
                    <div className="absolute left-full top-0 ml-2 hidden group-hover:block z-10">
                      <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                        {dayEvents.map(event => (
                          <div key={event.id} className="py-0.5">
                            {event.name}
                          </div>
                        ))}
                      </div>
                      <div className="absolute top-2 -left-1 w-0 h-0 border-t-4 border-r-4 border-b-4 border-transparent border-r-gray-900" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {Array.from({ length: (6 * 7) - days.length - start.getDay() }).map((_, i) => (
            <div key={`empty-end-${i}`} className="bg-gray-50 h-14" />
          ))}
        </div>
      </div>
    </div>
  );
}