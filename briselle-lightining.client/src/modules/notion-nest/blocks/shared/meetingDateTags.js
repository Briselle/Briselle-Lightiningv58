/* ============================================================
   NotionNest — blocks/shared/meetingDateTags.js
   Created At: 2026-08-15 | Last Modified: 2026-08-15
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-NN-MNB-H01
   Purpose: Metadata-driven date-tag domain logic for the
            MeetingNotesBlock header. Pure functions only — no React,
            no DOM, no styling. Business logic must never live in UI.

   Consumed by: blocks/MeetingNotesBlock.jsx (header)
   Future consumer: NotionNest Calendar module (see CALENDAR_SOURCE)
   ============================================================ */

/**
 * Tag resolution modes.
 * 'current' -> the upcoming/this-week occurrence  (e.g. "Monday")
 * 'last'    -> the most recent past occurrence    (e.g. "Last Monday")
 */
export const TAG_MODES = { CURRENT: 'current', LAST: 'last' };

/** Weekday registry. index matches JS Date#getDay() (0 = Sunday). */
export const WEEKDAYS = [
  { key: 'Sunday', index: 0 },
  { key: 'Monday', index: 1 },
  { key: 'Tuesday', index: 2 },
  { key: 'Wednesday', index: 3 },
  { key: 'Thursday', index: 4 },
  { key: 'Friday', index: 5 },
  { key: 'Saturday', index: 6 },
];

/**
 * Relative presets that ignore the current/last toggle.
 * offset is in days from today.
 */
export const RELATIVE_PRESETS = [
  { key: 'Today', offset: 0 },
  { key: 'Yesterday', offset: -1 },
  { key: 'Tomorrow', offset: 1 },
];

/**
 * Source of a date value. Lets the future Calendar module claim
 * ownership of a block's date without changing the stored shape.
 */
export const CALENDAR_SOURCE = {
  MANUAL: 'manual',   // user picked a date directly
  TAG: 'tag',         // user picked a preset tag
  CALENDAR: 'calendar', // supplied by the NotionNest Calendar module
};

/* ── internal helpers ─────────────────────────────────────── */

const MS_PER_DAY = 86400000;

