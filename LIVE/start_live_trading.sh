#!/bin/bash
#
# Start Live Trading Script
# Start live trading met MetaTrader 5
#

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Live Trading Starter - MetaTrader 5                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed${NC}"
    exit 1
fi

# Check if MT5 bridge is running
echo -e "${YELLOW}🔍 Checking MT5 Bridge connection...${NC}"
if curl -s http://localhost:5002/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MT5 Bridge is running${NC}"
else
    echo -e "${RED}❌ MT5 Bridge is not running!${NC}"
    echo -e "${YELLOW}   Please start the MT5 bridge first:${NC}"
    echo -e "   python3 mt5_bridge.py"
    exit 1
fi

# Configuration selection
echo ""
echo -e "${BLUE}Select configuration:${NC}"
echo "  1) Conservative (2% risk, recommended for start)"
echo "  2) Moderate (5% risk)"
echo "  3) Aggressive (50% risk, very risky!)"
echo "  4) Default (5% risk)"
echo ""
read -p "Enter choice [1-4] (default: 1): " config_choice

case $config_choice in
    1)
        CONFIG_TYPE="conservative"
        echo -e "${GREEN}✅ Using Conservative configuration${NC}"
        ;;
    2)
        CONFIG_TYPE="moderate"
        echo -e "${YELLOW}⚠️  Using Moderate configuration${NC}"
        ;;
    3)
        CONFIG_TYPE="aggressive"
        echo -e "${RED}⚠️  WARNING: Using Aggressive configuration (50% risk per trade!)${NC}"
        echo -e "${RED}   This is very risky - 2 losing trades = account gone!${NC}"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            echo "Cancelled."
            exit 0
        fi
        ;;
    4|"")
        CONFIG_TYPE="default"
        echo -e "${BLUE}✅ Using Default configuration${NC}"
        ;;
    *)
        echo -e "${RED}Invalid choice, using Conservative${NC}"
        CONFIG_TYPE="conservative"
        ;;
esac

# Check interval
echo ""
read -p "Check interval in seconds [60]: " check_interval
check_interval=${check_interval:-60}

# Create logs directory
mkdir -p "$PROJECT_DIR/LIVE/logs"

# Log file
LOG_FILE="$PROJECT_DIR/LIVE/logs/live_trading_$(date +%Y%m%d_%H%M%S).log"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🚀 Starting Live Trader...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "Configuration: ${CONFIG_TYPE}"
echo -e "Check interval: ${check_interval} seconds"
echo -e "Log file: ${LOG_FILE}"
echo ""

# Change to project directory
cd "$PROJECT_DIR"

# Start live trader
python3 LIVE/live_trader.py --config "$CONFIG_TYPE" --interval "$check_interval" 2>&1 | tee "$LOG_FILE"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Live Trader stopped${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
