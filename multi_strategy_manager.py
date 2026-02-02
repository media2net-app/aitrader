#!/usr/bin/env python3
"""
Multi-Strategy Manager
Run meerdere strategieën tegelijk met portfolio management
"""

from typing import Dict, List, Optional
from trading_strategy import TradingStrategy
from ml_strategy import MLTradingStrategy
from adaptive_strategy import AdaptiveStrategy

class MultiStrategyManager:
    def __init__(self, bridge_url: str = "http://localhost:5002"):
        self.bridge_url = bridge_url
        self.strategies = {}
        self.performance_tracker = {}
        self.weights = {}
        self.total_weight = 0.0
    
    def add_strategy(self, name: str, strategy_type: str = 'standard', 
                    weight: float = 1.0, parameters: Optional[Dict] = None,
                    ml_model_path: Optional[str] = None) -> bool:
        """
        Add a strategy to the portfolio
        
        Args:
            name: Strategy name
            strategy_type: 'standard', 'ml', or 'adaptive'
            weight: Weight for this strategy (for signal combination)
            parameters: Strategy parameters
            ml_model_path: Path to ML model (for ML strategy)
        
        Returns:
            True if successful
        """
        try:
            if strategy_type == 'ml' and ml_model_path:
                strategy = MLTradingStrategy(
                    ml_model_path=ml_model_path,
                    bridge_url=self.bridge_url,
                    parameters=parameters
                )
            elif strategy_type == 'adaptive':
                strategy = AdaptiveStrategy(bridge_url=self.bridge_url)
            else:
                strategy = TradingStrategy(
                    bridge_url=self.bridge_url,
                    parameters=parameters
                )
            
            self.strategies[name] = {
                'strategy': strategy,
                'type': strategy_type,
                'weight': weight,
                'performance': {
                    'total_trades': 0,
                    'winning_trades': 0,
                    'losing_trades': 0,
                    'total_pnl': 0.0
                }
            }
            
            self.weights[name] = weight
            self.total_weight = sum(self.weights.values())
            
            print(f"✅ Strategy '{name}' added ({strategy_type})")
            return True
        
        except Exception as e:
            print(f"❌ Error adding strategy '{name}': {e}")
            return False
    
    def remove_strategy(self, name: str) -> bool:
        """Remove a strategy from portfolio"""
        if name in self.strategies:
            del self.strategies[name]
            if name in self.weights:
                del self.weights[name]
            self.total_weight = sum(self.weights.values())
            return True
        return False
    
    def generate_combined_signal(self, symbol: str = "XAUUSD", timeframe: str = "H1", count: int = 100) -> Dict:
        """
        Generate combined signal from all strategies
        
        Args:
            symbol: Trading symbol
            timeframe: Timeframe
            count: Number of candles
        
        Returns:
            Combined signal dict
        """
        if not self.strategies:
            return {
                'signal': 'NEUTRAL',
                'confidence': 0,
                'reason': 'No strategies configured'
            }
        
        signals = {}
        total_confidence = 0
        
        # Get signals from all strategies
        for name, config in self.strategies.items():
            try:
                strategy = config['strategy']
                weight = config['weight']
                
                signal_data = strategy.generate_signal_from_chart(symbol, timeframe, count)
                signal_type = signal_data.get('signal', 'NEUTRAL')
                confidence = signal_data.get('confidence', 0)
                
                signals[name] = {
                    'signal': signal_type,
                    'confidence': confidence,
                    'weight': weight,
                    'weighted_confidence': confidence * weight,
                    'reason': signal_data.get('reason', '')
                }
                
                total_confidence += confidence * weight
            
            except Exception as e:
                print(f"⚠️  Error getting signal from '{name}': {e}")
                continue
        
        if not signals:
            return {
                'signal': 'NEUTRAL',
                'confidence': 0,
                'reason': 'No valid signals from strategies'
            }
        
        # Weighted combination
        buy_score = sum(s['weighted_confidence'] for s in signals.values() if s['signal'] == 'BUY')
        sell_score = sum(s['weighted_confidence'] for s in signals.values() if s['signal'] == 'SELL')
        neutral_score = sum(s['weighted_confidence'] for s in signals.values() if s['signal'] == 'NEUTRAL')
        
        # Determine final signal
        if buy_score > sell_score and buy_score > neutral_score:
            final_signal = 'BUY'
            final_confidence = buy_score / self.total_weight if self.total_weight > 0 else 0
        elif sell_score > buy_score and sell_score > neutral_score:
            final_signal = 'SELL'
            final_confidence = sell_score / self.total_weight if self.total_weight > 0 else 0
        else:
            final_signal = 'NEUTRAL'
            final_confidence = 50
        
        # Generate reason
        reasons = []
        for name, signal_info in signals.items():
            if signal_info['signal'] != 'NEUTRAL':
                reasons.append(f"{name}: {signal_info['signal']} ({signal_info['confidence']:.1f}%)")
        
        reason = "; ".join(reasons) if reasons else "All strategies neutral"
        
        return {
            'signal': final_signal,
            'confidence': round(final_confidence, 1),
            'reason': reason,
            'strategy_signals': signals,
            'buy_score': buy_score,
            'sell_score': sell_score,
            'neutral_score': neutral_score,
            'total_strategies': len(self.strategies)
        }
    
    def update_weights(self, performance_data: Dict[str, Dict]):
        """
        Update strategy weights based on recent performance
        
        Args:
            performance_data: Dict of {strategy_name: {win_rate, sharpe_ratio, etc.}}
        """
        if not performance_data:
            return
        
        # Calculate new weights based on performance
        total_score = 0
        scores = {}
        
        for name in self.strategies.keys():
            perf = performance_data.get(name, {})
            # Combined score from multiple metrics
            win_rate = perf.get('win_rate', 50) / 100
            sharpe = perf.get('sharpe_ratio', 0) / 2.0  # Normalize
            profit_factor = perf.get('profit_factor', 1) / 3.0  # Normalize
            
            score = (win_rate * 0.4 + sharpe * 0.3 + profit_factor * 0.3) * 100
            scores[name] = max(0.1, score)  # Minimum weight of 0.1
            total_score += scores[name]
        
        # Normalize weights
        if total_score > 0:
            for name in self.strategies.keys():
                new_weight = scores[name] / total_score
                self.strategies[name]['weight'] = new_weight
                self.weights[name] = new_weight
            
            self.total_weight = sum(self.weights.values())
            print("✅ Strategy weights updated based on performance")
    
    def get_portfolio_status(self) -> Dict:
        """Get status of all strategies in portfolio"""
        status = {
            'total_strategies': len(self.strategies),
            'strategies': {}
        }
        
        for name, config in self.strategies.items():
            status['strategies'][name] = {
                'type': config['type'],
                'weight': config['weight'],
                'performance': config['performance']
            }
        
        return status

if __name__ == "__main__":
    # Test multi-strategy manager
    manager = MultiStrategyManager()
    
    # Add strategies
    manager.add_strategy('Technical', 'standard', weight=1.0)
    manager.add_strategy('Adaptive', 'adaptive', weight=1.0)
    
    print(f"✅ Multi-Strategy Manager initialized")
    print(f"   Strategies: {list(manager.strategies.keys())}")
