import { DateTime } from 'luxon';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CalendarEvent, CalendarEventInput, CalendarListEntry, DateRange } from '../types';
import { fetchCalendarList, fetchEventsForCalendar, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../utils/google';
import { buildGoogleEventPayload } from '../utils/events';

interface UseCalendarDataResult {
  calendars: CalendarListEntry[];
  selectedCalendarIds: string[];
  events: CalendarEvent[];
  loadingCalendars: boolean;
  loadingEvents: boolean;
  error: string | null;
  toggleCalendar: (id: string) => void;
  refreshCalendars: () => Promise<void>;
  refreshEvents: () => void;
  createEvent: (input: CalendarEventInput) => Promise<void>;
  updateEvent: (event: CalendarEvent, input: CalendarEventInput) => Promise<void>;
  deleteEvent: (event: CalendarEvent) => Promise<void>;
}

const userZone = DateTime.local().zoneName;

export function useCalendarData(token: string | null, range: DateRange | null): UseCalendarDataResult {
  const [calendars, setCalendars] = useState<CalendarListEntry[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rangeKey = range ? `${range.start.toISO()}|${range.end.toISO()}` : '';

  const toggleCalendar = useCallback((id: string) => {
    setSelectedCalendarIds((prev) =>
      prev.includes(id) ? prev.filter((calendarId) => calendarId !== id) : [...prev, id],
    );
  }, []);

  const refreshCalendars = useCallback(async () => {
    if (!token) return;
    setLoadingCalendars(true);
    try {
      const list = await fetchCalendarList(token);
      setCalendars(list);
      setSelectedCalendarIds((current) => {
        if (current.length) return current.filter((id) => list.some((cal) => cal.id === id));
        const primary = list.filter((cal) => cal.primary).map((cal) => cal.id);
        if (primary.length) return primary;
        return list.slice(0, 2).map((cal) => cal.id);
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load calendars');
    } finally {
      setLoadingCalendars(false);
    }
  }, [token]);

  const fetchEvents = useCallback(async () => {
    if (!token || !range || !selectedCalendarIds.length) {
      setEvents([]);
      return;
    }
    setLoadingEvents(true);
    try {
      const startIso = range.start.toUTC().toISO() ?? range.start.toUTC().toISO({ suppressMilliseconds: true });
      const endIso = range.end.toUTC().toISO() ?? range.end.toUTC().toISO({ suppressMilliseconds: true });
      if (!startIso || !endIso) {
        setError('Invalid date range');
        setLoadingEvents(false);
        return;
      }
      const results = await Promise.all(
        selectedCalendarIds.map(async (calendarId) => {
          const raw = await fetchEventsForCalendar(token, calendarId, {
            timeMin: startIso,
            timeMax: endIso,
            timeZone: userZone,
          });
          const calendar = calendars.find((cal) => cal.id === calendarId);
          return raw.map<CalendarEvent>((event) => {
            const isAllDay = Boolean(event.start.date);
            const start = event.start.dateTime
              ? DateTime.fromISO(event.start.dateTime, { zone: event.start.timeZone || 'UTC' }).setZone(userZone)
              : DateTime.fromISO(event.start.date!, { zone: event.start.timeZone || userZone }).startOf('day');
            const endSource = event.end.dateTime || event.end.date;
            let end = event.end.dateTime
              ? DateTime.fromISO(event.end.dateTime, { zone: event.end.timeZone || 'UTC' }).setZone(userZone)
              : DateTime.fromISO(event.end.date!, { zone: event.end.timeZone || userZone }).startOf('day');
            if (isAllDay) {
              end = end.minus({ milliseconds: 1 });
            }
            return {
              id: `${calendarId}-${event.id}`,
              googleEventId: event.id,
              calendarId,
              calendarSummary: calendar?.summary || 'Calendar',
              title: event.summary || 'Untitled event',
              start,
              end,
              isAllDay,
              hangoutLink: event.hangoutLink,
              location: event.location,
              description: event.description,
              color: calendar?.backgroundColor,
            };
          });
        }),
      );
      setEvents(results.flat().sort((a, b) => a.start.toMillis() - b.start.toMillis()));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load events');
    } finally {
      setLoadingEvents(false);
    }
  }, [token, rangeKey, selectedCalendarIds, calendars]);

  useEffect(() => {
    if (!token) {
      setCalendars([]);
      setEvents([]);
      setSelectedCalendarIds([]);
      setLoadingCalendars(false);
      setLoadingEvents(false);
      return;
    }
    refreshCalendars();
  }, [token, refreshCalendars]);

  useEffect(() => {
    if (!token) return;
    fetchEvents();
  }, [token, rangeKey, selectedCalendarIds, fetchEvents]);

  const mutateEvents = useCallback(
    async (mutation: () => Promise<void>) => {
      if (!token) {
        setError('Not authenticated');
        return;
      }
      setLoadingEvents(true);
      try {
        await mutation();
        await fetchEvents();
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to update events');
      } finally {
        setLoadingEvents(false);
      }
    },
    [token, fetchEvents],
  );

  const createEvent = useCallback(
    async (input: CalendarEventInput) => {
      await mutateEvents(async () => {
        if (!token) return;
        const payload = buildGoogleEventPayload(input, userZone);
        await createCalendarEvent(token, input.calendarId, payload);
      });
    },
    [mutateEvents, token],
  );

  const updateEvent = useCallback(
    async (event: CalendarEvent, input: CalendarEventInput) => {
      await mutateEvents(async () => {
        if (!token) return;
        const payload = buildGoogleEventPayload(input, userZone);
        await updateCalendarEvent(token, event.calendarId, event.googleEventId, payload);
      });
    },
    [mutateEvents, token],
  );

  const removeEvent = useCallback(
    async (event: CalendarEvent) => {
      await mutateEvents(async () => {
        if (!token) return;
        await deleteCalendarEvent(token, event.calendarId, event.googleEventId);
      });
    },
    [mutateEvents, token],
  );

  return useMemo(
    () => ({
      calendars,
      selectedCalendarIds,
      events,
      loadingCalendars,
      loadingEvents,
      error,
      toggleCalendar,
      refreshCalendars,
      refreshEvents: fetchEvents,
      createEvent,
      updateEvent,
      deleteEvent: removeEvent,
    }),
    [
      calendars,
      selectedCalendarIds,
      events,
      loadingCalendars,
      loadingEvents,
      error,
      toggleCalendar,
      refreshCalendars,
      fetchEvents,
      createEvent,
      updateEvent,
      removeEvent,
    ],
  );
}
