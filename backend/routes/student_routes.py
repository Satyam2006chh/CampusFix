# ============================================================
#  CampusFix — Student Routes
#  File: backend/routes/student_routes.py
# ============================================================

from flask import Blueprint, request, jsonify
from database import get_db
from routes.auth_routes import validate_token
import os

student_bp = Blueprint('student', __name__)

# Category → Department tag mapping
CATEGORY_TO_DEPT = {
    'Electrical': 'electrical',
    'Water':      'water',
    'Civil':      'civil',
    'IT':         'it',
    'Cleaning':   'cleaning',
    'Security':   'security',
    'Hostel':     'hostel',
}


# ─── GET LOCATIONS (for the dropdown) ────────────────────────
@student_bp.route('/locations', methods=['GET'])
def get_locations():
    conn = get_db()
    rows = conn.execute("SELECT * FROM locations ORDER BY campus, block, floor, room_area").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows]), 200


# ─── SUBMIT COMPLAINT ─────────────────────────────────────────
@student_bp.route('/complaints', methods=['POST'])
def submit_complaint():
    user, err_resp, err_code = validate_token(request, required_role='student')
    if err_resp:
        return err_resp, err_code

    data        = request.get_json()
    title       = data.get('title', '').strip()
    description = data.get('description', '').strip()
    category    = data.get('category', '').strip()
    location_id = data.get('location_id')
    urgency     = data.get('urgency', 'Medium')

    if not all([title, description, category, location_id]):
        return jsonify({'message': 'All fields are required.'}), 400

    conn = get_db()

    # ── DUPLICATE CHECK ────────────────────────────────────────
    duplicate = conn.execute("""
        SELECT complaint_id, title, status, upvote_count
        FROM complaints
        WHERE category = ? AND location_id = ?
          AND status NOT IN ('Closed')
        ORDER BY created_at DESC
        LIMIT 1
    """, (category, location_id)).fetchone()

    if duplicate:
        conn.close()
        return jsonify({
            'duplicate': True,
            'existing_complaint': dict(duplicate),
            'message': 'A similar complaint already exists for this location.'
        }), 200

    # ── FIND CORRECT DEPARTMENT ───────────────────────────────
    dept_tag = CATEGORY_TO_DEPT.get(category)
    dept = conn.execute(
        "SELECT dept_id FROM departments WHERE category_tag = ?", (dept_tag,)
    ).fetchone()
    dept_id = dept['dept_id'] if dept else None

    # ── INSERT COMPLAINT ──────────────────────────────────────
    conn.execute("""
        INSERT INTO complaints
          (title, description, category, location_id, urgency, submitted_by, department_id)
        VALUES (?,?,?,?,?,?,?)
    """, (title, description, category, location_id, urgency, user['user_id'], dept_id))
    conn.commit()
    conn.close()

    return jsonify({'message': 'Complaint submitted successfully!', 'duplicate': False}), 201


# ─── UPVOTE EXISTING COMPLAINT ────────────────────────────────
@student_bp.route('/complaints/<int:complaint_id>/upvote', methods=['POST'])
def upvote_complaint(complaint_id):
    user, err_resp, err_code = validate_token(request, required_role='student')
    if err_resp:
        return err_resp, err_code

    conn = get_db()

    # Prevent upvoting your own complaint
    owner = conn.execute(
        "SELECT submitted_by FROM complaints WHERE complaint_id = ?",
        (complaint_id,)
    ).fetchone()
    if owner and owner['submitted_by'] == user['user_id']:
        conn.close()
        return jsonify({'message': 'You cannot upvote your own complaint.'}), 400

    # Prevent duplicate upvotes
    already = conn.execute(
        "SELECT upvote_id FROM complaint_upvotes WHERE complaint_id = ? AND user_id = ?",
        (complaint_id, user['user_id'])
    ).fetchone()
    if already:
        conn.close()
        return jsonify({'message': 'You have already upvoted this complaint.'}), 400

    # Record the upvote and increment counter
    conn.execute(
        "INSERT INTO complaint_upvotes (complaint_id, user_id) VALUES (?, ?)",
        (complaint_id, user['user_id'])
    )
    conn.execute(
        "UPDATE complaints SET upvote_count = upvote_count + 1 WHERE complaint_id = ?",
        (complaint_id,)
    )
    conn.commit()
    conn.close()
    return jsonify({'message': 'Upvoted successfully.'}), 200


