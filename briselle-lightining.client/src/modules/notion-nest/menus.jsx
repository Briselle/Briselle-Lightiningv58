/* ============================================================
   NotionNest Ã¢â‚¬â€ menus.jsx  - new
   SlashMenu, ContextMenu, InlineToolbar, NotionIconPicker
   ============================================================ */
import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, memo } from 'react';
import * as allLucideIcons from 'lucide-react';
import {
  Smile, Check, MoreHorizontal, BookOpen, Pencil, Link, Bell, BellOff, Trash2,
  Paperclip, AtSign, Send, Clock, User, UserPlus, FileText, RotateCcw, Upload,
  MessageSquare, Minus, ChevronDown, ChevronUp
} from 'lucide-react';
import { usePageContext } from './PageContext';
import { slashMenuSections, calculateInitials } from './utils';
import UploadZone from './components/UploadZone';

export function formatRelativeTime(timeStr) {
  if (!timeStr) return '';
  if (timeStr === 'Just now') return 'now';
  
  const date = new Date(timeStr);
  if (isNaN(date.getTime())) {
    return timeStr; // Fallback
  }
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  
  // If it's in the future or very close to now (less than 60 seconds)
  if (diffSec < 60 && diffSec > -60) {
    return 'now';
  }
  
  // Use absolute difference to handle timezone offsets / clock skew gracefully
  const absSec = Math.abs(diffSec);
  
  const diffMin = Math.floor(absSec / 60);
  if (diffMin < 60) {
    return `${diffMin}m`;
  }
  
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return `${diffHr}h`;
  }
  
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) {
    return `${diffDays}d`;
  }
  
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4.3) {
    return `${diffWeeks}W`;
  }
  
  const diffMonths = Math.floor(diffDays / 30.4);
  if (diffMonths < 12) {
    return `${diffMonths}mo`;
  }
  
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears}Y`;
}

export function formatFullDateTime(timeStr) {
  if (!timeStr) return '';
  if (timeStr === 'Just now') return 'Just now';
  
  const date = new Date(timeStr);
  if (isNaN(date.getTime())) {
    return timeStr;
  }
  
  return date.toLocaleString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function getCommentTimestampFromId(id) {
  if (!id) return null;
  const match = id.match(/(?:cmt-draft-|cmt-)(\d+)/);
  if (match) {
    const timestamp = parseInt(match[1], 10);
    if (!isNaN(timestamp)) {
      return new Date(timestamp).toISOString();
    }
  }
  return null;
}

/* ---- Text & background color presets ---- */
const TEXT_COLORS = [
  { name: 'Default', color: '#e3e3e3' },
  { name: 'Gray', color: '#9b9b9b' },
  { name: 'Brown', color: '#a47d5e' },
  { name: 'Orange', color: '#d9730d' },
  { name: 'Yellow', color: '#dfab01' },
  { name: 'Green', color: '#0f7b6c' },
  { name: 'Blue', color: '#2383e2' },
  { name: 'Purple', color: '#9065b0' },
  { name: 'Pink', color: '#c14c8a' },
  { name: 'Red', color: '#eb5757' },
];
const BG_COLORS = [
  { name: 'Default', color: 'transparent' },
  { name: 'Gray', color: '#2c2c2c' },
  { name: 'Brown', color: '#3b2d20' },
  { name: 'Orange', color: '#3e2b15' },
  { name: 'Yellow', color: '#3d3415' },
  { name: 'Green', color: '#1a3229' },
  { name: 'Blue', color: '#192f45' },
  { name: 'Purple', color: '#2c233a' },
  { name: 'Pink', color: '#351a2c' },
  { name: 'Red', color: '#3e2024' },
];
const BLOCK_TYPE_OPTIONS = [
  { value: 'paragraph', label: 'Text' },
  { value: 'heading1', label: 'Heading 1' },
  { value: 'heading2', label: 'Heading 2' },
  { value: 'heading3', label: 'Heading 3' },
  { value: 'bulleted_list', label: 'Bulleted List' },
  { value: 'numbered_list', label: 'Numbered List' },
  { value: 'todo', label: 'To-do' },
  { value: 'quote', label: 'Quote' },
  { value: 'callout', label: 'Callout' },
  { value: 'code', label: 'Code' },
];
/* ---- Comprehensive Emoji Data ---- */
const EMOJI_CATEGORIES = [
  { id: 'recent', label: 'Recently Used', icon: '🕐', emojis: ['👍', '❤️', '😊', '🎯', '✅', '🔥', '💡', '⭐', '📌', '🚀'] },
  {
    id: 'smileys', label: 'Smileys & People', icon: '😀', emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪'
    ]
  },
  {
    id: 'nature', label: 'Nature', icon: '🌿', emojis: [
      '🌿', '🌸', '🌺', '🌻', '🌼', '🌹', '🌱', '🍀', '🍁', '🍂', '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🐐', '🦌', '🐕', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦫'
    ]
  },
  {
    id: 'food', label: 'Food & Drink', icon: '🍔', emojis: [
      '🍔', '🍕', '🍟', '🌭', '🥪', '🌮', '🌯', '🥗', '🥘', '🍲', '🍜', '🍝', '🍣', '🍱', '🥟', '🍤', '🍙', '🍚', '🍛', '🍳', '🥐', '🥖', '🥨', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓', '🍏', '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🌶️', '🌽', '🥕', '🥔', '🍠', '🌰', '🥜', '🍯', '🍿', '🍫', '🍬', '🍭', '🍮', '🍰', '🧁', '🥧', '🍩', '🍪', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🍾', '☕', '🍵', '🥤', '🥛', '🍼'
    ]
  },
  {
    id: 'activity', label: 'Activity', icon: '⚽', emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🎱', '🪀', '🏓', '🥅', '🏒', '🏹', '🎣', '🤿', '⛳', '🎯', '🪁', '🎮', '🎲', '🧩', '🎳', '🎨', '🎬', '🎤', '🎧', '🎸', '🎹', '🎺', '🎻', '🥁', '🛹', '🚲', '🥊', '🥋', '🎿', '🏂', '🪂', '🏋️', '🤺', '🤼', '🤸', '⛹️', '🤾', '🧗'
    ]
  },
  {
    id: 'travel', label: 'Travel & Places', icon: '✈️', emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚑', '🚒', '🚀', '🛸', '🛰️', '🚁', '🛶', '⛵', '🚢', '🚂', '🚇', '🚉', '🚲', '🛵', '🏍️', '🌍', '🌎', '🌏', '🗺️', '🏔️', '🌋', '🗻', '🏕️', '🏖️', '🏜️', '🏝️', '🏡', '🏢', '🏰', '🗼', '🗽', '⛪', '✈️'
    ]
  },
  {
    id: 'objects', label: 'Objects', icon: '💡', emojis: [
      '💡', '🔦', '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '💾', '💿', '📷', '📹', '🎥', '📼', '🔍', '🔬', '🔭', '📡', '🕯️', '📖', '📕', '📝', '✉️', '📦', '✏️', '✒️', '📎', '✂️', '🔨', '🔧', '🔩', '🧱', '🛡️', '🔑', '🔒', '🔐', '🎨', '🛒', '🎁', '🎈', '🎉', '🛏️', '🛋️', '🚽', '🚿', '🧼', '🧹'
    ]
  },
  {
    id: 'symbols', label: 'Symbols', icon: '❤️', emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '✅', '❌', '❓', '❔', '❗️', '❕', '⚠️', '⛔', '🚫', '💯', '🛑', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤'
    ]
  },
  {
    id: 'flags', label: 'Flags', icon: '🚩', emojis: [
      '🚩', '🏳️', '🏴', '🏴‍☠️', '🏁', '🏳️‍🌈', '🏳️‍⚧️', '🇺🇸', '🇨🇦', '🇬🇧', '🇩🇪', '🇫🇷', '🇯🇵', '🇨🇳', '🇮🇳', '🇧🇷', '🇰🇷', '🇮🇹', '🇪🇸', '🇷🇺'
    ]
  }
];
/* ---- SVG Icon Library (inline SVGs for icon tab) ---- */
export const SVG_ICONS = [
  { name: 'Home', path: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
  { name: 'Star', path: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
  { name: 'Heart', path: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' },
  { name: 'Check', path: 'M20 6L9 17l-5-5' },
  { name: 'Plus', path: 'M12 5v14M5 12h14' },
  { name: 'Search', path: 'M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM21 21l-4.35-4.35' },
  { name: 'Settings', path: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z' },
  { name: 'Mail', path: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6' },
  { name: 'Calendar', path: 'M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18' },
  { name: 'Clock', path: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2' },
  { name: 'User', path: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z' },
  { name: 'Users', path: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
  { name: 'Bell', path: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0' },
  { name: 'Bookmark', path: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z' },
  { name: 'Flag', path: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7' },
  { name: 'Folder', path: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z' },
  { name: 'File', path: 'M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM13 2v7h7' },
  { name: 'Edit', path: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' },
  { name: 'Trash', path: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' },
  { name: 'Link', path: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' },
  { name: 'Image', path: 'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21' },
  { name: 'Camera', path: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
  { name: 'Video', path: 'M23 7l-7 5 7 5zM14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z' },
  { name: 'Music', path: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z' },
  { name: 'Globe', path: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' },
  { name: 'Map', path: 'M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16' },
  { name: 'Compass', path: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z' },
  { name: 'Sun', path: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42' },
  { name: 'Moon', path: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z' },
  { name: 'Cloud', path: 'M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z' },
  { name: 'Zap', path: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' },
  { name: 'Award', path: 'M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.21 13.89L7 23l5-3 5 3-1.21-9.12' },
  { name: 'Target', path: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z' },
  { name: 'Rocket', path: 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z' },
  { name: 'Lock', path: 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4' },
  { name: 'Key', path: 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4' },
  { name: 'Shield', path: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
  { name: 'Terminal', path: 'M4 17l6-5-6-5M12 19h8' },
  { name: 'Code', path: 'M16 18l6-6-6-6M8 6l-6 6 6 6' },
  { name: 'Database', path: 'M12 2C6.48 2 2 4.02 2 6.5v11C2 19.98 6.48 22 12 22s10-2.02 10-4.5v-11C22 4.02 17.52 2 12 2zM2 6.5C2 8.98 6.48 11 12 11s10-2.02 10-4.5M2 12c0 2.48 4.48 4.5 10 4.5s10-2.02 10-4.5' },
  { name: 'Layout', path: 'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM3 9h18M9 21V9' },
  { name: 'Grid', path: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z' },
  { name: 'List', path: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
  { name: 'Filter', path: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z' },
  { name: 'BarChart', path: 'M12 20V10M18 20V4M6 20v-4' },
  { name: 'PieChart', path: 'M21.21 15.89A10 10 0 1 1 8 2.83M22 12A10 10 0 0 0 12 2v10z' },
  { name: 'Layers', path: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
  { name: 'Box', path: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12' },
  { name: 'Tag', path: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01' },
  { name: 'Gift', path: 'M20 12v10H4V12M2 7h20v5H2V7zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z' },
  { name: 'Coffee', path: 'M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3' },
  { name: 'Tool', path: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' },
];
/* ---- Selection save/restore helpers ---- */
function saveSelection() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) return sel.getRangeAt(0).cloneRange();
  return null;
}
function restoreSelection(range) {
  if (!range) return;
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}
/* ==================================================================
   SLASH COMMAND MENU
   ================================================================== */
export const SlashMenu = memo(function SlashMenu() {
  const { slashMenu, hideSlashMenu, updateSlashFilter, changeBlockType, updateBlockContent } = usePageContext();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef(null);
  const getVisibleItems = useCallback(() => {
    const items = [];
    slashMenuSections.forEach(section => {
      section.items.forEach(item => {
        const match = !slashMenu.filter || item.name.toLowerCase().includes(slashMenu.filter) || item.type.includes(slashMenu.filter);
        if (match) items.push(item);
      });
    });
    return items;
  }, [slashMenu.filter]);
  const selectItem = useCallback((type) => {
    if (slashMenu.blockId) { updateBlockContent(slashMenu.blockId, ''); changeBlockType(slashMenu.blockId, type); }
    hideSlashMenu();
  }, [slashMenu.blockId, updateBlockContent, changeBlockType, hideSlashMenu]);
  useEffect(() => {
    if (!slashMenu.open) return;
    setSelectedIndex(0);
    const handler = (e) => {
      const visible = getVisibleItems();
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => (i + 1) % Math.max(1, visible.length)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => (i - 1 + visible.length) % Math.max(1, visible.length)); }
      else if (e.key === 'Enter') { e.preventDefault(); if (visible[selectedIndex]) selectItem(visible[selectedIndex].type); }
      else if (e.key === 'Escape') { hideSlashMenu(); }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [slashMenu.open, slashMenu.filter, selectedIndex, getVisibleItems, selectItem, hideSlashMenu]);
  useEffect(() => {
    if (!slashMenu.open) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) hideSlashMenu(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [slashMenu.open, hideSlashMenu]);
  if (!slashMenu.open) return null;
  const visibleItems = getVisibleItems();
  let itemIndex = 0;
  const style = {};
  if (slashMenu.position) { style.left = Math.max(8, (slashMenu.position.x || 0) - 16); style.top = (slashMenu.position.y || 0) + 6; }
  return (
    <div className="slash-menu" ref={menuRef} style={style}>
      {slashMenuSections.map(section => {
        const sectionItems = section.items.filter(item => !slashMenu.filter || item.name.toLowerCase().includes(slashMenu.filter) || item.type.includes(slashMenu.filter));
        if (sectionItems.length === 0) return null;
        return (<div key={section.label}><div className="slash-menu-header">{section.label}</div>
          {sectionItems.map(item => {
            const idx = itemIndex++; return (
              <div key={item.type} className={`slash-menu-item${idx === selectedIndex ? ' selected' : ''}`} onClick={() => selectItem(item.type)} onMouseEnter={() => setSelectedIndex(idx)}>
                <span className="slash-menu-item-icon">{item.icon}</span><div className="slash-menu-item-info"><span className="slash-menu-item-name">{item.name}</span><span className="slash-menu-item-description">{item.desc}</span></div>
              </div>);
          })}
        </div>);
      })}
      {visibleItems.length === 0 && <div className="slash-menu-empty">No results</div>}
    </div>
  );
});
/* ==================================================================
   CONTEXT MENU Ã¢â‚¬â€  fixed: submenu items don't auto-close
   ================================================================== */
export const ContextMenu = memo(function ContextMenu() {
  const { contextMenu, hideContextMenu } = usePageContext();
  const menuRef = useRef(null);
  useEffect(() => {
    if (!contextMenu.open) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) hideContextMenu(); };
    const esc = (e) => { if (e.key === 'Escape') hideContextMenu(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', esc); };
  }, [contextMenu.open, hideContextMenu]);
  if (!contextMenu.open) return null;
  return (
    <div className="context-menu" ref={menuRef} style={{ left: contextMenu.x, top: contextMenu.y }}>
      {contextMenu.items.map((item, i) => {
        if (item.divider) return <div key={`d${i}`} className="context-menu-divider" />;
        if (item.header) return <div key={`h${i}`} className="context-menu-header">{item.label}</div>;
        return (
          <div key={`${item.label}-${i}`}
            className={`context-menu-item${item.danger ? ' danger' : ''}${item.disabled ? ' disabled' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              if (item.disabled) return;
              if (item.action) item.action(e);
              // Don't hide if this item opens a submenu
              if (!item.submenu) hideContextMenu();
            }}>
            {item.swatch && <span className="context-menu-swatch" style={{ background: item.swatch, borderColor: item.swatchBorder ? 'rgba(255,255,255,.25)' : undefined }} />}
            {item.label}
            {item.shortcut && <span className="context-menu-shortcut">{item.shortcut}</span>}
            {item.submenu && <span style={{ marginLeft: 'auto', fontSize: 11, opacity: .5 }}>▶</span>}
          </div>
        );
      })}
    </div>
  );
});
/* ==================================================================
   NOTION-STYLE ICON PICKER Ã¢â‚¬â€  Emoji + Icons + Upload tabs w/ search
   ================================================================== */
