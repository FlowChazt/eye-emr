# Change log / implementation notes

Running notes on non-obvious features so the next person (or future Claude) has
context. Most recent first.

## 2026-06-20 — Real-time multi-user updates (v1.0.2)

The clinic runs two accounts at once (screener opens the visit + enters vitals,
doctor treats in the exam room). Previously a new visit only appeared on the
other person's screen after a manual browser refresh, because pages fetch at
render time and mutations only `revalidatePath()` the *server* cache.

### How it works
- **In-memory pub/sub** (`lib/realtime.ts`): a `globalThis`-pinned `Set` of SSE
  subscribers (same hot-reload-safe pattern as `db/index.ts`). Single Node
  process + one SQLite connection means no broker/WebSocket server is needed.
- **SSE endpoint** `app/api/events/route.ts` (`runtime = "nodejs"`,
  `dynamic = "force-dynamic"`): auth-gated via `getSession()`, streams a
  `ReadableStream`, 25s heartbeat comment, unsubscribes on `cancel()` +
  `request.signal` abort. The `?path=` query tells the server which page the
  client is on (drives presence).
- **Client provider** `components/realtime-provider.tsx` (mounted in
  `app/(app)/layout.tsx`): opens one `EventSource`, **reconnects on pathname
  change** so presence follows the user. `changed`/`new-visit` events →
  debounced `router.refresh()` (300ms), which re-runs the existing server
  components — so the queue *and* visit pages (incl. vitals appearing live) update
  with no query changes.
- Mutations broadcast next to their existing `revalidatePath()` calls:
  `notifyNewVisit()` in `patients/actions.ts` `openVisitForPatient`,
  `notifyChanged()` across `visits/actions.ts` + `appointments/actions.ts`.

### Extra features
- **New-patient toast + sound** on check-in (skipped for the user who opened it).
  Both are **per-user toggles** in Settings — new `notify_new_visit` /
  `notify_sound` boolean columns on `users` (migration `0007`), mirroring the
  existing `autoPrintOnClose` pref pattern via `setNotifyPrefs()`. Live refresh
  always stays on; only the popup/sound are toggleable.
- **"In use" indicator** (`components/visit-viewers.tsx`): shows
  `👁 กำลังดูโดย <name>` when another user has the same visit open, derived purely
  from live SSE connections — auto-releases the instant a tab closes. Awareness
  cue, not a hard lock.

## 2026-06-19 — Official logo + one-file Windows installer

### Logo integration
- Official logo art added under `logo/` (kept tracked via `.gitignore`
  negations, since `*.png` is globally ignored). Cropped to content bounds and
  flat-tinted to theme teal-900 (`#06322c`) with `sharp`, producing
  `public/clinic-logo-named.png` (with clinic name, login screen) and
  `public/clinic-logo.png` (emblem-only mark, everywhere else).
- New `components/clinic-logo-img.tsx` (`ClinicLogoImg`, `variant="mark"|"named"`,
  `size` = height, width from intrinsic ratio) renders the raster logo. Wired into
  login, the app header, and `PrintDoc` letterhead + watermark (receipt +
  appointment). The medication **label keeps the old SVG `ClinicLogo` mark**
  (too small for the detailed logo) — `clinic-logo.tsx` stays for that one use.
- Browser favicon refreshed: `app/icon.png` (256) + regenerated `app/favicon.ico`
  from the mark on white; stale `app/icon.svg` removed.

### One-file Windows installer/updater
- Replaced `install.bat` + `update.bat` with a single self-elevating
  **`deploy/windows/eye-clinic-setup.bat`**. Copy it to the PC, double-click:
  first run installs, re-run updates. Pulls **GitHub Releases** (repo is public),
  bundles **portable Node** (`C:\EyeClinic\node`), app at `C:\EyeClinic\app`
  (re-extracted each update). All per-machine state moved to `C:\ClinicData`
  (`config.bat`/`SESSION_SECRET`, `clinic.db`, `installed-version.txt`) so updates
  can replace code wholesale. First install prompts **port (default 3000)** +
  **autostart**. Program/shortcut renamed **"Eye Clinic"** with
  `deploy/windows/eye-clinic.ico` (from the logo mark). `run-clinic.vbs`,
  `stop-clinic.vbs`, `backup-clinic.ps1` updated for the new paths + portable node.
- **Rollout (manual, by dev):** push, `gh repo edit FlowChazt/eye-emr --visibility
  public`, then `gh release create vX.Y.Z` for each version (first release must
  exist before setup works). Deploy scripts must stay **CRLF**.
- **Verified working on the clinic PC (v1.0.1).** Two fixes during the live run:
  (1) run npm from inside `%APP%` via `pushd`, not `npm --prefix` — the elevated
  console starts in `System32`, where `--prefix` left npm reading
  `System32\package.json` (ENOENT); (2) the setup `.bat` can't self-update, so a
  changed installer requires re-downloading the `.bat` (the raw `master` link).
  App updates flow through releases and need no `.bat` re-download.

## 2026-06-18 — Visit QOL, drug labels, procedures, print overhaul

