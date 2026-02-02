# AI Trader by Chiel

Everything you ever wanted to know about your trading... but your spreadsheets never told you.

AI Trader by Chiel is a comprehensive trading journal and analytics platform that helps you track, analyze, and improve your trading performance with the power of AI and advanced analytics.

## Features

- 📊 **Analytics** - Track and analyze trading performance
- 📖 **Journal** - Log every trade automatically
- 📈 **Reporting** - Generate comprehensive reports
- 🎯 **Strategy Backtesting** - Test strategies on historical data
- 🤖 **AI Signals** - Get AI-powered trading signals
- 💼 **Portfolio Management** - Manage your positions
- ⚡ **Real-time Monitoring** - Monitor markets in real-time
- 🛡️ **Risk Management** - Protect your capital

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Flask (Python)
- **Data Storage**: JSON file-based database

## Installation

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- pip
- MetaTrader 5 installed (for MT5 integration)

### Setup

1. Install Python dependencies:
```bash
pip3 install -r requirements.txt
```

Or manually:
```bash
pip3 install flask flask-cors MetaTrader5
```

2. Configure MT5 credentials (optional, for MetaTrader 5 integration):
   - Create `dashboard/.env.local` file
   - Add your MT5 credentials:
   ```
   MT5_LOGIN=your_login
   MT5_PASSWORD=your_password
   MT5_INVESTOR_PASSWORD=your_investor_password
   MT5_SERVER=your_server
   ```

3. Install Node.js dependencies for the dashboard:
```bash
cd dashboard
npm install
```

## Usage

### Start the Application

1. Start the API server:
```bash
python3 api_server.py
```

2. Start the dashboard (in a new terminal):
```bash
cd dashboard
npm run dev
```

The application will be available at:
- **Dashboard**: http://localhost:3000
- **API Server**: http://localhost:5001

## API Endpoints

### General
- `GET /api/health` - Health check
- `GET /api/stats` - Get trading statistics
- `GET /api/trades` - Get recent trades
- `POST /api/trades` - Add a new trade
- `GET /api/strategies` - Get trading strategies
- `GET /api/portfolio` - Get portfolio data
- `GET /api/daily-pnl` - Get daily P&L data for calendar

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/verify` - Verify authentication token

### MetaTrader 5 Integration
- `POST /api/mt5/connect` - Connect to MT5
- `GET /api/mt5/account` - Get MT5 account information
- `GET /api/mt5/positions` - Get open positions
- `GET /api/mt5/history` - Get trade history
- `POST /api/mt5/sync` - Sync trades from MT5 to local database

## Project Structure

```
AItraderbychiel/
├── api_server.py          # Flask API server
├── mt5_connector.py       # MetaTrader 5 connector module
├── requirements.txt       # Python dependencies
├── trading_data.json      # Trading data storage (auto-created)
├── users.json             # User data storage (auto-created)
├── dashboard/             # Next.js dashboard
│   ├── app/              # Next.js app directory
│   │   ├── page.tsx      # Dashboard homepage
│   │   ├── login/        # Login page
│   │   ├── strategy/     # Strategy page
│   │   ├── portfolio/    # Portfolio page
│   │   ├── analytics/    # Analytics page
│   │   ├── integrations/ # Integrations pages
│   │   │   └── metatrader-5/ # MT5 integration page
│   │   └── system-status/ # System status page
│   ├── components/       # React components
│   │   ├── Statistics.tsx
│   │   ├── Portfolio.tsx
│   │   ├── RecentTrades.tsx
│   │   ├── StrategyPerformance.tsx
│   │   ├── PerformanceChart.tsx
│   │   ├── TradingCalendar.tsx
│   │   ├── Sidebar.tsx
│   │   └── DashboardLayout.tsx
│   └── .env.local        # Environment variables (MT5 credentials)
└── README.md
```

## Features Overview

### Dashboard
- Real-time trading statistics
- Portfolio overview
- Recent trades
- Strategy performance

### Strategy Management
- View all active strategies
- Monitor strategy performance
- Start/pause strategies
- Configure strategy settings

### Analytics
- Win rate tracking
- P&L analysis
- Trade history
- Performance metrics
- Monthly calendar view with profit/loss indicators

### MetaTrader 5 Integration
- Connect to MT5 accounts
- Sync trades automatically
- View account information
- Monitor open positions
- Import trade history
- Real-time data synchronization

## Development

### Running in Development Mode

1. Start API server with auto-reload:
```bash
python3 api_server.py
```

2. Start Next.js dev server:
```bash
cd dashboard
npm run dev
```

### Building for Production

```bash
cd dashboard
npm run build
npm start
```

## License

Free to use for trading purposes.

## Support

For issues and questions, please open an issue on the repository.
