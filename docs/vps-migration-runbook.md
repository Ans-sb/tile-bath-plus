# JAJAEGO VPS migration runbook

## 1. Migration scope

The first VPS move is a lift-and-shift of the application server.

- VPS: Node.js application, static files, uploads, generated proposals, and local JSON fallback data
- Supabase `jajaego`: authentication, member data, order data, business documents, and remote product data
- Railway: kept online during validation and DNS rollback window
- Vendor credentials and stock refresh: not installed or scheduled on the public VPS

This avoids moving the database and application at the same time. Supabase can be migrated separately after the VPS app is stable.

## 2. Recommended starting server

- Ubuntu 24.04 LTS
- 4 vCPU minimum, 8 vCPU recommended
- 8 GB RAM minimum, 16 GB recommended for concurrent image search/rendering
- 100 GB NVMe minimum, 200 GB recommended
- Daily provider snapshot plus the application backup in this repository
- Fixed public IP

Image rendering is the heaviest workload. If traffic grows, split rendering into a separate worker before increasing the web server indefinitely.

## 3. Persistent data

The container is disposable. These host directories are not:

- `/var/lib/jajaego/data`
- `/var/lib/jajaego/uploads`
- `/var/lib/jajaego/outputs/proposals`
- `/var/lib/jajaego/outputs/render-feedback-assets`
- `/var/backups/jajaego`

Back up and transfer the current local versions of `data/`, `uploads/`, `outputs/proposals/`, and `outputs/render-feedback-assets/` before the first start. The bind mounts intentionally hide the copies embedded in the Docker image.

Do not copy DB audits, stock reports, Excel exports, or image-analysis work files from the rest of `outputs/`. They are local operating artifacts and add several gigabytes without being required by the production app.

Generate a checksum manifest before transfer:

```bash
npm run vps:manifest
```

Run the same command on the VPS after transfer. Compare the product count and SHA-256 values before continuing.

## 4. Host preparation

```bash
sudo bash deploy/vps/install-host.sh
sudo usermod -aG docker "$USER"
```

Log out and back in after adding the Docker group. Review `ufw status`, then enable the firewall:

```bash
sudo ufw enable
```

Use SSH keys, disable password login, and disable direct root SSH login before public launch.

## 5. Application and secrets

Clone the repository to `/opt/jajaego/app`. Transfer persistent content separately:

```bash
sudo rsync -a ./data/ /var/lib/jajaego/data/
sudo rsync -a ./uploads/ /var/lib/jajaego/uploads/
sudo mkdir -p /var/lib/jajaego/outputs/proposals
sudo mkdir -p /var/lib/jajaego/outputs/render-feedback-assets
sudo rsync -a ./outputs/proposals/ /var/lib/jajaego/outputs/proposals/
sudo rsync -a ./outputs/render-feedback-assets/ /var/lib/jajaego/outputs/render-feedback-assets/
sudo chown -R 1000:1000 /var/lib/jajaego
```

Create the production environment file:

```bash
cd /opt/jajaego/app
cp .env.vps.example .env.vps
chmod 600 .env.vps
```

Replace every placeholder. Set `PUBLIC_SITE_URL` and `APP_PUBLIC_URL` to the final HTTPS domain. Use only the `jajaego` Supabase project. Never put the service role key in browser code or a customer API response.

Do not copy supplier site IDs and passwords to the public VPS. Stock refresh remains an owner-requested manual operation.

Run the preflight:

```bash
npm install --omit=dev
npm run vps:preflight -- --env-file .env.vps
```

## 6. First container start

```bash
docker compose --env-file .env.vps -f docker-compose.vps.yml build
docker compose --env-file .env.vps -f docker-compose.vps.yml up -d
curl --fail http://127.0.0.1:4173/api/health
```

The app is bound to `127.0.0.1` and is not directly exposed to the internet.

## 7. Nginx and HTTPS

Copy the template and replace the domain:

```bash
sudo cp deploy/vps/nginx-jajaego.conf /etc/nginx/sites-available/jajaego
sudo sed -i 's/jajaego\.example\.com/your-domain.example/g' /etc/nginx/sites-available/jajaego
sudo ln -s /etc/nginx/sites-available/jajaego /etc/nginx/sites-enabled/jajaego
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d your-domain.example --redirect
```

Confirm automatic renewal:

```bash
sudo certbot renew --dry-run
```

## 8. Production validation before DNS switch

Test the VPS by using a temporary hosts-file mapping or a staging subdomain.

1. `GET /api/health` returns `ok: true`.
2. Main, TileGO, BathGO, cart, member page, and admin page load.
3. Google and Kakao login return to the HTTPS production domain.
4. Business document upload and member approval work.
5. Cart, order creation, order status changes, and proposal download work.
6. Image search and photorealistic rendering complete through Nginx.
7. Site Studio image upload survives a container restart.
8. Customer APIs/cards do not expose internal brand, supplier, cost, margin, or quality fields.
9. Admin product search shows the internal brand filter.
10. No vendor stock refresh runs automatically.

## 9. DNS cutover and rollback

Lower the domain TTL to 300 seconds at least one day before the switch. Take a final backup, start the VPS, run the validation list, then point the A record to the VPS IP.

Keep Railway active for at least 48 hours. If a blocking issue appears, point DNS back to Railway and investigate without changing Supabase data. Do not run both servers with conflicting local-file writes longer than necessary.

## 10. Routine deployment

On a clean VPS worktree:

```bash
sudo -E bash deploy/vps/deploy.sh
```

The script stops on uncommitted VPS edits, performs a persistent-data backup, rebuilds the container, starts it, and verifies the health endpoint.

## 11. Backup and restore

Create a backup:

```bash
sudo bash deploy/vps/backup.sh
```

The default retention period is 14 days. Copy backups to a second storage provider; a backup on the same VPS is not sufficient.

Enable the included daily file-backup timer after confirming a manual backup:

```bash
sudo cp deploy/vps/jajaego-backup.service /etc/systemd/system/
sudo cp deploy/vps/jajaego-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now jajaego-backup.timer
systemctl list-timers jajaego-backup.timer
```

Restore requires an explicit confirmation flag:

```bash
sudo bash deploy/vps/restore.sh /var/backups/jajaego/jajaego-persistent-YYYYMMDDTHHMMSSZ.tar.gz --confirm
```

Supabase backups are managed separately through the Supabase project. Test both application-file restore and Supabase restore procedures before launch.

## 12. Migration readiness boundary

This package prepares the repository for the move. The actual cutover still requires:

- VPS provider, IP, SSH key, and Ubuntu installation
- Production domain
- final `.env.vps` secrets
- transfer of current persistent files
- OAuth redirect URL updates
- DNS change after smoke tests
