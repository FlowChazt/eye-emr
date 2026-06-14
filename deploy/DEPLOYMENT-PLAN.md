# Deployment Plan — Eye EMR on a Windows clinic PC

> Status: **kit built (2026-06-14).** Step 1 (standalone build) is applied to
> `next.config.ts` and verified to boot/migrate/seed on Linux here. The Windows
> deploy kit (Steps 2–5) is written under `deploy/windows/`. What remains is the
> actual one-time setup *on the clinic Windows PC* (run `install.bat`) — see
> `deploy/windows/README.md`. Decisions taken for the open questions: port
> **3000**, **Edge/Chrome app-mode** browser with default-browser fallback,
> **autostart yes** (Startup shortcut), **install.bat** (no Inno Setup).

## Goal & decisions (confirmed with the user)

- Deploy to **one dedicated Windows PC** the clinic is buying. The user (the
  developer, chakrit) does the one-time setup; his girlfriend (non-technical)
  only ever double-clicks an icon — **no command line for her, ever.**
- **Packaging approach chosen: standalone build + installer/setup script**
  (NOT Electron). Lighter, easier to maintain.
- **Multi-PC LAN access is required**: the dedicated PC runs the server; other
  PCs in the clinic connect via a browser to `http://<server-ip>:3000`. No
  install needed on the other PCs. (This already works conceptually because the
  app *is* a web server — we just need to bind to all interfaces + open the
  firewall.)
- **Backups: a daily Windows scheduled task at 23:00** copying `clinic.db` to a
  `backups\` folder with retention.

## Key reality about the build environment

- The current dev box is **WSL (Linux)**. `better-sqlite3` is a native module.
- On **Windows**, `npm install better-sqlite3` downloads a **prebuilt binary**
  (via prebuild-install) — **no Visual Studio / compiler needed.** So the
  cleanest path is to run the build **on the Windows PC itself** (or any Windows
  machine), not cross-compile from WSL.
- Per project memory, **npm hangs in WSL — use bun + `npm rebuild`** for native
  modules here. On Windows just use normal `npm`.
- We CAN still verify the standalone build boots on Linux here (it'll use the
  Linux better-sqlite3 binary); the Windows binary is fetched at install time on
  the target machine.

## What's already in place (verified this session — no work needed)

- `lib/session.ts:11-22` — iron-session is **already LAN/HTTP-ready**:
  `secure: false`, `sameSite: "lax"`, and `password` overridable via
  `SESSION_SECRET` env. LAN logins over plain HTTP will work.
- `db/index.ts:9` — DB path is `process.env.DB_PATH ?? <cwd>/data/clinic.db`,
  so we can point it at `C:\ClinicData\clinic.db` purely via env.
- `db/index.ts:28` — migrations run automatically on startup from
  `<cwd>/drizzle`. A fresh DB is created + migrated on first launch.
- HN (`69-0001`) and receipt (`R69-00001`) numbers are year-scoped counters
  (`lib/counters.ts`). No change needed.
- `next.config.ts` already has `devIndicators: false`.

---

## Step 1 — Enable the standalone build (code change)

Edit `next.config.ts` (this exact change was drafted then reverted at the user's
request; re-apply it next session):

```ts
const nextConfig: NextConfig = {
  devIndicators: false,
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingIncludes: {
    "/": ["./drizzle/**/*"], // drizzle reads migration SQL at runtime
  },
};
```

Then `next build` emits `.next/standalone/` containing `server.js` + a minimal
`node_modules`.

**Critical post-build copies** (Next standalone does NOT include these itself):
- `.next/static`  → `.next/standalone/.next/static`
- `public`        → `.next/standalone/public`
- Verify `drizzle/` landed in `.next/standalone/drizzle` (the tracing include
  above should do it; if not, copy it manually in the packaging script).
- Verify the better-sqlite3 native `.node` binary is under
  `.next/standalone/node_modules/better-sqlite3/...`. If missing, copy the whole
  `node_modules/better-sqlite3` folder in.

**Verify locally (Linux, this machine):** from `.next/standalone` run
`DB_PATH=/tmp/test-clinic.db PORT=4010 HOSTNAME=0.0.0.0 node server.js`, hit
`http://localhost:4010/login`, confirm it boots, migrates a fresh DB, and the
seeded admin can log in. Use a throwaway DB_PATH so the real data isn't touched.

---

## Step 2 — Windows deploy kit (new files under `deploy/windows/`)

Create these (content sketched; flesh out next session):

### `run-clinic.vbs` — hidden launcher (the thing the icon points at)
- Sets env: `NODE_ENV=production`, `DB_PATH=C:\ClinicData\clinic.db`,
  `SESSION_SECRET=<generated once at install>`, `PORT=3000`, `HOSTNAME=0.0.0.0`.
- Starts `node server.js` from the app folder **with no console window** (VBS
  `WScript.Shell.Run ..., 0`).