// Start loading Lucide icons list immediately in the background
let cachedLucideIcons = null;
let isFetchingLucide = false;
const lucideListeners = new Set();

export function getCachedLucideIcons() {
  return cachedLucideIcons;
}

export function toPascalCase(str) {
  if (!str) return '';
  return str
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

export function renderIconSvg(iconName, size = 18, color = 'currentColor') {
  if (!iconName) return null;
  const pascalName = toPascalCase(iconName);
  const Comp = allLucideIcons[pascalName];
  if (Comp) {
    return <Comp size={size} color={color} style={{ display: 'block', flexShrink: 0 }} />;
  }
  
  // Fallback to static SVG_ICONS
  const staticItem = SVG_ICONS.find(ic => ic.name.toLowerCase() === iconName.toLowerCase() || ic.name === iconName);
  if (staticItem) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: size, height: size, color, display: 'block', flexShrink: 0 }}
      >
        <path d={staticItem.path} />
      </svg>
    );
  }

  // Fallback to Smile icon if not found
  const Fallback = allLucideIcons.Smile;
  if (Fallback) {
    return <Fallback size={size} color={color} style={{ display: 'block', flexShrink: 0 }} />;
  }
  
  return null;
}

export function hasPageIcon(icon) {
  return icon && icon.trim() !== '' && icon !== 'none' && icon !== 'null' && icon !== 'undefined';
}

