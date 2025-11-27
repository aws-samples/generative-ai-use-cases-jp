#!/bin/bash
# Quick wrapper for maintenance-mode.sh
# Usage: ./maintenance.sh <env> <on|off|status>

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ $# -lt 2 ]; then
    echo "Usage: $0 <env> <on|off|status>"
    echo ""
    echo "Environments: tmp, devel, produ, hosoy"
    echo "Actions: on, off, status"
    echo ""
    echo "Examples:"
    echo "  $0 tmp on       # Enable maintenance mode"
    echo "  $0 tmp off      # Disable maintenance mode"
    echo "  $0 tmp status   # Check status"
    exit 1
fi

"$SCRIPT_DIR/maintenance-mode.sh" "$@"
