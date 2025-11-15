import { FormEvent, useEffect, useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import type { CalendarEventDraft, CalendarListEntry } from '../types';

interface EventEditorProps {
  draft: CalendarEventDraft | null;
  calendars: CalendarListEntry[];
  mode: 'create' | 'edit';
  saving: boolean;
  deleting: boolean;
  onClose: () => void;
  onSubmit: (draft: CalendarEventDraft) => Promise<void>;
  onDelete?: () => Promise<void>;
}

const FORMAT_DATETIME = "yyyy-LL-dd'T'HH:mm";
const FORMAT_DATE = 'yyyy-LL-dd';

export function EventEditor({ draft, calendars, mode, saving, deleting, onClose, onSubmit, onDelete }: EventEditorProps) {
  const [title, setTitle] = useState('');
  const [calendarId, setCalendarId] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [startValue, setStartValue] = useState('');
  const [endValue, setEndValue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!draft) return;
    setTitle(draft.title || '');
    setCalendarId(draft.calendarId);
    setIsAllDay(draft.isAllDay);
    setLocation(draft.location || '');
    setDescription(draft.description || '');
    if (draft.isAllDay) {
      setStartDate(draft.start.startOf('day').toFormat(FORMAT_DATE));
      const exclusiveEnd = draft.end.plus({ milliseconds: 1 }).startOf('day');
      setEndDate(exclusiveEnd.toFormat(FORMAT_DATE));
      setStartValue('');
      setEndValue('');
    } else {
      setStartValue(draft.start.toFormat(FORMAT_DATETIME));
      setEndValue(draft.end.toFormat(FORMAT_DATETIME));
      setStartDate('');
      setEndDate('');
    }
    setError(null);
  }, [draft]);

  const canSubmit = useMemo(() => {
    if (!draft) return false;
    if (isAllDay) {
      return Boolean(startDate && endDate && calendarId);
    }
    return Boolean(startValue && endValue && calendarId);
  }, [draft, isAllDay, startDate, endDate, startValue, endValue, calendarId]);

  if (!draft) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    let start: DateTime;
    let end: DateTime;
    if (isAllDay) {
      start = DateTime.fromFormat(startDate, FORMAT_DATE).startOf('day');
      const exclusiveEnd = DateTime.fromFormat(endDate, FORMAT_DATE).startOf('day');
      if (!exclusiveEnd.isValid || !start.isValid) {
        setError('Enter valid dates');
        return;
      }
      end = exclusiveEnd.minus({ milliseconds: 1 });
    } else {
      start = DateTime.fromFormat(startValue, FORMAT_DATETIME);
      end = DateTime.fromFormat(endValue, FORMAT_DATETIME);
      if (!start.isValid || !end.isValid) {
        setError('Enter valid times');
        return;
      }
    }
    if (end <= start) {
      setError('End must be after start');
      return;
    }
    try {
      await onSubmit({
        ...draft,
        calendarId,
        title: title.trim() || 'Untitled event',
        start: isAllDay ? start.startOf('day') : start,
        end: isAllDay ? end : end,
        isAllDay,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save event');
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete event');
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <form className="event-editor" onSubmit={handleSubmit}>
        <header className="event-editor__header">
          <div>
            <h3>{mode === 'create' ? 'Create event' : 'Edit event'}</h3>
            <p className="helper-text">{calendars.find((cal) => cal.id === calendarId)?.summary}</p>
          </div>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            Close
          </button>
        </header>
        <label>
          Title
          <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          Calendar
          <select value={calendarId} onChange={(event) => setCalendarId(event.target.value)} disabled={mode === 'edit'}>
            {calendars.map((calendar) => (
              <option key={calendar.id} value={calendar.id}>
                {calendar.summary}
              </option>
            ))}
          </select>
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={isAllDay}
            onChange={(event) => setIsAllDay(event.target.checked)}
          />
          All day
        </label>
        {isAllDay ? (
          <div className="event-editor__row">
            <label>
              Start date
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </label>
            <label>
              End date
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </label>
          </div>
        ) : (
          <div className="event-editor__row">
            <label>
              Starts
              <input type="datetime-local" value={startValue} onChange={(event) => setStartValue(event.target.value)} />
            </label>
            <label>
              Ends
              <input type="datetime-local" value={endValue} onChange={(event) => setEndValue(event.target.value)} />
            </label>
          </div>
        )}
        <label>
          Location
          <input type="text" value={location} onChange={(event) => setLocation(event.target.value)} />
        </label>
        <label>
          Description
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
        </label>
        {error && (
          <p className="helper-text" role="alert">
            {error}
          </p>
        )}
        <div className="event-editor__actions">
          {mode === 'edit' && onDelete && (
            <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleting || saving}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
          <div className="stretch" />
          <button type="submit" className="btn btn-primary" disabled={!canSubmit || saving}>
            {saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
