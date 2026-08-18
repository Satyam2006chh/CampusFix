# ============================================================
#  CampusFix — Auth Routes
#  File: backend/routes/auth_routes.py
#  Handles: Login, Register (students), Logout
# ============================================================

from flask import Blueprint, request, jsonify, session
import bcrypt
import secrets
from database import get_db

auth_bp = Blueprint('auth', __name__)

# Simple in-memory token store (for CE-1; replace with JWT in CE-2)
active_tokens = {}


def generate_token():
    return secrets.token_hex(32)


# ─── LOGIN ───────────────────────────────────────────────────
@auth_bp.route('/login', methods=['POST'])
def login():
    data     = request.get_json()
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role     = data.get('role', '')

    if not email or not password or not role:
        return jsonify({'message': 'Email, password, and role are required.'}), 400

    conn = get_db()
    user = conn.execute(
        "SELECT * FROM users WHERE email = ? AND role = ?", (email, role)
    ).fetchone()
    conn.close()

    if not user:
        return jsonify({'message': 'Invalid email, password, or role.'}), 401

    if not user['is_active']:
        return jsonify({'message': 'Your account has been deactivated. Contact admin.'}), 403

    # Verify password
    if not bcrypt.checkpw(password.encode(), user['password_hash'].encode()):
        return jsonify({'message': 'Invalid email or password.'}), 401

    # Generate session token
    token = generate_token()
    active_tokens[token] = {
        'user_id':       user['user_id'],
        'name':          user['name'],
        'email':         user['email'],
        'role':          user['role'],
        'department_id': user['department_id'],
    }

    return jsonify({
        'token': token,
        'user': {
            'user_id':       user['user_id'],
            'name':          user['name'],
            'email':         user['email'],
            'role':          user['role'],
            'department_id': user['department_id'],
        }
    }), 200


# ─── REGISTER (students only) ────────────────────────────────
@auth_bp.route('/register', methods=['POST'])
def register():
    data     = request.get_json()
    name     = data.get('name', '').strip()
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')
    roll_no  = data.get('roll_no', '').strip()
    phone    = data.get('phone', '').strip()

    if not name or not email or not password:
        return jsonify({'message': 'Name, email, and password are required.'}), 400

    # ── Strong password validation (new registrations only) ──
    import re
    pw_errors = []
    if len(password) < 8:
        pw_errors.append('at least 8 characters')
    if not re.search(r'[A-Z]', password):
        pw_errors.append('at least 1 uppercase letter')
    if not re.search(r'[a-z]', password):
        pw_errors.append('at least 1 lowercase letter')
    if not re.search(r'[0-9]', password):
        pw_errors.append('at least 1 number')
    if not re.search(r'[^A-Za-z0-9]', password):
        pw_errors.append('at least 1 special character')
    if pw_errors:
        return jsonify({'message': f"Password must contain: {', '.join(pw_errors)}."}), 400
    # ─────────────────────────────────────────────────────────

    conn = get_db()

    # Check if email already exists
    existing = conn.execute("SELECT user_id FROM users WHERE email = ?", (email,)).fetchone()
    if existing:
        conn.close()
        return jsonify({'message': 'An account with this email already exists.'}), 409

    # Hash password and insert
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    conn.execute(
        "INSERT INTO users (name, email, password_hash, role, roll_no, phone) VALUES (?,?,?,?,?,?)",
        (name, email, hashed, 'student', roll_no, phone)
    )
    conn.commit()

    user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()

    # Auto-login after registration
    token = generate_token()
    active_tokens[token] = {
        'user_id': user['user_id'],
        'name':    user['name'],
        'email':   user['email'],
        'role':    'student',
        'department_id': None,
    }

    return jsonify({
        'message': 'Account created successfully!',
        'token': token,
        'user': {
            'user_id': user['user_id'],
            'name':    user['name'],
            'email':   user['email'],
            'role':    'student',
        }
    }), 201


# ─── TOKEN VALIDATION HELPER ─────────────────────────────────
def validate_token(request, required_role=None):
    """Validate the Bearer token and optionally check the role."""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None, jsonify({'message': 'Unauthorized.'}), 401

    token = auth_header.split(' ')[1]
    user  = active_tokens.get(token)

    if not user:
        return None, jsonify({'message': 'Invalid or expired session.'}), 401

    if required_role and user['role'] != required_role:
        return None, jsonify({'message': 'Forbidden. Insufficient permissions.'}), 403

    return user, None, None


# ─── LOGOUT ──────────────────────────────────────────────────
@auth_bp.route('/logout', methods=['POST'])
def logout():
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        active_tokens.pop(token, None)
    return jsonify({'message': 'Logged out successfully.'}), 200
