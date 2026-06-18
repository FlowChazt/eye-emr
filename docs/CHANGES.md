# Change log / implementation notes

Running notes on non-obvious features so the next person (or future Claude) has
context. Most recent first.

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
