import type { CalendarListEntry } from '../types';

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const GOOGLE_API_BASE = 'https://www.googleapis.com/calendar/v3';

let scriptPromise: Promise<void> | null = null;

export const loadGoogleScript = () => {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    if (document.getElementById('google-gsi')) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gsi';
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services script'));
    document.body.appendChild(script);
  });
  return scriptPromise;
};

interface GoogleCalendarListResponse {
  items?: Array<{
    id: string;
    summary: string;
    primary?: boolean;
    backgroundColor?: string;
    foregroundColor?: string;
  }>;
  nextPageToken?: string;
}

interface GoogleFetchOptions {
  params?: Record<string, string>;
  method?: string;
  body?: Record<string, unknown>;
}

async function googleFetch<T>(path: string, token: string, options: GoogleFetchOptions = {}): Promise<T> {
  const query = options.params ? `?${new URLSearchParams(options.params)}` : '';
  const response = await fetch(`${GOOGLE_API_BASE}${path}${query}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error?.message || `Google API error (${response.status})`);
  }
  if (response.status === 204) {
    return {} as T;
  }
  return response.json() as Promise<T>;
}

export async function fetchCalendarList(token: string): Promise<CalendarListEntry[]> {
  const calendars: CalendarListEntry[] = [];
  let pageToken: string | undefined;

  do {
    const data = await googleFetch<GoogleCalendarListResponse>('/users/me/calendarList', token, {
      params: {
        maxResults: '50',
        pageToken: pageToken ?? '',
      },
    });
    data.items?.forEach((item) => {
      calendars.push({
        id: item.id,
        summary: item.summary,
        primary: Boolean(item.primary),
        backgroundColor: item.backgroundColor,
        foregroundColor: item.foregroundColor,
      });
    });
    pageToken = data.nextPageToken;
  } while (pageToken);

  return calendars;
}

interface GoogleEventResponse {
  items?: GoogleEventItem[];
  nextPageToken?: string;
}

interface GoogleEventItem {
  id: string;
  summary?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  hangoutLink?: string;
  location?: string;
  description?: string;
}

export async function fetchEventsForCalendar(
  token: string,
  calendarId: string,
  params: { timeMin: string; timeMax: string; timeZone: string },
): Promise<GoogleEventItem[]> {
  const events: GoogleEventItem[] = [];
  let pageToken: string | undefined;

  do {
    const data = await googleFetch<GoogleEventResponse>(`/calendars/${encodeURIComponent(calendarId)}/events`, token, {
      params: {
        ...params,
        singleEvents: 'true',
        orderBy: 'startTime',
        showDeleted: 'false',
        maxResults: '2500',
        pageToken: pageToken ?? '',
      },
    });
    if (data.items) {
      events.push(...data.items);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return events;
}

type GoogleEventWritePayload = {
  summary: string;
  description?: string;
  location?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
};

export async function createCalendarEvent(
  token: string,
  calendarId: string,
  payload: GoogleEventWritePayload,
): Promise<GoogleEventItem> {
  return googleFetch<GoogleEventItem>(`/calendars/${encodeURIComponent(calendarId)}/events`, token, {
    method: 'POST',
    body: payload,
  });
}

export async function updateCalendarEvent(
  token: string,
  calendarId: string,
  eventId: string,
  payload: GoogleEventWritePayload,
): Promise<GoogleEventItem> {
  return googleFetch<GoogleEventItem>(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    token,
    {
      method: 'PATCH',
      body: payload,
    },
  );
}

export async function deleteCalendarEvent(token: string, calendarId: string, eventId: string): Promise<void> {
  await googleFetch(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, token, {
    method: 'DELETE',
  });
}
