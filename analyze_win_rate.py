#!/usr/bin/env python3
"""
Analyseer Win Rate voor XAUUSD Auto Trade Script
Berekent win rate op basis van historische trades en strategie parameters
"""

import requests
import json
from datetime import datetime, timedelta
from typing import Dict, List

class WinRateAnalyzer:
    def __init__(self, bridge_url="http://localhost:5002"):
        self.bridge_url = bridge_url
    
    def get_trading_history(self, days=30):
        """Haal trading history op van MT5"""
        try:
            response = requests.get(f"{self.bridge_url}/history", timeout=10)
            if response.status_code == 200:
                data = response.json()
                trades = data.get('trades', [])
                
                # Filter alleen XAUUSD trades
                xau_trades = [
                    t for t in trades 
                    if t.get('symbol') == 'XAUUSD' or t.get('symbol') == 'XAU/USD'
                ]
                
                # Filter alleen gesloten trades met profit != 0 (exit deals)
                valid_trades = [
                    t for t in xau_trades
                    if t.get('symbol') and 
                    abs(float(t.get('profit', 0))) < 10000 and  # Realistische profit range
                    float(t.get('profit', 0)) != 0  # Alleen exit deals
                ]
                
                return valid_trades
        except Exception as e:
            print(f"⚠️  Fout bij ophalen history: {e}")
        return []
    
    def analyze_win_rate(self, trades: List[Dict]) -> Dict:
        """Analyseer win rate van trades"""
        if not trades:
            return {
                'total_trades': 0,
                'winning_trades': 0,
                'losing_trades': 0,
                'win_rate': 0.0,
                'total_profit': 0.0,
                'avg_win': 0.0,
                'avg_loss': 0.0,
                'profit_factor': 0.0,
                'risk_reward_ratio': 0.0
            }
        
        winning_trades = [t for t in trades if float(t.get('profit', 0)) > 0]
        losing_trades = [t for t in trades if float(t.get('profit', 0)) < 0]
        
        total_trades = len(trades)
        wins = len(winning_trades)
        losses = len(losing_trades)
        
        win_rate = (wins / total_trades * 100) if total_trades > 0 else 0
        
        total_profit = sum(float(t.get('profit', 0)) for t in trades)
        total_wins = sum(float(t.get('profit', 0)) for t in winning_trades)
        total_losses = abs(sum(float(t.get('profit', 0)) for t in losing_trades))
        
        avg_win = (total_wins / wins) if wins > 0 else 0
        avg_loss = (total_losses / losses) if losses > 0 else 0
        
        profit_factor = (total_wins / total_losses) if total_losses > 0 else 0
        risk_reward_ratio = (avg_win / avg_loss) if avg_loss > 0 else 0
        
        return {
            'total_trades': total_trades,
            'winning_trades': wins,
            'losing_trades': losses,
            'win_rate': round(win_rate, 2),
            'total_profit': round(total_profit, 2),
            'avg_win': round(avg_win, 2),
            'avg_loss': round(avg_loss, 2),
            'profit_factor': round(profit_factor, 2),
            'risk_reward_ratio': round(risk_reward_ratio, 2)
        }
    
    def analyze_strategy_parameters(self) -> Dict:
        """Analyseer strategie parameters voor theoretische win rate"""
        # Strategie parameters uit auto_trader.py en trading_strategy.py
        stop_loss = 50  # -$50 stop loss
        take_profit = 100  # +$100 take profit
        confidence_threshold = 60  # Minimum 60% confidence
        
        # Risk/Reward ratio
        risk_reward = take_profit / stop_loss  # 2:1
        
        # Theoretische break-even win rate
        # Bij 1:2 risk/reward heb je minimaal 33.3% win rate nodig om break-even te zijn
        # Formule: Win Rate = Risk / (Risk + Reward) = 50 / (50 + 100) = 33.3%
        break_even_win_rate = (stop_loss / (stop_loss + take_profit)) * 100
        
        # Voor winstgevendheid (bijv. 10% ROI) heb je hogere win rate nodig
        # Met 1:2 ratio en 50% win rate: (0.5 * 100) - (0.5 * 50) = 50 - 25 = +25 per trade
        # Met 1:2 ratio en 40% win rate: (0.4 * 100) - (0.6 * 50) = 40 - 30 = +10 per trade
        
        return {
            'stop_loss': stop_loss,
            'take_profit': take_profit,
            'risk_reward_ratio': f"1:{risk_reward:.1f}",
            'confidence_threshold': confidence_threshold,
            'break_even_win_rate': round(break_even_win_rate, 1),
            'profitable_win_rate_40pct': 40.0,
            'profitable_win_rate_50pct': 50.0,
            'expected_win_rate_range': '40-60%',
            'strategy_type': 'Technical Analysis (SMA, EMA, RSI, MACD)'
        }
    
    def print_analysis(self):
        """Print volledige win rate analyse"""
        print("=" * 70)
        print("📊 WIN RATE ANALYSE - XAUUSD AUTO TRADE SCRIPT")
        print("=" * 70)
        print()
        
        # Haal trading history op
        print("🔍 Ophalen trading history...")
        trades = self.get_trading_history(days=30)
        
        if trades:
            print(f"✅ {len(trades)} XAUUSD trades gevonden")
            print()
            
            # Analyseer win rate
            stats = self.analyze_win_rate(trades)
            
            print("📈 ACTUELE WIN RATE (Gebaseerd op historische trades):")
            print("-" * 70)
            print(f"  Totale Trades:        {stats['total_trades']}")
            print(f"  Winnaars:             {stats['winning_trades']} trades")
            print(f"  Verliezers:           {stats['losing_trades']} trades")
            print(f"  🎯 WIN RATE:          {stats['win_rate']}%")
            print(f"  Totale Profit:        ${stats['total_profit']:.2f}")
            print(f"  Gemiddelde Win:       ${stats['avg_win']:.2f}")
            print(f"  Gemiddeld Verlies:    ${stats['avg_loss']:.2f}")
            print(f"  Profit Factor:        {stats['profit_factor']:.2f}")
            print(f"  Risk/Reward Ratio:    {stats['risk_reward_ratio']:.2f}")
            print()
            
            # Beoordeling
            if stats['win_rate'] >= 50:
                print("✅ UITSTEKEND: Win rate is boven 50% - Strategie is winstgevend!")
            elif stats['win_rate'] >= 40:
                print("✅ GOED: Win rate is 40-50% - Strategie is winstgevend met 1:2 risk/reward")
            elif stats['win_rate'] >= 33.3:
                print("⚠️  ACCEPTABLE: Win rate is rond break-even - Strategie is marginaal winstgevend")
            else:
                print("❌ LAAG: Win rate is onder break-even - Strategie verliest geld")
            print()
        else:
            print("⚠️  Geen historische trades gevonden")
            print("   (Dit kan betekenen dat het script nog niet lang genoeg heeft gedraaid)")
            print()
        
        # Strategie parameters analyse
        print("⚙️  STRATEGIE PARAMETERS:")
        print("-" * 70)
        strategy = self.analyze_strategy_parameters()
        print(f"  Stop Loss:            -${strategy['stop_loss']}")
        print(f"  Take Profit:          +${strategy['take_profit']}")
        print(f"  Risk/Reward Ratio:    {strategy['risk_reward_ratio']}")
        print(f"  Confidence Threshold: {strategy['confidence_threshold']}%")
        print(f"  Strategie Type:       {strategy['strategy_type']}")
        print()
        
        print("📊 THEORETISCHE VERWACHTINGEN:")
        print("-" * 70)
        print(f"  Break-even Win Rate:  {strategy['break_even_win_rate']}%")
        print(f"  (Bij deze win rate maak je geen winst/verlies)")
        print()
        print(f"  Winstgevend bij:      {strategy['profitable_win_rate_40pct']}%+ win rate")
        print(f"  (Met 1:2 ratio heb je minimaal 40% nodig voor goede winst)")
        print()
        print(f"  Verwachte Range:      {strategy['expected_win_rate_range']}")
        print(f"  (Typisch voor technische analyse strategieën)")
        print()
        
        # Conclusie
        print("=" * 70)
        print("💡 CONCLUSIE:")
        print("=" * 70)
        
        if trades:
            if stats['win_rate'] >= 50:
                print("✅ Je strategie presteert UITSTEKEND!")
                print(f"   Met een win rate van {stats['win_rate']}% en een 1:2 risk/reward ratio")
                print(f"   maak je gemiddeld ${stats['avg_win']:.2f} per winnaar en verlies je")
                print(f"   ${stats['avg_loss']:.2f} per verliezer.")
                print()
                print(f"   Dit betekent dat je strategie zeer winstgevend is!")
            elif stats['win_rate'] >= 40:
                print("✅ Je strategie presteert GOED!")
                print(f"   Met een win rate van {stats['win_rate']}% is je strategie winstgevend.")
                print(f"   Met een 1:2 risk/reward ratio hoef je maar 33.3% win rate te hebben")
                print(f"   om break-even te zijn, dus je zit ruim boven dat niveau.")
            else:
                print("⚠️  Je strategie heeft een lagere win rate.")
                print(f"   Huidige win rate: {stats['win_rate']}%")
                print(f"   Break-even punt: {strategy['break_even_win_rate']}%")
                print()
                print("   Mogelijke verbeteringen:")
                print("   - Verhoog confidence threshold naar 70%")
                print("   - Verbeter entry timing met betere signalen")
                print("   - Pas stop loss/take profit aan")
        else:
            print("📊 GEEN HISTORISCHE DATA BESCHIKBAAR")
            print()
            print("   Op basis van je strategie parameters:")
            print(f"   - Je hebt een 1:{strategy['take_profit']/strategy['stop_loss']:.1f} risk/reward ratio")
            print(f"   - Je gebruikt technische indicatoren (SMA, EMA, RSI, MACD)")
            print(f"   - Je vereist minimaal {strategy['confidence_threshold']}% confidence")
            print()
            print("   VERWACHTE WIN RATE:")
            print(f"   - Realistisch: 40-55% (typisch voor technische analyse)")
            print(f"   - Optimistisch: 55-65% (bij goede marktomstandigheden)")
            print(f"   - Pessimistisch: 30-40% (bij moeilijke marktomstandigheden)")
            print()
            print("   MET 1:2 RISK/REWARD RATIO:")
            print(f"   - Bij 40% win rate: +$10 per trade gemiddeld")
            print(f"   - Bij 50% win rate: +$25 per trade gemiddeld")
            print(f"   - Bij 60% win rate: +$40 per trade gemiddeld")
            print()
            print("   💡 TIP: Laat het script minimaal 1-2 weken draaien om")
            print("      betrouwbare win rate statistieken te krijgen!")
        
        print()
        print("=" * 70)

if __name__ == "__main__":
    analyzer = WinRateAnalyzer()
    analyzer.print_analysis()
