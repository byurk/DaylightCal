import { DateTime } from 'luxon';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Coordinates, DateRange, DaylightWindow } from '../types';
import { buildDaylightMap } from '../utils/daylight';

interface ManualLocationInput {
  lat: number;
  lon: number;
  label?: string;
}

interface UseDaylightResult {
  coords: Coordinates | null;
  label: string;
  status: 'idle' | 'pending' | 'ready' | 'error';
  error: string | null;
  daylightMap: Record<string, DaylightWindow>;
  requestGeolocation: () => void;
  setManualLocation: (input: ManualLocationInput) => void;
}

const buildDaysArray = (range: DateRange | null) => {
  if (!range) return [];
  const days: DateTime[] = [];
  let cursor = range.start.startOf('day');
  const end = range.end.endOf('day');
  while (cursor <= end) {
    days.push(cursor);
    cursor = cursor.plus({ days: 1 });
  }
  return days;
};

export function useDaylight(range: DateRange | null): UseDaylightResult {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [label, setLabel] = useState('Current location');
  const [status, setStatus] = useState<'idle' | 'pending' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [hasRequested, setHasRequested] = useState(false);
  const rangeKey = range ? `${range.start.toISODate()}|${range.end.toISODate()}` : '';

  const requestGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser');
      setStatus('error');
      return;
    }
    setStatus('pending');
    setHasRequested(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
        setLabel('Current location');
        setStatus('ready');
        setError(null);
      },
      (geoError) => {
        setError(geoError.message);
        setStatus('error');
      },
      { enableHighAccuracy: true, maximumAge: 600000, timeout: 15000 },
    );
  }, []);

  const setManualLocation = useCallback((input: ManualLocationInput) => {
    if (Number.isNaN(input.lat) || Number.isNaN(input.lon)) {
      setError('Latitude and longitude must be numbers');
      setStatus('error');
      return;
    }
    const lat = Math.min(90, Math.max(-90, input.lat));
    const lon = Math.min(180, Math.max(-180, input.lon));
    setCoords({ lat, lon });
    setLabel(input.label?.trim() || 'Custom location');
    setStatus('ready');
    setError(null);
  }, []);

  useEffect(() => {
    if (coords || hasRequested) return;
    requestGeolocation();
  }, [coords, hasRequested, requestGeolocation]);

  const daylightMap = useMemo(() => {
    const days = buildDaysArray(range);
    if (!days.length || !coords) return {};
    return buildDaylightMap(days, coords);
  }, [coords, rangeKey]);

  return {
    coords,
    label,
    status,
    error,
    daylightMap,
    requestGeolocation,
    setManualLocation,
  };
}
