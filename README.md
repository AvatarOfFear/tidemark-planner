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

## Your data

Everything is saved in the browser's local storage on the device you use. Nothing is sent to a server.
To move your planner between devices, open **Backup & data**, copy the backup, and restore it on the other device.

## Running it

- Quickest: open `index.html` in a browser.
- To install it as an app (offline support), serve the folder over HTTPS or localhost, for example:

  ```bash
  python3 -m http.server 8080
  # open http://localhost:8080
  ```

- Live site: https://avataroffear.github.io/tidemark-planner/ (published by `.github/workflows/pages.yml` on every push to `main`).
