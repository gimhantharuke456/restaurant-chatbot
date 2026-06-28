#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
AI_DIR="$ROOT/ai-service"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"

# Colours
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${CYAN}[start]${NC} $*"; }
ok()   { echo -e "${GREEN}[ready]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC}  $*"; }
err()  { echo -e "${RED}[error]${NC} $*"; }

# Cleanup — kill all child processes on Ctrl-C or exit
cleanup() {
  echo ""
  log "Shutting down all services…"
  kill "$AI_PID" "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$AI_PID" "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  log "Done."
}
trap cleanup EXIT INT TERM

# ── 1. Python AI service ───────────────────────────────────────────────────────
log "Starting Python AI service…"

if [ ! -d "$AI_DIR/venv" ]; then
  warn "No venv found at ai-service/venv — creating one…"
  python3 -m venv "$AI_DIR/venv"
  "$AI_DIR/venv/bin/pip" install -q -r "$AI_DIR/requirements.txt"
fi

(
  cd "$AI_DIR"
  source venv/bin/activate
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload
) > "$ROOT/logs/ai.log" 2>&1 &
AI_PID=$!

# Wait until the AI service is accepting connections
log "Waiting for AI service on :8000…"
for i in $(seq 1 30); do
  if curl -sf http://localhost:8000/docs > /dev/null 2>&1; then
    ok "AI service is up (PID $AI_PID)"
    break
  fi
  if ! kill -0 "$AI_PID" 2>/dev/null; then
    err "AI service crashed — check logs/ai.log"
    exit 1
  fi
  sleep 1
done

# ── 2. Node backend ────────────────────────────────────────────────────────────
log "Starting Node backend…"

(
  cd "$BACKEND_DIR"
  npm run dev
) > "$ROOT/logs/backend.log" 2>&1 &
BACKEND_PID=$!

log "Waiting for backend on :3000…"
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1 || \
     curl -sf http://localhost:3000/api/docs  > /dev/null 2>&1; then
    ok "Backend is up (PID $BACKEND_PID)"
    break
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    err "Backend crashed — check logs/backend.log"
    exit 1
  fi
  sleep 1
done

# ── 3. Next.js frontend ────────────────────────────────────────────────────────
log "Starting Next.js frontend…"

(
  cd "$FRONTEND_DIR"
  npm run dev
) > "$ROOT/logs/frontend.log" 2>&1 &
FRONTEND_PID=$!

log "Waiting for frontend on :3001…"
for i in $(seq 1 30); do
  if curl -sf http://localhost:3001 > /dev/null 2>&1 || \
     curl -sf http://localhost:3000 > /dev/null 2>&1; then
    ok "Frontend is up (PID $FRONTEND_PID)"
    break
  fi
  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    err "Frontend crashed — check logs/frontend.log"
    exit 1
  fi
  sleep 1
done

# ── All up ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  All services running${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  AI service  →  http://localhost:8000"
echo -e "  Backend     →  http://localhost:3000"
echo -e "  Frontend    →  http://localhost:3001"
echo -e "  Logs        →  $ROOT/logs/"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Press ${YELLOW}Ctrl-C${NC} to stop all services"
echo ""

# Keep script alive so the trap fires on Ctrl-C
wait "$AI_PID" "$BACKEND_PID" "$FRONTEND_PID"
