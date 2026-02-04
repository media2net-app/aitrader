#!/usr/bin/env python3
"""
Position Sizing Calculator
Bereken lot size op basis van account balance, risk percentage en Stop Loss afstand
"""

from typing import Dict, Optional

class PositionSizer:
    def __init__(self):
        """
        Initialize Position Sizer
        """
        # Pip values per lot for different symbols (in USD)
        # For XAUUSD: 1 lot = 100 oz, 1 pip = $0.01 per oz, so pip value = $1.00 per lot
        self.pip_values = {
            'XAUUSD': 1.0,  # $1.00 per pip per lot
            'EURUSD': 10.0,  # $10.00 per pip per lot (standard)
            'GBPUSD': 10.0,
            'USDJPY': 9.09,  # Approximate for 1 lot
        }
    
    def get_pip_value(self, symbol: str = "XAUUSD") -> float:
        """
        Get pip value per lot for a symbol
        
        Args:
            symbol: Trading symbol (default: XAUUSD)
        
        Returns:
            Pip value per lot in USD
        """
        return self.pip_values.get(symbol.upper(), 1.0)
    
    def calculate_lot_size(self, account_balance: float, risk_percent: float, 
                          sl_pips: int, symbol: str = "XAUUSD") -> float:
        """
        Bereken lot size op basis van risico
        
        Formule:
        Risk Amount = Account Balance × (Risk % / 100)
        Lot Size = Risk Amount / (SL Pips × Pip Value per Lot)
        
        Args:
            account_balance: Current account balance in USD
            risk_percent: Risk percentage per trade (e.g., 2.0 for 2%)
            sl_pips: Stop Loss distance in pips
            symbol: Trading symbol (default: XAUUSD)
        
        Returns:
            Lot size (rounded to 0.01)
        
        Example:
            account_balance = $100
            risk_percent = 5.0 (5%)
            sl_pips = 50
            pip_value = $1.00 (XAUUSD)
            
            Risk Amount = $100 × 0.05 = $5
            Lot Size = $5 / (50 × $1.00) = 0.10 lots
        """
        if account_balance <= 0:
            return 0.01  # Minimum lot size
        
        if risk_percent <= 0 or risk_percent > 100:
            raise ValueError(f"Risk percentage must be between 0 and 100, got {risk_percent}")
        
        if sl_pips <= 0:
            raise ValueError(f"Stop Loss pips must be positive, got {sl_pips}")
        
        # Calculate risk amount
        risk_amount = account_balance * (risk_percent / 100.0)
        
        # Get pip value for symbol
        pip_value_per_lot = self.get_pip_value(symbol)
        
        # Calculate lot size
        lot_size = risk_amount / (sl_pips * pip_value_per_lot)
        
        # Round to 0.01 (minimum lot size for most brokers)
        lot_size = round(lot_size, 2)
        
        # Ensure minimum lot size
        return max(0.01, lot_size)
    
    def calculate_risk_amount(self, account_balance: float, risk_percent: float) -> float:
        """
        Calculate risk amount in USD
        
        Args:
            account_balance: Current account balance
            risk_percent: Risk percentage
        
        Returns:
            Risk amount in USD
        """
        return account_balance * (risk_percent / 100.0)
    
    def calculate_position_value(self, lot_size: float, entry_price: float, symbol: str = "XAUUSD") -> float:
        """
        Calculate total position value
        
        For XAUUSD: 1 lot = 100 oz
        Position Value = Lot Size × 100 × Entry Price
        
        Args:
            lot_size: Lot size
            entry_price: Entry price
            symbol: Trading symbol
        
        Returns:
            Position value in USD
        """
        # For XAUUSD, 1 lot = 100 oz
        contract_size = 100
        return lot_size * contract_size * entry_price
    
    def calculate_pnl_for_pips(self, lot_size: float, pips: int, symbol: str = "XAUUSD") -> float:
        """
        Calculate P&L for a given number of pips
        
        Args:
            lot_size: Lot size
            pips: Number of pips
            symbol: Trading symbol
        
        Returns:
            P&L in USD
        """
        pip_value_per_lot = self.get_pip_value(symbol)
        return lot_size * pips * pip_value_per_lot
    
    def validate_position_size(self, lot_size: float, account_balance: float, 
                              entry_price: float, symbol: str = "XAUUSD") -> Dict:
        """
        Validate if position size is reasonable
        
        Args:
            lot_size: Proposed lot size
            account_balance: Account balance
            entry_price: Entry price
            symbol: Trading symbol
        
        Returns:
            Dict with validation results
        """
        position_value = self.calculate_position_value(lot_size, entry_price, symbol)
        margin_required = position_value  # Simplified: assume 1:1 margin (adjust for leverage)
        
        # Check if position value is reasonable (not more than account balance)
        is_valid = position_value <= account_balance * 10  # Allow up to 10x with leverage
        
        warnings = []
        if position_value > account_balance * 5:
            warnings.append("Position value is very high relative to account balance")
        if lot_size < 0.01:
            warnings.append("Lot size is below minimum (0.01)")
        
        return {
            'is_valid': is_valid,
            'lot_size': lot_size,
            'position_value': round(position_value, 2),
            'margin_required': round(margin_required, 2),
            'warnings': warnings
        }
    
    def get_recommended_lot_size(self, account_balance: float, risk_percent: float,
                                 sl_pips: int, symbol: str = "XAUUSD",
                                 entry_price: Optional[float] = None) -> Dict:
        """
        Get recommended lot size with validation
        
        Args:
            account_balance: Account balance
            risk_percent: Risk percentage
            sl_pips: Stop Loss pips
            symbol: Trading symbol
            entry_price: Optional entry price for validation
        
        Returns:
            Dict with recommended lot size and validation info
        """
        lot_size = self.calculate_lot_size(account_balance, risk_percent, sl_pips, symbol)
        risk_amount = self.calculate_risk_amount(account_balance, risk_percent)
        
        result = {
            'lot_size': lot_size,
            'risk_amount': round(risk_amount, 2),
            'risk_percent': risk_percent,
            'sl_pips': sl_pips,
            'symbol': symbol
        }
        
        if entry_price:
            validation = self.validate_position_size(lot_size, account_balance, entry_price, symbol)
            result.update(validation)
        
        return result


