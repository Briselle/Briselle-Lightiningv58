# AGENTS.md

## Cursor Cloud specific instructions

### Product overview

Briselle Lightning (Lightning CRM) is a React/Vite SPA (`briselle-lightining.client`) backed primarily by **Supabase** (Postgres + PostgREST). The ASP.NET Core 8 project (`Briselle-Lightining.Server`) hosts a sample API (`/weatherforecast`), SignalR (`/hubs/realtime`), and optional SPA proxy for Visual Studio workflows.

### Services

| Service | Port | When needed |
|---------|------|-------------|
| Vite dev server | `5173` (default) | **Required** for UI development |
| Local Supabase API | `54321` | **Required** for objects/records/entity flows |
| ASP.NET API | `5083` (when run with `ASPNETCORE_URLS`) | **Optional** unless testing .NET API or SignalR |

### Dependency refresh (automatic)

On VM startup, the update script runs `npm install` in `briselle-lightining.client/`. See the configured update script in Cursor Cloud settings.

### First-time / manual setup (not in update script)

1. **Node client**
   ```bash
   cd briselle-lightining.client && npm install
   ```
2. **.NET 8 SDK** (not preinstalled on all VMs): install to `~/.dotnet` if missing, then ensure `~/.bashrc` includes:
   ```bash
   export DOTNET_ROOT=$HOME/.dotnet
   export PATH=$HOME/.dotnet:$PATH
   ```
   Build server: `cd Briselle-Lightining.Server && dotnet restore && dotnet build`
3. **Supabase credentials** — create `briselle-lightining.client/.env`:
   ```env
   VITE_SUPABASE_URL=<your-project-url>
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   ```
   The app throws on startup if these are missing (`src/utils/supabase.ts`).

### Local Supabase (no hosted project)

If Docker is available:

```bash
sudo chmod 666 /var/run/docker.sock   # if permission denied
mkdir -p /tmp/supabase-local && cd /tmp/supabase-local
npx supabase@latest init --yes
npx supabase@latest start
npx supabase@latest status -o env   # ANON_KEY, API_URL
```

Point `.env` at `API_URL` and `ANON_KEY`. Apply SQL under `database/` in numeric order. **Note:** migrations `004+` expect a `public.dobj` table that is not created until `010_reorder_dobj_columns_select_star.sql` (which itself expects an existing `dobj`). For a fresh DB you may need a minimal `dobj`/`entity`/`ddata`/`fields` bootstrap before seeds, or use an already-migrated hosted Supabase project.

### Running services (tmux recommended)

```bash
# Vite
cd briselle-lightining.client && npm run dev -- --host 127.0.0.1 --port 5173

# Optional ASP.NET (skip launch profile to avoid SPA proxy port mismatch)
cd Briselle-Lightining.Server
ASPNETCORE_URLS=http://127.0.0.1:5083 dotnet run --no-launch-profile
```

### Lint / test / build

| Command | Location | Notes |
|---------|----------|-------|
| `npm run lint` | `briselle-lightining.client` | May fail with ESLint 9 + `@typescript-eslint/no-unused-expressions` rule load error (pre-existing toolchain mismatch) |
| `npm run build` | `briselle-lightining.client` | Requires `.env` Supabase vars at build time (imports `supabase.ts`) |
| `dotnet build` | `Briselle-Lightining.Server` | Succeeds once SDK is on PATH |

No Vitest test files are present in the repo.

### Gotchas

- **Auth:** `App.tsx` hardcodes `isAuthenticated = true`; login targets unimplemented `/api` routes on the .NET server.
- **Dashboard / users / settings** use mock/static data; **objects / records / entity** need Supabase.
- **ESLint** failure does not block `npm run build`.
- **SpaProxy:** `dotnet run` with the default launch profile expects Vite at `https://localhost:57692`; prefer `npm run dev` on `5173` or set `ASPNETCORE_URLS` and `--no-launch-profile`.
- **platform_config REST errors (406/409)** can appear in the console on some routes until presets and RLS match your DB; core list pages still work with seeded data.