- Waits ~2s, then opens the browser to `http://localhost:3000` — ideally in app
  mode for a clean window, e.g.
  `msedge --app=http://localhost:3000` (or Chrome). Fall back to default browser.
- Guard against double-launch (check if port 3000 already listening → just open
  the browser).

### `install.bat` — one-time setup (run once by chakrit, as admin)
Orchestrates:
1. Create `C:\ClinicData\` and `C:\ClinicData\backups\`.
2. Generate a random `SESSION_SECRET` once, persist it (e.g. write into
   `run-clinic.vbs` or a `.env` the launcher reads).
3. `npm install` (fetches prebuilt better-sqlite3) → `npm run build` → do the
   post-build copies from Step 1.
4. Seed the production DB once:
   `set DB_PATH=C:\ClinicData\clinic.db && npm run seed`
   (creates admin user `eye` / `eyeclinic`, clinic settings, sample meds).
5. Create Desktop + Start-menu shortcuts to `run-clinic.vbs` (icon
   `app/icon.svg`/a `.ico`). Name it e.g. **"โปรแกรมคลินิก"**.
6. Add autostart: drop a shortcut to `run-clinic.vbs` in
   `shell:startup` (so it runs when the PC boots).
7. Add the firewall rule (Step 3) and the backup task (Step 4).

### Notes
- Default login is **eye / eyeclinic** — tell the user to change it immediately
  in ตั้งค่า → เปลี่ยนรหัสผ่าน, and to set the real clinic name/address/phone
  (those print on receipts).

---

## Step 3 — LAN access + firewall

- Open inbound TCP 3000 (run in `install.bat`, admin):
  ```
  netsh advfirewall firewall add rule name="Eye EMR" dir=in action=allow ^
    protocol=TCP localport=3000
  ```
- Give the server PC a **stable LAN IP** so the URL doesn't change: either set a
  static IP in Windows, or reserve its IP by MAC on the router (DHCP
  reservation). Document the chosen IP.
- Other PCs: browser → `http://<server-ip>:3000`. Optionally make desktop
  shortcuts on those PCs too. Consider documenting the IP on a sticky note for
  the clinic.
- Security note: this is plain HTTP on a trusted LAN, protected by login. That's
  acceptable for a single clinic; do NOT expose port 3000 to the internet.

---

## Step 4 — Daily backup (scheduled task, 23:00)

### `deploy/windows/backup-clinic.ps1` (or .bat)
- Copy `C:\ClinicData\clinic.db` → `C:\ClinicData\backups\clinic-YYYY-MM-DD_HHmm.db`.
- SQLite is in **WAL mode** — for a consistent copy either use the sqlite
  `.backup` command, or (simpler) copy `clinic.db`, `clinic.db-wal`,
  `clinic.db-shm` together. Prefer `VACUUM INTO` / online backup if easy;
  otherwise copy the trio.
- Retention: delete backups older than ~30 days.

### Register the task (in `install.bat`, admin)
```
schtasks /create /tn "Eye EMR Backup" /tr "powershell -File C:\path\backup-clinic.ps1" ^
  /sc daily /st 23:00 /rl highest /f
```
- (User also liked the idea of copying to a USB/second drive — optional later;
  for now local `backups\` only, per their selection.)

---

## Step 5 — `deploy/windows/README.md` (for chakrit)

A short step-by-step for the **one-time** Windows setup:
1. Install Node LTS (GUI installer from nodejs.org).
2. Copy the project folder to e.g. `C:\eye-emr`.
3. Right-click `install.bat` → Run as administrator. Wait for "done".
4. Double-click the new desktop icon to confirm it launches.
5. Find the PC's IP (`ipconfig`), test from another PC's browser.
6. Log in (eye / eyeclinic), change the password, set clinic info.
7. Note the update procedure: to ship a fix, replace the `C:\eye-emr` app
   files and re-run build (a `update.bat` could automate: `git pull` or copy new
   files → `npm install` → `npm run build` → post-build copies). **Never touch
   `C:\ClinicData`** — that's the patient data.

---

## Open questions to confirm next session
- Port: assumed **3000**. Fine? (3000 may clash if something else uses it; the
  dev server already auto-bumped to 3002 on this box because *something* holds
  3000.)
- App-mode browser (Edge/Chrome `--app`) vs default browser tab? Need to know
  which browser will be installed on the clinic PC.
- Autostart on boot: assumed **yes** (Startup folder). Confirm.
- Does chakrit want a true `setup.exe` (Inno Setup) wrapping `install.bat`, or is
  a "run install.bat as admin" good enough? (Inno Setup gives the polished
  installer feel but adds a build step that itself needs Windows.)

## Files this will add/change
- `next.config.ts` (Step 1)
- `deploy/windows/run-clinic.vbs`
- `deploy/windows/install.bat`
- `deploy/windows/backup-clinic.ps1`
- `deploy/windows/update.bat` (optional)
- `deploy/windows/README.md`
- `deploy/DEPLOYMENT-PLAN.md` (this file)
