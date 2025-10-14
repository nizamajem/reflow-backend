#!/bin/bash
set -euo pipefail

log() { echo "[$(date -Is)] $*"; }
get_metadata() {
  curl -fs -H "Metadata-Flavor: Google" \
    "http://metadata.google.internal/computeMetadata/v1/instance/attributes/$1" \
    || echo ""
}

run_step() {
  local description="$1"
  shift
  log "START: $description"
  if "$@"; then
    log "SUCCESS: $description"
  else
    local status=$?
    log "ERROR: $description (exit $status)"
    exit $status
  fi
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_URL="${REPO_URL:-https://github.com/nizamajem/reflow-backend.git}"
APP_DIR="/opt/reflow-backend"
SRC_DIR="${SRC_DIR:-$SCRIPT_DIR}"
SERVICE_NAME="reflow-backend"
DOMAIN="${DOMAIN:-$(get_metadata DOMAIN)}"
EMAIL="${EMAIL:-$(get_metadata EMAIL)}"

APP_PORT="${APP_PORT:-$(get_metadata APP_PORT)}"
if [ -z "${APP_PORT}" ]; then
  APP_PORT="4000"
fi

DATABASE_HOST="${DATABASE_HOST:-$(get_metadata DATABASE_HOST)}"
if [ -z "${DATABASE_HOST}" ]; then
  DATABASE_HOST="localhost"
fi
DATABASE_PORT="${DATABASE_PORT:-$(get_metadata DATABASE_PORT)}"
if [ -z "${DATABASE_PORT}" ]; then
  DATABASE_PORT="5432"
fi
DATABASE_NAME="${DATABASE_NAME:-$(get_metadata DATABASE_NAME)}"
if [ -z "${DATABASE_NAME}" ]; then
  DATABASE_NAME="partnership_db"
fi
DATABASE_USER="${DATABASE_USER:-$(get_metadata DATABASE_USER)}"
if [ -z "${DATABASE_USER}" ]; then
  DATABASE_USER="partnership_user"
fi
DATABASE_PASSWORD="${DATABASE_PASSWORD:-$(get_metadata DATABASE_PASSWORD)}"
if [ -z "${DATABASE_PASSWORD}" ]; then
  DATABASE_PASSWORD="partner123@"
fi
DATABASE_SSL="${DATABASE_SSL:-$(get_metadata DATABASE_SSL)}"
if [ -z "${DATABASE_SSL}" ]; then
  DATABASE_SSL="false"
fi

JWT_SECRET="${JWT_SECRET:-$(get_metadata JWT_SECRET)}"
if [ -z "${JWT_SECRET}" ]; then
  JWT_SECRET="change-me-to-a-long-random-string"
fi
JWT_EXPIRES_IN="${JWT_EXPIRES_IN:-$(get_metadata JWT_EXPIRES_IN)}"
if [ -z "${JWT_EXPIRES_IN}" ]; then
  JWT_EXPIRES_IN="1d"
fi

NEST_LOG_LEVEL="${NEST_LOG_LEVEL:-$(get_metadata NEST_LOG_LEVEL)}"
if [ -z "${NEST_LOG_LEVEL}" ]; then
  NEST_LOG_LEVEL="log,error,warn"
fi

MIDTRANS_BASE_URL_SANDBOX="${MIDTRANS_BASE_URL_SANDBOX:-$(get_metadata MIDTRANS_BASE_URL_SANDBOX)}"
if [ -z "${MIDTRANS_BASE_URL_SANDBOX}" ]; then
  MIDTRANS_BASE_URL_SANDBOX="https://app.sandbox.midtrans.com"
fi
MIDTRANS_CLIENT_KEY_SANDBOX="${MIDTRANS_CLIENT_KEY_SANDBOX:-$(get_metadata MIDTRANS_CLIENT_KEY_SANDBOX)}"
if [ -z "${MIDTRANS_CLIENT_KEY_SANDBOX}" ]; then
  MIDTRANS_CLIENT_KEY_SANDBOX="SB-Mid-client-eBHHKYUtxsSt2Oil"
fi
MIDTRANS_SERVER_KEY_SANDBOX="${MIDTRANS_SERVER_KEY_SANDBOX:-$(get_metadata MIDTRANS_SERVER_KEY_SANDBOX)}"
if [ -z "${MIDTRANS_SERVER_KEY_SANDBOX}" ]; then
  MIDTRANS_SERVER_KEY_SANDBOX="SB-Mid-server-qEcjYkAZXvXkV5_ohBzKU0F5"
fi

MIDTRANS_BASE_URL_PRODUCTION="${MIDTRANS_BASE_URL_PRODUCTION:-$(get_metadata MIDTRANS_BASE_URL_PRODUCTION)}"
if [ -z "${MIDTRANS_BASE_URL_PRODUCTION}" ]; then
  MIDTRANS_BASE_URL_PRODUCTION="https://app.midtrans.com"
fi
MIDTRANS_CLIENT_KEY_PRODUCTION="${MIDTRANS_CLIENT_KEY_PRODUCTION:-$(get_metadata MIDTRANS_CLIENT_KEY_PRODUCTION)}"
if [ -z "${MIDTRANS_CLIENT_KEY_PRODUCTION}" ]; then
  MIDTRANS_CLIENT_KEY_PRODUCTION="Mid-client-nj5lIkVyYbr3xlQO"
fi
MIDTRANS_SERVER_KEY_PRODUCTION="${MIDTRANS_SERVER_KEY_PRODUCTION:-$(get_metadata MIDTRANS_SERVER_KEY_PRODUCTION)}"
if [ -z "${MIDTRANS_SERVER_KEY_PRODUCTION}" ]; then
  MIDTRANS_SERVER_KEY_PRODUCTION="Mid-server-lvdXxYnzbJy1yPq5GN7lhbiZ"
fi

SERVER_NAME="${DOMAIN:-_}"

ensure_node() {
  if ! command -v node >/dev/null 2>&1 || ! node -v | grep -q "^v20"; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  fi
}

install_pm2() {
  npm install -g pm2
}

sync_local_repo() {
  mkdir -p "$APP_DIR"
  rsync -a --delete \
    --exclude ".git" \
    --exclude "node_modules" \
    --exclude "dist" \
    "$SRC_DIR/" "$APP_DIR/"
}

clone_repo() {
  rm -rf "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
}

refresh_repo() {
  git -C "$APP_DIR" fetch --all --prune
  git -C "$APP_DIR" reset --hard origin/main
}

install_dependencies_build() {
  cd "$APP_DIR"
  npm install
  npm run build
}

create_placeholder_env() {
  cat <<EOF > "$APP_DIR/.env"
# Server
PORT=${APP_PORT}

# JWT
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=${JWT_EXPIRES_IN}

# Database (PostgreSQL example)
# ==== Database Config ====
DATABASE_HOST=${DATABASE_HOST}
DATABASE_PORT=${DATABASE_PORT}
DATABASE_NAME=${DATABASE_NAME}
DATABASE_USER=${DATABASE_USER}
DATABASE_PASSWORD=${DATABASE_PASSWORD}
DATABASE_SSL=${DATABASE_SSL}

# Optional: enable Nest logger levels (comma-separated: log,error,warn,debug,verbose)
NEST_LOG_LEVEL=${NEST_LOG_LEVEL}

# Midtrans configuration
MIDTRANS_BASE_URL_SANDBOX=${MIDTRANS_BASE_URL_SANDBOX}
MIDTRANS_CLIENT_KEY_SANDBOX=${MIDTRANS_CLIENT_KEY_SANDBOX}
MIDTRANS_SERVER_KEY_SANDBOX=${MIDTRANS_SERVER_KEY_SANDBOX}

MIDTRANS_BASE_URL_PRODUCTION=${MIDTRANS_BASE_URL_PRODUCTION}
MIDTRANS_CLIENT_KEY_PRODUCTION=${MIDTRANS_CLIENT_KEY_PRODUCTION}
MIDTRANS_SERVER_KEY_PRODUCTION=${MIDTRANS_SERVER_KEY_PRODUCTION}
EOF
}

install_postgres_server() {
  apt-get install -y postgresql postgresql-contrib
  systemctl enable postgresql
  systemctl start postgresql
}

configure_postgres_db() {
  systemctl start postgresql

  local escaped_password
  escaped_password=$(printf "%s" "$DATABASE_PASSWORD" | sed "s/'/''/g")

  local role_exists
  role_exists=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DATABASE_USER}'" || echo "")
  if [ "$role_exists" = "1" ]; then
    sudo -u postgres psql -c "ALTER ROLE \"${DATABASE_USER}\" WITH LOGIN PASSWORD '${escaped_password}';"
  else
    sudo -u postgres psql -c "CREATE ROLE \"${DATABASE_USER}\" LOGIN PASSWORD '${escaped_password}';"
  fi

  local existing_db
  existing_db=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DATABASE_NAME}'" || echo "")
  if [ "$existing_db" != "1" ]; then
    sudo -u postgres psql -c "CREATE DATABASE \"${DATABASE_NAME}\" OWNER \"${DATABASE_USER}\";"
  else
    sudo -u postgres psql -c "ALTER DATABASE \"${DATABASE_NAME}\" OWNER TO \"${DATABASE_USER}\";"
  fi

  sudo -u postgres psql -d "${DATABASE_NAME}" -c "GRANT ALL PRIVILEGES ON SCHEMA public TO \"${DATABASE_USER}\";"
}


