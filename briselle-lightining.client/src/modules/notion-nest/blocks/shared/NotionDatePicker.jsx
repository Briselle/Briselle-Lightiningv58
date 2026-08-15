/* ============================================================
   NotionNest — blocks/shared/NotionDatePicker.jsx
   Created At: 2026-08-15 | Last Modified: 2026-08-15
   Previous Version Back URL: (new file — no previous version)

   Task: BRIS-NN-MNB-H11
   Purpose: Reusable Notion-parity date picker — month grid with
            Today / prev / next navigation, selected + today states,
            date-format switch and Clear.

   Reusable by any NotionNest block; holds no block-specific logic.
   All date arithmetic delegated to shared/meetingDateTags.js.
   Styling: styles/NotionNestPage.css (no inline CSS).
   ============================================================ */
import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, HelpCircle, CalendarDays } from 'lucide-react';
import {
  WEEKDAY_INITIALS,
  DATE_FORMATS,
  buildMonthGrid,
  formatMonthCaption,
  shiftMonth,
  formatShortDate,
  formatRelativeDate,
  fromIsoDate,
  toIsoDate,
} from './meetingDateTags';

/**
 * The month grid and footer options stay collapsed until the date field is
 * clicked, so the host popover can lead with its own quick actions.
 *
 * @param {string}   value     selected ISO date (YYYY-MM-DD)
 * @param {Function} onChange  (iso) => void
 * @param {Function} [onClear] clears the selection
 * @param {string}   [dateFormat] DATE_FORMATS value
 * @param {Function} [onDateFormatChange]
 * @param {boolean}  [expanded] controlled open state of the grid
 * @param {Function} [onToggleExpanded]
 */
export function NotionDatePicker({
  value,
  onChange,
  onClear,
  dateFormat = DATE_FORMATS.RELATIVE,
  onDateFormatChange,
  expanded = false,
  onToggleExpanded,
}) {
  const selected = fromIsoDate(value);
  const [cursor, setCursor] = useState({
    year: selected.getFullYear(),
    month: selected.getMonth(),
  });

  const grid = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month),
    [cursor.year, cursor.month]
  );
  const caption = useMemo(
    () => formatMonthCaption(cursor.year, cursor.month),
    [cursor.year, cursor.month]
  );

  const goToday = useCallback(() => {
    const now = new Date();
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
    onChange(toIsoDate(now));
  }, [onChange]);

  const step = useCallback((delta) => {
    setCursor(c => shiftMonth(c.year, c.month, delta));
  }, []);

  const toggleFormat = useCallback(() => {
    if (!onDateFormatChange) return;
    onDateFormatChange(
      dateFormat === DATE_FORMATS.RELATIVE ? DATE_FORMATS.ABSOLUTE : DATE_FORMATS.RELATIVE
    );
  }, [dateFormat, onDateFormatChange]);

  const fieldText = value
    ? (dateFormat === DATE_FORMATS.RELATIVE ? formatRelativeDate(value) : formatShortDate(value))
    : '';

  return (
    <div className="nnr-dp">
      {/* Clicking the field reveals the calendar and its options */}
      <button
        type="button"
        className={`nnr-dp-field${expanded ? ' expanded' : ''}`}
        onClick={onToggleExpanded}
        aria-expanded={expanded}
      >
        <span className="nnr-dp-field-text">{fieldText || 'Empty'}</span>
        <CalendarDays size={15} className="nnr-dp-field-icon" />
      </button>

      {!expanded ? null : (
      <>
      <div className="nnr-dp-nav">
        <span className="nnr-dp-caption">{caption}</span>
        <div className="nnr-dp-nav-actions">
          <button type="button" className="nnr-dp-today" onClick={goToday}>Today</button>
          <button
            type="button"
            className="nnr-dp-arrow"
            onClick={() => step(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="nnr-dp-arrow"
            onClick={() => step(1)}
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="nnr-dp-weekdays" role="row">
        {WEEKDAY_INITIALS.map(w => (
          <span key={w} className="nnr-dp-weekday" role="columnheader">{w}</span>
        ))}
      </div>

      <div className="nnr-dp-grid" role="grid">
        {grid.map(cell => {
          const isSelected = cell.iso === value;
          const cls = [
            'nnr-dp-day',
            cell.inMonth ? '' : 'muted',
            isSelected ? 'selected' : '',
            cell.isToday && !isSelected ? 'today' : '',
          ].filter(Boolean).join(' ');
          return (
            <button
              key={cell.iso}
              type="button"
              className={cls}
              onClick={() => onChange(cell.iso)}
              aria-selected={isSelected}
              aria-current={cell.isToday ? 'date' : undefined}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      <div className="nnr-dp-divider" />

      <div className="nnr-dp-option" role="button" tabIndex={0} onClick={toggleFormat}
           onKeyDown={e => { if (e.key === 'Enter') toggleFormat(); }}>
        <span>Date format</span>
        <span className="nnr-dp-option-value">
          {dateFormat}
          <ChevronRight size={14} />
        </span>
      </div>

      <div className="nnr-dp-divider" />

      <div className="nnr-dp-option" role="button" tabIndex={0} onClick={onClear}
           onKeyDown={e => { if (e.key === 'Enter' && onClear) onClear(); }}>
        <span>Clear</span>
      </div>

      <div className="nnr-dp-divider" />

      <div className="nnr-dp-hint">
        <HelpCircle size={14} />
        <span>Pick a day, or use a quick tag above</span>
      </div>
      </>
      )}
    </div>
  );
}

export default NotionDatePicker;
