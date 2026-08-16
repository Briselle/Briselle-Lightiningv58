/* ============================================================
   NotionNest — meeting-notes/constants.js
   Created At: 2026-08-15 | Last Modified: 2026-08-16
   Previous Version Back URL: meeting-notes/constants.js@2026-08-15
                              (10 prompts, 4 menu presets with none)

   Task: BRIS-NN-MNB-R06 / T92
   Purpose: Instruction prompt presets and language maps. No React.

   ════════════════════════════════════════════════════════════
   BRIS-NN-MNB-T92 — every preset now has a prompt.

   The menu used to offer ['Auto','Meeting','Interview','Call',
   'Stand-up','Workshop'] while this file defined prompts under
   different names. Four of those six resolved to nothing and fell
   back to Auto, so selecting them changed nothing at all.

   The two lists are now ONE list. INSTRUCTION_PRESET_ORDER below is
   the single source for both the menu order and the seeded database
   document, so they cannot drift apart again.

   Renamed to match the menu: 'Candidate Interview' → 'Interview',
   'Team Standup' → 'Stand-up'. Newly written: 'Call', 'Workshop'.

   NOTE: at runtime these are the SEED only. Once the
   `AIMeetingNotesPrompt` row exists in platform_config, that row is
   the source of truth — see services/aiPromptConfigService.ts.
   ════════════════════════════════════════════════════════════ */

/** Menu order and the order seeded into platform_config. */
export const INSTRUCTION_PRESET_ORDER = [
  'Auto',
  'Meeting',
  'Interview',
  'Call',
  'Stand-up',
  'Workshop',
  '1-on-1',
  'Technical Discussion',
  'Product Planning',
  'Brainstorming',
  'Client Review',
  'Sales',
];

/** Default glyph per preset. Keys must exist in CUSTOM_ICON_CHOICES. */
export const INSTRUCTION_PRESET_ICONS = {
  'Auto': 'Sparkles',
  'Meeting': 'Users',
  'Interview': 'Signpost',
  'Call': 'Headphones',
  'Stand-up': 'Users',
  'Workshop': 'Presentation',
  '1-on-1': 'Users',
  'Technical Discussion': 'FileText',
  'Product Planning': 'Presentation',
  'Brainstorming': 'Sparkles',
  'Client Review': 'Signpost',
  'Sales': 'Headphones',
};

