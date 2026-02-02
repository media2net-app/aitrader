#!/usr/bin/env python3
"""
Forex Market Hours Information
Shows when different trading sessions are open/closed
"""

from datetime import datetime, timezone, timedelta
import pytz

class MarketHours:
    def __init__(self):
        # Define market timezones
        self.sydney = pytz.timezone('Australia/Sydney')
        self.tokyo = pytz.timezone('Asia/Tokyo')
        self.london = pytz.timezone('Europe/London')
        self.new_york = pytz.timezone('America/New_York')
        
        # Market sessions (in local time)
        self.sessions = {
            'Sydney': {
                'open': 9,  # 9:00 AM
                'close': 17,  # 5:00 PM
                'timezone': self.sydney,
                'name': 'Asia-Pacific Session'
            },
            'Tokyo': {
                'open': 9,  # 9:00 AM
                'close': 15,  # 3:00 PM
                'timezone': self.tokyo,
                'name': 'Asian Session'
            },
            'London': {
                'open': 8,  # 8:00 AM
                'close': 16,  # 4:00 PM
                'timezone': self.london,
                'name': 'European Session'
            },
            'New York': {
                'open': 8,  # 8:00 AM
                'close': 17,  # 5:00 PM
                'timezone': self.new_york,
                'name': 'US Session'
            }
        }
    
    def get_current_time(self, tz):
        """Get current time in specified timezone"""
        return datetime.now(tz)
    
    def is_market_open(self, session_name):
        """Check if a specific market session is open"""
        if session_name not in self.sessions:
            return False
        
        session = self.sessions[session_name]
        current_time = self.get_current_time(session['timezone'])
        current_hour = current_time.hour
        
        # Check if it's a weekday (Monday=0, Sunday=6)
        if current_time.weekday() >= 5:  # Saturday or Sunday
            return False
        
        return session['open'] <= current_hour < session['close']
    
    def get_market_status(self):
        """Get status of all markets"""
        status = {}
        
        for name, session in self.sessions.items():
            current_time = self.get_current_time(session['timezone'])
            is_open = self.is_market_open(name)
            
            # Calculate time until open/close
            if is_open:
                close_time = current_time.replace(hour=session['close'], minute=0, second=0, microsecond=0)
                if current_time.hour >= session['close']:
                    close_time += timedelta(days=1)
                time_until_close = close_time - current_time
                next_event = f"Closes in {time_until_close}"
            else:
                # Find next open time
                open_time = current_time.replace(hour=session['open'], minute=0, second=0, microsecond=0)
                if current_time.hour >= session['open']:
                    open_time += timedelta(days=1)
                
                # Skip weekends
                while open_time.weekday() >= 5:
                    open_time += timedelta(days=1)
                
                time_until_open = open_time - current_time
                next_event = f"Opens in {time_until_open}"
            
            status[name] = {
                'is_open': is_open,
                'current_time': current_time.strftime('%H:%M:%S'),
                'local_date': current_time.strftime('%Y-%m-%d'),
                'day_of_week': current_time.strftime('%A'),
                'next_event': next_event,
                'session_name': session['name']
            }
        
        return status
    
    def get_overlap_periods(self):
        """Get periods when multiple markets are open (high liquidity)"""
        overlaps = []
        
        # London-New York overlap (most liquid)
        london_status = self.is_market_open('London')
        ny_status = self.is_market_open('New York')
        if london_status and ny_status:
            overlaps.append({
                'markets': ['London', 'New York'],
                'description': 'London-NY Overlap (Highest Liquidity)',
                'time': '13:00-16:00 GMT / 8:00-11:00 EST'
            })
        
        # Tokyo-London overlap
        tokyo_status = self.is_market_open('Tokyo')
        if tokyo_status and london_status:
            overlaps.append({
                'markets': ['Tokyo', 'London'],
                'description': 'Tokyo-London Overlap',
                'time': '8:00-9:00 GMT'
            })
        
        # Sydney-Tokyo overlap
        sydney_status = self.is_market_open('Sydney')
        if sydney_status and tokyo_status:
            overlaps.append({
                'markets': ['Sydney', 'Tokyo'],
                'description': 'Sydney-Tokyo Overlap',
                'time': '00:00-9:00 GMT'
            })
        
        return overlaps
    
    def print_market_status(self):
        """Print formatted market status"""
        print("\n" + "="*70)
        print("🌍 FOREX MARKET HOURS & STATUS")
        print("="*70)
        print()
        
        status = self.get_market_status()
        current_utc = datetime.now(timezone.utc)
        print(f"🕐 Current UTC Time: {current_utc.strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        for market_name, info in status.items():
            status_icon = "🟢" if info['is_open'] else "🔴"
            status_text = "OPEN" if info['is_open'] else "CLOSED"
            
            print(f"{status_icon} {market_name} Market ({info['session_name']})")
            print(f"   Status: {status_text}")
            print(f"   Local Time: {info['current_time']} ({info['day_of_week']}, {info['local_date']})")
            print(f"   {info['next_event']}")
            print()
        
        # Show overlaps
        overlaps = self.get_overlap_periods()
        if overlaps:
            print("📊 MARKET OVERLAPS (High Liquidity Periods):")
            print("-" * 70)
            for overlap in overlaps:
                print(f"   • {overlap['description']}")
                print(f"     Markets: {', '.join(overlap['markets'])}")
                print(f"     Time: {overlap['time']}")
                print()
        else:
            print("⚠️  No market overlaps at this time")
            print()
        
        # Trading tips
        print("💡 TRADING TIPS:")
        print("-" * 70)
        print("   • Best liquidity: London-NY overlap (13:00-16:00 GMT)")
        print("   • Asian session: Lower volatility, good for range trading")
        print("   • European session: High volatility, good for trend trading")
        print("   • US session: High volume, good for breakouts")
        print("   • Weekend: Markets closed (Friday 22:00 GMT - Sunday 22:00 GMT)")
        print()
        
        # Check if any market is open
        any_open = any(info['is_open'] for info in status.values())
        if any_open:
            print("✅ MARKET IS OPEN - Trading is possible")
        else:
            print("❌ MARKET IS CLOSED - All sessions are closed")
            print("   (Likely weekend or outside trading hours)")
        print()

if __name__ == '__main__':
    market = MarketHours()
    market.print_market_status()
