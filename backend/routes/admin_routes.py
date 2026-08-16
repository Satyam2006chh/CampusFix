# ============================================================
#  CampusFix — Admin Routes
#  File: backend/routes/admin_routes.py
# ============================================================

from flask import Blueprint, request, jsonify
import bcrypt
from database import get_db
from routes.auth_routes import validate_token

admin_bp = Blueprint('admin', __name__)


# ─── GLOBAL DASHBOARD STATS ──────────────────────────────────
@admin_bp.route('/stats', methods=['GET'])
def get_stats():
    user, err, code = validate_token(request, required_role='admin')
    if err: return err, code

    dept_id = request.args.get('dept_id')  # optional filter
    conn    = get_db()

    base = "FROM complaints" + (" WHERE department_id=?" if dept_id else "")
    params = [dept_id] if dept_id else []

    stats = conn.execute(f"""
        SELECT
            COUNT(*)                                                      AS total,
            SUM(CASE WHEN status = 'Pending'              THEN 1 END)    AS pending,
            SUM(CASE WHEN status = 'In Progress'          THEN 1 END)    AS in_progress,
            SUM(CASE WHEN status = 'Closed'               THEN 1 END)    AS resolved,
            SUM(CASE WHEN status = 'Reopened'             THEN 1 END)    AS reopened,
            SUM(CASE WHEN status = 'Waiting Confirmation' THEN 1 END)    AS waiting
        {base}
    """, params).fetchone()

    # Complaints by department
    by_dept = conn.execute("""
        SELECT d.name AS dept_name, COUNT(c.complaint_id) AS count
        FROM departments d
        LEFT JOIN complaints c ON d.dept_id = c.department_id
        GROUP BY d.dept_id
        ORDER BY count DESC
    """).fetchall()

    # Complaints by block
    by_block = conn.execute("""
        SELECT l.block, COUNT(c.complaint_id) AS count
        FROM complaints c
        JOIN locations l ON c.location_id = l.location_id
        GROUP BY l.block
        ORDER BY count DESC
    """).fetchall()

    # Complaints by month (last 6 months)
    by_month = conn.execute("""
        SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS count
        FROM complaints
        GROUP BY month
        ORDER BY month DESC
        LIMIT 6
    """).fetchall()

    conn.close()
    return jsonify({
        'stats':    dict(stats),
        'by_dept':  [dict(r) for r in by_dept],
        'by_block': [dict(r) for r in by_block],
        'by_month': [dict(r) for r in by_month],
    }), 200


# ─── GET ALL DEPARTMENTS ──────────────────────────────────────
@admin_bp.route('/departments', methods=['GET'])
def get_departments():
    user, err, code = validate_token(request, required_role='admin')
    if err: return err, code

    conn = get_db()
    depts = conn.execute("""
        SELECT d.*,
            u.name  AS head_name,
            u.email AS head_email,
            u.user_id AS head_user_id,
            (SELECT COUNT(*) FROM complaints c WHERE c.department_id = d.dept_id) AS total_complaints
        FROM departments d
        LEFT JOIN users u ON u.department_id = d.dept_id AND u.role = 'dept_head' AND u.is_active = 1
        ORDER BY d.name
    """).fetchall()
    conn.close()
    return jsonify([dict(d) for d in depts]), 200


# ─── CREATE DEPARTMENT ────────────────────────────────────────
@admin_bp.route('/departments', methods=['POST'])
def create_department():
    user, err, code = validate_token(request, required_role='admin')
    if err: return err, code

    data        = request.get_json()
    name        = data.get('name', '').strip()
    description = data.get('description', '').strip()
    category    = data.get('category_tag', '').strip()

    if not name or not category:
        return jsonify({'message': 'Name and category are required.'}), 400

    conn = get_db()
    conn.execute("INSERT INTO departments (name, description, category_tag) VALUES (?,?,?)",
                 (name, description, category))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Department created successfully.'}), 201


# ─── CREATE DEPARTMENT HEAD ───────────────────────────────────
@admin_bp.route('/dept-heads', methods=['POST'])
def create_dept_head():
    user, err, code = validate_token(request, required_role='admin')
    if err: return err, code

    data        = request.get_json()
    name        = data.get('name', '').strip()
    email       = data.get('email', '').strip().lower()
    password    = data.get('password', '')
    dept_id     = data.get('department_id')
    phone       = data.get('phone', '').strip()

    if not all([name, email, password, dept_id]):
        return jsonify({'message': 'All fields are required.'}), 400

    conn = get_db()
    existing = conn.execute("SELECT user_id FROM users WHERE email=?", (email,)).fetchone()
    if existing:
        conn.close()
        return jsonify({'message': 'Email already exists.'}), 409

    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    conn.execute("""
        INSERT INTO users (name, email, password_hash, role, department_id, phone)
        VALUES (?,?,?,?,?,?)
    """, (name, email, hashed, 'dept_head', dept_id, phone))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Department Head created successfully.'}), 201