export const DEFAULT_INSTRUCTION_PROMPTS = {
  'Auto': `Analyze the following interaction transcript and manual notes. Automatically detect the interaction type and generate a comprehensive summary.
Use markdown formatting: headers (##), bullet points (-), bold (**text**) for emphasis, and checkboxes (- [ ]) for action items.
Structure:
## Overview & Executive Summary
Key participants, purpose, and high-level outcomes.
## Key Discussion Points
Detailed breakdown of topics discussed.
## Action Items & Next Steps
Actionable items with assignees if mentioned.
## Key Decisions
All decisions agreed upon during the interaction.`,

  'Meeting': `Analyze the following meeting transcript and notes. Generate an executive meeting summary.
Structure:
## Executive Summary
Brief summary of the meeting context and core outcomes.
## Agenda & Topics Discussed
Detailed notes by topic.
## Decisions Made
Key decisions reached.
## Action Items & Ownership
- [ ] Task with owner and deadline.`,

  '1-on-1': `Analyze the following 1-on-1 meeting transcript and notes. Focus on individual performance, career goals, personal feedback, challenges, and support required.
Structure:
## Discussion Summary
Overview of the 1-on-1 conversation.
## Performance Updates
Key performance highlights and feedback.
## Career & Development Goals
Career aspirations and development objectives discussed.
## Challenges & Blockers
Current challenges requiring support or escalation.
## Action Items & Next Steps
- [ ] Action item`,

  'Sales': `Analyze the following sales call transcript. Identify prospect pain points, budget, timeline, decision-makers, product fit, objections, and next commercial steps.
Structure:
## Prospect Overview & Qualification
Company background, current stack, and identified pain points.
## Product Requirements
Key requirements and features discussed.
## Budget & Timeline
Budget range and timeline expectations.
## Decision Makers
Key stakeholders involved in the decision.
## Competitive Landscape
Other solutions being considered.
## Deal Risk Assessment
**Risk Level:** [Low / Medium / High]
## Action Items
- [ ] Send proposal/quote
## Next Steps
Follow-up demo or commercial negotiation call.`,

  /* T92: renamed from 'Candidate Interview' so the menu entry resolves. */
  'Interview': `Analyze the following interview transcript. Evaluate candidate background, technical skills, behavioral responses, culture fit, and overall recommendation.
Structure:
## Candidate Profile
Candidate name, role applied for, years of experience.
## Key Strengths & Technical Competency
Evidence of technical skills.
## Behavioral Assessment & Culture Fit
Soft skills and cultural alignment.
## Areas of Concern / Gaps
Identified skill gaps.
## Interview Recommendation
**Recommendation:** [Strong Hire / Hire / Neutral / Do Not Hire]`,

  'Technical Discussion': `Analyze the following technical discussion transcript. Summarize architectural decisions, trade-offs evaluated, tech stack choices, technical debt, and next technical milestones.
Structure:
## Technical Problem Statement
Core problem or feature being engineered.
## Architecture Decisions & Solutions
Detailed technical approach.
## Trade-offs & Alternatives Considered
Pros and cons discussed.
## Next Technical Milestones
- [ ] Implementation task`,

  'Product Planning': `Analyze the following product planning session transcript. Extract user stories, feature priorities, scope boundaries, risks, and roadmap timelines.
Structure:
## Product Vision & Goals
Feature goal and target user persona.
## User Stories & Functional Requirements
Key feature requirements.
## Out of Scope
Items explicitly deferred.
## Milestones & Target Release
Proposed release timeline.`,

  /* T92: renamed from 'Team Standup' so the menu entry resolves. */
  'Stand-up': `Analyze the following daily standup transcript. Summarize what each person completed yesterday, what they plan to do today, and all blockers.
Structure:
## Standup Summary
Brief overview of team progress.
## Updates by Participant
Per-person yesterday/today updates.
## Blockers & Escalations
Items requiring immediate attention.`,

  /* T92: new — the menu offered "Call" with no prompt behind it. */
  'Call': `Analyze the following call transcript and notes. This is a general
conversation rather than a structured meeting, so lead with what was actually
agreed rather than an agenda.
Structure:
## Call Summary
Who was on the call, why it happened, and the outcome in two or three sentences.
## What Was Discussed
The substance of the conversation, grouped by topic.
## Commitments Made
Anything either side promised to do, with the person who owns it.
## Open Questions
Points raised but not resolved on the call.
## Action Items & Next Steps
- [ ] Action item with owner and due date if mentioned.`,

  /* T92: new — the menu offered "Workshop" with no prompt behind it. */
  'Workshop': `Analyze the following workshop transcript and notes. A workshop
produces material rather than decisions, so capture what the group built and
where it landed, not just who spoke.
Structure:
## Workshop Purpose & Participants
The objective of the session and who took part.
## Activities & Exercises
What the group actually worked through, in order.
## Outputs & Artefacts
Concrete material produced — frameworks, lists, diagrams, drafts.
## Themes & Insights
Patterns that emerged across the exercises.
## Points of Disagreement
Where the group did not converge, and the positions held.
## Follow-up Actions
- [ ] Action item with owner.`,

  'Client Review': `Analyze the following client review meeting transcript. Summarize client satisfaction, deliverables status, feedback, risks, and next steps.
Structure:
## Account Status & Health
Overall sentiment and project health.
## Deliverables Review
Status of recent milestones.
## Client Feedback & Requests
Client feedback and feature requests.
## Next Steps
- [ ] Follow-up item`,

  'Brainstorming': `Analyze the following brainstorming session. Capture all generated ideas, group them by theme, highlight standout concepts, and summarize next exploration steps.
Structure:
## Brainstorming Topic
Core problem or theme.
## Ideas Grouped by Theme
Organized list of all generated ideas.
## Standout Concepts
Highest-potential ideas.
## Next Steps
- [ ] Experiment / Spike`
};

/* ── TASK-MN-INS-008I: 22 Indian + Global Language Map ── */


/* ── BRIS-NN-MNB-T03: recognition language resolution ──────────
   The Web Speech API needs a fixed BCP-47 tag per session; it cannot
   auto-detect. "Auto" therefore resolves to the browser/page locale,
   which is the honest best-effort without a server-side STT service. */
