import SunCalc from 'suncalc';
import { DateTime } from 'luxon';
import type { Coordinates, DaylightWindow } from '../types';

const safeDateTime = (value: Date | undefined | null, zone: string | null) => {
  if (!value) return null;
  const time = value.getTime();
  if (Number.isNaN(time)) return null;
  return DateTime.fromJSDate(value).setZone(zone ?? 'local');
};

export function computeDaylightWindow(date: DateTime, coords: Coordinates): DaylightWindow {
  const zone = date.zoneName ?? 'local';
  // Ask SunCalc for solar times using local noon to avoid timezone wraparound that
  // can shift sunrise/sunset into the previous UTC day.
  const solarAnchor = date.set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
  const times = SunCalc.getTimes(solarAnchor.toJSDate(), coords.lat, coords.lon);
  const sunrise = safeDateTime(times.sunrise, zone);
  const sunset = safeDateTime(times.sunset, zone);

  let isPolarDay = false;
  let isPolarNight = false;

  if (!sunrise || !sunset) {
    const noon = date.set({ hour: 12, minute: 0, second: 0 });
    const position = SunCalc.getPosition(noon.toJSDate(), coords.lat, coords.lon);
    if (position.altitude > 0) {
      isPolarDay = true;
    } else {
      isPolarNight = true;
    }
  }

  const isoDate = date.toISODate() ?? date.toFormat('yyyy-LL-dd');
  return {
    isoDate,
    sunrise,
    sunset,
    isPolarDay,
    isPolarNight,
  };
}

export function buildDaylightMap(days: DateTime[], coords: Coordinates | null): Record<string, DaylightWindow> {
  if (!coords) return {};
  return days.reduce<Record<string, DaylightWindow>>((acc, date) => {
    const key = date.toISODate() ?? date.toFormat('yyyy-LL-dd');
    acc[key] = computeDaylightWindow(date, coords);
    return acc;
  }, {});
}

export const formatCoordinates = (coords: Coordinates | null) =>
  coords ? `${coords.lat.toFixed(2)}°, ${coords.lon.toFixed(2)}°` : '';