export function renderPageIcon(icon, size = '78px') {
  if (!hasPageIcon(icon)) return null;
  
  // Parse size to a numeric value
  const numericSize = typeof size === 'string' && size.endsWith('px') 
    ? parseInt(size.replace('px', ''), 10) 
    : (typeof size === 'number' ? size : 78);

  if (icon.startsWith('svg:')) {
    const parts = icon.slice(4).split(':');
    const name = parts[0];
    const colorName = parts[1] || 'default';
    const ICON_COLORS = [
      { name: 'default', color: 'currentColor' },
      { name: 'gray', color: '#9b9b9b' },
      { name: 'brown', color: '#a47d5e' },
      { name: 'orange', color: '#d9730d' },
      { name: 'yellow', color: '#dfab01' },
      { name: 'green', color: '#0f7b6c' },
      { name: 'blue', color: '#2383e2' },
      { name: 'purple', color: '#9065b0' },
      { name: 'pink', color: '#c14c8a' },
      { name: 'red', color: '#eb5757' },
    ];
    const colorObj = ICON_COLORS.find(c => c.name === colorName);
    const resolvedColor = colorObj ? colorObj.color : (colorName.startsWith('#') ? colorName : `#${colorName}`);
    
    return renderIconSvg(name, numericSize, resolvedColor);
  }
  
  if (icon.startsWith('initials:')) {
    const parts = icon.slice(9).split(':');
    const text = parts[0] || 'UN';
    const bgName = parts[1] || 'default';
    
    const BG_COLORS = {
      default: '#37352f',
      gray: '#5a5a5a',
      brown: '#603b2c',
      orange: '#854c1d',
      yellow: '#89632a',
      green: '#2b593f',
      blue: '#205c90',
      purple: '#5c3a85',
      pink: '#7c355b',
      red: '#8a3a3b'
    };
    
    const resolvedBg = bgName.startsWith('#') ? bgName : (BG_COLORS[bgName] || '#205c90');
    const fontSize = Math.max(10, Math.floor(numericSize * 0.42));
    
    return (
      <div 
        style={{ 
          width: size, 
          height: size, 
          borderRadius: numericSize > 24 ? '12px' : '4px', 
          backgroundColor: resolvedBg, 
          color: '#ffffff', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          fontWeight: '600', 
          fontSize: `${fontSize}px`,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textTransform: 'uppercase',
          userSelect: 'none',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
          flexShrink: 0
        }}
      >
        {text}
      </div>
    );
  }
  
  if (icon.startsWith('data:image/') || icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('/')) {
    return <img src={icon} alt="Page icon" style={{ width: size, height: size, borderRadius: '8px', objectFit: 'cover' }} />;
  }
  
  return <span style={{ fontSize: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>{icon}</span>;
}

export function fetchLucideIcons() {
  if (cachedLucideIcons || isFetchingLucide) return;
  isFetchingLucide = true;
  Promise.all([
    fetch('https://cdn.jsdelivr.net/npm/lucide-static/icon-nodes.json').then(res => res.json()),
    fetch('https://cdn.jsdelivr.net/npm/lucide-static/tags.json').then(res => res.json()).catch(() => ({}))
  ])
    .then(([nodesData, tagsData]) => {
      const list = Object.keys(nodesData)
        .filter(key => {
          const pascalName = toPascalCase(key);
          return !!allLucideIcons[pascalName] || SVG_ICONS.some(ic => ic.name.toLowerCase() === key.toLowerCase());
        })
        .map(key => ({
          name: key,
          nodes: nodesData[key],
          tags: tagsData[key] || []
        }));
      cachedLucideIcons = list;
      lucideListeners.forEach(listener => listener(list));
      lucideListeners.clear();
      window.dispatchEvent(new CustomEvent('lucide-icons-loaded'));
    })
    .catch(err => {
      console.error('Failed to load Lucide icons dynamically:', err);
      const fallback = SVG_ICONS.map(ic => ({
        name: ic.name.toLowerCase(),
        nodes: [['path', { d: ic.path }]],
        tags: []
      }));
      cachedLucideIcons = fallback;
      lucideListeners.forEach(listener => listener(fallback));
      lucideListeners.clear();
    });
}

let cachedEmojiTags = null;
let isFetchingEmojiTags = false;
const emojiTagsListeners = new Set();

export function fetchEmojiTags() {
  if (cachedEmojiTags || isFetchingEmojiTags) return;
  isFetchingEmojiTags = true;
  fetch('https://cdn.jsdelivr.net/npm/emojilib/dist/emoji-en-US.json')
    .then(res => res.json())
    .then(data => {
      cachedEmojiTags = data;
      emojiTagsListeners.forEach(listener => listener(data));
      emojiTagsListeners.clear();
      window.dispatchEvent(new CustomEvent('emoji-tags-loaded'));
    })
    .catch(err => {
      console.error('Failed to load emoji tags:', err);
      cachedEmojiTags = {};
      emojiTagsListeners.forEach(listener => listener({}));
      emojiTagsListeners.clear();
    });
}

// Trigger initial fetch
if (typeof window !== 'undefined') {
  fetchLucideIcons();
  fetchEmojiTags();
}

const ICON_COLORS = [
  { name: 'default', color: '#706e6b', label: 'Default' },
  { name: 'gray', color: '#9b9b9b', label: 'Gray' },
  { name: 'brown', color: '#a47d5e', label: 'Brown' },
  { name: 'orange', color: '#d9730d', label: 'Orange' },
  { name: 'yellow', color: '#dfab01', label: 'Yellow' },
  { name: 'green', color: '#0f7b6c', label: 'Green' },
  { name: 'blue', color: '#2383e2', label: 'Blue' },
  { name: 'purple', color: '#9065b0', label: 'Purple' },
  { name: 'pink', color: '#c14c8a', label: 'Pink' },
  { name: 'red', color: '#eb5757', label: 'Red' },
];

export const NotionIconPicker = memo(function NotionIconPicker({ position, currentIcon, onSelect, onClose }) {
  const ref = useRef(null);
  const { pageState } = usePageContext();
  const [tab, setTab] = useState(() => {
    if (currentIcon && currentIcon.startsWith('initials:')) {
      return 'initials';
    }
    return 'emoji';
  });
  const [filter, setFilter] = useState('');
  const [emojiCat, setEmojiCat] = useState('smileys');
  const [lucideIcons, setLucideIcons] = useState(cachedLucideIcons || []);
  const [emojiTags, setEmojiTags] = useState(cachedEmojiTags || {});
  const [colorOpen, setColorOpen] = useState(false);
  const [askAlways, setAskAlways] = useState(() => {
    try {
      return localStorage.getItem('nn-icon-ask-always') === 'true';
    } catch {
      return false;
    }
  });

  const [initialsMode, setInitialsMode] = useState(() => {
    if (currentIcon && currentIcon.startsWith('initials:')) {
      const parts = currentIcon.slice(9).split(':');
      return parts[2] || 'two';
    }
    return 'two';
  });

  const [customInitialsText, setCustomInitialsText] = useState(() => {
    if (currentIcon && currentIcon.startsWith('initials:')) {
      const parts = currentIcon.slice(9).split(':');
      if (parts[2] === 'custom') {
        return parts[0];
      }
    }
    return '';
  });

  const handleAskAlwaysChange = (e) => {
    const checked = e.target.checked;
    setAskAlways(checked);
    try {
      localStorage.setItem('nn-icon-ask-always', checked ? 'true' : 'false');
    } catch (err) {
      console.error(err);
    }
  };

  const [activeColor, setActiveColor] = useState(() => {
    if (currentIcon && currentIcon.startsWith('svg:')) {
      const parts = currentIcon.slice(4).split(':');
      return parts[1] || 'default';
    }
    if (currentIcon && currentIcon.startsWith('initials:')) {
      const parts = currentIcon.slice(9).split(':');
      return parts[1] || 'default';
    }
    return 'default';
  });

  let currentIconName = '';
  if (currentIcon && currentIcon.startsWith('svg:')) {
    const parts = currentIcon.slice(4).split(':');
    currentIconName = parts[0];
  }

  const changeColor = (newColor) => {
    setActiveColor(newColor);
    if (tab === 'icons' && currentIconName) {
      onSelect(`svg:${currentIconName}:${newColor}`);
    } else if (tab === 'initials') {
      const text = calculateInitials(pageState.title, initialsMode, customInitialsText);
      onSelect(`initials:${text}:${newColor}:${initialsMode}`);
    }
  };

  const handleInitialsModeChange = (mode) => {
    setInitialsMode(mode);
    const text = calculateInitials(pageState.title, mode, customInitialsText);
    onSelect(`initials:${text}:${activeColor}:${mode}`);
  };

  const handleCustomInitialsChange = (e) => {
    const val = e.target.value.slice(0, 2);
    setCustomInitialsText(val);
    const text = calculateInitials(pageState.title, 'custom', val);
    onSelect(`initials:${text}:${activeColor}:custom`);
  };

  const handleApplyInitials = () => {
    const text = calculateInitials(pageState.title, initialsMode, customInitialsText);
    onSelect(`initials:${text}:${activeColor}:${initialsMode}`);
    onClose();
  };

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', esc); };
  }, [onClose]);

  useEffect(() => {
    if (cachedLucideIcons) {
      setLucideIcons(cachedLucideIcons);
      return;
    }
    const handleLoaded = () => {
      if (cachedLucideIcons) {
        setLucideIcons(cachedLucideIcons);
      }
    };
    window.addEventListener('lucide-icons-loaded', handleLoaded);
    fetchLucideIcons();
    return () => {
      window.removeEventListener('lucide-icons-loaded', handleLoaded);
    };
  }, []);

  useEffect(() => {
    if (cachedEmojiTags) {
      setEmojiTags(cachedEmojiTags);
      return;
    }
    const handleLoaded = () => {
      if (cachedEmojiTags) {
        setEmojiTags(cachedEmojiTags);
      }
    };
    window.addEventListener('emoji-tags-loaded', handleLoaded);
    fetchEmojiTags();
    return () => {
      window.removeEventListener('emoji-tags-loaded', handleLoaded);
    };
  }, []);

  const q = filter.trim().toLowerCase();

  const totalEmojis = EMOJI_CATEGORIES.reduce((acc, cat) => acc + cat.emojis.length, 0);
  const allEmojis = EMOJI_CATEGORIES.flatMap(c => c.emojis);
  const filteredEmojis = q
    ? allEmojis.filter(em => {
        if (em.includes(q)) return true;
        const tags = emojiTags[em];
        return tags && tags.some(tag => tag.toLowerCase().includes(q));
      })
    : [];
  const currentEmojisCount = q ? filteredEmojis.length : totalEmojis;

  const listToUse = lucideIcons.length > 0 ? lucideIcons : SVG_ICONS.map(ic => ({ name: ic.name, tags: [] }));
  const filteredIcons = q
    ? listToUse.filter(ic => {
        const nameMatch = ic.name.toLowerCase().includes(q);
        const tagsMatch = ic.tags && ic.tags.some(tag => tag.toLowerCase().includes(q));
        return nameMatch || tagsMatch;
      })
    : listToUse;
  const currentIconsCount = filteredIcons.length;

  const handleCatClick = (catId) => {
    setEmojiCat(catId);
    const container = ref.current?.querySelector('.nip-body');
    const target = ref.current?.querySelector(`#nip-cat-${catId}`);
    if (container && target) {
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      container.scrollTop = targetRect.top - containerRect.top + container.scrollTop - 4;
    }
  };

  const handleRandom = () => {
    if (tab === 'emoji') {
      const pool = EMOJI_CATEGORIES.flatMap(c => c.emojis);
      const rand = pool[Math.floor(Math.random() * pool.length)];
      onSelect(rand);
    } else if (tab === 'icons') {
      const list = lucideIcons.length > 0 ? lucideIcons : SVG_ICONS;
      const rand = list[Math.floor(Math.random() * list.length)];
      const randomIconString = `svg:${rand.name}:${activeColor}`;
      onSelect(randomIconString);
    }
    if (!askAlways) {
      onClose();
    }
  };

  const previewText = calculateInitials(pageState.title, initialsMode, customInitialsText);

  return (
    <div ref={ref} className="notion-icon-picker" style={{ left: position?.x || 0, top: position?.y || 0 }} onMouseDown={e => e.stopPropagation()}>
      {/* Tab bar */}
      <div className="nip-tabs">
        <button className={`nip-tab${tab === 'emoji' ? ' active' : ''}`} onClick={() => setTab('emoji')}>Emoji</button>
        <button className={`nip-tab${tab === 'icons' ? ' active' : ''}`} onClick={() => setTab('icons')}>Icons</button>
        <button className={`nip-tab${tab === 'initials' ? ' active' : ''}`} onClick={() => setTab('initials')}>Initials</button>
        <button className={`nip-tab${tab === 'upload' ? ' active' : ''}`} onClick={() => setTab('upload')}>Upload</button>
        <button className="nip-remove" onClick={() => { onSelect(''); onClose(); }}>Remove</button>
      </div>
      
      {/* Search & Toolbar */}
      <div className="nip-search" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '6px 12px', borderBottom: '1px solid #dddbda' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input
            type="text"
            placeholder={tab === 'initials' ? "Initials tab active…" : "Filter…"}
            value={filter}
            onChange={e => setFilter(e.target.value)}
            disabled={tab === 'initials'}
            autoFocus
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              width: '100%',
              fontSize: '13px',
              opacity: tab === 'initials' ? 0.5 : 1
            }}
          />
        </div>

        {/* Count display */}
        {tab === 'emoji' && (
          <span style={{ fontSize: '11px', color: '#b0adab', userSelect: 'none', marginRight: '4px' }}>
            {currentEmojisCount}
          </span>
        )}
        {tab === 'icons' && (
          <span style={{ fontSize: '11px', color: '#b0adab', userSelect: 'none', marginRight: '4px' }}>
            {currentIconsCount}
          </span>
        )}
        
        {/* Color Picker Dot next to Random button */}
        {(tab === 'icons' || tab === 'initials') && (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button
              className="nip-color-selector-btn"
              title="Change icon color"
              onClick={() => setColorOpen(v => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                background: '#f3f2f1',
                border: '1px solid #e3e3e3',
                borderRadius: '6px',
                padding: '2px 4px',
                cursor: 'pointer',
                height: '24px',
                marginRight: '2px',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: ICON_COLORS.find(c => c.name === activeColor)?.color || (activeColor.startsWith('#') ? activeColor : '#706e6b'),
                display: 'inline-block'
              }} />
              <ChevronDown size={10} style={{ color: '#706e6b' }} />
            </button>
            {colorOpen && (
              <div
                className="nip-color-picker-dropdown"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  backgroundColor: '#ffffff',
                  border: '1px solid #e3e3e3',
                  borderRadius: '10px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.05)',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  zIndex: 200,
                  width: '210px',
                  animation: 'menuIn 0.12s ease'
                }}
              >
                {/* Standard Colors label */}
                <div style={{ fontSize: '11px', color: '#706e6b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Standard Colors
                </div>

                {/* Standard colors grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                  {ICON_COLORS.map(c => (
                    <button
                      key={c.name}
                      title={c.label}
                      onClick={() => {
                        changeColor(c.name);
                        setColorOpen(false);
                      }}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: c.color,
                        border: activeColor === c.name ? '2px solid #37352f' : '1px solid #e3e3e3',
                        cursor: 'pointer',
                        padding: 0,
                        boxShadow: activeColor === c.name ? '0 0 0 2px #ffffff' : 'none',
                        transition: 'transform 0.1s ease',
                        outline: 'none'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  ))}
                </div>

                <div style={{ borderTop: '1px solid #f1f1f0', margin: '2px 0' }} />

                {/* Custom Color label */}
                <div style={{ fontSize: '11px', color: '#706e6b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Custom Color
                </div>

                {/* Custom color picker row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div 
                    style={{ 
                      position: 'relative', 
                      width: '26px', 
                      height: '26px', 
                      borderRadius: '50%', 
                      overflow: 'hidden', 
                      border: '1px solid #e3e3e3',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      const pickerInput = document.getElementById('nip-custom-color-input-field');
                      if (pickerInput) pickerInput.click();
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(135deg, #ff0055, #ffcc00, #33ccff, #ae00ff)',
                      }}
                    />
                    <input
                      id="nip-custom-color-input-field"
                      type="color"
                      value={activeColor.startsWith('#') ? activeColor : '#2383e2'}
                      onChange={(e) => {
                        changeColor(e.target.value);
                      }}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer',
                        pointerEvents: 'none'
                      }}
                    />
                  </div>
                  
                  {/* Hex Text input */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    border: '1px solid #e3e3e3', 
                    borderRadius: '6px', 
                    padding: '4px 8px', 
                    flex: 1, 
                    backgroundColor: '#f9f9f9',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                  }}>
                    <span style={{ fontSize: '12px', color: '#b0adab', marginRight: '4px', fontFamily: 'monospace' }}>#</span>
                    <input
                      type="text"
                      value={activeColor.startsWith('#') ? activeColor.slice(1) : ''}
                      placeholder="Hex code"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^[0-9A-Fa-f]{0,6}$/.test(val)) {
                          if (val.length === 6 || val.length === 3) {
                            changeColor(`#${val}`);
                          } else {
                            setActiveColor(`#${val}`);
                          }
                        }
                      }}
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '12px',
                        outline: 'none',
                        padding: 0,
                        color: '#37352f',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f1f0', margin: '2px 0' }} />

                {/* Ask Always row */}
                <label 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    fontSize: '12px', 
                    color: '#37352f', 
                    cursor: 'pointer', 
                    userSelect: 'none', 
                    padding: '4px 0',
                    transition: 'color 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#000000'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#37352f'}
                >
                  <input
                    type="checkbox"
                    checked={askAlways}
                    onChange={handleAskAlwaysChange}
                    style={{ 
                      margin: 0, 
                      cursor: 'pointer',
                      accentColor: '#2383e2',
                      width: '14px',
                      height: '14px'
                    }}
                  />
                  <span>Ask always for color</span>
                </label>
              </div>
            )}
          </div>
        )}

        {tab !== 'upload' && tab !== 'initials' && (
          <button className="nip-random" title="Random" onClick={handleRandom} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <allLucideIcons.Shuffle size={14} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="nip-body" style={{ position: 'relative', overflowY: 'auto' }}>
        {tab === 'emoji' && (
          <div className="nip-emoji-scroll-wrapper">
            {q ? (
              <div className="nip-emoji-grid">
                {filteredEmojis.map((em, i) => (
                  <button key={`${em}-${i}`} className="nip-emoji-cell" onClick={() => { onSelect(em); onClose(); }}>{em}</button>
                ))}
              </div>
            ) : (
              EMOJI_CATEGORIES.map(cat => (
                <div key={cat.id} id={`nip-cat-${cat.id}`} className="nip-emoji-section" style={{ marginBottom: '12px' }}>
                  <div className="nip-cat-label" style={{ fontWeight: '600', fontSize: '11px', color: '#706e6b', padding: '4px 0', textTransform: 'uppercase' }}>{cat.label}</div>
                  <div className="nip-emoji-grid">
                    {cat.emojis.map((em, i) => (
                      <button key={`${em}-${i}`} className="nip-emoji-cell" onClick={() => { onSelect(em); onClose(); }}>{em}</button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        
        {tab === 'icons' && (
          <div className="nip-icon-grid">
            {filteredIcons.map(ic => {
              const hexColor = ICON_COLORS.find(c => c.name === activeColor)?.color || (activeColor.startsWith('#') ? activeColor : 'currentColor');
              return (
                <button
                  key={ic.name}
                  className="nip-icon-cell"
                  title={ic.name}
                  onClick={() => {
                    onSelect(`svg:${ic.name}:${activeColor}`);
                    if (!askAlways) {
                      onClose();
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background: 'transparent',
                    border: 'none'
                  }}
                >
                  {renderIconSvg(ic.name, 18, hexColor)}
                </button>
              );
            })}
          </div>
        )}

        {tab === 'initials' && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Format selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: '600', color: '#706e6b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Format</span>
              <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f1f1f0', padding: '3px', borderRadius: '8px' }}>
                <button
                  onClick={() => handleInitialsModeChange('two')}
                  style={{
                    flex: 1,
                    padding: '6px',
                    fontSize: '11px',
                    fontWeight: initialsMode === 'two' ? '600' : '400',
                    border: 'none',
                    borderRadius: '6px',
                    background: initialsMode === 'two' ? '#ffffff' : 'transparent',
                    boxShadow: initialsMode === 'two' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    cursor: 'pointer',
                    color: initialsMode === 'two' ? '#37352f' : '#706e6b',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Two Letters
                </button>
                <button
                  onClick={() => handleInitialsModeChange('single')}
                  style={{
                    flex: 1,
                    padding: '6px',
                    fontSize: '11px',
                    fontWeight: initialsMode === 'single' ? '600' : '400',
                    border: 'none',
                    borderRadius: '6px',
                    background: initialsMode === 'single' ? '#ffffff' : 'transparent',
                    boxShadow: initialsMode === 'single' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    cursor: 'pointer',
                    color: initialsMode === 'single' ? '#37352f' : '#706e6b',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Single Letter
                </button>
                <button
                  onClick={() => handleInitialsModeChange('custom')}
                  style={{
                    flex: 1,
                    padding: '6px',
                    fontSize: '11px',
                    fontWeight: initialsMode === 'custom' ? '600' : '400',
                    border: 'none',
                    borderRadius: '6px',
                    background: initialsMode === 'custom' ? '#ffffff' : 'transparent',
                    boxShadow: initialsMode === 'custom' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    cursor: 'pointer',
                    color: initialsMode === 'custom' ? '#37352f' : '#706e6b',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* Custom Input */}
            {initialsMode === 'custom' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: '600', color: '#706e6b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Custom Initials</span>
                <input
                  type="text"
                  maxLength={2}
                  value={customInitialsText}
                  onChange={handleCustomInitialsChange}
                  placeholder="e.g. AB"
                  style={{
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '6px',
                    border: '1px solid #e3e3e3',
                    outline: 'none',
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}

            {/* Preview Box */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: '600', color: '#706e6b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Preview</span>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                border: '1px dashed #dddbda',
                borderRadius: '8px',
                backgroundColor: '#f9f9f9'
              }}>
                {renderPageIcon(`initials:${previewText}:${activeColor}`, '64px')}
              </div>
            </div>

            {/* Apply Button */}
            <button
              onClick={handleApplyInitials}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2383e2',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a6ec0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2383e2'}
            >
              Set Initials
            </button>
          </div>
        )}

        {tab === 'upload' && (
          <div style={{ padding: '12px' }}>
            <UploadZone
              onSelect={(url) => { onSelect(url); onClose(); }}
              accept="image/*"
              placeholderText="Drop icon file here"
              subtext="or click to select an icon"
              allowLink={false}
            />
          </div>
        )}
      </div>

      {/* Emoji category bar */}
      {tab === 'emoji' && !q && (
        <div className="nip-cat-bar">
          {EMOJI_CATEGORIES.map(c => (
            <button key={c.id} className={`nip-cat-btn${emojiCat === c.id ? ' active' : ''}`} title={c.label} onClick={() => handleCatClick(c.id)}>{c.icon}</button>
          ))}
        </div>
      )}
    </div>
  );
});
const GALLERY_SECTIONS = [
  {
    title: 'Colors & Gradients',
    items: [
      { name: 'Light Gray', url: 'https://images.unsplash.com/photo-1544006659-f0b21f04cb1d?q=80&w=800' },
      { name: 'Gray', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=800' },
      { name: 'Dark Gray', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800' },
      { name: 'Solid Blue', url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=800' },
      { name: 'Solid Red', url: 'https://images.unsplash.com/photo-1557683311-eac922347aa1?q=80&w=800' },
      { name: 'Solid Purple', url: 'https://images.unsplash.com/photo-1557683304-673a23048d34?q=80&w=800' },
      { name: 'Gradient Sunset', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=800' },
      { name: 'Gradient Ocean', url: 'https://images.unsplash.com/photo-1538608832961-cb8dbd98a0c2?q=80&w=800' },
      { name: 'Gradient Moss', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800' },
      { name: 'Gradient Sweet', url: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?q=80&w=800' }
    ]
  },
  {
    title: 'TextureLabs Patterns',
    items: [
      { name: 'White Marble', url: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?q=80&w=800' },
      { name: 'Dark Wood', url: 'https://images.unsplash.com/photo-1541123437800-1bb1317badc2?q=80&w=800' },
      { name: 'Concrete Texture', url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=800' },
      { name: 'Brushed Metal', url: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?q=80&w=800' },
      { name: 'Carbon Fiber', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=800' },
      { name: 'Crumpled Paper', url: 'https://images.unsplash.com/photo-1604076913837-52ab5629fba9?q=80&w=800' },
      { name: 'Watercolor Splatter', url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=800' },
      { name: 'Terracotta', url: 'https://images.unsplash.com/photo-1595483124440-85cd457e9abc?q=80&w=800' }
    ]
  },
  {
    title: 'NASA / Space',
    items: [
      { name: 'Pillars of Creation', url: 'https://images.unsplash.com/photo-1543722530-d2c3201371e7?q=80&w=800' },
      { name: 'Deep Field Galaxy', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=800' },
      { name: 'Orion Nebula', url: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=800' },
      { name: 'Earth Sunrise', url: 'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?q=80&w=800' },
      { name: 'Moon Surface', url: 'https://images.unsplash.com/photo-1522030299830-16b8d3d049fe?q=80&w=800' },
      { name: 'Mars Rover View', url: 'https://images.unsplash.com/photo-1612892483236-42d68a57623d?q=80&w=800' }
    ]
  },
  {
    title: 'Museums / Fine Art',
    items: [
      { name: 'Starry Night', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=800' },
      { name: 'Great Wave off Kanagawa', url: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=800' },
      { name: 'Oil Portrait Study', url: 'https://images.unsplash.com/photo-1579783928621-7a13d66a62d1?q=80&w=800' },
      { name: 'Classic Sculptures', url: 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?q=80&w=800' },
      { name: 'Renaissance Fresco', url: 'https://images.unsplash.com/photo-1580136579312-94651dfd596d?q=80&w=800' },
      { name: 'Monet Lilies', url: 'https://images.unsplash.com/photo-1549887534-1541e9326642?q=80&w=800' }
    ]
  },
  {
    title: 'Nature & Landscapes',
    items: [
      { name: 'Yosemite Valley', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=800' },
      { name: 'Misty Forest Path', url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=800' },
      { name: 'Green Hills', url: 'https://images.unsplash.com/photo-1472214222541-d510753a4907?q=80&w=800' },
      { name: 'Fuji Sunset', url: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?q=80&w=800' },
      { name: 'Ocean Beach', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800' },
      { name: 'Snow Peaks', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800' }
    ]
  },
  {
    title: 'Minimalist & Abstract',
    items: [
      { name: 'Minimal Dark', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=800' },
      { name: 'Glassmorphism Wave', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800' },
      { name: 'Geometric Lines', url: 'https://images.unsplash.com/photo-1604871000636-074fa5117945?q=80&w=800' },
      { name: 'Liquid Chrome', url: 'https://images.unsplash.com/photo-1618005198143-e5283b519a7f?q=80&w=800' }
    ]
  }
];

const UNSPLASH_PRESETS = [
  { name: 'Misty Valley', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=800' },
  { name: 'Desert Oasis', url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=800' },
  { name: 'Starry Sky', url: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=800' },
  { name: 'Abstract Fluid', url: 'https://images.unsplash.com/photo-1618005198143-e5283b519a7f?q=80&w=800' },
  { name: 'Nordic Cabin', url: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?q=80&w=800' },
  { name: 'Autumn Woods', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=800' },
  { name: 'City Skyline', url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=800' },
  { name: 'Foggy Forest', url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=800' }
];

export const NotionCoverPicker = memo(function NotionCoverPicker({ position, onSelect, onClose }) {
  const ref = useRef(null);
  const [tab, setTab] = useState('gallery');
  const [unsplashQuery, setUnsplashQuery] = useState('');
  const [unsplashResults, setUnsplashResults] = useState([]);
  const [searchTriggered, setSearchTriggered] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', esc); };
  }, [onClose]);

  const handleUnsplashSearch = (e) => {
    if (e) e.preventDefault();
    if (unsplashQuery.trim()) {
      const q = unsplashQuery.trim().toLowerCase();
      const results = Array.from({ length: 8 }).map((_, i) => ({
        name: `${q.charAt(0).toUpperCase() + q.slice(1)} ${i + 1}`,
        url: `https://images.unsplash.com/featured/800x600/?${encodeURIComponent(q)}&sig=${i + 1}`
      }));
      setUnsplashResults(results);
      setSearchTriggered(true);
    } else {
      setSearchTriggered(false);
      setUnsplashResults([]);
    }
  };

  return (
    <div ref={ref} className="notion-cover-picker" style={{ left: position?.x || 0, top: position?.y || 0 }} onMouseDown={e => e.stopPropagation()}>
      <div className="nip-tabs">
        <button className={`nip-tab${tab === 'gallery' ? ' active' : ''}`} onClick={() => setTab('gallery')}>Gallery</button>
        <button className={`nip-tab${tab === 'upload' ? ' active' : ''}`} onClick={() => setTab('upload')}>Upload</button>
        <button className={`nip-tab${tab === 'link' ? ' active' : ''}`} onClick={() => setTab('link')}>Link</button>
        <button className={`nip-tab${tab === 'unsplash' ? ' active' : ''}`} onClick={() => setTab('unsplash')}>Unsplash</button>
        <button className="nip-remove" onClick={() => { onSelect(''); onClose(); }}>Remove</button>
      </div>
      <div className="nip-body">
        {tab === 'gallery' && (
          <div className="ncp-gallery-scroll">
            {GALLERY_SECTIONS.map(sec => (
              <div key={sec.title} className="ncp-section">
                <div className="ncp-section-title">{sec.title}</div>
                <div className="ncp-grid">
                  {sec.items.map(p => (
                    <div key={p.name} className="ncp-thumb" style={{ backgroundImage: `url(${p.url})` }} onClick={() => { onSelect(p.url); onClose(); }}>
                      <div className="ncp-thumb-overlay">
                        {p.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === 'upload' && (
          <div style={{ padding: '16px' }}>
            <UploadZone
              onSelect={(url) => { onSelect(url); onClose(); }}
              accept="image/*"
              placeholderText="Drop image file here"
              subtext="or click to select an image"
              allowLink={false}
            />
          </div>
        )}
        {tab === 'link' && (
          <div style={{ padding: '16px' }}>
            <UploadZone
              onSelect={(url) => { onSelect(url); onClose(); }}
              onlyLink={true}
            />
          </div>
        )}
        {tab === 'unsplash' && (
          <div className="ncp-unsplash-container">
            <form onSubmit={handleUnsplashSearch} className="ncp-unsplash-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
              <input
                type="text"
                placeholder="Search Unsplash..."
                value={unsplashQuery}
                onChange={e => setUnsplashQuery(e.target.value)}
              />
              <button type="submit">Search</button>
            </form>
            
            <div className="ncp-gallery-scroll">
              <div className="ncp-section-title">
                {searchTriggered ? `Results for "${unsplashQuery}"` : 'Curated Photos'}
              </div>
              <div className="ncp-grid">
                {(searchTriggered ? unsplashResults : UNSPLASH_PRESETS).map(p => (
                  <div key={p.url} className="ncp-thumb" style={{ backgroundImage: `url(${p.url})` }} onClick={() => { onSelect(p.url); onClose(); }}>
                    <div className="ncp-thumb-overlay">
                      {p.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
export const InlineToolbar = memo(function InlineToolbar() {
  const { changeBlockType, getBlockById, addDraftComment, updateBlockContent } = usePageContext();
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [colorOpen, setColorOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [blockId, setBlockId] = useState(null);
  const [blockType, setBlockType] = useState('paragraph');

  // Ask AI states
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const toolbarRef = useRef(null);
  const savedRange = useRef(null);
  /* Save the current selection range */
  const saveRange = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange();
  }, []);
  /* Restore saved selection range */
  const restoreRange = useCallback(() => {
    if (!savedRange.current) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange.current);
  }, []);
  /* Track text selection */
  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        if (!isAiMode) {
          setVisible(false);
          setColorOpen(false);
          setEmojiOpen(false);
        }
        return;
      }
      const anchor = sel.anchorNode;
      const editable = anchor?.nodeType === 1 ? anchor.closest?.('[contenteditable]') : anchor?.parentElement?.closest?.('[contenteditable]');
      const block = editable?.closest?.('.block');
      if (!block || !editable) {
        if (!isAiMode) setVisible(false);
        return;
      }
      if (block.classList.contains('block-code') || editable.closest('.tab-name')) {
        if (!isAiMode) setVisible(false);
        return;
      }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0) return;
      setPos({ x: rect.left + rect.width / 2, y: rect.top - 6 });
      setVisible(true);
      savedRange.current = range.cloneRange();
      const bId = block.getAttribute('data-block-id');
      setBlockId(bId);
      if (bId) { const b = getBlockById(bId); if (b) setBlockType(b.type); }
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, [getBlockById, isAiMode]);
  /* Execute command with selection restore */
  const exec = useCallback((cmd, val) => {
    restoreRange();
    document.execCommand(cmd, false, val);
  }, [restoreRange]);
  /* Block type change */
  const handleTypeChange = useCallback((e) => {
    const newType = e.target.value;
    if (blockId && newType !== blockType) { changeBlockType(blockId, newType); setBlockType(newType); }
  }, [blockId, blockType, changeBlockType]);
  /* Wrap selection in <code> */
  const handleCodeWrap = useCallback(() => {
    restoreRange();
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString();
    document.execCommand('insertHTML', false, `<code style="background:rgba(255,255,255,.06);padding:1px 4px;border-radius:3px;font-family:monospace;font-size:.9em">${text}</code>`);
  }, [restoreRange]);
  /* Add link */
  const handleLink = useCallback(() => {
    saveRange();
    const url = prompt('Enter URL:');
    if (url) {
      restoreRange();
      document.execCommand('createLink', false, url);
    }
  }, [saveRange, restoreRange]);
  /* Add comment — highlights text + adds to sidebar as draft */
  const handleComment = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    restoreRange();
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const selectedText = sel.toString();

    // Generate unique draft comment ID
    const draftId = 'cmt-draft-' + Date.now();

    restoreRange();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('insertHTML', false,
      `<mark class="inline-comment-highlight draft" data-comment-id="${draftId}">${selectedText}</mark>`
    );

    // Save block content update to persist mark element
    if (blockId) {
      const blockEl = document.querySelector(`[data-block-id="${blockId}"]`);
      const ce = blockEl?.querySelector('[contenteditable]');
      if (ce) {
        updateBlockContent(blockId, ce.innerHTML);
      }
    }

    addDraftComment(blockId, selectedText, draftId);
    setVisible(false);
  }, [restoreRange, blockId, addDraftComment, updateBlockContent]);
  /* Mock AI Content Generator */
  const handleAiGenerate = useCallback(() => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setTimeout(() => {
      restoreRange();
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) {
        const text = sel.toString();
        const generated = `✨ ${text} (AI: ${aiPrompt}) ✨`;
        restoreRange();
        document.execCommand('insertHTML', false, `<span style="background: rgba(144, 101, 176, 0.15); border-bottom: 1.5px dashed #9065b0; padding: 1px 2px; border-radius: 3px; color: #9065b0;">${generated}</span>`);

        if (blockId) {
          const blockEl = document.querySelector(`[data-block-id="${blockId}"]`);
          const ce = blockEl?.querySelector('[contenteditable]');
          if (ce) {
            updateBlockContent(blockId, ce.innerHTML);
          }
        }
      }
      setIsGenerating(false);
      setIsAiMode(false);
      setAiPrompt('');
      setVisible(false);
    }, 1000);
  }, [aiPrompt, restoreRange, blockId, updateBlockContent]);
  /* Apply text color */
  const applyColor = useCallback((color) => {
    restoreRange();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('foreColor', false, color);
    setColorOpen(false);
  }, [restoreRange]);
  /* Apply background color */
  const applyBg = useCallback((color) => {
    restoreRange();
    document.execCommand('styleWithCSS', false, true);
    if (color === 'transparent') {
      document.execCommand('removeFormat', false, 'hiliteColor');
    } else {
      document.execCommand('hiliteColor', false, color);
    }
    setColorOpen(false);
  }, [restoreRange]);
  /* Insert emoji */
  const handleEmojiInsert = useCallback((emoji) => {
    restoreRange();
    if (emoji) {
      if (emoji.startsWith('svg:')) {
        const svgContent = emoji.replace('svg:', '');
        document.execCommand('insertHTML', false, `<span class="inline-icon" style="display:inline-block;width:1.2em;height:1.2em;vertical-align:middle;color:inherit;" dangerouslySetInnerHTML="false">${svgContent}</span>`);
      } else if (emoji.startsWith('data:image')) {
        document.execCommand('insertHTML', false, `<img src="${emoji}" style="width:1.2em;height:1.2em;vertical-align:middle;display:inline-block;" />`);
      } else {
        document.execCommand('insertText', false, emoji);
      }
    }
    setEmojiOpen(false);
  }, [restoreRange]);
  if (!visible) return null;
  const BLOCK_TYPES = [
    { value: 'paragraph', label: 'Text' }, { value: 'heading1', label: 'Heading 1' }, { value: 'heading2', label: 'Heading 2' },
    { value: 'heading3', label: 'Heading 3' }, { value: 'bulleted_list', label: 'Bulleted List' }, { value: 'numbered_list', label: 'Numbered List' },
    { value: 'todo', label: 'To-do' }, { value: 'quote', label: 'Quote' }, { value: 'callout', label: 'Callout' }, { value: 'code', label: 'Code' },
  ];
  const typeName = BLOCK_TYPES.find(o => o.value === blockType)?.label || 'Text';
  const emojiPos = {
    x: Math.max(170, Math.min(pos.x - 170, window.innerWidth - 360)),
    y: Math.max(0, pos.y - 460),
  };
  return (
    <>
      <div className="notion-inline-toolbar" ref={toolbarRef}
        style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -100%)' }}
        onMouseDown={e => e.preventDefault()}>
        {isAiMode ? (
          <div className="nit-ai-panel" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 4px', width: '310px' }} onClick={e => e.stopPropagation()}>
            <span style={{ fontSize: '13px' }}>✨</span>
            <input
              type="text"
              placeholder="Ask AI to edit or write..."
              className="nit-ai-input"
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && aiPrompt.trim()) {
                  e.preventDefault();
                  handleAiGenerate();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setIsAiMode(false);
                  setAiPrompt('');
                }
              }}
              autoFocus
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: '12.5px',
                fontFamily: 'inherit',
                color: '#37352F',
                background: 'transparent'
              }}
            />
            {isGenerating ? (
              <span className="nit-ai-spinner" style={{ fontSize: '11px', color: '#9065b0', marginRight: '6px' }}>Writing...</span>
            ) : (
              <>
                <button
                  className="nit-ai-action-btn"
                  onClick={handleAiGenerate}
                  disabled={!aiPrompt.trim()}
                  style={{
                    background: '#9065b0',
                    border: 'none',
                    color: '#ffffff',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  Generate
                </button>
                <button
                  className="nit-ai-cancel-btn"
                  onClick={() => { setIsAiMode(false); setAiPrompt(''); }}
                  style={{
                    background: 'transparent',
                    border: '1px solid #E5E7EB',
                    color: '#787774',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Block Type Dropdown */}
            <div className="nit-item nit-type-dropdown">
              <span>{typeName}</span>
              <select className="nit-type-select" value={blockType} onChange={handleTypeChange} onMouseDown={e => e.stopPropagation()}>
                {BLOCK_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6" /></svg>
            </div>
            <div className="nit-v-divider" />
            {/* Ask AI button */}
            <button className="nit-btn nit-ai-btn" onClick={() => { saveRange(); setIsAiMode(true); }} title="Ask AI">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707-.707M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
              </svg>
              <span>Ask AI</span>
            </button>
            <div className="nit-v-divider" />
            {/* Formatting buttons */}
            <button className="nit-btn" onClick={() => exec('bold')} title="Bold (Ctrl+B)"><b>B</b></button>
            <button className="nit-btn" onClick={() => exec('italic')} title="Italic (Ctrl+I)"><i>I</i></button>
            <button className="nit-btn" onClick={() => exec('underline')} title="Underline (Ctrl+U)"><u>U</u></button>
            <button className="nit-btn" onClick={() => exec('strikeThrough')} title="Strikethrough"><s>S</s></button>
            <button className="nit-btn" onClick={handleCodeWrap} title="Inline code">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></svg>
            </button>
            <button className="nit-btn" onClick={handleLink} title="Link">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
            </button>
            <div className="nit-v-divider" />
            {/* Color dropdown */}
            <div style={{ position: 'relative' }}>
              <button className="nit-btn nit-color-trigger" onClick={() => { saveRange(); setColorOpen(v => !v); setEmojiOpen(false); }} title="Color">
                <span style={{ fontWeight: 700, fontSize: 13 }}>A</span>
                <span className="nit-color-underline-bar" />
              </button>
              {colorOpen && (
                <div className="nit-color-palette" onMouseDown={e => e.stopPropagation()}>
                  <div className="nit-palette-section">Text Color</div>
                  {TEXT_COLORS.map(c => (
                    <div key={'t' + c.name} className="nit-palette-row" onClick={() => applyColor(c.color)}>
                      <span className="nit-palette-swatch" style={{ background: c.color }} /><span>{c.name}</span>
                    </div>
                  ))}
                  <div className="nit-palette-section" style={{ marginTop: 4 }}>Background</div>
                  {BG_COLORS.map(c => (
                    <div key={'b' + c.name} className="nit-palette-row" onClick={() => applyBg(c.color)}>
                      <span className="nit-palette-swatch" style={{ background: c.color, border: '1px solid rgba(255,255,255,.2)' }} /><span>{c.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="nit-v-divider" />
            {/* Comment button */}
            <button className="nit-btn nit-action-btn" onClick={handleComment} onMouseDown={e => { e.stopPropagation(); e.preventDefault(); }} title="Comment">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              <span>Comment</span>
            </button>
            {/* Mention button */}
            <button className="nit-btn nit-action-btn" onClick={(e) => { e.stopPropagation(); saveRange(); const name = prompt('Mention a page or person:'); if (name) { restoreRange(); document.execCommand('insertHTML', false, '<span class="inline-mention" style="background:rgba(35,131,226,.15);padding:1px 4px;border-radius:3px;color:#5c9ce6;cursor:pointer">@' + name + '</span>&nbsp;'); } }} onMouseDown={e => { e.stopPropagation(); e.preventDefault(); }} title="Mention">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" /></svg>
              <span>Mention</span>
            </button>
          </>
        )}
      </div>
      {/* Emoji Picker */}
      {emojiOpen && (
        <NotionIconPicker
          position={emojiPos}
          onSelect={handleEmojiInsert}
          onClose={() => setEmojiOpen(false)}
        />
      )}
    </>
  );
});
/* ---- Render Mention Pills in Comment Texts ---- */
function renderCommentText(text) {
  if (!text) return '';
  const parts = text.split(/(@[A-Za-z0-9\s#&_.-]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const mention = part.slice(1);
      let className = 'mention-pill';
      let icon = '👤';
      if (mention.includes('Today') || mention.includes('Tuesday') || mention.includes('June')) {
        className += ' date-pill';
        icon = '📅';
      } else if (mention.includes('Feedback')) {
        className += ' page-pill';
        icon = '📄';
      } else {
        className += ' person-pill';
      }
      return (
        <span key={i} className={className}>
          {icon} {mention}
        </span>
      );
    }
    return part;
  });
}
/* ---- Inline Attachment Picker ---- */
const AttachmentPopover = memo(function AttachmentPopover({ position, onSelect, onClose }) {
  const ref = useRef(null);
  const fileInputRef = useRef(null);
  const [tab, setTab] = useState('library');
  const [isDragOver, setIsDragOver] = useState(false);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [onClose]);
  const libraryFiles = [
    { name: 'Design_Spec_v2.pdf', size: '1.4 MB', type: 'pdf' },
    { name: 'Logo_Icon_Primary.png', size: '420 KB', type: 'image' },
    { name: 'Sprint_Plan_Q3.xlsx', size: '2.8 MB', type: 'spreadsheet' },
    { name: 'Product_Requirements.docx', size: '890 KB', type: 'document' },
  ];
  return (
    <div
      ref={ref}
      className="ca-attachment-popover"
      style={{ left: position.x, top: position.y }}
      onMouseDown={e => { e.stopPropagation(); }}
      onClick={e => e.stopPropagation()}
    >
      <div className="cap-tabs">
        <button
          className={`cap-tab${tab === 'library' ? ' active' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setTab('library'); }}
        >
          Library
        </button>
        <button
          className={`cap-tab${tab === 'upload' ? ' active' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setTab('upload'); }}
        >
          Upload
        </button>
      </div>
      <div className="cap-body">
        {tab === 'library' && (
          <div className="cap-library-list">
            {libraryFiles.map(file => (
              <div
                key={file.name}
                className="cap-file-row"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect(` 📎 Attached file: ${file.name}`);
                  onClose();
                }}
              >
                <span className="cap-file-icon"><Paperclip size={13} /></span>
                <div className="cap-file-info">
                  <span className="cap-file-name">{file.name}</span>
                  <span className="cap-file-size">{file.size}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === 'upload' && (
          <div style={{ padding: '8px' }}>
            <UploadZone
              onSelect={(url, fileName) => {
                if (fileName) {
                  onSelect(` 📎 Attached file: ${fileName}`);
                } else {
                  onSelect(` 🔗 Link: ${url}`);
                }
                onClose();
              }}
              placeholderText="Drop attachment file here"
              subtext="or click to select a file"
              allowLink={false}
            />
          </div>
        )}
      </div>
    </div>
  );
});
/* ---- Inline Mention Picker ---- */
const MentionPopover = memo(function MentionPopover({ position, onSelect, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
  }, [onClose]);
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const todayShort = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  // Calculate next Tuesday
  const daysUntilTue = (2 - now.getDay() + 7) % 7 || 7;
  const nextTue = new Date(now);
  nextTue.setDate(now.getDate() + daysUntilTue);
  const nextTueStr = nextTue.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const sections = [
    {
      title: 'Date',
      items: [
        { label: `Today — ${todayStr}`, value: ` @Today (${todayShort})`, icon: <Clock size={13} /> },
        { label: `${nextTueStr} 3pm`, value: ` @${nextTueStr} 3pm`, icon: <Clock size={13} /> }
      ]
    },
    {
      title: 'People',
      items: [
        { label: 'Briselle (You)', value: ' @Briselle', icon: 'B', isAvatar: true },
        { label: 'Invite...', value: ' @Invite', icon: <UserPlus size={13} />, isInvite: true }
      ]
    },
    {
      title: 'Link to page',
      items: [
        { label: 'Feedback #5 & 6', value: ' @Feedback #5 & 6', icon: <FileText size={13} /> }
      ]
    }
  ];
  return (
    <div
      ref={ref}
      className="ca-mention-popover"
      style={{ left: position.x, top: position.y }}
      onMouseDown={e => { e.stopPropagation(); }}
      onClick={e => e.stopPropagation()}
    >
      {sections.map(sec => (
        <div key={sec.title} className="cmp-section">
          <div className="cmp-section-title">{sec.title}</div>
          {sec.items.map((item, i) => (
            <div
              key={i}
              className={`cmp-item${item.isInvite ? ' cmp-invite' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (item.isInvite) {
                  const email = prompt('Invite person by email:');
                  if (email) {
                    onSelect(` @${email}`);
                  }
                } else {
                  onSelect(item.value);
                }
                onClose();
              }}
            >
              {item.isAvatar ? (
                <span className="cmp-avatar">{item.icon}</span>
              ) : (
                <span className="cmp-icon">{item.icon}</span>
              )}
              <span className="cmp-label">{item.label}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
});
/* ==================================================================
   NOTION PAGE TEXT COMMENT SIDEBAR
   ================================================================== */
export const CommentCard = memo(function CommentCard({
  cmt,
  isSelected,
  isHovered,
  onSelect,
  showQuote,
  draftText = {},
  setDraftText = () => { },
  replyTexts = {},
  setReplyTexts = () => { },
  onSaveDraft,
  onCancelDraft,
  visible = true
}) {
  const {
    addReply, resolveComment, updateCommentMsg, deleteCommentMsg,
    toggleUnreadComment, toggleMuteComment, addReaction, deleteComment,
    saveDraftComment, cancelDraftComment, setHoveredCommentId, markCommentAsRead,
    tick
  } = usePageContext();

  const isCardUnread = cmt.unread || cmt.thread?.some(msg => msg.unread);
  const isPageComment = cmt.isPageComment || cmt.blockId === 'page';

  const lastSelectedRef = useRef(isSelected);

  useEffect(() => {
    if (isSelected && !lastSelectedRef.current && isCardUnread && markCommentAsRead) {
      markCommentAsRead(cmt.id);
    }
    lastSelectedRef.current = isSelected;
  }, [isSelected, isCardUnread, cmt.id, markCommentAsRead]);

  const [editingMsg, setEditingMsg] = useState(null); // { msgIndex, text }
  const [attachmentPicker, setAttachmentPicker] = useState(null);
  const [mentionPicker, setMentionPicker] = useState(null);
  const [activeReactionPopover, setActiveReactionPopover] = useState(null);
  const [activeMorePopover, setActiveMorePopover] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const triggerToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  }, []);

  useEffect(() => {
    if (!activeReactionPopover && !activeMorePopover) return;
    const handler = () => {
      setActiveReactionPopover(null);
      setActiveMorePopover(null);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [activeReactionPopover, activeMorePopover]);

  const handleSaveDraftLocal = () => {
    const text = draftText[cmt.id];
    if (!text?.trim()) return;
    if (onSaveDraft) {
      onSaveDraft(text);
    } else {
      saveDraftComment(cmt.id, text);
      setDraftText(prev => {
        const next = { ...prev };
        delete next[cmt.id];
        return next;
      });
    }
  };

  const handleCancelDraftLocal = () => {
    if (onCancelDraft) {
      onCancelDraft();
    } else {
      cancelDraftComment(cmt.id);
    }
  };

  const getRolledUpReactions = () => {
    const map = new Map(); // emoji -> { users: Set, count: number }

    if (cmt.reactions) {
      cmt.reactions.forEach(r => {
        if (!map.has(r.emoji)) {
          map.set(r.emoji, { users: new Set(), count: 0 });
        }
        const val = map.get(r.emoji);
        r.users.forEach(u => val.users.add(u));
        val.count += r.count;
      });
    }

    if (cmt.thread) {
      cmt.thread.forEach((msg) => {
        if (msg.reactions) {
          msg.reactions.forEach(r => {
            if (!map.has(r.emoji)) {
              map.set(r.emoji, { users: new Set(), count: 0 });
            }
            const val = map.get(r.emoji);
            r.users.forEach(u => val.users.add(u));
            val.count += r.count;
          });
        }
      });
    }

    const rolledUp = [];
    map.forEach((val, emoji) => {
      rolledUp.push({
        emoji,
        count: val.count,
        users: Array.from(val.users)
      });
    });
    return rolledUp;
  };

  const handleToggleRolledUpReaction = (emoji) => {
    // Check if user has reacted at the thread level
    const threadLevelHas = cmt.reactions?.some(r => r.emoji === emoji && r.users.includes('Briselle'));
    if (threadLevelHas) {
      addReaction(cmt.id, emoji);
      return;
    }

    // Check if user has reacted at any message level
    if (cmt.thread) {
      for (let idx = 0; idx < cmt.thread.length; idx++) {
        const msg = cmt.thread[idx];
        if (msg.reactions?.some(r => r.emoji === emoji && r.users.includes('Briselle'))) {
          addReaction(cmt.id, emoji, idx);
          return;
        }
      }
    }

    // Default: add/toggle reaction at the thread level
    addReaction(cmt.id, emoji);
  };

  const renderSingleMessage = (msg, idx) => {
    const isEditingThisMsg = editingMsg?.msgIndex === idx;
    
    let displayTime = msg.time;
    if (idx === 0 && (!displayTime || displayTime === 'Just now' || isNaN(new Date(displayTime).getTime()))) {
      const fallbackTime = getCommentTimestampFromId(cmt.id);
      if (fallbackTime) {
        displayTime = fallbackTime;
      }
    }

    return (
      <div key={idx} className="ca-msg">
        <div className="ca-msg-row">
          <span className="ca-avatar">
            {msg.author ? msg.author[0] : 'B'}
          </span>
          <div className="ca-msg-body">
            <div className="ca-msg-meta">
              <span className="ca-author">{msg.author}</span>
              <span className="ca-time" title={formatFullDateTime(displayTime)}>{formatRelativeTime(displayTime)}</span>
              {msg.unread && (
                <span className="ca-msg-unread-dot" title="Unread message" />
              )}
            </div>
            {isEditingThisMsg ? (
              <div className="ca-edit-area" onClick={e => e.stopPropagation()}>
                <textarea
                  className="ca-edit-input"
                  value={editingMsg.text}
                  onChange={e => setEditingMsg(prev => ({ ...prev, text: e.target.value }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      updateCommentMsg(cmt.id, idx, { text: editingMsg.text });
                      setEditingMsg(null);
                    } else if (e.key === 'Escape') {
                      setEditingMsg(null);
                    }
                  }}
                  autoFocus
                />
                <div className="ca-edit-actions">
                  <button className="ca-btn-cancel" onClick={() => setEditingMsg(null)}>Cancel</button>
                  <button className="ca-btn-save" onClick={() => { updateCommentMsg(cmt.id, idx, { text: editingMsg.text }); setEditingMsg(null); }}>Save</button>
                </div>
              </div>
            ) : (
              <>
                <div className="ca-msg-text">{renderCommentText(msg.text)}</div>
                {/* Message-level Reactions */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className="ca-rp-bar-msg">
                    {msg.reactions.map(r => {
                      const hasReacted = r.users.includes('Briselle');
                      return (
                        <button key={r.emoji} className={`ca-rp-pill-msg${hasReacted ? ' active' : ''}`} onClick={(e) => { e.stopPropagation(); addReaction(cmt.id, r.emoji, idx); }}>
                          <span className="ca-rp-emoji">{r.emoji}</span>
                          <span className="ca-rp-count">{r.count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Message actions on hover */}
        {!isEditingThisMsg && (
          <div className="ca-msg-actions">
            {/* React Popover */}
            <div style={{ position: 'relative' }}>
              <button
                className="ca-msg-action-btn"
                title="React"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveReactionPopover(
                    activeReactionPopover?.msgIndex === idx ? null : { msgIndex: idx }
                  );
                }}
              >
                <Smile size={13} />
              </button>
              {activeReactionPopover?.msgIndex === idx && (
                <div className="ca-msg-reactions-popover" onMouseDown={e => e.stopPropagation()}>
                  {['👍', '❤️', '😂', '😮'].map(em => (
                    <button key={em} className="ca-reaction-option" onClick={() => { addReaction(cmt.id, em, idx); setActiveReactionPopover(null); }}>
                      {em}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Toggle read/unread button */}
            <button
              className="ca-msg-action-btn"
              title={`Mark as ${msg.unread ? 'read' : 'unread'}`}
              onClick={(e) => {
                e.stopPropagation();
                updateCommentMsg(cmt.id, idx, { unread: !msg.unread });
              }}
            >
              <BookOpen size={13} />
            </button>

            {/* Edit button */}
            <button
              className="ca-msg-action-btn"
              title="Edit message"
              onClick={(e) => {
                e.stopPropagation();
                setEditingMsg({ msgIndex: idx, text: msg.text });
              }}
            >
              <Pencil size={13} />
            </button>

            {/* Copy link button */}
            <button
              className="ca-msg-action-btn"
              title="Copy message link"
              onClick={(e) => {
                e.stopPropagation();
                const linkVal = window.location.origin + window.location.pathname + '?commentId=' + cmt.id + '&msgIndex=' + idx;
                navigator.clipboard.writeText(linkVal);
                triggerToast('Message link copied!');
              }}
            >
              <Link size={13} />
            </button>

            {/* Delete button */}
            <button
              className="ca-msg-action-btn ca-msg-action-btn-danger"
              title="Delete message"
              onClick={(e) => {
                e.stopPropagation();
                deleteCommentMsg(cmt.id, idx);
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
    );
  };

  const isDraft = cmt.isDraft;

  return (
    <div
      data-card-id={cmt.id}
      className={`ca-card${isSelected ? ' active' : ''}${isHovered ? ' hovered' : ''}${cmt.resolved ? ' resolved' : ''}${isCardUnread && !isPageComment ? ' unread' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        if (onSelect) onSelect();
      }}
      onMouseEnter={() => visible && !isDraft && !isPageComment && setHoveredCommentId(cmt.id)}
      onMouseLeave={() => visible && !isDraft && !isPageComment && setHoveredCommentId(null)}
    >
      {toastMessage && <div className="ca-toast">{toastMessage}</div>}

      {/* Hover Actions Bar */}
      {!isDraft && (
        <div className={`ca-card-hover-actions${cmt.muted ? ' has-muted' : ''}${isCardUnread ? ' has-unread' : ''}`}>
          {(cmt.muted || isHovered || isSelected) && (
            <button
              className={`ca-hover-btn ca-mute-btn${cmt.muted ? ' is-muted' : ''}`}
              title={cmt.muted ? 'Unmute replies' : 'Mute replies'}
              onClick={(e) => { e.stopPropagation(); toggleMuteComment(cmt.id); }}
            >
              {cmt.muted ? <BellOff size={14} /> : <Bell size={14} />}
            </button>
          )}
          {(isCardUnread || isHovered || isSelected) && (
            <button
              className={`ca-hover-btn ca-unread-btn${isCardUnread ? ' is-unread' : ''}`}
              title={isCardUnread ? 'Mark all as read' : 'Mark all as unread'}
              onClick={(e) => { e.stopPropagation(); toggleUnreadComment(cmt.id); }}
            >
              <BookOpen size={14} />
            </button>
          )}
          {(isHovered || isSelected) && (
            <button
              className="ca-hover-btn"
              title={cmt.resolved ? 'Unresolve' : 'Resolve'}
              onClick={(e) => { e.stopPropagation(); resolveComment(cmt.id); }}
            >
              {cmt.resolved ? <RotateCcw size={14} /> : <Check size={14} />}
            </button>
          )}
        </div>
      )}

      {/* Selected Text Reference */}
      {showQuote && cmt.selectedText && (
        <div className="ca-quote">"{cmt.selectedText}"</div>
      )}

      {isDraft ? (
        /* Draft Composer State */
        <div className="ca-composer" onClick={e => e.stopPropagation()}>
          <textarea
            className="ca-composer-input"
            placeholder="Write a comment..."
            value={draftText[cmt.id] || ''}
            onChange={e => setDraftText(prev => ({ ...prev, [cmt.id]: e.target.value }))}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSaveDraftLocal();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancelDraftLocal();
              }
            }}
            autoFocus
          />
          <div className="ca-composer-actions">
            <button className="ca-composer-btn-cancel" onClick={handleCancelDraftLocal}>Cancel</button>
            <button
              className={`ca-composer-btn-submit${(draftText[cmt.id] || '').trim() ? ' active' : ''}`}
              onClick={handleSaveDraftLocal}
              disabled={!(draftText[cmt.id] || '').trim()}
            >
              Comment
            </button>
          </div>
        </div>
      ) : (
        /* Regular Thread State */
        <>
          <div className="ca-thread-messages">
            {cmt.thread && cmt.thread.length > 1 && (
              <div className="ca-thread-line" />
            )}
            {(() => {
              if (isSelected) {
                return cmt.thread.map((msg, idx) => renderSingleMessage(msg, idx));
              } else {
                // Collapsed state
                if (!cmt.thread || cmt.thread.length <= 1) {
                  const msg = cmt.thread?.[0];
                  return msg ? renderSingleMessage(msg, 0) : null;
                } else {
                  const firstMsg = cmt.thread[0];
                  const lastMsg = cmt.thread[cmt.thread.length - 1];
                  const count = cmt.thread.length - 2;

                  // Check if any of the hidden/minimized replies (index 1 to length - 2) is unread
                  const hiddenReplies = cmt.thread.slice(1, cmt.thread.length - 1);
                  const hasUnreadInHidden = hiddenReplies.some(msg => msg.unread);

                  return (
                    <>
                      {renderSingleMessage(firstMsg, 0)}
                      <button
                        className="ca-show-replies"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelect) onSelect();
                        }}
                      >
                        Show {count > 0 ? `${count + 1} replies` : '1 reply'}
                        {hasUnreadInHidden && (
                          <span className="ca-msg-unread-dot" title="Unread replies inside" style={{ background: '#2383e2', position: 'relative', top: '-1px' }} />
                        )}
                      </button>
                      {renderSingleMessage(lastMsg, cmt.thread.length - 1)}
                    </>
                  );
                }
              }
            })()}
          </div>
          {/* Reaction icons count bar (rolled up from all comments & replies) */}
          {(() => {
            const rolledUpReactions = getRolledUpReactions();
            return rolledUpReactions && rolledUpReactions.length > 0 && (
              <div className="ca-reactions-bar">
                {rolledUpReactions.map(r => {
                  const hasReacted = r.users.includes('Briselle');
                  return (
                    <button key={r.emoji} className={`ca-reaction-pill${hasReacted ? ' active' : ''}`} onClick={() => handleToggleRolledUpReaction(r.emoji)}>
                      <span className="ca-rp-emoji">{r.emoji}</span>
                      <span className="ca-rp-count">{r.count}</span>
                    </button>
                  );
                })}
              </div>
            );
          })()}
          {isSelected && (
            /* Reply input */
            <div className="ca-reply-row" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
              <span className="ca-avatar ca-avatar-sm">B</span>
              <div className="ca-reply-wrap">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  className="ca-reply-input"
                  value={replyTexts[cmt.id] || ''}
                  onChange={e => setReplyTexts(prev => ({ ...prev, [cmt.id]: e.target.value }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && replyTexts[cmt.id]?.trim()) {
                      addReply(cmt.id, replyTexts[cmt.id], []);
                      setReplyTexts(prev => ({ ...prev, [cmt.id]: '' }));
                    }
                  }}
                />
                {/* Attachment icon */}
                <button
                  className="ca-reply-addon-btn ca-attachment-trigger"
                  title="Attach files"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const parentEl = e.currentTarget.closest('.ca-card');
                    const parentRect = parentEl.getBoundingClientRect();
                    setAttachmentPicker(attachmentPicker?.commentId === cmt.id ? null : {
                      commentId: cmt.id,
                      position: { x: rect.left - parentRect.left - 10, y: rect.top - parentRect.top - 145 }
                    });
                    setMentionPicker(null);
                  }}
                >
                  <Paperclip size={14} />
                </button>
                {/* Mention icon */}
                <button
                  className="ca-reply-addon-btn ca-mention-trigger"
                  title="Mention page, person, or date"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const parentEl = e.currentTarget.closest('.ca-card');
                    const parentRect = parentEl.getBoundingClientRect();
                    setMentionPicker(mentionPicker?.commentId === cmt.id ? null : {
                      commentId: cmt.id,
                      position: { x: rect.left - parentRect.left - 10, y: rect.top - parentRect.top - 245 }
                    });
                    setAttachmentPicker(null);
                  }}
                >
                  <AtSign size={14} />
                </button>
                <button
                  className={`ca-reply-send${replyTexts[cmt.id]?.trim() ? ' active' : ''}`}
                  onClick={() => {
                    if (replyTexts[cmt.id]?.trim()) {
                      addReply(cmt.id, replyTexts[cmt.id], []);
                      setReplyTexts(prev => ({ ...prev, [cmt.id]: '' }));
                    }
                  }}
                  disabled={!replyTexts[cmt.id]?.trim()}
                >
                  <Send size={10} />
                </button>
              </div>
            </div>
          )}
          {isSelected && (
            /* Resolve / Unresolve button */
            <button
              className="ca-resolve-btn"
              onClick={(e) => {
                e.stopPropagation();
                resolveComment(cmt.id);
              }}
            >
              {cmt.resolved ? 'Unresolve' : 'Resolve'}
            </button>
          )}
        </>
      )}

      {/* Popovers locally inside the card */}
      {attachmentPicker && (
        <AttachmentPopover
          position={attachmentPicker.position}
          onSelect={(fileName) => {
            setReplyTexts(prev => ({ ...prev, [cmt.id]: (prev[cmt.id] || '') + fileName }));
          }}
          onClose={() => setAttachmentPicker(null)}
        />
      )}
      {mentionPicker && (
        <MentionPopover
          position={mentionPicker.position}
          onSelect={(mentionVal) => {
            setReplyTexts(prev => ({ ...prev, [cmt.id]: (prev[cmt.id] || '') + mentionVal }));
          }}
          onClose={() => setMentionPicker(null)}
        />
      )}
    </div>
  );
});

export const NotionPageTextComment = memo(function NotionPageTextComment({ visible = true, onHoverChange = () => { } }) {
  const {
    comments, activeCommentId, setActiveCommentId, saveDraftComment, cancelDraftComment,
    updateBlockContent, hoveredCommentId, setHoveredCommentId
  } = usePageContext();

  const [replyTexts, setReplyTexts] = useState({});
  const [draftText, setDraftText] = useState({});
  const [cardPositions, setCardPositions] = useState({});
  const [isHoveredInside, setIsHoveredInside] = useState(false);

  const containerRef = useRef(null);

  // Filter inline comments (only non-page comments)
  const inlineComments = (comments || []).filter(c => !c.isPageComment && c.blockId !== 'page');

  // Track sorted comments in actual DOM order dynamically
  const [orderedComments, setOrderedComments] = useState([]);

  const handleCancelDraft = useCallback((commentId) => {
    const markEl = document.querySelector(`.inline-comment-highlight[data-comment-id="${commentId}"], .inline-comment[data-comment-id="${commentId}"]`);
    if (markEl) {
      const parent = markEl.parentNode;
      if (parent) {
        while (markEl.firstChild) {
          parent.insertBefore(markEl.firstChild, markEl);
        }
        parent.removeChild(markEl);
        const ce = parent.closest('[contenteditable]') || parent;
        const block = parent.closest('.block');
        const bId = block?.getAttribute('data-block-id');
        if (ce && bId) updateBlockContent(bId, ce.innerHTML);
      }
    }
    cancelDraftComment(commentId);
    if (activeCommentId === commentId) {
      setActiveCommentId(null);
    }
  }, [cancelDraftComment, activeCommentId, setActiveCommentId, updateBlockContent]);

  const handleSaveDraft = useCallback((commentId, text) => {
    if (!text?.trim()) return;

    const markEl = document.querySelector(`.inline-comment-highlight[data-comment-id="${commentId}"], .inline-comment[data-comment-id="${commentId}"]`);
    if (markEl) {
      markEl.classList.remove('draft');
      const ce = markEl.closest('[contenteditable]');
      const block = markEl.closest('.block');
      const bId = block?.getAttribute('data-block-id');
      if (ce && bId) updateBlockContent(bId, ce.innerHTML);
    }

    saveDraftComment(commentId, text);
  }, [saveDraftComment, updateBlockContent]);

  // Synchronously compute and update orderedComments DOM order inside useLayoutEffect
  useLayoutEffect(() => {
    const sorted = [...inlineComments].sort((a, b) => {
      const elA = document.querySelector(`[data-comment-id="${a.id}"]`) || document.querySelector(`[data-block-id="${a.blockId}"]`);
      const elB = document.querySelector(`[data-comment-id="${b.id}"]`) || document.querySelector(`[data-block-id="${b.blockId}"]`);
      if (elA && elB) {
        const pos = elA.compareDocumentPosition(elB);
        if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      }
      return a.id.localeCompare(b.id);
    });

    const sortedIds = sorted.map(c => c.id).join(',');
    const currentIds = orderedComments.map(c => c.id).join(',');
    if (sortedIds !== currentIds) {
      setOrderedComments(sorted);
    }
  }, [inlineComments, orderedComments]);

  const commentsToRender = orderedComments.length > 0 ? orderedComments : inlineComments;

  // Auto-sweep draft comments when they lose focus
  useEffect(() => {
    const timer = setTimeout(() => {
      inlineComments.forEach(c => {
        if (c.isDraft && c.id !== activeCommentId) {
          handleCancelDraft(c.id);
        }
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [activeCommentId, comments, inlineComments, handleCancelDraft]);

  // Compute card positions to align with highlights, implementing bidirectional push-away for active or hovered comment
  useLayoutEffect(() => {
    if (!commentsToRender || commentsToRender.length === 0) return;
    const computePositions = () => {
      if (!containerRef.current) return;
      const pageContentEl = document.querySelector('.page-content');
      if (!pageContentEl) return;
      const pageContentRect = pageContentEl.getBoundingClientRect();

      const targets = {};
      const heights = {};

      commentsToRender.forEach(cmt => {
        const markEl = document.querySelector(`[data-comment-id="${cmt.id}"]`);
        if (markEl) {
          const rect = markEl.getBoundingClientRect();
          targets[cmt.id] = Math.round(rect.top - pageContentRect.top);
        } else {
          const blockEl = document.querySelector(`[data-block-id="${cmt.blockId}"]`);
          if (blockEl) {
            const rect = blockEl.getBoundingClientRect();
            targets[cmt.id] = Math.round(rect.top - pageContentRect.top);
          } else {
            targets[cmt.id] = 0;
          }
        }

        const cardEl = containerRef.current.querySelector(`[data-card-id="${cmt.id}"]`);
        if (cardEl) {
          heights[cmt.id] = Math.round(cardEl.getBoundingClientRect().height);
        } else {
          let estHeight = 90;
          if (cmt.isDraft) {
            estHeight = 160;
          } else if (cmt.id === activeCommentId) {
            const msgCount = cmt.thread ? cmt.thread.length : 0;
            estHeight = 90 + msgCount * 65 + 60;
          } else {
            estHeight = cmt.thread && cmt.thread.length > 1 ? 170 : 90;
          }
          heights[cmt.id] = estHeight;
        }
      });

      const positions = {};
      const MIN_GAP = 12;

      // Hovered comment takes priority as the anchor, followed by active/focused comment.
      // We ignore hoveredCommentId as the layout anchor when hovering cards inside the sidebar (detected by isHoveredInside) to prevent card repositioning loops under the cursor.
      const anchorId = (isHoveredInside ? null : hoveredCommentId) || activeCommentId;
      const activeIndex = commentsToRender.findIndex(c => c.id === anchorId);

      if (activeIndex !== -1) {
        // Anchor comment stays at its target position
        const activeCmt = commentsToRender[activeIndex];
        const activeTop = Math.round(targets[activeCmt.id] ?? 0);
        positions[activeCmt.id] = activeTop;

        // Position cards after active (pushed downwards)
        let lastBottom = activeTop + (heights[activeCmt.id] ?? 90);
        for (let i = activeIndex + 1; i < commentsToRender.length; i++) {
          const cmt = commentsToRender[i];
          let top = Math.round(targets[cmt.id] ?? 0);
          if (top < lastBottom + MIN_GAP) {
            top = lastBottom + MIN_GAP;
          }
          positions[cmt.id] = Math.round(top);
          lastBottom = positions[cmt.id] + (heights[cmt.id] ?? 90);
        }

        // Position cards before active (pushed upwards)
        let lastTop = activeTop;
        for (let i = activeIndex - 1; i >= 0; i--) {
          const cmt = commentsToRender[i];
          const height = heights[cmt.id] ?? 90;
          let top = Math.round(targets[cmt.id] ?? 0);
          if (top + height > lastTop - MIN_GAP) {
            top = lastTop - MIN_GAP - height;
          }
          positions[cmt.id] = Math.round(top);
          lastTop = positions[cmt.id];
        }
      } else {
        // No active comment, layout sequentially from top to bottom
        let lastBottom = 0;
        for (const cmt of commentsToRender) {
          let top = Math.round(targets[cmt.id] ?? 0);
          if (top < lastBottom + MIN_GAP) {
            top = lastBottom + MIN_GAP;
          }
          positions[cmt.id] = Math.round(top);
          lastBottom = positions[cmt.id] + (heights[cmt.id] ?? 90);
        }
      }

      // Avoid infinite loop by checking if positions actually changed
      const hasChanged = Object.keys(positions).length !== Object.keys(cardPositions).length ||
        Object.keys(positions).some(k => positions[k] !== cardPositions[k]);
      if (hasChanged) {
        setCardPositions(positions);
      }
    };

    const frame = requestAnimationFrame(computePositions);
    window.addEventListener('resize', computePositions);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', computePositions);
    };
  }, [comments, commentsToRender, inlineComments, activeCommentId, hoveredCommentId, replyTexts, draftText, cardPositions, isHoveredInside]);


  if (!commentsToRender || commentsToRender.length === 0) return null;

  return (
    <div
      className={`comment-annotations${visible ? '' : ' comments-hidden'}`}
      ref={containerRef}
      onMouseEnter={() => {
        setIsHoveredInside(true);
        onHoverChange(true);
      }}
      onMouseLeave={() => {
        setIsHoveredInside(false);
        onHoverChange(false);
      }}
    >
      {commentsToRender.map(cmt => {
        // Calculate dynamic fallback top position to prevent jumps/slides from 0 on first mount
        let top = cardPositions[cmt.id];
        if (top === undefined) {
          const markEl = document.querySelector(`[data-comment-id="${cmt.id}"]`);
          const parentEl = document.querySelector('.page-content');
          if (markEl && parentEl) {
            top = markEl.getBoundingClientRect().top - parentEl.getBoundingClientRect().top;
          } else if (parentEl) {
            const blockEl = document.querySelector(`[data-block-id="${cmt.blockId}"]`);
            if (blockEl) {
              top = blockEl.getBoundingClientRect().top - parentEl.getBoundingClientRect().top;
            }
          }
          if (top === undefined) top = 0;
        }

        const isSelected = cmt.id === activeCommentId;
        const isHovered = hoveredCommentId === cmt.id;

        return (
          <div
            key={cmt.id}
            style={{
              position: 'absolute',
              top,
              width: '100%',
              transition: 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <CommentCard
              cmt={cmt}
              isSelected={isSelected}
              isHovered={isHovered}
              visible={visible}
              onSelect={() => {
                if (activeCommentId !== cmt.id) {
                  setActiveCommentId(cmt.id);
                }
              }}
              showQuote={true}
              draftText={draftText}
              setDraftText={setDraftText}
              replyTexts={replyTexts}
              setReplyTexts={setReplyTexts}
              onSaveDraft={(text) => handleSaveDraft(cmt.id, text)}
              onCancelDraft={() => handleCancelDraft(cmt.id)}
            />
          </div>
        );
      })}
    </div>
  );
});

export const NotionPageTopComments = memo(function NotionPageTopComments({ visible = true, setVisible = () => {} }) {
  const {
    comments, addPageComment, activeCommentId, setActiveCommentId,
    showPageCommentComposer, setShowPageCommentComposer
  } = usePageContext();

  const [replyTexts, setReplyTexts] = useState({});
  const [draftText, setDraftText] = useState({});
  const [newCommentText, setNewCommentText] = useState('');
  const [attachmentPicker, setAttachmentPicker] = useState(null);
  const [mentionPicker, setMentionPicker] = useState(null);

  const pageComments = (comments || []).filter(c => c.isPageComment || c.blockId === 'page');

  // Recalculate totals including children thread messages
  let totalCount = 0;
  let unreadCount = 0;
  pageComments.forEach(c => {
    const thread = c.thread || [];
    if (thread.length === 0) {
      totalCount += 1;
      if (c.unread) unreadCount += 1;
    } else {
      totalCount += thread.length;
      unreadCount += thread.filter(msg => msg.unread).length;
    }
  });

  if (pageComments.length === 0 && !showPageCommentComposer) return null;

  const handleSubmitNewComment = (e) => {
    if (e) e.preventDefault();
    if (!newCommentText.trim()) return;
    addPageComment(newCommentText.trim());
    setNewCommentText('');
    setShowPageCommentComposer(false);
  };

  const handleClose = () => {
    if (pageComments.length === 0) {
      setShowPageCommentComposer(false);
    } else {
      setVisible(false);
    }
  };

  if (!visible && pageComments.length > 0) {
    return (
      <div
        className="notion-page-top-comments minimized clickable"
        onClick={() => setVisible(true)}
      >
        <div className="nptc-minimized-content">
          {unreadCount > 0 && (
            <span className="nptc-minimized-unread-dot" title="Unread comments" />
          )}
          <MessageSquare size={14} className="nptc-minimized-icon" />
          <span className="nptc-minimized-text">
            Comments: {unreadCount} of {totalCount} unread
          </span>
          <span className="nptc-expand-hint">
            <ChevronDown size={14} />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="notion-page-top-comments" onMouseDown={e => e.stopPropagation()}>
      <div
        className="nptc-header clickable"
        onClick={handleClose}
        style={{ cursor: 'pointer' }}
      >
        <div className="nptc-header-left">
          {unreadCount > 0 && (
            <span className="nptc-minimized-unread-dot" title="Unread comments" />
          )}
          <MessageSquare size={14} className="nptc-minimized-icon" />
          <span className="nptc-header-title">
            Comments: {unreadCount} of {totalCount} unread
          </span>
        </div>
        <button
          type="button"
          className="nptc-close-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
        >
          <ChevronUp size={14} />
        </button>
      </div>

      <div className="nptc-list">
        {pageComments.map(cmt => {
          const isSelected = cmt.id === activeCommentId;
          return (
            <CommentCard
              key={cmt.id}
              cmt={cmt}
              isSelected={isSelected}
              isHovered={false}
              onSelect={() => setActiveCommentId(isSelected ? null : cmt.id)}
              showQuote={false}
              draftText={draftText}
              setDraftText={setDraftText}
              replyTexts={replyTexts}
              setReplyTexts={setReplyTexts}
            />
          );
        })}
      </div>

      {showPageCommentComposer ? (
        <form className="nptc-composer" onSubmit={handleSubmitNewComment}>
          <textarea
            className="nptc-composer-input"
            placeholder="Send a message, or type @ to mention..."
            value={newCommentText}
            onChange={e => setNewCommentText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmitNewComment();
              }
            }}
          />
          <div className="nptc-composer-actions">
            <button
              type="button"
              className="nptc-addon-btn"
              title="Attach files"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                const parentEl = e.currentTarget.closest('.nptc-composer');
                const parentRect = parentEl.getBoundingClientRect();
                setAttachmentPicker(attachmentPicker ? null : {
                  position: { x: rect.left - parentRect.left - 10, y: rect.top - parentRect.top - 145 }
                });
                setMentionPicker(null);
              }}
            >
              <Paperclip size={14} />
            </button>
            <button
              type="button"
              className="nptc-addon-btn"
              title="Mention page, person, or date"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                const parentEl = e.currentTarget.closest('.nptc-composer');
                const parentRect = parentEl.getBoundingClientRect();
                setMentionPicker(mentionPicker ? null : {
                  position: { x: rect.left - parentRect.left - 10, y: rect.top - parentRect.top - 245 }
                });
                setAttachmentPicker(null);
              }}
            >
              <AtSign size={14} />
            </button>

            <button
              type="submit"
              className={`nptc-submit-btn${newCommentText.trim() ? ' active' : ''}`}
              disabled={!newCommentText.trim()}
            >
              Send
            </button>
          </div>

          {attachmentPicker && (
            <AttachmentPopover
              position={attachmentPicker.position}
              onSelect={(fileName) => {
                setNewCommentText(prev => prev + fileName);
              }}
              onClose={() => setAttachmentPicker(null)}
            />
          )}

          {mentionPicker && (
            <MentionPopover
              position={mentionPicker.position}
              onSelect={(mentionVal) => {
                setNewCommentText(prev => prev + mentionVal);
              }}
              onClose={() => setMentionPicker(null)}
            />
          )}
        </form>
      ) : (
        <div className="nptc-add-btn-container">
          <button
            type="button"
            className="nptc-add-btn"
            onClick={() => setShowPageCommentComposer(true)}
          >
            Add comment
          </button>
        </div>
      )}
    </div>
  );
});
/* ---- Legacy Emoji Picker (kept for callout icons) ---- */
/* ---- Legacy Emoji Picker (kept for callout icons) ---- */
export function EmojiPicker({ onSelect, position, onClose }) {
  const ref = useRef(null);
  const emojis = ['📝', '📌', '🚀', '⭐', '❤️', '🔥', '💡', '✅', '❌', '🎯', '📢', '🛠', '⚡', '🌟', '💬', '🧪', '🎨', '📚', '🔑', '🏆', '💎', '🌈', '🎵', '📎', '📒', '🗂', '📊', '🖼'];
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);
  return (
    <div className="emoji-picker-menu" ref={ref} style={{ left: position?.x || 0, top: position?.y || 0 }}>
      <div className="emoji-grid">{emojis.map(em => <span key={em} onClick={() => onSelect(em)}>{em}</span>)}</div>
    </div>
  );
}