# CLI interface for testing
if __name__ == "__main__":
    sizer = PositionSizer()
    
    print("💰 Position Sizing Calculator")
    print("=" * 50)
    print()
    
    # Example calculations
    account_balance = 100.0
    risk_percent = 5.0  # 5% risk
    sl_pips = 50
    
    print(f"Account Balance: ${account_balance:.2f}")
    print(f"Risk per Trade: {risk_percent}%")
    print(f"Stop Loss: {sl_pips} pips")
    print()
    
    lot_size = sizer.calculate_lot_size(account_balance, risk_percent, sl_pips)
    risk_amount = sizer.calculate_risk_amount(account_balance, risk_percent)
    
    print(f"📊 Recommended Lot Size: {lot_size:.2f} lots")
    print(f"💵 Risk Amount: ${risk_amount:.2f}")
    print()
    
    # Calculate P&L examples
    print("📈 P&L Examples:")
    print(f"  If TP hit (+{sl_pips * 2} pips): ${sizer.calculate_pnl_for_pips(lot_size, sl_pips * 2):.2f}")
    print(f"  If SL hit (-{sl_pips} pips): ${sizer.calculate_pnl_for_pips(lot_size, -sl_pips):.2f}")
    print()
    
    # Different risk scenarios
    print("🎯 Different Risk Scenarios:")
    for risk in [2.0, 5.0, 10.0, 50.0]:
        lot = sizer.calculate_lot_size(account_balance, risk, sl_pips)
        risk_amt = sizer.calculate_risk_amount(account_balance, risk)
        print(f"  {risk}% risk: {lot:.2f} lots (${risk_amt:.2f} risk)")
