import type { AuthStatus } from '../hooks/useGoogleAuth';

interface GoogleAuthPanelProps {
  status: AuthStatus;
  isAuthorized: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  error: string | null;
}

export function GoogleAuthPanel({ status, isAuthorized, onSignIn, onSignOut, error }: GoogleAuthPanelProps) {
  return (
    <div className="panel" aria-live="polite">
      <h2>Google account</h2>
      <p className="helper-text">
        Connect your Google Calendar (read-only) to import events. We never store your data on a server—everything
        stays in your browser session.
      </p>
      <p className="status-pill">Status: {status}</p>
      {error && (
        <p className="helper-text" role="alert">
          {error}
        </p>
      )}
      {isAuthorized ? (
        <button type="button" className="btn" onClick={onSignOut}>
          Disconnect
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-primary"
          onClick={onSignIn}
          disabled={status === 'initializing' || status === 'authorizing'}
        >
          Connect Google Calendar
        </button>
      )}
    </div>
  );
}
