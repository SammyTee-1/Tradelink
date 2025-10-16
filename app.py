from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import firebase_admin
from firebase_admin import credentials, db
import random
from send_email import send_verification_email
import time
from werkzeug.security import generate_password_hash, check_password_hash
import pyotp
import qrcode
import io
import base64
import threading
import os
from dotenv import load_dotenv
from functools import wraps

app = Flask(__name__)
app.secret_key = "your_secret_key"  # Replace with a strong, unique secret key

# Load .env file
load_dotenv()

# Initialize Firebase Admin SDK
cred = credentials.Certificate("tradelink-key.json")
firebase_admin.initialize_app(cred, {
    'databaseURL': "https://tradelink-7d01b-default-rtdb.asia-southeast1.firebasedatabase.app"
})

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get("user_id"):
            return redirect(url_for('auth'))
        return f(*args, **kwargs)
    return decorated_function

    # Removed /crypto route and function as crypto functionality is deprecated

@app.route('/')
@login_required
def home():
    user_id = session["user_id"]
    users_ref = db.reference("users")
    user = users_ref.child(user_id).get()
    balance = user.get("balance", 0) if user else 0
    name = user.get("name", "") if user else ""
    return render_template("index.html", balance=balance, name=name)

@app.route('/auth')
def auth():
    return render_template("auth.html")

@app.route('/api/signup', methods=['POST'])
def api_signup():
    try:
        data = request.get_json()
        name = data.get('name')
        email = data.get('email')
        phone = data.get('phone')
        password = data.get('password')
        if not all([name, email, phone, password]):
            return jsonify({"success": False, "message": "All fields are required."})

        users_ref = db.reference("users")
        users = users_ref.get() or {}

        # Prevent duplicate email/phone
        for uid, user in users.items():
            if user.get('email') == email:
                return jsonify({"success": False, "message": "Email already registered."})
            if user.get('phone') == phone:
                return jsonify({"success": False, "message": "Phone already registered."})

        # Prevent duplicate pending signup for same email/phone
        pending = session.get('pending_signup')
        now = int(time.time())
        if pending and (
            pending.get('email') == email or pending.get('phone') == phone
        ) and now - pending.get('timestamp', 0) < 60:
            return jsonify({"success": True, "message": "Verification code already sent. Please check your email.", "verify": True})

        code = str(random.randint(100000, 999999))
        hashed_password = generate_password_hash(password)
        session['pending_signup'] = {
            "name": name,
            "email": email,
            "phone": phone,
            "password": hashed_password,
            "code": code,
            "timestamp": now
        }
        send_verification_email(email, code)
        return jsonify({"success": True, "message": "Verification code sent to your email.", "verify": True})
    except Exception as e:
        return jsonify({"success": False, "message": f"Server error: {str(e)}"})

@app.route('/api/verify_signup', methods=['POST'])
def api_verify_signup():
    data = request.get_json()
    code = data.get('code')
    pending = session.get('pending_signup')
    if not pending:
        return jsonify({"success": False, "message": "No signup in progress."})
    if not code or code != pending.get('code'):
        return jsonify({"success": False, "message": "Invalid verification code."})

    users_ref = db.reference("users")
    users = users_ref.get() or {}

    # Check again for duplicate email/phone before creating user
    for uid, user in users.items():
        if user.get('email') == pending['email']:
            session.pop('pending_signup', None)
            return jsonify({"success": False, "message": "Email already registered."})
        if user.get('phone') == pending['phone']:
            session.pop('pending_signup', None)
            return jsonify({"success": False, "message": "Phone already registered."})

    # Prevent race condition: if pending_signup is already used, do not create again
    if not pending.get('code') or not pending.get('email') or not pending.get('phone'):
        session.pop('pending_signup', None)
        return jsonify({"success": False, "message": "Signup session invalid or expired."})

    def generate_uid():
        return str(random.randint(10**7, 10**8 - 1))
    uid = generate_uid()
    while uid in users:
        uid = generate_uid()

    new_user = {
        # 'uid': uid,  # Do NOT store uid as a field, only as key
        "name": pending['name'],
        "email": pending['email'],
        "phone": pending['phone'],
        "password": pending['password'],
        "balance": 0,
        "theme": "light"
    }
    users_ref.child(uid).set(new_user)
    session["user_id"] = uid
    session.pop('pending_signup', None)  # Clear pending signup after success
    return jsonify({"success": True, "message": "Signup successful!", "redirect": url_for('home'), "theme": "light"})

