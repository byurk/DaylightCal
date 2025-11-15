import type { CalendarEvent } from '../types';

interface EventPopoverProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
  deleting?: boolean;
}

export function EventPopover({ event, onClose, onEdit, onDelete, deleting }: EventPopoverProps) {
  if (!event) return null;
  const isMultiDay = !event.isAllDay && !event.start.hasSame(event.end, 'day');
  const timeLabel = event.isAllDay
    ? 'All day'
    : isMultiDay
      ? `${event.start.toFormat('LLL d, HH:mm')} → ${event.end.toFormat('LLL d, HH:mm')}`
      : `${event.start.toFormat('HH:mm')} – ${event.end.toFormat('HH:mm')}`;
  return (
    <div className="event-popover" role="dialog" aria-modal="false">
      <div className="event-popover-card">
        <header>
          <div>
            <h3>{event.title}</h3>
            <p className="helper-text">{event.calendarSummary}</p>
          </div>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="meta-row">
          <span aria-label="Event time">🕒</span>
          <span>{timeLabel}</span>
        </div>
        {event.location && (
          <div className="meta-row">
            <span aria-label="Event location">📍</span>
            <span>{event.location}</span>
          </div>
        )}
        {event.hangoutLink && (
          <div className="meta-row">
            <span aria-label="Meeting link">🔗</span>
            <a href={event.hangoutLink} target="_blank" rel="noreferrer">
              Join meeting
            </a>
          </div>
        )}
        {event.description && <p className="helper-text">{event.description}</p>}
        <div className="event-popover-actions">
          <button type="button" className="btn" onClick={() => onEdit(event)}>
            Edit
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => onDelete(event)}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
