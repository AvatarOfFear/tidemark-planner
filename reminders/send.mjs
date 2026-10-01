// Tidemark reminder service. Run every few minutes by .github/workflows/reminders.yml.
//
// Reads the planner and the push settings from the same secret gist the app syncs to,
// works out which reminders are due, sends them with Web Push, and records what it sent.
// It never exits with an error code, so a problem does not trigger failure emails every
// five minutes; instead the error is saved to the gist and shown in the app's settings.
//
// Environment: GIST_TOKEN (required), GITHUB_API (optional, for tests), NOW (optional ms, for tests).
import webpush from 'web-push';

const API = process.env.GITHUB_API || 'https://api.github.com';
const TOKEN = process.env.GIST_TOKEN;
const DATA_FILE = 'tidemark-planner.json';
const PUSH_FILE = 'tidemark-push.json';
const SITE = 'https://avataroffear.github.io/tidemark-planner/';
const LOOKBACK = 3 * 3600e3; // send reminders up to 3 h late if a run was delayed
const LEAD = 3 * 60e3; // and up to 3 min early, since scheduled runs are usually a little late
const DEFAULTS = { eventDefault: 15, taskTime: '09:00', digest: false, digestTime: '08:00' };

async function gh(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'tidemark-reminders', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`GitHub API ${method} ${path.split('?')[0]} returned ${res.status}`);
  return res.json();
}
async function fileText(f) {
  if (!f) return null;
  if (!f.truncated) return f.content;
  const res = await fetch(f.raw_url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  return res.text();
}

// ---- time zones (no dependencies) ----
function tzOffset(t, tz) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(t));
  const g = k => Number(parts.find(p => p.type === k).value);
  return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - Math.floor(t / 1000) * 1000;
}
export function zonedTime(date, time, tz) {
  const [y, m, d] = date.split('-').map(Number), [hh, mm] = (time || '00:00').split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const off = tzOffset(guess, tz);
  let t = guess - off;
  const off2 = tzOffset(t, tz);
  if (off2 !== off) t = guess - off2;
  return t;
}
export function localDate(t, tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
}
const addDays = (date, n) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const validTz = tz => { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch (e) { return false; } };

function plural(n, w) { return `${n} ${w}${n === 1 ? '' : 's'}`; }
function before(min) {
  if (min <= 0) return 'Starting now';
  if (min < 60) return `In ${min} min`;
  if (min < 1440) return `In ${plural(min / 60, 'hour')}`;
  return `In ${plural(Math.round(min / 1440), 'day')}`;
}

// Work out every reminder whose time falls in (now - LOOKBACK, now].
export function dueReminders(data, settings, tz, now) {
  const s = { ...DEFAULTS, ...settings };
  const out = [];
  const projects = new Map((data.projects || []).map(p => [p.id, p]));
  const pname = id => projects.get(id)?.name;
  const add = (key, at, msg) => { if (at <= now + LEAD && at > now - LOOKBACK) out.push({ key, at, ...msg }); };
  const today = localDate(now, tz);
  const days = [-1, 0, 1, 2].map(n => addDays(today, n));

  for (const e of data.events || []) {
    const remind = e.remind === null || e.remind === undefined ? s.eventDefault : e.remind;
    if (remind < 0 || !days.includes(e.date) && !(e.date > today && e.date <= addDays(today, 8))) continue;
    if (e.start) {
      const start = zonedTime(e.date, e.start, tz);
      const time = e.end ? `${e.start}–${e.end}` : e.start;
      add(`event:${e.id}:${e.date}:${e.start}:${remind}`, start - remind * 60e3, {
        title: e.title, body: [before(remind), time, pname(e.projectId)].filter(Boolean).join(' · '),
      });
    } else if (s.taskTime !== 'off') {
      const dayBefore = remind >= 1440;
      const day = dayBefore ? addDays(e.date, -1) : e.date;
      add(`allday:${e.id}:${e.date}:${dayBefore ? 1 : 0}`, zonedTime(day, s.taskTime, tz), {
        title: e.title, body: [dayBefore ? 'Tomorrow, all day' : 'Today, all day', pname(e.projectId)].filter(Boolean).join(' · '),
      });
    }
  }
  if (s.taskTime !== 'off') {
    for (const t of data.tasks || []) {
      if (t.status === 'done' || !t.due || !days.includes(t.due)) continue;
      add(`task:${t.id}:${t.due}`, zonedTime(t.due, s.taskTime, tz), {
        title: `Due today: ${t.title}`, body: [pname(t.projectId), t.priority === 'high' ? 'High priority' : ''].filter(Boolean).join(' · ') || 'Task',
      });
    }
    for (const p of data.projects || []) {
      if (!p.due || !days.includes(p.due)) continue;
      add(`project:${p.id}:${p.due}`, zonedTime(p.due, s.taskTime, tz), { title: `Deadline today: ${p.name}`, body: 'Project deadline' });
    }
  }
  if (s.digest) {
    const at = zonedTime(today, s.digestTime, tz);
    const ev = (data.events || []).filter(e => e.date <= today && today <= (e.endDate || e.date));
    const due = (data.tasks || []).filter(t => t.status !== 'done' && t.due === today);
    const late = (data.tasks || []).filter(t => t.status !== 'done' && t.due && t.due < today);
    const first = ev.filter(e => e.start).sort((a, b) => a.start.localeCompare(b.start))[0];
    const parts = [ev.length ? plural(ev.length, 'event') : 'No events', due.length ? `${plural(due.length, 'task')} due` : '', late.length ? `${late.length} overdue` : ''].filter(Boolean);
    add(`digest:${today}`, at, { title: 'Your day in Tidemark', body: parts.join(' · ') + (first ? `. First up: ${first.start} ${first.title}` : '') });
  }
  return out.sort((a, b) => a.at - b.at);
}