@app.route('/api/resend_code', methods=['POST'])
def api_resend_code():
    pending = session.get('pending_signup')
    if not pending:
        return jsonify({"success": False, "message": "No signup in progress."})
    now = int(time.time())
    if now - pending.get('timestamp', 0) < 60:
        return jsonify({"success": False, "message": "Please wait before resending code."})
    code = str(random.randint(100000, 999999))
    pending['code'] = code
    pending['timestamp'] = now
    session['pending_signup'] = pending
    send_verification_email(pending['email'], code)
    return jsonify({"success": True, "message": "Verification code resent."})

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    identifier = data.get('identifier')
    password = data.get('password')
    if not identifier or not password:
        return jsonify({"success": False, "message": "Identifier and password required."})
    users_ref = db.reference("users")
    users = users_ref.get() or {}
    for uid, user in users.items():
        if (user.get('email') == identifier or user.get('phone') == identifier):
            if not check_password_hash(user.get('password', ''), password):
                return jsonify({"success": False, "message": "Invalid credentials."})
            # Check if 2FA is enabled (by totp_secret)
            if user.get('totp_secret'):
                session['pending_2fa_user_id'] = uid
                return jsonify({"success": False, "require_2fa": True, "message": "2FA required."})
            # Normal login
            session["user_id"] = uid
            theme = user.get("theme", "light")
            return jsonify({"success": True, "message": "Login successful!", "redirect": url_for('home'), "theme": theme})
    return jsonify({"success": False, "message": "Invalid credentials."})
# --- 2FA OTP verification for login ---
@app.route('/api/verify_2fa_login', methods=['POST'])
def api_verify_2fa_login():
    data = request.get_json()
    code = data.get('code')
    pending_uid = session.get('pending_2fa_user_id')
    if not pending_uid:
        return jsonify({"success": False, "message": "No pending 2FA login."})
    users_ref = db.reference("users")
    user = users_ref.child(pending_uid).get()
    if not user or not user.get('totp_secret'):
        return jsonify({"success": False, "message": "2FA not enabled for this user."})
    if not code or not code.isdigit() or len(code) != 6:
        return jsonify({"success": False, "message": "Invalid code format."})
    totp = pyotp.TOTP(user['totp_secret'])
    if not totp.verify(code, valid_window=1):
        return jsonify({"success": False, "message": "Invalid 2FA code."})
    # Success: complete login
    session['user_id'] = pending_uid
    session.pop('pending_2fa_user_id', None)
    theme = user.get("theme", "light")
    return jsonify({"success": True, "message": "2FA verified. Login successful!", "redirect": url_for('home'), "theme": theme})

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('auth'))

@app.route('/api/forgot_password', methods=['POST'])
def api_forgot_password():
    data = request.get_json()
    email = data.get('email')
    if not email:
        return jsonify({"success": False, "message": "Email is required."})
    users_ref = db.reference("users")
    users = users_ref.get() or {}
    user_id = None
    for uid, user in users.items():
        if user.get('email') == email:
            user_id = uid
            break
    if not user_id:
        return jsonify({"success": False, "message": "Email not found."})
    code = str(random.randint(100000, 999999))
    session['pending_reset'] = {
        "user_id": user_id,
        "email": email,
        "code": code,
        "timestamp": int(time.time())
    }
    send_verification_email(email, code)
    return jsonify({"success": True, "message": "Verification code sent to your email."})

@app.route('/api/reset_password', methods=['POST'])
def api_reset_password():
    data = request.get_json()
    code = data.get('code')
    password = data.get('password')
    pending = session.get('pending_reset')
    if not pending:
        return jsonify({"success": False, "message": "No reset in progress."})
    if not code or code != pending.get('code'):
        return jsonify({"success": False, "message": "Invalid verification code."})
    if not password or len(password) < 4:
        return jsonify({"success": False, "message": "Password too short."})
    users_ref = db.reference("users")
    user_id = pending['user_id']
    hashed_password = generate_password_hash(password)
    users_ref.child(user_id).update({"password": hashed_password})
    session.pop('pending_reset', None)
    return jsonify({"success": True, "message": "Password reset successful! You can now login."})

