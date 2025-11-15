import { useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import type { CalendarEvent, CalendarView } from './types';
import { CalendarToolbar } from './components/CalendarToolbar';
import { CalendarSelector } from './components/CalendarSelector';
import { LocationPrompt } from './components/LocationPrompt';
import { GoogleAuthPanel } from './components/GoogleAuthPanel';
import { MonthView } from './components/MonthView';
import { WeekView } from './components/WeekView';
import { EventPopover } from './components/EventPopover';
import { getMonthMatrix, getViewRange, getWeekDays, formatToolbarLabel } from './utils/date';
import { useGoogleAuth } from './hooks/useGoogleAuth';
import { useCalendarData } from './hooks/useCalendarData';
import { useDaylight } from './hooks/useDaylight';

const FIRST_DAY_OF_WEEK = 1; // Monday keeps ISO alignment

export default function App() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [view, setView] = useState<CalendarView>('week');
  const [anchorDate, setAnchorDate] = useState(DateTime.local());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

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
            <div className="calendar-week-scroll">
              <WeekView
                days={weekDays}
                events={calendarData.events}
                daylightMap={daylight.daylightMap}
                onSelectEvent={setSelectedEvent}
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

      <EventPopover event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
}
