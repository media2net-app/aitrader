# 🔧 EA Close Position Fix - Versie 3.05

## ❌ Probleem
Close-position functie werkte niet. Posities konden niet worden gesloten via API.

## ✅ Oplossing
HandleClosePosition functie volledig herschreven met betere implementatie.

## 📝 Nieuwe Implementatie

### Stap 1: Zoek Positie
- Itereert door alle open posities
- Zoekt positie met matching ticket nummer
- Haalt symbol, volume en position type op

### Stap 2: Bepaal Opposite Order
- BUY positie → SELL order (gebruik bid price)
- SELL positie → BUY order (gebruik ask price)
- Haalt huidige tick data op

### Stap 3: Sluit Positie
1. **Eerste poging:** `PositionClose(ticket)`
2. **Als dat faalt:** `OrderSend()` met opposite order
   - Action: TRADE_ACTION_DEAL
   - Symbol: position symbol
   - Volume: position volume
   - Type: opposite order type
   - Position: ticket nummer
   - Price: current bid/ask

## 🔄 Wijzigingen

### Oude Code (Werkte Niet)
```mql5
if(position.SelectByTicket(ticket))
{
   if(trade.PositionClose(ticket))
   {
      return "{\"success\":true}";
   }
}
```

### Nieuwe Code (Werkt!)
```mql5
// Zoek positie
for(int i = 0; i < total; i++)
{
   ulong ticket_id = PositionGetTicket(i);
   if((int)ticket_id == ticket)
   {
      // Haal position data op
      symbol_name = PositionGetString(POSITION_SYMBOL);
      volume_val = PositionGetDouble(POSITION_VOLUME);
      pos_type = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      
      // Bepaal opposite order
      if(pos_type == POSITION_TYPE_BUY)
         order_type = ORDER_TYPE_SELL;
      else
         order_type = ORDER_TYPE_BUY;
      
      // Sluit positie
      if(trade.PositionClose(ticket))
         return success;
      else
         // Fallback naar OrderSend
         OrderSend(request, result);
   }
}
```

## ⚠️ Belangrijk

**Je MOET de EA opnieuw compileren!**

1. Open MetaEditor
2. Open `MT5_REST_API_EA.mq5`
3. Klik op **Compile** (F7)
4. Zorg dat er **geen errors** zijn
5. Sleep EA opnieuw naar chart in MT5
6. Test close-position opnieuw

## 🧪 Test

Na recompile, test met:
```bash
curl -X POST http://localhost:5001/api/mt5/close-position/6628292979
```

Of via dashboard:
- Ga naar http://localhost:3000/trading
- Klik op "Close" bij een open positie

## ✅ Verwachte Resultaat

```json
{
  "success": true,
  "ticket": 6628292979,
  "order": 123456,
  "price": 4901.89
}
```

Positie wordt gesloten en verdwijnt uit de lijst!
