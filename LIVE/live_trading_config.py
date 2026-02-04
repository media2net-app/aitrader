#!/usr/bin/env python3
"""
Live Trading Configuration
Configuratie opties voor live trading met MetaTrader 5
"""

from typing import Dict

# Default Live Trading Configuration
LIVE_CONFIG = {
    # Trading Settings
    'timeframe': 'M5',  # 5 minuten - BESTE KEUZE voor 1-2 trades per dag
    'symbol': 'XAUUSD',
    
    # Trade Limits
    'max_trades_per_day': 2,  # Maximum aantal trades per dag
    
    # Risk Management
    'risk_per_trade_percent': 5.0,  # 5% risico per trade (aanbevolen: start met 2-5%)
    'target_profit_percent': 10.0,   # 10% target winst per trade (1:2 risk/reward ratio)
    'max_daily_loss_percent': 50.0,  # Max 50% verlies per dag (zeer agressief - overweeg 20-30%)
    'max_drawdown_percent': 20.0,    # Max 20% drawdown voordat trading stopt
    
    # Signal Settings
    'confidence_threshold': 70,      # Min 70% confidence vereist voor trade
    'min_risk_reward_ratio': 2.0,    # Min 1:2 risk/reward ratio
    
    # Position Management
    'use_trailing_stop': True,        # Gebruik trailing stop loss
    'trailing_stop_pips': 20,         # Trailing stop afstand in pips
    'use_partial_close': False,       # Sluit gedeeltelijk bij TP1, TP2, TP3
    'tp1_percent': 33.0,              # Sluit 33% bij TP1
    'tp2_percent': 33.0,              # Sluit 33% bij TP2
    'tp3_percent': 34.0,              # Sluit resterende 34% bij TP3
    
    # Trading Hours (optional - None means trade 24/7)
    'trading_hours': {
        'enabled': False,              # Enable trading hours filter
        'start_hour': 8,               # Start trading at 8:00
        'end_hour': 20,                # Stop trading at 20:00
        'timezone': 'UTC'              # Timezone for trading hours
    },
    
    # MT5 Connection
    'mt5_bridge_url': 'http://localhost:5002',
    
    # Monitoring
    'log_trades': True,                # Log alle trades
    'log_file': 'LIVE/trading_log.json',
    'send_alerts': False,              # Send webhook alerts
    'webhook_url': None,               # Webhook URL for alerts
}

# Conservative Configuration (aanbevolen voor start)
CONSERVATIVE_CONFIG = {
    **LIVE_CONFIG,
    'risk_per_trade_percent': 2.0,    # 2% risico per trade
    'target_profit_percent': 4.0,     # 4% target (1:2 ratio)
    'max_daily_loss_percent': 20.0,    # Max 20% verlies per dag
    'max_drawdown_percent': 15.0,     # Max 15% drawdown
    'confidence_threshold': 75,       # Min 75% confidence
}

# Moderate Configuration
MODERATE_CONFIG = {
    **LIVE_CONFIG,
    'risk_per_trade_percent': 5.0,    # 5% risico per trade
    'target_profit_percent': 10.0,    # 10% target (1:2 ratio)
    'max_daily_loss_percent': 30.0,   # Max 30% verlies per dag
    'max_drawdown_percent': 20.0,      # Max 20% drawdown
    'confidence_threshold': 70,       # Min 70% confidence
}

# Aggressive Configuration (zoals jij wilt - zeer risicovol!)
AGGRESSIVE_CONFIG = {
    **LIVE_CONFIG,
    'risk_per_trade_percent': 50.0,   # 50% risico per trade (ZEER AGRESSIEF!)
    'target_profit_percent': 100.0,    # 100% target (1:2 ratio)
    'max_daily_loss_percent': 50.0,   # Max 50% verlies per dag
    'max_drawdown_percent': 50.0,     # Max 50% drawdown
    'confidence_threshold': 65,       # Min 65% confidence
    'max_trades_per_day': 2,          # Max 2 trades per dag
}

