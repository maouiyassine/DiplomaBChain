#!/bin/bash

# ═══════════════════════════════════════════════════════════════
#   DiplomaChain — Script de démarrage unique
#   Lance : Besu + IPFS + Frontend en parallèle
# ═══════════════════════════════════════════════════════════════

ROOT="$(cd "$(dirname "$0")" && pwd)"
LOGS="$ROOT/.logs"
mkdir -p "$LOGS"

# ── Couleurs ──────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${BOLD}[DiplomaChain]${NC} $1"; }
ok()   { echo -e "${GREEN}  ✅ $1${NC}"; }
warn() { echo -e "${YELLOW}  ⚠️  $1${NC}"; }
fail() { echo -e "${RED}  ❌ $1${NC}"; }

# ── Vérification des dépendances ──────────────────────────────
check_deps() {
  log "Vérification des dépendances..."
  local missing=0

  command -v besu  &>/dev/null && ok "Besu trouvé"  || { fail "Besu manquant → brew install hyperledger/besu/besu"; missing=1; }
  command -v ipfs  &>/dev/null && ok "IPFS trouvé"  || { fail "IPFS manquant → brew install ipfs";                  missing=1; }
  command -v node  &>/dev/null && ok "Node trouvé"  || { fail "Node manquant → brew install node";                  missing=1; }

  [ $missing -eq 1 ] && { echo ""; fail "Installe les dépendances manquantes puis relance."; exit 1; }
}

# ── Nettoyage à l'arrêt (Ctrl+C) ─────────────────────────────
cleanup() {
  echo ""
  log "Arrêt de tous les services..."
  [ -n "$PID_BESU"    ] && kill "$PID_BESU"    2>/dev/null
  [ -n "$PID_BESU2"   ] && kill "$PID_BESU2"   2>/dev/null
  [ -n "$PID_IPFS"    ] && kill "$PID_IPFS"    2>/dev/null
  [ -n "$PID_WEBPACK" ] && kill "$PID_WEBPACK" 2>/dev/null
  wait 2>/dev/null
  ok "Tous les services arrêtés."
  exit 0
}
trap cleanup SIGINT SIGTERM

# ── Attendre qu'un port soit ouvert ───────────────────────────
wait_for_port() {
  local port=$1 label=$2 max=30 i=0
  while ! curl -s "http://127.0.0.1:$port" &>/dev/null; do
    sleep 1; i=$((i+1))
    [ $i -ge $max ] && { fail "$label n'a pas démarré (timeout ${max}s)"; return 1; }
  done
  ok "$label prêt sur le port $port"
}

# ═══════════════════════════════════════════════════════════════
clear
echo -e "${BOLD}${BLUE}"
echo "  ██████╗ ██╗██████╗ ██╗      ██████╗ ███╗   ███╗ █████╗"
echo "  ██╔══██╗██║██╔══██╗██║     ██╔═══██╗████╗ ████║██╔══██╗"
echo "  ██║  ██║██║██████╔╝██║     ██║   ██║██╔████╔██║███████║"
echo "  ██║  ██║██║██╔═══╝ ██║     ██║   ██║██║╚██╔╝██║██╔══██║"
echo "  ██████╔╝██║██║     ███████╗╚██████╔╝██║ ╚═╝ ██║██║  ██║"
echo "  ╚═════╝ ╚═╝╚═╝     ╚══════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝"
echo -e "${NC}"
echo -e "  ${BOLD}Système de Vérification de Diplômes — Blockchain + IPFS${NC}"
echo "  ─────────────────────────────────────────────────────────"
echo ""

check_deps
echo ""

# ── 1. Besu Node 1 (validator) ────────────────────────────────
log "Démarrage de Besu Node 1 — Validateur (port 8545)..."
rm -f "$ROOT/blockchain/data/node1/database/LOCK"
cd "$ROOT/blockchain" && bash start-besu.sh > "$LOGS/besu-node1.log" 2>&1 &
PID_BESU=$!
cd "$ROOT"
wait_for_port 8545 "Besu Node 1" || exit 1

# ── 2. Besu Node 2 (member) ───────────────────────────────────
log "Démarrage de Besu Node 2 — Membre (port 8547)..."
rm -f "$ROOT/blockchain/data/node2/database/LOCK"
cd "$ROOT/blockchain" && bash start-node2.sh > "$LOGS/besu-node2.log" 2>&1 &
PID_BESU2=$!
cd "$ROOT"
wait_for_port 8547 "Besu Node 2" || warn "Node 2 non disponible — le réseau continue avec Node 1"

# ── 2. IPFS ───────────────────────────────────────────────────
log "Démarrage du daemon IPFS..."
if curl -s http://127.0.0.1:5001/api/v0/id &>/dev/null; then
  ok "IPFS déjà actif"
else
  ipfs daemon --enable-gc > "$LOGS/ipfs.log" 2>&1 &
  PID_IPFS=$!
  wait_for_port 5001 "IPFS"
fi

# ── 3. Frontend ───────────────────────────────────────────────
log "Démarrage du frontend (port 3001)..."
cd "$ROOT" && npm start > "$LOGS/webpack.log" 2>&1 &
PID_WEBPACK=$!

# Attendre que webpack compile
sleep 6
if grep -q "compiled successfully" "$LOGS/webpack.log" 2>/dev/null; then
  ok "Frontend compilé → http://localhost:3001"
else
  warn "Frontend en cours de compilation..."
fi

# ── Résumé ────────────────────────────────────────────────────
echo ""
echo -e "  ${BOLD}═══════════════════════════════════════════════${NC}"
echo -e "  ${GREEN}${BOLD}  Tous les services sont démarrés  ${NC}"
echo -e "  ${BOLD}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BOLD}Frontend  ${NC}→  http://localhost:3001"
echo -e "  ${BOLD}Besu Node 1 (validator) ${NC}→  http://127.0.0.1:8545"
echo -e "  ${BOLD}Besu Node 2 (member)    ${NC}→  http://127.0.0.1:8547"
echo -e "  ${BOLD}IPFS API  ${NC}→  http://127.0.0.1:5001"
echo -e "  ${BOLD}IPFS GW   ${NC}→  http://127.0.0.1:8080"
echo ""
echo -e "  ${BOLD}Logs      ${NC}→  .logs/besu.log | ipfs.log | webpack.log"
echo ""
echo -e "  ${YELLOW}Appuyez sur Ctrl+C pour tout arrêter${NC}"
echo ""

# Maintenir le script actif
wait
