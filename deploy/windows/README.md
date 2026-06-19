# Eye Clinic — Windows setup

The clinic PC runs Eye Clinic as a small web server; your girlfriend just
double-clicks an icon, and other PCs on the same network open it in a browser
(no install on those). Everything is driven by **one file**:
`eye-clinic-setup.bat`.

## Install (and update) — one file does both

1. Get the setup file onto the clinic PC. Either copy
   `deploy\windows\eye-clinic-setup.bat` from the project, or download it:
   <https://raw.githubusercontent.com/FlowChazt/eye-emr/master/deploy/windows/eye-clinic-setup.bat>
2. **Double-click it.** It asks for Administrator (click *Yes*). If Windows
   SmartScreen warns about the `.bat`, click **More info → Run anyway**.
3. **First run** asks two quick questions (just press Enter for the defaults):
   - **Port** — default **3000**.
   - **Start automatically when the PC turns on?** — default **Yes**.
   Then it does everything by itself:
   - downloads a portable Node into `C:\EyeClinic\node`
   - downloads the latest Eye Clinic release from GitHub into `C:\EyeClinic\app`
   - builds it, creates `C:\ClinicData\` (database + `backups\`), seeds a fresh
     DB (admin login **eye / eyeclinic**)
   - makes a desktop / Start-menu **"Eye Clinic"** icon (+ autostart if chosen)
   - opens the firewall on the chosen port and registers a daily 23:00 backup
4. **Launch** with the new **"Eye Clinic"** desktop icon — a browser opens at
   `http://localhost:<port>`.
5. **Log in** as `eye` / `eyeclinic`, then immediately:
   - change the password in **ตั้งค่า → เปลี่ยนรหัสผ่าน**
   - set the real **clinic name / address / phone** (these print on receipts)
6. **Test from another PC** — on the server PC run `ipconfig`, note the IPv4
   address (e.g. `192.168.1.50`), then browse `http://192.168.1.50:<port>` from
   another PC and bookmark it.

> **Running it again = update.** Re-run `eye-clinic-setup.bat` any time. It
> checks GitHub for a newer release; if there is one it rebuilds in place. If
> you're already current it says so and exits. It **never** touches
> `C:\ClinicData` (patient data) or your saved settings/`SESSION_SECRET`.

## Shipping an update (developer — chakrit)

There are two kinds of change, and they reach the clinic differently:

**1. App changes (the normal case).** The clinic only pulls **published GitHub
Releases**, so a mid-development push to `master` can't reach it. To ship:

```bash
git push                                   # land the change on master
gh release create v1.0.2 -t "v1.0.2" -n "What changed"
```

Next time the clinic runs `eye-clinic-setup.bat` it sees `v1.0.2`, re-downloads,
and rebuilds. The DB and settings are untouched. (The very first release **must
exist** before the setup file works at all.)

**2. Changes to `eye-clinic-setup.bat` itself.** The setup file **cannot update
itself** — the copy on the clinic PC is whatever was last downloaded. After
changing the installer logic, **re-download the `.bat`** to the clinic PC (raw
link above) and run that. App releases do *not* require re-downloading the `.bat`.

> Always end-of-line **CRLF** for the deploy scripts (`.bat`/`.vbs`/`.ps1`). An
> LF-only `.bat` flashes open and closes instantly on Windows. After editing one
> with a Unix tool, normalize: `sed -i 's/\r$//' f && sed -i 's/$/\r/' f`.

## Keep the URL stable

Give the server PC a fixed LAN IP so the address never changes — a static IP in
Windows, or a DHCP reservation by MAC on the router. Write the IP on a sticky
note for the clinic.

## Backups

- Automatic: every night at **23:00** →
  `C:\ClinicData\backups\clinic-<date>.db`, keeping the last **30 days**
  (Task Scheduler task "Eye EMR Backup").
- Back up now: right-click `C:\EyeClinic\app\deploy\windows\backup-clinic.ps1`
  → Run with PowerShell, or run the scheduled task from Task Scheduler.
- Worth doing occasionally: copy the `backups\` folder to a USB stick / cloud.

## Where things live

| Path | What |
|------|------|
| `C:\EyeClinic\app` | the app code + built bundle (replaced on every update) |
| `C:\EyeClinic\node` | bundled portable Node (reused across updates) |
| `C:\ClinicData\clinic.db` | **the patient database** — never deleted |
| `C:\ClinicData\backups\` | nightly backups |
| `C:\ClinicData\config.bat` | auto-generated `PORT` / `SESSION_SECRET` / etc. |
| `C:\ClinicData\installed-version.txt` | which release is installed |

## Files in this folder

| File | What it does |
|------|--------------|
| `eye-clinic-setup.bat` | **The one file.** Installs on first run, updates on re-run. |
| `run-clinic.vbs` | What the icon points at — starts the server hidden, opens the browser. |
| `stop-clinic.vbs` | Double-click to stop the server (confirms first). |
| `backup-clinic.ps1` | Daily DB backup with 30-day retention. |
| `eye-clinic.ico` | The "Eye Clinic" program/shortcut icon (from the logo). |

## Troubleshooting

- **Port already in use** — re-run setup is not enough (it keeps the saved
  port). Edit `PORT` in `C:\ClinicData\config.bat`, update the firewall rule
  (or edit the existing "Eye EMR" rule), then relaunch.
- **Nothing opens** — confirm `C:\ClinicData\clinic.db` exists and that setup
  finished with the summary box. Check `C:\EyeClinic\app\.next\standalone\server.log`.
- **Forgot the admin password** — re-seeding only runs on an empty DB, so reset
  it from the app while logged in, or ask the developer.
- **SmartScreen blocks the .bat** — *More info → Run anyway* (it's unsigned).
- **`npm error … C:\Windows\System32\package.json` (ENOENT)** — your local
  `eye-clinic-setup.bat` is an old version. Re-download it (raw link above) and
  run the fresh copy.
- **Setup window flashed and closed instantly** — the `.bat` lost its CRLF line
  endings (e.g. edited/saved by a tool that strips them). Re-download it.
