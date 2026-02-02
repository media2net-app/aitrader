# 🔍 FILE_COMMON Path Investigation

## Probleem:
Error 5004 = FILE_NOT_EXIST - EA kan bestand niet vinden waar FILE_COMMON naar wijst.

## Aanpak:
EA aangepast om:
1. Terminal Data Path te printen
2. Test bestand te maken in FILE_COMMON
3. Te zien waar het test bestand terechtkomt

## ⚠️ BELANGRIJK - Hercompileer:

1. **Open MetaEditor** (F4 in MT5)
2. **Open** `MT5_REST_API_EA.mq5`
3. **Druk F7** (Compile)
4. Check: **0 errors**
5. **Sluit MetaEditor**

## 📋 Check Experts Tab:

Na hercompilatie en herstart van de EA, zou je moeten zien:

```
MT5 REST API EA Starting (File-based communication)
Request file: mt5_request.txt
Response file: mt5_response.txt
✅ Test file created in FILE_COMMON location
   Check Terminal Data Path: [PATH]
   Common folder should be: [PATH]\MQL5\Files\Common
```

Of:
```
❌ Cannot create test file. Error: [code]
   Terminal Data Path: [PATH]
```

## 🔍 Dan zoeken we het test bestand:

```bash
find ~/Library/Application\ Support/net.metaquotes.wine.metatrader5 -name "mt5_test_path.txt"
```

Dit laat ons zien waar FILE_COMMON daadwerkelijk naar wijst!

## ✅ Dan passen we bridge aan:

Zodra we weten waar FILE_COMMON naar wijst, passen we de bridge aan om naar die exacte locatie te schrijven!
