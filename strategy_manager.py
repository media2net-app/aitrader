#!/usr/bin/env python3
"""
Strategy Manager
Versioning en auto-update van strategie parameters
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Optional
from trading_strategy import TradingStrategy

class StrategyManager:
    def __init__(self, storage_file: str = 'strategies.json'):
        self.storage_file = storage_file
        self.strategies = {}
        self.current_strategy_name = None
        self.load_strategies()
    
    def load_strategies(self):
        """Load strategies from storage"""
        if os.path.exists(self.storage_file):
            try:
                with open(self.storage_file, 'r') as f:
                    data = json.load(f)
                    self.strategies = data.get('strategies', {})
                    self.current_strategy_name = data.get('current_strategy', None)
            except Exception as e:
                print(f"Error loading strategies: {e}")
                self.strategies = {}
        else:
            self.strategies = {}
    
    def save_strategies(self):
        """Save strategies to storage"""
        try:
            data = {
                'strategies': self.strategies,
                'current_strategy': self.current_strategy_name,
                'last_updated': datetime.now().isoformat()
            }
            with open(self.storage_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Error saving strategies: {e}")
    
    def save_strategy(self, name: str, parameters: Dict, performance: Dict, 
                     description: str = "", version: int = 1) -> bool:
        """
        Save a strategy with parameters and performance
        
        Args:
            name: Strategy name
            parameters: Strategy parameters
            performance: Performance metrics
            description: Strategy description
            version: Version number (auto-incremented if strategy exists)
        
        Returns:
            True if successful
        """
        if name not in self.strategies:
            self.strategies[name] = {
                'versions': [],
                'created_at': datetime.now().isoformat(),
                'description': description
            }
        
        # Check if this version already exists
        existing_versions = [v['version'] for v in self.strategies[name]['versions']]
        if version in existing_versions:
            version = max(existing_versions) + 1
        
        strategy_version = {
            'version': version,
            'parameters': parameters,
            'performance': performance,
            'created_at': datetime.now().isoformat(),
            'is_active': False
        }
        
        self.strategies[name]['versions'].append(strategy_version)
        self.strategies[name]['last_updated'] = datetime.now().isoformat()
        
        self.save_strategies()
        return True
    
    def get_strategy(self, name: str, version: Optional[int] = None) -> Optional[Dict]:
        """
        Get strategy by name and optional version
        
        Args:
            name: Strategy name
            version: Version number (None for latest)
        
        Returns:
            Strategy dict or None
        """
        if name not in self.strategies:
            return None
        
        versions = self.strategies[name]['versions']
        if not versions:
            return None
        
        if version is None:
            # Get latest version
            return max(versions, key=lambda v: v['version'])
        else:
            # Get specific version
            for v in versions:
                if v['version'] == version:
                    return v
        
        return None
    
    def get_all_strategies(self) -> Dict:
        """Get all strategies"""
        return self.strategies
    
    def get_best_strategy(self, objective: str = 'sharpe_ratio') -> Optional[Dict]:
        """
        Get best strategy based on objective metric
        
        Args:
            objective: Objective metric ('sharpe_ratio', 'profit_factor', 'win_rate')
        
        Returns:
            Best strategy dict or None
        """
        best_strategy = None
        best_score = float('-inf')
        
        for name, strategy_data in self.strategies.items():
            for version in strategy_data['versions']:
                performance = version.get('performance', {})
                score = performance.get(objective, 0)
                
                if score > best_score:
                    best_score = score
                    best_strategy = {
                        'name': name,
                        'version': version['version'],
                        'parameters': version['parameters'],
                        'performance': performance,
                        'score': score
                    }
        
        return best_strategy
    
    def set_active_strategy(self, name: str, version: int) -> bool:
        """
        Set a strategy version as active
        
        Args:
            name: Strategy name
            version: Version number
        
        Returns:
            True if successful
        """
        if name not in self.strategies:
            return False
        
        # Deactivate all versions
        for strategy_name, strategy_data in self.strategies.items():
            for v in strategy_data['versions']:
                v['is_active'] = False
        
        # Activate specified version
        for v in self.strategies[name]['versions']:
            if v['version'] == version:
                v['is_active'] = True
                self.current_strategy_name = name
                self.save_strategies()
                return True
        
        return False
    
    def get_active_strategy(self) -> Optional[Dict]:
        """Get currently active strategy"""
        for name, strategy_data in self.strategies.items():
            for version in strategy_data['versions']:
                if version.get('is_active', False):
                    return {
                        'name': name,
                        'version': version['version'],
                        'parameters': version['parameters'],
                        'performance': version.get('performance', {})
                    }
        return None
    
    def create_strategy_instance(self, name: str = None, version: int = None) -> Optional[TradingStrategy]:
        """
        Create TradingStrategy instance from saved strategy
        
        Args:
            name: Strategy name (None for active strategy)
            version: Version number (None for latest/active)
        
        Returns:
            TradingStrategy instance or None
        """
        if name is None:
            active = self.get_active_strategy()
            if active:
                name = active['name']
                version = active['version']
            else:
                return None
        
        strategy_data = self.get_strategy(name, version)
        if not strategy_data:
            return None
        
        parameters = strategy_data.get('parameters', {})
        return TradingStrategy(parameters=parameters)
    
    def update_strategy(self, name: str, new_parameters: Dict, 
                       performance: Dict = None, description: str = "") -> bool:
        """
        Update strategy with new parameters (creates new version)
        
        Args:
            name: Strategy name
            new_parameters: New parameters
            performance: Performance metrics (optional)
            description: Strategy description
        
        Returns:
            True if successful
        """
        if name not in self.strategies:
            # Create new strategy
            version = 1
        else:
            # Get next version number
            versions = self.strategies[name]['versions']
            version = max([v['version'] for v in versions], default=0) + 1
        
        return self.save_strategy(
            name=name,
            parameters=new_parameters,
            performance=performance or {},
            description=description,
            version=version
        )
    
    def delete_strategy(self, name: str) -> bool:
        """Delete a strategy"""
        if name in self.strategies:
            del self.strategies[name]
            if self.current_strategy_name == name:
                self.current_strategy_name = None
            self.save_strategies()
            return True
        return False
    
    def compare_strategies(self, strategy_names: List[str] = None) -> List[Dict]:
        """
        Compare multiple strategies
        
        Args:
            strategy_names: List of strategy names (None for all)
        
        Returns:
            List of comparison data
        """
        if strategy_names is None:
            strategy_names = list(self.strategies.keys())
        
        comparisons = []
        for name in strategy_names:
            if name not in self.strategies:
                continue
            
            # Get best version for this strategy
            best_version = None
            best_sharpe = float('-inf')
            
            for version in self.strategies[name]['versions']:
                sharpe = version.get('performance', {}).get('sharpe_ratio', 0)
                if sharpe > best_sharpe:
                    best_sharpe = sharpe
                    best_version = version
            
            if best_version:
                comparisons.append({
                    'name': name,
                    'version': best_version['version'],
                    'parameters': best_version['parameters'],
                    'performance': best_version.get('performance', {}),
                    'is_active': best_version.get('is_active', False)
                })
        
        # Sort by Sharpe ratio
        comparisons.sort(key=lambda x: x['performance'].get('sharpe_ratio', 0), reverse=True)
        
        return comparisons

if __name__ == "__main__":
    # Test strategy manager
    manager = StrategyManager()
    
    # Save a test strategy
    test_params = {
        'sma_short': 20,
        'sma_long': 50,
        'rsi_period': 14,
        'confidence_threshold': 60,
        'risk_reward_ratio': 2.0
    }
    
    test_performance = {
        'win_rate': 45.5,
        'sharpe_ratio': 0.85,
        'profit_factor': 1.25
    }
    
    manager.save_strategy('XAUUSD_Default', test_params, test_performance, 'Default XAUUSD strategy')
    print("✅ Strategy saved")
    
    # Get strategy
    strategy = manager.get_strategy('XAUUSD_Default')
    print(f"✅ Strategy loaded: {strategy['version']}")
    
    # Create instance
    instance = manager.create_strategy_instance('XAUUSD_Default')
    print(f"✅ Strategy instance created: {instance is not None}")
