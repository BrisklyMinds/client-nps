# Production Deployment

## Server requirements
- Ubuntu 22.04+ or Debian 12+
- 2 vCPU, 4 GB RAM, 40 GB SSD
- Docker 24+ with Compose plugin
- Domain pointed to server IP (A record)

## 1. Install Docker
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

## 2. Clone the repository
```bash
git clone git@github.com:BrisklyMinds/client-nps.git
cd client-nps
```

## 3. Configure environment variables

```bash
cp .env.backend.prod.template .env.backend
cp .env.frontend.prod.template .env.frontend
nano .env.backend
nano .env.frontend
```

**Generate secrets:**
```bash
# SECRET_KEY for Django
python3 -c "import secrets; print(secrets.token_urlsafe(50))"

# NEXTAUTH_SECRET
openssl rand -base64 32
```

**Required values:**
- `.env.backend`: `SECRET_KEY`, `DATABASE_PASSWORD`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- `.env.frontend`: `NEXTAUTH_SECRET`

## 4. Configure host nginx (SSL termination)

The Docker stack runs an internal nginx on `127.0.0.1:8080` (HTTP only).
The host nginx handles SSL termination via certbot and proxies to it.

Install certbot and obtain certificate:
```bash
sudo apt install nginx certbot python3-certbot-nginx
sudo certbot --nginx -d feedback.trade.kg
```

Add to `/etc/nginx/sites-available/feedback.trade.kg`:
```nginx
server {
    listen 443 ssl http2;
    server_name feedback.trade.kg;

    ssl_certificate /etc/letsencrypt/live/feedback.trade.kg/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/feedback.trade.kg/privkey.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffering off;
    }
}

server {
    listen 80;
    server_name feedback.trade.kg;
    return 301 https://$host$request_uri;
}
```

Enable and reload:
```bash
sudo ln -s /etc/nginx/sites-available/feedback.trade.kg /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Certbot auto-renewal is already set up by `certbot --nginx`.

## 5. Start production stack

```bash
docker compose -f docker-compose.prod.yaml up -d --build
```

Watch logs:
```bash
docker compose -f docker-compose.prod.yaml logs -f
```

## 6. Create Django superuser

```bash
docker compose -f docker-compose.prod.yaml exec api uv run -- python manage.py createsuperuser
```

## 7. Verify

- https://feedback.trade.kg/feedback — public form
- https://feedback.trade.kg/admin/ — Django admin
- https://feedback.trade.kg/status — public status page
- https://feedback.trade.kg/api/schema/swagger-ui/ — API docs

## Backups

**PostgreSQL daily backup** (cron):
```bash
0 2 * * * docker compose -f /path/to/client-nps/docker-compose.prod.yaml exec -T db pg_dump -U postgres db | gzip > /backups/db-$(date +\%Y\%m\%d).sql.gz
```

**Media files**:
```bash
0 3 * * * tar -czf /backups/media-$(date +\%Y\%m\%d).tar.gz -C /path/to/client-nps backend/media
```

## Updating

```bash
cd /path/to/client-nps
git pull
docker compose -f docker-compose.prod.yaml up -d --build
docker compose -f docker-compose.prod.yaml exec api uv run -- python manage.py migrate
docker compose -f docker-compose.prod.yaml exec api uv run -- python manage.py collectstatic --noinput
```

## Troubleshooting

**`Origin checking failed`** — make sure `CSRF_TRUSTED_ORIGINS` in `.env.backend` includes your full domain with `https://` prefix.

**Server Actions error** — make sure nginx passes `X-Forwarded-Host` and `X-Forwarded-Proto https` headers (already configured in `nginx.prod.conf`).

**502 Bad Gateway** — check if api/web containers are running: `docker compose -f docker-compose.prod.yaml ps`. Check logs: `docker compose -f docker-compose.prod.yaml logs api` or `web`.

**Bot not sending notifications** — check `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `.env.backend`. Check bot logs: `docker compose -f docker-compose.prod.yaml logs bot`.
