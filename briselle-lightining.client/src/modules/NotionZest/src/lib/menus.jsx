/* ============================================================
   NotionNest Ã¢â‚¬â€ menus.jsx
   SlashMenu, ContextMenu, InlineToolbar, NotionIconPicker
   ============================================================ */
import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { usePageContext } from './PageContext';
import { slashMenuSections } from './utils';

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
  { id: 'recent', label: 'Recently Used', icon: 'Ã°Å¸â€¢Â', emojis: ['Ã°Å¸â€˜Â','Ã¢ÂÂ¤Ã¯Â¸Â','Ã°Å¸ËœÅ ','Ã°Å¸Å½Â¯','Ã¢Å“â€¦','Ã°Å¸â€Â¥','Ã°Å¸â€™Â¡','Ã¢Â­Â','Ã°Å¸â€œÅ’','Ã°Å¸Å¡â‚¬'] },
  { id: 'smileys', label: 'Smileys & People', icon: 'Ã°Å¸Ëœâ‚¬', emojis: [
    'Ã°Å¸Ëœâ‚¬','Ã°Å¸ËœÆ’','Ã°Å¸Ëœâ€ž','Ã°Å¸ËœÂ','Ã°Å¸Ëœâ€ ','Ã°Å¸Ëœâ€¦','Ã°Å¸Â¤Â£','Ã°Å¸Ëœâ€š','Ã°Å¸â„¢â€š','Ã°Å¸â„¢Æ’','Ã°Å¸Ëœâ€°','Ã°Å¸ËœÅ ','Ã°Å¸Ëœâ€¡','Ã°Å¸Â¥Â°','Ã°Å¸ËœÂ','Ã°Å¸Â¤Â©','Ã°Å¸ËœËœ','Ã°Å¸Ëœâ€”','Ã°Å¸ËœÅ¡','Ã°Å¸Ëœâ„¢',
    'Ã°Å¸Â¥Â²','Ã°Å¸Ëœâ€¹','Ã°Å¸Ëœâ€º','Ã°Å¸ËœÅ“','Ã°Å¸Â¤Âª','Ã°Å¸ËœÂ','Ã°Å¸Â¤â€˜','Ã°Å¸Â¤â€”','Ã°Å¸Â¤Â­','Ã°Å¸Â«Â¢','Ã°Å¸Â¤Â«','Ã°Å¸Â¤â€','Ã°Å¸Â«Â¡','Ã°Å¸Â¤Â','Ã°Å¸Â¤Â¨','Ã°Å¸ËœÂ','Ã°Å¸Ëœâ€˜','Ã°Å¸ËœÂ¶','Ã°Å¸Â«Â¥','Ã°Å¸ËœÂ',
    'Ã°Å¸Ëœâ€™','Ã°Å¸â„¢â€ž','Ã°Å¸ËœÂ¬','Ã°Å¸Â¤Â¥','Ã°Å¸ËœÅ’','Ã°Å¸Ëœâ€','Ã°Å¸ËœÂª','Ã°Å¸Â¤Â¤','Ã°Å¸ËœÂ´','Ã°Å¸ËœÂ·','Ã°Å¸Â¤â€™','Ã°Å¸Â¤â€¢','Ã°Å¸Â¤Â¢','Ã°Å¸Â¤Â®','Ã°Å¸Â¥Âµ','Ã°Å¸Â¥Â¶','Ã°Å¸Â¥Â´','Ã°Å¸ËœÂµ','Ã°Å¸Â¤Â¯','Ã°Å¸Â¤Â ',
    'Ã°Å¸Â¥Â³','Ã°Å¸Â¥Â¸','Ã°Å¸ËœÅ½','Ã°Å¸Â¤â€œ','Ã°Å¸Â§Â','Ã°Å¸Ëœâ€¢','Ã°Å¸Â«Â¤','Ã°Å¸ËœÅ¸','Ã°Å¸â„¢Â','Ã°Å¸ËœÂ®','Ã°Å¸ËœÂ¯','Ã°Å¸ËœÂ²','Ã°Å¸ËœÂ³','Ã°Å¸Â¥Âº','Ã°Å¸Â¥Â¹','Ã°Å¸ËœÂ¦','Ã°Å¸ËœÂ§','Ã°Å¸ËœÂ¨','Ã°Å¸ËœÂ°','Ã°Å¸ËœÂ¥',
    'Ã°Å¸ËœÂ¢','Ã°Å¸ËœÂ­','Ã°Å¸ËœÂ±','Ã°Å¸Ëœâ€“','Ã°Å¸ËœÂ£','Ã°Å¸ËœÅ¾','Ã°Å¸Ëœâ€œ','Ã°Å¸ËœÂ©','Ã°Å¸ËœÂ«','Ã°Å¸Â¥Â±','Ã°Å¸ËœÂ¤','Ã°Å¸ËœÂ¡','Ã°Å¸ËœÂ ','Ã°Å¸Â¤Â¬','Ã°Å¸â€˜â€¹','Ã°Å¸Â¤Å¡','Ã°Å¸â€“Â','Ã¢Å“â€¹','Ã°Å¸â€“â€“','Ã°Å¸Â«Â±',
  ]},
  { id: 'nature', label: 'Nature', icon: 'Ã°Å¸Å’Â¿', emojis: [
    'Ã°Å¸ÂÂ¶','Ã°Å¸ÂÂ±','Ã°Å¸ÂÂ­','Ã°Å¸ÂÂ¹','Ã°Å¸ÂÂ°','Ã°Å¸Â¦Å ','Ã°Å¸ÂÂ»','Ã°Å¸ÂÂ¼','Ã°Å¸ÂÂ¨','Ã°Å¸ÂÂ¯','Ã°Å¸Â¦Â','Ã°Å¸ÂÂ®','Ã°Å¸ÂÂ·','Ã°Å¸ÂÂ¸','Ã°Å¸ÂÂµ','Ã°Å¸â„¢Ë†','Ã°Å¸â„¢â€°','Ã°Å¸â„¢Å ','Ã°Å¸Ââ€™','Ã°Å¸Ââ€',
    'Ã°Å¸Å’Â¸','Ã°Å¸Å’Âº','Ã°Å¸Å’Â»','Ã°Å¸Å’Â¼','Ã°Å¸Å’Â·','Ã°Å¸Å’Â±','Ã°Å¸Å’Â¿','Ã¢ËœËœÃ¯Â¸Â','Ã°Å¸Ââ‚¬','Ã°Å¸Å’Â³','Ã°Å¸Å’Â²','Ã°Å¸Å’Â´','Ã°Å¸Å’Âµ','Ã°Å¸Å’Â¾','Ã°Å¸ÂÂ','Ã°Å¸Ââ€š','Ã°Å¸ÂÆ’','Ã°Å¸Ââ€ž','Ã°Å¸ÂÅ¡','Ã°Å¸Å’Â',
  ]},
  { id: 'food', label: 'Food & Drink', icon: 'Ã°Å¸Ââ€', emojis: [
    'Ã°Å¸ÂÂ','Ã°Å¸ÂÅ½','Ã°Å¸ÂÂ','Ã°Å¸ÂÅ ','Ã°Å¸Ââ€¹','Ã°Å¸ÂÅ’','Ã°Å¸Ââ€°','Ã°Å¸Ââ€¡','Ã°Å¸Ââ€œ','Ã°Å¸Â«Â','Ã°Å¸ÂË†','Ã°Å¸Ââ€™','Ã°Å¸Ââ€˜','Ã°Å¸Â¥Â­','Ã°Å¸ÂÂ','Ã°Å¸Â¥Â¥','Ã°Å¸Â¥Â','Ã°Å¸Ââ€¦','Ã°Å¸Â¥â€˜','Ã°Å¸Â¥Â¦',
    'Ã°Å¸Ââ€','Ã°Å¸ÂÅ¸','Ã°Å¸Ââ€¢','Ã°Å¸Å’Â­','Ã°Å¸Â¥Âª','Ã°Å¸Å’Â®','Ã°Å¸Å’Â¯','Ã°Å¸Â¥â„¢','Ã°Å¸Â§â€ ','Ã°Å¸Â¥Å¡','Ã°Å¸ÂÂ³','Ã°Å¸Â¥Å¾','Ã°Å¸Â§â€¡','Ã°Å¸Â¥â€œ','Ã°Å¸Â¥Â©','Ã°Å¸Ââ€”','Ã°Å¸Ââ€“','Ã°Å¸Â¦Â´','Ã°Å¸Å’Â¶','Ã°Å¸Â«â€˜',
  ]},
  { id: 'activity', label: 'Activity', icon: 'Ã¢Å¡Â½', emojis: [
    'Ã¢Å¡Â½','Ã°Å¸Ââ‚¬','Ã°Å¸ÂË†','Ã¢Å¡Â¾','Ã°Å¸Â¥Å½','Ã°Å¸Å½Â¾','Ã°Å¸ÂÂ','Ã°Å¸Ââ€°','Ã°Å¸Â¥Â','Ã°Å¸Å½Â±','Ã°Å¸Âªâ‚¬','Ã°Å¸Ââ€œ','Ã°Å¸ÂÂ¸','Ã°Å¸Ââ€™','Ã°Å¸Ââ€˜','Ã°Å¸Â¥Â','Ã°Å¸ÂÂ','Ã°Å¸ÂªÆ’','Ã°Å¸Â¥â€¦','Ã¢â€ºÂ³',
    'Ã°Å¸Å½Â¯','Ã°Å¸ÂªÂ','Ã°Å¸Å½Â®','Ã°Å¸Å½Â²','Ã°Å¸Â§Â©','Ã°Å¸Å½Âª','Ã°Å¸Å½Â¨','Ã°Å¸Å½Â­','Ã°Å¸Å½Â¤','Ã°Å¸Å½Â§','Ã°Å¸Å½Â¼','Ã°Å¸Å½Â¹','Ã°Å¸Â¥Â','Ã°Å¸ÂªËœ','Ã°Å¸Å½Â·','Ã°Å¸Å½Âº','Ã°Å¸Âªâ€”','Ã°Å¸Å½Â¸','Ã°Å¸Âªâ€¢','Ã°Å¸Å½Â»',
  ]},
  { id: 'travel', label: 'Travel & Places', icon: 'Ã¢Å“Ë†Ã¯Â¸Â', emojis: [
    'Ã°Å¸Å¡â€”','Ã°Å¸Å¡â€¢','Ã°Å¸Å¡â„¢','Ã°Å¸Å¡Å’','Ã°Å¸Å¡Å½','Ã°Å¸ÂÅ½','Ã°Å¸Å¡â€œ','Ã°Å¸Å¡â€˜','Ã°Å¸Å¡â€™','Ã°Å¸Å¡Â','Ã°Å¸â€ºÂ»','Ã°Å¸Å¡Å¡','Ã°Å¸Å¡â€º','Ã°Å¸Å¡Å“','Ã°Å¸â€ºÂµ','Ã°Å¸ÂÂ','Ã°Å¸â€ºÂº','Ã°Å¸Å¡Â²','Ã°Å¸â€ºÂ´','Ã°Å¸â€ºÂ¹',
    'Ã¢Å“Ë†Ã¯Â¸Â','Ã°Å¸â€ºÂ©','Ã°Å¸Å¡â‚¬','Ã°Å¸â€ºÂ¸','Ã°Å¸Å¡Â','Ã¢â€ºÂµ','Ã°Å¸Å¡Â¤','Ã°Å¸â€ºÂ¥','Ã°Å¸â€ºÂ³','Ã¢â€ºÂ´','Ã°Å¸ÂÂ ','Ã°Å¸ÂÂ¡','Ã°Å¸ÂÂ¢','Ã°Å¸ÂÂ£','Ã°Å¸ÂÂ¤','Ã°Å¸ÂÂ¥','Ã°Å¸ÂÂ¦','Ã°Å¸ÂÂ¨','Ã°Å¸ÂÂ©','Ã°Å¸ÂÂª',
  ]},
  { id: 'objects', label: 'Objects', icon: 'Ã°Å¸â€™Â¡', emojis: [
    'Ã°Å¸â€™Â¡','Ã°Å¸â€Â¦','Ã°Å¸ÂÂ®','Ã°Å¸â€œÂ±','Ã°Å¸â€™Â»','Ã¢Å’Â¨Ã¯Â¸Â','Ã°Å¸â€“Â¥','Ã°Å¸â€“Â¨','Ã°Å¸â€“Â±','Ã°Å¸â€™Â¾','Ã°Å¸â€™Â¿','Ã°Å¸â€œâ‚¬','Ã°Å¸â€œÂ·','Ã°Å¸â€œÂ¸','Ã°Å¸Å½Â¥','Ã°Å¸â€œÂ¹','Ã°Å¸â€Â','Ã°Å¸â€Â¬','Ã°Å¸â€Â­','Ã°Å¸â€œÂ¡',
    'Ã°Å¸â€œÂ','Ã¢Å“ÂÃ¯Â¸Â','Ã°Å¸â€“Å ','Ã°Å¸â€“â€¹','Ã°Å¸â€“Å’','Ã°Å¸â€“Â','Ã°Å¸â€œâ€¹','Ã°Å¸â€œÅ½','Ã°Å¸â€â€“','Ã°Å¸â€œÅ’','Ã°Å¸â€œÂ','Ã°Å¸â€œÂ','Ã°Å¸â€œÂ','Ã¢Å“â€šÃ¯Â¸Â','Ã°Å¸â€”â€š','Ã°Å¸â€œÂ','Ã°Å¸â€œâ€š','Ã°Å¸â€œÂ°','Ã°Å¸â€œÅ ','Ã°Å¸â€œË†',
    'Ã°Å¸â€œâ€°','Ã°Å¸â€”Æ’','Ã°Å¸â€”â€ž','Ã°Å¸â€”â€˜','Ã°Å¸â€â€™','Ã°Å¸â€â€œ','Ã°Å¸â€â€˜','Ã°Å¸â€”Â','Ã°Å¸â€Â¨','Ã°Å¸Âªâ€œ','Ã¢â€ºÂ','Ã¢Å¡â€™','Ã°Å¸â€ºÂ ','Ã°Å¸â€”Â¡','Ã¢Å¡â€Ã¯Â¸Â','Ã°Å¸â€Â§','Ã°Å¸â€Â©','Ã¢Å¡â„¢Ã¯Â¸Â','Ã°Å¸â€”Å“','Ã¢Å¡â€“Ã¯Â¸Â',
  ]},
  { id: 'symbols', label: 'Symbols', icon: 'Ã¢ÂÂ¤Ã¯Â¸Â', emojis: [
    'Ã¢ÂÂ¤Ã¯Â¸Â','Ã°Å¸Â§Â¡','Ã°Å¸â€™â€º','Ã°Å¸â€™Å¡','Ã°Å¸â€™â„¢','Ã°Å¸â€™Å“','Ã°Å¸â€“Â¤','Ã°Å¸Â¤Â','Ã°Å¸Â¤Å½','Ã°Å¸â€™â€','Ã¢ÂÂ£Ã¯Â¸Â','Ã°Å¸â€™â€¢','Ã°Å¸â€™Å¾','Ã°Å¸â€™â€œ','Ã°Å¸â€™â€”','Ã°Å¸â€™â€“','Ã°Å¸â€™Ëœ','Ã°Å¸â€™Â','Ã°Å¸â€™Å¸','Ã¢ËœÂ®Ã¯Â¸Â',
    'Ã¢Å“ÂÃ¯Â¸Â','Ã¢ËœÂªÃ¯Â¸Â','Ã°Å¸â€¢â€°','Ã¢ËœÂ¸Ã¯Â¸Â','Ã¢Å“Â¡Ã¯Â¸Â','Ã°Å¸â€Â¯','Ã°Å¸â€¢Å½','Ã¢ËœÂ¯Ã¯Â¸Â','Ã¢ËœÂ¦Ã¯Â¸Â','Ã°Å¸â€ºÂ','Ã¢â€ºÅ½','Ã¢â„¢Ë†','Ã¢â„¢â€°','Ã¢â„¢Å ','Ã¢â„¢â€¹','Ã¢â„¢Å’','Ã¢â„¢Â','Ã¢â„¢Å½','Ã¢â„¢Â','Ã¢â„¢Â',
    'Ã¢Å“â€¦','Ã¢ÂÅ’','Ã¢Ââ€œ','Ã¢Ââ€”','Ã¢â‚¬Â¼Ã¯Â¸Â','Ã¢Ââ€°Ã¯Â¸Â','Ã¢Â­â€¢','Ã°Å¸Å¡Â«','Ã°Å¸â€™Â¯','Ã°Å¸â€Â´','Ã°Å¸Å¸Â ','Ã°Å¸Å¸Â¡','Ã°Å¸Å¸Â¢','Ã°Å¸â€Âµ','Ã°Å¸Å¸Â£','Ã¢Å¡Â«','Ã¢Å¡Âª','Ã°Å¸Å¸Â¤','Ã°Å¸â€Â¶','Ã°Å¸â€Â·',
  ]},
  { id: 'flags', label: 'Flags', icon: 'Ã°Å¸ÂÂ', emojis: [
    'Ã°Å¸ÂÂ','Ã°Å¸Å¡Â©','Ã°Å¸Å½Å’','Ã°Å¸ÂÂ´','Ã°Å¸ÂÂ³Ã¯Â¸Â','Ã°Å¸ÂÂ³Ã¯Â¸ÂÃ¢â‚¬ÂÃ°Å¸Å’Ë†','Ã°Å¸ÂÂ³Ã¯Â¸ÂÃ¢â‚¬ÂÃ¢Å¡Â§Ã¯Â¸Â','Ã°Å¸â€¡ÂºÃ°Å¸â€¡Â¸','Ã°Å¸â€¡Â¬Ã°Å¸â€¡Â§','Ã°Å¸â€¡Â¨Ã°Å¸â€¡Â¦','Ã°Å¸â€¡Â¦Ã°Å¸â€¡Âº','Ã°Å¸â€¡Â©Ã°Å¸â€¡Âª','Ã°Å¸â€¡Â«Ã°Å¸â€¡Â·','Ã°Å¸â€¡Â¯Ã°Å¸â€¡Âµ','Ã°Å¸â€¡Â®Ã°Å¸â€¡Â³','Ã°Å¸â€¡Â§Ã°Å¸â€¡Â·','Ã°Å¸â€¡Â°Ã°Å¸â€¡Â·','Ã°Å¸â€¡Â®Ã°Å¸â€¡Â¹','Ã°Å¸â€¡ÂªÃ°Å¸â€¡Â¸','Ã°Å¸â€¡Â²Ã°Å¸â€¡Â½',
  ]},
];

