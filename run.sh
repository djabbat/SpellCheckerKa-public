#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# SpellCheckerKa — Georgian Language Spell Checker
# Main launcher (local development & build)
# For production deploy: bash deploy.sh
# ──────────────────────────────────────────────────────────────────────────────
set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

BOLD='\033[1m'; CYAN='\033[0;36m'; GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║   SpellCheckerKa — ქართული მართლწერა       ║${NC}"
echo -e "${BOLD}${CYAN}║   Georgian Spell Checker v1.0.0              ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

if [[ -z "$1" ]]; then
    echo "Usage: $0 [command]"
    echo ""
    echo "Development:"
    echo "  dev         Start dev server (http://localhost:4000)"
    echo "  test        Run test suite"
    echo "  check       Compile and check for errors"
    echo "  format      Format Elixir code"
    echo ""
    echo "Build:"
    echo "  assets      Build JS/CSS assets"
    echo "  release     Build production release"
    echo "  docker-build  Build Docker image"
    echo ""
    echo "Deploy:"
    echo "  deploy      Deploy to schecker.ge (runs deploy.sh)"
    echo ""
    echo "Utilities:"
    echo "  dict-stats  Print dictionary statistics"
    echo "  iex         Start interactive Elixir shell"
    echo ""
    echo "Examples:"
    echo "  bash run.sh dev"
    echo "  bash run.sh test"
    echo "  bash run.sh deploy"
    exit 0
fi

CMD="$1"

check_mix() {
    if ! command -v mix &>/dev/null; then
        echo -e "${RED}Error: mix not found. Install Elixir: https://elixir-lang.org${NC}"
        exit 1
    fi
}

check_docker() {
    if ! command -v docker &>/dev/null; then
        echo -e "${RED}Error: docker not found. Install Docker.${NC}"
        exit 1
    fi
}

case "$CMD" in
    dev)
        check_mix
        echo -e "${BOLD}Starting development server on http://localhost:4000 ...${NC}"
        echo -e "${YELLOW}Dictionary loading: ~2s on first start (993,589 words)${NC}"
        echo ""
        mix phx.server
        ;;

    test)
        check_mix
        echo -e "${BOLD}Running test suite...${NC}"
        mix test
        echo -e "${GREEN}✓ Tests complete${NC}"
        ;;

    check)
        check_mix
        echo -e "${BOLD}Compiling and checking...${NC}"
        mix compile --warnings-as-errors 2>&1
        echo -e "${GREEN}✓ Check complete${NC}"
        ;;

    format)
        check_mix
        echo -e "${BOLD}Formatting Elixir code...${NC}"
        mix format
        echo -e "${GREEN}✓ Format complete${NC}"
        ;;

    assets)
        check_mix
        echo -e "${BOLD}Building JS/CSS assets...${NC}"
        mix assets.build 2>&1
        echo -e "${GREEN}✓ Assets built${NC}"
        ;;

    release)
        check_mix
        echo -e "${BOLD}Building production release...${NC}"
        MIX_ENV=prod mix release 2>&1
        echo -e "${GREEN}✓ Release built in _build/prod/rel/spellcheckerka/${NC}"
        ;;

    docker-build)
        check_docker
        echo -e "${BOLD}Building Docker image spellcheckerka:latest ...${NC}"
        docker build -f docker/Dockerfile -t spellcheckerka:latest . 2>&1
        echo -e "${GREEN}✓ Docker image built${NC}"
        ;;

    deploy)
        echo -e "${BOLD}Deploying to schecker.ge ...${NC}"
        bash deploy.sh
        ;;

    dict-stats)
        check_mix
        echo -e "${BOLD}Dictionary statistics:${NC}"
        wc -l priv/static/dictionaris/ge.txt 2>/dev/null | awk '{print "  Georgian words:", $1}' || echo "  ge.txt not found"
        for lang in en fr es ru; do
            f="priv/static/dictionaris/${lang}.txt"
            if [[ -f "$f" ]]; then
                wc -l "$f" | awk -v l="$lang" '{print "  " l " words: " $1}'
            else
                echo "  ${lang}.txt: not found"
            fi
        done
        ;;

    iex)
        check_mix
        echo -e "${BOLD}Starting IEx with application loaded...${NC}"
        iex -S mix
        ;;

    *)
        echo -e "${RED}Unknown command: $CMD${NC}"
        echo "Run '$0' without arguments to see usage."
        exit 1
        ;;
esac
