# ============================================================
#  CampusFix — Department Head Routes
#  File: backend/routes/dept_head_routes.py
# ============================================================

from flask import Blueprint, request, jsonify
import bcrypt
from database import get_db
from routes.auth_routes import validate_token

dept_head_bp = Blueprint('dept_head', __name__)


# ─── DASHBOARD STATS ─────────────────────────────────────────
@dept_head_bp.route('/stats', methods=['GET'])
def get_stats():
    user, err, code = validate_token(request, required_role='dept_head')
    if err: return err, code

    dept_id = user['department_id']
    conn = get_db()
    stats = conn.execute("""
        SELECT
            COUNT(*)                                                      AS total,
            SUM(CASE WHEN status = 'Pending'              THEN 1 END)    AS pending,
            SUM(CASE WHEN status = 'In Progress'          THEN 1 END)    AS in_progress,
            SUM(CASE WHEN status = 'Waiting Confirmation' THEN 1 END)    AS waiting,
            SUM(CASE WHEN status = 'Closed'               THEN 1 END)    AS closed,
            SUM(CASE WHEN status = 'Reopened'             THEN 1 END)    AS reopened
        FROM complaints WHERE department_id = ?
    """, (dept_id,)).fetchone()
    conn.close()
    return jsonify(dict(stats)), 200


# ─── GET DEPT COMPLAINTS ──────────────────────────────────────
@dept_head_bp.route('/complaints', methods=['GET'])
def get_complaints():
    user, err, code = validate_token(request, required_role='dept_head')
    if err: return err, code

    dept_id = user['department_id']
    status  = request.args.get('status')  # optional filter
    date_filter = request.args.get('date') # optional filter

    query = """
        SELECT
            c.complaint_id, c.title, c.description, c.category,
            c.urgency, c.status, c.upvote_count, c.created_at,
            c.assigned_at, c.reopen_reason,
            l.campus, l.block, l.floor, l.room_area,
            u.name AS student_name,
            e.name AS assigned_to_name,
            e.employee_id AS assigned_to_id
        FROM complaints c
        LEFT JOIN locations l   ON c.location_id   = l.location_id
        LEFT JOIN users u       ON c.submitted_by  = u.user_id
        LEFT JOIN employees e   ON c.assigned_to   = e.employee_id
        WHERE c.department_id = ?
    """
    params = [dept_id]
    if status:
        query += " AND c.status = ?"
        params.append(status)
    if date_filter:
        query += " AND DATE(c.created_at) = ?"
        params.append(date_filter)

    query += " ORDER BY CASE c.urgency WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END, c.created_at ASC"

    conn = get_db()
    complaints = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify([dict(c) for c in complaints]), 200


# ─── GET DEPT EMPLOYEES ───────────────────────────────────────
@dept_head_bp.route('/employees', methods=['GET'])
def get_employees():
    user, err, code = validate_token(request, required_role='dept_head')
    if err: return err, code

    dept_id = user['department_id']
    conn = get_db()

    employees = conn.execute("""
        SELECT
            e.*,
            CASE WHEN (
                SELECT COUNT(*) FROM complaints
                WHERE assigned_to = e.employee_id
                  AND status IN ('In Progress', 'Waiting Confirmation')
            ) > 0 THEN 'Busy' ELSE 'Available' END AS availability
        FROM employees e
        WHERE e.department_id = ? AND e.is_active = 1
        ORDER BY e.name
    """, (dept_id,)).fetchall()

    conn.close()
    return jsonify([dict(e) for e in employees]), 200


