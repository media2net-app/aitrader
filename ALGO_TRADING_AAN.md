# 🔴 Algo Trading staat UIT!

## Probleem:
Algo Trading staat **UIT** (rood icoon). De EA kan niet werken zonder Algo Trading!

## ✅ Oplossing:

### Stap 1: Zet Algo Trading AAN
1. Kijk naar de **toolbar** (bovenaan MT5)
2. Zoek het **rode "Algo Trading"** icoon
3. **Klik erop**
4. Het moet **groen** worden ✅

### Stap 2: Verifieer
- Het icoon moet nu **groen** zijn
- In de Experts tab zou je moeten zien: "automated trading is enabled"

### Stap 3: Test
Na het aanzetten:
1. Wacht 10 seconden
2. Check Experts tab voor "Timer check #10"
3. Test: `curl http://localhost:5002/health`
4. Check Experts tab voor "✅ Received request"

## ⚠️ Belangrijk:
- Algo Trading moet **groen** zijn voor EA's om te werken
- Zonder Algo Trading kunnen EA's geen trades plaatsen of bestanden lezen
- Dit is een **veiligheidsfeature** van MT5

## 📍 Locatie:
Het Algo Trading icoon staat in de toolbar, meestal:
- Naast "Nieuwe Opdracht" (New Order)
- Rood = UIT
- Groen = AAN ✅

Zet het aan en test opnieuw! 🚀
