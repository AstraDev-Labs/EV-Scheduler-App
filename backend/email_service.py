import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
# Load environment variables
load_dotenv()

import logging
logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        # SMTP Configuration - matching working CTF setup
        self.smtp_server = "smtp.gmail.com"
        self.smtp_port = 587
        self.smtp_username = "tarun.ganapathi2007@gmail.com"
        self.smtp_password = os.getenv("MAIL_PASSWORD", "")
        self.from_email = "tarun.ganapathi2007@gmail.com"
        self.from_name = "Smart EV Scheduler"

    def send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """Send an email using SMTP - pattern from working CTF project"""
        if not self.smtp_password:
            logger.error(f"CRITICAL: MAIL_PASSWORD is missing in environment variables. Email will NOT be sent.")
            logger.info(f"DEBUG: Would send email to {to_email} with subject: {subject}")
            return False

        try:
            logger.debug(f"DEBUG: Attempting to send email to {to_email} via {self.smtp_server}...")
            
            msg = MIMEMultipart()
            msg['From'] = self.smtp_username
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(html_content, 'html'))

            logger.info("DEBUG: Connecting to SMTP server...")
            server = smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=10)
            server.starttls()
            logger.info("DEBUG: Logging in to SMTP...")
            server.login(self.smtp_username, self.smtp_password)
            logger.info(f"DEBUG: Sending email content to {to_email}...")
            server.sendmail(self.smtp_username, to_email, msg.as_string())
            server.quit()
            logger.info(f"SUCCESS: Email sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"ERROR: Failed to send email. Reason: {e}")
            return False


    def send_booking_confirmation(
        self,
        to_email: str,
        user_name: str,
        charger_name: str,
        start_time: str,
        end_time: str,
        total_cost: float,
        energy_kwh: float
    ) -> bool:
        """Send booking confirmation email"""
        
        # Parse datetime strings
        start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        
        # Format times
        date_str = start_dt.strftime("%B %d, %Y")
        start_time_str = start_dt.strftime("%I:%M %p")
        end_time_str = end_dt.strftime("%I:%M %p")

        subject = f"Booking Confirmed - {charger_name}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                    padding: 30px 20px;
                    border-radius: 10px 10px 0 0;
                    text-align: center;
                }}
                .content {{
                    background: #f9f9f9;
                    padding: 30px 20px;
                    border: 1px solid #e0e0e0;
                }}
                .booking-card {{
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    margin: 20px 0;
                }}
                .detail-row {{
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid #f0f0f0;
                }}
                .label {{
                    font-weight: 600;
                    color: #666;
                }}
                .value {{
                    color: #10b981;
                    font-weight: bold;
                }}
                .footer {{
                    background: #f0f0f0;
                    padding: 20px;
                    border-radius: 0 0 10px 10px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                }}
                .success-icon {{
                    font-size: 48px;
                    margin-bottom: 10px;
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <div class="success-icon">✅</div>
                <h1 style="margin: 0;">Booking Confirmed!</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">Your EV charging slot has been reserved</p>
            </div>
            
            <div class="content">
                <p>Hi {user_name},</p>
                <p>Your charging slot has been successfully booked. Here are your booking details:</p>
                
                <div class="booking-card">
                    <h2 style="color: #10b981; margin-top: 0;">📍 {charger_name}</h2>
                    
                    <div class="detail-row">
                        <span class="label">📅 Date:</span>
                        <span class="value">{date_str}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="label">🕐 Start Time:</span>
                        <span class="value">{start_time_str}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="label">🕐 End Time:</span>
                        <span class="value">{end_time_str}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="label">⚡ Estimated Energy:</span>
                        <span class="value">{energy_kwh} kWh</span>
                    </div>
                    
                    <div class="detail-row" style="border-bottom: none;">
                        <span class="label">💰 Total Cost:</span>
                        <span class="value">₹{total_cost:.2f}</span>
                    </div>
                </div>
                
                <p><strong>Important:</strong> Please arrive on time. Your slot will be held for 15 minutes after the start time.</p>
                
                <p>You can view or modify your booking from the Schedule page in the app.</p>
            </div>
            
            <div class="footer">
                <p>This is an automated email from Smart EV Scheduler</p>
                <p>© 2026 Smart EV Scheduler. All rights reserved.</p>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, html_content)

    def send_verification_email(
        self,
        to_email: str,
        user_name: str,
        verification_token: str
    ) -> bool:
        """Send email verification link"""
        # Frontend URL for verification - default to Vercel production if not set
        frontend_url = os.getenv("FRONTEND_URL", "https://ev-scheduler-app.vercel.app")
        verification_link = f"{frontend_url}/verify-email?token={verification_token}"
        
        subject = "Verify Your Smart EV Scheduler Account"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                    margin: 0;
                    padding: 40px 20px;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    border-radius: 16px;
                    padding: 40px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                }}
                h1 {{
                    color: #10b981;
                    text-align: center;
                    margin-bottom: 10px;
                    font-size: 28px;
                }}
                .subtitle {{
                    color: #64748b;
                    text-align: center;
                    margin-bottom: 30px;
                    font-size: 14px;
                }}
                .greeting {{
                    color: #1e293b;
                    font-size: 16px;
                    margin-bottom: 20px;
                    font-weight: 500;
                }}
                .message {{
                    color: #334155;
                    line-height: 1.6;
                    margin-bottom: 30px;
                }}
                .button-container {{
                    text-align: center;
                    margin: 40px 0;
                }}
                .verify-button {{
                    display: inline-block;
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: #ffffff;
                    text-decoration: none;
                    padding: 14px 32px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 16px;
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
                }}
                .verify-button:hover {{
                    background: linear-gradient(135deg, #059669 0%, #047857 100%);
                }}
                .footer {{
                    color: #64748b;
                    font-size: 12px;
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }}
                .logo {{
                    color: #10b981;
                    font-size: 24px;
                    font-weight: bold;
                    text-align: center;
                    margin-bottom: 20px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo">⚡ SmartCharge</div>
                <h1>Verify Your Email</h1>
                <p class="subtitle">Smart EV Scheduler</p>
                
                <p class="greeting">Hello {user_name},</p>
                
                <p class="message">
                    Welcome to Smart EV Scheduler! We're excited to have you on board.<br><br>
                    To complete your registration and start optimizing your EV charging, 
                    please verify your email address by clicking the button below.
                </p>
                
                <div class="button-container">
                    <a href="{verification_link}" class="verify-button">
                        Verify Email Address
                    </a>
                </div>
                
                <p class="message" style="font-size: 14px;">
                    Or copy and paste this link into your browser:<br>
                    <span style="color: #10b981; word-break: break-all;">{verification_link}</span>
                </p>
                
                <p class="footer">
                    If you didn't create an account with Smart EV Scheduler, you can safely ignore this email.<br>
                    This link will expire in 24 hours.
                </p>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, html_content)

# Create singleton instance
email_service = EmailService()