# ─── GET MY COMPLAINTS (submitted + upvoted) ─────────────────
@student_bp.route('/complaints', methods=['GET'])
def get_my_complaints():
    user, err_resp, err_code = validate_token(request, required_role='student')
    if err_resp:
        return err_resp, err_code

    conn = get_db()

    # Complaints submitted by this student
    submitted = conn.execute("""
        SELECT
            c.complaint_id, c.title, c.description, c.category,
            c.urgency, c.status, c.upvote_count,
            c.created_at, c.resolved_at, c.closed_at, c.reopen_reason,
            l.campus, l.block, l.floor, l.room_area,
            d.name  AS department_name,
            e.name  AS assigned_to_name,
            'submitted' AS source
        FROM complaints c
        LEFT JOIN locations l   ON c.location_id   = l.location_id
        LEFT JOIN departments d ON c.department_id = d.dept_id
        LEFT JOIN employees e   ON c.assigned_to   = e.employee_id
        WHERE c.submitted_by = ?
        ORDER BY c.created_at DESC
    """, (user['user_id'],)).fetchall()

    # Complaints this student upvoted (but did not submit)
    upvoted = conn.execute("""
        SELECT
            c.complaint_id, c.title, c.description, c.category,
            c.urgency, c.status, c.upvote_count,
            c.created_at, c.resolved_at, c.closed_at, c.reopen_reason,
            l.campus, l.block, l.floor, l.room_area,
            d.name  AS department_name,
            e.name  AS assigned_to_name,
            'upvoted' AS source
        FROM complaint_upvotes cu
        JOIN complaints c       ON cu.complaint_id  = c.complaint_id
        LEFT JOIN locations l   ON c.location_id    = l.location_id
        LEFT JOIN departments d ON c.department_id  = d.dept_id
        LEFT JOIN employees e   ON c.assigned_to    = e.employee_id
        WHERE cu.user_id = ? AND c.submitted_by != ?
        ORDER BY c.created_at DESC
    """, (user['user_id'], user['user_id'])).fetchall()

    conn.close()

    # Merge: submitted first, then upvoted (no duplicates possible due to ownership check)
    result = [dict(r) for r in submitted] + [dict(r) for r in upvoted]
    return jsonify(result), 200


# ─── CONFIRM RESOLUTION (YES / NO) ───────────────────────────
@student_bp.route('/complaints/<int:complaint_id>/confirm', methods=['POST'])
def confirm_resolution(complaint_id):
    user, err_resp, err_code = validate_token(request, required_role='student')
    if err_resp:
        return err_resp, err_code

    data      = request.get_json()
    confirmed = data.get('confirmed')  # True = YES, False = NO
    reason    = data.get('reason', '')

    conn = get_db()

    # Verify this complaint belongs to this student
    complaint = conn.execute(
        "SELECT * FROM complaints WHERE complaint_id = ? AND submitted_by = ?",
        (complaint_id, user['user_id'])
    ).fetchone()

    if not complaint:
        conn.close()
        return jsonify({'message': 'Complaint not found.'}), 404

    if complaint['status'] != 'Waiting Confirmation':
        conn.close()
        return jsonify({'message': 'This complaint is not waiting for your confirmation.'}), 400

    if confirmed:
        conn.execute("""
            UPDATE complaints
            SET status = 'Closed', closed_at = CURRENT_TIMESTAMP
            WHERE complaint_id = ?
        """, (complaint_id,))
        msg = 'Complaint closed. Thank you for confirming!'
    else:
        conn.execute("""
            UPDATE complaints
            SET status = 'Reopened', reopen_reason = ?
            WHERE complaint_id = ?
        """, (reason, complaint_id))
        msg = 'Complaint reopened. The department has been notified.'

    conn.commit()
    conn.close()
    return jsonify({'message': msg}), 200


# ─── GET STUDENT DASHBOARD STATS ─────────────────────────────
@student_bp.route('/stats', methods=['GET'])
def get_stats():
    user, err_resp, err_code = validate_token(request, required_role='student')
    if err_resp:
        return err_resp, err_code

    conn = get_db()
    stats = conn.execute("""
        SELECT
            COUNT(*)                                             AS total,
            SUM(CASE WHEN status = 'Closed'       THEN 1 END)   AS resolved,
            SUM(CASE WHEN status = 'Pending'       THEN 1 END)   AS pending,
            SUM(CASE WHEN status = 'In Progress'   THEN 1 END)   AS in_progress,
            SUM(CASE WHEN status = 'Reopened'      THEN 1 END)   AS reopened
        FROM complaints WHERE submitted_by = ?
    """, (user['user_id'],)).fetchone()
    conn.close()

    return jsonify(dict(stats)), 200
