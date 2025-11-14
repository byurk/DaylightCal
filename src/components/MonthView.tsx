import { DateTime } from 'luxon';
import type { CalendarEvent } from '../types';

interface MonthViewProps {
  matrix: DateTime[][];
  month: number;
  onSelectEvent: (event: CalendarEvent) => void;
  events: CalendarEvent[];
}

const eventOccursOnDay = (event: CalendarEvent, day: DateTime) => {
  const startOfDay = day.startOf('day');
  const endOfDay = day.endOf('day');
  return event.start <= endOfDay && event.end >= startOfDay;
};

export function MonthView({ matrix, month, events, onSelectEvent }: MonthViewProps) {
  const headers = matrix[0]?.map((day) => day.toFormat('ccc')) ?? [];
  return (
    <div className="surface-card">
      <div className="month-grid" role="grid" aria-label="Month view">
        <div className="month-grid-header" role="row">
          {headers.map((day) => (
            <div role="columnheader" key={day}>
              {day}
            </div>
          ))}
        </div>
        {matrix.flat().map((day) => {
          const dayEvents = events.filter((event) => eventOccursOnDay(event, day));
          const visibleEvents = dayEvents.slice(0, 3);
          const overflow = dayEvents.length - visibleEvents.length;
          const isToday = day.hasSame(DateTime.local(), 'day');
          const isCurrentMonth = day.month === month;
          return (
            <div
              key={day.toISO()}
              role="gridcell"
              aria-label={day.toLocaleString(DateTime.DATE_FULL)}
              className="month-cell"
              style={{ opacity: isCurrentMonth ? 1 : 0.4 }}
            >
              <div className="month-cell-date">
                <span>{day.day}</span>
                {isToday && <span className="today-pill">Today</span>}
              </div>
              <div className="month-events">
                {visibleEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    className="month-event"
                    style={{ backgroundColor: event.color || '#2563eb' }}
                    onClick={() => onSelectEvent(event)}
                  >
                    {event.isAllDay ? 'All day' : event.start.toFormat('HH:mm')}
                    <span style={{ fontWeight: 600 }}>{event.title}</span>
                  </button>
                ))}
                {overflow > 0 && <span className="helper-text">+{overflow} more</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
