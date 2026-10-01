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
- Tasks with due dates and project deadlines also appear on the calendar.
- Light and dark themes follow your system setting.
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

## Running it

- Quickest: open `index.html` in a browser.
- To install it as an app (offline support), serve the folder over HTTPS or localhost, for example:

  ```bash
  python3 -m http.server 8080
  # open http://localhost:8080
  ```

- Live site: https://avataroffear.github.io/tidemark-planner/ (published by `.github/workflows/pages.yml` on every push to `main`).
