import { DateTime } from 'luxon';
import type { CalendarEvent, CalendarView, DateRange, EventSegment } from '../types';

const MINUTES_IN_DAY = 24 * 60;

const toZeroIndexed = (weekday: number) => weekday % 7;

export function startOfWeek(date: DateTime, firstDay: number): DateTime {
  const normalizedFirst = ((firstDay % 7) + 7) % 7;
  const normalizedWeekday = toZeroIndexed(date.weekday);
  const diff = (normalizedWeekday - normalizedFirst + 7) % 7;
  return date.minus({ days: diff }).startOf('day');
}

export function getWeekDays(anchor: DateTime, firstDay: number): DateTime[] {
  const start = startOfWeek(anchor, firstDay);
  return Array.from({ length: 7 }, (_, i) => start.plus({ days: i }));
}

export function getMonthMatrix(anchor: DateTime, firstDay: number): DateTime[][] {
  const start = startOfWeek(anchor.startOf('month'), firstDay);
  const cells = 42; // keep rows consistent
  return Array.from({ length: cells / 7 }, (_, row) =>
    Array.from({ length: 7 }, (_, col) => start.plus({ days: row * 7 + col })),
  );
}

export function getViewRange(view: CalendarView, anchor: DateTime, firstDay: number): DateRange {
  if (view === 'week') {
    const start = startOfWeek(anchor, firstDay);
    const end = start.plus({ days: 7 }).minus({ milliseconds: 1 });
    return { start, end };
  }

  const startOfMonth = anchor.startOf('month');
  const start = startOfWeek(startOfMonth, firstDay);
  const end = start.plus({ days: 42 }).minus({ milliseconds: 1 });
  return { start, end };
}

export function formatToolbarLabel(view: CalendarView, anchor: DateTime): string {
  if (view === 'month') {
    return anchor.toFormat('LLLL yyyy');
  }

  const weekStart = startOfWeek(anchor, 1);
  const weekEnd = weekStart.plus({ days: 6 });
  const sameMonth = weekStart.month === weekEnd.month;
  const sameYear = weekStart.year === weekEnd.year;

  if (sameMonth && sameYear) {
    return `${weekStart.toFormat('LLL d')} – ${weekEnd.toFormat('d, yyyy')}`;
  }

  if (sameYear) {
    return `${weekStart.toFormat('LLL d')} – ${weekEnd.toFormat('LLL d, yyyy')}`;
  }

  return `${weekStart.toFormat('LLL d, yyyy')} – ${weekEnd.toFormat('LLL d, yyyy')}`;
}

export function getEventSegmentsForDay(
  events: CalendarEvent[],
  day: DateTime,
): { timed: EventSegment[]; allDay: CalendarEvent[] } {
  const startOfDay = day.startOf('day');
  const endOfDay = day.endOf('day');

  const allDay = events.filter((event) => {
    if (!event.isAllDay) return false;
    return event.start <= endOfDay && event.end >= startOfDay;
  });

  const timedBlueprint = events
    .filter((event) => !event.isAllDay)
    .map((event) => {
      const start = event.start < startOfDay ? startOfDay : event.start;
      const end = event.end > endOfDay ? endOfDay : event.end;
      if (end <= start) return null;
      const startMinutes = start.diff(startOfDay, 'minutes').minutes;
      const endMinutes = end.diff(startOfDay, 'minutes').minutes;
      const top = (startMinutes / MINUTES_IN_DAY) * 100;
      const height = Math.max(((endMinutes - startMinutes) / MINUTES_IN_DAY) * 100, 2);
      return { event, start, end, startMinutes, endMinutes, top, height };
    })
    .filter((segment): segment is NonNullable<typeof segment> => Boolean(segment))
    .sort((a, b) => a.start.toMillis() - b.start.toMillis());

  const segments: EventSegment[] = [];
  let cluster: typeof timedBlueprint = [];
  let clusterEnd = 0;

  const flushCluster = () => {
    if (!cluster.length) return;
    const columns: typeof timedBlueprint[] = [];
    cluster.forEach((seg) => {
      let placed = false;
      for (const column of columns) {
        const last = column[column.length - 1];
        if (last.endMinutes <= seg.startMinutes) {
          column.push(seg);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([seg]);
      }
    });
    const totalColumns = columns.length || 1;
    columns.forEach((column, columnIndex) => {
      column.forEach((seg) => {
        segments.push({
          event: seg.event,
          start: seg.start,
          end: seg.end,
          top: seg.top,
          height: seg.height,
          column: columnIndex,
          columnSpan: totalColumns,
        });
      });
    });
    cluster = [];
    clusterEnd = 0;
  };

  timedBlueprint.forEach((seg) => {
    if (!cluster.length) {
      cluster = [seg];
      clusterEnd = seg.endMinutes;
      return;
    }
    if (seg.startMinutes < clusterEnd) {
      cluster.push(seg);
      clusterEnd = Math.max(clusterEnd, seg.endMinutes);
    } else {
      flushCluster();
      cluster = [seg];
      clusterEnd = seg.endMinutes;
    }
  });

  flushCluster();

  return { timed: segments, allDay };
}

export function isSameDay(a: DateTime, b: DateTime): boolean {
  return a.hasSame(b, 'day');
}
