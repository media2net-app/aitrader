//+------------------------------------------------------------------+
//|                                          MT5_REST_API_EA.mq5     |
//|                        MetaTrader 5 REST API Expert Advisor      |
//|                                                                  |
//+------------------------------------------------------------------+
#property copyright "AI Trader by Chiel"
#property link      ""
#property version   "3.12" // Version 3.12 - REST API EA with full trading support, candles API, and dynamic TP/SL
#property description "MetaTrader 5 REST API Expert Advisor"
#property description "Provides HTTP-like API via file-based communication"
#property description "Features: Account info, positions, order placement, history, candlestick data"

#include <Trade\Trade.mqh>
#include <Trade\AccountInfo.mqh>
#include <Trade\PositionInfo.mqh>
#include <Trade\SymbolInfo.mqh>
#include <Files\File.mqh>

input int      CheckInterval = 100;  // Check interval in milliseconds

CTrade trade;
CAccountInfo account;
CPositionInfo position;
CSymbolInfo symbol_info;

string request_file = "mt5_request.txt";
string response_file = "mt5_response.txt";

// Try to find the correct Common folder path
string GetCommonFolderPath()
{
   // On Wine/Mac, FILE_COMMON might point to a different location
   // Try to get the actual path
   string test_file = "test_path.txt";
   int test_handle = FileOpen(test_file, FILE_WRITE|FILE_TXT|FILE_COMMON);
   if(test_handle != INVALID_HANDLE)
   {
      FileClose(test_handle);
      FileDelete(test_file, FILE_COMMON);
      return "FILE_COMMON works"; // Path is correct
   }
   return "FILE_COMMON path issue";
}

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("MT5 REST API EA Starting (File-based communication)");
   Print("Request file: ", request_file);
   Print("Response file: ", response_file);
   
   // Test FILE_COMMON by writing a test file and checking where it goes
   string test_file = "mt5_test_path.txt";
   int test_handle = FileOpen(test_file, FILE_WRITE|FILE_TXT|FILE_COMMON);
   if(test_handle != INVALID_HANDLE)
   {
      FileWriteString(test_handle, "TEST");
      FileClose(test_handle);
      Print("✅ Test file created in FILE_COMMON location");
      Print("   Check Terminal Data Path: ", TerminalInfoString(TERMINAL_DATA_PATH));
      Print("   Common folder should be: ", TerminalInfoString(TERMINAL_DATA_PATH), "\\MQL5\\Files\\Common");
      // Don't delete yet - we need to find it!
   }
   else
   {
      int error = GetLastError();
      Print("❌ Cannot create test file. Error: ", error);
      Print("   Terminal Data Path: ", TerminalInfoString(TERMINAL_DATA_PATH));
   }
   
   // Set timer to check every 100ms (0.1 seconds)
   EventSetTimer(1); // Timer in seconds, but we'll check in OnTimer
   
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Print("MT5 REST API EA Stopped");
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   // Check for requests every tick (or use timer)
   CheckForRequests();
}

//+------------------------------------------------------------------+
//| Timer function (called every second)                            |
//+------------------------------------------------------------------+
void OnTimer()
{
   // Print debug every 10 seconds to confirm timer is working
   static int counter = 0;
   counter++;
   if(counter >= 10)
   {
      Print("Timer check #", counter, " - Checking for requests...");
      counter = 0;
   }
   CheckForRequests();
}

//+------------------------------------------------------------------+
//| Check for incoming requests                                      |
//+------------------------------------------------------------------+
void CheckForRequests()
{
   // Try to open file - FILE_COMMON should work
   int file_handle = FileOpen(request_file, FILE_READ|FILE_TXT|FILE_COMMON);
   if(file_handle == INVALID_HANDLE)
   {
      // File doesn't exist or can't be opened
      int error_code = GetLastError();
      
      // Error 5004 (FILE_NOT_FOUND) is normal when no request is pending
      // Only show errors for other issues
      if(error_code != 5004 && error_code != 0)
      {
         static int last_error = 0;
         if(error_code != last_error)
         {
            Print("⚠️ Cannot open request file. Error code: ", error_code);
            last_error = error_code;
         }
      }
      
      // Reset last error to avoid false positives
      ResetLastError();
      return;
   }
   
   Print("✅ Request file opened successfully!");
   
   string request = "";
   while(!FileIsEnding(file_handle))
   {
      request = request + FileReadString(file_handle) + "\n";
   }
   FileClose(file_handle);
   
   // Delete request file
   FileDelete(request_file, FILE_COMMON);
   
   if(StringLen(request) > 0)
   {
      Print("✅ Received request: ", request);
      string response = ProcessRequest(request);
      Print("✅ Sending response: ", StringSubstr(response, 0, 100), "...");
      WriteResponse(response);
      Print("✅ Response written successfully");
   }
}

