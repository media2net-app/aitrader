#!/usr/bin/env python3
"""
ML Strategy Integration
Combineer ML model met technische analyse voor betere signalen
"""

from typing import Dict, List, Optional
from trading_strategy import TradingStrategy
from ml_model import MLTradingModel
from ml_features import MLFeatureEngineer

class MLTradingStrategy(TradingStrategy):
    def __init__(self, ml_model_path: Optional[str] = None, 
                 ml_weight: float = 0.6, bridge_url: str = "http://localhost:5002",
                 parameters: Optional[Dict] = None):
        """
        Initialize ML-enhanced trading strategy
        
        Args:
            ml_model_path: Path to trained ML model
            ml_weight: Weight for ML signal (0-1), rest goes to technical analysis
            bridge_url: MT5 bridge URL
            parameters: Strategy parameters
        """
        super().__init__(bridge_url=bridge_url, parameters=parameters)
        self.ml_weight = ml_weight
        self.ta_weight = 1.0 - ml_weight
        self.ml_model = None
        self.ml_available = False
        
        if ml_model_path:
            try:
                self.ml_model = MLTradingModel(model_path=ml_model_path)
                if self.ml_model.trained:
                    self.ml_available = True
                    print(f"✅ ML Model loaded: {ml_model_path}")
            except Exception as e:
                print(f"⚠️  Could not load ML model: {e}")
                print("   Falling back to technical analysis only")
    
    def generate_signal_from_chart(self, symbol: str = "XAUUSD", timeframe: str = "H1", count: int = 100) -> Dict:
        """
        Generate trading signal combining ML and technical analysis
        
        Args:
            symbol: Trading symbol
            timeframe: Timeframe
            count: Number of candles
        
        Returns:
            Combined signal dict
        """
        # Get base signal from technical analysis
        base_signal = super().generate_signal_from_chart(symbol, timeframe, count)
        
        # If ML not available, return base signal
        if not self.ml_available or not self.ml_model:
            return base_signal
        
        # Get ML prediction
        candles = self.get_candlestick_data(symbol, timeframe, count)
        if not candles or len(candles) < 50:
            return base_signal
        
        try:
            ml_prediction = self.ml_model.predict(candles)
            
            # Combine signals
            combined_signal = self._combine_signals(base_signal, ml_prediction)
            return combined_signal
        
        except Exception as e:
            print(f"⚠️  ML prediction error: {e}")
            return base_signal
    
    def _combine_signals(self, ta_signal: Dict, ml_signal: Dict) -> Dict:
        """
        Combine technical analysis and ML signals
        
        Args:
            ta_signal: Technical analysis signal
            ml_signal: ML model prediction
        
        Returns:
            Combined signal
        """
        ta_signal_type = ta_signal.get('signal', 'NEUTRAL')
        ta_confidence = ta_signal.get('confidence', 0)
        ml_signal_type = ml_signal.get('signal', 'NEUTRAL')
        ml_confidence = ml_signal.get('confidence', 0)
        
        # If both agree, high confidence
        if ta_signal_type == ml_signal_type and ta_signal_type != 'NEUTRAL':
            combined_confidence = (ta_confidence * self.ta_weight) + (ml_confidence * self.ml_weight)
            combined_confidence = min(100, combined_confidence * 1.2)  # Boost if both agree
            
            return {
                'signal': ta_signal_type,
                'confidence': round(combined_confidence, 1),
                'reason': f"TA: {ta_signal.get('reason', '')}; ML: {ml_signal_type} ({ml_confidence:.1f}%)",
                'analysis': {
                    **ta_signal.get('analysis', {}),
                    'ml_signal': ml_signal_type,
                    'ml_confidence': ml_confidence,
                    'ml_probabilities': ml_signal.get('probabilities', {}),
                    'ta_signal': ta_signal_type,
                    'ta_confidence': ta_confidence,
                    'combined_method': 'ML + Technical Analysis'
                },
                'tp_sl': ta_signal.get('tp_sl')  # Use TP/SL from technical analysis
            }
        
        # If they disagree, use weighted combination
        signals = {
            'BUY': 0,
            'SELL': 0,
            'NEUTRAL': 0
        }
        
        # Add TA signal
        if ta_signal_type != 'NEUTRAL':
            signals[ta_signal_type] += ta_confidence * self.ta_weight
        
        # Add ML signal
        if ml_signal_type != 'NEUTRAL':
            signals[ml_signal_type] += ml_confidence * self.ml_weight
        
        # Determine winner
        final_signal = max(signals, key=signals.get)
        final_confidence = signals[final_signal]
        
        # Only return signal if confidence is above threshold
        if final_confidence < self.confidence_threshold:
            final_signal = 'NEUTRAL'
            final_confidence = 50
        
        return {
            'signal': final_signal,
            'confidence': round(final_confidence, 1),
            'reason': f"TA: {ta_signal_type} ({ta_confidence:.1f}%), ML: {ml_signal_type} ({ml_confidence:.1f}%) - Combined",
            'analysis': {
                **ta_signal.get('analysis', {}),
                'ml_signal': ml_signal_type,
                'ml_confidence': ml_confidence,
                'ml_probabilities': ml_signal.get('probabilities', {}),
                'ta_signal': ta_signal_type,
                'ta_confidence': ta_confidence,
                'combined_method': 'ML + Technical Analysis',
                'signal_scores': signals
            },
            'tp_sl': ta_signal.get('tp_sl')
        }

if __name__ == "__main__":
    # Test ML strategy
    print("🧪 Testing ML Strategy...")
    
    strategy = MLTradingStrategy(ml_weight=0.6)
    print(f"✅ ML Strategy initialized")
    print(f"   ML Available: {strategy.ml_available}")
    print(f"   ML Weight: {strategy.ml_weight}")
    print(f"   TA Weight: {strategy.ta_weight}")