async function main() {
  if (!TOKEN) { console.log('::notice::GIST_TOKEN secret is not set, so no reminders were sent. See README.'); return; }
  const now = Number(process.env.NOW) || Date.now();

  let gist = null;
  for (let page = 1; page <= 5 && !gist; page++) {
    const list = await gh('GET', `/gists?per_page=100&page=${page}`);
    gist = list.find(g => g.files && g.files[DATA_FILE]) || null;
    if (list.length < 100) break;
  }
  if (!gist) { console.log('No synced planner found. Turn on sync in the app first.'); return; }
  const full = await gh('GET', `/gists/${gist.id}`);
  const pushText = await fileText(full.files[PUSH_FILE]);
  if (!pushText) { console.log('Notifications have not been turned on in the app yet.'); return; }
  const push = JSON.parse(pushText);
  const save = async () => { await gh('PATCH', `/gists/${gist.id}`, { files: { [PUSH_FILE]: { content: JSON.stringify(push, null, 1) } } }); };

  try {
    const devices = Object.entries(push.devices || {});
    if (!push.vapid || !devices.length) { console.log('No devices have notifications turned on.'); return; }
    const data = JSON.parse(await fileText(full.files[DATA_FILE]));
    const tz = [push.settings?.tz, ...devices.map(([, d]) => d.tz)].find(t => t && validTz(t)) || 'UTC';
    webpush.setVapidDetails(SITE, push.vapid.publicKey, push.vapid.privateKey);

    const msgs = dueReminders(data, push.settings, tz, now).filter(m => !push.sent?.[m.key]);
    if (push.testRequested) msgs.push({ key: `test:${push.testRequested}`, at: now, title: 'Reminders are working', body: 'Tidemark will notify you about events, due tasks and deadlines.' });
    push.sent = push.sent || {};
    let delivered = 0;
    for (const m of msgs) {
      const payload = JSON.stringify({ title: m.title, body: m.body, tag: m.key, at: m.at, url: SITE });
      let ok = false, retry = false;
      for (const [id, d] of devices) {
        if (!push.devices[id]) continue;
        try {
          await webpush.sendNotification(d.subscription, payload, { TTL: 3600, urgency: 'high' });
          delivered++; ok = true;
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) { delete push.devices[id]; console.log(`Removed expired subscription for ${d.label || id}`); }
          else { retry = true; console.log(`::warning::Could not notify ${d.label || id}: ${err.statusCode || ''} ${String(err.body || err.message).slice(0, 200)}`); }
        }
      }
      // A temporary failure on every device is retried on the next run (within the look-back window).
      if (ok || !retry) push.sent[m.key] = now;
      else push.lastError = { at: now, message: 'The push service did not accept a reminder. It will be retried.' };
    }
    if (!msgs.some(m => m.key.startsWith('test:') && !push.sent[m.key])) delete push.testRequested;
    for (const [k, t] of Object.entries(push.sent)) if (t < now - 4 * 86400e3) delete push.sent[k];
    const failed = msgs.some(m => !push.sent[m.key]);
    const changed = msgs.length > 0 || Object.keys(push.devices).length !== devices.length || push.lastError;
    if (!failed) delete push.lastError;
    if (changed || !push.lastRun || now - push.lastRun > 3600e3) { push.lastRun = now; await save(); }
    console.log(`Checked ${devices.length} device(s) in ${tz}: ${msgs.length} reminder(s), ${delivered} delivered.`);
  } catch (err) {
    console.log(`::warning::${err.message}`);
    push.lastError = { at: now, message: String(err.message || err).slice(0, 300) };
    push.lastRun = now;
    await save().catch(() => {});
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => console.log(`::warning::Reminder run failed: ${err.message}`));
}