### Reopen a closed visit (same-day only)
- `reopenVisit(visitId)` in `app/(app)/visits/actions.ts`. Allowed only while
  `visit.visitDate === todayISO()` (yesterday's books stay sealed after midnight).
- Reverses checkout: restores stock from this visit's `dispense` stock movements,
  deletes those movements, deletes the `payments` row, sets status back to
  `in_progress`. Re-closing issues a **new** receipt number (the voided one is
  skipped — counters never decrement). No edit/audit logging by request.
- UI: `reopen-button.tsx` in the completed-payment banner (`page.tsx`,
  gated by `canReopen`).

### Drug labels (สติกเกอร์ฉลากยา)
- Printed as small **62×45 mm** stickers tiled 2-up on A5 (`components/print/labels-doc.tsx`),
  not full-page docs. `break-inside: avoid` keeps a label whole across pages.
- Per-label data: clinic letterhead, patient HN/name, date, drug name,
  **สรรพคุณ** (indication, from the medication), **วิธีใช้** (per-visit editable),
  allergy warning, and `ซองที่ i/n`. Total pill count is intentionally **not** shown.
- New columns:
  - `visit_items.instructions` — per-visit วิธีใช้, editable in the chart
    (`treatment-section.tsx`, `setItemInstructions`). Snapshotted from the med's
    `defaultInstructions` on add.
  - `medications.portion_amount` — one portion = default dispense qty AND how much
    fits one packet. Autofills the qty when picking a med; label count =
    `ceil(qty / portion)` (remainder → +1 label). Set in the stock form.
  - `medications.indication` — the สรรพคุณ text. Set in the stock form.

### Procedures / equipment (หัตถการ / อุปกรณ์)
- Modeled as `medications.kind = "procedure"` (vs `"drug"`) so they reuse the
  search bar, billing, and the `visit_items` FK. Distinct `visit_items.type =
  "procedure"` makes stock + label logic skip them automatically.
- No stock / สรรพคุณ / วิธีใช้ / label; they DO carry a price into the bill.
- `addMedicationItem` skips the stock check and inserts `type "procedure"` when
  `med.kind === "procedure"`.
- `medications.auto_add_on_visit` (clinic-wide toggle in the stock tab): flagged
  procedures (e.g. ค่าตรวจ) are inserted into every new visit **at creation only**
  (`openVisitForPatient`) — reopen never re-runs this, so no duplicates.
- Stock tab has a separate "หัตถการ / อุปกรณ์" section + add form; procedures are
  excluded from the low-stock alert.

### Print flow overhaul (`print-bar.tsx`, `visits/[id]/print/page.tsx`)
- All printing moved to a bottom **PrintBar**. Each doc prints via a hidden
  **iframe** → one click straight to the OS dialog (no preview page). The old
  `visits/[id]/receipt` and `visits/[id]/labels` preview pages were deleted;
  shared render components live in `components/print/` and `lib/clinic.ts`.
  The standalone `appointments/[id]/print` page stays (patient chart links to it).
- Combined route `visits/[id]/print?docs=receipt,appointment,labels` renders any
  subset stacked with page breaks.
- "พิมพ์ทั้งหมด" / auto-print fire **two separate jobs**: regular-paper docs
  (receipt + appointment) then sticker labels — different paper, so each gets its
  own dialog (chained on `onafterprint`).
- Appointment is printable whenever the patient has any pending (`scheduled`)
  appointment — same set the นัดครั้งถัดไป card shows.
- `users.auto_print_on_close` (per-user, DB-backed): when on, `completeVisit`
  redirects to `/visits/[id]?printAll=1` and PrintBar auto-prints everything once,
  then strips the query so a refresh won't reprint.

### Keyboard QOL
- Visit record form: Enter on a single-line input advances to the next field
  (the note `<textarea>` keeps newline behavior).
- Med search + patient pickers (`patient-search.tsx`, `global-search.tsx`,
  `treatment-section.tsx`): ↑/↓ move a highlighted row, Enter selects it. In the
  med picker, Enter selects → focuses qty → Enter adds → focus returns to search.

### Deploy note (Windows)
- All schema changes are Drizzle migrations (`drizzle/0002`–`0006`) that
  auto-apply on startup via `db/index.ts` (`migrate()`), so copying the project
  onto the Windows server and running `update.bat` applies them to the existing
  `C:\ClinicData\clinic.db` without data loss.
- `next.config.ts` `outputFileTracingIncludes` bundles `drizzle/**` into the
  standalone build. `install.bat` / `update.bat` now **always** re-copy `drizzle/`
  into `.next/standalone` (previously guarded by `if not exist`, which could ship
  stale migrations on an update).
- **Migrations never run during `next build`.** `db/index.ts` migrates at
  import time; `next build` collects page data with ~15 worker processes that
  each import it, so concurrent migrations raced on the one SQLite file and
  crashed an *update* (pending migrations) with `duplicate column name`. Fix:
  a `NEXT_PHASE === "phase-production-build"` guard skips migration during build,
  and a custom **idempotent** runner (replacing drizzle's `migrate()`) tolerates
  DDL a prior interrupted run half-applied — so a half-migrated DB self-heals on
  next launch. `scripts/check-migrate.ts` reproduces + verifies this.
