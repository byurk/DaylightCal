import { DateTime } from 'luxon';
import type { CalendarEventInput } from '../types';

export const MINUTES_IN_DAY = 24 * 60;

export function clampMinutes(value: number) {
  return Math.max(0, Math.min(MINUTES_IN_DAY, value));
}

export function roundMinutesToNearestHour(minutes: number) {
  const clamped = clampMinutes(minutes);
  const hour = Math.round(clamped / 60);
  return Math.min(hour * 60, MINUTES_IN_DAY - 60);
}

export function buildDraftTimes(day: DateTime, clickedMinutes: number) {
  const roundedStartMinutes = roundMinutesToNearestHour(clickedMinutes);
  const start = day.startOf('day').plus({ minutes: roundedStartMinutes });
  const end = start.plus({ hours: 1 });
  return { start, end };
}

export function buildGoogleEventPayload(input: CalendarEventInput, zone: string) {
  if (input.isAllDay) {
    const startDate = input.start.startOf('day');
    const endDate = input.end.plus({ days: 1 }).startOf('day');
    return {
      summary: input.title || 'Untitled event',
      description: input.description,
      location: input.location,
      start: { date: startDate.toISODate() ?? startDate.toFormat('yyyy-LL-dd') },
      end: { date: endDate.toISODate() ?? endDate.toFormat('yyyy-LL-dd') },
    };
  }
  const utcStart = input.start.toUTC().toISO();
  const utcEnd = input.end.toUTC().toISO();
  if (!utcStart || !utcEnd) {
    throw new Error('Invalid event time');
  }
  return {
    summary: input.title || 'Untitled event',
    description: input.description,
    location: input.location,
    start: { dateTime: utcStart, timeZone: zone },
    end: { dateTime: utcEnd, timeZone: zone },
  };
}
