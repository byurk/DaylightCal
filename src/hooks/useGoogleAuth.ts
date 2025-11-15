import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadGoogleScript } from '../utils/google';

const SCOPE = 'https://www.googleapis.com/auth/calendar openid email profile';

export type AuthStatus = 'idle' | 'initializing' | 'ready' | 'authorizing' | 'authorized' | 'error';

export interface UseGoogleAuthResult {
  status: AuthStatus;
  accessToken: string | null;
  expiresAt: number | null;
  error: string | null;
  signIn: () => void;
  signOut: () => void;
  isAuthorized: boolean;
}

export function useGoogleAuth(clientId?: string): UseGoogleAuthResult {
  const tokenClient = useRef<google.accounts.oauth2.TokenClient | null>(null);
  const [status, setStatus] = useState<AuthStatus>('idle');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      setError('Missing Google OAuth client id');
      setStatus('error');
      return;
    }
    let cancelled = false;
    setStatus('initializing');
    loadGoogleScript()
      .then(() => {
        if (cancelled) return;
        tokenClient.current = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPE,
          callback: (tokenResponse: google.accounts.oauth2.TokenResponse) => {
            setAccessToken(tokenResponse.access_token);
            const expiresInSeconds = Number(tokenResponse.expires_in) || 0;
            setExpiresAt(Date.now() + expiresInSeconds * 1000);
            setStatus('authorized');
            setError(null);
          },
          error_callback: (err) => {
            setError(err.message);
            setStatus('error');
          },
        });
        setStatus('ready');
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const signIn = useCallback(() => {
    if (!tokenClient.current) return;
    setStatus('authorizing');
    tokenClient.current.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
  }, [accessToken]);

  const signOut = useCallback(() => {
    if (accessToken) {
      window.google?.accounts.oauth2.revoke(accessToken, () => undefined);
    }
    setAccessToken(null);
    setExpiresAt(null);
    if (tokenClient.current) {
      setStatus('ready');
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !expiresAt || !tokenClient.current) {
      return;
    }
    const timeout = expiresAt - Date.now() - 60000;
    if (timeout <= 0) {
      tokenClient.current.requestAccessToken({ prompt: '' });
      return;
    }
    const id = window.setTimeout(() => {
      tokenClient.current?.requestAccessToken({ prompt: '' });
    }, timeout);
    return () => window.clearTimeout(id);
  }, [accessToken, expiresAt]);

  return useMemo(
    () => ({
      status,
      accessToken,
      expiresAt,
      error,
      signIn,
      signOut,
      isAuthorized: status === 'authorized' && Boolean(accessToken),
    }),
    [status, accessToken, expiresAt, error, signIn, signOut],
  );
}
