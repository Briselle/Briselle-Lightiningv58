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

/* ══════════════════════════════════════════════════════════════
   BRIS-NN-MNB-T102 — DEFAULT_INSTRUCTION_PROMPTS has been REMOVED.

   No prompt text lives in the client any more. The library is the
   platform_config row seeded by
   database/019_add_ai_prompts_config_type.sql
   (entity 1000000000, dobj 1000000002, config_type 8,
    config_name AIMeetingNotesPrompt).

   That row carries both the live prompts and a read-only `defaults`
   copy, so "Reset to default" also restores from the database rather
   than from anything compiled in here.

   The order and icon maps below are presentation metadata, not prompts,
   and are kept as the fallback ordering/glyphs for the menu.
   ══════════════════════════════════════════════════════════════ */

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