@app.route('/api/check_user', methods=['POST'])
def api_check_user():
    user_id = session.get("user_id")
    users_ref = db.reference("users")
    users = users_ref.get() or {}
    result = {}
    # If user_id is set but not found in users, account is blocked
    if user_id and user_id not in users:
        result['account_revoked'] = True
        result['message'] = "Account Permanently blocked"
        session.clear()
        return jsonify(result)
    # Existing checks for email/phone (for signup validation)
    data = request.get_json(silent=True) or {}
    email = data.get('email')
    phone = data.get('phone')
    if email:
        result['email_exists'] = any(user.get('email') == email for user in users.values())
    if phone:
        result['phone_exists'] = any(user.get('phone') == phone for user in users.values())
    return jsonify(result)

@app.route('/api/get_balance', methods=['GET'])
def api_get_balance():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"balance": 0, "name": "", "uid": ""})
    users_ref = db.reference("users")
    user = users_ref.child(user_id).get()
    balance = user.get("balance", 0) if user else 0
    name = user.get("name", "") if user else ""
    uid = user.get("uid", "") if user else ""
    return jsonify({"balance": balance, "name": name, "uid": uid})

@app.route('/account')
@login_required
def account():
    users_ref = db.reference("users")
    user = users_ref.child(session["user_id"]).get()
    name = user.get("name", "") if user else ""
    email = user.get("email", "") if user else ""
    phone = user.get("phone", "") if user else ""
    uid = user.get("uid", "") if user else ""
    avatar_url = user.get("avatar_url", "") if user else ""
    return render_template("account.html", name=name, email=email, phone=phone, uid=uid, avatar_url=avatar_url)

@app.route('/security')
@login_required
def security():
    users_ref = db.reference("users")
    user = users_ref.child(session["user_id"]).get()
    withdrawal_pin_set = bool(user.get("withdrawal_pin")) if user else False
    return render_template("security.html", withdrawal_pin_set=withdrawal_pin_set)

@app.route('/api/update_account', methods=['POST'])
def api_update_account():
    if not session.get("user_id"):
        return jsonify({"success": False, "message": "Not logged in."})
    data = request.get_json()
    name = data.get("name")
    phone = data.get("phone")
    users_ref = db.reference("users")
    user_id = session["user_id"]
    user = users_ref.child(user_id).get()
    if not user:
        return jsonify({"success": False, "message": "User not found."})
    users_ref.child(user_id).update({"name": name, "phone": phone})
    return jsonify({"success": True, "message": "Account updated!", "name": name, "phone": phone})

@app.route('/api/update_avatar', methods=['POST'])
def api_update_avatar():
    if not session.get("user_id"):
        return jsonify({"success": False, "message": "Not logged in."})
    data = request.get_json()
    avatar_url = data.get("avatar_url")
    users_ref = db.reference("users")
    user_id = session["user_id"]
    user = users_ref.child(user_id).get()
    if not user:
        return jsonify({"success": False, "message": "User not found."})
    users_ref.child(user_id).update({"avatar_url": avatar_url})
    return jsonify({"success": True, "message": "Profile picture updated!", "avatar_url": avatar_url})

@app.route('/history')
@login_required
def history():
    user_id = session["user_id"]
    transactions_ref = db.reference(f"transactions/{user_id}")
    transactions_data = transactions_ref.get() or {}

    history_list = []
    for tx in transactions_data.values():
        # Add 'from' and 'to' for template compatibility
        tx = dict(tx)  # Make a copy to avoid mutating DB data
        tx['from'] = tx.get('from', 'User')
        tx['to'] = tx.get('to', tx.get('wallet', 'Wallet'))
        history_list.append(tx)

    # Sort by timestamp descending
    history_list.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
    return render_template("History.html", history=history_list)

@app.route('/api/history')
def api_history():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"success": False, "history": []})
    transactions_ref = db.reference(f"transactions/{user_id}")
    transactions_data = transactions_ref.get() or {}

    history_list = []
    for tx in transactions_data.values():
        tx = dict(tx)
        tx['from'] = tx.get('from', 'User')
        tx['to'] = tx.get('to', tx.get('wallet', 'Wallet'))
        history_list.append(tx)
    history_list.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
    return jsonify({"success": True, "history": history_list})

