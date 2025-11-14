import type { CalendarListEntry } from '../types';

interface CalendarSelectorProps {
  calendars: CalendarListEntry[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  loading: boolean;
}

export function CalendarSelector({ calendars, selectedIds, onToggle, loading }: CalendarSelectorProps) {
  return (
    <div className="panel" aria-live="polite">
      <h2>Calendars</h2>
      {loading && <p className="helper-text">Loading calendars…</p>}
      {!loading && !calendars.length && <p className="helper-text">No calendars available</p>}
      <div className="calendar-selector" role="list">
        {calendars.map((calendar) => (
          <label key={calendar.id} className="checkbox-row" role="listitem">
            <input
              type="checkbox"
              checked={selectedIds.includes(calendar.id)}
              onChange={() => onToggle(calendar.id)}
              aria-label={`Toggle ${calendar.summary}`}
            />
            <span className="color-dot" style={{ backgroundColor: calendar.backgroundColor || '#2563eb' }} />
            <span>{calendar.summary}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
