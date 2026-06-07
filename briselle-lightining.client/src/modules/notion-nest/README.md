# NotionNest module

Notion-style block pages for objects whose **Object Type** is `NotionNest` / `notion_nest`.

## Page elements (blocks)

### Built-in (BlockNote)
| Element | How to insert |
|--------|----------------|
| Paragraph | `/` → Text, or **Insert → Text & structure** |
| Heading 1–3 | `/` → Headings |
| Bulleted / numbered / to-do lists | `/` or **Lists & tasks** |
| Code block (syntax highlighting) | `/` → Code |
| Table (simple grid) | `/` → Table |
| Image, video, audio, file | `/` or **Media** (upload ≤12MB as data URL) |

### Custom (NotionNest)
| Element | Behavior |
|--------|----------|
| Divider | Horizontal rule / slide break |
| Quote | Indented quote with rich text |
| Callout | Icon + color + rich text |
| Toggle | Collapsible title line |
| Table of contents | Auto-lists H1–H3 on page |
| Columns | 2–3 column layout marker |
| Bookmark | URL link preview card |
| Embed | iframe embed (YouTube, etc.) |
| Equation | LaTeX math block |
| Synced block | Reusable snippet with sync ID |
| Database | Link to Briselle object records |

### Rich text (inline)
Bold, italic, underline, strikethrough, inline code, links, colors — select text and use the formatting toolbar.

### UI
- **/** slash menu — all default + NotionNest blocks
- **Insert block** toolbar — grouped by category
- **Page elements** help (bottom-right) — quick reference
- Side drag handle, emoji picker, file panel, table handles

## Storage
`ddata_values.__notion_page` — BlockNote JSON + icon/cover metadata.

## Roadmap
Real-time collaboration, full inline database views (board/calendar), comments, page tree sidebar, PDF block viewer, true synced-block replication across pages.
