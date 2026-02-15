#!/bin/bash
# AEIMS Deployment Script
# Deploy to OCI instance at 129.153.158.177

set -e

# Configuration
REMOTE_HOST="129.153.158.177"
REMOTE_USER="opc"
REMOTE_DIR="/opt/aeims"
SSH_KEY="${SSH_KEY:-~/.ssh/oci_diseasezone}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[AEIMS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Check SSH connectivity
check_ssh() {
    log "Checking SSH connectivity to ${REMOTE_HOST}..."
    if ! ssh -i "$SSH_KEY" -o ConnectTimeout=5 "${REMOTE_USER}@${REMOTE_HOST}" "echo ok" > /dev/null 2>&1; then
        error "Cannot connect to ${REMOTE_HOST}. Check SSH key and network."
    fi
    log "SSH connection successful"
}

# Build the project locally
build_local() {
    log "Building Next.js application..."
    cd "$PROJECT_DIR"
    npm run build || error "Build failed"
    log "Build complete"
}

# Sync files to remote
sync_files() {
    log "Syncing files to ${REMOTE_HOST}:${REMOTE_DIR}..."

    rsync -avz --delete \
        --exclude='.git' \
        --exclude='node_modules' \
        --exclude='.next' \
        --exclude='.env.local' \
        --exclude='*.log' \
        --exclude='infrastructure/caddy_data' \
        -e "ssh -i $SSH_KEY" \
        "$PROJECT_DIR/" \
        "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/" || {
        # rsync exit code 23 = partial transfer due to permission errors (non-fatal)
        if [ $? -eq 23 ]; then
            warn "Some files could not be synced (permission issues), continuing..."
        else
            error "File sync failed"
        fi
    }

    log "Files synced"
}

# Remote setup and deployment
remote_deploy() {
    log "Running remote deployment..."

    ssh -i "$SSH_KEY" "${REMOTE_USER}@${REMOTE_HOST}" bash << 'REMOTE_SCRIPT'
set -e

DEPLOY_DIR="/opt/aeims"
cd "$DEPLOY_DIR"

echo "=== Creating directories ==="
sudo mkdir -p /var/lib/aeims /var/log/aeims /etc/aeims
sudo chown -R opc:opc /var/lib/aeims /var/log/aeims

echo "=== Installing dependencies ==="
if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo yum install -y nodejs
fi

if ! command -v docker &> /dev/null; then
    sudo yum install -y docker
    sudo systemctl enable docker
    sudo systemctl start docker
    sudo usermod -aG docker opc
fi

echo "=== Setting up environment ==="
if [ ! -f "$DEPLOY_DIR/.env" ]; then
    cat > "$DEPLOY_DIR/.env" << 'ENV'
NODE_ENV=production
DATABASE_URL=postgresql://aeims:aeims_secure_2024@localhost:5432/aeims
NEXTAUTH_URL=https://aeims.app
NEXTAUTH_SECRET=$(openssl rand -base64 32)
POSTGRES_PASSWORD=aeims_secure_2024
ENV
fi

echo "=== Installing npm dependencies ==="
cd "$DEPLOY_DIR"
npm ci --only=production

echo "=== Building application ==="
npm run build

echo "=== Starting services with Docker Compose ==="
cd "$DEPLOY_DIR/infrastructure"

# Ensure logs directory exists for Caddy
sudo mkdir -p /opt/aeims/infrastructure/caddy_data/logs

docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d --build

echo "=== Waiting for services to start ==="
sleep 10

echo "=== Checking service status ==="
docker compose -f docker-compose.production.yml ps

echo "=== Deployment complete ==="
REMOTE_SCRIPT

    log "Remote deployment complete"
}

# Quick deploy (just sync and restart)
quick_deploy() {
    log "Quick deploy - syncing and restarting..."
    sync_files

    ssh -i "$SSH_KEY" "${REMOTE_USER}@${REMOTE_HOST}" bash << 'REMOTE_SCRIPT'
cd /opt/aeims
npm ci --only=production
npm run build
cd infrastructure
docker compose -f docker-compose.production.yml up -d --build aeims-web
docker compose -f docker-compose.production.yml restart caddy
REMOTE_SCRIPT

    log "Quick deploy complete"
}

# Check status
check_status() {
    log "Checking service status..."
    ssh -i "$SSH_KEY" "${REMOTE_USER}@${REMOTE_HOST}" bash << 'REMOTE_SCRIPT'
cd /opt/aeims/infrastructure
echo "=== Docker Compose Status ==="
docker compose -f docker-compose.production.yml ps

echo ""
echo "=== Container Logs (last 20 lines each) ==="
for container in aeims-web aeims-agent aeims-caddy; do
    echo "--- $container ---"
    docker logs --tail 20 $container 2>/dev/null || echo "Container not running"
    echo ""
done
REMOTE_SCRIPT
}

# View logs
view_logs() {
    local service="${1:-aeims-web}"
    log "Viewing logs for $service..."
    ssh -i "$SSH_KEY" "${REMOTE_USER}@${REMOTE_HOST}" \
        "cd /opt/aeims/infrastructure && docker compose -f docker-compose.production.yml logs -f $service"
}

# Main
case "${1:-deploy}" in
    deploy)
        check_ssh
        build_local
        sync_files
        remote_deploy
        log "Deployment successful! Visit https://aeims.app"
        ;;
    quick)
        check_ssh
        quick_deploy
        log "Quick deploy successful!"
        ;;
    sync)
        check_ssh
        sync_files
        ;;
    status)
        check_ssh
        check_status
        ;;
    logs)
        check_ssh
        view_logs "$2"
        ;;
    ssh)
        ssh -i "$SSH_KEY" "${REMOTE_USER}@${REMOTE_HOST}"
        ;;
    *)
        echo "Usage: $0 {deploy|quick|sync|status|logs [service]|ssh}"
        echo ""
        echo "Commands:"
        echo "  deploy  - Full deployment (build, sync, deploy)"
        echo "  quick   - Quick deploy (sync and restart)"
        echo "  sync    - Just sync files"
        echo "  status  - Check service status"
        echo "  logs    - View logs (default: aeims-web)"
        echo "  ssh     - SSH into server"
        exit 1
        ;;
esac
