#!/usr/bin/env python3
"""
Parameter Optimization Engine
Grid search en genetic algorithm voor beste strategie parameters
"""

from typing import Dict, List, Optional, Tuple
from backtesting_engine import BacktestingEngine
from trading_strategy import TradingStrategy
from performance_metrics import PerformanceMetrics
import itertools
import random
import copy

class ParameterOptimizer:
    def __init__(self, strategy_class, bridge_url: str = "http://localhost:5002"):
        self.strategy_class = strategy_class
        self.bridge_url = bridge_url
        self.parameter_ranges = {
            'sma_short': [10, 15, 20, 25, 30],
            'sma_long': [40, 50, 60, 70, 80],
            'rsi_period': [12, 14, 16, 18],
            'confidence_threshold': [55, 60, 65, 70],
            'risk_reward_ratio': [1.5, 2.0, 2.5, 3.0]
        }
        self.optimization_results = []
    
    def grid_search(self, symbol: str = "XAUUSD", timeframe: str = "H1", 
                    days: int = 30, volume: float = 0.20,
                    objective: str = 'sharpe_ratio', max_combinations: int = 100) -> Dict:
        """
        Grid search over parameter ranges
        
        Args:
            symbol: Trading symbol
            timeframe: Timeframe
            days: Days of historical data
            volume: Trade volume
            objective: Objective metric ('sharpe_ratio', 'profit_factor', 'win_rate', 'total_return')
            max_combinations: Maximum combinations to test (to limit computation time)
        
        Returns:
            Best parameters and results
        """
        print(f"\n{'='*70}")
        print(f"🔍 PARAMETER OPTIMIZATION - Grid Search")
        print(f"{'='*70}")
        print(f"Symbol: {symbol}")
        print(f"Timeframe: {timeframe}")
        print(f"Period: {days} days")
        print(f"Objective: {objective}")
        print()
        
        # Generate all parameter combinations
        param_names = list(self.parameter_ranges.keys())
        param_values = [self.parameter_ranges[name] for name in param_names]
        
        all_combinations = list(itertools.product(*param_values))
        
        # Limit combinations if too many
        if len(all_combinations) > max_combinations:
            print(f"⚠️  {len(all_combinations)} combinations found, limiting to {max_combinations}")
            all_combinations = random.sample(all_combinations, max_combinations)
        
        print(f"📊 Testing {len(all_combinations)} parameter combinations...")
        print()
        
        best_result = None
        best_score = float('-inf')
        results = []
        
        for i, combination in enumerate(all_combinations):
            params = dict(zip(param_names, combination))
            
            # Skip invalid combinations
            if params['sma_short'] >= params['sma_long']:
                continue
            
            print(f"  [{i+1}/{len(all_combinations)}] Testing: {params}")
            
            try:
                # Create strategy with these parameters
                strategy = self._create_strategy_with_params(params)
                
                # Run backtest
                engine = BacktestingEngine(strategy, initial_balance=100000.0, bridge_url=self.bridge_url)
                backtest_result = engine.run_backtest(
                    symbol=symbol,
                    timeframe=timeframe,
                    days=days,
                    volume=volume
                )
                
                if backtest_result.get('error'):
                    print(f"    ⚠️  Error: {backtest_result.get('error')}")
                    continue
                
                # Get objective score
                metrics = backtest_result.get('metrics', {})
                score = self._calculate_objective_score(metrics, objective)
                
                result = {
                    'parameters': params,
                    'metrics': metrics,
                    'score': score,
                    'total_return': backtest_result.get('total_return_pct', 0),
                    'backtest_result': backtest_result
                }
                
                results.append(result)
                
                # Track best
                if score > best_score:
                    best_score = score
                    best_result = result
                    print(f"    ✅ New best! Score: {score:.2f} ({objective})")
                else:
                    print(f"    Score: {score:.2f}")
            
            except Exception as e:
                print(f"    ❌ Error: {e}")
                continue
        
        print()
        print("="*70)
        print("📊 OPTIMIZATION RESULTS")
        print("="*70)
        
        if best_result:
            print(f"\n🏆 Best Parameters (Score: {best_score:.2f}):")
            for key, value in best_result['parameters'].items():
                print(f"  {key}: {value}")
            
            print(f"\n📈 Performance:")
            metrics = best_result['metrics']
            print(f"  Win Rate: {metrics.get('win_rate', 0):.2f}%")
            print(f"  Total Return: {best_result['total_return']:.2f}%")
            print(f"  Profit Factor: {metrics.get('profit_factor', 0):.2f}")
            print(f"  Sharpe Ratio: {metrics.get('sharpe_ratio', 0):.2f}")
            print(f"  Max Drawdown: {metrics.get('max_drawdown_pct', 0):.2f}%")
        
        # Sort results by score
        results.sort(key=lambda x: x['score'], reverse=True)
        
        return {
            'best_parameters': best_result['parameters'] if best_result else None,
            'best_score': best_score,
            'best_metrics': best_result['metrics'] if best_result else {},
            'all_results': results[:10],  # Top 10
            'total_tested': len(results),
            'objective': objective
        }
    
    def genetic_algorithm(self, symbol: str = "XAUUSD", timeframe: str = "H1",
                         days: int = 30, volume: float = 0.20,
                         population_size: int = 20, generations: int = 10,
                         objective: str = 'sharpe_ratio') -> Dict:
        """
        Genetic algorithm voor parameter optimization
        
        Args:
            symbol: Trading symbol
            timeframe: Timeframe
            days: Days of historical data
            volume: Trade volume
            population_size: Size of population per generation
            generations: Number of generations
            objective: Objective metric
        
        Returns:
            Best parameters and results
        """
        print(f"\n{'='*70}")
        print(f"🧬 PARAMETER OPTIMIZATION - Genetic Algorithm")
        print(f"{'='*70}")
        print(f"Population Size: {population_size}")
        print(f"Generations: {generations}")
        print(f"Objective: {objective}")
        print()
        
        # Initialize population
        population = self._initialize_population(population_size)
        
        best_ever = None
        best_ever_score = float('-inf')
        
        for generation in range(generations):
            print(f"🔄 Generation {generation + 1}/{generations}")
            
            # Evaluate population
            evaluated = []
            for i, individual in enumerate(population):
                print(f"  [{i+1}/{len(population)}] Testing parameters...")
                
                try:
                    strategy = self._create_strategy_with_params(individual)
                    engine = BacktestingEngine(strategy, initial_balance=100000.0, bridge_url=self.bridge_url)
                    backtest_result = engine.run_backtest(symbol, timeframe, days, volume)
                    
                    if backtest_result.get('error'):
                        continue
                    
                    metrics = backtest_result.get('metrics', {})
                    score = self._calculate_objective_score(metrics, objective)
                    
                    evaluated.append({
                        'parameters': individual,
                        'score': score,
                        'metrics': metrics,
                        'backtest_result': backtest_result
                    })
                    
                    if score > best_ever_score:
                        best_ever_score = score
                        best_ever = evaluated[-1]
                        print(f"    ✅ New best! Score: {score:.2f}")
                
                except Exception as e:
                    print(f"    ❌ Error: {e}")
                    continue
            
            if not evaluated:
                print("  ⚠️  No valid results in this generation")
                continue
            
            # Sort by score
            evaluated.sort(key=lambda x: x['score'], reverse=True)
            
            print(f"  Best in generation: {evaluated[0]['score']:.2f}")
            print(f"  Average score: {sum(x['score'] for x in evaluated) / len(evaluated):.2f}")
            
            # Create next generation
            if generation < generations - 1:
                population = self._create_next_generation(evaluated, population_size)
        
        print()
        print("="*70)
        print("📊 OPTIMIZATION RESULTS")
        print("="*70)
        
        if best_ever:
            print(f"\n🏆 Best Parameters (Score: {best_ever_score:.2f}):")
            for key, value in best_ever['parameters'].items():
                print(f"  {key}: {value}")
            
            print(f"\n📈 Performance:")
            metrics = best_ever['metrics']
            print(f"  Win Rate: {metrics.get('win_rate', 0):.2f}%")
            print(f"  Profit Factor: {metrics.get('profit_factor', 0):.2f}")
            print(f"  Sharpe Ratio: {metrics.get('sharpe_ratio', 0):.2f}")
        
        return {
            'best_parameters': best_ever['parameters'] if best_ever else None,
            'best_score': best_ever_score,
            'best_metrics': best_ever['metrics'] if best_ever else {},
            'objective': objective
        }
    
    def _create_strategy_with_params(self, params: Dict) -> TradingStrategy:
        """Create strategy instance with custom parameters"""
        strategy = TradingStrategy(bridge_url=self.bridge_url, parameters=params)
        return strategy
    
    def _calculate_objective_score(self, metrics: Dict, objective: str) -> float:
        """Calculate objective score from metrics"""
        if objective == 'sharpe_ratio':
            return metrics.get('sharpe_ratio', 0)
        elif objective == 'profit_factor':
            return metrics.get('profit_factor', 0)
        elif objective == 'win_rate':
            return metrics.get('win_rate', 0)
        elif objective == 'total_return':
            # Would need backtest result for this
            return 0
        elif objective == 'combined':
            # Combined score: weighted average
            sharpe = metrics.get('sharpe_ratio', 0) / 2.0  # Normalize
            pf = metrics.get('profit_factor', 0) / 3.0  # Normalize
            wr = metrics.get('win_rate', 0) / 100.0  # Normalize
            return (sharpe * 0.4 + pf * 0.4 + wr * 0.2) * 100
        else:
            return 0
    
    def _initialize_population(self, size: int) -> List[Dict]:
        """Initialize random population for genetic algorithm"""
        population = []
        for _ in range(size):
            individual = {}
            for param_name, param_range in self.parameter_ranges.items():
                individual[param_name] = random.choice(param_range)
            
            # Ensure valid combination
            if individual['sma_short'] < individual['sma_long']:
                population.append(individual)
            else:
                # Fix invalid combination
                individual['sma_short'] = random.choice([v for v in self.parameter_ranges['sma_short'] if v < individual['sma_long']])
                population.append(individual)
        
        return population
    
    def _create_next_generation(self, evaluated: List[Dict], size: int) -> List[Dict]:
        """Create next generation using selection, crossover, and mutation"""
        # Keep top 20%
        elite_size = max(1, int(size * 0.2))
        elite = [e['parameters'] for e in evaluated[:elite_size]]
        
        # Select parents (tournament selection)
        def tournament_select():
            tournament_size = 3
            tournament = random.sample(evaluated, min(tournament_size, len(evaluated)))
            return max(tournament, key=lambda x: x['score'])['parameters']
        
        # Create new generation
        new_population = elite.copy()
        
        while len(new_population) < size:
            # Crossover
            parent1 = tournament_select()
            parent2 = tournament_select()
            child = self._crossover(parent1, parent2)
            
            # Mutation
            child = self._mutate(child)
            
            # Ensure valid
            if child['sma_short'] < child['sma_long']:
                new_population.append(child)
        
        return new_population[:size]
    
    def _crossover(self, parent1: Dict, parent2: Dict) -> Dict:
        """Crossover two parents to create child"""
        child = {}
        for key in parent1.keys():
            # Randomly choose from parent1 or parent2
            child[key] = random.choice([parent1[key], parent2[key]])
        return child
    
    def _mutate(self, individual: Dict, mutation_rate: float = 0.1) -> Dict:
        """Mutate individual with small probability"""
        mutated = copy.deepcopy(individual)
        for key in mutated.keys():
            if random.random() < mutation_rate:
                mutated[key] = random.choice(self.parameter_ranges[key])
        
        # Ensure still valid
        if mutated['sma_short'] >= mutated['sma_long']:
            mutated['sma_short'] = random.choice([v for v in self.parameter_ranges['sma_short'] if v < mutated['sma_long']])
        
        return mutated

if __name__ == "__main__":
    # Test parameter optimizer
    optimizer = ParameterOptimizer(TradingStrategy)
    
    print("Testing Grid Search...")
    results = optimizer.grid_search(
        symbol="XAUUSD",
        timeframe="H1",
        days=7,  # Test met 7 dagen
        max_combinations=10  # Limit voor test
    )
    
    print(f"\nBest parameters: {results['best_parameters']}")