@app.route('/api/notifications')
def api_notifications():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"success": False, "notifications": []})

    # Fetch user notifications
    user_ref = db.reference(f"notifications/{user_id}")
    user_notifications = user_ref.get() or {}

    # Fetch global notifications
    global_ref = db.reference("notifications/global")
    global_notifications = global_ref.get() or {}

    notif_dict = {}

    # Add user notifications first (user can override global by ID)
    for notif_id, notif_data in user_notifications.items():
        notif = dict(notif_data)
        notif['id'] = notif_id
        notif_dict[notif_id] = notif

    # Add global notifications if not already present
    for notif_id, notif_data in global_notifications.items():
        if notif_id not in notif_dict:
            notif = dict(notif_data)
            notif['id'] = notif_id
            notif_dict[notif_id] = notif

    notif_list = list(notif_dict.values())
    notif_list.sort(key=lambda x: x.get('timestamp', 0), reverse=True)
    return jsonify({"success": True, "notifications": notif_list})

@app.route('/api/notifications/read', methods=['POST'])
def api_notifications_read():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"success": False})
    data = request.get_json()
    notif_id = data.get("id")
    if not notif_id:
        return jsonify({"success": False})
    notif_ref = db.reference(f"notifications/{user_id}/{notif_id}")
    notif = notif_ref.get()
    if notif:
        notif_ref.update({"read": True})
    return jsonify({"success": True})

@app.route('/api/notifications/clear', methods=['POST'])
def api_notifications_clear():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"success": False})
    ref = db.reference(f"notifications/{user_id}")
    ref.delete()
    return jsonify({"success": True})

# --- New: Change password ---
@app.route('/api/change_password', methods=['POST'])
def api_change_password():
    if not session.get("user_id"):
        return jsonify({"success": False, "message": "Not logged in."})
    data = request.get_json() or {}
    current = data.get("current_password", "")
    new = data.get("new_password", "")
    confirm = data.get("confirm_password", "")

    if not current or not new or not confirm:
        return jsonify({"success": False, "message": "All fields are required."})

    if new != confirm:
        return jsonify({"success": False, "message": "New passwords do not match."})

    if len(new) < 4:
        return jsonify({"success": False, "message": "New password is too short."})

    users_ref = db.reference("users")
    user_id = session["user_id"]
    user = users_ref.child(user_id).get()
    if not user:
        return jsonify({"success": False, "message": "User not found."})

    stored_hash = user.get("password", "")
    if not check_password_hash(stored_hash, current):
        return jsonify({"success": False, "message": "Current password is incorrect."})

    hashed = generate_password_hash(new)
    users_ref.child(user_id).update({"password": hashed})
    return jsonify({"success": True, "message": "Password changed successfully."})

# --- New: Set / Change withdrawal PIN ---
@app.route('/api/set_withdrawal_pin', methods=['POST'])
def api_set_withdrawal_pin():
    if not session.get("user_id"):
        return jsonify({"success": False, "message": "Not logged in."})
    data = request.get_json() or {}
    pin = (data.get("pin") or "").strip()
    confirm = (data.get("confirm_pin") or "").strip()

    if not pin or not confirm:
        return jsonify({"success": False, "message": "PIN and confirmation are required."})

    if not (pin.isdigit() and confirm.isdigit()):
        return jsonify({"success": False, "message": "PIN must be numeric."})

    if len(pin) != 4 or len(confirm) != 4:
        return jsonify({"success": False, "message": "PIN must be 4 digits."})

    if pin != confirm:
        return jsonify({"success": False, "message": "PINs do not match."})

    users_ref = db.reference("users")
    user_id = session["user_id"]
    user = users_ref.child(user_id).get()
    if not user:
        return jsonify({"success": False, "message": "User not found."})

    # Store hashed PIN for basic protection
    hashed_pin = generate_password_hash(pin)
    users_ref.child(user_id).update({"withdrawal_pin": hashed_pin})
    return jsonify({"success": True, "message": "Withdrawal PIN set successfully."})

@app.route('/api/withdrawal_pin_status')
def api_withdrawal_pin_status():
    if not session.get("user_id"):
        return jsonify({"set": False})
    users_ref = db.reference("users")
    user = users_ref.child(session["user_id"]).get()
    return jsonify({"set": bool(user and user.get("withdrawal_pin"))})

