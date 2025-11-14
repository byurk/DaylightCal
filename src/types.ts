import { DateTime } from 'luxon';

export type CalendarView = 'month' | 'week';

export interface CalendarListEntry {
  id: string;
  summary: string;
  primary: boolean;
  backgroundColor?: string;
  foregroundColor?: string;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  calendarSummary: string;
  title: string;
  start: DateTime;
  end: DateTime;
  isAllDay: boolean;
  hangoutLink?: string;
  location?: string;
  description?: string;
  color?: string;
}

export interface DateRange {
  start: DateTime;
  end: DateTime;
}

export interface EventSegment {
  event: CalendarEvent;
  start: DateTime;
  end: DateTime;
  top: number;
  height: number;
  column: number;
  columnSpan: number;
}

export interface DaylightWindow {
  isoDate: string;
  sunrise: DateTime | null;
  sunset: DateTime | null;
  isPolarDay: boolean;
  isPolarNight: boolean;
}

export interface Coordinates {
  lat: number;
  lon: number;
}