export const LANGUAGE_AUTO = 'Auto';

/** Labels used by the picker that aren't real languages. */
const NON_LANGUAGE_LABELS = new Set(['Indian Languages']);

/**
 * Map a picker label to a BCP-47 tag for SpeechRecognition.
 * Falls back to the browser locale, then en-US.
 */
export function resolveRecognitionLang(label) {
  const browser = (typeof navigator !== 'undefined' && navigator.language) || 'en-US';
  if (!label || label === LANGUAGE_AUTO || NON_LANGUAGE_LABELS.has(label)) return browser;
  if (LANGUAGE_CODE_MAP[label]) return LANGUAGE_CODE_MAP[label];
  // tolerate "English (India)" vs "English (IN)" style variations
  const loose = Object.keys(LANGUAGE_CODE_MAP)
    .find(k => k.toLowerCase().replace(/[()]/g, '') === String(label).toLowerCase().replace(/[()]/g, ''));
  return loose ? LANGUAGE_CODE_MAP[loose] : browser;
}

/** Indian languages surfaced first in the picker. */
export const INDIAN_LANGUAGES = [
  'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Bengali',
  'Gujarati', 'Punjabi', 'Odia', 'Assamese', 'Urdu', 'Konkani', 'Maithili',
  'Nepali', 'Sindhi', 'Sanskrit',
];

export const LANGUAGE_CODE_MAP = {
  'English': 'en', 'English (US)': 'en-US', 'English (UK)': 'en-GB', 'English (IN)': 'en-IN',
  'Tamil': 'ta', 'Hindi': 'hi', 'Telugu': 'te', 'Kannada': 'kn', 'Malayalam': 'ml',
  'Marathi': 'mr', 'Bengali': 'bn', 'Gujarati': 'gu', 'Punjabi': 'pa', 'Odia': 'or',
  'Assamese': 'as', 'Urdu': 'ur', 'Sanskrit': 'sa', 'Konkani': 'kok', 'Maithili': 'mai',
  'Dogri': 'doi', 'Manipuri': 'mni', 'Bodo': 'brx', 'Santali': 'sat', 'Kashmiri': 'ks',
  'Nepali': 'ne', 'Sindhi': 'sd', 'Spanish': 'es', 'French': 'fr', 'German': 'de',
  'Japanese': 'ja', 'Chinese': 'zh', 'Arabic': 'ar', 'Portuguese': 'pt', 'Russian': 'ru',
  'Italian': 'it', 'Korean': 'ko', 'Dutch': 'nl', 'Turkish': 'tr', 'Vietnamese': 'vi'
};

/* ── TASK-MN-INS-008L: Native Language Script Strings ── */
export const NATIVE_LANGUAGE_DISPLAY = {
  ta: 'தமிழ்', hi: 'हिंदी', te: 'తెలుగు', kn: 'ಕನ್ನಡ', ml: 'മലയാളം',
  mr: 'मराठी', bn: 'বাংলা', gu: 'ગુજરાતી', pa: 'ਪੰਜਾਬੀ', or: 'ଓଡ଼ିଆ',
  as: 'অসমীয়া', ur: 'اردو', sa: 'संस्कृतम्', kok: 'कोंकणी', mai: 'मैथिली',
  doi: 'डोगरी', mni: 'মৈতৈলোন্', brx: 'बर\'', sat: 'ᱥᱟᱱᱛᱟᱲᱤ', ks: 'کٲشُر',
  ne: 'नेपाली', sd: 'سنڌي', en: 'English', 'en-US': 'English', 'en-IN': 'English',
  es: 'Español', fr: 'Français', de: 'Deutsch', ja: '日本語', zh: '中文',
  ar: 'العربية', pt: 'Português', ru: 'Русский', it: 'Italiano', ko: '한국어',
  nl: 'Nederlands', tr: 'Türkçe', vi: 'Tiếng Việt'
};

export function getNativeLangDisplay(langCode, langName) {
  if (langCode && NATIVE_LANGUAGE_DISPLAY[langCode]) {
    return `${langName || langCode} (${NATIVE_LANGUAGE_DISPLAY[langCode]})`;
  }
  return langName || langCode || 'English';
}

