#!/usr/bin/env python3
"""
Adaptive Strategy
Auto-switch strategie parameters op basis van market regime
"""

from typing import Dict, List, Optional
from datetime import datetime
from trading_strategy import TradingStrategy
from market_regime import MarketRegimeDetector

class AdaptiveStrategy:
    def __init__(self, bridge_url: str = "http://localhost:5002"):
        self.regime_detector = MarketRegimeDetector()
        self.current_regime = None
        self.strategy = TradingStrategy(bridge_url=bridge_url)
        self.regime_history = []
    
    def update_strategy(self, candles: List[Dict]) -> bool:
        """
        Update strategy parameters based on current market regime
        
        Args:
            candles: Current candlestick data
        
        Returns:
            True if regime changed and strategy was updated
        """
        # Detect current regime
        new_regime = self.regime_detector.detect_regime(candles)
        
        # Check if regime changed
        if new_regime != self.current_regime:
            # Get parameters for new regime
            params = self.regime_detector.get_strategy_for_regime(new_regime)
            
            # Update strategy
            self.strategy = TradingStrategy(bridge_url=self.strategy.bridge_url, parameters=params)
            self.current_regime = new_regime
            
            # Record regime change
            self.regime_history.append({
                'regime': new_regime,
                'parameters': params,
                'timestamp': datetime.now().isoformat()
            })
            
            print(f"🔄 Regime changed to: {new_regime}")
            print(f"   Updated parameters: {params}")
            
            return True
        
        return False
    
    def generate_signal(self, symbol: str = "XAUUSD", timeframe: str = "H1", count: int = 100) -> Dict:
        """
        Generate signal with adaptive strategy
        
        Args:
            symbol: Trading symbol
            timeframe: Timeframe
            count: Number of candles
        
        Returns:
            Signal dict
        """
        # Get candles
        candles = self.strategy.get_candlestick_data(symbol, timeframe, count)
        
        if not candles or len(candles) < 50:
            return {
                'signal': 'NEUTRAL',
                'confidence': 0,
                'reason': 'Insufficient data',
                'regime': self.current_regime or 'unknown'
            }
        
        # Update strategy if regime changed
        self.update_strategy(candles)
        
        # Generate signal with current strategy
        signal = self.strategy.generate_signal_from_chart(symbol, timeframe, count)
        
        # Add regime info
        signal['regime'] = self.current_regime
        signal['regime_description'] = self.regime_detector.get_strategy_for_regime(self.current_regime).get('description', '')
        
        return signal
    
    def get_regime_history(self) -> List[Dict]:
        """Get history of regime changes"""
        return self.regime_history

if __name__ == "__main__":
    from datetime import datetime
    
    # Test adaptive strategy
    strategy = AdaptiveStrategy()
    print("✅ Adaptive Strategy initialized")
