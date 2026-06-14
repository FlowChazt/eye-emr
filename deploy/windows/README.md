# Eye EMR — Windows setup (one-time, for chakrit)

This folder packages the clinic EMR so the clinic PC runs it as a little web
server, and your girlfriend just double-clicks an icon. Other PCs on the same
network open it in a browser — no install on those.

> ⚠️ Run everything below **on the Windows PC itself.** Don't build from WSL —
> `better-sqlite3` is a native module and needs the Windows binary, which
> `npm install` downloads automatically on Windows (no compiler needed).

## One-time setup

1. **Install Node LTS** — download the Windows installer from
   <https://nodejs.org> and run it (defaults are fine). Reboot if it asks.
2. **Copy the project** to `C:\eye-emr` (the whole repo folder).
3. **Run the installer as admin** — open `C:\eye-emr\deploy\windows\`,
   right-click **`install.bat`** → **Run as administrator**. It will:
   - create `C:\ClinicData\` (the database lives here) and `backups\`
   - generate a one-time `SESSION_SECRET` into `config.bat`
   - `npm install` → `npm run build` → copy static assets into the bundle
   - seed a fresh database (admin login **eye / eyeclinic**)
   - make a **desktop icon** + Start-menu entry + **autostart on boot**
   - open the firewall on **port 3000** for LAN access
   - register a **daily backup at 23:00**
   Wait for it to print `DONE`.
4. **Test locally** — double-click the new desktop icon **"โปรแกรมคลินิก"**.
   A browser window should open at `http://localhost:3000`.
5. **Log in** as `eye` / `eyeclinic`, then **immediately**:
   - change the password in **ตั้งค่า → เปลี่ยนรหัสผ่าน**
   - set the real **clinic name / address / phone** (these print on receipts)
6. **Test from another PC** — on the server PC run `ipconfig`, note the IPv4
   address (e.g. `192.168.1.50`), then on another PC's browser go to
   `http://192.168.1.50:3000`. Make a desktop shortcut / bookmark there.

## Keep the URL stable

Give the server PC a fixed LAN IP so the address never changes — either set a
static IP in Windows network settings, or add a DHCP reservation by MAC on the
router. Write the IP on a sticky note for the clinic.

## Backups

- Automatic: every night at **23:00** → `C:\ClinicData\backups\clinic-<date>.db`,
  keeping the last **30 days** (Task Scheduler task "Eye EMR Backup").
- To back up right now: right-click `backup-clinic.ps1` → Run with PowerShell,
  or run the scheduled task manually from Task Scheduler.
- Worth doing occasionally: copy the `backups\` folder to a USB stick / cloud.

## Shipping a code update later

1. Replace the files in `C:\eye-emr` with the new version (`git pull`, or copy
   the new project over the old — **never delete `C:\ClinicData`**).
2. Right-click **`update.bat`** → Run as administrator. It rebuilds without
   touching the database or your `SESSION_SECRET`. New DB migrations run
   automatically the next time the app starts.

## Files in this folder

| File | What it does |
|------|--------------|
| `install.bat` | One-time setup (run as admin). |
| `run-clinic.vbs` | The launcher the icon points at — starts the server hidden, opens the browser. |
| `stop-clinic.vbs` | Double-click to stop the server (asks to confirm first). |
| `backup-clinic.ps1` | Daily DB backup with 30-day retention. |
| `update.bat` | Rebuild after a code update (run as admin). |
| `config.bat` | **Auto-generated** by install.bat — holds `DB_PATH`, `PORT`, `SESSION_SECRET`. Don't edit by hand; don't commit. |

## Troubleshooting

- **Port 3000 already in use** — change `PORT` in `config.bat` (and re-run the
  firewall line, or just edit the existing "Eye EMR" rule) then relaunch.
- **Nothing opens** — make sure Node is installed (`node -v` in a terminal) and
  that `install.bat` finished with `DONE`. Check `C:\ClinicData\clinic.db` exists.
- **Forgot the admin password** — re-seeding would only run on an empty DB, so
  instead reset it from the app while logged in, or ask the developer.
