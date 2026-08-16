/* ============================================================
   NotionNest — meeting-notes/header/MeetingHeader.jsx
   Created At: 2026-08-15 | Last Modified: 2026-08-15
   Previous Version Back URL: blocks/MeetingNotesBlock.jsx#L2435-L2567

   Task: BRIS-NN-MNB-R02..R06
   Purpose: Extracted verbatim from MeetingNotesBlock.jsx. Markup and
            logic are unchanged; only state access moved from the parent
            closure to the MeetingNotes context.
   ============================================================ */
import { useMeetingNotes } from '../context/MeetingNotesContext';
import { Calendar, ChevronDown, Link, Plus, User } from 'lucide-react';
import { NotionDatePicker } from '../../shared/NotionDatePicker';
import { TAG_MODES } from '../../shared/meetingDateTags';

export function MeetingHeader() {
  const {
    closeAllMenus,
    setShowParticipantsPanel,
    showParticipantsPanel,
    participants,
    applyDateTag,
    applyManualDate,
    block,
    calendarWrapRef,
    clearDateSelection,
    connectNotionCalendar,
    date,
    dateFormat,
    datePresets,
    dateSelection,
    handleTitleInput,
    handleTitleKeyDown,
    headerDateLabel,
    mode,
    setDateFormat,
    setShowCalendarPopover,
    setShowDateCalendar,
    showCalendarPopover,
    showDateCalendar,
    title,
    titleRef,
    toggleDateTagMode,
  } = useMeetingNotes();
  return (
      <div className="mt-header mt-notion-header">
        <div className="mt-header-left">
          {/* H02: left-edge lucide glyph carrying the selected day number */}
          <div className="nnr-cal-btn-wrap" ref={calendarWrapRef}>
            <button
              type="button"
              className="nnr-cal-icon-btn borderless"
              onClick={() => { const next = !showCalendarPopover; closeAllMenus('calendar'); setShowCalendarPopover(next); }}
              title={`Meeting date — ${headerDateLabel}`}
              aria-haspopup="dialog"
              aria-expanded={showCalendarPopover}
            >
              <span className="nnr-cal-icon-box">
                <Calendar size={20} strokeWidth={1.75} />
                <span className="nnr-cal-day-num">{dateSelection.dayNumber}</span>
              </span>
              <ChevronDown size={12} className="nnr-cal-chevron" />
            </button>

            {showCalendarPopover && (
              <div
                className="nnr-cal-popover nnr-tag-cloud-popover"
                role="dialog"
                aria-label="Select meeting date"
              >
                <div className="nnr-cal-popover-header">
                  <Calendar size={13} />
                  <span>Meeting date</span>
                </div>

                {/* Quick tags lead the popover; the calendar sits below and
                    only opens when the date field is clicked. */}
                <div className="nnr-tag-section">
                  <div className="nnr-tag-section-header">
                    <span className="nnr-tag-section-title">Quick tags</span>
                    <div
                      className="nnr-mode-seg"
                      role="group"
                      aria-label="Weekday tag reference week"
                    >
                      <button
                        type="button"
                        className={`nnr-mode-seg-btn${dateSelection.mode === TAG_MODES.CURRENT ? ' active' : ''}`}
                        onClick={() => { if (dateSelection.mode !== TAG_MODES.CURRENT) toggleDateTagMode(); }}
                        aria-pressed={dateSelection.mode === TAG_MODES.CURRENT}
                      >
                        Current
                      </button>
                      <button
                        type="button"
                        className={`nnr-mode-seg-btn${dateSelection.mode === TAG_MODES.LAST ? ' active' : ''}`}
                        onClick={() => { if (dateSelection.mode !== TAG_MODES.LAST) toggleDateTagMode(); }}
                        aria-pressed={dateSelection.mode === TAG_MODES.LAST}
                      >
                        Last
                      </button>
                    </div>
                  </div>
                  <div className="nnr-tag-chips-grid">
                    {datePresets.map(preset => (
                      <button
                        key={preset.key}
                        type="button"
                        className={`nnr-tag-chip${dateSelection.tagKey === preset.key ? ' active' : ''}`}
                        onClick={() => applyDateTag(preset.key)}
                      >
                        @{preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="nnr-cal-popover-divider" />

                {/* H11: month-grid picker — collapsed until the field is clicked */}
                <NotionDatePicker
                  value={dateSelection.iso}
                  onChange={applyManualDate}
                  onClear={clearDateSelection}
                  dateFormat={dateFormat}
                  onDateFormatChange={setDateFormat}
                  expanded={showDateCalendar}
                  onToggleExpanded={() => setShowDateCalendar(v => !v)}
                />

                <div className="nnr-cal-popover-divider" />

                {/* H06: future NotionNest Calendar module */}
                <div
                  className="nnr-cal-popover-item nnr-cal-connect-btn"
                  role="button"
                  tabIndex={0}
                  onClick={connectNotionCalendar}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') connectNotionCalendar(); }}
                >
                  <Link size={14} />
                  <span>Connect Notion Calendar</span>
                </div>
              </div>
            )}
          </div>

          {/* H03/H10: title carries no prefix. contentEditable (not <input>)
              so long titles WRAP inside the block instead of overflowing the
              border, and the grey @date flows directly after the last word. */}
          <div className="mt-title-wrap">
            <span
              ref={titleRef}
              className="mt-title-input"
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label="Meeting title"
              data-placeholder="New meeting"
              onInput={handleTitleInput}
              onKeyDown={handleTitleKeyDown}
            />
            <span
              className="mt-calendar-tag"
              role="button"
              tabIndex={0}
              onClick={() => setShowCalendarPopover(true)}
              onKeyDown={e => { if (e.key === 'Enter') setShowCalendarPopover(true); }}
              title="Change meeting date"
            >
              @{headerDateLabel}
            </span>

            {/* BRIS-NN-MNB-T28: participants now sit inline right after the
                date, inside the title flow, so they wrap with the title
                instead of living over in the tab row. */}
            <span
              className="nnr-participants-inline"
              role="button"
              tabIndex={0}
              onClick={() => setShowParticipantsPanel(!showParticipantsPanel)}
              onKeyDown={e => { if (e.key === 'Enter') setShowParticipantsPanel(!showParticipantsPanel); }}
              aria-label={`Meeting participants (${(participants || []).length})`}
              title="Meeting participants"
            >
              {/* One overlapping circle per participant. Falls back to a
                  single person glyph when nobody has been added yet. */}
              {(participants || []).length === 0 ? (
                <span className="nnr-pi-circle nnr-pi-person">
                  <User size={13} />
                </span>
              ) : (
                (participants || []).map((p, i) => (
                  <span
                    key={p.id || i}
                    className="nnr-pi-circle nnr-pi-person"
                    style={{ zIndex: (participants || []).length - i }}
                  >
                    {p.name
                      ? p.name.trim().charAt(0).toUpperCase()
                      : <User size={13} />}
                  </span>
                ))
              )}

              <span className="nnr-pi-circle nnr-pi-add">
                <Plus size={13} />
                {/* unread/attention dot, as in the reference */}
                <span className="nnr-pi-dot" aria-hidden="true" />
              </span>

              {/* Hover roster — opens upward so it never covers the block */}
              {(participants || []).length > 0 && (
                <span className="nnr-pi-list" role="list">
                  {(participants || []).map((p, i) => (
                    <span className="nnr-pi-list-row" role="listitem" key={p.id || `r${i}`}>
                      <span className="nnr-pi-circle nnr-pi-person">
                        {p.name
                          ? p.name.trim().charAt(0).toUpperCase()
                          : <User size={13} />}
                      </span>
                      <span className="nnr-pi-list-name">{p.name || p.email}</span>
                    </span>
                  ))}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* H09: right-edge chip removed — the inline grey @date after the
            title is the single source of truth for the selected date. */}
      </div>
  );
}

export default MeetingHeader;
