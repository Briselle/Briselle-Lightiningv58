# ZIVA chat module (export pack)

This folder is a **plug-and-play** Ziva pack: React widget + optional **standalone Groq API** on its own port. The host app (Briselle-Lightining) only wires `VITE_ZIVA_API_URL` — it does not need to embed Ziva server code.

## Architecture

```
┌─────────────────────────────┐     VITE_ZIVA_API_URL      ┌──────────────────────────┐
│  Host app (React / Vite)    │ ─────────────────────────► │  Ziva module API         │
│  <ZivaChat config.api… />   │   http://127.0.0.1:5199    │  npm run server          │
└─────────────────────────────┘       /api/ziva            │  .env.ziva + GROQ_API_KEY │
                                                           └──────────────────────────┘
```

| Config location | Purpose |
|-----------------|--------|
| `ziva-chat-module/.env.ziva` | Module server: port, Groq key, CORS |
| Host `.env` | `VITE_ZIVA_API_URL` — where the widget calls |
| `ziva.config.example.json` | Documented defaults (reference) |

**Optional:** `Briselle-Lightining.Server` `ZivaController` exposes the same routes in-process if you do not run the Node server.

## Quick start (standalone)

```bash
cd src/modules/ziva-chat-module
cp example.env.ziva.txt .env.ziva   # set GROQ_API_KEY
npm install
npm run server                      # listens on http://127.0.0.1:5199/api/ziva
```

Verify Groq (not LLM field generation): open `http://127.0.0.1:5199/GroqStatusCheck` — confirms API key and Groq reachability.

In the host app root, copy `.env.example` → `.env` and set `VITE_ZIVA_API_URL=http://127.0.0.1:5199/api/ziva`.

## Contents

| Path | Purpose |
|------|---------|
| `src/ZivaChat.jsx` | Widget: FAB, panel, typewriter, suggestions, local FAQ + API fallback |
| `src/ZivaChat.css` | All chat layout and visual design |
| `src/zivaKnowledge.js` | Roles, FAQ, suggestions, nav links, contact-form triggers |
| `src/defaultConfig.js` | Strings, routes, assets, API URL, auth callbacks — **override for subdomain apps** |
| `src/SimpleZivaContactForm.jsx` | Minimal name/email/message form (no Supabase) |
| `src/ZivaContactForm.css` | Contact strip styles |
| `src/ZivaPage.jsx` + `ZivaPage.css` | Landing page skeleton (sections, grid, CTAs) |
| `src/index.js` | Barrel exports |
| `server/createZivaApi.mjs` | Express router: `/api/ziva`, `/api/ziva/object-fields` |
| `server/zivaStandaloneServer.mjs` | Standalone process (`npm run server`) |
| `server/zivaServerConfig.mjs` | Port/host/Groq from env + `.env.ziva` |
| `src/zivaServiceConfig.js` | Client URL resolution (`VITE_ZIVA_API_URL`) |

## Assets (copy into your app `public/`)

The chat expects:

- `public/assets/briselle-logo.png` (or set `config.assets.logo`)
- `public/assets/ziva_sparkle_white.svg` (or set `config.assets.sparkle`)

Copy these from your Briselle portal `public` build or asset pipeline if they are not in the repo snapshot.

## React integration (Vite or similar)

1. Copy this entire `ziva-chat-module` folder into your project (e.g. `src/vendor/ziva-chat-module/`).

2. Install peers: `react`, `react-dom`, `react-router-dom`.

3. Load **Font Awesome** (icons: `fa-times`, `fa-paper-plane`, role icons) the same way your main site does, or swap icons in `zivaKnowledge.js` / JSX.

4. Import CSS once (e.g. in your root layout):

```jsx
import ZivaChat from './vendor/ziva-chat-module/src/ZivaChat.jsx';
import './vendor/ziva-chat-module/src/ZivaChat.css';
```

5. Render inside a `BrowserRouter` (uses `Link` / `useNavigate`):

```jsx
<ZivaChat
  config={{
    strings: {
      rolePrompt: 'Choose your role—or ask anything about this workspace.',
      inputPlaceholder: 'Ask a question…',
    },
    routes: { learnMorePath: '/help/ziva', learnMoreLabel: 'About ZIVA', homePath: '/' },
    assets: { logo: '/assets/your-logo.png', sparkle: '/assets/ziva_sparkle_white.svg' },
    api: { baseUrl: import.meta.env.VITE_ZIVA_API_URL },
    auth: {
      openLogin: () => { /* your subdomain auth */ },
      openSignup: () => { /* ... */ },
    },
    contactSubmitUrl: '/api/ziva-contact',
  }}
/>
```

6. Optional: replace the contact form with your Briselle OTP form (or subdomain logic):

```jsx
import ZivaChat from '...';
import BriselleZivaContactForm from './BriselleZivaContactForm';

<ZivaChat contactFormComponent={BriselleZivaContactForm} />
```

7. Environment: set `VITE_ZIVA_API_URL` to the standalone Ziva server (see `example.env.ziva.txt`). For Vite dev with a relative URL, use `VITE_ZIVA_API_URL=/api/ziva` and `VITE_ZIVA_PROXY_TARGET=http://127.0.0.1:5199`.

## Subdomain vs main site

- **Content & navigation**: edit `src/zivaKnowledge.js` (`FAQ`, `NAV_LINKS`, `SUGGESTED_QUESTIONS`, `CONTENT_TO_LINK` patterns) so links match the subdomain router.
- **Branding**: override `config.assets`, `config.tagline`, `config.fabLabel`.
- **API behaviour**: implement `getContext()` in Node so ZIVA only answers from **that** app’s text (policies, features, URLs).

## Server (Express)

**Recommended:** `npm run server` in this folder (see **Quick start** above).

**Advanced:** mount `createZivaApiRouter` in your own Express app; set `GROQ_API_KEY` in `.env.ziva`.

## Original files in `newportal` (reference)

- `src/components/ZivaChat.jsx`, `ZivaChat.css`
- `src/components/ZivaContactForm.jsx` (Supabase OTP)
- `src/data/zivaKnowledge.js`
- `src/pages/ZivaPage.jsx` + styles in `src/styles/app.css`
- `server/ziva-api.js`, `server/content/siteContent.js`

This export is meant to be **self-contained** and **config-driven** so you can evolve the subdomain app without forking JSX for every string.
