import { useEffect, useMemo, useRef, useState } from 'react';
import { DateTime } from 'luxon';
import type { CalendarEvent, CalendarEventDraft, CalendarEventInput, CalendarView } from './types';
import { CalendarToolbar } from './components/CalendarToolbar';
import { CalendarSelector } from './components/CalendarSelector';
import { LocationPrompt } from './components/LocationPrompt';
import { GoogleAuthPanel } from './components/GoogleAuthPanel';
import { MonthView } from './components/MonthView';
import { WeekView } from './components/WeekView';
import { EventPopover } from './components/EventPopover';
import { EventEditor } from './components/EventEditor';
import { getMonthMatrix, getViewRange, getWeekDays, formatToolbarLabel } from './utils/date';
import { useGoogleAuth } from './hooks/useGoogleAuth';
import { useCalendarData } from './hooks/useCalendarData';
import { useDaylight } from './hooks/useDaylight';
import { buildDraftTimes } from './utils/events';

const FIRST_DAY_OF_WEEK = 1; // Monday keeps ISO alignment

type EditorState =
  | { mode: 'create'; draft: CalendarEventDraft }
  | { mode: 'edit'; draft: CalendarEventDraft; event: CalendarEvent };

export default function App() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [view, setView] = useState<CalendarView>('week');
  const [anchorDate, setAnchorDate] = useState(DateTime.local());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const weekScrollRef = useRef<HTMLDivElement | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorDeleting, setEditorDeleting] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  const viewRange = useMemo(() => getViewRange(view, anchorDate, FIRST_DAY_OF_WEEK), [view, anchorDate]);
  const weekDays = useMemo(() => getWeekDays(anchorDate, FIRST_DAY_OF_WEEK), [anchorDate]);
  const monthMatrix = useMemo(() => getMonthMatrix(anchorDate, FIRST_DAY_OF_WEEK), [anchorDate]);

  const auth = useGoogleAuth(clientId);
  const calendarData = useCalendarData(auth.isAuthorized ? auth.accessToken : null, auth.isAuthorized ? viewRange : null);
  const daylight = useDaylight(view === 'week' ? viewRange : null);

  const subtitle = `${DateTime.local().toFormat('cccc, LLL d')} • ${DateTime.local().toFormat('ZZZZ')}`;

  const handleNavigate = (direction: 'prev' | 'next') => {
    setAnchorDate((current: DateTime) => {
      if (view === 'week') {
        return current.plus({ days: direction === 'next' ? 7 : -7 });
      }
      return current.plus({ months: direction === 'next' ? 1 : -1 });
    });
  };

  const handleToday = () => setAnchorDate(DateTime.local());

  const shouldShowEmptyState = auth.isAuthorized && !calendarData.loadingEvents && !calendarData.events.length;

  useEffect(() => {
    if (view !== 'week') return;
    const container = weekScrollRef.current;
    if (!container) return;
    const rootStyles = getComputedStyle(document.documentElement);
    const hourHeight = Number.parseFloat(rootStyles.getPropertyValue('--grid-hour-height')) || 64;
    const allDayHeight = Number.parseFloat(rootStyles.getPropertyValue('--week-all-day-height')) || 60;
    container.scrollTop = allDayHeight + hourHeight * 6;
  }, [view]);

  const closeEditor = () => {
    if (editorSaving) return;
    setEditorState(null);
    setEditorDeleting(false);
  };

  const defaultCalendarId = useMemo(() => {
    return calendarData.selectedCalendarIds[0] ?? calendarData.calendars[0]?.id ?? null;
  }, [calendarData.selectedCalendarIds, calendarData.calendars]);

  const handleRequestCreateEvent = (day: DateTime, minutes: number) => {
    if (!defaultCalendarId) return;
    const { start, end } = buildDraftTimes(day, minutes);
    setEditorState({
      mode: 'create',
      draft: {
        calendarId: defaultCalendarId,
        title: 'New event',
        start,
        end,
        isAllDay: false,
      },
    });
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setSelectedEvent(null);
    setEditorState({
      mode: 'edit',
      event,
      draft: {
        calendarId: event.calendarId,
        title: event.title,
        start: event.start,
        end: event.end,
        isAllDay: event.isAllDay,
        location: event.location,
        description: event.description,
      },
    });
  };

  const handleSaveDraft = async (draft: CalendarEventDraft) => {
    if (!editorState) return;
    setEditorSaving(true);
    const input: CalendarEventInput = {
      calendarId: draft.calendarId,
      title: draft.title,
      start: draft.start,
      end: draft.end,
      isAllDay: draft.isAllDay,
      location: draft.location,
      description: draft.description,
    };
    try {
      if (editorState.mode === 'create') {
        await calendarData.createEvent(input);
      } else {
        await calendarData.updateEvent(editorState.event, input);
      }
      setEditorState(null);
    } finally {
      setEditorSaving(false);
    }
  };

  const handleDeleteEvent = async (event: CalendarEvent) => {
    setDeletingEventId(event.id);
    try {
      await calendarData.deleteEvent(event);
      setSelectedEvent((current) => (current?.id === event.id ? null : current));
      if (editorState?.mode === 'edit' && editorState.event.id === event.id) {
        setEditorState(null);
      }
    } finally {
      setDeletingEventId(null);
    }
  };

  const handleDeleteFromEditor = async () => {
    if (!editorState || editorState.mode !== 'edit') return;
    setEditorDeleting(true);
    try {
      await handleDeleteEvent(editorState.event);
      setEditorState(null);
    } finally {
      setEditorDeleting(false);
    }
  };

  const handleEventTimeChange = (event: CalendarEvent, start: DateTime, end: DateTime) => {
    const input: CalendarEventInput = {
      calendarId: event.calendarId,
      title: event.title,
      start,
      end,
      isAllDay: event.isAllDay,
      location: event.location,
      description: event.description,
    };
    calendarData.updateEvent(event, input);
  };

  if (!clientId) {
    return (
      <div className="app-shell">
        <div className="surface-card empty-state">
          <h2>Missing Google OAuth client</h2>
          <p>Create a client id and expose it as <code>VITE_GOOGLE_CLIENT_ID</code> before running the app.</p>
        </div>
      </div>
    );
  }

  const shellClass = view === 'week' ? 'app-shell app-shell--week' : 'app-shell';
  const bodyClass = `calendar-body calendar-body--${view}`;

  return (
    <div className={shellClass}>
      <CalendarToolbar
        view={view}
        label={formatToolbarLabel(view, anchorDate)}
        subtitle={subtitle}
        onViewChange={setView}
        onNavigate={handleNavigate}
        onToday={handleToday}
      />

      {calendarData.error && (
        <div className="surface-card helper-text" role="alert" style={{ padding: '0.75rem 1rem' }}>
          {calendarData.error}
        </div>
      )}

      <div className="calendar-layout">
        <div className="calendar-side">
          <GoogleAuthPanel
            status={auth.status}
            isAuthorized={auth.isAuthorized}
            onSignIn={auth.signIn}
            onSignOut={auth.signOut}
            error={auth.error}
          />
          <CalendarSelector
            calendars={calendarData.calendars}
            selectedIds={calendarData.selectedCalendarIds}
            onToggle={calendarData.toggleCalendar}
            loading={calendarData.loadingCalendars}
          />
          <LocationPrompt
            status={daylight.status}
            label={daylight.label}
            coords={daylight.coords}
            error={daylight.error}
            onRequestGeolocation={daylight.requestGeolocation}
            onSubmitManual={daylight.setManualLocation}
          />
        </div>
        <div className={bodyClass}>
          {view === 'week' ? (
            <div className="calendar-week-scroll" ref={weekScrollRef}>
              <WeekView
                days={weekDays}
                events={calendarData.events}
                daylightMap={daylight.daylightMap}
                onSelectEvent={setSelectedEvent}
                onRequestCreate={handleRequestCreateEvent}
                onEventTimeChange={handleEventTimeChange}
              />
            </div>
          ) : (
            <MonthView
              matrix={monthMatrix}
              month={anchorDate.month}
              events={calendarData.events}
              onSelectEvent={setSelectedEvent}
            />
          )}
          {calendarData.loadingEvents && <div className="surface-card helper-text">Syncing events…</div>}
          {shouldShowEmptyState && <div className="surface-card empty-state">No events in this range.</div>}
        </div>
      </div>

      <EventPopover
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onEdit={handleEditEvent}
        onDelete={(event) => {
          void handleDeleteEvent(event);
        }}
        deleting={selectedEvent ? deletingEventId === selectedEvent.id : false}
      />

      <EventEditor
        draft={editorState?.draft ?? null}
        calendars={calendarData.calendars}
        mode={editorState?.mode ?? 'create'}
        saving={editorSaving}
        deleting={editorDeleting}
        onClose={closeEditor}
        onSubmit={handleSaveDraft}
        onDelete={editorState?.mode === 'edit' ? handleDeleteFromEditor : undefined}
      />
    </div>
  );
}
