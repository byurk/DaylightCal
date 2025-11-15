import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import { buildDraftTimes, buildGoogleEventPayload, roundMinutesToNearestHour } from '../events';

describe('roundMinutesToNearestHour', () => {
  it('rounds to the nearest hour within bounds', () => {
    expect(roundMinutesToNearestHour(10)).toEqual(0);
    expect(roundMinutesToNearestHour(31)).toEqual(60);
    expect(roundMinutesToNearestHour(90)).toEqual(120);
  });

  it('clamps to last full hour', () => {
    expect(roundMinutesToNearestHour(1400)).toEqual(1380);
  });
});

describe('buildDraftTimes', () => {
  it('returns a one-hour block snapped to the nearest hour', () => {
    const day = DateTime.fromISO('2024-07-10T00:00:00');
    const { start, end } = buildDraftTimes(day, 95);
    expect(start.hour).toEqual(2);
    expect(start.minute).toEqual(0);
    expect(start.hasSame(day, 'day')).toBe(true);
    expect(end.diff(start, 'hours').hours).toEqual(1);
  });
});

describe('buildGoogleEventPayload', () => {
  it('serializes timed events with timezone metadata', () => {
    const start = DateTime.fromISO('2024-07-10T09:00:00');
    const end = start.plus({ hours: 1 });
    const payload = buildGoogleEventPayload(
      {
        calendarId: 'abc',
        title: 'Test',
        start,
        end,
        isAllDay: false,
      },
      'America/New_York',
    );
    expect(payload.start.dateTime).toBeTruthy();
    expect(payload.start.timeZone).toEqual('America/New_York');
  });

  it('serializes all-day events with date boundaries', () => {
    const day = DateTime.fromISO('2024-07-10T00:00:00');
    const payload = buildGoogleEventPayload(
      {
        calendarId: 'abc',
        title: 'Test',
        start: day,
        end: day.endOf('day'),
        isAllDay: true,
      },
      'UTC',
    );
    expect(payload.start.date).toEqual('2024-07-10');
    expect(payload.end.date).toEqual('2024-07-11');
  });
});
