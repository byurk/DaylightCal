import { FormEvent, useState } from 'react';
import type { Coordinates } from '../types';

interface LocationPromptProps {
  status: 'idle' | 'pending' | 'ready' | 'error';
  label: string;
  coords: Coordinates | null;
  error: string | null;
  onRequestGeolocation: () => void;
  onSubmitManual: (input: { lat: number; lon: number; label?: string }) => void;
}

export function LocationPrompt({
  status,
  label,
  coords,
  error,
  onRequestGeolocation,
  onSubmitManual,
}: LocationPromptProps) {
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsedLat = Number.parseFloat(lat);
    const parsedLon = Number.parseFloat(lon);
    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLon)) {
      return;
    }
    onSubmitManual({ lat: parsedLat, lon: parsedLon, label: name });
  };

  const statusLabel =
    status === 'pending'
      ? 'Detecting…'
      : status === 'ready'
        ? label
        : status === 'error'
          ? 'Location unavailable'
          : 'Location needed';

  return (
    <div className="panel" aria-live="polite">
      <h2>Daylight location</h2>
      <p className="helper-text">
        We shade the week view with daylight hours based on your location. Share your location or enter a city
        center latitude/longitude.
      </p>
      <div className="meta-row" style={{ justifyContent: 'space-between' }}>
        <span className="status-pill">{statusLabel}</span>
        <button type="button" className="btn" onClick={onRequestGeolocation} disabled={status === 'pending'}>
          Use my location
        </button>
      </div>
      {coords && (
        <p className="helper-text">Lat {coords.lat.toFixed(2)}°, Lon {coords.lon.toFixed(2)}°</p>
      )}
      {error && <p className="helper-text" role="alert">{error}</p>}
      <form className="location-form" onSubmit={handleSubmit}>
        <label>
          Latitude
          <input
            type="number"
            step="0.01"
            value={lat}
            onChange={(event) => setLat(event.target.value)}
            placeholder="e.g. 47.61"
          />
        </label>
        <label>
          Longitude
          <input
            type="number"
            step="0.01"
            value={lon}
            onChange={(event) => setLon(event.target.value)}
            placeholder="e.g. -122.33"
          />
        </label>
        <label>
          Label (optional)
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Seattle, WA"
          />
        </label>
        <button type="submit" className="btn btn-primary">
          Save location
        </button>
      </form>
    </div>
  );
}
