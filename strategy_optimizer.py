"""
Strategy Optimization Engine

Automatically optimizes strategy parameters using genetic algorithms and grid search.
"""

import asyncio
import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Any, Optional
from dataclasses import dataclass, field
import json
import itertools
import random
from concurrent.futures import ProcessPoolExecutor
import multiprocessing

from backtesting_engine import BacktestingEngine
from historical_data_manager import HistoricalDataManager

logger = logging.getLogger(__name__)


@dataclass
class ParameterRange:
    """Parameter optimization range"""
    name: str
    min_value: float
    max_value: float
    step: float = None
    values: List[Any] = None
    param_type: str = 'float'  # 'float', 'int', 'choice'
    

@dataclass
class OptimizationResult:
    """Results of parameter optimization"""
    parameters: Dict[str, Any]
    performance_metrics: Dict[str, float]
    backtest_result: Any
    fitness_score: float
    rank: int = 0
    

@dataclass
class OptimizationConfig:
    """Optimization configuration"""
    strategy_class: Any
    parameter_ranges: List[ParameterRange]
    pairs: List[str]
    start_date: datetime
    end_date: datetime
    timeframe: str = '5m'
    optimization_metric: str = 'sharpe_ratio'  # What to optimize for
    max_iterations: int = 100
    population_size: int = 50
    elite_percentage: float = 0.2
    mutation_rate: float = 0.1
    crossover_rate: float = 0.7
    