# Timeframe-specific configurations
TIMEFRAME_CONFIGS = {
    'M1': {
        'risk_per_trade_percent': 2.0,  # Lower risk for 1M (more noise)
        'confidence_threshold': 75,      # Higher confidence needed
        'min_risk_reward_ratio': 2.5,   # Higher R:R for 1M
    },
    'M5': {
        'risk_per_trade_percent': 5.0,  # Standard risk for 5M
        'confidence_threshold': 70,      # Standard confidence
        'min_risk_reward_ratio': 2.0,   # Standard R:R
    },
    'M15': {
        'risk_per_trade_percent': 5.0,  # Standard risk for 15M
        'confidence_threshold': 65,      # Lower confidence OK (more reliable)
        'min_risk_reward_ratio': 2.0,   # Standard R:R
    },
    'H1': {
        'risk_per_trade_percent': 5.0,  # Standard risk for H1
        'confidence_threshold': 60,      # Lower confidence OK (very reliable)
        'min_risk_reward_ratio': 2.0,   # Standard R:R
    }
}

def get_config(config_type: str = 'default') -> Dict:
    """
    Get configuration by type
    
    Args:
        config_type: 'default', 'conservative', 'moderate', or 'aggressive'
    
    Returns:
        Configuration dictionary
    """
    configs = {
        'default': LIVE_CONFIG,
        'conservative': CONSERVATIVE_CONFIG,
        'moderate': MODERATE_CONFIG,
        'aggressive': AGGRESSIVE_CONFIG
    }
    
    return configs.get(config_type.lower(), LIVE_CONFIG)

def get_timeframe_config(timeframe: str) -> Dict:
    """
    Get timeframe-specific configuration
    
    Args:
        timeframe: 'M1', 'M5', 'M15', 'H1', etc.
    
    Returns:
        Timeframe-specific configuration
    """
    return TIMEFRAME_CONFIGS.get(timeframe.upper(), {})

def merge_configs(base_config: Dict, override_config: Dict) -> Dict:
    """
    Merge two configurations (override takes precedence)
    
    Args:
        base_config: Base configuration
        override_config: Override configuration
    
    Returns:
        Merged configuration
    """
    merged = base_config.copy()
    merged.update(override_config)
    return merged

def validate_config(config: Dict) -> tuple[bool, str]:
    """
    Validate configuration
    
    Args:
        config: Configuration to validate
    
    Returns:
        Tuple of (is_valid: bool, error_message: str)
    """
    # Check required fields
    required_fields = ['timeframe', 'symbol', 'risk_per_trade_percent', 'max_trades_per_day']
    for field in required_fields:
        if field not in config:
            return False, f"Missing required field: {field}"
    
    # Validate risk percentage
    if config['risk_per_trade_percent'] <= 0 or config['risk_per_trade_percent'] > 100:
        return False, f"risk_per_trade_percent must be between 0 and 100, got {config['risk_per_trade_percent']}"
    
    # Validate max trades
    if config['max_trades_per_day'] < 1:
        return False, f"max_trades_per_day must be at least 1, got {config['max_trades_per_day']}"
    
    # Validate confidence threshold
    if config.get('confidence_threshold', 0) < 0 or config.get('confidence_threshold', 0) > 100:
        return False, f"confidence_threshold must be between 0 and 100, got {config.get('confidence_threshold')}"
    
    return True, "Configuration is valid"


# CLI interface for testing
if __name__ == "__main__":
    print("⚙️  Live Trading Configuration")
    print("=" * 50)
    print()
    
    # Show default config
    print("📋 Default Configuration:")
    config = get_config('default')
    for key, value in config.items():
        if not isinstance(value, dict):
            print(f"  {key}: {value}")
    print()
    
    # Show conservative config
    print("🛡️  Conservative Configuration (Aanbevolen voor start):")
    conservative = get_config('conservative')
    print(f"  Risk per trade: {conservative['risk_per_trade_percent']}%")
    print(f"  Target profit: {conservative['target_profit_percent']}%")
    print(f"  Max daily loss: {conservative['max_daily_loss_percent']}%")
    print(f"  Confidence threshold: {conservative['confidence_threshold']}%")
    print()
    
    # Show aggressive config
    print("⚡ Aggressive Configuration (Zeer risicovol!):")
    aggressive = get_config('aggressive')
    print(f"  Risk per trade: {aggressive['risk_per_trade_percent']}%")
    print(f"  Target profit: {aggressive['target_profit_percent']}%")
    print(f"  Max daily loss: {aggressive['max_daily_loss_percent']}%")
    print(f"  Confidence threshold: {aggressive['confidence_threshold']}%")
    print()
    
    # Validate config
    is_valid, message = validate_config(config)
    print(f"✅ Configuration valid: {is_valid}")
    if not is_valid:
        print(f"   Error: {message}")
