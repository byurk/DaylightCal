import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { DateTime } from 'luxon';
import clsx from 'clsx';
import type { CalendarEvent, DaylightWindow } from '../types';
import { getEventSegmentsForDay, isSameDay } from '../utils/date';
import { getTextColorForBackground } from '../utils/colors';
import { MINUTES_IN_DAY } from '../utils/events';

interface WeekViewProps {
  days: DateTime[];
  events: CalendarEvent[];
  daylightMap: Record<string, DaylightWindow>;
  onSelectEvent: (event: CalendarEvent) => void;
  onRequestCreate: (day: DateTime, minutes: number) => void;
  onEventTimeChange: (event: CalendarEvent, start: DateTime, end: DateTime) => void;
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

const getDaylightStyle = (day: DateTime, window?: DaylightWindow) => {
  if (!window) return {};
  if (window.isPolarDay) {
    return { backgroundColor: 'var(--day-bg)', color: 'var(--day-text)' };
  }
  if (window.isPolarNight) {
    return { backgroundColor: 'var(--night-bg)', color: 'var(--night-text)' };
  }
  if (!window.sunrise || !window.sunset) return {};
  const dayStart = day.startOf('day');
  const sunriseMinutes = Math.max(window.sunrise.diff(dayStart, 'minutes').minutes, 0);
  const sunsetMinutes = Math.min(window.sunset.diff(dayStart, 'minutes').minutes, 24 * 60);
  const sunrisePercent = (sunriseMinutes / (24 * 60)) * 100;
  const sunsetPercent = (sunsetMinutes / (24 * 60)) * 100;
  return {
    backgroundImage: `linear-gradient(to bottom,
      var(--night-bg) 0%,
      var(--night-bg) ${sunrisePercent}%,
      var(--day-bg) ${sunrisePercent}%,
      var(--day-bg) ${sunsetPercent}%,
      var(--night-bg) ${sunsetPercent}%,
      var(--night-bg) 100%)`,
    color: 'var(--day-text)',
  };
};

export function WeekView({ days, events, daylightMap, onSelectEvent, onRequestCreate, onEventTimeChange }: WeekViewProps) {
  const today = DateTime.local();
  const [dragState, setDragState] = useState<{ eventId: string; deltaMinutes: number } | null>(null);
  const [recentlyDraggedId, setRecentlyDraggedId] = useState<string | null>(null);
  const hourHeightRef = useRef(64);
  const dragIntentRef = useRef(false);

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    const parsed = Number.parseFloat(styles.getPropertyValue('--grid-hour-height'));
    if (!Number.isNaN(parsed) && parsed > 0) {
      hourHeightRef.current = parsed;
    }
  }, []);

  useEffect(() => {
    if (!recentlyDraggedId) return;
    const id = window.setTimeout(() => setRecentlyDraggedId(null), 200);
    return () => window.clearTimeout(id);
  }, [recentlyDraggedId]);

  const handleGridClick = (day: DateTime) => (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('.event-block')) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const y = Math.max(0, Math.min(bounds.height, event.clientY - bounds.top));
    const ratio = y / bounds.height;
    const minutes = ratio * MINUTES_IN_DAY;
    onRequestCreate(day, minutes);
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (recentlyDraggedId === event.id) return;
    onSelectEvent(event);
  };

  const attachDragHandlers = (segmentEvent: CalendarEvent) => (pointerEvent: ReactPointerEvent<HTMLButtonElement>) => {
    if (pointerEvent.button !== 0) return;
    if (segmentEvent.isAllDay) return;
    if (!segmentEvent.start.hasSame(segmentEvent.end, 'day')) return;
    pointerEvent.stopPropagation();
    const startY = pointerEvent.clientY;
    const hourHeight = hourHeightRef.current;
    const eventDuration = segmentEvent.end.diff(segmentEvent.start, 'minutes').minutes;
    const dayStart = segmentEvent.start.startOf('day');
    const startMinutesFromDay = segmentEvent.start.diff(dayStart, 'minutes').minutes;
    const maxDeltaUp = -startMinutesFromDay;
    const maxDeltaDown = MINUTES_IN_DAY - eventDuration - startMinutesFromDay;
    let currentDelta = 0;
    dragIntentRef.current = false;

    const handleMove = (moveEvent: PointerEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const approxMinutes = Math.round(((deltaY * 60) / hourHeight) / 15) * 15;
      const clamped = Math.max(maxDeltaUp, Math.min(maxDeltaDown, approxMinutes));
      currentDelta = clamped;
      if (Math.abs(clamped) > 0) {
        dragIntentRef.current = true;
      }
      setDragState({ eventId: segmentEvent.id, deltaMinutes: clamped });
    };

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      if (dragIntentRef.current && currentDelta !== 0) {
        setRecentlyDraggedId(segmentEvent.id);
        const newStart = segmentEvent.start.plus({ minutes: currentDelta });
        const newEnd = segmentEvent.end.plus({ minutes: currentDelta });
        onEventTimeChange(segmentEvent, newStart, newEnd);
      }
      dragIntentRef.current = false;
      setDragState(null);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };
  return (
    <div className="surface-card week-view" role="grid" aria-label="Week view">
      <div className="week-header-row">
        <div className="week-hours-header" aria-hidden />
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          const headerClass = clsx('week-day-header', { 'week-day-header--today': isToday });
          return (
            <div key={`${day.toISO()}-header`} className={headerClass}>
              <span>{day.toFormat('ccc')}</span>
              <strong>{day.toFormat('MMM d')}</strong>
            </div>
          );
        })}
      </div>
      <div className="week-body" style={{ scrollPaddingTop: 0 }}>
        <div className="week-hours" aria-hidden>
          <div className="week-hours-all-day" />
          {HOURS.map((hour) => (
            <div key={hour} className="week-hour">
              <span>{DateTime.fromObject({ hour }).toFormat('ha')}</span>
            </div>
          ))}
        </div>
        {days.map((day) => {
          const { timed, allDay } = getEventSegmentsForDay(events, day);
          const dayKey = day.toISODate() ?? day.toFormat('yyyy-LL-dd');
          const daylight = daylightMap[dayKey];
          const isToday = isSameDay(day, today);
          const dayClass = clsx('week-day', { 'week-day--today': isToday });
          return (
            <div
              key={day.toISO()}
              className={dayClass}
              role="gridcell"
              aria-label={day.toLocaleString(DateTime.DATE_FULL)}
            >
              <div className="week-all-day" aria-label="All day events">
                {allDay.map((event) => (
                  <button
                    type="button"
                    key={`${event.id}-${day.toISODate()}`}
                    className="all-day-chip"
                    style={{
                      backgroundColor: event.color || '#2563eb',
                      color: getTextColorForBackground(event.color),
                    }}
                    onClick={() => onSelectEvent(event)}
                  >
                    {event.title}
                  </button>
                ))}
                {!allDay.length && <span className="helper-text">—</span>}
              </div>
              <div className="week-day-grid" style={getDaylightStyle(day, daylight)} onClick={handleGridClick(day)}>
                <div className="week-grid-lines" />
                <div className="week-events">
                  {timed.map((segment) => (
                    <button
                      key={`${segment.event.id}-${segment.start.toISO()}`}
                      type="button"
                      className="event-block"
                      style={{
                        top: `${segment.top}%`,
                        height: `${segment.height}%`,
                        left: `${(segment.column / segment.columnSpan) * 100}%`,
                        width: `${100 / segment.columnSpan}%`,
                        backgroundColor: segment.event.color || '#2563eb',
                        color: getTextColorForBackground(segment.event.color),
                        transform:
                          dragState?.eventId === segment.event.id
                            ? `translateY(${(dragState.deltaMinutes / MINUTES_IN_DAY) * 100}%)`
                            : undefined,
                      }}
                      onClick={() => handleEventClick(segment.event)}
                      onPointerDown={attachDragHandlers(segment.event)}
                    >
                      <strong>{segment.event.title}</strong>
                      <span>
                        {segment.start.toFormat('HH:mm')} – {segment.end.toFormat('HH:mm')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