# ─── ADD EMPLOYEE ─────────────────────────────────────────────
@dept_head_bp.route('/employees', methods=['POST'])
def add_employee():
    user, err, code = validate_token(request, required_role='dept_head')
    if err: return err, code

    data        = request.get_json()
    name        = data.get('name', '').strip()
    email       = data.get('email', '').strip().lower()
    password    = data.get('password', '')
    phone       = data.get('phone', '').strip()
    designation = data.get('designation', '').strip()
    join_date   = data.get('join_date', '')
    bio         = data.get('bio', '').strip()
    dept_id     = user['department_id']

    if not all([name, email, password, designation]):
        return jsonify({'message': 'Name, email, password, and designation are required.'}), 400

    conn = get_db()
    existing = conn.execute("SELECT employee_id, is_active FROM employees WHERE email = ?", (email,)).fetchone()
    
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    
    if existing:
        if existing['is_active'] == 1:
            conn.close()
            return jsonify({'message': 'An active employee with this email already exists.'}), 409
        else:
            # Reactivate soft-deleted employee
            conn.execute("""
                UPDATE employees SET name=?, password_hash=?, phone=?, designation=?, join_date=?, bio=?, is_active=1
                WHERE employee_id=?
            """, (name, hashed, phone, designation, join_date, bio, existing['employee_id']))
            conn.commit()
            conn.close()
            return jsonify({'message': 'Employee reactivated successfully!', 'employee_id': existing['employee_id']}), 201

    conn.execute("""
        INSERT INTO employees (name, email, password_hash, phone, designation, department_id, join_date, bio)
        VALUES (?,?,?,?,?,?,?,?)
    """, (name, email, hashed, phone, designation, dept_id, join_date, bio))
    conn.commit()

    new_emp = conn.execute("SELECT employee_id FROM employees WHERE email = ?", (email,)).fetchone()
    conn.close()

    return jsonify({'message': 'Employee added successfully!', 'employee_id': new_emp['employee_id']}), 201


# ─── EDIT EMPLOYEE ────────────────────────────────────────────
@dept_head_bp.route('/employees/<int:emp_id>', methods=['PUT'])
def edit_employee(emp_id):
    user, err, code = validate_token(request, required_role='dept_head')
    if err: return err, code

    data        = request.get_json()
    name        = data.get('name', '').strip()
    phone       = data.get('phone', '').strip()
    designation = data.get('designation', '').strip()
    bio         = data.get('bio', '').strip()

    conn = get_db()
    conn.execute("""
        UPDATE employees SET name=?, phone=?, designation=?, bio=?
        WHERE employee_id=? AND department_id=?
    """, (name, phone, designation, bio, emp_id, user['department_id']))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Employee updated successfully.'}), 200


# ─── REMOVE (SOFT DELETE) EMPLOYEE ───────────────────────────
@dept_head_bp.route('/employees/<int:emp_id>', methods=['DELETE'])
def remove_employee(emp_id):
    user, err, code = validate_token(request, required_role='dept_head')
    if err: return err, code

    conn = get_db()
    conn.execute(
        "UPDATE employees SET is_active=0 WHERE employee_id=? AND department_id=?",
        (emp_id, user['department_id'])
    )
    conn.commit()
    conn.close()
    return jsonify({'message': 'Employee removed successfully.'}), 200



# ─── ASSIGN COMPLAINT TO EMPLOYEE ────────────────────────────
@dept_head_bp.route('/complaints/<int:complaint_id>/assign', methods=['POST'])
def assign_complaint(complaint_id):
    user, err, code = validate_token(request, required_role='dept_head')
    if err: return err, code

    data        = request.get_json()
    employee_id = data.get('employee_id')

    if not employee_id:
        return jsonify({'message': 'employee_id is required.'}), 400

    conn = get_db()
    conn.execute("""
        UPDATE complaints
        SET assigned_to=?, assigned_by=?, assigned_at=CURRENT_TIMESTAMP, status='In Progress'
        WHERE complaint_id=? AND department_id=?
    """, (employee_id, user['user_id'], complaint_id, user['department_id']))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Complaint assigned successfully.'}), 200


# ─── MARK COMPLAINT AS RESOLVED ──────────────────────────────
@dept_head_bp.route('/complaints/<int:complaint_id>/resolve', methods=['POST'])
def resolve_complaint(complaint_id):
    user, err, code = validate_token(request, required_role='dept_head')
    if err: return err, code

    conn = get_db()
    conn.execute("""
        UPDATE complaints
        SET status='Waiting Confirmation', resolved_at=CURRENT_TIMESTAMP
        WHERE complaint_id=? AND department_id=?
    """, (complaint_id, user['department_id']))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Complaint marked as resolved. Waiting for student confirmation.'}), 200
