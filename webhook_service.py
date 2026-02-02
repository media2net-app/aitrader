#!/usr/bin/env python3
"""
Webhook/Alert Service
Webhooks, email alerts, en Telegram/Discord integration
"""

import requests
import json
import os
from typing import Dict, List, Optional
from datetime import datetime

class WebhookService:
    def __init__(self, storage_file: str = 'webhooks.json'):
        self.storage_file = storage_file
        self.webhooks = []
        self.email_config = None
        self.telegram_config = None
        self.discord_config = None
        self.load_config()
    
    def load_config(self):
        """Load webhook configuration"""
        if os.path.exists(self.storage_file):
            try:
                with open(self.storage_file, 'r') as f:
                    data = json.load(f)
                    self.webhooks = data.get('webhooks', [])
                    self.email_config = data.get('email', None)
                    self.telegram_config = data.get('telegram', None)
                    self.discord_config = data.get('discord', None)
            except Exception as e:
                print(f"Error loading webhook config: {e}")
                self.webhooks = []
        else:
            self.webhooks = []
    
    def save_config(self):
        """Save webhook configuration"""
        try:
            data = {
                'webhooks': self.webhooks,
                'email': self.email_config,
                'telegram': self.telegram_config,
                'discord': self.discord_config,
                'last_updated': datetime.now().isoformat()
            }
            with open(self.storage_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Error saving webhook config: {e}")
    
    def register_webhook(self, url: str, events: List[str] = None, 
                        secret: str = None, description: str = "") -> bool:
        """
        Register a webhook endpoint
        
        Args:
            url: Webhook URL
            events: List of events to subscribe to
            secret: Optional secret for authentication
            description: Description of webhook
        
        Returns:
            True if successful
        """
        if events is None:
            events = ['trade_opened', 'trade_closed', 'signal_generated']
        
        webhook = {
            'url': url,
            'events': events,
            'secret': secret,
            'description': description,
            'active': True,
            'created_at': datetime.now().isoformat()
        }
        
        self.webhooks.append(webhook)
        self.save_config()
        
        print(f"✅ Webhook registered: {url}")
        return True
    
    def unregister_webhook(self, url: str) -> bool:
        """Unregister a webhook"""
        self.webhooks = [w for w in self.webhooks if w['url'] != url]
        self.save_config()
        return True
    
    def configure_email(self, smtp_server: str, smtp_port: int, 
                       username: str, password: str, from_email: str,
                       to_emails: List[str]) -> bool:
        """Configure email alerts"""
        self.email_config = {
            'smtp_server': smtp_server,
            'smtp_port': smtp_port,
            'username': username,
            'password': password,
            'from_email': from_email,
            'to_emails': to_emails
        }
        self.save_config()
        return True
    
    def configure_telegram(self, bot_token: str, chat_id: str) -> bool:
        """Configure Telegram bot"""
        self.telegram_config = {
            'bot_token': bot_token,
            'chat_id': chat_id
        }
        self.save_config()
        return True
    
    def configure_discord(self, webhook_url: str) -> bool:
        """Configure Discord webhook"""
        self.discord_config = {
            'webhook_url': webhook_url
        }
        self.save_config()
        return True
    
    def send_webhook(self, event: str, data: Dict):
        """
        Send webhook to all registered endpoints for event
        
        Args:
            event: Event name
            data: Event data
        """
        payload = {
            'event': event,
            'timestamp': datetime.now().isoformat(),
            'data': data
        }
        
        for webhook in self.webhooks:
            if not webhook.get('active', True):
                continue
            
            if event not in webhook.get('events', []):
                continue
            
            try:
                headers = {'Content-Type': 'application/json'}
                if webhook.get('secret'):
                    headers['X-Webhook-Secret'] = webhook['secret']
                
                response = requests.post(
                    webhook['url'],
                    json=payload,
                    headers=headers,
                    timeout=5
                )
                
                if response.status_code == 200:
                    print(f"✅ Webhook sent to {webhook['url']}")
                else:
                    print(f"⚠️  Webhook failed: {response.status_code}")
            
            except Exception as e:
                print(f"❌ Webhook error for {webhook['url']}: {e}")
    
    def send_email(self, subject: str, body: str, to_emails: List[str] = None):
        """
        Send email alert
        
        Args:
            subject: Email subject
            body: Email body
            to_emails: List of recipient emails (uses config if None)
        """
        if not self.email_config:
            print("⚠️  Email not configured")
            return False
        
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            recipients = to_emails or self.email_config.get('to_emails', [])
            if not recipients:
                print("⚠️  No email recipients")
                return False
            
            msg = MIMEMultipart()
            msg['From'] = self.email_config['from_email']
            msg['To'] = ', '.join(recipients)
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))
            
            server = smtplib.SMTP(self.email_config['smtp_server'], self.email_config['smtp_port'])
            server.starttls()
            server.login(self.email_config['username'], self.email_config['password'])
            server.send_message(msg)
            server.quit()
            
            print(f"✅ Email sent to {recipients}")
            return True
        
        except Exception as e:
            print(f"❌ Email error: {e}")
            return False
    
    def send_telegram(self, message: str):
        """Send Telegram message"""
        if not self.telegram_config:
            print("⚠️  Telegram not configured")
            return False
        
        try:
            url = f"https://api.telegram.org/bot{self.telegram_config['bot_token']}/sendMessage"
            payload = {
                'chat_id': self.telegram_config['chat_id'],
                'text': message,
                'parse_mode': 'HTML'
            }
            
            response = requests.post(url, json=payload, timeout=5)
            
            if response.status_code == 200:
                print("✅ Telegram message sent")
                return True
            else:
                print(f"⚠️  Telegram error: {response.status_code}")
                return False
        
        except Exception as e:
            print(f"❌ Telegram error: {e}")
            return False
    
    def send_discord(self, message: str, title: str = None):
        """Send Discord webhook message"""
        if not self.discord_config:
            print("⚠️  Discord not configured")
            return False
        
        try:
            payload = {
                'content': message
            }
            
            if title:
                payload['embeds'] = [{
                    'title': title,
                    'description': message,
                    'color': 0x5865F2  # Discord blue
                }]
            
            response = requests.post(
                self.discord_config['webhook_url'],
                json=payload,
                timeout=5
            )
            
            if response.status_code == 200 or response.status_code == 204:
                print("✅ Discord message sent")
                return True
            else:
                print(f"⚠️  Discord error: {response.status_code}")
                return False
        
        except Exception as e:
            print(f"❌ Discord error: {e}")
            return False
    
    def send_alert(self, event: str, data: Dict, channels: List[str] = None):
        """
        Send alert to all configured channels
        
        Args:
            event: Event name
            data: Event data
            channels: List of channels ('webhook', 'email', 'telegram', 'discord')
        """
        if channels is None:
            channels = ['webhook', 'email', 'telegram', 'discord']
        
        message = self._format_alert_message(event, data)
        
        if 'webhook' in channels:
            self.send_webhook(event, data)
        
        if 'email' in channels and self.email_config:
            subject = f"Trading Alert: {event}"
            self.send_email(subject, message)
        
        if 'telegram' in channels and self.telegram_config:
            self.send_telegram(message)
        
        if 'discord' in channels and self.discord_config:
            self.send_discord(message, event)
    
    def _format_alert_message(self, event: str, data: Dict) -> str:
        """Format alert message"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        if event == 'trade_opened':
            return f"🟢 Trade Opened\nTime: {timestamp}\nSymbol: {data.get('symbol')}\nType: {data.get('type')}\nPrice: ${data.get('price', 0):.2f}"
        
        elif event == 'trade_closed':
            return f"🔴 Trade Closed\nTime: {timestamp}\nSymbol: {data.get('symbol')}\nP&L: ${data.get('pnl', 0):.2f}\nReason: {data.get('reason', 'Manual')}"
        
        elif event == 'signal_generated':
            return f"📊 Signal Generated\nTime: {timestamp}\nSymbol: {data.get('symbol')}\nSignal: {data.get('signal')}\nConfidence: {data.get('confidence', 0):.1f}%"
        
        else:
            return f"Alert: {event}\nTime: {timestamp}\n{json.dumps(data, indent=2)}"

if __name__ == "__main__":
    # Test webhook service
    service = WebhookService()
    print("✅ Webhook Service initialized")
    
    # Test webhook registration
    service.register_webhook('https://example.com/webhook', ['trade_opened'])
    print(f"Registered webhooks: {len(service.webhooks)}")
