# 🐛 EA Debug Checklist

## Probleem:
EA reageert niet op requests, ook na hercompilatie.

## Check lijst:

### 1. Is de EA actief op de chart?
- ✅ Check de **Experts tab** in MT5
- ✅ Zoek naar: "MT5 REST API EA Starting"
- ✅ Check of er **geen errors** zijn

### 2. Is de EA op de juiste chart?
- ✅ De EA moet op een **actieve chart** staan
- ✅ Check de **rechterbovenhoek** van de chart - zie je "MT5_REST_API_EA"?

### 3. Is Algo Trading aan?
- ✅ Check de **Algo Trading button** in de toolbar (moet groen zijn)

### 4. Check de Experts tab voor berichten:
Je zou moeten zien:
```
MT5 REST API EA Starting (File-based communication)
Request file: mt5_request.txt
Response file: mt5_response.txt
```

En mogelijk:
```
Received request: GET /account
Sent response: {...}
```

### 5. Test handmatig:
1. Maak een test request bestand:
```bash
echo "GET /health" > "/Users/gebruiker/Library/Application Support/net.metaquotes.wine.metatrader5/drive_c/Program Files/MetaTrader 5/MQL5/Files/Common/mt5_request.txt"
```

2. Wacht 2 seconden

3. Check of er een response is:
```bash
cat "/Users/gebruiker/Library/Application Support/net.metaquotes.wine.metatrader5/drive_c/Program Files/MetaTrader 5/MQL5/Files/Common/mt5_response.txt"
```

### 6. Als er nog steeds geen response is:
- Check of de EA wel echt op de chart staat
- Herstart de EA (verwijder van chart, sleep opnieuw)
- Check Experts tab voor errors