# ─── DEACTIVATE DEPT HEAD ─────────────────────────────────────
@admin_bp.route('/users/<int:user_id>/deactivate', methods=['POST'])
def deactivate_user(user_id):
    user, err, code = validate_token(request, required_role='admin')
    if err: return err, code

    conn = get_db()
    conn.execute("UPDATE users SET is_active=0 WHERE user_id=?", (user_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'User deactivated. They can no longer log in.'}), 200


# ─── REACTIVATE USER ──────────────────────────────────────────
@admin_bp.route('/users/<int:user_id>/activate', methods=['POST'])
def activate_user(user_id):
    user, err, code = validate_token(request, required_role='admin')
    if err: return err, code

    conn = get_db()
    conn.execute("UPDATE users SET is_active=1 WHERE user_id=?", (user_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'User reactivated successfully.'}), 200


# ─── GET ALL COMPLAINTS (admin view) ─────────────────────────
@admin_bp.route('/complaints', methods=['GET'])
def get_all_complaints():
    user, err, code = validate_token(request, required_role='admin')
    if err: return err, code

    filters = []
    params  = []
    dept_id = request.args.get('dept_id')
    status  = request.args.get('status')

    if dept_id:
        filters.append("c.department_id = ?"); params.append(dept_id)
    if status:
        filters.append("c.status = ?"); params.append(status)

    where = ("WHERE " + " AND ".join(filters)) if filters else ""

    conn = get_db()
    complaints = conn.execute(f"""
        SELECT
            c.*, l.campus, l.block, l.floor, l.room_area,
            u.name AS student_name,
            d.name AS dept_name,
            e.name AS assigned_to_name
        FROM complaints c
        LEFT JOIN locations l   ON c.location_id   = l.location_id
        LEFT JOIN users u       ON c.submitted_by  = u.user_id
        LEFT JOIN departments d ON c.department_id = d.dept_id
        LEFT JOIN employees e   ON c.assigned_to   = e.employee_id
        {where}
        ORDER BY c.created_at DESC
    """, params).fetchall()
    conn.close()
    return jsonify([dict(c) for c in complaints]), 200


# ─── GET ALL LOCATIONS ────────────────────────────────────────
@admin_bp.route('/locations', methods=['GET'])
def get_locations():
    user, err, code = validate_token(request, required_role='admin')
    if err: return err, code

    conn = get_db()
    locations = conn.execute("SELECT * FROM locations ORDER BY campus, block, floor").fetchall()
    conn.close()
    return jsonify([dict(l) for l in locations]), 200


# ─── ADD LOCATION ─────────────────────────────────────────────
@admin_bp.route('/locations', methods=['POST'])
def add_location():
    user, err, code = validate_token(request, required_role='admin')
    if err: return err, code

    data      = request.get_json()
    campus    = data.get('campus', '').strip()
    block     = data.get('block', '').strip()
    floor     = data.get('floor', '').strip()
    room_area = data.get('room_area', '').strip()

    if not all([campus, block, floor, room_area]):
        return jsonify({'message': 'All location fields are required.'}), 400

    conn = get_db()
    conn.execute("INSERT INTO locations (campus, block, floor, room_area) VALUES (?,?,?,?)",
                 (campus, block, floor, room_area))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Location added successfully.'}), 201


# ─── GET ALL USERS ────────────────────────────────────────────
@admin_bp.route('/users', methods=['GET'])
def get_users():
    user, err, code = validate_token(request, required_role='admin')
    if err: return err, code

    role = request.args.get('role')
    conn = get_db()

    query  = "SELECT u.*, d.name AS dept_name FROM users u LEFT JOIN departments d ON u.department_id = d.dept_id"
    params = []
    if role:
        query += " WHERE u.role = ?"
        params.append(role)
    query += " ORDER BY u.created_at DESC"

    users = conn.execute(query, params).fetchall()
    # Don't return password hashes
    result = []
    for u in users:
        row = dict(u)
        row.pop('password_hash', None)
        result.append(row)

    conn.close()
    return jsonify(result), 200
