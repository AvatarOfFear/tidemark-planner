# Tidemark Planner

A calendar and project planner that runs in any browser and works on both phone and desktop. It has no build step and no server: everything is in `index.html`.

## Features

- **Calendar**: month grid with ISO week numbers, a day panel, and an Agenda list of the next 60 days (overdue tasks at the top). Supports timed, all-day and multi-day events.
- **Projects**: project cards with progress and deadline countdown, plus a To do / In progress / Done board. Drag cards between columns on desktop, or tap the arrow on a card on mobile.
- **Gantt charts**: every project gets a Gantt chart. Pick one project or show them all.
  - Give a task a start and due date to show it as a bar. A task with only a due date shows as a milestone (diamond).
  - Drag a bar to move it, or drag either end to change its start or due date. Dragging a project bar moves all of its tasks.
  - Link tasks with **Starts after** in the task form. Arrows show the links, and a red dashed arrow flags a task scheduled to start before the task it waits on is finished.
  - Zoom by days, weeks or months. **Fit** frames the chart around the selected project.
  - Keyboard: focus a bar and press ← or → to shift it a day. Hold Shift to change the due date instead.
  - **Reorder projects** by dragging the ⠿ handle on a project row up or down (mouse or touch), or focus it and press ↑ / ↓. The project's tasks move with it. The order syncs across devices and is used in PDF exports.
  - **Export PDF** (in the Gantt header) downloads the chart as a vector PDF for presentations. Choose a 16:9 slide, A4 or US Letter page, all dates or just what is on screen, and whether to show dependency arrows, the today line, a legend and dates. Everything is scaled to fit on one page (the PDF is vector, so zoom in on very large charts to read details). Export works offline in the installed app.
- Tasks with due dates and project deadlines also appear on the calendar.
- **Colors**: projects, tasks and events each have a color: 8 presets, or the rainbow swatch for a color wheel (with brightness and a hex code box) for any custom color.
  Tasks and events default to **Auto** (A), which uses their project's color. Colors show on the calendar, day list, board, Gantt chart and PDF export.
- **Work and personal**: every project, task and event is marked Work or Personal. Tasks and events in a project follow the project, so changing a project moves everything in it.
  The **All · Work · Personal** switch (sidebar on desktop, top of the screen on mobile) filters the calendar, agenda, projects, Gantt chart, counts and PDF exports. New items default to the side you are viewing. Items without a setting from before this feature count as Work.
- **Theme editor** (Theme in the sidebar, or Settings → Appearance → Edit theme): System, Light or Dark mode; 8 ready-made themes including High contrast;
  a custom main color and Work/Personal colors (presets or the color wheel); Tinted, Neutral, Warm or High-contrast backgrounds; Tidemark, System,
  Readable (Atkinson Hyperlegible) or Serif fonts; four text sizes; and Square, Soft or Round corners. Changes preview live and are saved on each device.
  Colors are adjusted automatically so text keeps at least 4.5:1 contrast (7:1 for High contrast) in both light and dark mode.
- **Offline and installable**: when served over HTTPS it registers a service worker, so you can "Add to Home Screen" on a phone or "Install app" in Chrome/Edge on desktop.

## Your data and sync

Everything is saved in the browser on each device. To keep your phone and computer in sync, open **Sync & backup** and connect a GitHub token that has only the `gist` permission:

1. Create the token at https://github.com/settings/tokens/new?scopes=gist&description=Tidemark%20Planner (only the **gist** box ticked).
2. In the planner, open **Sync & backup**, paste the token, and tap **Connect**.
3. Repeat on each device with the same token.

The planner is stored in a secret gist named `tidemark-planner.json`. It syncs when you make a change, when you open the app, every minute while it is open, and when you come back online.
Each project, task and event is merged on its own, using the newest edit, and deletions sync too. Editing different items on two devices at once loses nothing; if both edit the same item, the later edit wins.
A secret gist does not appear on your profile or in search, but anyone with its exact link could read it. The token is stored only in that browser.
Sync works on the hosted site (and the installed app), not in the claude.ai preview.

You can still copy a backup by hand from the same screen.

## Notifications

Tidemark can send reminders to your phone or computer even when the app is closed:
before events (each event can choose its own reminder time), on the morning tasks and project deadlines are due, and an optional morning summary.

How it works: each device that turns on notifications saves a Web Push subscription to the same secret gist used for sync (`tidemark-push.json`).
A scheduled GitHub Action in the public repo (`.github/workflows/reminders.yml`, running `reminders/send.mjs`) checks every 5 minutes and sends any reminders that are due.

Setup:
1. Turn on sync (above).
2. In the public repo, add an Actions secret named `GIST_TOKEN` containing your sync token (or another token with only the `gist` scope):
   https://github.com/AvatarOfFear/tidemark-planner/settings/secrets/actions/new
3. In the app, open **Settings → Notifications** and tap **Turn on notifications** on each device.
   On iPhone and iPad, first add Tidemark to your Home Screen (Share → Add to Home Screen) and open it from there; Apple only allows notifications for Home Screen web apps (iOS 16.4 or later).

Good to know:
- GitHub runs scheduled workflows on a best-effort basis, so reminders can occasionally arrive a few minutes late. Reminders are sent up to 3 minutes early and up to 3 hours late, never twice.
- Settings → Notifications shows when the reminder service last ran, and any error it hit.
- **Send reminders for** chooses Work and personal, Work only or Personal only (shared by all your devices).
- GitHub pauses scheduled workflows in public repos after 60 days without commits; the workflow makes a tiny monthly commit (`.github/keepalive`) to prevent that.
- The push keys and subscriptions are stored in your secret gist alongside your planner data.

## Running it

- Quickest: open `index.html` in a browser.
- To install it as an app (offline support), serve the folder over HTTPS or localhost, for example:

  ```bash
  python3 -m http.server 8080
  # open http://localhost:8080
  ```

- Live site: https://avataroffear.github.io/tidemark-planner/ (published by `.github/workflows/pages.yml` on every push to `main`).

## Third-party

PDF export uses [jsPDF](https://github.com/parallax/jsPDF) 2.5.2 (MIT license, see `vendor/jspdf.LICENSE`), bundled in `vendor/` so it works offline.
