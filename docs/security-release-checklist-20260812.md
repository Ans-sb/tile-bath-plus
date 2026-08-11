# Security release checklist (2026-08-12)

## Required before deployment

1. Create a random `MEMBER_TOKEN_SECRET` with at least 32 characters and save it only in Railway production variables.
2. Deploy this security patch only after `MEMBER_TOKEN_SECRET` is present. The production server intentionally refuses to start without it.
3. Verify that these public paths return `404`: `/server.js`, `/package.json`, `/src/server/routes/media-routes.js`, `/mobile/README.md`, and `/backups/`.
4. Verify unauthenticated requests to `/api/render`, `/api/tile-match`, `/api/image-data-url`, `/api/render-feedback`, and `/api/business-status` return `403` or `429`.
5. Verify `/api/server-control` returns `405` and cannot create `tmp/server-control/stop.flag`.
6. Verify production responses include CSP, HSTS, `X-Frame-Options`, and `Referrer-Policy` headers.

Generate a suitable member token secret locally without storing it in shell history:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Credential rotation

The local `.env` is ignored by Git but currently lives inside a OneDrive-synchronized workspace. Move the active secret file to a non-synchronized location or stop syncing it, then rotate credentials that may already have been copied to cloud storage:

1. Supabase service-role or secret key.
2. OpenAI and other paid API keys.
3. Railway/GitHub/Slack/Hermes tokens.
4. Google, Kakao, and Naver OAuth client secrets.
5. Vendor website passwords, especially short four-character passwords.
6. Admin password.

Do not paste replacement values into source files, documentation, chat, or Git. Store production values in Railway variables and local-only values in a non-synchronized secret file.

## Verification commands

```powershell
npm.cmd test
npm.cmd run check
npm.cmd run audit:security
npm.cmd run audit:architecture
git diff --check
```

Architecture size warnings for `app.js`, `server.js`, and `styles.css` are tracked separately and must not be mixed into this security release.