/** Local-timezone ISO date (YYYY-MM-DD). Avoids UTC off-by-one. */
export function toIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse YYYY-MM-DD as a local date (never UTC). */
export function fromIsoDate(iso) {
  if (!iso || typeof iso !== 'string') return new Date();
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function addDays(base, n) {
  return new Date(base.getTime() + n * MS_PER_DAY);
}

/* ── public API ───────────────────────────────────────────── */

/**
 * Build the preset list rendered in the calendar popover.
 * @param {string} mode TAG_MODES value — affects weekday labels only.
 * @returns {{key:string,label:string,kind:'relative'|'weekday'}[]}
 */
export function buildPresets(mode = TAG_MODES.CURRENT) {
  const relative = RELATIVE_PRESETS.map(p => ({
    key: p.key,
    label: p.key,
    kind: 'relative',
  }));
  const weekdays = WEEKDAYS.map(w => ({
    key: w.key,
    label: formatTagLabel(w.key, mode),
    kind: 'weekday',
  }));
  return [...relative, ...weekdays];
}

/**
 * Display label for a tag under a given mode.
 * Relative presets are mode-independent; weekdays gain a "Last " prefix.
 */
export function formatTagLabel(tagKey, mode = TAG_MODES.CURRENT) {
  if (!tagKey) return '';
  const isWeekday = WEEKDAYS.some(w => w.key === tagKey);
  if (isWeekday && mode === TAG_MODES.LAST) return `Last ${tagKey}`;
  return tagKey;
}

/**
 * Resolve a tag to a concrete calendar date.
 * This is what makes the tag "co-relate with the dates after selected".
 *
 * @param {string} tagKey e.g. 'Monday' | 'Today'
 * @param {string} mode   TAG_MODES value
 * @param {Date}   [today] injectable for testability
 * @returns {string|null} ISO date (YYYY-MM-DD), or null if unknown tag
 */
export function resolveTagToDate(tagKey, mode = TAG_MODES.CURRENT, today = new Date()) {
  if (!tagKey) return null;

  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const relative = RELATIVE_PRESETS.find(p => p.key === tagKey);
  if (relative) return toIsoDate(addDays(base, relative.offset));

  const weekday = WEEKDAYS.find(w => w.key === tagKey);
  if (!weekday) return null;

  const todayIdx = base.getDay();
  let delta = weekday.index - todayIdx;

  if (mode === TAG_MODES.LAST) {
    // strictly in the past: today's weekday resolves to 7 days ago
    if (delta >= 0) delta -= 7;
  } else {
    // current week going forward: today's weekday resolves to today
    if (delta < 0) delta += 7;
  }

  return toIsoDate(addDays(base, delta));
}

/**
 * Human-readable date for the header (e.g. "August 2, 2026").
 * @param {string} iso
 * @param {string} [locale]
 */
export function formatDisplayDate(iso, locale = undefined) {
  const d = fromIsoDate(iso);
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Day-of-month number shown inside the calendar glyph. */
export function getDayNumber(iso) {
  return fromIsoDate(iso).getDate();
}

/**
 * Given a stored block, produce everything the header needs to render.
 * Keeps the component free of date arithmetic.
 */
export function describeSelection(block = {}) {
  const mode = block.calendarEventMode === TAG_MODES.LAST ? TAG_MODES.LAST : TAG_MODES.CURRENT;
  const iso = block.date || toIsoDate(new Date());
  return {
    mode,
    iso,
    dayNumber: getDayNumber(iso),
    displayDate: formatDisplayDate(iso),
    tagKey: block.calendarEvent || null,
    tagLabel: block.calendarEvent ? formatTagLabel(block.calendarEvent, mode) : null,
    source: block.calendarSource || CALENDAR_SOURCE.MANUAL,
  };
}

/* ── Month grid (BRIS-NN-MNB-H11) ─────────────────────────── */

/** Column headers for the picker, Sunday-first to match Notion. */
export const WEEKDAY_INITIALS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** Date format modes offered in the picker footer. */
export const DATE_FORMATS = { RELATIVE: 'Relative', ABSOLUTE: 'Absolute' };

/**
 * Build a 6x7 day grid for a month, including the greyed leading/trailing
 * days from adjacent months — exactly how Notion renders it.
 *
 * @param {number} year
 * @param {number} month 0-indexed
 * @param {Date} [today]
 * @returns {{iso:string,day:number,inMonth:boolean,isToday:boolean}[]}
 */
export function buildMonthGrid(year, month, today = new Date()) {
  const todayIso = toIsoDate(today);
  const first = new Date(year, month, 1);
  // back up to the Sunday on/before the 1st
  const start = addDays(first, -first.getDay());

  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i);
    const iso = toIsoDate(d);
    cells.push({
      iso,
      day: d.getDate(),
      inMonth: d.getMonth() === month,
      isToday: iso === todayIso,
    });
  }
  return cells;
}

/** "August 2026" — the picker's month caption. */
export function formatMonthCaption(year, month, locale = undefined) {
  return new Date(year, month, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

/** Step a {year, month} cursor by whole months. */
export function shiftMonth(year, month, delta) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

/**
 * Short form used in the picker's text field, e.g. "Aug 2, 2026".
 */
export function formatShortDate(iso, locale = undefined) {
  return fromIsoDate(iso).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Relative phrasing when the date is close to today, else the short date.
 * Drives the "Date format: Relative" option.
 */
export function formatRelativeDate(iso, today = new Date()) {
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = fromIsoDate(iso);
  const diff = Math.round((target - base) / MS_PER_DAY);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  if (diff > 1 && diff < 7) return target.toLocaleDateString(undefined, { weekday: 'long' });
  if (diff < -1 && diff > -7) return `Last ${target.toLocaleDateString(undefined, { weekday: 'long' })}`;
  return formatShortDate(iso);
}

/* ── Future NotionNest Calendar module contract ───────────────
   The Calendar module is not built yet. It must implement this
   shape and be injected — nothing here fabricates an API.

   interface NotionCalendarProvider {
     isConnected(): boolean;
     connect(): Promise<void>;
     // Events for a date, used to auto-title the meeting block.
     listEvents(isoDate: string): Promise<Array<{
       id: string;
       title: string;
       startsAt: string;  // ISO datetime
       endsAt: string;    // ISO datetime
     }>>;
   }

   Wire-up point: blocks/MeetingNotesBlock.jsx -> onConnectCalendar
   ─────────────────────────────────────────────────────────── */
export const CALENDAR_PROVIDER_CONTRACT = 'NotionCalendarProvider@1';
