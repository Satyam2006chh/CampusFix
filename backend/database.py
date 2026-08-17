# ============================================================
#  CampusFix — Database Connection & Initialization
#  File: backend/database.py
# ============================================================

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'campusfix.db')


def get_db():
    """Get a database connection with row_factory for dict-like access."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Create all tables and insert seed data if the DB is new."""
    conn = get_db()
    cursor = conn.cursor()

    # ─── DEPARTMENTS ─────────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS departments (
        dept_id      INTEGER PRIMARY KEY AUTOINCREMENT,
        name         TEXT    NOT NULL,
        description  TEXT,
        category_tag TEXT    NOT NULL,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")

    # ─── USERS ───────────────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        user_id       INTEGER PRIMARY KEY AUTOINCREMENT,
        name          TEXT    NOT NULL,
        email         TEXT    UNIQUE NOT NULL,
        password_hash TEXT    NOT NULL,
        role          TEXT    NOT NULL CHECK(role IN ('student','dept_head','admin')),
        department_id INTEGER,
        roll_no       TEXT,
        phone         TEXT,
        is_active     INTEGER DEFAULT 1,
        created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(dept_id)
    )""")

    # ─── LOCATIONS ───────────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS locations (
        location_id  INTEGER PRIMARY KEY AUTOINCREMENT,
        campus       TEXT    NOT NULL,
        block        TEXT    NOT NULL,
        floor        TEXT    NOT NULL,
        room_area    TEXT    NOT NULL
    )""")

    # ─── EMPLOYEES ───────────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS employees (
        employee_id   INTEGER PRIMARY KEY AUTOINCREMENT,
        name          TEXT    NOT NULL,
        email         TEXT    UNIQUE NOT NULL,
        password_hash TEXT    NOT NULL,
        phone         TEXT,
        designation   TEXT    NOT NULL,
        department_id INTEGER NOT NULL,
        join_date     DATE,
        bio           TEXT,
        is_active     INTEGER DEFAULT 1,
        overdue_count INTEGER DEFAULT 0,
        created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(dept_id)
    )""")

    # ─── COMPLAINTS ──────────────────────────────────────────────
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS complaints (
        complaint_id   INTEGER PRIMARY KEY AUTOINCREMENT,
        title          TEXT    NOT NULL,
        description    TEXT    NOT NULL,
        category       TEXT    NOT NULL,
        location_id    INTEGER NOT NULL,
        photo_path     TEXT,
        urgency        TEXT    DEFAULT 'Medium',
        status         TEXT    DEFAULT 'Pending',
        upvote_count   INTEGER DEFAULT 0,
        submitted_by   INTEGER NOT NULL,
        department_id  INTEGER,
        assigned_to    INTEGER,
        assigned_by    INTEGER,
        assigned_at    DATETIME,
        deadline       DATE,
        is_overdue     INTEGER DEFAULT 0,
        resolved_at    DATETIME,
        closed_at      DATETIME,
        reopen_reason  TEXT,
        created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (location_id)   REFERENCES locations(location_id),
        FOREIGN KEY (submitted_by)  REFERENCES users(user_id),
        FOREIGN KEY (department_id) REFERENCES departments(dept_id),
        FOREIGN KEY (assigned_to)   REFERENCES employees(employee_id)
    )""")

    conn.commit()

    # ─── MIGRATE EXISTING DB: add deadline columns if missing ────
    existing_cols = [row[1] for row in cursor.execute("PRAGMA table_info(complaints)").fetchall()]
    if 'deadline' not in existing_cols:
        cursor.execute("ALTER TABLE complaints ADD COLUMN deadline DATE")
    if 'is_overdue' not in existing_cols:
        cursor.execute("ALTER TABLE complaints ADD COLUMN is_overdue INTEGER DEFAULT 0")

    emp_cols = [row[1] for row in cursor.execute("PRAGMA table_info(employees)").fetchall()]
    if 'overdue_count' not in emp_cols:
        cursor.execute("ALTER TABLE employees ADD COLUMN overdue_count INTEGER DEFAULT 0")

    conn.commit()

    # ─── SEED DEPARTMENTS (only if empty) ────────────────────────
    if cursor.execute("SELECT COUNT(*) FROM departments").fetchone()[0] == 0:
        departments = [
            ('Electrical Department',  'Handles fans, lights, switches, wiring, AC.', 'electrical'),
            ('Plumbing & Water',       'Handles water leakage, pipes, taps, washrooms.', 'water'),
            ('Civil & Infrastructure', 'Handles walls, floors, doors, windows, ceilings.', 'civil'),
            ('IT & Networking',        'Handles Wi-Fi, computers, printers, projectors.', 'it'),
            ('Cleaning & Sanitation',  'Handles garbage, washrooms, waste management.', 'cleaning'),
            ('Security & Safety',      'Handles CCTV, emergency infrastructure, hazards.', 'security'),
            ('Hostel Maintenance',     'Handles hostel rooms, hostel electrical, water.', 'hostel'),
        ]
        cursor.executemany(
            "INSERT INTO departments (name, description, category_tag) VALUES (?,?,?)",
            departments
        )

    # ─── SEED LOCATIONS (only if empty) ──────────────────────────
    if cursor.execute("SELECT COUNT(*) FROM locations").fetchone()[0] == 0:
        locations = [
            ('Main Campus', 'Block A', 'Ground Floor', 'Lab 1'),
            ('Main Campus', 'Block A', 'Ground Floor', 'Lab 2'),
            ('Main Campus', 'Block A', 'Ground Floor', 'Corridor'),
            ('Main Campus', 'Block A', 'First Floor',  'Classroom 101'),
            ('Main Campus', 'Block A', 'First Floor',  'Classroom 102'),
            ('Main Campus', 'Block A', 'First Floor',  'Washroom'),
            ('Main Campus', 'Block B', 'Ground Floor', 'Lab 3'),
            ('Main Campus', 'Block B', 'Ground Floor', 'Lab 4'),
            ('Main Campus', 'Block B', 'Ground Floor', 'Corridor'),
            ('Main Campus', 'Block B', 'First Floor',  'Classroom 201'),
            ('Main Campus', 'Block B', 'First Floor',  'Classroom 202'),
            ('Main Campus', 'Block B', 'Second Floor', 'Computer Lab'),
            ('Main Campus', 'Block C', 'Ground Floor', 'Cafeteria'),
            ('Main Campus', 'Block C', 'Ground Floor', 'Reception'),
            ('Main Campus', 'Block C', 'First Floor',  'Staff Room'),
            ('Main Campus', 'Block C', 'First Floor',  'Library'),
            ('Main Campus', 'Common Area', 'Ground Floor', 'Parking Lot'),
            ('Main Campus', 'Common Area', 'Ground Floor', 'Main Gate'),
            ('Hostel', 'Hostel Block A', 'Ground Floor', 'Common Room'),
            ('Hostel', 'Hostel Block A', 'First Floor',  'Room 101-110'),
            ('Hostel', 'Hostel Block B', 'Ground Floor', 'Washroom Block'),
            ('Hostel', 'Hostel Block B', 'First Floor',  'Room 201-210'),
        ]
        cursor.executemany(
            "INSERT INTO locations (campus, block, floor, room_area) VALUES (?,?,?,?)",
            locations
        )

    # ─── SEED ADMIN USER (only if no admin exists) ───────────────
    if cursor.execute("SELECT COUNT(*) FROM users WHERE role='admin'").fetchone()[0] == 0:
        import bcrypt
        hashed = bcrypt.hashpw('admin123'.encode(), bcrypt.gensalt()).decode()
        cursor.execute(
            "INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)",
            ('Super Admin', 'admin@campusfix.com', hashed, 'admin')
        )

    conn.commit()
    conn.close()
    print("[OK] Database initialized successfully.")