@app.route('/api/remove_withdrawal_pin', methods=['POST'])
def api_remove_withdrawal_pin():
    if not session.get("user_id"):
        return jsonify({"success": False, "message": "Not logged in."})
    data = request.get_json() or {}
    pin = (data.get("pin") or "").strip()
    if not pin or not pin.isdigit() or len(pin) != 4:
        return jsonify({"success": False, "message": "Invalid PIN."})
    users_ref = db.reference("users")
    user_id = session["user_id"]
    user = users_ref.child(user_id).get()
    if not user or not user.get("withdrawal_pin"):
        return jsonify({"success": False, "message": "No PIN set."})
    if not check_password_hash(user["withdrawal_pin"], pin):
        return jsonify({"success": False, "message": "Incorrect PIN."})
    users_ref.child(user_id).update({"withdrawal_pin": None})
    return jsonify({"success": True, "message": "Withdrawal PIN turned off."})

# def api_delete_account():
@app.route('/api/2fa/status')
@login_required
def api_2fa_status():
    users_ref = db.reference("users")
    user = users_ref.child(session["user_id"]).get()
    enabled = bool(user and user.get("totp_secret"))
    return jsonify({"enabled": enabled})

@app.route('/api/2fa/setup')
@login_required
def api_2fa_setup():
    users_ref = db.reference("users")
    user_id = session["user_id"]
    user = users_ref.child(user_id).get()
    # If already enabled, return error
    if user and user.get("totp_secret"):
        return jsonify({"success": False, "message": "2FA already enabled."})
    # Generate new secret
    secret = pyotp.random_base32()
    # Generate provisioning URI
    name = user.get("email", "user") if user else "user"
    issuer = "Tradelink"
    uri = pyotp.totp.TOTP(secret).provisioning_uri(name=name, issuer_name=issuer)
    # Generate QR code as base64
    qr = qrcode.make(uri)
    buf = io.BytesIO()
    qr.save(buf, format='PNG')
    buf.seek(0)
    qr_b64 = base64.b64encode(buf.read()).decode('utf-8')
    return jsonify({"success": True, "secret": secret, "qr": qr_b64, "uri": uri})

@app.route('/api/2fa/enable', methods=['POST'])
@login_required
def api_2fa_enable():
    data = request.get_json() or {}
    secret = data.get("secret", "")
    code = data.get("code", "")
    if not secret or not code:
        return jsonify({"success": False, "message": "Missing secret or code."})
    totp = pyotp.TOTP(secret)
    if not totp.verify(code):
        return jsonify({"success": False, "message": "Invalid code."})
    users_ref = db.reference("users")
    user_id = session["user_id"]
    users_ref.child(user_id).update({"totp_secret": secret})
    return jsonify({"success": True, "message": "2FA enabled."})

@app.route('/api/2fa/disable', methods=['POST'])
@login_required
def api_2fa_disable():
    data = request.get_json() or {}
    code = data.get("code", "")
    users_ref = db.reference("users")
    user_id = session["user_id"]
    user = users_ref.child(user_id).get()
    secret = user.get("totp_secret") if user else None
    if not secret:
        return jsonify({"success": False, "message": "2FA not enabled."})
    if not code:
        return jsonify({"success": False, "message": "Missing code."})
    totp = pyotp.TOTP(secret)
    if not totp.verify(code):
        return jsonify({"success": False, "message": "Invalid code."})
    users_ref.child(user_id).update({"totp_secret": None})
    return jsonify({"success": True, "message": "2FA disabled."})
    if not session.get("user_id"):
        return jsonify({"success": False, "message": "Not logged in."})
    data = request.get_json() or {}
    password = (data.get("password") or "").strip()
    if not password:
        return jsonify({"success": False, "message": "Password required."})

    users_ref = db.reference("users")
    user_id = session["user_id"]
    user = users_ref.child(user_id).get()
    if not user:
        return jsonify({"success": False, "message": "User not found."})

    if not check_password_hash(user.get("password", ""), password):
        return jsonify({"success": False, "message": "Incorrect password."})

    # Delete user data
    users_ref.child(user_id).delete()
    # Optionally delete related data
    db.reference(f"transactions/{user_id}").delete()
    db.reference(f"notifications/{user_id}").delete()

    session.clear()
    return jsonify({"success": True, "message": "Account deleted successfully."})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