class StrategyOptimizer:
    """
    Advanced strategy parameter optimization using genetic algorithms
    """
    
    def __init__(self, data_manager: HistoricalDataManager = None):
        self.data_manager = data_manager
        self.optimization_history = []
        
    async def optimize_parameters(
        self,
        config: OptimizationConfig,
        method: str = 'genetic'  # 'genetic', 'grid', 'random'
    ) -> List[OptimizationResult]:
        """
        Optimize strategy parameters using specified method
        """
        logger.info(f"🧬 Starting {method} optimization for {config.strategy_class.__name__}")
        logger.info(f"Optimizing {config.optimization_metric} over {len(config.parameter_ranges)} parameters")
        
        if method == 'genetic':
            return await self._genetic_optimization(config)
        elif method == 'grid':
            return await self._grid_search_optimization(config)
        elif method == 'random':
            return await self._random_search_optimization(config)
        else:
            raise ValueError(f"Unknown optimization method: {method}")
            
    async def _genetic_optimization(self, config: OptimizationConfig) -> List[OptimizationResult]:
        """Genetic algorithm optimization"""
        
        # Initialize population
        population = self._generate_initial_population(config)
        logger.info(f"Generated initial population of {len(population)} individuals")
        
        best_results = []
        
        for generation in range(config.max_iterations):
            logger.info(f"Generation {generation + 1}/{config.max_iterations}")
            
            # Evaluate population
            fitness_scores = await self._evaluate_population(population, config)
            
            # Create results with fitness scores
            generation_results = []
            for i, params in enumerate(population):
                if fitness_scores[i] is not None:
                    result = OptimizationResult(
                        parameters=params,
                        performance_metrics=fitness_scores[i]['metrics'],
                        backtest_result=fitness_scores[i]['backtest'],
                        fitness_score=fitness_scores[i]['fitness']
                    )
                    generation_results.append(result)
                    
            # Sort by fitness
            generation_results.sort(key=lambda x: x.fitness_score, reverse=True)
            
            # Track best result
            if generation_results:
                best_result = generation_results[0]
                best_results.append(best_result)
                
                logger.info(f"Best fitness: {best_result.fitness_score:.4f} "
                          f"({config.optimization_metric}: {best_result.performance_metrics.get(config.optimization_metric, 0):.4f})")
                
            # Check convergence
            if len(best_results) > 5:
                recent_fitness = [r.fitness_score for r in best_results[-5:]]
                if max(recent_fitness) - min(recent_fitness) < 0.001:
                    logger.info(f"Converged after {generation + 1} generations")
                    break
                    
            # Create next generation
            if generation < config.max_iterations - 1:
                population = self._create_next_generation(generation_results, config)
                
        # Return top results
        final_results = sorted(best_results, key=lambda x: x.fitness_score, reverse=True)
        
        # Add ranks
        for i, result in enumerate(final_results):
            result.rank = i + 1
            
        logger.info(f"Optimization completed. Best {config.optimization_metric}: "
                   f"{final_results[0].performance_metrics.get(config.optimization_metric, 0):.4f}")
        
        return final_results[:10]  # Return top 10
        
    async def _grid_search_optimization(self, config: OptimizationConfig) -> List[OptimizationResult]:
        """Grid search optimization"""
        
        # Generate all parameter combinations
        param_combinations = self._generate_grid_combinations(config.parameter_ranges)
        
        if len(param_combinations) > 1000:
            logger.warning(f"Grid search has {len(param_combinations)} combinations. This may take a while.")
            # Sample randomly if too many combinations
            param_combinations = random.sample(param_combinations, 1000)
            
        logger.info(f"Testing {len(param_combinations)} parameter combinations")
        
        # Evaluate all combinations
        fitness_scores = await self._evaluate_population(param_combinations, config)
        
        # Create results
        results = []
        for i, params in enumerate(param_combinations):
            if fitness_scores[i] is not None:
                result = OptimizationResult(
                    parameters=params,
                    performance_metrics=fitness_scores[i]['metrics'],
                    backtest_result=fitness_scores[i]['backtest'],
                    fitness_score=fitness_scores[i]['fitness']
                )
                results.append(result)
                
        # Sort and rank
        results.sort(key=lambda x: x.fitness_score, reverse=True)
        for i, result in enumerate(results):
            result.rank = i + 1
            
        logger.info(f"Grid search completed. Best {config.optimization_metric}: "
                   f"{results[0].performance_metrics.get(config.optimization_metric, 0):.4f}")
        
        return results[:20]  # Return top 20
        
    async def _random_search_optimization(self, config: OptimizationConfig) -> List[OptimizationResult]:
        """Random search optimization"""
        
        # Generate random parameter combinations
        population = []
        for _ in range(config.max_iterations):
            params = self._generate_random_parameters(config.parameter_ranges)
            population.append(params)
            
        logger.info(f"Testing {len(population)} random parameter combinations")
        
        # Evaluate population
        fitness_scores = await self._evaluate_population(population, config)
        
        # Create results
        results = []
        for i, params in enumerate(population):
            if fitness_scores[i] is not None:
                result = OptimizationResult(
                    parameters=params,
                    performance_metrics=fitness_scores[i]['metrics'],
                    backtest_result=fitness_scores[i]['backtest'],
                    fitness_score=fitness_scores[i]['fitness']
                )
                results.append(result)
                
        # Sort and rank
        results.sort(key=lambda x: x.fitness_score, reverse=True)
        for i, result in enumerate(results):
            result.rank = i + 1
            
        logger.info(f"Random search completed. Best {config.optimization_metric}: "
                   f"{results[0].performance_metrics.get(config.optimization_metric, 0):.4f}")
        
        return results[:15]  # Return top 15
        
    def _generate_initial_population(self, config: OptimizationConfig) -> List[Dict[str, Any]]:
        """Generate initial population for genetic algorithm"""
        population = []
        
        for _ in range(config.population_size):
            params = self._generate_random_parameters(config.parameter_ranges)
            population.append(params)
            
        return population
        
    def _generate_random_parameters(self, parameter_ranges: List[ParameterRange]) -> Dict[str, Any]:
        """Generate random parameters within specified ranges"""
        params = {}
        
        for param_range in parameter_ranges:
            if param_range.param_type == 'choice' and param_range.values:
                params[param_range.name] = random.choice(param_range.values)
            elif param_range.param_type == 'int':
                params[param_range.name] = random.randint(
                    int(param_range.min_value), int(param_range.max_value)
                )
            else:  # float
                params[param_range.name] = random.uniform(
                    param_range.min_value, param_range.max_value
                )
                
        return params
        
    def _generate_grid_combinations(self, parameter_ranges: List[ParameterRange]) -> List[Dict[str, Any]]:
        """Generate all combinations for grid search"""
        
        # Create value lists for each parameter
        param_values = {}
        
        for param_range in parameter_ranges:
            if param_range.param_type == 'choice' and param_range.values:
                param_values[param_range.name] = param_range.values
            elif param_range.param_type == 'int':
                step = param_range.step or 1
                param_values[param_range.name] = list(range(
                    int(param_range.min_value),
                    int(param_range.max_value) + 1,
                    int(step)
                ))
            else:  # float
                step = param_range.step or (param_range.max_value - param_range.min_value) / 10
                values = []
                current = param_range.min_value
                while current <= param_range.max_value:
                    values.append(current)
                    current += step
                param_values[param_range.name] = values
                
        # Generate all combinations
        param_names = list(param_values.keys())
        combinations = list(itertools.product(*[param_values[name] for name in param_names]))
        
        # Convert to list of dictionaries
        result = []
        for combo in combinations:
            params = dict(zip(param_names, combo))
            result.append(params)
            
        return result
        
    async def _evaluate_population(
        self, 
        population: List[Dict[str, Any]], 
        config: OptimizationConfig
    ) -> List[Optional[Dict]]:
        """Evaluate fitness of entire population"""
        
        # Use multiprocessing for parallel evaluation
        with ProcessPoolExecutor(max_workers=min(4, multiprocessing.cpu_count())) as executor:
            tasks = []
            
            for params in population:
                task = executor.submit(
                    self._evaluate_single_parameters_sync,
                    params,
                    config
                )
                tasks.append(task)
                
            # Collect results
            results = []
            for i, task in enumerate(tasks):
                try:
                    result = task.result(timeout=300)  # 5 minute timeout per evaluation
                    results.append(result)
                    
                    if (i + 1) % 10 == 0:
                        logger.info(f"Evaluated {i + 1}/{len(population)} parameter sets")
                        
                except Exception as e:
                    logger.error(f"Error evaluating parameters {i}: {e}")
                    results.append(None)
                    
        return results
        
    def _evaluate_single_parameters_sync(
        self, 
        parameters: Dict[str, Any], 
        config: OptimizationConfig
    ) -> Optional[Dict]:
        """Synchronous version for multiprocessing"""
        
        try:
            # Run backtest in new event loop
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            try:
                result = loop.run_until_complete(
                    self._evaluate_single_parameters(parameters, config)
                )
                return result
            finally:
                loop.close()
                
        except Exception as e:
            logger.error(f"Error in sync evaluation: {e}")
            return None
            
    async def _evaluate_single_parameters(
        self, 
        parameters: Dict[str, Any], 
        config: OptimizationConfig
    ) -> Optional[Dict]:
        """Evaluate single parameter set"""
        
        try:
            # Create backtesting engine
            engine = BacktestingEngine(
                initial_capital=10000,
                data_manager=self.data_manager,
                use_real_data=True
            )
            
            # Run backtest
            backtest_result = await engine.backtest_strategy(
                strategy_class=config.strategy_class,
                pairs=config.pairs,
                start_date=config.start_date,
                end_date=config.end_date,
                **parameters
            )
            
            # Extract performance metrics
            metrics = {
                'total_return_pct': backtest_result.total_return_pct,
                'sharpe_ratio': backtest_result.sharpe_ratio,
                'sortino_ratio': backtest_result.sortino_ratio,
                'max_drawdown_pct': backtest_result.max_drawdown_pct,
                'win_rate': backtest_result.win_rate,
                'profit_factor': backtest_result.profit_factor,
                'total_trades': backtest_result.total_trades,
                'volatility': backtest_result.volatility
            }
            
            # Calculate fitness score
            fitness_score = self._calculate_fitness(metrics, config.optimization_metric)
            
            await engine.close()
            
            return {
                'metrics': metrics,
                'backtest': backtest_result,
                'fitness': fitness_score
            }
            
        except Exception as e:
            logger.error(f"Error evaluating parameters {parameters}: {e}")
            return None
            
    def _calculate_fitness(self, metrics: Dict[str, float], optimization_metric: str) -> float:
        """Calculate fitness score for parameter set"""
        
        # Primary metric
        primary_score = metrics.get(optimization_metric, 0)
        
        # Add penalties for bad metrics
        penalties = 0
        
        # Penalty for low number of trades
        if metrics.get('total_trades', 0) < 5:
            penalties += 0.5
            
        # Penalty for high drawdown
        max_dd = abs(metrics.get('max_drawdown_pct', 0))
        if max_dd > 0.2:  # >20% drawdown
            penalties += max_dd
            
        # Penalty for very low win rate
        win_rate = metrics.get('win_rate', 0)
        if win_rate < 0.3:  # <30% win rate
            penalties += (0.3 - win_rate)
            
        # Combined fitness score
        fitness = primary_score - penalties
        
        return max(fitness, -10)  # Floor at -10
        
    def _create_next_generation(
        self, 
        current_results: List[OptimizationResult], 
        config: OptimizationConfig
    ) -> List[Dict[str, Any]]:
        """Create next generation using genetic operators"""
        
        next_generation = []
        
        # Elite selection (keep best performers)
        elite_count = int(config.population_size * config.elite_percentage)
        for i in range(elite_count):
            if i < len(current_results):
                next_generation.append(current_results[i].parameters.copy())
                
        # Generate offspring
        while len(next_generation) < config.population_size:
            # Selection
            parent1 = self._tournament_selection(current_results)
            parent2 = self._tournament_selection(current_results)
            
            # Crossover
            if random.random() < config.crossover_rate:
                child1, child2 = self._crossover(parent1.parameters, parent2.parameters, config)
            else:
                child1, child2 = parent1.parameters.copy(), parent2.parameters.copy()
                
            # Mutation
            if random.random() < config.mutation_rate:
                child1 = self._mutate(child1, config.parameter_ranges)
            if random.random() < config.mutation_rate:
                child2 = self._mutate(child2, config.parameter_ranges)
                
            next_generation.extend([child1, child2])
            
        return next_generation[:config.population_size]
        
    def _tournament_selection(self, results: List[OptimizationResult], tournament_size: int = 3) -> OptimizationResult:
        """Tournament selection for genetic algorithm"""
        tournament = random.sample(results, min(tournament_size, len(results)))
        return max(tournament, key=lambda x: x.fitness_score)
        
    def _crossover(
        self, 
        parent1: Dict[str, Any], 
        parent2: Dict[str, Any],
        config: OptimizationConfig
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """Crossover operation for genetic algorithm"""
        
        child1 = parent1.copy()
        child2 = parent2.copy()
        
        # Uniform crossover
        for param_range in config.parameter_ranges:
            param_name = param_range.name
            
            if random.random() < 0.5:
                # Swap parameter values
                child1[param_name], child2[param_name] = child2[param_name], child1[param_name]
                
        return child1, child2
        
    def _mutate(
        self, 
        parameters: Dict[str, Any], 
        parameter_ranges: List[ParameterRange]
    ) -> Dict[str, Any]:
        """Mutation operation for genetic algorithm"""
        
        mutated = parameters.copy()
        
        # Mutate each parameter with some probability
        for param_range in parameter_ranges:
            if random.random() < 0.3:  # 30% chance to mutate each parameter
                
                if param_range.param_type == 'choice' and param_range.values:
                    mutated[param_range.name] = random.choice(param_range.values)
                    
                elif param_range.param_type == 'int':
                    # Gaussian mutation
                    current_value = mutated[param_range.name]
                    mutation_strength = (param_range.max_value - param_range.min_value) * 0.1
                    new_value = current_value + random.gauss(0, mutation_strength)
                    new_value = max(param_range.min_value, min(param_range.max_value, new_value))
                    mutated[param_range.name] = int(new_value)
                    
                else:  # float
                    # Gaussian mutation
                    current_value = mutated[param_range.name]
                    mutation_strength = (param_range.max_value - param_range.min_value) * 0.1
                    new_value = current_value + random.gauss(0, mutation_strength)
                    new_value = max(param_range.min_value, min(param_range.max_value, new_value))
                    mutated[param_range.name] = new_value
                    
        return mutated
        
    def export_optimization_results(
        self, 
        results: List[OptimizationResult], 
        filename: str = None
    ) -> str:
        """Export optimization results to JSON file"""
        
        if not filename:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"optimization_results_{timestamp}.json"
            
        export_data = {
            'optimization_summary': {
                'total_results': len(results),
                'best_fitness': results[0].fitness_score if results else 0,
                'exported_at': datetime.now().isoformat()
            },
            'results': [
                {
                    'rank': result.rank,
                    'parameters': result.parameters,
                    'performance_metrics': result.performance_metrics,
                    'fitness_score': result.fitness_score
                }
                for result in results
            ]
        }
        
        try:
            with open(filename, 'w') as f:
                json.dump(export_data, f, indent=2)
                
            logger.info(f"Optimization results exported to {filename}")
            return filename
            
        except Exception as e:
            logger.error(f"Failed to export results: {e}")
            return ""