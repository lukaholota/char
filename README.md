site: https://char.holota.family/

## Getting Started

npm ci
npx prisma generate

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

## PDF / Print (Chromium) configuration

PDF generation uses `puppeteer-core` and runs **inside the Next.js server process**. That means these settings must be present in the **runtime environment** of the server (e.g. the systemd service that runs `next start` / standalone server), not only during `next build`.

Recommended env vars (see [.env.example](.env.example)):

- `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`
	- Most stable option on a VPS: install Chromium/Chrome on the OS and point Puppeteer to it.
- `PUPPETEER_USE_SPARTICUZ=1`
	- Uses bundled Chromium from `@sparticuz/chromium` (no OS install), but can increase cold-start.
- `PUPPETEER_DISABLE_DEV_SHM_USAGE=0`
	- If `/dev/shm` is large enough, allowing it is usually faster than disk (especially on HDD).
- `PDF_SET_CONTENT_TIMEOUT_MS=60000`, `PDF_RENDER_TIMEOUT_MS=60000`
	- Increase timeouts when debugging slow renders.

### Where to put these in production

This repo deploys to VPS via GitHub Actions and restarts a systemd service (`char`) in [.github/workflows/deploy.yml](.github/workflows/deploy.yml). Add the env vars to that service:

- systemd drop-in (recommended): `sudo systemctl edit char` and add:

```ini
[Service]
Environment=PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
Environment=PUPPETEER_DISABLE_DEV_SHM_USAGE=0
Environment=PDF_SET_CONTENT_TIMEOUT_MS=60000
Environment=PDF_RENDER_TIMEOUT_MS=60000
```

Then run:

```bash
sudo systemctl daemon-reload
sudo systemctl restart char
```

Verify which environment variables systemd actually passes to the process:

```bash
sudo systemctl cat char
systemctl show char -p Environment
```

Note on precedence: `EnvironmentFile=` and `Environment=` are applied in order. If your unit has `EnvironmentFile=/home/luka/char/.env` and `.env.local` AFTER your `Environment=...` lines, the files can override values. Either:

- Put the `EnvironmentFile=` lines first, then the explicit `Environment=...` lines after, OR
- Keep only `EnvironmentFile=` in the unit and move all `PUPPETEER_*` / `PDF_*` variables into the env file.

If you prefer not to install a browser on the OS, omit `PUPPETEER_EXECUTABLE_PATH` and use:

```ini
Environment=PUPPETEER_USE_SPARTICUZ=1
```
