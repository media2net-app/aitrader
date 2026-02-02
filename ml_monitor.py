#!/usr/bin/env python3
"""
ML Model Monitoring
Track model performance en retrain periodiek
"""

import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from ml_model import MLTradingModel

class MLModelMonitor:
    def __init__(self, storage_file: str = 'ml_model_performance.json'):
        self.storage_file = storage_file
        self.performance_history = []
        self.load_history()
    
    def load_history(self):
        """Load performance history from storage"""
        if os.path.exists(self.storage_file):
            try:
                with open(self.storage_file, 'r') as f:
                    data = json.load(f)
                    self.performance_history = data.get('history', [])
            except Exception as e:
                print(f"Error loading ML performance history: {e}")
                self.performance_history = []
        else:
            self.performance_history = []
    
    def save_history(self):
        """Save performance history to storage"""
        try:
            data = {
                'history': self.performance_history,
                'last_updated': datetime.now().isoformat()
            }
            with open(self.storage_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Error saving ML performance history: {e}")
    
    def record_prediction(self, prediction: Dict, actual_outcome: str, 
                         trade_result: Optional[Dict] = None):
        """
        Record a prediction and its outcome
        
        Args:
            prediction: ML prediction dict
            actual_outcome: Actual signal that occurred ('BUY', 'SELL', 'NEUTRAL')
            trade_result: Trade result if trade was executed (optional)
        """
        record = {
            'timestamp': datetime.now().isoformat(),
            'predicted_signal': prediction.get('signal'),
            'predicted_confidence': prediction.get('confidence', 0),
            'actual_outcome': actual_outcome,
            'correct': prediction.get('signal') == actual_outcome,
            'trade_result': trade_result,
            'probabilities': prediction.get('probabilities', {})
        }
        
        self.performance_history.append(record)
        
        # Keep only last 1000 records
        if len(self.performance_history) > 1000:
            self.performance_history = self.performance_history[-1000:]
        
        self.save_history()
    
    def get_performance_stats(self, days: int = 30) -> Dict:
        """
        Get performance statistics for recent period
        
        Args:
            days: Number of days to analyze
        
        Returns:
            Performance statistics
        """
        cutoff_date = datetime.now() - timedelta(days=days)
        
        recent_records = [
            r for r in self.performance_history
            if datetime.fromisoformat(r['timestamp']) >= cutoff_date
        ]
        
        if not recent_records:
            return {
                'total_predictions': 0,
                'accuracy': 0,
                'correct_predictions': 0,
                'incorrect_predictions': 0
            }
        
        correct = sum(1 for r in recent_records if r.get('correct', False))
        total = len(recent_records)
        accuracy = (correct / total * 100) if total > 0 else 0
        
        # Signal-specific accuracy
        buy_predictions = [r for r in recent_records if r['predicted_signal'] == 'BUY']
        sell_predictions = [r for r in recent_records if r['predicted_signal'] == 'SELL']
        
        buy_accuracy = sum(1 for r in buy_predictions if r.get('correct', False)) / len(buy_predictions) * 100 if buy_predictions else 0
        sell_accuracy = sum(1 for r in sell_predictions if r.get('correct', False)) / len(sell_predictions) * 100 if sell_predictions else 0
        
        return {
            'total_predictions': total,
            'accuracy': round(accuracy, 2),
            'correct_predictions': correct,
            'incorrect_predictions': total - correct,
            'buy_accuracy': round(buy_accuracy, 2),
            'sell_accuracy': round(sell_accuracy, 2),
            'buy_predictions': len(buy_predictions),
            'sell_predictions': len(sell_predictions)
        }
    
    def should_retrain(self, min_accuracy: float = 50.0, min_predictions: int = 100) -> bool:
        """
        Determine if model should be retrained
        
        Args:
            min_accuracy: Minimum accuracy threshold
            min_predictions: Minimum number of predictions needed
        
        Returns:
            True if model should be retrained
        """
        stats = self.get_performance_stats(days=30)
        
        if stats['total_predictions'] < min_predictions:
            return False
        
        if stats['accuracy'] < min_accuracy:
            return True
        
        return False
    
    def get_recent_accuracy_trend(self, days: int = 7) -> List[float]:
        """Get daily accuracy trend"""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        recent_records = [
            r for r in self.performance_history
            if datetime.fromisoformat(r['timestamp']) >= cutoff_date
        ]
        
        # Group by day
        daily_accuracy = {}
        for record in recent_records:
            date = datetime.fromisoformat(record['timestamp']).date()
            if date not in daily_accuracy:
                daily_accuracy[date] = {'correct': 0, 'total': 0}
            
            daily_accuracy[date]['total'] += 1
            if record.get('correct', False):
                daily_accuracy[date]['correct'] += 1
        
        # Calculate accuracy per day
        trend = []
        for date in sorted(daily_accuracy.keys()):
            acc = daily_accuracy[date]
            accuracy = (acc['correct'] / acc['total'] * 100) if acc['total'] > 0 else 0
            trend.append(accuracy)
        
        return trend

if __name__ == "__main__":
    # Test ML monitor
    monitor = MLModelMonitor()
    
    # Record some test predictions
    monitor.record_prediction(
        {'signal': 'BUY', 'confidence': 75},
        'BUY'
    )
    
    stats = monitor.get_performance_stats()
    print(f"Performance Stats: {stats}")
