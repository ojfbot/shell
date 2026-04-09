#!/usr/bin/env bash
set -euo pipefail

# Launch all Frame OS Storybooks for cross-repo composition.
#
# The shell's Storybook (port 6006) references external Storybooks via
# the `refs` config in .storybook/main.ts. This script starts all of them.
#
# Usage:
#   ./scripts/storybook-composition.sh start   # launch all Storybooks
#   ./scripts/storybook-composition.sh stop    # kill all Storybooks
#   ./scripts/storybook-composition.sh status  # show running instances

REPOS=(
  "frame-ui-components:6007"
  "cv-builder:6008:packages/client"
  "blogengine:6009:packages/client"
  "TripPlanner:6010"
)

SHELL_PORT=6006
BASE_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
LOG_DIR="/tmp/storybook-composition-logs"

start_storybook() {
  local repo="$1" port="$2" subdir="${3:-}"
  local dir="$BASE_DIR/$repo"
  [ -n "$subdir" ] && dir="$dir/$subdir"

  if ! [ -d "$dir" ]; then
    echo "  SKIP  $repo — directory not found at $dir"
    return
  fi

  if lsof -i ":$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "  OK    $repo — already running on :$port"
    return
  fi

  mkdir -p "$LOG_DIR"
  echo "  START $repo on :$port"
  (cd "$dir" && pnpm storybook --no-open -p "$port" > "$LOG_DIR/$repo.log" 2>&1 &)
}

stop_storybook() {
  local port="$1" repo="$2"
  local pid
  pid=$(lsof -t -i ":$port" -sTCP:LISTEN 2>/dev/null || true)
  if [ -n "$pid" ]; then
    kill "$pid" 2>/dev/null && echo "  STOP  $repo (:$port) — killed PID $pid"
  else
    echo "  ---   $repo (:$port) — not running"
  fi
}

show_status() {
  local port="$1" repo="$2"
  if lsof -i ":$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "  UP    $repo — http://localhost:$port"
  else
    echo "  DOWN  $repo (:$port)"
  fi
}

case "${1:-status}" in
  start)
    echo "Starting Frame OS Storybook composition..."
    for entry in "${REPOS[@]}"; do
      IFS=: read -r repo port subdir <<< "$entry"
      start_storybook "$repo" "$port" "$subdir"
    done
    echo ""
    echo "Starting shell Storybook (composition hub)..."
    start_storybook "shell" "$SHELL_PORT" "packages/ui"
    echo ""
    echo "Open http://localhost:$SHELL_PORT to view the composed Storybook."
    echo "External repos appear in the sidebar under their ref titles."
    ;;
  stop)
    echo "Stopping all Storybooks..."
    for entry in "${REPOS[@]}"; do
      IFS=: read -r repo port subdir <<< "$entry"
      stop_storybook "$port" "$repo"
    done
    stop_storybook "$SHELL_PORT" "shell"
    ;;
  status)
    echo "Storybook composition status:"
    show_status "$SHELL_PORT" "shell (hub)"
    for entry in "${REPOS[@]}"; do
      IFS=: read -r repo port subdir <<< "$entry"
      show_status "$port" "$repo"
    done
    ;;
  *)
    echo "Usage: $0 {start|stop|status}"
    exit 1
    ;;
esac
