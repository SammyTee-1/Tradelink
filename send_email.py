import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# === CONFIG ===
sender = "service.trubit@gmail.com"
password = "xidp ebtf ehkw nayk"  # use Gmail App Password

def send_verification_email(receiver, code):
    subject = "Your Tradelink Verification Code"
    body = f"""Hello,

Your Tradelink verification code is: {code}

This code will expire in 10 minutes.

Regards,
Trubit Bot
"""
    msg = MIMEMultipart()
    msg["From"] = sender
    msg["To"] = receiver
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))
    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(sender, password)
            server.sendmail(sender, [receiver], msg.as_string())
        print("✅ Verification email sent!")
    except Exception as e:
        print("❌ Error sending email:", e)
