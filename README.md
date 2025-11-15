# DaylightCal

A daylight-aware calendar MVP that mimics Google Calendar's week/month views while shading each day based on local sunrise and sunset. It now reads and writes events using the browser-only Google Identity Services flow—no server required.

## Features

- Google sign-in via OAuth (read/write scope) with calendar picker toggle.
- Week and Month layouts with keyboard-focusable event blocks, Today shortcut, and smooth navigation.
- Inline event creation, editing, deletion, and drag-to-reschedule interactions in week view.
- Week view overlays daylight vs. darkness per day using SunCalc + browser geolocation (with manual fallback for lat/long).
- Timezone-safe rendering using Luxon; events in other zones are converted to your local time.
- Accessible color palette, high-contrast event pills, ARIA roles on major regions, and focusable interactions.

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Google OAuth client** (desktop/web)

   - Go to [Google Cloud Console](https://console.cloud.google.com/).
   - Create a project (or reuse an existing one) and enable the **Google Calendar API**.
   - Under **APIs & Services → Credentials**, create an **OAuth client ID** of type *Web application*.
   - Add the dev origin `http://localhost:5173` (and your production origin later) to the authorized JavaScript origins.
   - Note the generated **Client ID**.

3. **Expose the client ID to Vite**

   Create a `.env.local` file in the project root:

   ```env
   VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
   ```

4. **Run the app**

   ```bash
   npm run dev
   ```

   Then open the printed local URL (default `http://localhost:5173`).

5. **Build for production** (optional)

   ```bash
   npm run build
   npm run preview
   ```

## Architecture Overview

- **Stack**: React + TypeScript + Vite for fast local dev, Luxon for timezone math, SunCalc for sunrise/sunset, and plain CSS for styling.
- **State management**: Local React state + a few custom hooks:
  - `useGoogleAuth` loads the Google Identity script, handles OAuth tokens, and refreshes them before expiry.
  - `useCalendarData` fetches calendar lists/events for the visible date range (week/month) and keeps selection state.
  - `useDaylight` requests geolocation once, stores manual overrides, and derives a daylight map for the current week.
- **Rendering**:
  - `WeekView` builds a 24-hour grid, splits events that span multiple days, and lays them out in columns to avoid overlaps. Background gradients encode sunrise/sunset; polar-day/night regions collapse into solid light/dark fills.
  - `MonthView` keeps a fixed 6-row grid so layout doesn't jump between months.
  - `EventPopover` shows quick details, edit/delete actions, and launches the event editor.
- **Styling**: A small design token set in `index.css`, high-contrast chips, responsive grid (sidebar collapses on mobile), and smooth scrolling via CSS.

## Daylight & Timezone Notes

- Sunrise/sunset calculations happen entirely in the browser using SunCalc and the user's timezone (Luxon). If SunCalc can't find a rise/set (polar regions), we mark the whole day as daylight or darkness based on the sun's altitude at noon.
- Geolocation runs once on initial load; if the user denies it, they can enter manual lat/long (clamped to valid ranges) plus an optional label for context.
- All Google event timestamps respect the event's original timezone. Luxon converts each to the viewer's local zone before we render or bucket them into month/week cells.

## Editing Events

- Click anywhere inside the week grid to open the event editor with a one-hour block prefilled around the nearest hour. Update the title, calendar, timing, location, or description, then hit **Create**.
- Drag timed events vertically to reschedule them in 15-minute increments. When you drop, the event immediately updates in Google Calendar.
- Open an event's popover to edit or delete it. Deleting from the editor or popover removes it from Google Calendar after confirmation.

## Accessibility & Trade-offs

- Keyboard: buttons and event pills are focusable, with visible focus rings; ARIA roles mark toolbar, lists, and dialogs.
- Colors: event text switches between dark/light based on background luminance for WCAG-friendly contrast.
- Layout: week view remains scrollable on mobile with sticky hour labels; month view compresses gracefully.
- Decisions documented:
  - Week starts on Monday to align with ISO weeks and keep the layout predictable internationally.
  - We fetch up to 42 days of data for the month grid to keep navigation smooth; event fetches are scoped to the visible range per Google Calendar best practices.
- No backend means tokens never leave the browser session—refresh happens via GIS token client only.
- Editing events requires the Calendar read/write scope; consent prompts will mention that the app can make changes to your calendars.

Feel free to adapt the styling, integrate a design system, or extend the MVP with editing, reminders, or offline caching in future iterations.