/* ---- SVG Icon Library (inline SVGs for icon tab) ---- */
const SVG_ICONS = [
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
          {sectionItems.map(item => { const idx = itemIndex++; return (
            <div key={item.type} className={`slash-menu-item${idx === selectedIndex ? ' selected' : ''}`} onClick={() => selectItem(item.type)} onMouseEnter={() => setSelectedIndex(idx)}>
              <span className="slash-menu-item-icon">{item.icon}</span><div className="slash-menu-item-info"><span className="slash-menu-item-name">{item.name}</span><span className="slash-menu-item-description">{item.desc}</span></div>
            </div>); })}
        </div>);
      })}
      {visibleItems.length === 0 && <div className="slash-menu-empty">No results</div>}
    </div>
  );
});

/* ==================================================================
   CONTEXT MENU Ã¢â‚¬â€ fixed: submenu items don't auto-close
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
            {item.submenu && <span style={{marginLeft:'auto',fontSize:11,opacity:.5}}>Ã¢â€“Â¶</span>}
          </div>
        );
      })}
    </div>
  );
});

/* ==================================================================
   NOTION-STYLE ICON PICKER Ã¢â‚¬â€  Emoji + Icons + Upload tabs w/ search
   ================================================================== */
export const NotionIconPicker = memo(function NotionIconPicker({ position, onSelect, onClose }) {
  const ref = useRef(null);
  const [tab, setTab] = useState('emoji');
  const [filter, setFilter] = useState('');
  const [emojiCat, setEmojiCat] = useState('smileys');

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', esc); };
  }, [onClose]);

  const activeCat = EMOJI_CATEGORIES.find(c => c.id === emojiCat) || EMOJI_CATEGORIES[1];
  const q = filter.trim().toLowerCase();

  const filteredEmojis = q
    ? EMOJI_CATEGORIES.flatMap(c => c.emojis)
    : activeCat.emojis;

  const filteredIcons = q
    ? SVG_ICONS.filter(ic => ic.name.toLowerCase().includes(q))
    : SVG_ICONS;

  return (
    <div ref={ref} className="notion-icon-picker" style={{ left: position?.x || 0, top: position?.y || 0 }} onMouseDown={e => e.stopPropagation()}>
      {/* Tab bar */}
      <div className="nip-tabs">
        <button className={`nip-tab${tab === 'emoji' ? ' active' : ''}`} onClick={() => setTab('emoji')}>Emoji</button>
        <button className={`nip-tab${tab === 'icons' ? ' active' : ''}`} onClick={() => setTab('icons')}>Icons</button>
        <button className={`nip-tab${tab === 'upload' ? ' active' : ''}`} onClick={() => setTab('upload')}>Upload</button>
        <button className="nip-remove" onClick={() => { onSelect(''); onClose(); }}>Remove</button>
      </div>

      {/* Search */}
      <div className="nip-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input type="text" placeholder="FilterÃ¢â‚¬Â¦" value={filter} onChange={e => setFilter(e.target.value)} autoFocus />
        <button className="nip-random" title="Random" onClick={() => {
          const pool = EMOJI_CATEGORIES.flatMap(c => c.emojis);
          onSelect(pool[Math.floor(Math.random() * pool.length)]);
          onClose();
        }}>Ã°Å¸Å½Â²</button>
      </div>

      {/* Body */}
      <div className="nip-body">
        {tab === 'emoji' && (
          <>
            {!q && <div className="nip-cat-label">{activeCat.label}</div>}
            <div className="nip-emoji-grid">
              {filteredEmojis.map((em, i) => (
                <button key={`${em}-${i}`} className="nip-emoji-cell" onClick={() => { onSelect(em); onClose(); }}>{em}</button>
              ))}
            </div>
          </>
        )}
        {tab === 'icons' && (
          <div className="nip-icon-grid">
            {filteredIcons.map(ic => (
              <button key={ic.name} className="nip-icon-cell" title={ic.name} onClick={() => { onSelect(`svg:${ic.name}`); onClose(); }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={ic.path}/></svg>
              </button>
            ))}
          </div>
        )}
        {tab === 'upload' && (
          <div className="nip-upload">
            <div className="nip-upload-zone" onClick={() => {
              const input = document.createElement('input');
              input.type = 'file'; input.accept = 'image/*';
              input.onchange = (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => { onSelect(ev.target.result); onClose(); };
                reader.readAsDataURL(file);
              };
              input.click();
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span>Choose an image</span>
              <small>PNG, JPG, GIF or WebP</small>
            </div>
          </div>
        )}
      </div>

      {/* Emoji category bar */}
      {tab === 'emoji' && !q && (
        <div className="nip-cat-bar">
          {EMOJI_CATEGORIES.map(c => (
            <button key={c.id} className={`nip-cat-btn${emojiCat === c.id ? ' active' : ''}`} title={c.label} onClick={() => setEmojiCat(c.id)}>{c.icon}</button>
          ))}
        </div>
      )}
    </div>
  );
});
/* ==================================================================
   INLINE TOOLBAR — simplified, verified working
   ================================================================== */
export const InlineToolbar = memo(function InlineToolbar() {
  const { changeBlockType, getBlockById, addComment } = usePageContext();
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [colorOpen, setColorOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [blockId, setBlockId] = useState(null);
  const [blockType, setBlockType] = useState('paragraph');
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
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) { setVisible(false); setColorOpen(false); setEmojiOpen(false); return; }
      const anchor = sel.anchorNode;
      const editable = anchor?.nodeType === 1 ? anchor.closest?.('[contenteditable]') : anchor?.parentElement?.closest?.('[contenteditable]');
      const block = editable?.closest?.('.block');
      if (!block || !editable) { setVisible(false); return; }
      if (block.classList.contains('block-code') || editable.closest('.tab-name')) { setVisible(false); return; }
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
  }, [getBlockById]);

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

  /* Set text alignment on the block element */
  const setAlignment = useCallback((align) => {
    const block = document.querySelector(`[data-block-id="${blockId}"]`);
    if (block) {
      const ce = block.querySelector('[contenteditable]');
      if (ce) ce.style.textAlign = align;
    }
  }, [blockId]);

  /* Add link */
  const handleLink = useCallback(() => {
    saveRange();
    const url = prompt('Enter URL:');
    if (url) {
      restoreRange();
      document.execCommand('createLink', false, url);
    }
  }, [saveRange, restoreRange]);

  /* Add comment â€” highlights text + adds to sidebar */
  const handleComment = useCallback(() => {
    restoreRange();
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const selectedText = sel.toString();
    const commentText = prompt('Add a comment:');
    if (!commentText) return;
    restoreRange();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('insertHTML', false,
      `<mark class="inline-comment" data-comment-text="${commentText.replace(/"/g, '&quot;')}" title="${commentText.replace(/"/g, '&quot;')}">${selectedText}</mark>`
    );
    addComment(blockId, selectedText, commentText);
  }, [restoreRange, blockId, addComment]);

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
    { value: 'paragraph', label: 'Text' },{ value: 'heading1', label: 'Heading 1' },{ value: 'heading2', label: 'Heading 2' },
    { value: 'heading3', label: 'Heading 3' },{ value: 'bulleted_list', label: 'Bulleted List' },{ value: 'numbered_list', label: 'Numbered List' },
    { value: 'todo', label: 'To-do' },{ value: 'quote', label: 'Quote' },{ value: 'callout', label: 'Callout' },{ value: 'code', label: 'Code' },
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

        {/* Row 1: Block type */}
        <div className="nit-row nit-type-row">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>
          <span>{typeName}</span>
          <select className="nit-type-select" value={blockType} onChange={handleTypeChange} onMouseDown={e => e.stopPropagation()}>
            {BLOCK_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginLeft:'auto',opacity:.5}}><path d="M9 18l6-6-6-6"/></svg>
        </div>

        <div className="nit-divider" />

        {/* Row 2: A(color) B I U Tx(clear) */}
        <div className="nit-row nit-format-row">
          <div style={{position:'relative'}}>
            <button className="nit-btn nit-color-btn" onClick={() => { saveRange(); setColorOpen(v => !v); setEmojiOpen(false); }} title="Color">
              <span style={{fontWeight:700,fontSize:15}}>A</span>
              <span className="nit-color-bar" />
            </button>
            {colorOpen && (
              <div className="nit-color-palette" onMouseDown={e => e.stopPropagation()}>
                <div className="nit-palette-section">Text Color</div>
                {TEXT_COLORS.map(c => (
                  <div key={'t'+c.name} className="nit-palette-row" onClick={() => applyColor(c.color)}>
                    <span className="nit-palette-swatch" style={{background:c.color}} /><span>{c.name}</span>
                  </div>
                ))}
                <div className="nit-palette-section" style={{marginTop:4}}>Background</div>
                {BG_COLORS.map(c => (
                  <div key={'b'+c.name} className="nit-palette-row" onClick={() => applyBg(c.color)}>
                    <span className="nit-palette-swatch" style={{background:c.color,border:'1px solid rgba(255,255,255,.2)'}} /><span>{c.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="nit-btn" onClick={() => exec('bold')} title="Bold (Ctrl+B)"><b>B</b></button>
          <button className="nit-btn" onClick={() => exec('italic')} title="Italic (Ctrl+I)"><i>I</i></button>
          <button className="nit-btn" onClick={() => exec('underline')} title="Underline (Ctrl+U)"><u>U</u></button>
          <button className="nit-btn" onClick={() => { restoreRange(); document.execCommand('removeFormat', false, null); }} title="Clear formatting">
            <span style={{fontSize:13,fontWeight:600}}>T</span><span style={{fontSize:10,opacity:.6}}>âœ•</span>
          </button>
        </div>

        <div className="nit-divider" />

        {/* Row 3: Link, Strikethrough, Code, Equation, Align Left */}
        <div className="nit-row nit-format-row">
          <button className="nit-btn" onClick={handleLink} title="Link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          </button>
          <button className="nit-btn" onClick={() => exec('strikeThrough')} title="Strikethrough"><s>S</s></button>
          <button className="nit-btn" onClick={handleCodeWrap} title="Inline code">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>
          </button>
          <button className="nit-btn" onClick={() => { saveRange(); const eq = prompt('Enter equation:'); if (eq) { restoreRange(); document.execCommand('insertHTML', false, '<code class="inline-eq" style="background:rgba(255,255,255,.06);padding:2px 6px;border-radius:3px;font-family:serif;font-style:italic">' + eq + '</code>'); }}} title="Equation">
            <span style={{fontFamily:'serif',fontSize:14,fontStyle:'italic'}}>âˆšx</span>
          </button>
          <button className="nit-btn" onClick={() => setAlignment('left')} title="Align left">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 10H3M21 6H3M21 14H3M17 18H3"/></svg>
          </button>
        </div>

        <div className="nit-divider" />

        {/* Row 4: Align center, Align right, Superscript, Subscript */}
        <div className="nit-row nit-format-row">
          <button className="nit-btn" onClick={() => setAlignment('center')} title="Align center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 10H6M21 6H3M21 14H3M18 18H6"/></svg>
          </button>
          <button className="nit-btn" onClick={() => setAlignment('right')} title="Align right">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10H7M21 6H3M21 14H3M21 18H7"/></svg>
          </button>
          <button className="nit-btn" onClick={() => exec('superscript')} title="Superscript">
            <span style={{fontSize:12}}>X<sup style={{fontSize:8}}>2</sup></span>
          </button>
          <button className="nit-btn" onClick={() => exec('subscript')} title="Subscript">
            <span style={{fontSize:12}}>X<sub style={{fontSize:8}}>2</sub></span>
          </button>
        </div>

        <div className="nit-divider" />

        {/* Row 5: Comment, Emoji, Mention */}
        <div className="nit-row nit-action-row">
          <button className="nit-btn nit-action-btn" onClick={handleComment} title="Comment">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span>Comment</span>
          </button>
          <button className="nit-btn" onClick={() => { saveRange(); setEmojiOpen(v => !v); setColorOpen(false); }} title="Emoji">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
          </button>
          <button className="nit-btn" onClick={() => { saveRange(); const name = prompt('Mention a page or person:'); if (name) { restoreRange(); document.execCommand('insertHTML', false, '<span class="inline-mention" style="background:rgba(35,131,226,.15);padding:1px 4px;border-radius:3px;color:#5c9ce6;cursor:pointer">@' + name + '</span>&nbsp;'); }}} title="Mention">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg>
          </button>
        </div>
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

/* ==================================================================
   COMMENT SIDEBAR - shown on the right side of the page
   ================================================================== */
export const CommentSidebar = memo(function CommentSidebar() {
  const { comments, addReply, resolveComment, commentSidebarOpen, setCommentSidebarOpen } = usePageContext();
  const [replyTexts, setReplyTexts] = useState({});

  if (!commentSidebarOpen || comments.length === 0) return null;

  return (
    <div className="comment-sidebar">
      <div className="comment-sidebar-header">
        <span>Comments</span>
        <button className="comment-sidebar-close" onClick={() => setCommentSidebarOpen(false)}>Ã—</button>
      </div>
      <div className="comment-sidebar-list">
        {comments.map(cmt => (
          <div key={cmt.id} className="comment-card">
            <div className="comment-selected-text">"{cmt.selectedText}"</div>
            {cmt.thread.map((msg, i) => (
              <div key={i} className="comment-msg">
                <div className="comment-msg-header">
                  <span className="comment-avatar">{msg.author[0]}</span>
                  <span className="comment-author">{msg.author}</span>
                  <span className="comment-time">{msg.time}</span>
                </div>
                <div className="comment-msg-text">{msg.text}</div>
              </div>
            ))}
            <div className="comment-reply-row">
              <input
                className="comment-reply-input"
                placeholder="Reply..."
                value={replyTexts[cmt.id] || ''}
                onChange={e => setReplyTexts(prev => ({ ...prev, [cmt.id]: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === 'Enter' && replyTexts[cmt.id]?.trim()) {
                    addReply(cmt.id, replyTexts[cmt.id]);
                    setReplyTexts(prev => ({ ...prev, [cmt.id]: '' }));
                  }
                }}
              />
              <button className="comment-reply-submit" onClick={() => {
                if (replyTexts[cmt.id]?.trim()) {
                  addReply(cmt.id, replyTexts[cmt.id]);
                  setReplyTexts(prev => ({ ...prev, [cmt.id]: '' }));
                }
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            </div>
            <button className="comment-resolve" onClick={() => resolveComment(cmt.id)}>Resolve</button>
          </div>
        ))}
      </div>
    </div>
  );
});

/* ---- Legacy Emoji Picker (kept for callout icons) ---- */
/* ---- Legacy Emoji Picker (kept for callout icons) ---- */
export function EmojiPicker({ onSelect, position, onClose }) {
  const ref = useRef(null);
  const emojis = ['📝','📌','🚀','⭐','❤️','🔥','💡','✅','❌','🎯','📢','🛠','⚡','🌟','💬','🧪','🎨','📚','🔑','🏆','💎','🌈','🎵','📎','📒','🗂','📊','🖼'];
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