//+------------------------------------------------------------------+
//| Process HTTP-like request                                        |
//+------------------------------------------------------------------+
string ProcessRequest(string request)
{
   string method = "";
   string path = "";
   
   // Parse request (simplified - expecting: "GET /account" or "POST /place-order {...}")
   string lines[];
   int line_count = StringSplit(request, '\n', lines);
   
   if(line_count > 0)
   {
      string first_line = lines[0];
      string parts[];
      int part_count = StringSplit(first_line, ' ', parts);
      if(part_count >= 2)
      {
         method = parts[0];
         path = parts[1];
      }
   }
   
   // Route request
   Print("🔍 Processing request - Method: ", method, ", Path: ", path);
   
   if(path == "/health" || path == "/health/")
   {
      return "{\"status\":\"ok\",\"service\":\"MT5 REST API\"}";
   }
   else if(StringFind(path, "/connect") >= 0)
   {
      return HandleConnect();
   }
   else if(path == "/account" || path == "/account/")
   {
      return HandleAccount();
   }
   else if(path == "/positions" || path == "/positions/")
   {
      return HandlePositions();
   }
   else if(path == "/symbols" || path == "/symbols/")
   {
      return HandleSymbols();
   }
   else if(StringFind(path, "/symbol/") >= 0)
   {
      int symbol_pos = StringFind(path, "/symbol/");
      string symbol_name = StringSubstr(path, symbol_pos + 8);
      return HandleSymbolInfo(symbol_name);
   }
   else if(StringFind(path, "/place-order") >= 0)
   {
      string body = "";
      if(line_count > 1)
      {
         body = lines[1];
      }
      return HandlePlaceOrder(body);
   }
   else if(StringFind(path, "/close-position/") >= 0)
   {
      Print("🔒 Close position request detected!");
      int pos_pos = StringFind(path, "/close-position/");
      string ticket_str = StringSubstr(path, pos_pos + 16);
      Print("   Ticket string: ", ticket_str);
      // Parse as ulong directly (position tickets are ulong, not int)
      ulong ticket = StringToInteger(ticket_str);
      Print("   Parsed ticket (ulong): ", ticket);
      string result = HandleClosePosition(ticket);
      Print("   Close result: ", StringSubstr(result, 0, 200));
      return result;
   }
   else if(path == "/history" || path == "/history/")
   {
      return HandleHistory();
   }
   else if(StringFind(path, "/candles/") >= 0)
   {
      int candles_pos = StringFind(path, "/candles/");
      string symbol_and_params = StringSubstr(path, candles_pos + 9);
      // Format: /candles/SYMBOL/H1/100
      string parts[];
      int part_count = StringSplit(symbol_and_params, '/', parts);
      if(part_count >= 1)
      {
         string symbol_name = parts[0];
         string timeframe_str = (part_count >= 2) ? parts[1] : "H1";
         int count = (part_count >= 3) ? (int)StringToInteger(parts[2]) : 100;
         return HandleCandles(symbol_name, timeframe_str, count);
      }
      else
      {
         return "{\"error\":\"Invalid candles request format\"}";
      }
   }
   else
   {
      Print("⚠️ Unknown path: ", path);
      return "{\"error\":\"Not found\",\"path\":\"" + path + "\"}";
   }
}

//+------------------------------------------------------------------+
//| Write response to file                                           |
//+------------------------------------------------------------------+
void WriteResponse(string response)
{
   int file_handle = FileOpen(response_file, FILE_WRITE|FILE_TXT|FILE_COMMON);
   if(file_handle != INVALID_HANDLE)
   {
      FileWriteString(file_handle, response);
      FileClose(file_handle);
      Print("Response written successfully");
   }
   else
   {
      int error = GetLastError();
      Print("Failed to write response file. Error: ", error);
   }
}