ensure_portal_schema() {
  sudo -u postgres psql -d "${DATABASE_NAME}" <<'SQL'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE users
  ALTER COLUMN id SET DEFAULT uuid_generate_v4();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_tier_enum') THEN
    CREATE TYPE user_tier_enum AS ENUM ('student', 'public');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_enum') THEN
    CREATE TYPE payment_method_enum AS ENUM ('cash', 'midtrans_sandbox', 'midtrans_production');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS packages (
  id character varying PRIMARY KEY,
  name character varying NOT NULL,
  duration_label character varying NOT NULL,
  description text NOT NULL,
  benefits jsonb NOT NULL,
  base_price jsonb NOT NULL,
  price jsonb NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS package_credentials (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id character varying NOT NULL,
  tier user_tier_enum NOT NULL,
  email character varying NOT NULL,
  password character varying NOT NULL,
  used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  assigned_account_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS generated_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id character varying,
  package_name character varying NOT NULL,
  tier user_tier_enum NOT NULL,
  payment_method payment_method_enum NOT NULL DEFAULT 'cash',
  price_paid numeric NOT NULL,
  credential_email character varying NOT NULL,
  credential_password character varying NOT NULL,
  customer_name character varying NOT NULL,
  customer_phone character varying NOT NULL,
  customer_email character varying,
  credential_id uuid NOT NULL,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generated_accounts' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE generated_accounts ADD COLUMN payment_method payment_method_enum;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generated_accounts' AND column_name = 'created_by_user_id'
  ) THEN
    ALTER TABLE generated_accounts ADD COLUMN created_by_user_id uuid;
  END IF;
END
$$;

ALTER TABLE generated_accounts
  ALTER COLUMN payment_method DROP DEFAULT;

CREATE TABLE IF NOT EXISTS portal_settings (
  id character varying PRIMARY KEY,
  payment_methods jsonb NOT NULL DEFAULT '{"cash": true, "midtrans_sandbox": false, "midtrans_production": false}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO portal_settings (id, payment_methods)
VALUES ('portal-settings-default', '{"cash": true, "midtrans_sandbox": false, "midtrans_production": false}')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE package_credentials
  ADD CONSTRAINT IF NOT EXISTS "FK_package_credentials_package"
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE;

ALTER TABLE package_credentials
  ADD CONSTRAINT IF NOT EXISTS "FK_package_credentials_assigned_account"
    FOREIGN KEY (assigned_account_id) REFERENCES generated_accounts(id) ON DELETE SET NULL;

ALTER TABLE generated_accounts
  ADD CONSTRAINT IF NOT EXISTS "FK_generated_accounts_package"
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL;

ALTER TABLE generated_accounts
  ADD CONSTRAINT IF NOT EXISTS "FK_generated_accounts_credential"
    FOREIGN KEY (credential_id) REFERENCES package_credentials(id) ON DELETE SET NULL;
SQL
}


install_migrations_dependencies() {
  cd "$APP_DIR"
  set -a
  # shellcheck disable=SC1091
  source "$APP_DIR/.env"
  set +a
  npm run typeorm:migrate
}

start_with_pm2() {
  if pm2 list | grep -Fq "$SERVICE_NAME"; then
    PORT="$APP_PORT" NODE_ENV="${NODE_ENV:-production}" pm2 restart "$SERVICE_NAME" --update-env
  else
    PORT="$APP_PORT" NODE_ENV="${NODE_ENV:-production}" pm2 start dist/main.js --name "$SERVICE_NAME" --cwd "$APP_DIR"
  fi
  pm2 save
}

configure_pm2_startup() {
  if ! systemctl list-unit-files | grep -Fq "pm2-root.service"; then
    pm2 startup systemd -u root --hp /root --silent
  fi
}

write_nginx_config() {
  cat <<EOF > /etc/nginx/sites-available/reflow-backend
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_NAME;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
}

enable_nginx() {
  ln -sf /etc/nginx/sites-available/reflow-backend /etc/nginx/sites-enabled/reflow-backend
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl reload nginx
  systemctl enable nginx
}

configure_firewall() {
  ufw allow OpenSSH
  ufw allow "Nginx Full"
  ufw --force enable
}

request_certificate() {
  certbot --nginx --non-interactive --agree-tos --email "$EMAIL" -d "$DOMAIN"
}

export DEBIAN_FRONTEND=noninteractive

run_step "Update apt sources" apt-get update -y
run_step "Install system packages" apt-get install -y curl git nginx python3-certbot-nginx ufw rsync postgresql postgresql-contrib
run_step "Ensure Node.js 20.x" ensure_node
run_step "Install PM2 globally" install_pm2

INSTALL_LOCAL_POSTGRES="false"
if [ "$DATABASE_HOST" = "localhost" ] || [ "$DATABASE_HOST" = "127.0.0.1" ]; then
  INSTALL_LOCAL_POSTGRES="true"
fi

if [ "$INSTALL_LOCAL_POSTGRES" = "true" ]; then
  run_step "Install PostgreSQL server" install_postgres_server
  run_step "Configure PostgreSQL role & database" configure_postgres_db
  run_step "Ensure portal schema baseline" ensure_portal_schema
else
  log "INFO: Skipping PostgreSQL provisioning (DATABASE_HOST=${DATABASE_HOST})"
  run_step "Ensure portal schema baseline" ensure_portal_schema
fi

if [ -d "$SRC_DIR/.git" ]; then
  run_step "Sync repository from $SRC_DIR to $APP_DIR" sync_local_repo
else
  run_step "Recreate repository in $APP_DIR" clone_repo
fi

run_step "Install dependencies & build project" install_dependencies_build

if [ ! -f "$APP_DIR/.env" ]; then
  run_step "Create .env configuration" create_placeholder_env
  log "WARNING: Review and update $APP_DIR/.env before going live."
else
  log "INFO: Found existing $APP_DIR/.env, leaving in place."
fi

run_step "Run database migrations" install_migrations_dependencies
run_step "Start backend with PM2" start_with_pm2
run_step "Configure PM2 startup service" configure_pm2_startup
run_step "Write Nginx site configuration" write_nginx_config
run_step "Enable Nginx site and reload" enable_nginx
run_step "Configure UFW firewall" configure_firewall

if [ -n "$DOMAIN" ] && [ -n "$EMAIL" ]; then
  run_step "Request TLS certificate for $DOMAIN" request_certificate
else
  log "INFO: Skipping Certbot issuance (DOMAIN or EMAIL missing)"
fi

log "SUCCESS: Deployment complete"
