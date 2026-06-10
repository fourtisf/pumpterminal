#!/usr/bin/env bash
#
# One-shot deploy for pumpterminal on an Ubuntu/Debian VPS (run as root).
#
#   bash deploy/deploy.sh          # full deploy: remove smartape, install, build, nginx, SSL
#   bash deploy/deploy.sh ssl      # only (re)issue the Let's Encrypt certificate
#   bash deploy/deploy.sh update   # git pull + reinstall deps + rebuild + pm2 restart
#
# Overridable via env vars:
#   DOMAIN=pumpterminal.click
#   CERTBOT_EMAIL=alfapangestu07@gmail.com

set -euo pipefail

DOMAIN="${DOMAIN:-pumpterminal.click}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-alfapangestu07@gmail.com}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$REPO_DIR/pumpradar-nextjs"
WORKER_DIR="$REPO_DIR/worker"
NGINX_SITE="/etc/nginx/sites-available/pumpterminal.conf"

log()  { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\n\033[1;33m!!  %s\033[0m\n' "$*"; }

[ "$(id -u)" -eq 0 ] || { echo "Run as root: sudo bash deploy/deploy.sh"; exit 1; }

export DEBIAN_FRONTEND=noninteractive

apt_install() { apt-get install -y -q "$@"; }

install_prereqs() {
  log "Installing prerequisites (node, pm2, nginx, certbot)"
  apt-get update -y -q

  command -v curl >/dev/null 2>&1 || apt_install curl
  command -v git  >/dev/null 2>&1 || apt_install git

  local need_node=1
  if command -v node >/dev/null 2>&1; then
    local major
    major="$(node -p 'process.versions.node.split(".")[0]')"
    [ "$major" -ge 18 ] && need_node=0
  fi
  if [ "$need_node" -eq 1 ]; then
    log "Installing Node.js 20 (NodeSource)"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt_install nodejs
  fi

  command -v pm2     >/dev/null 2>&1 || npm install -g pm2
  command -v nginx   >/dev/null 2>&1 || apt_install nginx
  command -v certbot >/dev/null 2>&1 || apt_install certbot python3-certbot-nginx
}

remove_smartape() {
  log "Removing old 'smartape' app (pm2 entry + files)"

  local sm_dir=""
  if command -v pm2 >/dev/null 2>&1; then
    # Recover the app directory from pm2's metadata before deleting the entry.
    sm_dir="$(pm2 jlist 2>/dev/null | node -e '
      let d = "";
      process.stdin.on("data", c => d += c).on("end", () => {
        // pm2 may print banner lines (e.g. "[PM2] ...") before the JSON,
        // so try to parse from every "[" until one parses as the app list.
        let list = null;
        for (let i = d.indexOf("["); i !== -1; i = d.indexOf("[", i + 1)) {
          try { const v = JSON.parse(d.slice(i)); if (Array.isArray(v)) { list = v; break; } } catch (e) {}
        }
        if (!list) return;
        const p = list.find(x => /smart[ _-]?ape/i.test(x.name || ""));
        if (p && p.pm2_env && p.pm2_env.pm_cwd) console.log(p.pm2_env.pm_cwd);
      });
    ' 2>/dev/null || true)"
    pm2 delete smartape >/dev/null 2>&1 || true
    pm2 save --force    >/dev/null 2>&1 || true
    rm -f /root/.pm2/logs/smartape*.log 2>/dev/null || true
  fi

  local candidates=()
  [ -n "$sm_dir" ] && candidates+=("$sm_dir")
  while IFS= read -r d; do candidates+=("$d"); done < <(
    find /root /home /var/www /opt -maxdepth 2 -iname '*smart*ape*' 2>/dev/null || true
  )

  local d real
  for d in "${candidates[@]:-}"; do
    [ -n "$d" ] && [ -e "$d" ] || continue
    real="$(realpath "$d")"
    # Never touch system roots or a user's whole home directory.
    case "$real" in
      /|/root|/home|/var|/var/www|/opt|/usr|/etc) warn "Skipping unsafe path: $real"; continue ;;
    esac
    if [[ "$real" =~ ^/home/[^/]+$ ]]; then
      warn "Skipping unsafe path: $real"
      continue
    fi
    case "$REPO_DIR" in
      "$real"|"$real"/*) warn "Skipping $real (contains this repo)"; continue ;;
    esac
    log "Deleting $real"
    rm -rf -- "$real"
  done

  local f
  for f in /etc/nginx/sites-enabled/*; do
    [ -e "$f" ] || continue
    if grep -qi 'smart[ _-]*ape' "$f" 2>/dev/null; then
      warn "Disabling old nginx site: $f"
      rm -f -- "$f"
    fi
  done
}

setup_worker() {
  log "Installing worker dependencies"
  cd "$WORKER_DIR"
  npm ci --omit=dev --no-audit --no-fund 2>/dev/null \
    || npm install --omit=dev --no-audit --no-fund
  [ -f .env ] || cp .env.example .env
}

setup_web() {
  log "Building Next.js app (this can take a few minutes)"
  cd "$WEB_DIR"

  # The browser connects to wss://<domain>/ws; nginx forwards it to the worker.
  # NEXT_PUBLIC_* is inlined at build time, so set it before `next build`.
  local ws_line="NEXT_PUBLIC_WS_URL=wss://${DOMAIN}/ws"
  if [ -f .env.local ] && grep -q '^NEXT_PUBLIC_WS_URL=' .env.local; then
    sed -i "s|^NEXT_PUBLIC_WS_URL=.*|${ws_line}|" .env.local
  else
    echo "$ws_line" >> .env.local
  fi

  npm install --no-audit --no-fund
  npm run build
}

start_pm2() {
  log "Starting apps with pm2"
  cd "$REPO_DIR"
  pm2 startOrRestart ecosystem.config.js
  pm2 save
  pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
}

setup_nginx() {
  log "Configuring nginx for $DOMAIN"
  sed "s/__DOMAIN__/${DOMAIN}/g" "$REPO_DIR/deploy/nginx-pumpterminal.conf" > "$NGINX_SITE"
  ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/pumpterminal.conf
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl enable --now nginx
  systemctl reload nginx

  if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q 'Status: active'; then
    ufw allow 80/tcp  >/dev/null 2>&1 || true
    ufw allow 443/tcp >/dev/null 2>&1 || true
  fi
}

server_ip() {
  curl -4fsS --max-time 8 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}'
}

setup_ssl() {
  log "Setting up HTTPS (Let's Encrypt) for $DOMAIN"
  local ip names=() n dip
  ip="$(server_ip)"
  for n in "$DOMAIN" "www.$DOMAIN"; do
    dip="$(getent ahostsv4 "$n" 2>/dev/null | awk 'NR==1 {print $1}')"
    if [ "${dip:-}" = "$ip" ]; then
      names+=(-d "$n")
    else
      warn "DNS $n -> ${dip:-<none>} (expected $ip) — skipping this name"
    fi
  done
  if [ "${#names[@]}" -eq 0 ]; then
    warn "DNS for $DOMAIN does not point to this server ($ip) yet."
    warn "Add DNS A records at your registrar:   @ -> $ip    and    www -> $ip"
    warn "Once DNS has propagated, run:  bash deploy/deploy.sh ssl"
    return 0
  fi
  certbot --nginx "${names[@]}" --non-interactive --agree-tos -m "$CERTBOT_EMAIL" --redirect
  systemctl reload nginx
}

update_app() {
  log "Updating from git"
  cd "$REPO_DIR"
  git pull --ff-only
  setup_worker
  setup_web
  cd "$REPO_DIR"
  pm2 startOrRestart ecosystem.config.js
  pm2 save
}

summary() {
  local ip
  ip="$(server_ip)"
  log "Done!"
  echo
  echo "  Site    : https://${DOMAIN}   (or http://${ip} before DNS/SSL is active)"
  echo "  Web     : pm2 app 'pumpterminal-web'    (127.0.0.1:3000)"
  echo "  Worker  : pm2 app 'pumpterminal-worker' (port 4000, WS served at /ws)"
  echo
  echo "  Status  : pm2 status      Logs: pm2 logs"
  echo "  Health  : curl -s http://localhost:4000/health"
  echo
  pm2 status || true
}

case "${1:-deploy}" in
  ssl)    setup_ssl ;;
  update) update_app ;;
  deploy)
    install_prereqs
    remove_smartape
    setup_worker
    setup_web
    start_pm2
    setup_nginx
    setup_ssl
    summary
    ;;
  *) echo "Usage: bash deploy/deploy.sh [ssl|update]"; exit 1 ;;
esac