//+------------------------------------------------------------------+
//| Handle connect request                                           |
//+------------------------------------------------------------------+
string HandleConnect()
{
   string json = "{";
   json = json + "\"success\":true,";
   json = json + "\"message\":\"Connected to MT5\",";
   json = json + "\"account\":{";
   json = json + "\"login\":" + IntegerToString(account.Login()) + ",";
   json = json + "\"balance\":" + DoubleToString(account.Balance(), 2) + ",";
   json = json + "\"equity\":" + DoubleToString(account.Equity(), 2) + ",";
   json = json + "\"margin\":" + DoubleToString(account.Margin(), 2) + ",";
   json = json + "\"free_margin\":" + DoubleToString(account.FreeMargin(), 2) + ",";
   json = json + "\"server\":\"" + account.Server() + "\",";
   json = json + "\"currency\":\"" + account.Currency() + "\"";
   json = json + "}";
   json = json + "}";
   return json;
}

//+------------------------------------------------------------------+
//| Handle account info request                                      |
//+------------------------------------------------------------------+
string HandleAccount()
{
   string json = "{";
   json = json + "\"login\":" + IntegerToString(account.Login()) + ",";
   json = json + "\"balance\":" + DoubleToString(account.Balance(), 2) + ",";
   json = json + "\"equity\":" + DoubleToString(account.Equity(), 2) + ",";
   json = json + "\"margin\":" + DoubleToString(account.Margin(), 2) + ",";
   json = json + "\"free_margin\":" + DoubleToString(account.FreeMargin(), 2) + ",";
   json = json + "\"profit\":" + DoubleToString(account.Profit(), 2) + ",";
   json = json + "\"server\":\"" + account.Server() + "\",";
   json = json + "\"currency\":\"" + account.Currency() + "\",";
   json = json + "\"leverage\":" + IntegerToString(account.Leverage()) + ",";
   json = json + "\"company\":\"" + account.Company() + "\"";
   json = json + "}";
   return json;
}

//+------------------------------------------------------------------+
//| Handle positions request                                         |
//+------------------------------------------------------------------+
string HandlePositions()
{
   string json = "{\"positions\":[";
   bool first = true;
   
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      if(position.SelectByIndex(i))
      {
         if(!first) json = json + ",";
         first = false;
         
         string pos_type = (position.PositionType() == POSITION_TYPE_BUY) ? "BUY" : "SELL";
         
         json = json + "{";
         json = json + "\"ticket\":" + IntegerToString(position.Ticket()) + ",";
         json = json + "\"symbol\":\"" + position.Symbol() + "\",";
         json = json + "\"type\":\"" + pos_type + "\",";
         json = json + "\"volume\":" + DoubleToString(position.Volume(), 2) + ",";
         json = json + "\"price_open\":" + DoubleToString(position.PriceOpen(), 5) + ",";
         json = json + "\"price_current\":" + DoubleToString(position.PriceCurrent(), 5) + ",";
         json = json + "\"profit\":" + DoubleToString(position.Profit(), 2) + ",";
         json = json + "\"swap\":" + DoubleToString(position.Swap(), 2) + ",";
         json = json + "\"time\":\"" + TimeToString(position.Time(), TIME_DATE|TIME_SECONDS) + "\"";
         json = json + "}";
      }
   }
   
   json = json + "]}";
   return json;
}

//+------------------------------------------------------------------+
//| Handle symbols request                                           |
//+------------------------------------------------------------------+
string HandleSymbols()
{
   string json = "{\"symbols\":[";
   bool first = true;
   
   string symbols[] = {"EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "NZDUSD", "USDCHF"};
   
   for(int i = 0; i < ArraySize(symbols); i++)
   {
      if(symbol_info.Name(symbols[i]))
      {
         if(!first) json = json + ",";
         first = false;
         
         json = json + "{";
         json = json + "\"name\":\"" + symbols[i] + "\",";
         json = json + "\"description\":\"" + symbol_info.Description() + "\",";
         json = json + "\"currency_base\":\"" + symbol_info.CurrencyBase() + "\",";
         json = json + "\"currency_profit\":\"" + symbol_info.CurrencyProfit() + "\",";
         json = json + "\"digits\":" + IntegerToString(symbol_info.Digits()) + ",";
         json = json + "\"point\":" + DoubleToString(symbol_info.Point(), 10);
         json = json + "}";
      }
   }
   
   json = json + "]}";
   return json;
}

//+------------------------------------------------------------------+
//| Handle symbol info request                                       |
//+------------------------------------------------------------------+
string HandleSymbolInfo(string symbol_name)
{
   if(!SymbolSelect(symbol_name, true))
   {
      return "{\"error\":\"Symbol not found\"}";
   }
   
   if(!symbol_info.Name(symbol_name))
   {
      return "{\"error\":\"Symbol not found\"}";
   }
   
   MqlTick tick;
   SymbolInfoTick(symbol_name, tick);
   
   int digits = (int)symbol_info.Digits();
   double point_val = SymbolInfoDouble(symbol_name, SYMBOL_POINT);
   double vol_min = SymbolInfoDouble(symbol_name, SYMBOL_VOLUME_MIN);
   double vol_max = SymbolInfoDouble(symbol_name, SYMBOL_VOLUME_MAX);
   double vol_step = SymbolInfoDouble(symbol_name, SYMBOL_VOLUME_STEP);
   
   string json = "{";
   json = json + "\"symbol\":\"" + symbol_name + "\",";
   json = json + "\"description\":\"" + symbol_info.Description() + "\",";
   json = json + "\"currency_base\":\"" + symbol_info.CurrencyBase() + "\",";
   json = json + "\"currency_profit\":\"" + symbol_info.CurrencyProfit() + "\",";
   json = json + "\"digits\":" + IntegerToString(digits) + ",";
   json = json + "\"point\":" + DoubleToString(point_val, 10) + ",";
   json = json + "\"volume_min\":" + DoubleToString(vol_min, 2) + ",";
   json = json + "\"volume_max\":" + DoubleToString(vol_max, 2) + ",";
   json = json + "\"volume_step\":" + DoubleToString(vol_step, 2) + ",";
   json = json + "\"bid\":" + DoubleToString(tick.bid, digits) + ",";
   json = json + "\"ask\":" + DoubleToString(tick.ask, digits) + ",";
   json = json + "\"last\":" + DoubleToString(tick.last, digits) + ",";
   json = json + "\"time\":\"" + TimeToString(tick.time, TIME_DATE|TIME_SECONDS) + "\"";
   json = json + "}";
   return json;
}

//+------------------------------------------------------------------+
//| Handle place order request                                       |
//+------------------------------------------------------------------+
string HandlePlaceOrder(string body)
{
   string symbol_name = "";
   string order_type_str = "";
   double volume_val = 0;
   double sl_val = 0;
   double tp_val = 0;
   
   // Parse JSON from body
   int symbol_pos = StringFind(body, "\"symbol\"");
   if(symbol_pos >= 0)
   {
      int start = StringFind(body, "\"", symbol_pos + 8) + 1;
      int end = StringFind(body, "\"", start);
      if(end > start) symbol_name = StringSubstr(body, start, end - start);
   }
   
   int type_pos = StringFind(body, "\"type\"");
   if(type_pos >= 0)
   {
      int start = StringFind(body, "\"", type_pos + 6) + 1;
      int end = StringFind(body, "\"", start);
      if(end > start) order_type_str = StringSubstr(body, start, end - start);
   }
   
   int volume_pos = StringFind(body, "\"volume\"");
   if(volume_pos >= 0)
   {
      int start = StringFind(body, ":", volume_pos) + 1;
      string volume_str = "";
      for(int i = start; i < (int)StringLen(body); i++)
      {
         string char_str = StringSubstr(body, i, 1);
         if(char_str == "," || char_str == "}" || char_str == " ")
         {
            if(StringLen(volume_str) > 0) break;
            continue;
         }
         volume_str = volume_str + char_str;
      }
      volume_val = StringToDouble(volume_str);
   }
   
   // Parse SL (stop loss)
   int sl_pos = StringFind(body, "\"sl\"");
   if(sl_pos >= 0)
   {
      int start = StringFind(body, ":", sl_pos) + 1;
      string sl_str = "";
      for(int i = start; i < (int)StringLen(body); i++)
      {
         string char_str = StringSubstr(body, i, 1);
         if(char_str == "," || char_str == "}" || char_str == " ")
         {
            if(StringLen(sl_str) > 0) break;
            continue;
         }
         sl_str = sl_str + char_str;
      }
      sl_val = StringToDouble(sl_str);
   }
   
   // Parse TP (take profit)
   int tp_pos = StringFind(body, "\"tp\"");
   if(tp_pos >= 0)
   {
      int start = StringFind(body, ":", tp_pos) + 1;
      string tp_str = "";
      for(int i = start; i < (int)StringLen(body); i++)
      {
         string char_str = StringSubstr(body, i, 1);
         if(char_str == "," || char_str == "}" || char_str == " ")
         {
            if(StringLen(tp_str) > 0) break;
            continue;
         }
         tp_str = tp_str + char_str;
      }
      tp_val = StringToDouble(tp_str);
   }
   
   if(StringLen(symbol_name) == 0 || StringLen(order_type_str) == 0 || volume_val == 0)
   {
      return "{\"error\":\"Missing required fields\"}";
   }
   
   // Get symbol info for precision
   symbol_info.Name(symbol_name);
   int digits = (int)symbol_info.Digits();
   
   // Normalize SL/TP values (if 0, don't set them)
   double normalized_sl = (sl_val > 0) ? sl_val : 0;
   double normalized_tp = (tp_val > 0) ? tp_val : 0;
   
   bool success = false;
   double price = 0;
   
   if(order_type_str == "BUY")
   {
      price = SymbolInfoDouble(symbol_name, SYMBOL_ASK);
      if(normalized_sl > 0 || normalized_tp > 0)
      {
         success = trade.Buy(volume_val, symbol_name, 0, normalized_sl, normalized_tp, "AI Trader v3.12");
      }
      else
      {
         success = trade.Buy(volume_val, symbol_name, 0, 0, 0, "AI Trader v3.12");
      }
   }
   else if(order_type_str == "SELL")
   {
      price = SymbolInfoDouble(symbol_name, SYMBOL_BID);
      if(normalized_sl > 0 || normalized_tp > 0)
      {
         success = trade.Sell(volume_val, symbol_name, 0, normalized_sl, normalized_tp, "AI Trader v3.12");
      }
      else
      {
         success = trade.Sell(volume_val, symbol_name, 0, 0, 0, "AI Trader v3.12");
      }
   }
   else
   {
      return "{\"error\":\"Invalid order type\"}";
   }
   
   if(success)
   {
      ulong order_ticket = trade.ResultOrder();
      ulong deal_ticket = trade.ResultDeal();
      double executed_price = trade.ResultPrice();
      
      string json = "{";
      json = json + "\"success\":true,";
      json = json + "\"order\":" + IntegerToString((long)order_ticket) + ",";
      json = json + "\"deal\":" + IntegerToString((long)deal_ticket) + ",";
      json = json + "\"volume\":" + DoubleToString(volume_val, 2) + ",";
      json = json + "\"price\":" + DoubleToString(executed_price, digits) + ",";
      json = json + "\"sl\":" + DoubleToString(normalized_sl, digits) + ",";
      json = json + "\"tp\":" + DoubleToString(normalized_tp, digits);
      json = json + "}";
      return json;
   }
   else
   {
      int retcode = trade.ResultRetcode();
      string error_msg = trade.ResultRetcodeDescription();
      string json = "{\"error\":\"" + error_msg + "\",\"retcode\":" + IntegerToString(retcode) + "}";
      return json;
   }
}

//+------------------------------------------------------------------+
//| Handle close position request                                    |
//+------------------------------------------------------------------+
string HandleClosePosition(ulong ticket)
{
   // Find position by iterating through all positions
   int total = PositionsTotal();
   bool found = false;
   string symbol_name = "";
   double volume_val = 0;
   ENUM_POSITION_TYPE pos_type = WRONG_VALUE;
   ulong pos_ticket = 0;
   
   Print("🔍 Looking for position with ticket: ", ticket);
   Print("📊 Total positions: ", total);
   
   for(int i = 0; i < total; i++)
   {
      ulong ticket_id = PositionGetTicket(i);
      if(ticket_id > 0)
      {
         Print("   Position ", i, ": ticket = ", ticket_id);
         if(ticket_id == ticket)
         {
            Print("✅ Found matching position!");
            pos_ticket = ticket_id;
            symbol_name = PositionGetString(POSITION_SYMBOL);
            volume_val = PositionGetDouble(POSITION_VOLUME);
            pos_type = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
            found = true;
            Print("   Symbol: ", symbol_name, ", Volume: ", volume_val, ", Type: ", EnumToString(pos_type));
            break;
         }
      }
   }
   
   if(!found)
   {
      return "{\"error\":\"Position not found. Ticket: " + IntegerToString((long)ticket) + "\"}";
   }
   
   // Get current price for opposite order
   symbol_info.Name(symbol_name);
   if(!symbol_info.Name(symbol_name))
   {
      return "{\"error\":\"Symbol not found: " + symbol_name + "\"}";
   }
   
   MqlTick tick;
   if(!SymbolInfoTick(symbol_name, tick))
   {
      return "{\"error\":\"Could not get tick data for " + symbol_name + "\"}";
   }
   
   // Determine opposite order type and price
   ENUM_ORDER_TYPE order_type;
   double price;
   if(pos_type == POSITION_TYPE_BUY)
   {
      // Close BUY position with SELL order
      order_type = ORDER_TYPE_SELL;
      price = tick.bid;
   }
   else if(pos_type == POSITION_TYPE_SELL)
   {
      // Close SELL position with BUY order
      order_type = ORDER_TYPE_BUY;
      price = tick.ask;
   }
   else
   {
      return "{\"error\":\"Invalid position type\"}";
   }
   
   // Place opposite order to close position
   Print("🔒 Attempting to close position with PositionClose()...");
   if(trade.PositionClose(pos_ticket))
   {
      Print("✅ PositionClose() succeeded!");
      Sleep(100);
      return "{\"success\":true,\"ticket\":" + IntegerToString((long)pos_ticket) + ",\"closed_price\":" + DoubleToString(price, symbol_info.Digits()) + "}";
   }
   else
   {
      Print("⚠️ PositionClose() failed, trying OrderSend()...");
      int retcode = trade.ResultRetcode();
      string retdesc = trade.ResultRetcodeDescription();
      Print("   Retcode: ", retcode, ", Description: ", retdesc);
      
      // If PositionClose fails, try manual close with opposite order
      MqlTradeRequest request = {};
      MqlTradeResult result = {};
      
      request.action = TRADE_ACTION_DEAL;
      request.symbol = symbol_name;
      request.volume = volume_val;
      request.type = order_type;
      request.position = pos_ticket;  // Use ulong ticket
      request.price = price;
      request.deviation = 20;
      request.magic = 234000;
      request.comment = "Close position";
      request.type_time = ORDER_TIME_GTC;
      request.type_filling = ORDER_FILLING_IOC;
      
      Print("📤 Sending OrderSend() with:");
      Print("   Symbol: ", symbol_name);
      Print("   Volume: ", volume_val);
      Print("   Type: ", EnumToString(order_type));
      Print("   Position: ", pos_ticket);
      Print("   Price: ", price);
      
      if(OrderSend(request, result))
      {
         Print("✅ OrderSend() succeeded! Retcode: ", result.retcode);
         if(result.retcode == TRADE_RETCODE_DONE)
         {
            return "{\"success\":true,\"ticket\":" + IntegerToString((long)pos_ticket) + ",\"order\":" + IntegerToString((long)result.order) + ",\"price\":" + DoubleToString(result.price, symbol_info.Digits()) + "}";
         }
         else
         {
            return "{\"error\":\"Close failed: " + IntegerToString(result.retcode) + " - " + result.comment + "\"}";
         }
      }
      else
      {
         int error_code = GetLastError();
         Print("❌ OrderSend() failed! Error: ", error_code);
         return "{\"error\":\"OrderSend failed: " + IntegerToString(error_code) + "\"}";
      }
   }
}

//+------------------------------------------------------------------+
//| Handle history request                                           |
//+------------------------------------------------------------------+
string HandleHistory()
{
   string json = "{\"trades\":[";
   bool first = true;
   
   datetime from_date = TimeCurrent() - 2592000;
   datetime to_date = TimeCurrent();
   
   if(HistorySelect(from_date, to_date))
   {
      int total = HistoryDealsTotal();
      for(int i = 0; i < total; i++)
      {
         ulong ticket = HistoryDealGetTicket(i);
         if(ticket > 0)
         {
            // Include both entry and exit deals, but prioritize exit deals for profit calculation
            int entry_type = (int)HistoryDealGetInteger(ticket, DEAL_ENTRY);
            
            // Only include exit deals (DEAL_ENTRY_OUT) for win rate calculation
            // Exit deals have the actual profit/loss
            if(entry_type == DEAL_ENTRY_OUT)
            {
               if(!first) json = json + ",";
               first = false;
               
               string deal_type = (HistoryDealGetInteger(ticket, DEAL_TYPE) == DEAL_TYPE_BUY) ? "BUY" : "SELL";
               
               json = json + "{";
               json = json + "\"ticket\":" + IntegerToString((long)ticket) + ",";
               json = json + "\"symbol\":\"" + HistoryDealGetString(ticket, DEAL_SYMBOL) + "\",";
               json = json + "\"type\":\"" + deal_type + "\",";
               json = json + "\"volume\":" + DoubleToString(HistoryDealGetDouble(ticket, DEAL_VOLUME), 2) + ",";
               json = json + "\"price\":" + DoubleToString(HistoryDealGetDouble(ticket, DEAL_PRICE), 5) + ",";
               json = json + "\"profit\":" + DoubleToString(HistoryDealGetDouble(ticket, DEAL_PROFIT), 2) + ",";
               json = json + "\"entry\":\"" + (entry_type == DEAL_ENTRY_IN ? "IN" : "OUT") + "\",";
               json = json + "\"time\":\"" + TimeToString((datetime)HistoryDealGetInteger(ticket, DEAL_TIME), TIME_DATE|TIME_SECONDS) + "\"";
               json = json + "}";
            }
         }
      }
   }
   
   json = json + "]}";
   return json;
}

//+------------------------------------------------------------------+
//| Handle candles request (OHLC data)                              |
//+------------------------------------------------------------------+
string HandleCandles(string symbol_name, string timeframe_str, int count)
{
   Print("📊 Candles request: Symbol=", symbol_name, ", Timeframe=", timeframe_str, ", Count=", count);
   
   // Select symbol
   if(!SymbolSelect(symbol_name, true))
   {
      return "{\"error\":\"Symbol not found: " + symbol_name + "\"}";
   }
   
   // Parse timeframe
   ENUM_TIMEFRAMES timeframe = PERIOD_H1; // Default
   if(timeframe_str == "M1") timeframe = PERIOD_M1;
   else if(timeframe_str == "M5") timeframe = PERIOD_M5;
   else if(timeframe_str == "M15") timeframe = PERIOD_M15;
   else if(timeframe_str == "M30") timeframe = PERIOD_M30;
   else if(timeframe_str == "H1") timeframe = PERIOD_H1;
   else if(timeframe_str == "H4") timeframe = PERIOD_H4;
   else if(timeframe_str == "D1") timeframe = PERIOD_D1;
   else if(timeframe_str == "W1") timeframe = PERIOD_W1;
   else if(timeframe_str == "MN1") timeframe = PERIOD_MN1;
   
   // Get candlestick data
   MqlRates rates[];
   int copied = CopyRates(symbol_name, timeframe, 0, count, rates);
   
   if(copied <= 0)
   {
      int error = GetLastError();
      return "{\"error\":\"Failed to get candles. Error: " + IntegerToString(error) + "\"}";
   }
   
   Print("✅ Copied ", copied, " candles for ", symbol_name);
   
   // Build JSON response
   string json = "{\"symbol\":\"" + symbol_name + "\",";
   json = json + "\"timeframe\":\"" + timeframe_str + "\",";
   json = json + "\"count\":" + IntegerToString(copied) + ",";
   json = json + "\"candles\":[";
   
   // Get symbol digits for precision
   int digits = (int)SymbolInfoInteger(symbol_name, SYMBOL_DIGITS);
   
   for(int i = 0; i < copied; i++)
   {
      if(i > 0) json = json + ",";
      
      json = json + "{";
      json = json + "\"time\":\"" + TimeToString(rates[i].time, TIME_DATE|TIME_SECONDS) + "\",";
      json = json + "\"open\":" + DoubleToString(rates[i].open, digits) + ",";
      json = json + "\"high\":" + DoubleToString(rates[i].high, digits) + ",";
      json = json + "\"low\":" + DoubleToString(rates[i].low, digits) + ",";
      json = json + "\"close\":" + DoubleToString(rates[i].close, digits) + ",";
      json = json + "\"volume\":" + IntegerToString((long)rates[i].tick_volume);
      json = json + "}";
   }
   
   json = json + "]}";
   return json;
}
